import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, Dimensions, Platform, TouchableOpacity, Image, Linking } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { VOEXITheme } from '../constants/theme';

const { width } = Dimensions.get('window');

// Guard for Expo Go and Web
const isNative = Platform.OS === 'android' || Platform.OS === 'ios';
const isExpoGo = Constants.appOwnership === 'expo';

// --- DUMMY ADS DATA ---
const DUMMY_ADS = [
  {
    headline: 'VOEXI Pro: The Future is Here',
    tagline: 'Experience the next generation of social media with AI-driven content and high-fidelity streaming.',
    advertiser: 'VOEXI Sponsor',
    cta: 'EXPLORE NOW',
    icon: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&h=200&fit=crop',
    media: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800&fit=crop',
    url: 'https://voexi.com'
  },
  {
    headline: 'Crystal Clear Studio Audio Beats',
    tagline: 'Get the best remix tools and studio-quality filters for your next viral hit.',
    advertiser: 'AudioSync Studio',
    cta: 'LEARN MORE',
    icon: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop',
    media: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&fit=crop',
    url: 'https://voexi.com'
  },
  {
    headline: 'Neural AI Creation Suite',
    tagline: 'Generate stunning 9:16 reels, photos, and music in seconds with neural intelligence.',
    advertiser: 'Neural AI Core',
    cta: 'TRY AI CREATOR',
    icon: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&h=200&fit=crop',
    media: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&fit=crop',
    url: 'https://voexi.com'
  }
];

export default function NativeAdItem() {
  const [dummyAd, setDummyAd] = useState(DUMMY_ADS[0]);

  useEffect(() => {
    // Randomize dummy ad on mount
    const randomIndex = Math.floor(Math.random() * DUMMY_ADS.length);
    setDummyAd(DUMMY_ADS[randomIndex]);
  }, []);

  if (!isNative || isExpoGo) {
    // Show a high-quality Dummy Ad in Expo Go and Web
    return (
      <View style={styles.container}>
        <View style={styles.adContent}>
          <View style={styles.header}>
            <Image source={{ uri: dummyAd.icon }} style={styles.icon} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headline}>{dummyAd.headline}</Text>
              <Text style={styles.advertiser}>{dummyAd.advertiser}</Text>
            </View>
            <View style={styles.adBadge}>
              <Text style={styles.adBadgeText}>SPONSORED</Text>
            </View>
          </View>

          <Text style={styles.tagline}>{dummyAd.tagline}</Text>

          <Image source={{ uri: dummyAd.media }} style={styles.media} />

          <TouchableOpacity
            style={styles.dummyCta}
            onPress={() => Linking.openURL(dummyAd.url)}
          >
            <LinearGradient
              colors={[VOEXITheme.colors.primary, '#6d28d9']}
              start={{x:0, y:0}}
              end={{x:1, y:0}}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>{dummyAd.cta}</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Real AdMob Implementation (Dynamic require to prevent crash in Expo Go)
  let NativeAdView;
  let CallToActionView, IconView, HeadlineView, TaglineView, AdvertiserView, MediaView;
  let AD_UNITS;

  try {
    const NativeAdViewModule = require('react-native-google-mobile-ads');
    NativeAdView = NativeAdViewModule.default;
    CallToActionView = NativeAdViewModule.CallToActionView;
    IconView = NativeAdViewModule.IconView;
    HeadlineView = NativeAdViewModule.HeadlineView;
    TaglineView = NativeAdViewModule.TaglineView;
    AdvertiserView = NativeAdViewModule.AdvertiserView;
    MediaView = NativeAdViewModule.MediaView;
    const adsLib = require('../lib/ads');
    AD_UNITS = adsLib.AD_UNITS;
  } catch (e) {
    return null;
  }

  return (
    <View style={styles.container}>
      <NativeAdView
        adUnitID={AD_UNITS.NATIVE}
        style={{ width: '100%' }}
      >
        <View style={styles.adContent}>
          <View style={styles.header}>
            <IconView style={styles.icon} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <HeadlineView style={styles.headline} />
              <AdvertiserView style={styles.advertiser} />
            </View>
            <View style={styles.adBadge}>
              <Text style={styles.adBadgeText}>AD</Text>
            </View>
          </View>

          <TaglineView style={styles.tagline} />
          <MediaView style={styles.media} />

          <CallToActionView
            style={styles.cta}
            textStyle={styles.ctaText}
            buttonAndroidStyle={{ backgroundColor: VOEXITheme.colors.primary, borderRadius: 12 }}
          />
        </View>
      </NativeAdView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width - 30,
    alignSelf: 'center',
    backgroundColor: '#0A0A0F',
    borderRadius: 24,
    marginVertical: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  adContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#111',
  },
  headline: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  advertiser: {
    color: '#666',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  adBadge: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  adBadgeText: {
    color: '#FFD700',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tagline: {
    color: '#999',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 15,
  },
  media: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    backgroundColor: '#000',
  },
  cta: {
    height: 48,
    marginTop: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dummyCta: {
    height: 48,
    marginTop: 15,
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
