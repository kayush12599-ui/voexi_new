import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Image } from 'react-native';

interface Props {
  isSpeaking: boolean;
}

/**
 * VOEXI Mascot Character Component
 * Handles Floating, Blinking, and Speaking animations.
 * Fixed: Using URI fallback to prevent build crash when local asset is missing.
 */
export default function IntroCharacter({ isSpeaking }: Props) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const mouthAnim = useRef(new Animated.Value(1)).current;

  // Placeholder Mascot URL (until local assets/intro/mascot.png is added)
  const MASCOT_URI = "https://iafmgtldihnhcvrfveev.supabase.co/storage/v1/object/public/assets/mascot_vibroxe.png";

  useEffect(() => {
    // 1. Floating Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -15, duration: 1500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    // 2. Blinking Animation
    const blinkInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }, 3500);

    return () => clearInterval(blinkInterval);
  }, []);

  // 3. Mouth Speaking Animation
  useEffect(() => {
    let mouthInterval: any;
    if (isSpeaking) {
      mouthInterval = setInterval(() => {
        Animated.sequence([
          Animated.timing(mouthAnim, { toValue: 1.4, duration: 120, useNativeDriver: true }),
          Animated.timing(mouthAnim, { toValue: 0.8, duration: 120, useNativeDriver: true }),
        ]).start();
      }, 250);
    } else {
      mouthAnim.setValue(1);
    }
    return () => clearInterval(mouthInterval);
  }, [isSpeaking]);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: floatAnim }] }]}>
      {/* Base Mascot Image */}
      <Image
        source={{ uri: MASCOT_URI }}
        style={styles.mascot}
        resizeMode="contain"
      />

      {/* Blinking Eyes Overlay */}
      <View style={styles.eyeCoverContainer}>
         <Animated.View style={[styles.eyeLid, { opacity: Animated.subtract(1, blinkAnim) }]} />
         <View style={{ width: 42 }} />
         <Animated.View style={[styles.eyeLid, { opacity: Animated.subtract(1, blinkAnim) }]} />
      </View>

      {/* Speaking Mouth Overlay */}
      <View style={styles.mouthContainer}>
         <Animated.View
           style={[
             styles.mouthPiece,
             {
               transform: [{ scaleY: mouthAnim }],
               opacity: isSpeaking ? 1 : 0
             }
           ]}
         />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascot: {
    width: '100%',
    height: '100%',
  },
  eyeCoverContainer: {
    position: 'absolute',
    top: '34%',
    flexDirection: 'row',
  },
  eyeLid: {
    width: 24,
    height: 12,
    backgroundColor: '#F7D0B2',
    borderRadius: 6,
  },
  mouthContainer: {
    position: 'absolute',
    top: '48%',
  },
  mouthPiece: {
    width: 22,
    height: 12,
    backgroundColor: '#8B0000',
    borderRadius: 6,
  }
});
