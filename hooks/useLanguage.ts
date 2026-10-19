import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANGUAGE_KEY } from '../i18n';
import * as Haptics from 'expo-haptics';

/**
 * VOEXI Global Language Hook - Performance Optimized
 */
export function useLanguage() {
  const { t, i18n } = useTranslation();

  const changeLanguage = useCallback(async (code: string) => {
    if (i18n.language === code) return;
    try {
      await i18n.changeLanguage(code);
      await AsyncStorage.setItem(LANGUAGE_KEY, code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('[Language Hook] Error:', e);
    }
  }, [i18n]);

  return useMemo(() => ({
    lang: i18n.language || 'en',
    changeLanguage,
    t,
    isReady: i18n.isInitialized
  }), [i18n.language, i18n.isInitialized, changeLanguage, t]);
}
