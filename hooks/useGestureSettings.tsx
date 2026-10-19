import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface GestureSettings {
  enabled: boolean;
  sensitivity: number;
  showIndicator: boolean;
}

const DEFAULT_SETTINGS: GestureSettings = {
  enabled: false, // OFF by default
  sensitivity: 0.5,
  showIndicator: true,
};

const STORAGE_KEY = '@voexi_gesture_config';

interface ContextProps {
  settings: GestureSettings;
  updateSettings: (val: Partial<GestureSettings>) => Promise<void>;
}

const GestureSettingsContext = createContext<ContextProps | undefined>(undefined);

export const GestureSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<GestureSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setSettings(JSON.parse(stored));
    } catch (e) {
      console.warn('Failed to load gesture settings', e);
    }
  };

  const updateSettings = async (val: Partial<GestureSettings>) => {
    try {
      const updated = { ...settings, ...val };
      setSettings(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save gesture settings', e);
    }
  };

  return (
    <GestureSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </GestureSettingsContext.Provider>
  );
};

export const useGestureSettings = () => {
  const context = useContext(GestureSettingsContext);
  if (!context) {
    // Return safe defaults to prevent crash
    return {
      settings: DEFAULT_SETTINGS,
      updateSettings: async () => {}
    };
  }
  return context;
};
