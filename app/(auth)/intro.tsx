import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions, Image, Vibration } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { VOEXITheme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function IntroScreen() {
  const router = useRouter();

  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const dollSlide = useRef(new Animated.Value(150)).current; // Start from further down
  const speechOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequence: 1. Logo/Brand Fades In, 2. Doll Slides Up, 3. Speech Bubble Pops
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 50, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(dollSlide, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
        Animated.timing(speechOpacity, { toValue: 1, duration: 500, delay: 400, useNativeDriver: true }),
      ])
    ]).start();

    // Haptic Feedback
    Vibration.vibrate([0, 100, 50, 150]);

    // Redirect to Main App
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 4500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a0000', '#000', '#000']}
        style={StyleSheet.absoluteFill}
      />

      {/* Brand Section */}
      <Animated.View style={[
        styles.brandBox,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }
      ]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoV}>V</Text>
        </View>
        <Text style={styles.brandName}>VOEXI</Text>
        <View style={styles.divider} />
      </Animated.View>

      {/* Mascot Section */}
      <Animated.View style={[
        styles.dollContainer,
        { transform: [{ translateY: dollSlide }] }
      ]}>
        <Image
          // Using a reliable high-quality 3D mascot image as a direct replacement
          source={{ uri: 'https://res.cloudinary.com/dnskqvyvz/image/upload/v1740212000/mascot_intro.png' }}
          style={styles.dollImage}
          resizeMode="contain"
        />

        {/* Speech Bubble */}
        <Animated.View style={[styles.speechBubble, { opacity: speechOpacity }]}>
           <Text style={styles.speechText}>App aaye ho, kabhi nahi na jaoge! ❤️</Text>
           <View style={styles.bubbleTail} />
        </Animated.View>
      </Animated.View>

      {/* Bottom Features Info */}
      <Animated.View style={[styles.bottomInfo, { opacity: fadeAnim }]}>
          <View style={styles.featureRow}>
            <Ionicons name="shield-checkmark" size={16} color="#00F2FE" />
            <Text style={styles.featureText}>Authenticated Session</Text>
          </View>
          <View style={styles.loadingBarBg}>
            <Animated.View style={[styles.loadingBarFill, { width: '85%' }]} />
          </View>
          <Text style={styles.initText}>INITIALIZING VX INTERFACE</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  brandBox: { alignItems: 'center', position: 'absolute', top: height * 0.15 },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: VOEXITheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    shadowColor: VOEXITheme.colors.primary,
    shadowRadius: 15,
    shadowOpacity: 0.4,
    elevation: 10
  },
  logoV: { fontSize: 40, fontWeight: '900', color: '#fff', fontStyle: 'italic' },
  brandName: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 8, marginTop: 15 },
  divider: { width: 30, height: 3, backgroundColor: VOEXITheme.colors.primary, marginTop: 10, borderRadius: 2 },

  dollContainer: { alignItems: 'center', marginTop: 80 },
  dollImage: { width: 160, height: 220 },
  speechBubble: {
    position: 'absolute',
    top: -40,
    right: -40,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: 160,
    borderBottomLeftRadius: 2,
    elevation: 15,
    shadowColor: '#fff',
    shadowOpacity: 0.2,
    shadowRadius: 10
  },
  speechText: { color: '#000', fontSize: 11, fontWeight: 'bold', textAlign: 'center' },
  bubbleTail: {
    position: 'absolute',
    bottom: -8,
    left: 2,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderLeftColor: 'transparent',
    borderRightWidth: 8,
    borderRightColor: 'transparent',
    borderTopWidth: 10,
    borderTopColor: '#fff'
  },

  bottomInfo: { position: 'absolute', bottom: 50, width: '100%', alignItems: 'center' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  featureText: { color: '#444', fontSize: 12, fontWeight: 'bold' },
  loadingBarBg: { width: '60%', height: 2, backgroundColor: '#111', borderRadius: 1, overflow: 'hidden' },
  loadingBarFill: { height: '100%', backgroundColor: VOEXITheme.colors.primary },
  initText: { color: '#222', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginTop: 10 }
});
