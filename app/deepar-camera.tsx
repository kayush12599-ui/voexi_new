import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, SafeAreaView, ActivityIndicator, Platform, UIManager } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack } from 'expo-router';

// Dynamically import DeepAR
let DeepARView: any = null;
try {
  if (Platform.OS !== 'web') {
    DeepARView = require('react-native-deepar').default;
  }
} catch (e) {
  console.log("DeepAR module not found.");
}

/**
 * VOEXI AR STUDIO - DeepAR Integration with Live Camera Fallback
 */
export default function DeepARCameraScreen() {
  const deepARRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('none');
  const [isNativeAvailable, setIsNativeAvailable] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Replace these with your actual keys from developer.deepar.ai
  const DEEPAR_API_KEY = Platform.select({
    android: "YOUR_ANDROID_LICENSE_KEY",
    ios: "YOUR_IOS_LICENSE_KEY",
    default: ""
  });

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }

    // Check for DeepAR native manager
    const config = UIManager.getViewManagerConfig('RNTDeepARView');
    if (config && DeepARView) {
      setIsNativeAvailable(true);
    }
  }, [permission]);

  // Example filter from DeepAR's CDN
  const SAMPLE_FILTER_URL = 'https://cdn.jsdelivr.net/npm/deepar/effects/viking_helmet.deepar';

  const switchFilter = (filterUrl: string | null) => {
    if (deepARRef.current && isNativeAvailable) {
      if (filterUrl) {
        deepARRef.current.switchEffect({
          slot: 'effect',
          path: filterUrl
        });
        setCurrentFilter('viking');
      } else {
        deepARRef.current.switchEffect({ slot: 'effect', path: '' });
        setCurrentFilter('none');
      }
    }
  };

  if (!permission) {
    return <View style={styles.loadingOverlay}><ActivityIndicator size="large" color="#fff" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Camera permission is required</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.filterButton}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Options options={{ headerShown: false }} />

      {isNativeAvailable ? (
        <DeepARView
          ref={deepARRef}
          apiKey={DEEPAR_API_KEY}
          style={StyleSheet.absoluteFill}
          onInitialized={() => {
            console.log("DeepAR Engine Initialized");
            setIsInitialized(true);
          }}
          onError={(error) => console.error("DeepAR Error:", error)}
        />
      ) : (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="front"
        />
      )}

      {/* Control Overlay */}
      <View style={styles.overlay}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterButton, currentFilter === 'viking' && styles.activeButton]}
            onPress={() => switchFilter(SAMPLE_FILTER_URL)}
          >
            <Text style={styles.buttonText}>Viking Helmet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, currentFilter === 'none' && styles.activeButton]}
            onPress={() => switchFilter(null)}
          >
            <Text style={styles.buttonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!isInitialized && isNativeAvailable && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading Neural AR...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 15,
  },
  filterButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  activeButton: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#fff',
    marginTop: 15,
    fontSize: 16,
    textAlign: 'center',
  }
});
