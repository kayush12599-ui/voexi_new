import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Dimensions, Animated, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../hooks/useLanguage';
import { useTheme } from '../../hooks/useTheme';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { getLocalMediaServerUrl } from '../../lib/bunnyStorage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORY_TAGS = [
  { id: 'gaming', label: '🎮 Gaming', color: '#00F2FE' },
  { id: 'qa', label: '💬 Q&A Session', color: '#A855F7' },
  { id: 'music', label: '🎵 Music & DJ', color: '#FF0080' },
  { id: 'ai', label: '🧠 AI Tech', color: '#10B981' },
  { id: 'creative', label: '🎨 Art & Studio', color: '#F59E0B' },
  { id: 'news', label: '📡 Live Broadcast', color: '#3B82F6' },
];

export default function LiveSetupScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { isLight } = useTheme();
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [permission, requestPermission] = useCameraPermissions();

  // Broadcast Settings
  const [broadcastType, setBroadcastType] = useState<'Camera' | 'Screen'>('Camera');
  const [target, setTarget] = useState<'Reels' | 'Video'>('Reels');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [selectedTag, setSelectedTag] = useState('gaming');
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');

  const pulseAnim = useRef(new Animated.Value(0.15)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.15, duration: 1200, useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true })
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  const aspectRatio = target === 'Video' ? 16 / 9 : 9 / 16;

  const safeNavigateToLiveStudio = (sKey: string, activeTitle: string) => {
    let attempts = 0;
    const tryNavigate = () => {
      try {
        router.push({
          pathname: '/studio/live',
          params: {
            title: activeTitle,
            target: target,
            ratio: target === 'Video' ? '16:9' : '9:16',
            streamKey: sKey,
            type: broadcastType
          }
        });
      } catch (err: any) {
        attempts++;
        if (attempts < 15) {
          setTimeout(tryNavigate, 120);
        }
      }
    };

    setTimeout(tryNavigate, 100);
  };

  const startLive = async () => {
    const activeTitle = title.trim() || "VOEXI Live Broadcast";

    if (!permission?.granted && Platform.OS !== 'web') {
      try {
        const res = await requestPermission();
        if (!res.granted) {
          return Alert.alert("CAMERA PERMISSION REQUIRED", "Camera access is required to broadcast live video.");
        }
      } catch (permErr) {}
    }

    let streamKey = `voexi_live_${Date.now()}`;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      const activeUserId = user?.id || '00000000-0000-0000-0000-000000000000';
      streamKey = `voexi_${activeUserId.slice(0, 8)}_${Date.now()}`;

      // 1. Supabase Cloud Record Insert (Valid UUID)
      try {
        await supabase.from('live_broadcasts').insert({
          user_id: activeUserId,
          title: activeTitle,
          stream_key: streamKey,
          format: target === 'Video' ? '16:9' : '9:16',
          status: 'preparing'
        });
      } catch (dbErr) {
        console.warn("[Live Setup] Supabase Cloud Insert Fallback:", dbErr);
      }

      // 2. Dual-Sync Broadcast Record to Local Server 2 (Port 8080)
      try {
        const localServerUrl = getLocalMediaServerUrl();
        await fetch(`${localServerUrl}/api/live_broadcasts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: activeUserId,
            title: activeTitle,
            stream_key: streamKey,
            format: target === 'Video' ? '16:9' : '9:16',
            status: 'preparing',
            created_at: new Date().toISOString()
          })
        }).catch(() => {});
      } catch (e) {}

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      console.warn("[Live Setup DB Warning]:", e);
    }

    // 3. Safe Cross-Platform Navigation to Live Studio
    safeNavigateToLiveStudio(streamKey, activeTitle);
  };

  const SignalPreview = () => (
    <View style={styles.previewContainer}>
      <View
        style={[
          styles.previewFrame,
          {
            aspectRatio: aspectRatio,
            width: target === 'Video' ? Math.min(SCREEN_WIDTH - 40, 600) : 220
          }
        ]}
      >
        {broadcastType === 'Camera' && permission?.granted ? (
          <View style={StyleSheet.absoluteFill}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing={cameraFacing}
              shutterSound={false}
            />
            <TouchableOpacity
              style={styles.flipCamBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setCameraFacing(prev => prev === 'front' ? 'back' : 'front');
              }}
            >
              <Ionicons name="camera-reverse" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : broadcastType === 'Screen' ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#070712' }]}>
            <LinearGradient colors={['rgba(0,242,254,0.15)', 'transparent']} style={StyleSheet.absoluteFill} />
            <View style={styles.mockPreview}>
              <MaterialCommunityIcons name="monitor-dashboard" size={44} color="#00F2FE" />
              <Text style={styles.mockPreviewText}>GAMING SCREEN CAST</Text>
              <Text style={styles.mockSubtext}>System audio & screen uplink ready</Text>
            </View>
            <View style={styles.pipContainer}>
              {permission?.granted ? (
                <CameraView style={StyleSheet.absoluteFill} facing="front" />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="person" size={14} color="#555" />
                </View>
              )}
            </View>
            <Animated.View style={[styles.scannerLine, { opacity: pulseAnim }]} />
          </View>
        ) : (
          <TouchableOpacity style={styles.permissionPrompt} onPress={requestPermission}>
            <Ionicons name="videocam-off-outline" size={36} color="#A855F7" />
            <Text style={styles.permissionTitle}>CAMERA PERMISSION REQUIRED</Text>
            <Text style={styles.permissionSub}>Tap to allow camera access for live streaming</Text>
          </TouchableOpacity>
        )}

        {/* Live HUD Overlay */}
        <View style={styles.previewOverlay}>
          <View style={styles.liveBadgeMini}>
            <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
            <Text style={styles.liveBadgeText}>LIVE PREVIEW</Text>
          </View>

          <View style={styles.fpsBadge}>
            <Text style={styles.fpsText}>60 FPS • 1080p</Text>
          </View>
        </View>
      </View>

      <View style={styles.ratioChip}>
        <Ionicons name="sparkles" size={12} color="#00F2FE" />
        <Text style={styles.ratioChipText}>
          {target === 'Video' ? 'CINEMATIC 16:9 LANDSCAPE' : 'VERTICAL 9:16 REELS'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#F8F9FC' }]}>
      <LinearGradient
        colors={[isLight ? '#EFEFFD' : '#090814', isLight ? '#F8F9FC' : '#020205']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.outerWebWrapper}>
        <View style={styles.innerStudioContainer}>

          {/* HEADER */}
          <View style={[styles.header, isLight && { borderBottomColor: '#E2E8F0' }]}>
            <TouchableOpacity
              onPress={() => {
                if (step > 1) setStep(step - 1);
                else if (router.canGoBack()) router.back();
                else router.replace('/(tabs)/upload');
              }}
              style={[styles.backBtn, isLight && { backgroundColor: '#EDF2F7' }]}
            >
              <Ionicons name="arrow-back" size={20} color={isLight ? '#000' : '#fff'} />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>VOEXI LIVE STUDIO</Text>
                <View style={styles.protocolBadge}>
                  <Text style={styles.protocolText}>PRO 2.0</Text>
                </View>
              </View>
              <Text style={styles.headerSub}>HIGH-SECURITY BROADCAST PROTOCOL</Text>
            </View>

            {/* STEP PILLS */}
            <View style={styles.stepContainer}>
              <TouchableOpacity
                style={[styles.stepPill, step === 1 && styles.activeStepPill]}
                onPress={() => setStep(1)}
              >
                <Text style={[styles.stepText, step === 1 && styles.activeStepText]}>1. FORMAT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.stepPill, step === 2 && styles.activeStepPill]}
                onPress={() => setStep(2)}
              >
                <Text style={[styles.stepText, step === 2 && styles.activeStepText]}>2. DETAILS</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <SignalPreview />

            {step === 1 ? (
              <View>
                {/* TRANSMISSION FORMAT */}
                <Text style={styles.sectionTitle}>SELECT BROADCAST FORMAT</Text>

                <View style={styles.formatRow}>
                  <TouchableOpacity
                    style={[styles.formatCard, target === 'Reels' && styles.formatActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setTarget('Reels');
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.formatIconBox, target === 'Reels' && { backgroundColor: 'rgba(0,242,254,0.18)' }]}>
                      <MaterialCommunityIcons
                        name="cellphone"
                        size={28}
                        color={target === 'Reels' ? '#00F2FE' : (isLight ? '#64748B' : '#94A3B8')}
                      />
                    </View>
                    <Text style={[styles.formatTitle, target === 'Reels' && styles.formatTitleActive, isLight && !target === 'Reels' && { color: '#1E293B' }]}>
                      REELS LIVE
                    </Text>
                    <Text style={styles.formatSub}>Vertical 9:16 Mobile Stream</Text>
                    {target === 'Reels' && <View style={styles.activeCheck}><Ionicons name="checkmark-circle" size={18} color="#00F2FE" /></View>}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.formatCard, target === 'Video' && styles.formatActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setTarget('Video');
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.formatIconBox, target === 'Video' && { backgroundColor: 'rgba(168,85,247,0.18)' }]}>
                      <MaterialCommunityIcons
                        name="television"
                        size={28}
                        color={target === 'Video' ? '#A855F7' : (isLight ? '#64748B' : '#94A3B8')}
                      />
                    </View>
                    <Text style={[styles.formatTitle, target === 'Video' && styles.formatTitleActive, isLight && !target === 'Video' && { color: '#1E293B' }]}>
                      VIDEO LIVE
                    </Text>
                    <Text style={styles.formatSub}>Landscape 16:9 TV Stream</Text>
                    {target === 'Video' && <View style={styles.activeCheck}><Ionicons name="checkmark-circle" size={18} color="#A855F7" /></View>}
                  </TouchableOpacity>
                </View>

                {/* SIGNAL SOURCE */}
                <Text style={styles.sectionTitle}>SELECT SIGNAL SOURCE</Text>

                <View style={styles.formatRow}>
                  <TouchableOpacity
                    style={[styles.formatCard, broadcastType === 'Camera' && styles.formatActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setBroadcastType('Camera');
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.formatIconBox, broadcastType === 'Camera' && { backgroundColor: 'rgba(0,242,254,0.18)' }]}>
                      <Ionicons
                        name="camera"
                        size={26}
                        color={broadcastType === 'Camera' ? '#00F2FE' : (isLight ? '#64748B' : '#94A3B8')}
                      />
                    </View>
                    <Text style={[styles.formatTitle, broadcastType === 'Camera' && styles.formatTitleActive]}>
                      CAMERA LIVE
                    </Text>
                    <Text style={styles.formatSub}>Face & Studio Video Feed</Text>
                    {broadcastType === 'Camera' && <View style={styles.activeCheck}><Ionicons name="checkmark-circle" size={18} color="#00F2FE" /></View>}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.formatCard, broadcastType === 'Screen' && styles.formatActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setBroadcastType('Screen');
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.formatIconBox, broadcastType === 'Screen' && { backgroundColor: 'rgba(255,0,128,0.18)' }]}>
                      <MaterialCommunityIcons
                        name="gamepad-variant"
                        size={28}
                        color={broadcastType === 'Screen' ? '#FF0080' : (isLight ? '#64748B' : '#94A3B8')}
                      />
                    </View>
                    <Text style={[styles.formatTitle, broadcastType === 'Screen' && styles.formatTitleActive]}>
                      GAMING CAST
                    </Text>
                    <Text style={styles.formatSub}>Screen & Audio Capture</Text>
                    {broadcastType === 'Screen' && <View style={styles.activeCheck}><Ionicons name="checkmark-circle" size={18} color="#FF0080" /></View>}
                  </TouchableOpacity>
                </View>

                {/* INFO BADGE */}
                <View style={[styles.infoCard, isLight && { backgroundColor: '#EDF2F7', borderColor: '#CBD5E1' }]}>
                  <Ionicons name="shield-checkmark" size={20} color="#00F2FE" />
                  <Text style={[styles.infoText, isLight && { color: '#334155' }]}>
                    Your live broadcast will be encrypted and streamed with Ultra 60FPS Neural Uplink.
                  </Text>
                </View>

                {/* NEXT ACTION BUTTON */}
                <TouchableOpacity
                  style={styles.nextBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                    setStep(2);
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={['#7C5CFF', '#00F2FE']} style={styles.nextGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.nextText}>CONTINUE TO STREAM DETAILS</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {/* METADATA EDITOR */}
                <Text style={styles.sectionTitle}>BROADCAST IDENTITY & DETAILS</Text>

                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>STREAM TITLE *</Text>
                  <TextInput
                    style={[styles.input, isLight && { backgroundColor: '#FFFFFF', color: '#000', borderColor: '#CBD5E1' }]}
                    placeholder="Enter an exciting broadcast title..."
                    placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>DESCRIPTION (OPTIONAL)</Text>
                  <TextInput
                    style={[styles.input, isLight && { backgroundColor: '#FFFFFF', color: '#000', borderColor: '#CBD5E1' }, { height: 90, textAlignVertical: 'top' }]}
                    placeholder="What is this live stream about?"
                    placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                    multiline
                    value={desc}
                    onChangeText={setDesc}
                  />
                </View>

                {/* CATEGORY TAGS */}
                <Text style={styles.sectionTitle}>STREAM CATEGORY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagScroll}>
                  {CATEGORY_TAGS.map(tag => {
                    const isTagActive = selectedTag === tag.id;
                    return (
                      <TouchableOpacity
                        key={tag.id}
                        style={[
                          styles.tagPill,
                          isTagActive && { backgroundColor: tag.color + '22', borderColor: tag.color },
                          isLight && !isTagActive && { backgroundColor: '#EDF2F7', borderColor: '#CBD5E1' }
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          setSelectedTag(tag.id);
                        }}
                      >
                        <Text style={[styles.tagText, isTagActive && { color: tag.color, fontWeight: '900' }, isLight && !isTagActive && { color: '#334155' }]}>
                          {tag.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* GO LIVE BUTTON */}
                <TouchableOpacity style={styles.startBtn} onPress={startLive} activeOpacity={0.85}>
                  <LinearGradient colors={['#FF0055', '#E11D48']} style={styles.startGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Ionicons name="radio-outline" size={24} color="#fff" />
                    <Text style={styles.startText}>INITIATE LIVE BROADCAST 🔴</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020205' },
  outerWebWrapper: { flex: 1, width: '100%', height: '100%' },
  innerStudioContainer: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 680 : '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  protocolBadge: {
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00F2FE',
  },
  protocolText: { color: '#00F2FE', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  headerSub: { color: '#64748B', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  stepContainer: { flexDirection: 'row', gap: 6 },
  stepPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeStepPill: {
    backgroundColor: 'rgba(0, 242, 254, 0.2)',
    borderColor: '#00F2FE',
  },
  stepText: { color: '#64748B', fontSize: 9, fontWeight: '800' },
  activeStepText: { color: '#00F2FE', fontWeight: '900' },

  content: { padding: 20, paddingBottom: 60 },
  sectionTitle: { color: '#94A3B8', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 14, marginTop: 10 },

  previewContainer: { alignItems: 'center', marginBottom: 25 },
  previewFrame: {
    backgroundColor: '#070712',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#00F2FE',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#00F2FE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  flipCamBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  previewOverlay: { ...StyleSheet.absoluteFillObject, padding: 12, pointerEvents: 'none' },
  liveBadgeMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 85, 0.5)',
  },
  liveBadgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF0055' },
  fpsBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  fpsText: { color: '#00F2FE', fontSize: 8, fontWeight: '900' },
  ratioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F0E1E',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
  },
  ratioChipText: { color: '#00F2FE', fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  formatRow: { flexDirection: 'row', gap: 14, marginBottom: 20 },
  formatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#0B0A16',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  formatActive: {
    borderColor: '#00F2FE',
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
    shadowColor: '#00F2FE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  formatIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  formatTitle: { color: '#94A3B8', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  formatTitleActive: { color: '#FFFFFF', fontWeight: '900' },
  formatSub: { color: '#64748B', fontSize: 10, marginTop: 4, fontWeight: '600' },
  activeCheck: { position: 'absolute', top: 12, right: 12 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0, 242, 254, 0.05)',
    padding: 14,
    borderRadius: 16,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.2)',
  },
  infoText: { color: '#94A3B8', fontSize: 11, flex: 1, fontWeight: '600', lineHeight: 16 },

  nextBtn: { borderRadius: 20, overflow: 'hidden', marginTop: 10 },
  nextGrad: { paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  nextText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13, letterSpacing: 1 },

  inputWrapper: { marginBottom: 18 },
  inputLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  input: {
    backgroundColor: '#0B0A16',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    fontSize: 14,
    fontWeight: '700',
  },

  tagScroll: { gap: 10, paddingVertical: 4, marginBottom: 25 },
  tagPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#0B0A16',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tagText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },

  startBtn: { borderRadius: 24, overflow: 'hidden', marginTop: 10, elevation: 12, shadowColor: '#FF0055', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 15 },
  startGrad: { paddingVertical: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  startText: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 1.5, fontSize: 14 },

  permissionPrompt: { alignItems: 'center', justifyContent: 'center', flex: 1, padding: 20, gap: 10 },
  permissionTitle: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  permissionSub: { color: '#64748B', fontSize: 9, textAlign: 'center' },
  mockPreview: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  mockPreviewText: { color: '#00F2FE', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  mockSubtext: { color: '#64748B', fontSize: 9 },
  pipContainer: { position: 'absolute', bottom: 12, right: 12, width: 50, height: 65, borderRadius: 10, overflow: 'hidden', borderWidth: 1.5, borderColor: '#00F2FE', backgroundColor: '#000' },
  scannerLine: { position: 'absolute', width: '100%', height: 2, backgroundColor: '#00F2FE', top: '50%' }
});
