import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useDiamondTheme, DiamondColorOption } from '../../hooks/useDiamondTheme';

export type GlowingDiamondSize = 'small' | 'medium' | 'large' | 'xlarge' | 'hero';

interface GlowingDiamondProps {
  size?: GlowingDiamondSize | number;
  colorOverride?: DiamondColorOption | string;
  glow?: boolean;
  animated?: boolean;
}

const SIZE_MAP = {
  small: 20,
  medium: 28,
  large: 44,
  xlarge: 68,
  hero: 100,
};

export function GlowingDiamond({
  size = 'medium',
  colorOverride,
  glow = true,
  animated = true,
}: GlowingDiamondProps) {
  const { activeColor, glowEnabled } = useDiamondTheme();

  // Resolve color option
  let gemColor: DiamondColorOption = activeColor;
  if (typeof colorOverride === 'object' && colorOverride !== null) {
    gemColor = colorOverride;
  }

  const dim = typeof size === 'number' ? size : SIZE_MAP[size] || 28;
  const isGlowActive = glow && glowEnabled;

  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animationLoop: Animated.CompositeAnimation | null = null;

    if (animated && isGlowActive) {
      glowAnim.setValue(0);
      animationLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      animationLoop.start();
    } else {
      glowAnim.setValue(0);
    }

    return () => {
      if (animationLoop) {
        animationLoop.stop();
      }
    };
  }, [animated, isGlowActive]);

  const interpolatedScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.25],
  });

  const interpolatedOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.95],
  });

  const mainGemColor = gemColor?.mainColor || '#A855F7';

  return (
    <View style={[styles.container, { width: dim, height: dim }]}>
      {/* GLOWING NEON LIGHT AURA BACKDROP */}
      {isGlowActive && (
        <Animated.View
          style={[
            styles.glowAura,
            {
              width: dim * 1.3,
              height: dim * 1.3,
              borderRadius: (dim * 1.3) / 2,
              backgroundColor: gemColor?.glowColor || 'rgba(168, 85, 247, 0.4)',
              shadowColor: mainGemColor,
              shadowRadius: dim * 0.5,
              shadowOpacity: 0.9,
              transform: [{ scale: interpolatedScale }],
              opacity: interpolatedOpacity,
            },
          ]}
        />
      )}

      {/* REAL 3D DIAMOND ASSET IMAGE */}
      <ExpoImage
        source={require('../../assets/images/diamond_3d.png')}
        style={{ width: dim, height: dim }}
        contentFit="contain"
        priority="high"
        transition={200}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowAura: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: -1,
  },
});
