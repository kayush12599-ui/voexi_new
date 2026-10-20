import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
  Share,
  Animated,
  Easing,
  Alert,
  Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { VOEXITheme } from '../constants/theme';
import {
  GOOGLE_TEST_ADS,
  getAdMobModule,
  isExpoGo,
  isNativePlatform
} from '../lib/adService';

const { width } = Dimensions.get('window');

let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

if (Platform.OS !== 'web') {
  const adsModule = getAdMobModule();
  if (adsModule) {
    BannerAd = adsModule.BannerAd;
    BannerAdSize = adsModule.BannerAdSize;
    TestIds = adsModule.TestIds;
  }
}

interface InFeedAdProps {
  itemHeight: number;
  isActive: boolean;
}

export default function InFeedTestAdCard({ itemHeight, isActive }: InFeedAdProps) {
  const [adLoaded, setAdLoaded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(1540);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3500,
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== 'web',
        })
      ).start();
    } else {
      rotateAnim.stopAnimation();
    }
  }, [isActive]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const bannerUnitId = TestIds ? TestIds.BANNER : GOOGLE_TEST_ADS.BANNER;

  const handleCTAPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Linking.openURL('https://developers.google.com/admob').catch(() => {});
  };

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsLiked(prev => {
      setLikes(l => prev ? l - 1 : l + 1);
      return !prev;
    });
  };

  const handleToggleSubscribe = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setIsSubscribed(prev => !prev);
    if (Platform.OS === 'web') {
      console.log(isSubscribed ? "Unsubscribed from @admob_test_sponsor" : "Subscribed to @admob_test_sponsor!");
    } else {
      Alert.alert(
        isSubscribed ? "UNSUBSCRIBED" : "SUBSCRIBED",
        isSubscribed ? "Unsubscribed from @admob_test_sponsor" : "Subscribed to @admob_test_sponsor!"
      );
    }
  };

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Share.share({
      message: "Check out this Google Mobile Ads test placement on VOEXI!",
      url: "https://developers.google.com/admob",
    });
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsSaved(prev => !prev);
    if (Platform.OS === 'web') {
      console.log(isSaved ? "Removed from bookmarks." : "Test Ad bookmarked.");
    } else {
      Alert.alert("SAVED", isSaved ? "Removed from bookmarks." : "Test Ad bookmarked.");
    }
  };

  return (
    <View style={{ height: itemHeight, width: width, backgroundColor: '#000', paddingVertical: 12, paddingHorizontal: 6, overflow: 'hidden' }}>
      <View style={styles.cardWrapper}>
        <LinearGradient
          colors={['#0a0a16', '#12122b', '#05050f']}
          style={StyleSheet.absoluteFillObject}
        />

        {/* TOP SPONSORED BAR - Clearly demarcates test ad from normal user videos */}
        <View style={styles.topAdHeader}>
          <View style={styles.sponsoredBadge}>
            <MaterialCommunityIcons name="bullhorn" size={13} color="#000" />
            <Text style={styles.sponsoredBadgeText}>SPONSORED TEST AD</Text>
          </View>
          <View style={styles.googleAdTag}>
            <FontAwesome5 name="google" size={10} color="#00D4FF" />
            <Text style={styles.googleAdTagText}>Google Mobile Ads</Text>
          </View>
        </View>

        {/* CENTER NATIVE BANNER AD PLACEMENT */}
        <View style={styles.centerMediaFrame}>
          {BannerAd && BannerAdSize && isNativePlatform && !isExpoGo ? (
            <BannerAd
              unitId={bannerUnitId}
              size={BannerAdSize.MEDIUM_RECTANGLE}
              requestOptions={{ requestNonPersonalizedAdsOnly: true }}
              onAdLoaded={() => setAdLoaded(true)}
              onAdFailedToLoad={(e: any) => console.warn('[InFeedAd] Banner Load Error:', e)}
            />
          ) : (
            <View style={styles.simulatedMediaCard}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800&fit=crop' }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.simulatedLogoBg}>
                <FontAwesome5 name="google" size={24} color="#00D4FF" />
              </View>
              <Text style={styles.simulatedTitle}>Google AdMob Sponsored Placement</Text>
              <Text style={styles.simulatedSub}>Unit ID: {GOOGLE_TEST_ADS.BANNER}</Text>
            </View>
          )}
        </View>

        {/* OVERLAY: BOTTOM UPLOADER INFO + SUBSCRIBE & CTA */}
        <View style={styles.bottomOverlay}>
          <View style={styles.uploaderRow}>
            <View style={styles.avatarBorder}>
              <Image
                source={{ uri: 'https://ui-avatars.com/api/?name=AdMob+Sponsor&background=00D4FF&color=fff&bold=true' }}
                style={styles.miniAvatar}
              />
            </View>
            <View style={styles.nameCol}>
              <View style={styles.nameRow}>
                <Text style={styles.sponsorName} numberOfLines={1}>@admob_test_sponsor</Text>
                <View style={styles.onlineDot} />
                <TouchableOpacity
                  style={[styles.subBtn, isSubscribed && styles.subBtnActive]}
                  onPress={handleToggleSubscribe}
                >
                  <Text style={[styles.subBtnText, isSubscribed && styles.subBtnTextActive]}>
                    {isSubscribed ? 'SUBSCRIBED' : 'SUBSCRIBE'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.categoryTxt}>SPONSORED PROMOTION</Text>
            </View>
          </View>

          <Text style={styles.titleText}>Google Mobile Ads In-Feed Reel</Text>
          <Text style={styles.descText} numberOfLines={2}>
            Official AdMob development test placement embedded directly into short video reels.
          </Text>

          {/* VISIT SPONSOR CTA BUTTON */}
          <TouchableOpacity style={styles.ctaButton} onPress={handleCTAPress} activeOpacity={0.85}>
            <LinearGradient
              colors={['#7C5CFF', '#00D4FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>VISIT TEST SPONSOR</Text>
              <Ionicons name="open-outline" size={15} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* OVERLAY: RIGHT SIDEBAR ACTIONS (LIKE, COMMENT, SHARE, SAVE, REMIX) */}
        <View style={styles.sidebar}>
          <TouchableOpacity style={styles.sideBtn} onPress={handleLike}>
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={26} color={isLiked ? VOEXITheme.colors.primary : "#fff"} />
            <Text style={styles.sideBtnText}>{likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideBtn} onPress={handleCTAPress}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#fff" />
            <Text style={styles.sideBtnText}>280</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideBtn} onPress={handleShare}>
            <Ionicons name="paper-plane-outline" size={24} color="#00F2FE" />
            <Text style={[styles.sideBtnText, { color: '#00F2FE' }]}>SHARE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideBtn} onPress={handleSave}>
            <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={24} color={isSaved ? VOEXITheme.colors.primary : "#fff"} />
            <Text style={[styles.sideBtnText, isSaved && { color: VOEXITheme.colors.primary }]}>{isSaved ? 'SAVED' : 'SAVE'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideBtn} onPress={handleCTAPress}>
            <Animated.View style={[styles.diskWrapper, { transform: [{ rotate }] }]}>
              <Image
                source={{ uri: 'https://ui-avatars.com/api/?name=AdMob+Sponsor&background=00D4FF&color=fff&bold=true' }}
                style={styles.diskCover}
              />
            </Animated.View>
            <Text style={styles.sideBtnText}>SPONSOR</Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#0A0A0F',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.3)',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topAdHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 20 : 15,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  sponsoredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sponsoredBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  googleAdTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  googleAdTagText: {
    color: '#00D4FF',
    fontSize: 10,
    fontWeight: '700',
  },
  centerMediaFrame: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingTop: 45,
    paddingBottom: 155,
    zIndex: 5,
  },
  simulatedMediaCard: {
    width: '100%',
    height: 180,
    backgroundColor: '#070712',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  simulatedLogoBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  simulatedTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  simulatedSub: {
    color: '#666688',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 16,
    bottom: Platform.OS === 'ios' ? 25 : 15,
    right: 75,
    zIndex: 10,
  },
  uploaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatarBorder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#00D4FF',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  miniAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  nameCol: {
    marginLeft: 10,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sponsorName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginHorizontal: 6,
  },
  subBtn: {
    backgroundColor: VOEXITheme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  subBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  subBtnText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  subBtnTextActive: {
    color: '#aaa',
  },
  categoryTxt: {
    color: '#00D4FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
  },
  titleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  descText: {
    color: '#ccc',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  ctaButton: {
    width: '100%',
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  ctaGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sidebar: {
    position: 'absolute',
    right: 12,
    bottom: 25,
    alignItems: 'center',
    gap: 16,
    zIndex: 10,
  },
  sideBtn: {
    alignItems: 'center',
    gap: 3,
  },
  sideBtnText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  diskWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#111',
    borderWidth: 2,
    borderColor: '#00D4FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  diskCover: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});
