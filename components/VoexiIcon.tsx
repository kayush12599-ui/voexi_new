import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

export const VoexiIcon = ({ size = 42, isLight }: { size?: number; isLight?: boolean }) => {
  const borderRadius = size * 0.28;

  return (
    <LinearGradient
      colors={['#A855F7', '#EC4899', '#3B82F6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: borderRadius,
        }
      ]}
    >
      <View style={[styles.inner, { borderRadius: borderRadius - 2, backgroundColor: isLight ? '#FFFFFF' : '#0A0014' }]}>
        <ExpoImage
          source={require('../assets/images/logo_pro.png')}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#A855F7', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.5, shadowRadius: 8 },
      android: { elevation: 8, shadowColor: '#A855F7' },
    }),
  },
  inner: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
