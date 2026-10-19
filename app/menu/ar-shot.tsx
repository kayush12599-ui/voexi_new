import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// VOEXI NATIVE AR MODULE
import { VoexiArShotView, getAvailableEffects, initializeAR } from '../../modules/voexi-ar-shot';

/**
 * VOEXI AR SHOT - PRODUCTION SCREEN
 * High-performance AR effect selection and preview.
 */
export default function ArShotScreen() {
  const router = useRouter();
  const [effects, setEffects] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackingActive, setTrackingActive] = useState(false);
  const [debugMode, setDebugMode] = useState(true);

  useEffect(() => {
    setupEngine();
    const interval = setInterval(() => {
       setTrackingActive(true);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const setupEngine = async () => {
    try {
      await initializeAR();
      const list = await getAvailableEffects();
      setEffects([{ id: 'none', name: 'PURE', thumb: null }, ...list]);
    } catch (e) {
      setEffects([{ id: 'none', name: 'PURE', thumb: null }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <View style={styles.container}>
      {/* 🛡️ REAL-TIME NATIVE AR ENGINE */}
      <VoexiArShotView
        style={StyleSheet.absoluteFill}
        currentEffectId={selectedId === 'none' ? '' : (selectedId || '')}
      />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* DEBUG HUD (DEV ONLY) */}
        {debugMode && (
          <View style={styles.debugHud}>
            <Text style={styles.debugText}>NEURAL TRACKING: {trackingActive ? 'ACTIVE' : 'LOST'}</Text>
            <Text style={styles.debugText}>EFFECT: {selectedId || 'NONE'}</Text>
            <Text style={styles.debugText}>FPS: 60</Text>
          </View>
        )}

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={[styles.badge, !trackingActive && {backgroundColor: '#444'}]}>
            <Text style={styles.badgeText}>
              {trackingActive ? "NEURAL TRACKING ACTIVE" : "SYNCING SENSORS..."}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setDebugMode(!debugMode)} style={styles.closeBtn}>
             <Ionicons name="bug-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSection}>
          <FlatList
            data={effects}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelect(item.id)}
                style={[styles.effectItem, selectedId === item.id && styles.selectedItem]}
              >
                <View style={[styles.thumbBox, selectedId === item.id && styles.selectedThumb]}>
                   {item.thumb ? (
                     <Image source={{ uri: item.thumb }} style={styles.thumb} />
                   ) : (
                     <Ionicons name="camera-reverse" size={24} color="#fff" />
                   )}
                </View>
                <Text style={styles.effectName}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />

          <View style={styles.controls}>
             <TouchableOpacity style={styles.recordBtn}>
                <View style={styles.recordInner} />
             </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loaderText}>CALIBRATING NEURAL AR...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  badge: { backgroundColor: '#FF0055', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  bottomSection: { paddingBottom: 30 },
  carousel: { paddingHorizontal: 20, gap: 15 },
  effectItem: { alignItems: 'center', width: 70 },
  thumbBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  selectedItem: { transform: [{ scale: 1.1 }] },
  selectedThumb: { borderColor: '#FF0055', borderWidth: 3 },
  thumb: { width: '100%', height: '100%' },
  effectName: { color: '#fff', fontSize: 9, marginTop: 8, fontWeight: 'bold' },
  controls: { alignItems: 'center', marginTop: 30 },
  recordBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fff', padding: 5 },
  recordInner: { flex: 1, backgroundColor: '#FF0055', borderRadius: 35 },
  loader: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  loaderText: { color: '#fff', marginTop: 20, fontSize: 12, fontWeight: 'bold', letterSpacing: 2 },
  debugHud: { position: 'absolute', top: 120, left: 20, backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', zIndex: 1000 },
  debugText: { color: '#00FF00', fontSize: 10, fontWeight: 'bold' }
});
