import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, ActivityIndicator, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { Avatar3DEngine, Avatar3DEngineRef } from '../../components/avatar/Avatar3DEngine';
import { SERVER_IP, AVATAR_SERVER_PORT } from '../../constants/config';

const { width, height } = Dimensions.get('window');

const FALLBACK_MODEL = `http://${SERVER_IP}:${AVATAR_SERVER_PORT}/avatar/models/male%20human%203d%20model.glb`;

export default function Live3DStageScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const engineRef = useRef<Avatar3DEngineRef>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [avatarRecord, setAvatarRecord] = useState<any>(null);
  const [isTalking, setIsTalking] = useState<boolean>(false);

  useEffect(() => {
    fetchTargetAvatarData();
  }, [id]);

  const fetchTargetAvatarData = async () => {
    try {
      setLoading(true);
      const targetId = Array.isArray(id) ? id[0] : id;
      if (!targetId) return;

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', targetId).maybeSingle();
      if (prof) setProfileData(prof);

      const { data: av } = await supabase.from('avatars').select('*').eq('user_id', targetId).maybeSingle();
      if (av) setAvatarRecord(av);
    } catch (e) {
      console.error('[3D STAGE] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleTalking = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isTalking) {
      setIsTalking(false);
      engineRef.current?.playIdle();
    } else {
      setIsTalking(true);
      engineRef.current?.playTalking();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 15;
      },
      onPanResponderRelease: (_, gestureState) => {
        // Swipe left-to-right (dx > 40) returns back to profile
        if (gestureState.dx > 40) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          router.back();
        }
      },
    })
  ).current;

  const gender = (avatarRecord?.gender || profileData?.gender || 'male').toLowerCase() as 'male' | 'female';
  const modelUrl = avatarRecord?.avatar_url || profileData?.avatar_url || FALLBACK_MODEL;
  const topColor = avatarRecord?.top_color || '#A855F7';
  const bottomColor = avatarRecord?.bottom_color || '#00F2FE';
  const metadata = avatarRecord?.metadata || {};

  return (
    <LinearGradient colors={['#030308', '#0D071E', '#020205']} style={styles.container} {...panResponder.panHandlers}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#00F2FE" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>LIVE 3D VAULT AVATAR</Text>
            <Text style={styles.headerSub}>@{profileData?.username || 'agent'} • VOEXI Stage</Text>
          </View>
          <TouchableOpacity onPress={toggleTalking} style={[styles.micBtn, isTalking && styles.micBtnActive]}>
            <Ionicons name={isTalking ? "mic" : "mic-outline"} size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* FULL SCREEN 3D STAGE CONTAINER */}
        <View style={styles.stageContainer}>
          <Avatar3DEngine
            ref={engineRef}
            gender={gender}
            modelUrl={modelUrl}
            topColor={topColor}
            bottomColor={bottomColor}
            initialHair={metadata?.hair || 'Cyber Spikes'}
            initialShirt={metadata?.shirt || 'Cyber Jacket'}
            initialPant={metadata?.pant || 'Cyber Joggers'}
            initialGear={metadata?.gear || 'Cyber Visor'}
            initialShoe={metadata?.shoe || 'Cyber Kicks'}
            initialSock={metadata?.sock || 'High Neon Socks'}
            onEngineReady={() => setLoading(false)}
            onModelLoaded={() => setLoading(false)}
          />

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#00F2FE" />
              <Text style={styles.loadingText}>Initializing Holographic 3D Stage...</Text>
            </View>
          )}

          {/* FLOATING CONTROLS & EMOTES BAR */}
          <View style={styles.controlsBar}>
            <TouchableOpacity style={styles.controlPill} onPress={() => engineRef.current?.playDance()}>
              <Ionicons name="flash" size={16} color="#00F2FE" />
              <Text style={styles.controlPillText}>Dance</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlPill} onPress={() => engineRef.current?.playFlex()}>
              <Ionicons name="fitness" size={16} color="#A855F7" />
              <Text style={styles.controlPillText}>Flex</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlPill} onPress={() => engineRef.current?.playWave()}>
              <Ionicons name="hand-right" size={16} color="#FF2E93" />
              <Text style={styles.controlPillText}>Wave</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlPill} onPress={() => engineRef.current?.playIdle()}>
              <Ionicons name="refresh" size={16} color="#10B981" />
              <Text style={styles.controlPillText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)'
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)'
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  headerSub: { color: '#00F2FE', fontSize: 11, fontWeight: '700', marginTop: 2 },
  micBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)'
  },
  micBtnActive: {
    backgroundColor: '#FF2E93',
    borderColor: '#FF2E93'
  },
  stageContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#020205'
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 2, 5, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  loadingText: { color: '#00F2FE', fontSize: 13, fontWeight: '700', marginTop: 12 },
  controlsBar: {
    position: 'absolute',
    bottom: 25,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(10, 10, 20, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)'
  },
  controlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  controlPillText: { color: '#fff', fontSize: 11, fontWeight: '800' }
});
