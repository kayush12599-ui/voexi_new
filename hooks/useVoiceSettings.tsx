import React, { useState, useEffect, createContext, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface VoiceSettings {
  enabled: boolean;
  voiceResponses: boolean;
  autoListen: boolean;
  language: 'en' | 'hi';
}

const DEFAULT_SETTINGS: VoiceSettings = {
  enabled: false,
  voiceResponses: true,
  autoListen: false,
  language: 'en',
};

const STORAGE_KEY = '@voexi_voice_settings';

interface VoiceSettingsContextType {
  settings: VoiceSettings;
  updateSettings: (newSettings: Partial<VoiceSettings>) => Promise<void>;
  loading: boolean;
}

const VoiceSettingsContext = createContext<VoiceSettingsContextType | undefined>(undefined);

export const VoiceSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load voice settings', e);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<VoiceSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save voice settings', e);
    }
  };

  return (
    <VoiceSettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </VoiceSettingsContext.Provider>
  );
};

export const useVoiceSettings = () => {
  const context = useContext(VoiceSettingsContext);
  if (context === undefined) {
    // Return safe defaults to prevent crash
    return {
      settings: DEFAULT_SETTINGS,
      updateSettings: async () => {},
      loading: false,
    };
  }
  return context;
};
