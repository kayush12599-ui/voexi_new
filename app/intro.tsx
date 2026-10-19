import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const { width, height } = Dimensions.get('window');

export default function IntroScreen() {
  const router = useRouter();

  useEffect(() => {
    // 🛡️ Safe timer to move to home screen
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/*
         Bhai, jab aap 'assets/videos/intro.mp4' file folder mein paste kar dein,
         toh mujhe bolna "File paste kar di".
         Tab main asli video source activate karunga.
      */}
      <View style={[StyleSheet.absoluteFill, {backgroundColor: '#000'}]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  }
});
