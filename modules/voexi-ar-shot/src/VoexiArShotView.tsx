import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface VoexiArShotViewProps {
  currentEffectId?: string;
  style?: any;
}

let NativeView: any;
try {
  NativeView = requireNativeViewManager('VoexiArShot');
} catch (e) {
  NativeView = null;
}

export default function VoexiArShotView(props: VoexiArShotViewProps) {
  const [permission, requestPermission] = useCameraPermissions();

  React.useEffect(() => {
    if (!permission?.granted && requestPermission) {
      requestPermission();
    }
  }, [permission]);

  if (!NativeView) {
    return (
      <View style={props.style || StyleSheet.absoluteFill}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="front"
          mode="video"
        />
      </View>
    );
  }
  return <NativeView {...props} />;
}
