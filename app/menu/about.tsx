import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Animated, Easing, Platform, ActivityIndicator, Linking } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { VoexiIcon } from '../../components/VoexiIcon';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { MEDIA_SERVER_URL } from '../../constants/config';

const { width } = Dimensions.get('window');
const LOCAL_SERVER_URL = MEDIA_SERVER_URL;

export interface AboutConfig {
  headerLabel: string;
  appName: string;
  statusBadge: string;
  aboutTitle: string;
  aboutDesc: string;
  version: string;
  status: string;
  developer: string;
  origin: string;
  footerThankYou: string;
  copyright: string;
}

export const DEFAULT_ABOUT_CONFIG: AboutConfig = {
  headerLabel: 'ELITE CORE LOG',
  appName: 'VOEXI',
  statusBadge: 'PRIVATE BETA • NEURAL LINK ACTIVE',
  aboutTitle: 'ABOUT VOEXI',
  aboutDesc: "VOEXI is a next-generation AI-powered social platform designed for creators, communities, and meaningful digital experiences. Built with innovation, privacy, and performance at its core, VOEXI offers a fresh social experience focused on creativity, intelligent features, and authentic connections.",
  version: '1.0.0',
  status: 'COMING SOON',
  developer: 'VOEXI TEAM',
  origin: 'CORE PROTOCOL',
  footerThankYou: "Thank you for being part of VOEXI. Together we're building the future of social connection.",
  copyright: `© ${new Date().getFullYear()} VOEXI. ALL RIGHTS RESERVED.`
};

/**
 * VOEXI ULTRA-PREMIUM "ABOUT" TERMINAL
 * Dynamic Server Sync (Web Admin Config) + Instant Local Cache
 */
