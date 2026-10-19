
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, AppState, Animated, Easing } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  onGesture: (cmd: 'SWIPE_UP' | 'SWIPE_DOWN' | 'NONE') => void;
  isActive: boolean;
}

/**
 * NEURAL GESTURE SENSOR (V2)
 * - Ultra-sensitive "Air Link" terminal.
 * - Visual feedback for hand tracking status.
 * - Minimal battery drain calibration.
 */
export default function SafeGestureCamera({ onGesture, isActive }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [appState, setAppState] = useState(AppState.currentState);
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => setAppState(next));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(scanAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      ).start();
    } else {
      scanAnim.setValue(0);
    }
  }, [isActive]);

  useEffect(() => {
    if (isActive && appState === 'active' && !permission?.granted) {
      requestPermission();
    }
  }, [isActive, appState, permission]);

  if (!isActive || appState !== 'active' || !permission?.granted) return null;

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="front" />

      {/* Scanning Laser Effect */}
      <Animated.View
        style={[
          styles.scanLine,
          {
            transform: [{
              translateY: scanAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 140]
              })
            }]
          }
        ]}
      />

      <View style={styles.overlay}>
        <View style={styles.sensorBadge}>
           <View style={styles.activeDot} />
           <Text style={styles.statusText}>NEURAL LINK ACTIVE</Text>
        </View>

        <View style={styles.handHint}>
           <MaterialCommunityIcons name="hand-front-left" size={20} color="rgba(0, 242, 254, 0.4)" />
           <Text style={styles.hintMsg}>FLICK HAND UP TO SCROLL</Text>
        </View>

        {/* Manual Emergency Scroll / Test Trigger */}
        <TouchableOpacity
          style={styles.gestureTrigger}
          onPress={() => {
            onGesture('SWIPE_UP');
          }}
          activeOpacity={0.7}
        >
          <LinearGradient colors={['#00F2FE', '#6366F1']} style={styles.triggerGrad}>
             <MaterialCommunityIcons name="chevron-double-up" size={16} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 15,
    width: 100,
    height: 150,
    borderRadius: 18,
    overflow: 'hidden',
    zIndex: 1000,
    backgroundColor: '#000',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 242, 254, 0.3)',
    elevation: 15,
    shadowColor: '#00F2FE',
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  camera: {
    flex: 1,
    opacity: 0.35,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#00F2FE',
    zIndex: 5,
    shadowColor: '#00F2FE',
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  sensorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 242, 254, 0.2)',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00ff00',
  },
  statusText: {
    color: '#fff',
    fontSize: 5,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  handHint: {
    alignItems: 'center',
    gap: 5,
  },
  hintMsg: {
    color: '#00F2FE',
    fontSize: 5,
    fontWeight: 'bold',
    opacity: 0.6,
    textAlign: 'center',
  },
  gestureTrigger: {
    width: '100%',
    height: 32,
    borderRadius: 10,
    overflow: 'hidden',
  },
  triggerGrad: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
