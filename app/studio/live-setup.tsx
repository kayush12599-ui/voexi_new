import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Dimensions, Animated } from 'react-native';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LiveSetupScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { isLight } = useTheme();
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [permission, requestPermission] = useCameraPermissions();

  // Settings
  const [broadcastType, setBroadcastType] = useState('Camera'); // Camera or Screen
  const [target, setTarget] = useState('Reels'); // Reels (9:16) or Video (16:9)
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  const pulseAnim = React.useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.15, duration: 1500, useNativeDriver: true })
      ])
    ).start();
  }, []);

  // Performance Fix: Request permission on mount
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  const aspectRatio = target === 'Video' ? 16/9 : 9/16;

  const startLive = async () => {
    if (!title.trim()) return Alert.alert("SIGNAL ERROR", "Please enter a broadcast title.");
    if (!permission?.granted) return Alert.alert("ACCESS DENIED", "Camera permission is required.");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const streamKey = `voexi_${user.id.slice(0, 8)}_${Date.now()}`;

      const { error } = await supabase.from('live_broadcasts').insert({
        user_id: user.id,
        title: title.trim(),
        stream_key: streamKey,
        format: target === 'Video' ? '16:9' : '9:16',
        status: 'preparing'
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: '/studio/live',
        params: {
          title: title.trim(),
          target: target,
          ratio: target === 'Video' ? '16:9' : '9:16',
          streamKey: streamKey,
          type: broadcastType
        }
      });
    } catch (e: any) {
      Alert.alert("CONNECTION FAILED", e.message);
    }
  };

  const SignalPreview = () => (
    <View style={styles.previewContainer}>
      <View style={[
        styles.previewFrame,
        {
          aspectRatio: aspectRatio,
          width: target === 'Video' ? SCREEN_WIDTH - 40 : (SCREEN_WIDTH * 0.45)
        }
      ]}>
        {broadcastType === 'Camera' && permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="front"
            shutterSound={false}
          />
        ) : broadcastType === 'Screen' ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#05050C' }]}>
             <LinearGradient colors={['rgba(0,242,254,0.1)', 'transparent']} style={StyleSheet.absoluteFill} />
             <View style={styles.mockPreview}>
                <MaterialCommunityIcons name="monitor-screenshot" size={40} color={VOEXITheme.colors.secondary} />
                <Text style={styles.mockPreviewText}>SCREEN CAST READY</Text>
             </View>
             <View style={styles.pipContainer}>
                {permission?.granted ? (
                  <CameraView style={StyleSheet.absoluteFill} facing="front" />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: '#111', justifyContent:'center', alignItems:'center' }]}><Ionicons name="person" size={12} color="#333" /></View>
                )}
             </View>
             <Animated.View style={[styles.scannerLine, { transform: [{ translateY: pulseAnim.interpolate({inputRange:[0.15, 0.4], outputRange:[-50, 150]}) }] }]} />
          </View>
        ) : (
          <TouchableOpacity style={styles.permissionPrompt} onPress={requestPermission}>
             <Ionicons name="videocam-off-outline" size={32} color="#333" />
             <Text style={styles.permissionText}>{permission?.granted ? 'SIGNAL PAUSED' : 'INITIALIZE SENSORS'}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.previewOverlay}>
           <View style={styles.liveBadgeMini}>
             <View style={styles.pulseDot} />
             <Text style={styles.liveBadgeText}>PREVIEW</Text>
           </View>
        </View>
      </View>
      <View style={styles.ratioChip}>
         <Text style={styles.ratioChipText}>{target === 'Video' ? 'CINEMATIC 16:9' : 'PORTRAIT 9:16'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <LinearGradient colors={[VOEXITheme.colors.primary + '11', isLight ? '#fff' : '#000']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (step > 1) setStep(step - 1);
            else if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/upload');
          }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={isLight ? '#000' : '#fff'} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>LIVE SETUP</Text>
          <Text style={styles.headerSub}>VOEXI BROADCAST PROTOCOL</Text>
        </View>
        <Text style={styles.stepIndicator}>{step}/2</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SignalPreview />

        {step === 1 ? (
          <View>
            <Text style={styles.sectionTitle}>SELECT TRANSMISSION FORMAT</Text>

            <View style={styles.formatRow}>
               <TouchableOpacity style={[styles.formatBtn, target === 'Reels' && styles.formatActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTarget('Reels'); }}>
                  <MaterialCommunityIcons name="cellphone" size={24} color={target === 'Reels' ? VOEXITheme.colors.primary : "#444"} />
                  <Text style={[styles.formatText, target === 'Reels' && {color: '#fff'}]}>REELS</Text>
               </TouchableOpacity>
               <TouchableOpacity style={[styles.formatBtn, target === 'Video' && styles.formatActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTarget('Video'); }}>
                  <MaterialCommunityIcons name="television" size={24} color={target === 'Video' ? VOEXITheme.colors.primary : "#444"} />
                  <Text style={[styles.formatText, target === 'Video' && {color: '#fff'}]}>VIDEO</Text>
               </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>SIGNAL SOURCE</Text>
            <View style={styles.formatRow}>
               <TouchableOpacity style={[styles.formatBtn, broadcastType === 'Camera' && styles.formatActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBroadcastType('Camera'); }}>
                  <Ionicons name="camera-outline" size={24} color={broadcastType === 'Camera' ? VOEXITheme.colors.primary : "#444"} />
                  <Text style={[styles.formatText, broadcastType === 'Camera' && {color: '#fff'}]}>CAMERA</Text>
               </TouchableOpacity>
               <TouchableOpacity style={[styles.formatBtn, broadcastType === 'Screen' && styles.formatActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBroadcastType('Screen'); }}>
                  <MaterialCommunityIcons name="gamepad-variant-outline" size={24} color={broadcastType === 'Screen' ? VOEXITheme.colors.primary : "#444"} />
                  <Text style={[styles.formatText, broadcastType === 'Screen' && {color: '#fff'}]}>GAMING</Text>
               </TouchableOpacity>
            </View>

            <View style={[styles.infoCard, isLight && { backgroundColor: '#F5F5F5' }]}>
               <Ionicons name="information-circle-outline" size={18} color={VOEXITheme.colors.primary} />
               <Text style={[styles.infoText, isLight && { color: '#666' }]}>Your signal will be optimized for the selected aspect ratio.</Text>
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setStep(2); }}>
               <Text style={styles.nextText}>CONTINUE TO METADATA</Text>
               <Ionicons name="chevron-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>BROADCAST IDENTITY</Text>
            <TextInput
               style={[styles.input, isLight && { backgroundColor: '#F9F9F9', color: '#000', borderColor: '#EEE' }]}
               placeholder="Signal Title..."
               placeholderTextColor="#444"
               value={title}
               onChangeText={setTitle}
            />
            <TextInput
               style={[styles.input, isLight && { backgroundColor: '#F9F9F9', color: '#000', borderColor: '#EEE' }, { height: 100, textAlignVertical:'top' }]}
               placeholder="Brief Description..."
               placeholderTextColor="#444"
               multiline
               value={desc}
               onChangeText={setDesc}
            />

            <TouchableOpacity style={styles.startBtn} onPress={startLive}>
               <LinearGradient colors={['#FF0000', '#900000']} style={styles.startGrad}>
                  <Text style={styles.startText}>INITIATE LIVE SIGNAL</Text>
                  <Ionicons name="radio" size={22} color="#fff" />
               </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  headerSub: { color: '#444', fontSize: 8, fontWeight: 'bold', letterSpacing: 1 },
  stepIndicator: { color: VOEXITheme.colors.primary, fontSize: 12, fontWeight: '900' },
  content: { padding: 20 },
  sectionTitle: { color: '#444', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 20, marginLeft: 5 },
  previewContainer: { alignItems: 'center', marginBottom: 30 },
  previewFrame: { backgroundColor: '#080808', borderRadius: 25, overflow: 'hidden', borderWidth: 2, borderColor: VOEXITheme.colors.primary, justifyContent: 'center' },
  previewOverlay: { ...StyleSheet.absoluteFillObject, padding: 12 },
  liveBadgeMini: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', gap: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  liveBadgeText: { color: '#fff', fontSize: 7, fontWeight: '900' },
  pulseDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FF0000' },
  ratioChip: { backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginTop: 15, borderWidth: 1, borderColor: '#222' },
  ratioChipText: { color: VOEXITheme.colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  formatRow: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  formatBtn: { flex: 1, height: 80, borderRadius: 20, backgroundColor: '#0A0A0F', borderWidth: 1, borderColor: '#1A1A1F', alignItems: 'center', justifyContent: 'center', gap: 8 },
  formatActive: { borderColor: VOEXITheme.colors.primary, backgroundColor: 'rgba(124,92,255,0.05)' },
  formatText: { color: '#444', fontSize: 10, fontWeight: '900' },
  nextBtn: { backgroundColor: VOEXITheme.colors.primary, padding: 20, borderRadius: 18, alignItems: 'center', marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  nextText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  input: { backgroundColor: '#080808', color: '#fff', padding: 18, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#111', fontWeight: 'bold' },
  startBtn: { height: 70, borderRadius: 35, overflow: 'hidden', marginTop: 20 },
  startGrad: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  startText: { color: '#fff', fontWeight: '900', letterSpacing: 1.5, fontSize: 13 },
  permissionPrompt: { alignItems: 'center', gap: 10 },
  permissionText: { color: '#333', fontSize: 9, fontWeight: '900' },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.02)', padding: 15, borderRadius: 15, marginBottom: 20 },
  infoText: { color: '#666', fontSize: 10, flex: 1, fontWeight: 'bold' },
  mockPreview: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  mockPreviewText: { color: VOEXITheme.colors.secondary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  pipContainer: { position: 'absolute', bottom: 10, right: 10, width: 45, height: 60, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: '#000' },
  scannerLine: { position: 'absolute', width: '100%', height: 2, backgroundColor: VOEXITheme.colors.secondary, opacity: 0.5 }
});