export default function AboutVoexiScreen() {
  const router = useRouter();
  const { isLight } = useTheme();

  const [config, setConfig] = useState<AboutConfig>(DEFAULT_ABOUT_CONFIG);
  const [loading, setLoading] = useState<boolean>(false);

  // Animation Engines
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const orbitAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 15, friction: 9, useNativeDriver: true }),
      Animated.loop(
        Animated.timing(orbitAnim, { toValue: 1, duration: 20000, easing: Easing.linear, useNativeDriver: true })
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 2000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
        ])
      )
    ]).start();

    loadConfig();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadConfig();
    }, [])
  );

  const getVal = (val1: any, val2: any, fallback: string) => {
    if (val1 !== undefined && val1 !== null && String(val1).trim() !== '') return String(val1);
    if (val2 !== undefined && val2 !== null && String(val2).trim() !== '') return String(val2);
    return fallback;
  };

  const loadConfig = async () => {
    // 1. FAST LOCAL CACHE RESTORE (0ms Network Lag)
    try {
      const localStr = await AsyncStorage.getItem('@cached_voexi_about_config');
      if (localStr) {
        const parsed = JSON.parse(localStr);
        if (parsed && typeof parsed === 'object') {
          setConfig(prev => ({ ...prev, ...parsed }));
        }
      }
    } catch (e) {}

    // 2. FAST LOCAL SERVER 2 SYNC WITH 1200MS TIMEOUT SHIELD
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${LOCAL_SERVER_URL}/app-info.json`, { signal: controller.signal }).catch(() => null);
      clearTimeout(timer);

      if (res && res.ok) {
        const s2Data = await res.json();
        const bData = s2Data?.layer1_branding || s2Data || {};
        if (bData && typeof bData === 'object') {
          const merged = {
            headerLabel: getVal(bData.header_label, bData.headerLabel, DEFAULT_ABOUT_CONFIG.headerLabel),
            appName: getVal(bData.app_name, bData.appName, DEFAULT_ABOUT_CONFIG.appName),
            statusBadge: getVal(bData.status_badge, bData.statusBadge, DEFAULT_ABOUT_CONFIG.statusBadge),
            aboutTitle: getVal(bData.about_title, bData.aboutTitle, DEFAULT_ABOUT_CONFIG.aboutTitle),
            aboutDesc: getVal(bData.about_desc, bData.aboutDesc, DEFAULT_ABOUT_CONFIG.aboutDesc),
            version: getVal(bData.version, bData.version, DEFAULT_ABOUT_CONFIG.version),
            status: getVal(bData.status, bData.status, DEFAULT_ABOUT_CONFIG.status),
            developer: getVal(bData.developer, bData.developer, DEFAULT_ABOUT_CONFIG.developer),
            origin: getVal(bData.origin, bData.origin, DEFAULT_ABOUT_CONFIG.origin),
            footerThankYou: getVal(bData.footer_thankyou, bData.footerThankYou, DEFAULT_ABOUT_CONFIG.footerThankYou),
            copyright: getVal(bData.copyright, bData.copyright, DEFAULT_ABOUT_CONFIG.copyright),
          };
          setConfig(merged);
          await AsyncStorage.setItem('@cached_voexi_about_config', JSON.stringify(merged));
        }
      }
    } catch (e) {
      console.log("[ABOUT] Server sync optional fallback active.");
    }
  };

  const orbitRotation = orbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const ProtocolButton = ({ title, url, route, icon }: any) => (
    <TouchableOpacity
      style={styles.protocolBtn}
      activeOpacity={0.7}
      onPress={() => {
        if (route) {
          router.push(route);
        } else if (url) {
          Linking.openURL(url).catch(() => {
            router.push({
              pathname: '/menu/web-portal',
              params: { url, title }
            });
          });
        }
      }}
    >
      <LinearGradient
        colors={['rgba(168, 85, 247, 0.1)', 'rgba(0, 242, 254, 0.05)']}
        style={styles.protocolGradient}
      >
        <Ionicons name={icon} size={18} color="#00F2FE" />
        <Text style={styles.protocolText}>{title.toUpperCase()}</Text>
        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.2)" />
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0B0B0F', '#050508']} style={StyleSheet.absoluteFill} />

      {/* Background Intelligence Aura */}
      <View style={styles.auraContainer}>
        <Animated.View style={[styles.glowOrb, { transform: [{ scale: pulseAnim }] }]} />
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeAction}>
          <Ionicons name="close-outline" size={32} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerLabel}>{config.headerLabel || 'ELITE CORE LOG'}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* HERO: VOEXI NEURAL IDENTITY */}
        <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.masterLogo}>
             <Animated.View style={[styles.logoOrbit, { transform: [{ rotate: orbitRotation }] }]} />
             <VoexiIcon size={110} />
          </View>
          <Text style={styles.appName}>{config.appName || 'VOEXI'}</Text>
          <View style={styles.statusBadge}>
             <View style={styles.statusDot} />
             <Text style={styles.statusText}>{config.statusBadge || 'PRIVATE BETA • NEURAL LINK ACTIVE'}</Text>
          </View>
        </Animated.View>

        {/* MISSION MANIFESTO */}
        <View style={styles.manifestoCard}>
          <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'transparent']}
            style={StyleSheet.absoluteFill}
            borderRadius={30}
          />
          <Text style={styles.manifestoTitle}>{config.aboutTitle || 'ABOUT VOEXI'}</Text>
          <Text style={styles.manifestoDesc}>
            {config.aboutDesc || DEFAULT_ABOUT_CONFIG.aboutDesc}
          </Text>
        </View>

        {/* VERSION BADGE */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionLabel}>VERSION <Text style={styles.versionValue}>{config.version || '1.0.0'}</Text></Text>
        </View>

        {/* CORE PROTOCOLS */}
        <View style={styles.protocolSection}>
           <ProtocolButton title="Privacy Policy" icon="shield-half-outline" route="/menu/privacy" />
           <ProtocolButton title="Terms of Service" icon="document-text-outline" route="/menu/terms" />
           <ProtocolButton title="Contact Support" icon="headset-outline" route="/menu/report" />
           <ProtocolButton title="Report a Problem" icon="bug-outline" route="/menu/report" />
           <ProtocolButton title="Local Media Server Dashboard" icon="server-outline" url="http://192.168.31.39:8080" />
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
           <Text style={styles.footerThankyou}>
             {config.footerThankYou || DEFAULT_ABOUT_CONFIG.footerThankYou}
           </Text>
           <Text style={styles.copyright}>{config.copyright || DEFAULT_ABOUT_CONFIG.copyright}</Text>
           <View style={styles.footerLine} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0F' },
  scroll: { paddingBottom: 60 },
  auraContainer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  glowOrb: { width: 300, height: 300, borderRadius: 150, backgroundColor: '#A855F7', opacity: 0.03 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, height: 70 },
  closeAction: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 4 },

  hero: { alignItems: 'center', paddingVertical: 40 },
  masterLogo: { width: 160, height: 160, justifyContent: 'center', alignItems: 'center' },
  logoOrbit: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderStyle: 'dashed', borderWidth: 1, borderColor: '#00F2FE', opacity: 0.2 },
  appName: { color: '#fff', fontSize: 38, fontWeight: '900', letterSpacing: 10, marginTop: 25 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00C851', marginRight: 8 },
  statusText: { color: '#888', fontSize: 8, fontWeight: '900', letterSpacing: 1 },

  manifestoCard: { marginHorizontal: 25, padding: 30, borderRadius: 35, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  manifestoTitle: { color: '#A855F7', fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 15 },
  manifestoDesc: { color: '#aaa', fontSize: 14, lineHeight: 24, fontWeight: '600', textAlign: 'left' },

  versionContainer: { alignItems: 'center', marginTop: 25, marginBottom: 10 },
  versionLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  versionValue: { color: '#00F2FE', fontSize: 12, fontWeight: '900' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginTop: 30, gap: 10 },
  statBox: { width: (width - 60) / 2, backgroundColor: 'rgba(255,255,255,0.02)', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  statLabel: { color: '#555', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  statValue: { color: '#fff', fontSize: 11, fontWeight: '800', marginTop: 4, letterSpacing: 0.5 },

  protocolSection: { marginTop: 40, paddingHorizontal: 25, gap: 12 },
  protocolBtn: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  protocolGradient: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 15 },
  protocolText: { flex: 1, color: '#eee', fontSize: 11, fontWeight: '900', letterSpacing: 2 },

  footer: { marginTop: 60, alignItems: 'center', paddingHorizontal: 40 },
  footerThankyou: { color: '#777', fontSize: 12, textAlign: 'center', lineHeight: 20, fontWeight: '700' },
  copyright: { color: '#444', fontSize: 9, fontWeight: '900', marginTop: 25, letterSpacing: 1 },
  footerLine: { width: 40, height: 2, backgroundColor: '#A855F7', marginTop: 15, borderRadius: 1, opacity: 0.3 }
});
