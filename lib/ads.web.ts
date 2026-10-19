/**
 * VOEXI ADS - Web Stub
 * Google Mobile Ads are not supported on Web.
 */

export const AD_UNITS = {
  APP_ID: '',
  NATIVE: '',
  REWARDED: '',
  INTERSTITIAL: '',
};

export async function initAds() {
  console.log('Ads are not supported on Web platform.');
}

export function loadInterstitial() {}

export function showInterstitialAfterThreshold() {}

export function showRewardedAd(onReward: () => void, onFailure?: () => void) {
  // On web, we just give the reward for now to avoid breaking flow
  onReward();
}
