import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeMode;
  isLight: boolean;
  interfaceGlow: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setInterfaceGlow: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [interfaceGlow, setInterfaceGlowState] = useState(true);

  useEffect(() => {
    fetchTheme();
  }, []);

  const fetchTheme = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('theme_preference, interface_glow').eq('id', user.id).maybeSingle();
        if (data?.theme_preference) {
          setTheme(data.theme_preference as ThemeMode);
        }
        if (data?.interface_glow !== undefined) {
          setInterfaceGlowState(data.interface_glow);
        }
      }
    } catch (e) {
      console.error("[THEME] Fetch Error:", e);
    }
  };

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ theme_preference: next }).eq('id', user.id);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setTheme(mode);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ theme_preference: mode }).eq('id', user.id);
    }
  };

  const setInterfaceGlow = async (enabled: boolean) => {
    setInterfaceGlowState(enabled);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ interface_glow: enabled }).eq('id', user.id);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, isLight: theme === 'light', interfaceGlow, toggleTheme, setThemeMode, setInterfaceGlow }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
