import React, { useRef, useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ARShotView from '../components/ARShotView.web';

export default function DeepARCameraWeb() {
  const router = useRouter();
  const arRef = useRef<any>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleCapture = async () => {
    if (isRecording) {
      setIsRecording(false);
      if (arRef.current) await arRef.current.stopRecording();
    } else {
      setIsRecording(true);
      if (arRef.current) await arRef.current.recordAsync();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Options
        options={{
          headerShown: false,
          headerTransparent: true
        }}
      />

      <ARShotView ref={arRef} style={StyleSheet.absoluteFill}>
        {/* Overlay HUD */}
        <View style={styles.overlayHeader}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.badge}>
            <View style={styles.liveDot} />
            <Text style={styles.badgeText}>VOEXI WEB AR ACTIVE</Text>
          </View>
        </View>

        {/* Recording Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.recordBtn, isRecording && styles.recordingActive]}
            onPress={handleCapture}
          >
            <View style={[styles.innerBtn, isRecording && styles.innerSquare]} />
          </TouchableOpacity>
        </View>
      </ARShotView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlayHeader: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00F2FE',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00F2FE',
    marginRight: 8,
  },
  badgeText: {
    color: '#00F2FE',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  recordBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#00F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  recordingActive: {
    borderColor: '#FF0080',
  },
  innerBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00F2FE',
  },
  innerSquare: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#FF0080',
  },
});
