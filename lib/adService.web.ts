import { Platform } from 'react-native';

// GOOGLE OFFICIAL TEST AD UNIT IDs
export const GOOGLE_TEST_ADS = {
  ANDROID_APP_ID: 'ca-app-pub-3940256099942544~3347511713',
  IOS_APP_ID: 'ca-app-pub-3940256099942544~1458002511',
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
};

export const isExpoGo = false;
export const isNativePlatform = false;

export const getAdMobModule = () => null;

export async function initGoogleMobileAds(): Promise<boolean> {
  console.log('[AdService Web] Running in Web Mode - Google Mobile Ads Native SDK disabled.');
  return false;
}

export async function getTestCoinsBalance(): Promise<number> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = localStorage.getItem('@voexi_test_coins_balance');
      return val ? parseInt(val, 10) : 0;
    }
  } catch (err) {}
  return 0;
}

export async function addTestCoins(amount: number): Promise<number> {
  try {
    const current = await getTestCoinsBalance();
    const newBalance = current + amount;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('@voexi_test_coins_balance', newBalance.toString());
    }
    return newBalance;
  } catch (err) {
    return 0;
  }
}

export async function resetTestCoins(): Promise<number> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('@voexi_test_coins_balance', '0');
    }
    return 0;
  } catch (err) {
    return 0;
  }
}
