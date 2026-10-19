import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { GOOGLE_TEST_ADS, getAdMobModule, initGoogleMobileAds, isExpoGo, isNativePlatform } from './adService';

// AD UNIT IDs - Enforcing Official Google Test Ad Unit IDs for Development
export const AD_UNITS = {
  APP_ID: GOOGLE_TEST_ADS.ANDROID_APP_ID,
  NATIVE: GOOGLE_TEST_ADS.BANNER,
  REWARDED: GOOGLE_TEST_ADS.REWARDED,
  INTERSTITIAL: GOOGLE_TEST_ADS.INTERSTITIAL,
};

let viewCount = 0;

export async function initAds() {
  await initGoogleMobileAds();
}

export function loadInterstitial() {
  if (!isNativePlatform || isExpoGo) return;
  const ads = getAdMobModule();
  if (!ads) return;
}

/**
 * Shows an interstitial ad (or simulated one) after a threshold.
 */
export function showInterstitialAfterThreshold() {
  viewCount++;
  if (viewCount % 5 === 0) {
    if (!isNativePlatform || isExpoGo) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(
        "✨ VOEXI PREMIUM (TEST AD)",
        "Tired of ads? Experience VOEXI without interruptions and support your favorite creators.",
        [
          { text: "LATER", style: "cancel" },
          { text: "GET PRO", onPress: () => console.log("Navigate to sub") }
        ]
      );
    }
  }
}

/**
 * Shows a rewarded ad or simulates a reward in dev mode.
 */
export function showRewardedAd(onReward: () => void) {
  if (!isNativePlatform || isExpoGo) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    Alert.alert(
      "📺 REWARDED TEST AD",
      "Watch a quick simulation to earn +10 TEST_COINS?",
      [
        { text: "CANCEL", style: "cancel" },
        { text: "WATCH", onPress: () => {
          setTimeout(() => {
            onReward();
            Alert.alert("🪙 SUCCESS", "You earned +10 TEST_COINS!");
          }, 1500);
        }}
      ]
    );
    return;
  }

  const ads = getAdMobModule();
  if (!ads) {
    onReward();
    return;
  }
}
