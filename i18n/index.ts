import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import es from './locales/es.json';
import ja from './locales/ja.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import pt from './locales/pt.json';
import de from './locales/de.json';
import ru from './locales/ru.json';
import zh from './locales/zh.json';
import it from './locales/it.json';
import tr from './locales/tr.json';

const RESOURCES = {
  en: { translation: en },
  hi: { translation: hi },
  bn: { translation: bn },
  es: { translation: es },
  ja: { translation: ja },
  fr: { translation: fr },
  ar: { translation: ar },
  pt: { translation: pt },
  de: { translation: de },
  ru: { translation: ru },
  zh: { translation: zh },
  it: { translation: it },
  tr: { translation: tr },
  te: { translation: en }, mr: { translation: en }, ta: { translation: en },
  gu: { translation: en }, kn: { translation: en }, ml: { translation: en },
  pa: { translation: en }, ur: { translation: en }, as: { translation: en },
  or: { translation: en }, sa: { translation: en }
};

export const LANGUAGE_KEY = '@voexi_language';

i18n
  .use(initReactI18next)
  .init({
    resources: RESOURCES,
    lng: 'en',
    fallbackLng: 'en',
    compatibilityJSON: 'v3',
    interpolation: { escapeValue: false },
    react: { useSuspense: false }
  });

export const initI18n = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage) {
      await i18n.changeLanguage(savedLanguage);
    } else {
      let deviceLang = 'en';
      try {
        const locales = Localization.getLocales();
        if (locales && locales.length > 0) {
          deviceLang = locales[0]?.languageCode?.split('-')[0] || 'en';
        }
      } catch {}
      if (deviceLang && RESOURCES[deviceLang as keyof typeof RESOURCES]) {
        await i18n.changeLanguage(deviceLang);
      }
    }
  } catch (e) {
    console.error('[I18N] Boot Error:', e);
  }
};

export default i18n;
