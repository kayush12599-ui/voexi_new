import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  GOOGLE_TEST_ADS,
  getAdMobModule,
  isExpoGo,
  isNativePlatform,
  getTestCoinsBalance,
  addTestCoins,
  resetTestCoins
} from '../lib/adService';

// Safe AdMob Module Native Exports Extraction
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;
let InterstitialAd: any = null;
let RewardedAd: any = null;
let AdEventType: any = null;
let RewardedAdEventType: any = null;

const adsModule = getAdMobModule();
if (adsModule) {
  BannerAd = adsModule.BannerAd;
  BannerAdSize = adsModule.BannerAdSize;
  TestIds = adsModule.TestIds;
  InterstitialAd = adsModule.InterstitialAd;
  RewardedAd = adsModule.RewardedAd;
  AdEventType = adsModule.AdEventType;
  RewardedAdEventType = adsModule.RewardedAdEventType;
}

export default function AdTestScreen() {
  const router = useRouter();

  // Test Coins State (Local TEST rewards only)
  const [testCoins, setTestCoins] = useState<number>(0);

  // Ad Status States
  const [bannerLoaded, setBannerLoaded] = useState<boolean>(false);

  const [interstitialLoading, setInterstitialLoading] = useState<boolean>(false);
  const [interstitialLoaded, setInterstitialLoaded] = useState<boolean>(false);

  const [rewardedLoading, setRewardedLoading] = useState<boolean>(false);
  const [rewardedLoaded, setRewardedLoaded] = useState<boolean>(false);

  // Ad Logs Console Output
  const [adLog, setAdLog] = useState<string[]>([]);

  // Native Ad Instances & Reward Claim Locks
  const interstitialRef = useRef<any>(null);
  const rewardedRef = useRef<any>(null);
  const rewardClaimedRef = useRef<boolean>(false);

  useEffect(() => {
    loadCoinsBalance();
    setAdLog([
      `[Init] System Mode: ${isExpoGo ? 'Expo Go' : isNativePlatform ? 'Native Standalone' : 'Web Browser'}`,
      `[Init] Google Test App ID: ${GOOGLE_TEST_ADS.ANDROID_APP_ID}`,
      `[Init] AdMob SDK Status: ${adsModule ? 'Native Module Ready' : 'Fallback / Expo Go Ready'}`,
    ]);
  }, []);

  const loadCoinsBalance = async () => {
    const bal = await getTestCoinsBalance();
    setTestCoins(bal);
  };

  const handleResetCoins = async () => {
    const bal = await resetTestCoins();
    setTestCoins(bal);
    setAdLog(prev => ['[Coins] Local TEST_COINS reset to 0', ...prev]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  // --- INTERSTITIAL AD HANDLERS ---
  const loadInterstitialAd = () => {
    const interstitialAdUnitId = TestIds ? TestIds.INTERSTITIAL : GOOGLE_TEST_ADS.INTERSTITIAL;

    if (!InterstitialAd || isExpoGo || !isNativePlatform) {
      setInterstitialLoading(true);
      setTimeout(() => {
        setInterstitialLoading(false);
        setInterstitialLoaded(true);
        setAdLog(prev => ['[Simulated] Test Interstitial loaded successfully', ...prev]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }, 1000);
      return;
    }

    setInterstitialLoading(true);
    setAdLog(prev => [`[AdMob] Requesting Test Interstitial: ${interstitialAdUnitId}`, ...prev]);

    try {
      const interstitial = InterstitialAd.createForAdRequest(interstitialAdUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      interstitialRef.current = interstitial;

      const unsubLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
        setInterstitialLoading(false);
        setInterstitialLoaded(true);
        setAdLog(prev => ['[AdMob SUCCESS] Test Interstitial Ad Loaded!', ...prev]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      });

      const unsubError = interstitial.addAdEventListener(AdEventType.ERROR, (err: any) => {
        setInterstitialLoading(false);
        setInterstitialLoaded(false);
        setAdLog(prev => [`[AdMob ERROR] Interstitial load failed: ${err?.message || 'Error'}`, ...prev]);
      });

      const unsubClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        setInterstitialLoaded(false);
        setAdLog(prev => ['[AdMob] Test Interstitial closed by user', ...prev]);
        unsubLoaded();
        unsubError();
        unsubClosed();
      });

      interstitial.load();
    } catch (e: any) {
      setInterstitialLoading(false);
      setAdLog(prev => [`[Exception] ${e.message}`, ...prev]);
    }
  };

  const showInterstitialAdHandler = () => {
    if (!isNativePlatform || isExpoGo || !interstitialRef.current || !InterstitialAd) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      Alert.alert(
        "✨ TEST INTERSTITIAL AD (Simulated)",
        `This is a full-screen Google Test Interstitial Ad.\n\nTest Unit ID:\n${GOOGLE_TEST_ADS.INTERSTITIAL}`,
        [
          {
            text: "CLOSE TEST AD",
            onPress: () => {
              setInterstitialLoaded(false);
              setAdLog(prev => ['[Simulated] Test Interstitial displayed and closed', ...prev]);
            }
          }
        ]
      );
      return;
    }

    try {
      interstitialRef.current.show();
    } catch (e: any) {
      Alert.alert("Ad Show Error", e.message);
    }
  };

  // --- REWARDED AD HANDLERS ---
  const loadRewardedAdHandler = () => {
    const rewardedAdUnitId = TestIds ? TestIds.REWARDED : GOOGLE_TEST_ADS.REWARDED;
    rewardClaimedRef.current = false;

    if (!RewardedAd || isExpoGo || !isNativePlatform) {
      setRewardedLoading(true);
      setTimeout(() => {
        setRewardedLoading(false);
        setRewardedLoaded(true);
        setAdLog(prev => ['[Simulated] Test Rewarded Ad loaded successfully', ...prev]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }, 1000);
      return;
    }

    setRewardedLoading(true);
    setAdLog(prev => [`[AdMob] Requesting Test Rewarded Ad: ${rewardedAdUnitId}`, ...prev]);

    try {
      const rewarded = RewardedAd.createForAdRequest(rewardedAdUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      rewardedRef.current = rewarded;

      const unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        setRewardedLoading(false);
        setRewardedLoaded(true);
        setAdLog(prev => ['[AdMob SUCCESS] Test Rewarded Ad Loaded!', ...prev]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      });

      const unsubEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
        if (rewardClaimedRef.current) {
          console.log('[AdMob] Duplicate reward callback ignored');
          return;
        }
        rewardClaimedRef.current = true;
        const newBal = await addTestCoins(10);
        setTestCoins(newBal);
        setAdLog(prev => [`[REWARD EARNED] +10 TEST_COINS awarded! Balance: ${newBal}`, ...prev]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Alert.alert(
          "🪙 TEST REWARD EARNED",
          `Congratulations! You received +10 TEST_COINS!\n\nNew Balance: ${newBal} TEST_COINS\n\n(Local development test reward only. Not real currency/money).`,
          [{ text: "GREAT" }]
        );
      });

      const unsubError = rewarded.addAdEventListener(AdEventType.ERROR, (err: any) => {
        setRewardedLoading(false);
        setRewardedLoaded(false);
        setAdLog(prev => [`[AdMob ERROR] Rewarded Ad load failed: ${err?.message || 'Error'}`, ...prev]);
      });

      const unsubClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        setRewardedLoaded(false);
        setAdLog(prev => ['[AdMob] Test Rewarded Ad closed', ...prev]);
        unsubLoaded();
        unsubEarned();
        unsubError();
        unsubClosed();
      });

      rewarded.load();
    } catch (e: any) {
      setRewardedLoading(false);
      setAdLog(prev => [`[Exception] ${e.message}`, ...prev]);
    }
  };

  const showRewardedAdHandler = () => {
    if (!isNativePlatform || isExpoGo || !rewardedRef.current || !RewardedAd) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      Alert.alert(
        "📺 TEST REWARDED AD (Simulated)",
        `Watch Google Test Rewarded Video to earn +10 TEST_COINS?\n\nTest Unit ID:\n${GOOGLE_TEST_ADS.REWARDED}`,
        [
          { text: "CANCEL", style: "cancel" },
          {
            text: "CLAIM +10 TEST COINS",
            onPress: async () => {
              setRewardedLoaded(false);
              const newBal = await addTestCoins(10);
              setTestCoins(newBal);
              setAdLog(prev => [`[Simulated Reward] Earned +10 TEST_COINS! Total: ${newBal}`, ...prev]);
              Alert.alert("🪙 TEST REWARD", `+10 TEST_COINS added! Balance: ${newBal}`);
            }
          }
        ]
      );
      return;
    }

    try {
      rewardedRef.current.show();
    } catch (e: any) {
      Alert.alert("Ad Show Error", e.message);
    }
  };

  // --- BANNER AD RENDERER ---
  const renderBannerAd = () => {
    if (BannerAd && BannerAdSize && isNativePlatform && !isExpoGo) {
      const bannerUnitId = TestIds ? TestIds.BANNER : GOOGLE_TEST_ADS.BANNER;
      return (
        <View style={styles.bannerAdWrapper}>
          <Text style={styles.bannerAdLabel}>GOOGLE MOBILE ADS NATIVE TEST BANNER</Text>
          <BannerAd
            unitId={bannerUnitId}
            size={BannerAdSize.ANCHORED_AD_STATIC}
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,
            }}
            onAdLoaded={() => {
              setBannerLoaded(true);
              setAdLog(prev => ['[AdMob SUCCESS] Native Test Banner Ad loaded', ...prev]);
            }}
            onAdFailedToLoad={(err: any) => {
              setBannerLoaded(false);
              setAdLog(prev => [`[AdMob ERROR] Banner load failed: ${err?.message || 'Error'}`, ...prev]);
            }}
          />
        </View>
      );
    }

    // Web / Expo Go / Fallback Banner Visual Container
    return (
      <View style={styles.simulatedBannerContainer}>
        <LinearGradient
          colors={['#1e1b4b', '#311b92']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.simulatedBannerGradient}
        >
          <View style={styles.simulatedBannerHeader}>
            <View style={styles.testBadge}>
              <Text style={styles.testBadgeText}>GOOGLE TEST BANNER AD</Text>
            </View>
            <Text style={styles.adMobTag}>Google Mobile Ads SDK</Text>
          </View>
          <Text style={styles.simulatedBannerTitle}>Google AdMob Banner Test Integration</Text>
          <Text style={styles.simulatedBannerSub}>Unit ID: {GOOGLE_TEST_ADS.BANNER}</Text>
        </LinearGradient>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/menu')}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Google Mobile Ads</Text>
          <Text style={styles.headerSubtitle}>Test Environment Portal</Text>
        </View>
        <View style={styles.testModeHeaderBadge}>
          <Text style={styles.testModeHeaderBadgeText}>TEST MODE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* TEST REWARDS DISCLAIMER BOX */}
        <View style={styles.disclaimerCard}>
          <Ionicons name="shield-checkmark" size={20} color="#10B981" />
          <View style={styles.disclaimerTextCol}>
            <Text style={styles.disclaimerTitle}>DEVELOPMENT TEST ENVIRONMENT</Text>
            <Text style={styles.disclaimerBody}>
              All ads use Google&apos;s official <Text style={styles.boldText}>TEST Ad Unit IDs</Text>. Rewards earned here award local <Text style={styles.boldText}>+10 TEST_COINS</Text> only and are <Text style={styles.boldText}>NOT connected to real money, withdrawals, payouts, or the production wallet</Text>.
            </Text>
          </View>
        </View>

        {/* LOCAL TEST COINS COUNTER */}
        <View style={styles.coinsCard}>
          <View style={styles.coinsLeft}>
            <View style={styles.coinIconCircle}>
              <FontAwesome5 name="coins" size={20} color="#FFD700" />
            </View>
            <View>
              <Text style={styles.coinsLabel}>LOCAL TEST COINS BALANCE</Text>
              <Text style={styles.coinsValue}>{testCoins} <Text style={styles.coinsUnit}>TEST_COINS</Text></Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleResetCoins} style={styles.resetCoinsBtn}>
            <Ionicons name="refresh" size={16} color="#aaa" />
            <Text style={styles.resetCoinsText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 1: BANNER AD TEST */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="view-dashboard-outline" size={20} color="#00D4FF" />
            <Text style={styles.sectionTitle}>1. Banner Test Ad</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Official Google Test Banner Ad unit embedded at the bottom of content blocks.
          </Text>
          <Text style={styles.unitIdText}>Unit ID: {GOOGLE_TEST_ADS.BANNER}</Text>

          {renderBannerAd()}
        </View>

        {/* SECTION 2: INTERSTITIAL AD TEST */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="cellphone-text" size={20} color="#A855F7" />
            <Text style={styles.sectionTitle}>2. Interstitial Test Ad</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Full-screen transition ad that loads in background and presents on trigger.
          </Text>
          <Text style={styles.unitIdText}>Unit ID: {GOOGLE_TEST_ADS.INTERSTITIAL}</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.loadBtn]}
              onPress={loadInterstitialAd}
              disabled={interstitialLoading}
            >
              {interstitialLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={18} color="#fff" />
                  <Text style={styles.btnText}>Load Interstitial</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.showBtn,
                !interstitialLoaded && styles.disabledBtn
              ]}
              onPress={showInterstitialAdHandler}
              disabled={!interstitialLoaded}
            >
              <Ionicons name="play" size={18} color="#fff" />
              <Text style={styles.btnText}>Show Interstitial</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statusIndicatorRow}>
            <View style={[styles.statusDot, { backgroundColor: interstitialLoaded ? '#10B981' : '#666' }]} />
            <Text style={styles.statusText}>
              Status: {interstitialLoaded ? 'Ad Ready To Display' : interstitialLoading ? 'Loading...' : 'Not Loaded'}
            </Text>
          </View>
        </View>

        {/* SECTION 3: REWARDED AD TEST */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="gift" size={18} color="#FFD700" />
            <Text style={styles.sectionTitle}>3. Rewarded Video Test Ad</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Watch full test video ad to receive local +10 TEST_COINS reward. Skips/closes before completion yield 0 TEST_COINS.
          </Text>
          <Text style={styles.unitIdText}>Unit ID: {GOOGLE_TEST_ADS.REWARDED}</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.loadBtn]}
              onPress={loadRewardedAdHandler}
              disabled={rewardedLoading}
            >
              {rewardedLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={18} color="#fff" />
                  <Text style={styles.btnText}>Load Rewarded</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.rewardShowBtn,
                !rewardedLoaded && styles.disabledBtn
              ]}
              onPress={showRewardedAdHandler}
              disabled={!rewardedLoaded}
            >
              <FontAwesome5 name="play-circle" size={16} color="#000" />
              <Text style={styles.rewardBtnText}>Watch Ad To Earn +10</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statusIndicatorRow}>
            <View style={[styles.statusDot, { backgroundColor: rewardedLoaded ? '#FFD700' : '#666' }]} />
            <Text style={styles.statusText}>
              Status: {rewardedLoaded ? 'Ad Ready (+10 TEST_COINS reward)' : rewardedLoading ? 'Loading...' : 'Not Loaded'}
            </Text>
          </View>
        </View>

        {/* SECTION 4: IN-FEED TEST AD STATUS & NAVIGATION */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="view-stream-outline" size={20} color="#FF007A" />
            <Text style={styles.sectionTitle}>4. In-Feed Short Video Test Ad</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Test ad placement injected inside the short video feed at a controlled frequency (every 5 Reels). Clearly demarcated with SPONSORED badge.
          </Text>
          <Text style={styles.unitIdText}>Active Placement: app/(tabs)/video-feed.tsx</Text>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#FF007A' }]}
            onPress={() => router.push('/(tabs)/video-feed')}
          >
            <Ionicons name="play-circle-outline" size={20} color="#fff" />
            <Text style={styles.btnText}>Open Video Feed To Preview</Text>
          </TouchableOpacity>
        </View>

        {/* LOGS CONSOLE CARD */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="terminal-outline" size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>AdMob Event Console</Text>
          </View>
          <View style={styles.consoleBox}>
            {adLog.map((log, idx) => (
              <Text key={idx} style={styles.consoleLine}>
                {log}
              </Text>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    backgroundColor: '#0A0A0F',
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#00D4FF',
    fontSize: 11,
    fontWeight: '600',
  },
  testModeHeaderBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  testModeHeaderBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  disclaimerCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 20,
    gap: 12,
  },
  disclaimerTextCol: {
    flex: 1,
  },
  disclaimerTitle: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  disclaimerBody: {
    color: '#CCCCCC',
    fontSize: 12,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  coinsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F0F1A',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#22223a',
    marginBottom: 20,
  },
  coinsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  coinIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  coinsLabel: {
    color: '#888888',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  coinsValue: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  coinsUnit: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  resetCoinsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A1A2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#33334d',
  },
  resetCoinsText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionCard: {
    backgroundColor: '#0A0A0F',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1F1F2E',
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionDesc: {
    color: '#AAAAAA',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  unitIdText: {
    color: '#666688',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 15,
  },
  bannerAdWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginTop: 5,
  },
  bannerAdLabel: {
    color: '#666',
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  simulatedBannerContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 5,
  },
  simulatedBannerGradient: {
    padding: 16,
    borderRadius: 14,
  },
  simulatedBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  testBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  testBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
  },
  adMobTag: {
    color: '#00D4FF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  simulatedBannerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  simulatedBannerSub: {
    color: '#AAAAAA',
    fontSize: 10,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 5,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
  },
  loadBtn: {
    backgroundColor: '#3B82F6',
  },
  showBtn: {
    backgroundColor: '#A855F7',
  },
  rewardShowBtn: {
    backgroundColor: '#FFD700',
  },
  disabledBtn: {
    opacity: 0.4,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  rewardBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
  },
  consoleBox: {
    backgroundColor: '#050508',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#151522',
    maxHeight: 180,
  },
  consoleLine: {
    color: '#00D4FF',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
});
