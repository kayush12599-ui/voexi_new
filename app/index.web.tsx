import React, { useLayoutEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

export default function WebRootIndex() {
  const router = useRouter();

  useLayoutEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location) {
        window.location.replace('/(tabs)');
        return;
      }
      router.replace('/(tabs)');
    } catch (e) {
      try { router.replace('/(tabs)'); } catch (err) {}
    }
  }, []);

  return <View style={{ flex: 1, backgroundColor: '#000000' }} />;
}
