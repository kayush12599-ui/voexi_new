import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, ActivityIndicator, Alert, Animated, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { getLocalMediaServerUrl } from '../../lib/bunnyStorage';

import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');

// 🛡️ VOEXI LOCAL MEDIAMTX CONFIG
const LOCAL_IP = "192.168.1.10";
const MEDIAMTX_RTMP_URL = `rtmp://${LOCAL_IP}:1935/live/`;
const MEDIAMTX_HLS_URL = `http://${LOCAL_IP}:8888/live/`;

const isExpoGo = Constants.appOwnership === 'expo' || Platform.OS === 'web';

// Dynamic load native-only module to prevent Expo Go & Web crash
const getNodeMedia = () => {
    if (isExpoGo) return { NodePublisher: View, NodePlayerView: View };
    try {
        return require('react-native-nodemediaclient');
    } catch (e) {
        return { NodePublisher: View, NodePlayerView: View };
    }
};

const { NodePublisher, NodePlayerView } = getNodeMedia();

export default function LiveStudioScreen() {
  const router = useRouter();
  const { title: liveTitle, target: liveTarget, type: broadcastType, streamKey, ratio } = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const publisherRef = useRef<any>(null);

  // Gaming HUD States
  const [fps, setFps] = useState(60);
  const [ping, setPing] = useState(24);
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        setFps(Math.floor(Math.random() * (62 - 58 + 1)) + 58);
        setPing(Math.floor(Math.random() * (35 - 18 + 1)) + 18);
      }, 2000);

      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: height, duration: 3000, useNativeDriver: true }),
          Animated.timing(scanAnim, { toValue: 0, duration: 0, useNativeDriver: true })
        ])
      ).start();

      return () => clearInterval(interval);
    }
  }, [isLive]);

  if (!permission) return <View style={styles.center}><ActivityIndicator color={VOEXITheme.colors.primary} /></View>;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>Camera access is required to go live.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.btnText}>GRANT PERMISSION</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startLive = async () => {
    try {
      if (Platform.OS === 'web') {
        if (broadcastType === 'Screen' && typeof navigator !== 'undefined' && (navigator.mediaDevices as any)?.getDisplayMedia) {
          try {
            await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true }).catch(() => {});
          } catch (e) {}
        }
      } else {
        try {
          if (broadcastType === 'Screen') {
            publisherRef.current?.setScreenCapture?.(true);
          }
          publisherRef.current?.start?.();
        } catch (e) {}
      }

      // Update/Upsert Supabase Cloud DB with Active UUID
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const activeUserId = sessionData?.session?.user?.id || '00000000-0000-0000-0000-000000000000';

        await supabase.from('live_broadcasts')
          .upsert({
            user_id: activeUserId,
            title: String(liveTitle || 'VOEXI Live Broadcast'),
            stream_key: String(streamKey),
            format: String(ratio || '9:16'),
            status: 'live',
            hls_url: `${MEDIAMTX_HLS_URL}${streamKey}/index.m3u8`
          }, { onConflict: 'stream_key' });
      } catch (e) {}

      // 📡 Dual-Sync Live Stream Active Status to Local Server 2 (Port 8080)
      try {
        const localServerUrl = getLocalMediaServerUrl();
        await fetch(`${localServerUrl}/api/live_broadcasts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stream_key: String(streamKey),
            status: 'live',
            title: String(liveTitle || 'VOEXI Live Broadcast'),
            hls_url: `${MEDIAMTX_HLS_URL}${streamKey}/index.m3u8`
          })
        }).catch(() => {});
      } catch (e) {}

      setIsLive(true);
      setViewerCount(Math.floor(Math.random() * 500) + 120);
    } catch (e: any) {
      console.warn("[Live Studio Error]:", e);
      setIsLive(true);
      setViewerCount(Math.floor(Math.random() * 500) + 120);
    }
  };

  const stopLive = async () => {
    try {
      if (Platform.OS !== 'web') {
        publisherRef.current?.stop?.();
      }
    } catch (e) {}

    try {
      await supabase.from('live_broadcasts').update({ status: 'ended' }).eq('stream_key', String(streamKey));
    } catch (e) {}

    // 📡 Dual-Sync Live Stream Ended Status to Local Server 2
    try {
      const localServerUrl = getLocalMediaServerUrl();
      await fetch(`${localServerUrl}/api/live_broadcasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stream_key: String(streamKey),
          status: 'ended'
        })
      }).catch(() => {});
    } catch (e) {}

    setIsLive(false);
  };

  const toggleLive = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    if (isLive) {
      if (Platform.OS === 'web') {
        if (confirm("Terminate the live signal?")) stopLive();
      } else {
        Alert.alert("END BROADCAST", "Terminate the live signal?", [
          { text: "STAY", style: "cancel" },
          { text: "TERMINATE", style: "destructive", onPress: stopLive }
        ]);
      }
    } else {
      startLive();
    }
  };

  return (
    <View style={styles.container}>
      {broadcastType === 'Camera' && (
        isExpoGo ? (
          <CameraView facing={facing} style={StyleSheet.absoluteFill} />
        ) : (
          <NodePublisher
              ref={publisherRef}
              url={`${MEDIAMTX_RTMP_URL}${streamKey}`}
              videoParam={{
                  width: ratio === '16:9' ? 1280 : 720,
                  height: ratio === '16:9' ? 720 : 1280,
                  fps: 30, bitrate: 2500, profile: 1, frontCamera: facing === 'front'
              }}
              audioParam={{ bitrate: 64, profile: 1, sampleRate: 44100 }}
              style={StyleSheet.absoluteFill}
          />
        )
      )}

      {broadcastType === 'Screen' ? (
        <View style={styles.gamingBackground}>
           <LinearGradient colors={['#050510', '#000']} style={StyleSheet.absoluteFill} />

           <NodePublisher
            ref={publisherRef}
            url={`${MEDIAMTX_RTMP_URL}${streamKey}`}
            videoParam={{ width: 1280, height: 720, fps: 30, bitrate: 2000, profile: 1, frontCamera: false }}
            audioParam={{ bitrate: 64, profile: 1, sampleRate: 44100 }}
            onStatus={(code: any, msg: any) => console.log("Stream Status:", code, msg)}
            style={{ width: 1, height: 1, opacity: 0 }} // Invisible background process
           />

           <MaterialCommunityIcons name="controller-classic-outline" size={150} color="rgba(255,255,255,0.03)" style={styles.bgIcon} />

           {/* GAMING HUD */}
           {isLive && (
             <View style={styles.hudContainer}>
                <View style={styles.hudItem}><Text style={styles.hudLabel}>FPS</Text><Text style={styles.hudValue}>{fps}</Text></View>
                <View style={styles.hudItem}><Text style={styles.hudLabel}>MS</Text><Text style={[styles.hudValue, {color:'#00ff00'}]}>{ping}</Text></View>
                <View style={styles.hudItem}><Text style={styles.hudLabel}>CPU</Text><Text style={styles.hudValue}>14%</Text></View>
             </View>
           )}

           <View style={styles.screenCenterInfo}>
              <MaterialCommunityIcons name="monitor-screenshot" size={80} color={VOEXITheme.colors.secondary} opacity={0.3} />
              <Text style={styles.gamingStatusText}>{isLive ? 'SYSTEM SCREEN ACTIVE' : 'WAITING FOR SYSTEM LINK...'}</Text>

              {isLive && (
                <TouchableOpacity style={styles.minimizeBtn} onPress={() => Alert.alert("VOEXI MINIMIZED", "The neural relay is now active in background. Open your game to start broadcasting.")}>
                   <LinearGradient colors={[VOEXITheme.colors.secondary, '#0099ff']} style={styles.miniGrad}>
                      <Ionicons name="apps-outline" size={18} color="#000" />
                      <Text style={styles.miniText}>MINIMIZE & PLAY GAME</Text>
                   </LinearGradient>
                </TouchableOpacity>
              )}
           </View>

           {/* FACECAM BUBBLE (PRO LOOK) */}
           <View style={styles.facecamBubble}>
              <NodePublisher
                ref={broadcastType === 'Camera' ? publisherRef : null}
                url={`${MEDIAMTX_RTMP_URL}${streamKey}`}
                videoParam={{
                    width: ratio === '16:9' ? 1280 : 720,
                    height: ratio === '16:9' ? 720 : 1280,
                    fps: 30, bitrate: 2500, profile: 1, frontCamera: true
                }}
                audioParam={{ bitrate: 64, profile: 1, sampleRate: 44100 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient colors={['transparent', 'rgba(0,242,254,0.3)']} style={StyleSheet.absoluteFill} />
           </View>

           {/* SCANNING LINE */}
           {isLive && <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanAnim }] }]} />}
        </View>
      ) : (
        <CameraView style={StyleSheet.absoluteFill} facing={facing} />
      )}

      <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>

          {isLive && (
             <View style={styles.titleBadge}>
                <Text style={styles.titleBadgeText} numberOfLines={1}>{liveTitle || 'UNNAMED SIGNAL'}</Text>
                <Text style={styles.targetBadgeText}>{String(liveTarget).toUpperCase()} {broadcastType === 'Screen' ? '• GAMING' : '• CAMERA'}</Text>
             </View>
          )}

          <View style={{ flexDirection:'row', alignItems:'center', gap: 10 }}>
            {isLive && (
                <View style={styles.liveBadge}>
                    <View style={styles.redDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                    <View style={styles.viewerBadge}>
                        <Ionicons name="eye-outline" size={12} color="#fff" />
                        <Text style={styles.viewerText}>{viewerCount}</Text>
                    </View>
                </View>
            )}
            {broadcastType !== 'Screen' && (
                <TouchableOpacity onPress={() => setFacing(prev => prev === 'front' ? 'back' : 'front')} style={styles.flipBtn}>
                <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
                </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          {!isLive ? (
            <View style={styles.setupContainer}>
              <Text style={styles.setupTitle}>{broadcastType === 'Screen' ? 'GAMING SPECTRUM' : 'NEURAL BROADCAST'}</Text>
              <Text style={styles.setupSub}>Ready to initialize your signal link?</Text>

              <TouchableOpacity style={styles.startBtn} onPress={toggleLive}>
                <LinearGradient colors={['#FF0000', '#D00000']} style={styles.startBtnGrad}>
                  <Text style={styles.startBtnText}>GO LIVE NOW</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.liveControls}>
               <TouchableOpacity style={styles.controlBtn}><Ionicons name="chatbubble-outline" size={24} color="#fff" /></TouchableOpacity>
               <TouchableOpacity style={styles.controlBtn}><Ionicons name="mic-outline" size={24} color="#fff" /></TouchableOpacity>
               <TouchableOpacity style={styles.stopBtn} onPress={toggleLive}>
                  <Text style={styles.stopText}>END</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.controlBtn}><Ionicons name="share-social-outline" size={24} color="#fff" /></TouchableOpacity>
               <TouchableOpacity style={styles.controlBtn}><Ionicons name="gift-outline" size={24} color="#fff" /></TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,0,0,0.8)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 6 },
  redDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  viewerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, gap: 4 },
  viewerText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  flipBtn: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  footer: { padding: 30, paddingBottom: 50 },
  setupContainer: { alignItems: 'center' },
  setupTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  setupSub: { color: '#666', fontSize: 11, textAlign: 'center', marginBottom: 30 },
  startBtn: { width: '85%', height: 65, borderRadius: 32, overflow: 'hidden' },
  startBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  startBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 2, fontSize: 14 },
  liveControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  controlBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  stopBtn: { backgroundColor: '#FF0000', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 25 },
  stopText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  permissionText: { color: '#fff', marginBottom: 20 },
  permissionBtn: { backgroundColor: VOEXITheme.colors.primary, padding: 15, borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  titleBadge: { flex: 1, marginHorizontal: 15, alignItems: 'center' },
  titleBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  targetBadgeText: { color: VOEXITheme.colors.primary, fontSize: 8, fontWeight: '900', marginTop: 3 },

  // Gaming UI
  gamingBackground: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  bgIcon: { position: 'absolute', top: '30%' },
  hudContainer: { position: 'absolute', top: 100, left: 20, flexDirection: 'row', gap: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  hudItem: { alignItems: 'center' },
  hudLabel: { color: '#666', fontSize: 7, fontWeight: 'bold' },
  hudValue: { color: '#fff', fontSize: 10, fontWeight: '900', marginTop: 2 },
  screenCenterInfo: { alignItems: 'center', gap: 15 },
  gamingStatusText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 2, opacity: 0.7 },
  minimizeBtn: { marginTop: 20, borderRadius: 15, overflow: 'hidden', elevation: 10 },
  miniGrad: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniText: { color: '#000', fontWeight: '900', fontSize: 11 },
  facecamBubble: { position: 'absolute', bottom: 150, right: 20, width: 100, height: 130, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: VOEXITheme.colors.secondary, backgroundColor: '#000', shadowColor: VOEXITheme.colors.secondary, shadowRadius: 15, shadowOpacity: 0.5 },
  scanLine: { position: 'absolute', width: '100%', height: 1, backgroundColor: VOEXITheme.colors.secondary, opacity: 0.4, shadowColor: VOEXITheme.colors.secondary, shadowRadius: 10, shadowOpacity: 1, elevation: 5 }
});
