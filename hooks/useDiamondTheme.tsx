import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export interface DiamondColorOption {
  id: string;
  name: string;
  mainColor: string;
  secondaryColor: string;
  darkColor: string;
  lightColor: string;
  glowColor: string;
  gradient: string[];
  emoji: string;
  tag: string;
}

export const DIAMOND_COLOR_OPTIONS: DiamondColorOption[] = [
  {
    id: 'prism_mixed',
    name: 'Hyper Prism Multi-Glow',
    mainColor: '#EC4899',
    secondaryColor: '#FF6600',
    darkColor: '#7E22CE',
    lightColor: '#FFFFFF',
    glowColor: 'rgba(236, 72, 153, 0.85)',
    gradient: ['#FFFFFF', '#A855F7', '#EF4444', '#EC4899', '#F97316'], // White + Purple + Red + Pink + Orange
    emoji: '🌈',
    tag: 'ULTRA ATTRACTIVE'
  },
  {
    id: 'cyan',
    name: 'Cyan Electric',
    mainColor: '#00E5FF',
    secondaryColor: '#00A8FF',
    darkColor: '#004080',
    lightColor: '#E0F7FA',
    glowColor: 'rgba(0, 229, 255, 0.75)',
    gradient: ['#FFFFFF', '#00E5FF', '#0088FF', '#0033A0'],
    emoji: '💎',
    tag: 'CLASSIC'
  },
  {
    id: 'purple',
    name: 'Amethyst VIP',
    mainColor: '#C084FC',
    secondaryColor: '#9333EA',
    darkColor: '#581C87',
    lightColor: '#F3E8FF',
    glowColor: 'rgba(192, 132, 252, 0.75)',
    gradient: ['#FFFFFF', '#E9D5FF', '#C084FC', '#6B21A8'],
    emoji: '🔮',
    tag: 'ROYAL VIP'
  },
  {
    id: 'gold',
    name: 'Imperial Gold',
    mainColor: '#FFD700',
    secondaryColor: '#F59E0B',
    darkColor: '#B45309',
    lightColor: '#FEF9C3',
    glowColor: 'rgba(255, 215, 0, 0.75)',
    gradient: ['#FFFFFF', '#FEF08A', '#F59E0B', '#92400E'],
    emoji: '🌟',
    tag: 'LEGEND'
  },
  {
    id: 'emerald',
    name: 'Emerald Cyber',
    mainColor: '#34D399',
    secondaryColor: '#10B981',
    darkColor: '#047857',
    lightColor: '#D1FAE5',
    glowColor: 'rgba(52, 211, 153, 0.75)',
    gradient: ['#FFFFFF', '#A7F3D0', '#10B981', '#065F46'],
    emoji: '❇️',
    tag: 'CYBER'
  },
  {
    id: 'pink',
    name: 'Hot Pink Neon',
    mainColor: '#F472B6',
    secondaryColor: '#EC4899',
    darkColor: '#9D174D',
    lightColor: '#FCE7F3',
    glowColor: 'rgba(244, 114, 182, 0.75)',
    gradient: ['#FFFFFF', '#FBCFE8', '#EC4899', '#831843'],
    emoji: '💖',
    tag: 'NEON'
  },
  {
    id: 'sapphire',
    name: 'Sapphire Ocean',
    mainColor: '#60A5FA',
    secondaryColor: '#3B82F6',
    darkColor: '#1E40AF',
    lightColor: '#DBEAFE',
    glowColor: 'rgba(96, 165, 250, 0.75)',
    gradient: ['#FFFFFF', '#BFDBFE', '#3B82F6', '#1E3A8A'],
    emoji: '🔷',
    tag: 'DEEP BLUE'
  },
  {
    id: 'ruby',
    name: 'Ruby Crimson',
    mainColor: '#F87171',
    secondaryColor: '#EF4444',
    darkColor: '#991B1B',
    lightColor: '#FEE2E2',
    glowColor: 'rgba(248, 113, 113, 0.75)',
    gradient: ['#FFFFFF', '#FECACA', '#EF4444', '#7F1D1D'],
    emoji: '❤️',
    tag: 'FIRE'
  },
  {
    id: 'crystal',
    name: 'Platinum Crystal',
    mainColor: '#F8FAFC',
    secondaryColor: '#CBD5E1',
    darkColor: '#475569',
    lightColor: '#FFFFFF',
    glowColor: 'rgba(248, 250, 252, 0.85)',
    gradient: ['#FFFFFF', '#E2E8F0', '#334155'],
    emoji: '✨',
    tag: 'ULTRA'
  }
];

