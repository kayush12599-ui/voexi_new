import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing, ViewStyle, StyleProp, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface LiquidGlassCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  blurIntensity?: number;
  glassBorderColor?: string;
  glowColors?: [string, string, string];
  interactiveGlow?: boolean;
}

/**
 * VOEXI LIQUID GLASSMORPHISM CARD & MODAL CONTAINER
 * Features fluid animated light orbs and frosted glass reflection
 */
export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  style,
  blurIntensity = 35,
  glassBorderColor = 'rgba(255, 255, 255, 0.15)',
  glowColors = ['#7C5CFF', '#00F2FE', '#EC4899'],
  interactiveGlow = true
}) => {
  const moveAnim1 = useRef(new Animated.Value(0)).current;
  const moveAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!interactiveGlow) return;

    // Fluid liquid orb 1 animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(moveAnim1, {
          toValue: 1,
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(moveAnim1, {
          toValue: 0,
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fluid liquid orb 2 animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(moveAnim2, {
          toValue: 1,
          duration: 8000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(moveAnim2, {
          toValue: 0,
          duration: 8000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [interactiveGlow]);

  const orb1X = moveAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, 40],
  });
  const orb1Y = moveAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 30],
  });

  const orb2X = moveAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [50, -20],
  });
  const orb2Y = moveAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [40, -10],
  });

  return (
    <View style={[styles.container, { borderColor: glassBorderColor }, style]}>
      {/* BACKGROUND LIQUID FLUID ORBS */}
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            styles.liquidOrb,
            {
              backgroundColor: glowColors[0],
              transform: [{ translateX: orb1X }, { translateY: orb1Y }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.liquidOrb,
            styles.orbRight,
            {
              backgroundColor: glowColors[1],
              transform: [{ translateX: orb2X }, { translateY: orb2Y }],
            },
          ]}
        />
      </View>

      {/* FROSTED GLASS REFLECTION OVERLAY */}
      {Platform.OS === 'ios' || Platform.OS === 'android' ? (
        <BlurView intensity={blurIntensity} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* INNER CONTENT */}
      <View style={styles.contentContainer}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(10, 10, 18, 0.65)',
  },
  liquidOrb: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.35,
    filter: 'blur(30px)',
  },
  orbRight: {
    top: '40%',
    right: -20,
    left: undefined,
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.25,
  },
  contentContainer: {
    position: 'relative',
    zIndex: 10,
  },
});
