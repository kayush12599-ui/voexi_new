import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// GOOGLE OFFICIAL TEST AD UNIT IDs
export const GOOGLE_TEST_ADS = {
  ANDROID_APP_ID: 'ca-app-pub-3940256099942544~3347511713',
  IOS_APP_ID: 'ca-app-pub-3940256099942544~1458002511',
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
};

const TEST_COINS_STORAGE_KEY = '@voexi_test_coins_balance';

export const isExpoGo = Constants.appOwnership === 'expo';
export const isNativePlatform = Platform.OS === 'android' || Platform.OS === 'ios';

/**
 * Safely loads the native AdMob module if running in a standalone/dev-client native build.
 */
export const getAdMobModule = () => {
  if (Platform.OS === 'web' || isExpoGo) return null;
  try {
    return require('react-native-google-mobile-ads');
  } catch (err) {
    console.warn('[AdService] Google Mobile Ads native module not available:', err);
    return null;
  }
};

/**
 * Initializes Google Mobile Ads SDK safely.
 */
export async function initGoogleMobileAds(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const adsModule = getAdMobModule();
  if (!adsModule) {
    console.log('[AdService] Test Ad System ready (Expo Go / Fallback mode)');
    return false;
  }
  try {
    const mobileAds = adsModule.default || adsModule;
    await mobileAds().initialize();
    console.log('[AdService] Google Mobile Ads SDK initialized successfully with Test Unit IDs.');
    return true;
  } catch (error) {
    console.error('[AdService] Error initializing Google Mobile Ads:', error);
    return false;
  }
}

/**
 * Local Test Coins Storage Helper.
 */
export async function getTestCoinsBalance(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(TEST_COINS_STORAGE_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch (err) {
    return 0;
  }
}

export async function addTestCoins(amount: number): Promise<number> {
  try {
    const current = await getTestCoinsBalance();
    const newBalance = current + amount;
    await AsyncStorage.setItem(TEST_COINS_STORAGE_KEY, newBalance.toString());
    return newBalance;
  } catch (err) {
    console.error('[AdService] Failed to save test coins:', err);
    return 0;
  }
}

export async function resetTestCoins(): Promise<number> {
  try {
    await AsyncStorage.setItem(TEST_COINS_STORAGE_KEY, '0');
    return 0;
  } catch (err) {
    return 0;
  }
}