const STORAGE_KEY_COLOR = '@voexi_diamond_theme_color';
const STORAGE_KEY_GLOW = '@voexi_diamond_glow_enabled';

interface DiamondThemeContextType {
  activeColor: DiamondColorOption;
  glowEnabled: boolean;
  setActiveColorId: (colorId: string) => Promise<void>;
  setGlowEnabled: (enabled: boolean) => Promise<void>;
  getColorById: (id?: string) => DiamondColorOption;
}

const DiamondThemeContext = createContext<DiamondThemeContextType | undefined>(undefined);

export function DiamondThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeColor, setActiveColor] = useState<DiamondColorOption>(DIAMOND_COLOR_OPTIONS[0]);
  const [glowEnabled, setGlowEnabledState] = useState<boolean>(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const savedColorId = await AsyncStorage.getItem(STORAGE_KEY_COLOR);
      const savedGlow = await AsyncStorage.getItem(STORAGE_KEY_GLOW);

      if (savedColorId) {
        const found = DIAMOND_COLOR_OPTIONS.find((c) => c.id === savedColorId);
        if (found) setActiveColor(found);
      }

      if (savedGlow !== null) {
        setGlowEnabledState(savedGlow === 'true');
      }

      // Check if user has remote diamond_color setting in Supabase profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('diamond_color')
          .eq('id', user.id)
          .maybeSingle();

        if (data?.diamond_color) {
          const remoteFound = DIAMOND_COLOR_OPTIONS.find((c) => c.id === data.diamond_color);
          if (remoteFound) {
            setActiveColor(remoteFound);
            await AsyncStorage.setItem(STORAGE_KEY_COLOR, remoteFound.id);
          }
        }
      }
    } catch (e) {
      console.error('[DIAMOND THEME] Load Error:', e);
    }
  };

  const setActiveColorId = async (colorId: string) => {
    const found = DIAMOND_COLOR_OPTIONS.find((c) => c.id === colorId);
    if (!found) return;

    setActiveColor(found);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_COLOR, colorId);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ diamond_color: colorId })
          .eq('id', user.id);
      }
    } catch (e) {
      console.error('[DIAMOND THEME] Save Color Error:', e);
    }
  };

  const setGlowEnabled = async (enabled: boolean) => {
    setGlowEnabledState(enabled);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_GLOW, String(enabled));
    } catch (e) {
      console.error('[DIAMOND THEME] Save Glow Error:', e);
    }
  };

  const getColorById = (id?: string) => {
    if (!id) return activeColor;
    return DIAMOND_COLOR_OPTIONS.find((c) => c.id === id) || activeColor;
  };

  return (
    <DiamondThemeContext.Provider
      value={{
        activeColor,
        glowEnabled,
        setActiveColorId,
        setGlowEnabled,
        getColorById
      }}
    >
      {children}
    </DiamondThemeContext.Provider>
  );
}

export function useDiamondTheme() {
  const context = useContext(DiamondThemeContext);
  if (!context) {
    return {
      activeColor: DIAMOND_COLOR_OPTIONS[0],
      glowEnabled: true,
      setActiveColorId: async () => {},
      setGlowEnabled: async () => {},
      getColorById: (id?: string) => DIAMOND_COLOR_OPTIONS.find((c) => c.id === id) || DIAMOND_COLOR_OPTIONS[0]
    };
  }
  return context;
}
