import { Platform } from 'react-native';

/**
 * VOEXI ADMOB CONFIGURATION
 * Using production IDs as requested.
 * Replace with your actual production Unit IDs if different.
 */
export const AD_IDS = {
  REWARDED: Platform.select({
    android: 'ca-app-pub-8557762635954495/6064111166',
    ios: 'ca-app-pub-8557762635954495/6064111166',
    default: 'ca-app-pub-3940256099942544/5224354917', // Test ID fallback
  }),
};
