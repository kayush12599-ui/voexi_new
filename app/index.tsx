import React, { useLayoutEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

export default function RootIndex() {
  const router = useRouter();

  useLayoutEffect(() => {
    try {
      router.replace('/(tabs)');
    } catch (e) {}
  }, []);

  return <View style={{ flex: 1, backgroundColor: '#000000' }} />;
}
