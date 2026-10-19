import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Animated, Easing, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { VoexiIcon } from '../../components/VoexiIcon';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

/**
 * VOEXI ULTRA-PREMIUM "ABOUT" TERMINAL
 * Designed for pure originality, luxury, and futuristic AI identity.
 * Strictly 0% imitation of existing social media apps.
 */
export default function AboutVoexiScreen() {
  const router = useRouter();
  const { isLight } = useTheme();

  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const currentYear = new Date().getFullYear();

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
  }, []);

  const orbitRotation = orbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const ProtocolButton = ({ title, url, icon }: any) => (
    <TouchableOpacity
      style={styles.protocolBtn}
      activeOpacity={0.7}
      onPress={() => router.push({
        pathname: '/menu/web-portal',
        params: { url, title }
      })}
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
        <Text style={styles.headerLabel}>ELITE CORE LOG</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* HERO: VOEXI NEURAL IDENTITY */}
        <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.masterLogo}>
             <Animated.View style={[styles.logoOrbit, { transform: [{ rotate: orbitRotation }] }]} />
             <VoexiIcon size={110} />
          </View>
          <Text style={styles.appName}>VOEXI</Text>
          <View style={styles.statusBadge}>
             <View style={styles.statusDot} />
             <Text style={styles.statusText}>PRIVATE BETA • NEURAL LINK ACTIVE</Text>
          </View>
        </Animated.View>

        {/* MISSION MANIFESTO */}
        <View style={styles.manifestoCard}>
          <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'transparent']}
            style={StyleSheet.absoluteFill}
            borderRadius={30}
          />
          <Text style={styles.manifestoTitle}>ABOUT VOEXI</Text>
          <Text style={styles.manifestoDesc}>
            VOEXI is a next-generation AI-powered social platform designed for creators, communities, and meaningful digital experiences. Built with innovation, privacy, and performance at its core, VOEXI offers a fresh social experience focused on creativity, intelligent features, and authentic connections.
          </Text>
        </View>

        {/* NEURAL STATS GRID */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
             <Text style={styles.statLabel}>VERSION</Text>
             <Text style={styles.statValue}>{appVersion}</Text>
          </View>
          <View style={styles.statBox}>
             <Text style={styles.statLabel}>STATUS</Text>
             <Text style={styles.statValue}>COMING SOON</Text>
          </View>
          <View style={styles.statBox}>
             <Text style={styles.statLabel}>DEVELOPER</Text>
             <Text style={styles.statValue}>VOEXI TEAM</Text>
          </View>
          <View style={styles.statBox}>
             <Text style={styles.statLabel}>ORIGIN</Text>
             <Text style={styles.statValue}>CORE PROTOCOL</Text>
          </View>
        </View>

        {/* CORE PROTOCOLS (Buttons pointing to Website) */}
        <View style={styles.protocolSection}>
           <ProtocolButton title="Privacy Policy" icon="shield-half-outline" url="https://www.voexi.online/privacy" />
           <ProtocolButton title="Terms of Service" icon="document-text-outline" url="https://www.voexi.online/terms" />
           <ProtocolButton title="Contact Support" icon="headset-outline" url="https://support.voexi.com/support/login" />
           <ProtocolButton title="Report a Problem" icon="bug-outline" url="https://support.voexi.com/support/login" />
           <ProtocolButton title="Open Source Licenses" icon="code-working-outline" url="https://www.voexi.online/licenses" />
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
           <Text style={styles.footerThankyou}>
             Thank you for being part of VOEXI. Together we're building the future of social connection.
           </Text>
           <Text style={styles.copyright}>© {currentYear} VOEXI. ALL RIGHTS RESERVED.</Text>
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
  glowOrb: { width: 300, height: 300, borderRadius: 150, backgroundColor: '#A855F7', opacity: 0.03, filter: 'blur(100px)' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, height: 70 },
  closeAction: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 4 },

  hero: { alignItems: 'center', paddingVertical: 40 },
  masterLogo: { width: 160, height: 160, justifyContent: 'center', alignItems: 'center' },
  logoOrbit: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderStyle: 'dashed', borderWidth: 1, borderColor: '#00F2FE', opacity: 0.2 },
  appName: { color: '#fff', fontSize: 38, fontWeight: '900', letterSpacing: 10, marginTop: 25 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00C851', marginRight: 8 },
  statusText: { color: '#666', fontSize: 8, fontWeight: '900', letterSpacing: 1 },

  manifestoCard: { marginHorizontal: 25, padding: 30, borderRadius: 35, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  manifestoTitle: { color: '#A855F7', fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 15 },
  manifestoDesc: { color: '#aaa', fontSize: 14, lineHeight: 24, fontWeight: '600', textAlign: 'left' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginTop: 30, gap: 10 },
  statBox: { width: (width - 60) / 2, backgroundColor: 'rgba(255,255,255,0.02)', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  statLabel: { color: '#444', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  statValue: { color: '#fff', fontSize: 11, fontWeight: '800', marginTop: 4, letterSpacing: 0.5 },

  protocolSection: { marginTop: 40, paddingHorizontal: 25, gap: 12 },
  protocolBtn: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  protocolGradient: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 15 },
  protocolText: { flex: 1, color: '#eee', fontSize: 11, fontWeight: '900', letterSpacing: 2 },

  footer: { marginTop: 60, alignItems: 'center', paddingHorizontal: 40 },
  footerThankyou: { color: '#555', fontSize: 12, textAlign: 'center', lineHeight: 20, fontWeight: '700' },
  copyright: { color: '#222', fontSize: 9, fontWeight: '900', marginTop: 25, letterSpacing: 1 },
  footerLine: { width: 40, height: 2, backgroundColor: '#A855F7', marginTop: 15, borderRadius: 1, opacity: 0.3 }
});