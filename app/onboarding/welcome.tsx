import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../hooks/useLanguage';
import { VOEXITheme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(20);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  }, []);

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/onboarding/country');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0a0a1a', '#000']} style={StyleSheet.absoluteFill} />

      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={[VOEXITheme.colors.primary, '#9333ea']} style={styles.logoIcon}>
            <Text style={styles.logoLetter}>V</Text>
          </LinearGradient>
          <Text style={styles.brandName}>VOEXI</Text>
          <View style={styles.statusBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.statusText}>CORE ONLINE</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.textContainer, { opacity: fadeAnim, delay: 500 }]}>
          <Text style={styles.title}>{t('onboarding.welcome_title')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.welcome_sub')}</Text>
        </Animated.View>

        <Animated.View style={[styles.btnContainer, { opacity: fadeAnim, delay: 800 }]}>
          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <LinearGradient colors={[VOEXITheme.colors.primary, '#4c1d95']} style={styles.btnGrad}>
              <Text style={styles.btnText}>{t('onboarding.start_btn')}</Text>
              <Ionicons name="rocket" size={20} color="#fff" style={{ marginLeft: 10 }} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>NEURAL ARCHITECTURE V1.0.5</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 60 },
  logoIcon: { width: 100, height: 100, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 20, shadowColor: VOEXITheme.colors.primary, shadowRadius: 20, shadowOpacity: 0.5 },
  logoLetter: { color: '#fff', fontSize: 60, fontWeight: '900' },
  brandName: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: 8, marginTop: 20 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,255,0,0.1)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 15, borderWidth: 1, borderColor: 'rgba(0,255,0,0.2)' },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00ff00', marginRight: 8 },
  statusText: { color: '#00ff00', fontSize: 10, fontWeight: '900' },
  textContainer: { alignItems: 'center', marginBottom: 80 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center', letterSpacing: 1 },
  subtitle: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 15, lineHeight: 22 },
  btnContainer: { width: '100%' },
  startBtn: { height: 65, borderRadius: 20, overflow: 'hidden' },
  btnGrad: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '900', letterSpacing: 2, fontSize: 14 },
  footer: { padding: 20, alignItems: 'center' },
  footerText: { color: '#222', fontSize: 10, fontWeight: 'bold', letterSpacing: 2 }
});
