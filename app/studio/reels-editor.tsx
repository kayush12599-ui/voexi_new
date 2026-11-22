import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, ActivityIndicator, TextInput, Animated, Pressable, ScrollView, FlatList, Modal, KeyboardAvoidingView, Platform, Switch, Image, Alert, PanResponder, Easing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { uploadToBunny } from '../../lib/bunnyStorage';
import { rewardCoins } from '../../lib/earnings';
import { ModerationService } from '../../lib/moderationService';
import { Audio } from 'expo-av';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import ARShotView from '../../components/ARShotView';
import ARShotPanel from '../../components/ARShotPanel';

let FFmpegKit: any = null;
let ReturnCode: any = { isSuccess: () => false };

if (Platform.OS !== 'web') {
  try {
    const ffmpegModule = require('ffmpeg-kit-react-native');
    FFmpegKit = ffmpegModule.FFmpegKit;
    ReturnCode = ffmpegModule.ReturnCode;
  } catch (e) {
    console.warn("FFmpegKit native module not available", e);
  }
}

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = 84;
const CENTER_PADDING = (width - ITEM_WIDTH) / 2;

const COLORS = {
  foundation: '#020205',
  purple: '#A855F7',
  violet: '#6366F1',
  cyan: '#00F2FE',
  pink: '#FF017E',
  glass: 'rgba(255,255,255,0.12)',
  glassDark: 'rgba(0,0,0,0.7)',
};

const formatSecs = (secs: number) => {
  if (!secs || isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const parseDurationSec = (dur: any): number => {
  if (typeof dur === 'number' && !isNaN(dur) && dur > 0) return Math.round(dur);
  if (typeof dur === 'string' && dur.includes(':')) {
    const parts = dur.split(':').map(p => parseInt(p, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
  }
  const parsed = parseInt(dur, 10);
  return (!isNaN(parsed) && parsed > 0) ? parsed : 30;
};

const LENSES = [
  { id: 'none', name: 'PURE', colors: ['transparent', 'transparent'], image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200&h=200&fit=crop' },
  { id: 'cyber', name: 'CYBER', colors: ['rgba(168,85,247,0.3)', 'rgba(0,242,254,0.3)'], image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&h=200&fit=crop' },
  { id: 'noir', name: 'VOID', colors: ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)'], image: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=200&h=200&fit=crop' },
  { id: 'vivid', name: 'VIVID', colors: ['rgba(255,215,0,0.2)', 'rgba(255,1,126,0.2)'], image: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=200&h=200&fit=crop' },
  { id: 'desert', name: 'DESERT', colors: ['rgba(255,140,0,0.25)', 'rgba(139,69,19,0.3)'], image: 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?w=200&h=200&fit=crop' },
  { id: 'ocean', name: 'OCEAN', colors: ['rgba(0,255,255,0.2)', 'rgba(0,0,139,0.3)'], image: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=200&h=200&fit=crop' },
  { id: 'forest', name: 'FOREST', colors: ['rgba(34,139,34,0.2)', 'rgba(0,100,0,0.3)'], image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&h=200&fit=crop' },
  { id: 'retro', name: 'RETRO', colors: ['rgba(210,105,30,0.2)', 'rgba(128,0,0,0.2)'], image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=200&h=200&fit=crop' },
  { id: 'neon', name: 'NEON', colors: ['rgba(255,0,255,0.25)', 'rgba(75,0,130,0.3)'], image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=200&h=200&fit=crop' },
  { id: 'arctic', name: 'ARCTIC', colors: ['rgba(240,255,255,0.2)', 'rgba(70,130,180,0.3)'], image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=200&h=200&fit=crop' },
  { id: 'candy', name: 'CANDY', colors: ['rgba(255,105,180,0.25)', 'rgba(0,255,255,0.2)'], image: 'https://images.unsplash.com/photo-1533910534207-90f31029a78e?w=200&h=200&fit=crop' },
  { id: 'twilight', name: 'DUSK', colors: ['rgba(72,61,139,0.3)', 'rgba(255,69,0,0.2)'], image: 'https://images.unsplash.com/photo-1470252649358-96947c0338d8?w=200&h=200&fit=crop' },
  { id: 'emerald', name: 'JADE', colors: ['rgba(0,255,127,0.2)', 'rgba(255,215,0,0.2)'], image: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=200&h=200&fit=crop' },
  { id: 'amber', name: 'GOLD', colors: ['rgba(255,191,0,0.3)', 'rgba(255,69,0,0.2)'], image: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=200&h=200&fit=crop' }
];

const SPEED_OPTIONS = ['0.3x', '0.5x', '1x', '2x', '3x'];
const GENRES = ['Action', 'AI', 'Art', 'Music', 'Vlog', 'Tech', 'Dance', 'Comedy'];

// --- COMPONENTS ---

const UNIFIED_EFFECTS = [
  {
    id: 'none',
    name: 'PURE',
    category: 'ALL',
    type: 'none',
    icon: 'close',
    thumb: null,
    gradient: ['#00F2FE', '#FFFFFF'],
  },
  // AR SHOT / FACE MASKS
  {
    id: 'VOEXI_DEVIL_001',
    name: 'NEON DEVIL',
    category: 'AR',
    type: 'ar',
    thumb: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
    gradient: ['#FF0055', '#7A00FF'],
  },
  {
    id: 'VOEXI_BUNNY_001',
    name: 'BUNNY EARS',
    category: 'AR',
    type: 'ar',
    thumb: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop',
    gradient: ['#EC4899', '#8B5CF6'],
  },
  {
    id: 'VOEXI_GLASSES_001',
    name: 'SUNGLASSES',
    category: 'AR',
    type: 'ar',
    thumb: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=200&h=200&fit=crop',
    gradient: ['#3B82F6', '#10B981'],
  },
  {
    id: 'VOEXI_CROWN_001',
    name: 'ROYAL CROWN',
    category: 'AR',
    type: 'ar',
    thumb: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop',
    gradient: ['#F59E0B', '#EF4444'],
  },
  {
    id: 'VOEXI_BUTTERFLY_001',
    name: 'BUTTERFLY',
    category: 'AR',
    type: 'ar',
    thumb: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop',
    gradient: ['#8B5CF6', '#EC4899'],
  },
  {
    id: 'VOEXI_CYBER_001',
    name: 'CYBER GLASS',
    category: 'AR',
    type: 'ar',
    thumb: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&h=200&fit=crop',
    gradient: ['#00F2FE', '#A855F7'],
  },
  {
    id: 'VOEXI_BEAR_001',
    name: 'TEDDY BEAR',
    category: 'AR',
    type: 'ar',
    thumb: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop',
    gradient: ['#D97706', '#92400E'],
  },
  {
    id: 'VOEXI_ANIME_001',
    name: 'ANIME STYLE',
    category: 'AR',
    type: 'ar',
    thumb: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    gradient: ['#F43F5E', '#A855F7'],
  },
  {
    id: 'VOEXI_GLITCH_001',
    name: 'GLITCH FACE',
    category: 'AR',
    type: 'ar',
    thumb: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop',
    gradient: ['#10B981', '#6366F1'],
  },
  {
    id: 'VOEXI_CAT_001',
    name: 'KITTEN',
    category: 'AR',
    type: 'ar',
    thumb: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&h=200&fit=crop',
    gradient: ['#FF017E', '#A855F7'],
  },
  {
    id: 'VOEXI_ANGEL_001',
    name: 'ANGEL HALO',
    category: 'AR',
    type: 'ar',
    thumb: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    gradient: ['#38BDF8', '#E0E7FF'],
  },
  // COLOR FILTERS / LENSES
  {
    id: 'filter_cyber',
    name: 'CYBER LENS',
    category: 'FILTERS',
    type: 'filter',
    data: LENSES[1],
    thumb: LENSES[1].image,
    gradient: LENSES[1].colors,
  },
  {
    id: 'filter_noir',
    name: 'VOID NOIR',
    category: 'FILTERS',
    type: 'filter',
    data: LENSES[2],
    thumb: LENSES[2].image,
    gradient: LENSES[2].colors,
  },
  {
    id: 'filter_vivid',
    name: 'VIVID GLOW',
    category: 'FILTERS',
    type: 'filter',
    data: LENSES[3],
    thumb: LENSES[3].image,
    gradient: LENSES[3].colors,
  },
  {
    id: 'filter_desert',
    name: 'DESERT WARM',
    category: 'FILTERS',
    type: 'filter',
    data: LENSES[4],
    thumb: LENSES[4].image,
    gradient: LENSES[4].colors,
  },
  {
    id: 'filter_ocean',
    name: 'OCEAN BLUE',
    category: 'FILTERS',
    type: 'filter',
    data: LENSES[5],
    thumb: LENSES[5].image,
    gradient: LENSES[5].colors,
  },
  {
    id: 'filter_retro',
    name: 'RETRO VIBE',
    category: 'FILTERS',
    type: 'filter',
    data: LENSES[7],
    thumb: LENSES[7].image,
    gradient: LENSES[7].colors,
  },
  {
    id: 'filter_neon',
    name: 'NEON GLOW',
    category: 'FILTERS',
    type: 'filter',
    data: LENSES[8],
    thumb: LENSES[8].image,
    gradient: LENSES[8].colors,
  },
  // VIRTUAL BACKGROUNDS
  {
    id: 'bg_studio',
    name: 'STUDIO BG',
    category: 'BG',
    type: 'background',
    data: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=400',
    thumb: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=200&h=200&fit=crop',
    gradient: ['#4C1D95', '#1E1B4B'],
  },
  {
    id: 'bg_cyber',
    name: 'CYBER CITY',
    category: 'BG',
    type: 'background',
    data: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=400',
    thumb: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=200&h=200&fit=crop',
    gradient: ['#065F46', '#022C22'],
  },
  {
    id: 'bg_neon',
    name: 'NEON TUNNEL',
    category: 'BG',
    type: 'background',
    data: 'https://images.unsplash.com/photo-1539721972319-f0e80a00d424?w=400',
    thumb: 'https://images.unsplash.com/photo-1539721972319-f0e80a00d424?w=200&h=200&fit=crop',
    gradient: ['#9D174D', '#500724'],
  },
];

const radarStyles = StyleSheet.create({
  container: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  core: { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.purple, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  pulse: { position: 'absolute', width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: COLORS.purple }
});

const RadarSync = () => {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 2500, useNativeDriver: true })).start(); }, []);
  return (
    <View style={radarStyles.container}>
      <Animated.View style={[radarStyles.pulse, { transform: [{ scale: pulse.interpolate({ inputRange:[0,1], outputRange:[1,4] }) }], opacity: pulse.interpolate({ inputRange:[0,1], outputRange:[0.5,0] }) }]} />
      <View style={radarStyles.core}><Ionicons name="radio" size={24} color="#fff" /></View>
    </View>
  );
};

const NeuralWave = ({ active }: { active: boolean }) => {
  const anims = useRef([1,2,3,4,5,6].map(() => new Animated.Value(5))).current;
  useEffect(() => {
    if (active) {
      anims.forEach((anim, i) => {
        Animated.loop(Animated.sequence([
          Animated.timing(anim, { toValue: 12+(i*2), duration: 400+(i*50), useNativeDriver: false }),
          Animated.timing(anim, { toValue: 4, duration: 400+(i*50), useNativeDriver: false }),
        ])).start();
      });
    } else {
      anims.forEach(anim => anim.setValue(4));
    }
  }, [active]);
  return (<View style={styles.waveRow}>{anims.map((anim, i) => (<Animated.View key={i} style={[styles.waveBar, { height: anim, backgroundColor: active?COLORS.cyan:'#666' }]} />))}</View>);
};

const BeautySliderBar = ({ label, icon, value, onChange }: { label: string; icon: string; value: number; onChange: (v: number) => void }) => {
  const barWidthRef = useRef(140);
  const startValRef = useRef(value);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        startValRef.current = value;
        const touchX = evt.nativeEvent.locationX;
        const pct = Math.max(0, Math.min(100, Math.round((touchX / barWidthRef.current) * 100)));
        onChange(pct);
        if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      },
      onPanResponderMove: (_, gestureState) => {
        const deltaPct = Math.round((gestureState.dx / barWidthRef.current) * 100);
        const newPct = Math.max(0, Math.min(100, startValRef.current + deltaPct));
        onChange(newPct);
      },
    })
  ).current;

  const decrease = () => {
    const newVal = Math.max(0, value - 1);
    onChange(newVal);
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const increase = () => {
    const newVal = Math.min(100, value + 1);
    onChange(newVal);
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  return (
    <View style={styles.beautyRow}>
      <View style={styles.attrTagBox}>
        <Ionicons name={icon as any} size={13} color={COLORS.cyan} />
        <Text style={styles.attrTag}>{label}</Text>
      </View>

      <TouchableOpacity onPress={decrease} style={styles.stepperBtn} activeOpacity={0.7}>
        <Ionicons name="remove" size={16} color="#aaa" />
      </TouchableOpacity>

      <View
        style={styles.attrBarTouchable}
        onLayout={(e) => {
          if (e.nativeEvent.layout.width > 0) {
            barWidthRef.current = e.nativeEvent.layout.width;
          }
        }}
        {...panResponder.panHandlers}
      >
        <View style={styles.attrBarTrack}>
          <LinearGradient
            colors={[COLORS.cyan, COLORS.purple]}
            style={[styles.attrFillGrad, { width: `${value}%` }]}
          />
          <View style={[styles.sliderKnob, { left: `${Math.max(0, Math.min(92, value - 4))}%` }]} />
        </View>
      </View>

      <TouchableOpacity onPress={increase} style={styles.stepperBtn} activeOpacity={0.7}>
        <Ionicons name="add" size={16} color={COLORS.cyan} />
      </TouchableOpacity>

      <Text style={styles.attrNumText}>{value}%</Text>
    </View>
  );
};

const CLIP_DURATION_SEC = 15;
const TRIMMER_CONTAINER_WIDTH = Dimensions.get('window').width - 32;
const TRIMMER_FRAME_WIDTH = 160;
const TRIMMER_FRAME_LEFT = (TRIMMER_CONTAINER_WIDTH - TRIMMER_FRAME_WIDTH) / 2;
const TRIMMER_PX_PER_SEC = TRIMMER_FRAME_WIDTH / CLIP_DURATION_SEC;

const generateRealAudioPeaks = (sound: any, totalBars: number = 60) => {
  if (!sound) return Array.from({ length: totalBars }, (_, i) => 14 + (i % 5) * 4);

  const str = String(sound.id || sound.name || sound.url || 'sound_default');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash);

  const peaks: number[] = [];
  for (let i = 0; i < totalBars; i++) {
    const progress = i / totalBars;

    let energyCurve = 0.4;
    if (progress < 0.15) {
      energyCurve = 0.3 + progress * 2.0;
    } else if (progress < 0.45) {
      energyCurve = 0.5 + Math.sin(progress * Math.PI * 4) * 0.2;
    } else if (progress < 0.75) {
      energyCurve = 0.85 + Math.sin(progress * Math.PI * 6) * 0.15;
    } else if (progress < 0.90) {
      energyCurve = 0.45 + Math.cos(progress * Math.PI * 3) * 0.15;
    } else {
      energyCurve = 0.6 * (1 - (progress - 0.90) * 8);
    }

    const pseudoRandom = Math.abs(Math.sin(seed * 0.001 + i * 12.9898 + (i % 7) * 4.132)) % 1;
    const peakHeight = Math.floor(10 + (energyCurve * 0.65 + pseudoRandom * 0.35) * 32);

    peaks.push(Math.max(8, Math.min(44, peakHeight)));
  }

  return peaks;
};

export default function ReelsStudio() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      try {
        activateKeepAwakeAsync().catch(() => {});
      } catch (e) {}
    }
    return () => {
      if (Platform.OS !== 'web') {
        try {
          deactivateKeepAwake().catch(() => {});
        } catch (e) {}
      }
    };
  }, []);

  const router = useRouter();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [libraryPermission, requestLibraryPermission] = ImagePicker.useMediaLibraryPermissions();

  const [step, setStep] = useState(1);
  const [media, setMedia] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // Camera State
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [flash, setFlash] = useState<'on' | 'off' | 'auto'>('off');
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  // Creative Tools
  const [activeTab, setActiveTab] = useState('Record');
  const [activeLens, setActiveLens] = useState(LENSES[0]);
  const [beautyLevel, setBeautyLevel] = useState(0);
  const [beautyParams, setBeautyParams] = useState({
    smooth: 40,
    skinTone: 30,
    sharpen: 20,
    brightEyes: 40,
  });
  const [recordingSpeed, setRecordingSpeed] = useState('1x');
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<any>(null);
  const [audioLibrary, setAudioLibrary] = useState<any[]>([]);
  const [soundFilterTab, setSoundFilterTab] = useState<'For You' | 'Trending' | 'Saved'>('For You');
  const [savedSoundIds, setSavedSoundIds] = useState<Set<string>>(new Set());
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const previewAudioRef = useRef<Audio.Sound | null>(null);
  const bgMusicRef = useRef<Audio.Sound | null>(null);
  const [musicVol, setMusicVol] = useState(70);
  const [origVol, setOrigVol] = useState(100);

  // INSTAGRAM & YOUTUBE SHORTS AUDIO TRIMMER STATE
  const [showAudioTrimmer, setShowAudioTrimmer] = useState(false);
  const [trimmingSound, setTrimmingSound] = useState<any>(null);
  const [soundStartOffsetSec, setSoundStartOffsetSec] = useState<number>(0);
  const [soundMaxDurationSec, setSoundMaxDurationSec] = useState<number>(180);
  const [isTrimmerPlaying, setIsTrimmerPlaying] = useState<boolean>(true);
  const trimmerAudioRef = useRef<Audio.Sound | null>(null);

  const trimmerAudioPeaks = useMemo(() => {
    return generateRealAudioPeaks(trimmingSound, 60);
  }, [trimmingSound?.id, trimmingSound?.name]);

  const trimmerPlayheadAnim = useRef(new Animated.Value(0)).current;
  const trimmerPlayheadLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const soundStartOffsetSecRef = useRef(soundStartOffsetSec);
  useEffect(() => { soundStartOffsetSecRef.current = soundStartOffsetSec; }, [soundStartOffsetSec]);

  const soundMaxDurationSecRef = useRef(soundMaxDurationSec);
  useEffect(() => { soundMaxDurationSecRef.current = soundMaxDurationSec; }, [soundMaxDurationSec]);

  const startTrimmerPlayheadAnim = () => {
    if (trimmerPlayheadLoopRef.current) {
      trimmerPlayheadLoopRef.current.stop();
      trimmerPlayheadLoopRef.current = null;
    }
    trimmerPlayheadAnim.setValue(0);
    const clipDur = Math.min(CLIP_DURATION_SEC, soundMaxDurationSecRef.current || 15);
    trimmerPlayheadLoopRef.current = Animated.loop(
      Animated.timing(trimmerPlayheadAnim, {
        toValue: 1,
        duration: clipDur * 1000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    trimmerPlayheadLoopRef.current.start();
  };

  const stopTrimmerPlayheadAnim = () => {
    if (trimmerPlayheadLoopRef.current) {
      trimmerPlayheadLoopRef.current.stop();
      trimmerPlayheadLoopRef.current = null;
    }
    trimmerPlayheadAnim.setValue(0);
  };

  const toggleTrimmerPlayPause = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isTrimmerPlaying) {
      setIsTrimmerPlaying(false);
      stopTrimmerPlayheadAnim();
      if (trimmerAudioRef.current) {
        await trimmerAudioRef.current.pauseAsync().catch(() => {});
      }
    } else {
      setIsTrimmerPlaying(true);
      startTrimmerPlayheadAnim();
      if (trimmerAudioRef.current) {
        await trimmerAudioRef.current.playAsync().catch(() => {});
      }
    }
  };

  const stopAndUnloadTrimmerAudio = async () => {
    setIsTrimmerPlaying(false);
    stopTrimmerPlayheadAnim();
    if (trimmerAudioRef.current) {
      try {
        const soundObj = trimmerAudioRef.current;
        trimmerAudioRef.current = null;
        await soundObj.stopAsync().catch(() => {});
        await soundObj.unloadAsync().catch(() => {});
      } catch (e) {}
    }
  };

  const closeAudioTrimmer = async () => {
    await stopAndUnloadTrimmerAudio();
    setShowAudioTrimmer(false);
  };

  useEffect(() => {
    if (!showAudioTrimmer) {
      stopAndUnloadTrimmerAudio();
    }
  }, [showAudioTrimmer]);

  useEffect(() => {
    return () => {
      stopAndUnloadTrimmerAudio();
      if (previewAudioRef.current) {
        previewAudioRef.current.stopAsync().catch(() => {});
        previewAudioRef.current.unloadAsync().catch(() => {});
        previewAudioRef.current = null;
      }
      if (bgMusicRef.current) {
        bgMusicRef.current.stopAsync().catch(() => {});
        bgMusicRef.current.unloadAsync().catch(() => {});
        bgMusicRef.current = null;
      }
    };
  }, []);

  const isDraggingPlayheadRef = useRef(false);

  const seekToPlayheadRatio = async (ratio: number) => {
    const clipDur = Math.min(CLIP_DURATION_SEC, soundMaxDurationSecRef.current || 15);
    const seekSec = soundStartOffsetSecRef.current + ratio * clipDur;
    if (trimmerAudioRef.current) {
      await trimmerAudioRef.current.setPositionAsync(seekSec * 1000).catch(() => {});
    }
  };

  const playheadPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt) => {
        isDraggingPlayheadRef.current = true;
        stopTrimmerPlayheadAnim();
        const touchX = evt.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, touchX / TRIMMER_FRAME_WIDTH));
        trimmerPlayheadAnim.setValue(ratio);
        seekToPlayheadRatio(ratio);
      },
      onPanResponderMove: (evt, gestureState) => {
        const touchX = evt.nativeEvent.locationX || (gestureState.dx + TRIMMER_FRAME_WIDTH / 2);
        const ratio = Math.max(0, Math.min(1, touchX / TRIMMER_FRAME_WIDTH));
        trimmerPlayheadAnim.setValue(ratio);
        seekToPlayheadRatio(ratio);
      },
      onPanResponderRelease: () => {
        isDraggingPlayheadRef.current = false;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        if (isTrimmerPlaying) {
          startTrimmerPlayheadAnim();
        }
      },
      onPanResponderTerminate: () => {
        isDraggingPlayheadRef.current = false;
      },
    })
  ).current;

  const trimmerTranslateX = useRef(
    new Animated.Value(TRIMMER_FRAME_LEFT - soundStartOffsetSec * TRIMMER_PX_PER_SEC)
  ).current;

  useEffect(() => {
    trimmerTranslateX.setValue(TRIMMER_FRAME_LEFT - soundStartOffsetSec * TRIMMER_PX_PER_SEC);
  }, [soundStartOffsetSec]);

  const trimmerStartOffsetOnGrant = useRef(0);
  const trimmerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        stopTrimmerPlayheadAnim();
        trimmerStartOffsetOnGrant.current = soundStartOffsetSecRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const currentMaxDuration = soundMaxDurationSecRef.current || 15;
        const maxStart = Math.max(0, currentMaxDuration - Math.min(CLIP_DURATION_SEC, currentMaxDuration));
        const deltaSec = -gestureState.dx / TRIMMER_PX_PER_SEC;
        const rawSecs = trimmerStartOffsetOnGrant.current + deltaSec;
        const cleanSecs = Math.max(0, Math.min(maxStart, rawSecs));

        trimmerTranslateX.setValue(TRIMMER_FRAME_LEFT - cleanSecs * TRIMMER_PX_PER_SEC);

        if (Math.abs(cleanSecs - soundStartOffsetSecRef.current) >= 0.1) {
          soundStartOffsetSecRef.current = cleanSecs;
          setSoundStartOffsetSec(cleanSecs);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentMaxDuration = soundMaxDurationSecRef.current || 15;
        const maxStart = Math.max(0, currentMaxDuration - Math.min(CLIP_DURATION_SEC, currentMaxDuration));
        const deltaSec = -gestureState.dx / TRIMMER_PX_PER_SEC;
        const rawSecs = trimmerStartOffsetOnGrant.current + deltaSec;
        const cleanSecs = Math.max(0, Math.min(maxStart, rawSecs));

        setSoundStartOffsetSec(cleanSecs);
        handleOffsetChange(cleanSecs);
      },
      onPanResponderTerminate: () => {
        handleOffsetChange(soundStartOffsetSecRef.current);
      },
    })
  ).current;

  const playheadAnim = useRef(new Animated.Value(0)).current;
  const playheadAnimLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // AR ENGINE STATE
  const [isAREnabled, setIsAREnabled] = useState(false);
  const [selectedAREffect, setSelectedAREffect] = useState<string | null>(null);

  // UNIFIED INSTAGRAM/SNAPCHAT CAMERA WHEEL STATE
  const flatListRef = useRef<FlatList>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'ALL' | 'AR' | 'FILTERS' | 'BG'>('ALL');
  const [selectedEffectId, setSelectedEffectId] = useState<string>('none');
  const [currentCenterIndex, setCurrentCenterIndex] = useState<number>(0);

  const currentActiveEffect = UNIFIED_EFFECTS.find(e => e.id === selectedEffectId) || UNIFIED_EFFECTS[0];
  const activeGradient = currentActiveEffect.gradient || ['#00F2FE', '#A855F7'];

  const filteredEffects = UNIFIED_EFFECTS.filter(e => {
    if (activeCategoryFilter === 'ALL') return true;
    return e.category === activeCategoryFilter;
  });

  useEffect(() => {
    setCurrentCenterIndex(0);
    if (filteredEffects[0]) {
      setSelectedEffectId(filteredEffects[0].id);
      applyEffectToCamera(filteredEffects[0]);
    }
  }, [activeCategoryFilter]);

  const getItemLayout = (_: any, index: number) => ({
    length: ITEM_WIDTH,
    offset: ITEM_WIDTH * index,
    index,
  });

  const applyEffectToCamera = (effect: any) => {
    if (effect.type === 'none') {
      setSelectedAREffect(null);
      setActiveLens(LENSES[0]);
      setSelectedBackground(null);
    } else if (effect.type === 'ar') {
      setSelectedAREffect(effect.id);
      setActiveLens(LENSES[0]);
      setSelectedBackground(null);
    } else if (effect.type === 'filter') {
      setSelectedAREffect(null);
      setActiveLens(effect.data || LENSES[0]);
      setSelectedBackground(null);
    } else if (effect.type === 'background') {
      setSelectedAREffect(null);
      setSelectedBackground(effect.data);
    }
  };

  const handleScrollLive = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.max(0, Math.min(Math.round(offsetX / ITEM_WIDTH), filteredEffects.length - 1));
    if (index !== currentCenterIndex) {
      setCurrentCenterIndex(index);
      const centeredItem = filteredEffects[index];
      if (centeredItem) {
        setSelectedEffectId(centeredItem.id);
        if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        applyEffectToCamera(centeredItem);
      }
    }
  };

  const handleSelectUnifiedEffect = (effect: any, index: number) => {
    setCurrentCenterIndex(index);
    setSelectedEffectId(effect.id);
    try {
      flatListRef.current?.scrollToOffset({ offset: index * ITEM_WIDTH, animated: true });
    } catch (e) {}
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    applyEffectToCamera(effect);
  };

  // Advanced States
  const [showSpeedSelector, setShowSpeedSelector] = useState(false);
  const [timerMode, setTimerMode] = useState<'off' | '3s' | '10s'>('off');
  const [countdown, setCountdown] = useState<number | null>(null);

  // Animation States
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const hideTimerRef = useRef<any>(null);

  // Multi-Touch Drag & Pinch-Zoom Gestures for 16:9 to 9:16 Reel Conversion
  const [videoFitMode, setVideoFitMode] = useState<'cover' | 'contain'>('cover');

  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1.0)).current;

  const currentPanX = useRef(0);
  const currentPanY = useRef(0);
  const currentScale = useRef(1.0);

  const initialPinchDist = useRef<number>(0);
  const baseScale = useRef<number>(1.0);
  const touchCount = useRef<number>(0);

  useEffect(() => {
    const lx = panX.addListener(({ value }) => { currentPanX.current = value; });
    const ly = panY.addListener(({ value }) => { currentPanY.current = value; });
    const ls = scale.addListener(({ value }) => { currentScale.current = value; });
    return () => {
      panX.removeListener(lx);
      panY.removeListener(ly);
      scale.removeListener(ls);
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches || [];
        touchCount.current = touches.length;

        panX.setOffset(currentPanX.current);
        panX.setValue(0);
        panY.setOffset(currentPanY.current);
        panY.setValue(0);

        if (touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          initialPinchDist.current = Math.hypot(dx, dy);
          baseScale.current = currentScale.current;
        } else {
          initialPinchDist.current = 0;
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches || [];

        // Handle dynamic touch count transition (e.g. 1 finger -> 2 fingers)
        if (touches.length !== touchCount.current) {
          touchCount.current = touches.length;
          panX.setOffset(currentPanX.current);
          panX.setValue(0);
          panY.setOffset(currentPanY.current);
          panY.setValue(0);

          if (touches.length === 2) {
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            initialPinchDist.current = Math.hypot(dx, dy);
            baseScale.current = currentScale.current;
            return;
          }
        }

        if (touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const dist = Math.hypot(dx, dy);

          if (initialPinchDist.current > 0 && dist > 0) {
            const factor = dist / initialPinchDist.current;
            const targetScale = Math.max(0.5, Math.min(3.5, baseScale.current * factor));
            scale.setValue(targetScale);
          }
        } else if (touches.length === 1) {
          panX.setValue(gestureState.dx);
          panY.setValue(gestureState.dy);
        }
      },

      onPanResponderRelease: () => {
        initialPinchDist.current = 0;
        touchCount.current = 0;
        panX.flattenOffset();
        panY.flattenOffset();
        scale.flattenOffset();
      },

      onPanResponderTerminate: () => {
        initialPinchDist.current = 0;
        touchCount.current = 0;
        panX.flattenOffset();
        panY.flattenOffset();
        scale.flattenOffset();
      },
    })
  ).current;

  const zoomIn = () => {
    const newScale = Math.min(3.5, currentScale.current + 0.25);
    scale.setValue(newScale);
  };

  const zoomOut = () => {
    const newScale = Math.max(0.5, currentScale.current - 0.25);
    scale.setValue(newScale);
  };

  const resetGestures = () => {
    panX.setOffset(0);
    panX.setValue(0);
    panY.setOffset(0);
    panY.setValue(0);
    scale.setOffset(0);
    scale.setValue(1.0);
    currentPanX.current = 0;
    currentPanY.current = 0;
    currentScale.current = 1.0;
    initialPinchDist.current = 0;
    touchCount.current = 0;
    setVideoFitMode('cover');
  };

  // Meta Data & Rich Transmission Controls
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [qualityPreset, setQualityPreset] = useState<'1080p' | '720p' | '480p' | '360p'>('1080p');
  const [category, setCategory] = useState(GENRES[0] || 'DISCOVER');
  const [tags, setTags] = useState('reels, viral, discover');
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!cameraPermission?.granted && requestCameraPermission) {
      requestCameraPermission();
    }
    if (!micPermission?.granted && requestMicPermission) {
      requestMicPermission();
    }
  }, [cameraPermission, micPermission]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const { data } = await supabase.from('profiles').select('username, channel_name, avatar_url, category').eq('id', user.id).maybeSingle();
          if (data) setCurrentUserProfile(data);
        }
      } catch (e) {}
    };
    loadProfile();
  }, []);

  // Modals & Advanced Controls
  const [showLocModal, setShowLocModal] = useState(false);
  const [locSearch, setLocSearch] = useState('');
  const [locResults, setLocResults] = useState<any[]>([]);
  const [isLocLoading, setIsLocLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selHour, setSelHour] = useState('12');
  const [selMin, setSelMin] = useState('00');
  const [selAmPm, setSelAmPm] = useState('PM');
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);

  const [hideLikes, setHideLikes] = useState(false);
  const [hideRatings, setHideRatings] = useState(false);
  const [disableComments, setDisableComments] = useState(false);
  const [disableSharing, setDisableSharing] = useState(false);
  const [monetize, setMonetize] = useState(true);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [collabSearch, setCollabSearch] = useState('');
  const [collabResults, setCollabResults] = useState<any[]>([]);
  const [showCollabModal, setShowCollabModal] = useState(false);

  const toggleCollaborator = (user: any) => {
    setCollaborators(prev => {
      const exists = prev.some(u => u.id === user.id);
      if (exists) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const detectMyLocation = async () => {
    Alert.alert("GPS UPLINK", "Authorize satellite GPS sync?", [
      { text: "DENY", style: "cancel" },
      { text: "AUTHORIZE", onPress: async () => {
        setIsLocLoading(true);
        try {
          const res = await fetch('https://ipinfo.io/json?token=1234567890').catch(() => null);
          const data = res ? await res.json() : null;
          if (data && data.city) {
            const fullLoc = `${data.country_name || 'India'}, ${data.region || 'Bihar'}, ${data.city}`;
            setLocation(fullLoc); setShowLocModal(false); Alert.alert("GPS LOCK", `Synced: ${fullLoc}`);
          } else {
            setLocation("India, Bihar, Nalanda HQ"); setShowLocModal(false); Alert.alert("SIGNAL ROUTED", "Bihar Satellite connected.");
          }
        } catch (e) { setLocation("India, Bihar, Patna Station"); setShowLocModal(false); } finally { setIsLocLoading(false); }
      }}
    ]);
  };

  const handleLocationSearch = async (query: string) => {
    setLocSearch(query); if (query.length < 2) { setLocResults([]); return; }
    const { data } = await supabase.from('world_locations').select('name').ilike('name', `%${query}%`).limit(25);
    if (data) setLocResults(data);
  };

  const fetchSuggestedPartners = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let query = supabase.from('profiles').select('*').limit(15);
      if (user?.id) {
        query = query.neq('id', user.id);
      }
      const { data } = await query;
      if (data) setCollabResults(data);
    } catch (e) {}
  };

  const searchPartners = async (query: string) => {
    setCollabSearch(query);
    if (!query || query.trim().length === 0) {
      fetchSuggestedPartners();
      return;
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,channel_name.ilike.%${query}%,vx_id_number.ilike.%${query}%`)
        .limit(10);
      if (data) setCollabResults(data);
    } catch (e) {}
  };

  const player = useVideoPlayer(media ? String(media) : '', (p) => {
    if (p) p.loop = true;
  });

  useEffect(() => {
    if (step === 1) {
      requestCameraPermission(); requestMicPermission();
      fetchAudioLibrary();
      AsyncStorage.getItem('@saved_sounds').then(raw => {
        if (raw) {
          try {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) setSavedSoundIds(new Set(arr));
          } catch (e) {}
        }
      }).catch(() => {});
    }
    Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, staysActiveInBackground: false, shouldRouteThroughEarpieceAndroid: false });

    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownIntervalRef.current);
      clearTimeout(hideTimerRef.current);
      if (previewAudioRef.current) previewAudioRef.current.unloadAsync().catch(() => {});
    };
  }, [step]);

  const fetchAudioLibrary = async () => {
    try {
      const LOCAL_SERVER_BASE = 'http://192.168.31.39:8080';
      let serverTracks: any[] = [];

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 600);
        const res = await fetch(`${LOCAL_SERVER_BASE}/files.json`, { signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            serverTracks = list.filter((item: any) => {
              const pt = (item.post_type || '').toLowerCase();
              const cat = (item.category || '').toLowerCase();
              const fn = (item.filename || '').toLowerCase();
              const isAudioFile = fn.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/i);
              return pt === 'audio' || pt === 'sound' || cat === 'sounds' || isAudioFile;
            }).map((item: any) => {
              let url = item.media_url || item.audio_url || item.video_url || `${LOCAL_SERVER_BASE}/${encodeURIComponent(item.filename)}`;
              if (url.startsWith('/')) url = `${LOCAL_SERVER_BASE}${url}`;
              const durSec = parseDurationSec(item.duration_sec || item.duration || 30);
              return {
                id: item.id || `srv_${item.filename}`,
                name: item.title || item.filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
                artist: item.uploader ? item.uploader.replace('@', '') : 'admin_creator',
                url: url,
                durationSec: durSec,
                duration: formatSecs(durSec),
                thumbnail_url: item.thumbnail_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop'
              };
            });
          }
        }
      } catch (e) {}

      let localTracks: any[] = [];
      try {
        const raw = await AsyncStorage.getItem('@my_local_uploads');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            localTracks = parsed.filter((item: any) => {
              const pt = (item.post_type || '').toLowerCase();
              const mt = (item.media_type || '').toLowerCase();
              return pt === 'sound' || mt === 'audio';
            }).map((item: any) => {
              const durSec = parseDurationSec(item.duration_sec || item.duration || 30);
              return {
                id: item.id || `loc_${Math.random()}`,
                name: item.title || 'Local Sound Track',
                artist: item.profiles?.username || 'me',
                url: item.media_url,
                durationSec: durSec,
                duration: formatSecs(durSec),
                thumbnail_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop'
              };
            });
          }
        }
      } catch (e) {}

      let dbTracks: any[] = [];
      try {
        const { data } = await supabase.from('vx_sounds').select('*').limit(20);
        if (data) {
          dbTracks = data.map((s: any) => {
            const durSec = parseDurationSec(s.duration_sec || s.duration || s.length || 30);
            return {
              id: s.id,
              name: s.name || s.title || 'Sound Track',
              artist: s.profiles?.username || 'artist',
              url: s.url,
              durationSec: durSec,
              duration: formatSecs(durSec),
              thumbnail_url: s.thumbnail_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop'
            };
          });
        }
      } catch (e) {}

      const seen = new Set<string>();
      const combined: any[] = [];

      const addSnd = (item: any) => {
        if (!item || !item.url) return;
        let cleanUrl = String(item.url).trim().replace(/[\[\]"']/g, '');
        if (cleanUrl.startsWith('/')) cleanUrl = `${LOCAL_SERVER_BASE}${cleanUrl}`;
        else if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('file://') && !cleanUrl.startsWith('content://')) {
          cleanUrl = `${LOCAL_SERVER_BASE}/${cleanUrl}`;
        }
        if (!seen.has(cleanUrl)) {
          seen.add(cleanUrl);
          combined.push({ ...item, url: cleanUrl });
        }
      };

      serverTracks.forEach(addSnd);
      localTracks.forEach(addSnd);
      dbTracks.forEach(addSnd);

      if (combined.length > 0) setAudioLibrary(combined);
    } catch (e) {}
  };

  const handlePreviewPlaySound = async (sound: any) => {
    try {
      if (playingPreviewId === sound.id) {
        if (previewAudioRef.current) await previewAudioRef.current.pauseAsync().catch(() => {});
        setPlayingPreviewId(null);
        return;
      }
      if (previewAudioRef.current) {
        await previewAudioRef.current.unloadAsync().catch(() => {});
        previewAudioRef.current = null;
      }

      let soundUrl = sound?.url || '';
      if (typeof soundUrl === 'string' && soundUrl.startsWith('/')) {
        soundUrl = `http://192.168.31.39:8080${soundUrl}`;
      }

      setPlayingPreviewId(sound.id);
      const { sound: audioObj } = await Audio.Sound.createAsync({ uri: soundUrl }, { shouldPlay: true, volume: 1.0 });
      previewAudioRef.current = audioObj;
    } catch (e) {
      setPlayingPreviewId(null);
    }
  };

  const toggleSaveReelSound = async (sound: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const newSet = new Set(savedSoundIds);
    if (newSet.has(sound.id)) newSet.delete(sound.id);
    else newSet.add(sound.id);
    setSavedSoundIds(newSet);
    try {
      await AsyncStorage.setItem('@saved_sounds', JSON.stringify(Array.from(newSet)));
    } catch (e) {}
  };

  useEffect(() => {
    if (!player || !media) return;
    try {
      player.replace(media);
      if (step === 2 || step === 3) {
        player.play();

        if (selectedAudio) {
          if (!bgMusicRef.current && selectedAudio.url) {
            let soundUrl = selectedAudio.url;
            if (typeof soundUrl === 'string' && soundUrl.startsWith('/')) {
              soundUrl = `http://192.168.31.39:8080${soundUrl}`;
            }
            Audio.Sound.createAsync(
              { uri: soundUrl },
              { shouldPlay: true, volume: musicVol / 100, isLooping: true }
            ).then(({ sound: audioObj }) => {
              bgMusicRef.current = audioObj;
            }).catch(() => {});
          } else if (bgMusicRef.current) {
            bgMusicRef.current.setVolumeAsync(musicVol / 100).catch(() => {});
            bgMusicRef.current.setPositionAsync(0).catch(() => {});
            bgMusicRef.current.setIsLoopingAsync(true).catch(() => {});
            bgMusicRef.current.playAsync().catch(() => {});
          }
        }
      } else {
        player.pause();
        if (bgMusicRef.current) {
          bgMusicRef.current.pauseAsync().catch(() => {});
        }
      }
    } catch (e) {}
  }, [media, step, player, selectedAudio]);

  useEffect(() => {
    if (step === 1) {
      resetHideTimer();
    }
  }, [step]);

  const resetHideTimer = () => {
    Animated.timing(controlsOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      Animated.timing(controlsOpacity, { toValue: 0, duration: 1000, useNativeDriver: true }).start();
      setShowSpeedSelector(false);
    }, 2000);
  };

  const openAudioTrimmer = async (sound: any) => {
    if (previewAudioRef.current) {
      await previewAudioRef.current.stopAsync().catch(() => {});
      await previewAudioRef.current.unloadAsync().catch(() => {});
      previewAudioRef.current = null;
    }
    setPlayingPreviewId(null);

    setTrimmingSound(sound);

    const initStart = (selectedAudio && selectedAudio.id === sound.id && selectedAudio.startOffsetSec !== undefined)
      ? selectedAudio.startOffsetSec : 0;

    const initialDurSec = parseDurationSec(sound?.durationSec || sound?.duration || sound?.length || 30);

    setSoundStartOffsetSec(initStart);
    setSoundMaxDurationSec(initialDurSec);
    setIsTrimmerPlaying(true);
    setShowAudioTrimmer(true);

    let soundUrl = sound?.url || '';
    if (typeof soundUrl === 'string' && soundUrl.startsWith('/')) {
      soundUrl = `http://192.168.31.39:8080${soundUrl}`;
    }

    try {
      await stopAndUnloadTrimmerAudio();

      const onPlaybackStatus = (status: any) => {
        if (status && status.isLoaded) {
          if (status.durationMillis) {
            const realSecs = Math.max(1, Math.round(status.durationMillis / 1000));
            setSoundMaxDurationSec(realSecs);
            if (sound) {
              sound.durationSec = realSecs;
              sound.duration = formatSecs(realSecs);
            }
          }
          if (status.isPlaying) {
            const currentPosMs = status.positionMillis || 0;
            const startPosMs = soundStartOffsetSecRef.current * 1000;
            const clipDurationMs = CLIP_DURATION_SEC * 1000;
            const endPosMs = startPosMs + clipDurationMs;

            if (currentPosMs >= endPosMs || currentPosMs < startPosMs - 300) {
              if (trimmerAudioRef.current) {
                trimmerAudioRef.current.setPositionAsync(startPosMs).catch(() => {});
              }
              startTrimmerPlayheadAnim();
            }
          }
        }
      };

      const { sound: audioObj } = await Audio.Sound.createAsync(
        { uri: soundUrl },
        { shouldPlay: true, volume: 1.0, isLooping: false, positionMillis: initStart * 1000, progressUpdateIntervalMillis: 30 },
        onPlaybackStatus
      );
      trimmerAudioRef.current = audioObj;
      audioObj.setOnPlaybackStatusUpdate(onPlaybackStatus);
      startTrimmerPlayheadAnim();
    } catch (e) {}
  };

  const handleOffsetChange = async (newSecs: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const maxStartSec = Math.max(0, soundMaxDurationSec - CLIP_DURATION_SEC);
    const cleanSecs = Math.max(0, Math.min(maxStartSec, Math.floor(newSecs)));
    setSoundStartOffsetSec(cleanSecs);

    if (trimmerAudioRef.current) {
      await trimmerAudioRef.current.setPositionAsync(cleanSecs * 1000).catch(() => {});
      if (isTrimmerPlaying) {
        startTrimmerPlayheadAnim();
        await trimmerAudioRef.current.playAsync().catch(() => {});
      }
    }
  };

  const confirmAudioTrim = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await stopAndUnloadTrimmerAudio();

    if (bgMusicRef.current) {
      await bgMusicRef.current.unloadAsync().catch(() => {});
      bgMusicRef.current = null;
    }

    if (trimmingSound) {
      let soundUrl = trimmingSound.url || '';
      if (typeof soundUrl === 'string' && soundUrl.startsWith('/')) {
        soundUrl = `http://192.168.31.39:8080${soundUrl}`;
      }

      try {
        const { sound: audioObj } = await Audio.Sound.createAsync(
          { uri: soundUrl },
          { shouldPlay: false, volume: musicVol / 100, isLooping: true, positionMillis: soundStartOffsetSec * 1000 }
        );
        bgMusicRef.current = audioObj;
      } catch (e) {}

      setSelectedAudio({
        ...trimmingSound,
        startOffsetSec: soundStartOffsetSec
      });
    }

    setShowAudioTrimmer(false);
    setActiveTab('Record');
  };

  const handleAudioSelect = async (sound: any) => {
    openAudioTrimmer(sound);
  };

  const toggleRecording = async () => {
    if (isProcessing) return;

    if (isRecording) {
      setIsProcessing(true);
      setIsRecording(false);
      clearInterval(timerRef.current);
      if (bgMusicRef.current) await bgMusicRef.current.stopAsync().catch(() => {});
      try {
        await cameraRef.current?.stopRecording();
      } catch (e) {}
      setIsProcessing(false);
    } else {
      setIsProcessing(true);
      // HANDLE TIMER
      if (timerMode !== 'off') {
        let count = parseInt(timerMode);
        setCountdown(count);
        countdownIntervalRef.current = setInterval(() => {
          count -= 1;
          if (count <= 0) {
            clearInterval(countdownIntervalRef.current);
            setCountdown(null);
            startActualRecording();
          } else {
            setCountdown(count);
          }
        }, 1000);
      } else {
        startActualRecording();
      }
    }
  };

  const startActualRecording = async () => {
    if (!cameraRef.current) {
      setIsProcessing(false);
      return;
    }

    try {
      setIsRecording(true);
      setIsProcessing(false); // Unlock to allow stopping
      setDuration(0);

      if (bgMusicRef.current) {
        const speedVal = parseFloat(recordingSpeed.replace('x', ''));
        const startMillis = (selectedAudio?.startOffsetSec || 0) * 1000;
        await bgMusicRef.current.setRateAsync(1 / speedVal, true).catch(() => {});
        await bgMusicRef.current.setPositionAsync(startMillis).catch(() => {});
        await bgMusicRef.current.playAsync().catch(() => {});
      }

      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

      const video = await cameraRef.current?.recordAsync({
        maxDuration: 60,
      });

      clearInterval(timerRef.current);
      if (video) {
        let finalUri = video.uri;

        // --- NEURAL SPEED PROCESSING ---
        if (recordingSpeed !== '1x' && FFmpegKit) {
          try {
            setIsProcessing(true);
            const speedVal = parseFloat(recordingSpeed.replace('x', ''));
            const videoPts = 1 / speedVal;
            const audioAtempo = speedVal;

            const outputUri = `${video.uri.substring(0, video.uri.lastIndexOf('/'))}/processed_${Date.now()}.mp4`;

            let audioFilter = `atempo=${audioAtempo}`;
            if (audioAtempo > 2) audioFilter = `atempo=2.0,atempo=${audioAtempo/2}`;
            if (audioAtempo < 0.5) audioFilter = `atempo=0.5,atempo=${audioAtempo/0.5}`;

            const command = `-i "${video.uri}" -filter_complex "[0:v]setpts=${videoPts}*PTS[v];[0:a]${audioFilter}[a]" -map "[v]" -map "[a]" -y "${outputUri}"`;

            const session = await FFmpegKit.execute(command);
            if (session) {
              const returnCode = await session.getReturnCode();
              if (ReturnCode && ReturnCode.isSuccess && ReturnCode.isSuccess(returnCode)) {
                finalUri = outputUri;
              }
            }
          } catch (e) {
            console.warn("[FFmpeg Bypass]:", e);
          } finally {
            setIsProcessing(false);
          }
        }

        // --- MERGE SELECTED BACKGROUND MUSIC TRACK INTO REEL VIDEO ---
        if (selectedAudio && selectedAudio.url && FFmpegKit) {
          try {
            setIsProcessing(true);
            const outputMergedUri = `${video.uri.substring(0, video.uri.lastIndexOf('/'))}/reel_merged_${Date.now()}.mp4`;

            let audioSource = selectedAudio.url;
            if (typeof audioSource === 'string' && audioSource.startsWith('/')) {
              audioSource = `http://192.168.31.39:8080${audioSource}`;
            }

            const command = `-i "${finalUri}" -i "${audioSource}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest -y "${outputMergedUri}"`;

            const session = await FFmpegKit.execute(command);
            if (session) {
              const returnCode = await session.getReturnCode();
              if (ReturnCode && ReturnCode.isSuccess && ReturnCode.isSuccess(returnCode)) {
                finalUri = outputMergedUri;
                console.log("[REELS EDITOR] Merged background audio track into reel video:", finalUri);
              }
            }
          } catch (e) {
            console.warn("[FFmpeg Audio Merge Bypass]:", e);
          } finally {
            setIsProcessing(false);
          }
        }

        setMedia(finalUri);
        setStep(2);
      }
    } catch (e) {
      console.error("Recording error:", e);
      setIsRecording(false);
      setIsProcessing(false);
      clearInterval(timerRef.current);
    }
  };

  const pickGallery = async () => {
    if (!libraryPermission?.granted) await requestLibraryPermission();
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, allowsEditing: true, aspect:[9,16] });
    if(!res.canceled) { setMedia(res.assets[0].uri); setStep(2); }
  };

  const sanitizeUUID = (inputStr: string): string => {
    if (!inputStr) return '';
    const clean = inputStr.trim().toLowerCase();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) return clean;
    const parts = clean.split('-');
    if (parts.length === 5) {
      const p1 = parts[0].padStart(8, '0').slice(0, 8);
      const p2 = parts[1].padStart(4, '0').slice(0, 4);
      const p3 = parts[2].padStart(4, '0').slice(0, 4);
      const p4 = parts[3].padStart(4, '0').slice(0, 4);
      const p5 = parts[4].padStart(12, '0').slice(0, 12);
      const result = `${p1}-${p2}-${p3}-${p4}-${p5}`;
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result)) return result;
    }
    const hexOnly = clean.replace(/[^0-9a-f]/g, '');
    if (hexOnly.length >= 32) {
      return `${hexOnly.slice(0, 8)}-${hexOnly.slice(8, 12)}-${hexOnly.slice(12, 16)}-${hexOnly.slice(16, 20)}-${hexOnly.slice(20, 32)}`;
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3f | 0x80);
      return v.toString(16);
    });
  };

  const generateUUID = (): string => {
    const u = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3f | 0x80);
      return v.toString(16);
    });
    return sanitizeUUID(u);
  };

  const onPublish = async () => {
    const finalTitle = title.trim();
    if (!finalTitle) return Alert.alert("Required", "Please enter a title for your Reel.");
    setLoading(true);
    setUploadProgress(0);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let activeUserId = user?.id;

      if (!activeUserId) {
        const { data: sessionData } = await supabase.auth.getSession();
        activeUserId = sessionData?.session?.user?.id;
      }

      const cleanUserId = sanitizeUUID(activeUserId || '');

      if (!cleanUserId) {
        setLoading(false);
        return Alert.alert("Auth Error", "Please log in to publish Reels.");
      }

      // AI Content Moderation Check
      const modResult = await ModerationService.analyzeContent(title, description, tags.split(','), 'Reels');
      let modStatus = 'approved';
      if (modResult.flagged) modStatus = 'flagged';

      const { data: myProfile } = await supabase.from('profiles').select('username, channel_name, avatar_url').eq('id', cleanUserId).single();
      const uploaderHandle = myProfile?.username || myProfile?.channel_name || '@creator';

      const url = await uploadToBunny(
        media!,
        'video',
        (pct) => setUploadProgress(pct),
        finalTitle,
        uploaderHandle,
        description.trim(),
        'REELS',
        selectedAudio?.url || '',
        selectedAudio?.name || '',
        selectedAudio?.artist || ''
      );

      const cropX = currentPanX.current;
      const cropY = currentPanY.current;
      const cropScale = currentScale.current;
      const cropFit = videoFitMode;

      const reelId = generateUUID();
      const firstCollab = collaborators[0] || null;
      const newReelData = {
        id: reelId,
        user_id: cleanUserId,
        title: finalTitle,
        description: description.trim(),
        media_url: url,
        audio_url: selectedAudio?.url || null,
        audio_title: selectedAudio?.name || null,
        audio_artist: selectedAudio?.artist || null,
        post_type: 'Reels',
        media_type: 'video',
        is_reel: true,
        width: 1080,
        height: 1920,
        aspect_ratio: 0.5625,
        thumbnail_url: url,
        crop_x: cropX,
        crop_y: cropY,
        crop_scale: cropScale,
        crop_fit: cropFit,
        collaborator_id: firstCollab?.id || null,
        collaborator_name: collaborators.map(c => c.username || c.channel_name).join(', ') || null,
        collaborator_avatar: firstCollab?.avatar_url || null,
        collaborators: collaborators,
        collab_status: collaborators.length > 0 ? 'pending' : null,
        quality_preset: qualityPreset,
        visibility: visibility || 'public',
        category: category || 'DISCOVER',
        location: location || null,
        moderation_status: modStatus,
        ai_moderation_score: modResult.score,
        created_at: new Date().toISOString(),
        views_count: 1,
        likes_count: 0,
        profiles: {
          id: activeUserId,
          username: myProfile?.username || 'user',
          channel_name: myProfile?.channel_name || 'VOEXI Station',
          avatar_url: myProfile?.avatar_url || ''
        }
      };

      const { error: insertError } = await supabase.from('posts').insert({
        id: newReelData.id,
        user_id: newReelData.user_id,
        title: newReelData.title,
        description: newReelData.description,
        media_url: newReelData.media_url,
        audio_url: newReelData.audio_url,
        audio_title: newReelData.audio_title,
        audio_artist: newReelData.audio_artist,
        post_type: newReelData.post_type,
        media_type: newReelData.media_type,
        is_reel: newReelData.is_reel,
        width: newReelData.width,
        height: newReelData.height,
        aspect_ratio: newReelData.aspect_ratio,
        thumbnail_url: newReelData.thumbnail_url,
        collaborator_id: newReelData.collaborator_id,
        collaborator_name: newReelData.collaborator_name,
        collaborator_avatar: newReelData.collaborator_avatar,
        collab_status: newReelData.collab_status,
        visibility: newReelData.visibility,
        category: newReelData.category,
        location: newReelData.location,
        moderation_status: newReelData.moderation_status,
        created_at: newReelData.created_at,
        views_count: newReelData.views_count,
        likes_count: newReelData.likes_count
      });

      // Trigger Collab Notifications & Chat Messages for ALL selected collaborators
      if (collaborators.length > 0) {
        for (const collabUser of collaborators) {
          const notifData = {
            user_id: collabUser.id,
            sender_id: activeUserId,
            actor_id: activeUserId,
            title: 'VOEXI COLLABORATION INVITE 🤝',
            message: `wants to collaborate with you on Reel: "${finalTitle}"!`,
            content: `wants to collaborate with you on Reel: "${finalTitle}"!`,
            type: 'collab_request',
            post_id: reelId,
            status: 'pending',
            read: false,
            created_at: new Date().toISOString()
          };
          try {
            await supabase.from('notifications').insert(notifData);
          } catch (err) {
            console.warn("[NOTIF INSERT FALLBACK]:", err);
          }

          const chatMsg = `🤝 COLLABORATION INVITE!\n\nHey @${collabUser.username || 'creator'}, I've invited you to collaborate on my new Reel: "${finalTitle}"!\n\nCheck your Home Notifications to ACCEPT 🟢 or DECLINE 🔴.`;
          try {
            await supabase.from('messages').insert({
              sender_id: activeUserId,
              receiver_id: collabUser.id,
              content: chatMsg,
              type: 'text',
              created_at: new Date().toISOString()
            });
          } catch (err) {
            console.warn("[MESSAGE INSERT FALLBACK]:", err);
          }
        }
      }

      // Save to local uploads so it INSTANTLY shows up in Profile screen
      try {
        const localRaw = await AsyncStorage.getItem('@my_local_uploads');
        const existing = localRaw ? JSON.parse(localRaw) : [];
        await AsyncStorage.setItem('@my_local_uploads', JSON.stringify([newReelData, ...existing]));
      } catch (e) {}

      if (insertError) {
        console.error("[SUPABASE INSERT ERROR]:", insertError);
        Alert.alert("Database Notice", insertError.message || "Post created.");
      }

      if (activeUserId !== '00000000-0000-0000-0000-000000000000') {
        rewardCoins(activeUserId, 'upload', activeUserId).catch(() => {});
      }

      // 100% Zero Mobile Storage: Delete temporary local camera recording file from phone internal disk
      if (media && !media.startsWith('http')) {
        FileSystem.deleteAsync(media, { idempotent: true }).catch(() => {});
      }

      // Memory Cleanup: Unload background sound and camera/player state before screen transition
      if (bgMusicRef.current) {
        await bgMusicRef.current.unloadAsync().catch(() => {});
        bgMusicRef.current = null;
      }
      setMedia(null);
      setIsRecording(false);
      setIsProcessing(false);

      setTimeout(() => {
        router.replace({
          pathname: '/(tabs)/video-feed',
          params: {
            newReelUrl: url,
            newReelTitle: finalTitle,
            cropX: String(cropX),
            cropY: String(cropY),
            cropScale: String(cropScale),
            cropFit: cropFit
          }
        });
      }, 100);
    } catch (e: any) {
      Alert.alert("Upload Error", e.message || "Failed to publish");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (d: number) => {
    const mins = Math.floor(d / 60);
    const secs = d % 60;
    return `00:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- RENDERING ---

  if (step === 1) {
    if (!cameraPermission?.granted) {
      return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 25 }]}>
          <StatusBar hidden />
          <Ionicons name="camera-outline" size={54} color={COLORS.cyan} style={{ marginBottom: 15 }} />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8, textAlign: 'center', letterSpacing: 1 }}>
            CAMERA ACCESS REQUIRED
          </Text>
          <Text style={{ color: '#888', fontSize: 12, textAlign: 'center', marginBottom: 25, lineHeight: 18 }}>
            Allow access to record Reels videos, capture photos, and apply AR effects.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: COLORS.cyan, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 25 }}
            onPress={() => {
              requestCameraPermission();
              requestMicPermission();
            }}
          >
            <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 }}>ENABLE CAMERA</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <ARShotView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          effectId={selectedAREffect}
          backgroundUri={selectedBackground}
          facing={facing}
          torch={flash}
          isAREnabled={!!(selectedAREffect || selectedBackground)}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={resetHideTimer} />
        <LinearGradient colors={activeLens.colors as [string, string]} style={StyleSheet.absoluteFill} pointerEvents="none" />

        {/* LIVE BEAUTY & GLOW CAMERA OVERLAY */}
        {(beautyParams.smooth > 0 || beautyParams.skinTone > 0 || beautyParams.brightEyes > 0) && (
           <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: 'rgba(255, 230, 210, 0.08)',
                    opacity: (beautyParams.smooth / 100) * 0.5,
                  }
                ]}
              />
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: 'rgba(255, 245, 235, 0.05)',
                    opacity: (beautyParams.skinTone / 100) * 0.4,
                  }
                ]}
              />
              <LinearGradient
                colors={[
                  `rgba(255, 255, 255, ${(beautyParams.brightEyes / 100) * 0.12})`,
                  'transparent',
                  `rgba(0, 242, 254, ${(beautyParams.brightEyes / 100) * 0.08})`,
                ]}
                style={StyleSheet.absoluteFill}
              />
           </View>
        )}

        <View style={styles.cameraUI} pointerEvents="box-none">
           {countdown !== null && (
              <View style={styles.countdownOverlay}>
                 <Text style={styles.countdownText}>{countdown}</Text>
              </View>
           )}
           <SafeAreaView style={{flex: 1}} pointerEvents="box-none">

              {/* TOP HUB: COMPACT CENTERED AUDIO PILL CAPSULE & CLOSE BUTTON */}
              <View style={styles.topHub}>
                 <TouchableOpacity onPress={() => router.back()} style={styles.topCloseCircle}>
                    <Ionicons name="close" size={22} color="#fff" />
                 </TouchableOpacity>

                 {/* COMPACT CENTERED AUDIO PILL */}
                 <TouchableOpacity
                   style={styles.compactSoundPillContainer}
                   onPress={() => setActiveTab('Sounds')}
                   activeOpacity={0.85}
                 >
                    <LinearGradient
                      colors={selectedAudio ? ['rgba(168,85,247,0.45)', 'rgba(0,242,254,0.45)'] : ['rgba(0,0,0,0.7)', 'rgba(20,20,30,0.7)']}
                      style={styles.compactSoundPillGrad}
                    >
                       <Ionicons name="musical-notes" size={14} color={selectedAudio ? COLORS.cyan : "#fff"} style={{ marginRight: 6 }} />

                       <Text style={styles.compactSoundNameTxt} numberOfLines={1}>
                          {selectedAudio ? selectedAudio.name : 'Add Audio'}
                       </Text>

                       {selectedAudio ? (
                          <TouchableOpacity
                            style={{ marginLeft: 6 }}
                            onPress={(e) => {
                               e.stopPropagation();
                               if (bgMusicRef.current) bgMusicRef.current.unloadAsync().catch(() => {});
                               bgMusicRef.current = null;
                               setSelectedAudio(null);
                               if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                            }}
                          >
                             <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.8)" />
                          </TouchableOpacity>
                       ) : (
                          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.6)" style={{ marginLeft: 4 }} />
                       )}
                    </LinearGradient>
                 </TouchableOpacity>

                 <View style={{ width: 42 }} />
              </View>

              {/* DUAL FLOATING SIDEBARS (LEFT + RIGHT) */}
              <View style={styles.workFrame} pointerEvents="box-none">
                 {/* LEFT RAIL: SPEED, FLIP, FLASH, TIMER */}
                 <View style={styles.leftFloatingRail}>
                    <TouchableOpacity
                      style={styles.floatingRailBtn}
                      onPress={() => {
                         setShowSpeedSelector(true);
                         resetHideTimer();
                         if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      }}
                    >
                       <View style={styles.floatingIconBox}>
                          <Ionicons name="speedometer-outline" size={19} color={COLORS.cyan} />
                       </View>
                       <Text style={styles.floatingToolText}>{recordingSpeed}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.floatingRailBtn}
                      onPress={() => {
                         setFacing(f => f === 'front' ? 'back' : 'front');
                         if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      }}
                    >
                       <View style={styles.floatingIconBox}>
                          <MaterialCommunityIcons name="camera-flip" size={20} color="#fff" />
                       </View>
                       <Text style={styles.floatingToolText}>Flip</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.floatingRailBtn}
                      onPress={() => {
                         setFlash(f => f === 'off' ? 'on' : 'off');
                         if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      }}
                    >
                       <View style={[styles.floatingIconBox, flash === 'on' && styles.floatingIconActive]}>
                          <Ionicons name={flash === 'on' ? "flash" : "flash-off"} size={19} color={flash === 'on' ? '#FFD700' : '#fff'} />
                       </View>
                       <Text style={styles.floatingToolText}>{flash === 'on' ? 'On' : 'Flash'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.floatingRailBtn}
                      onPress={() => {
                         setTimerMode(v => v === 'off' ? '3s' : v === '3s' ? '10s' : 'off');
                         resetHideTimer();
                         if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      }}
                    >
                       <View style={[styles.floatingIconBox, timerMode !== 'off' && styles.floatingIconActive]}>
                          <Ionicons name="timer-outline" size={19} color={timerMode !== 'off' ? COLORS.cyan : "#fff"} />
                       </View>
                       <Text style={styles.floatingToolText}>{timerMode === 'off' ? 'Timer' : timerMode}</Text>
                    </TouchableOpacity>
                 </View>

                 {/* RIGHT RAIL: BEAUTY, FILTERS, EFFECTS, BACKGROUND, AR SHOT */}
                 <View style={styles.rightFloatingRail}>
                    <TouchableOpacity
                      style={styles.floatingRailBtn}
                      onPress={() => {
                         setActiveTab('Beauty');
                         if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      }}
                    >
                       <View style={styles.floatingIconBox}>
                          <Ionicons name="sparkles-outline" size={19} color={COLORS.pink} />
                       </View>
                       <Text style={styles.floatingToolText}>Beauty</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.floatingRailBtn}
                      onPress={() => {
                         setActiveTab('Filters');
                         if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      }}
                    >
                       <View style={styles.floatingIconBox}>
                          <Ionicons name="color-filter-outline" size={19} color="#fff" />
                       </View>
                       <Text style={styles.floatingToolText}>Filters</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.floatingRailBtn}
                      onPress={() => {
                         setActiveTab('Effects');
                         if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      }}
                    >
                       <View style={styles.floatingIconBox}>
                          <Ionicons name="sparkles" size={19} color="#fff" />
                       </View>
                       <Text style={styles.floatingToolText}>Effects</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.floatingRailBtn}
                      onPress={() => {
                         setActiveTab('Background');
                         if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      }}
                    >
                       <View style={styles.floatingIconBox}>
                          <Ionicons name="image-outline" size={19} color="#fff" />
                       </View>
                       <Text style={styles.floatingToolText}>Backgrnd</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.floatingRailBtn}
                      onPress={() => {
                         setActiveTab('AR Shot');
                         if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      }}
                    >
                       <View style={styles.floatingIconBox}>
                          <Ionicons name="happy-outline" size={19} color={COLORS.purple} />
                       </View>
                       <Text style={styles.floatingToolText}>AR Shot</Text>
                    </TouchableOpacity>
                 </View>
              </View>

              {/* CONTROL CENTER (BOTTOM OVERLAY) */}
              <View style={styles.controlCenter} pointerEvents="box-none">
                 <Animated.View style={{ opacity: controlsOpacity }} pointerEvents="box-none">
                    {/* SPEED HUB */}
                    {showSpeedSelector && (
                      <View style={styles.speedHub}>
                         {SPEED_OPTIONS.map(s => (
                            <TouchableOpacity key={s} onPress={() => { setRecordingSpeed(s); resetHideTimer(); }} style={[styles.speedPill, recordingSpeed === s && styles.speedPillActive]}>
                               <Text style={[styles.speedLabel, recordingSpeed === s && {color: '#000'}]}>{s}</Text>
                            </TouchableOpacity>
                         ))}
                      </View>
                    )}

                    {/* NEURAL TIMER */}
                    <View style={styles.timerDisplay}>
                       <View style={styles.dot} />
                       <Text style={styles.timeVal}>{formatDuration(duration)}</Text>
                    </View>
                 </Animated.View>

                 {/* INSTAGRAM / SNAPCHAT REELS CAMERA WHEEL ZONE */}
                 <View style={styles.carouselContainer} pointerEvents="box-none">
                    {/* CENTERED ANCHORED RING & MORPHING CAMERA WHEEL ZONE */}
                    <View style={styles.cameraWheelFrame} pointerEvents="box-none">
                       {/* HORIZONTAL SWIPEABLE FLATLIST CAROUSEL */}
                       <FlatList
                         ref={flatListRef}
                         data={filteredEffects}
                         horizontal
                         showsHorizontalScrollIndicator={false}
                         bounces={false}
                         overScrollMode="never"
                         keyExtractor={(item) => item.id}
                         getItemLayout={getItemLayout}
                         contentContainerStyle={{
                           paddingHorizontal: CENTER_PADDING,
                           alignItems: 'center',
                         }}
                         snapToInterval={ITEM_WIDTH}
                         snapToAlignment="center"
                         decelerationRate="fast"
                         scrollEventThrottle={16}
                         onScroll={handleScrollLive}
                         onMomentumScrollEnd={handleScrollLive}
                         onScrollEndDrag={handleScrollLive}
                         renderItem={({ item, index }) => {
                            const isSelected = index === currentCenterIndex;
                            const itemGradient = item.gradient || ['#00F2FE', '#A855F7'];

                            return (
                               <TouchableOpacity
                                 style={{ width: ITEM_WIDTH, alignItems: 'center', justifyContent: 'center' }}
                                 onPress={() => {
                                    if (isSelected) {
                                       toggleRecording();
                                    } else {
                                       handleSelectUnifiedEffect(item, index);
                                    }
                                 }}
                                 activeOpacity={0.88}
                               >
                                  {isSelected ? (
                                     /* CENTER LOCKED & ENLARGED 84px RECORD CIRCLE WITH GLOWING THEME OUTLINE */
                                     <LinearGradient
                                       colors={isRecording ? [COLORS.pink, '#800040'] : itemGradient as [string, string]}
                                       style={styles.bigCenteredRingGlow}
                                     >
                                        {item.type === 'none' ? (
                                           /* PURE: CLASSIC ENLARGED WHITE CAPTURE BUTTON */
                                           <View style={styles.whitePureCaptureInner}>
                                              {isRecording ? (
                                                 <View style={styles.stopSquareRed} />
                                              ) : (
                                                 <View style={styles.whiteCaptureCenterDot} />
                                              )}
                                           </View>
                                        ) : (
                                           /* EFFECT SELECTED: ENLARGED EFFECT THUMBNAIL */
                                           <View style={styles.effectThumbInnerCircle}>
                                              {item.thumb ? (
                                                 <Image source={{ uri: item.thumb }} style={StyleSheet.absoluteFill} />
                                              ) : (
                                                 <LinearGradient colors={itemGradient as [string, string]} style={StyleSheet.absoluteFill} />
                                              )}
                                              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.4)']} style={StyleSheet.absoluteFill} />

                                              {isRecording && (
                                                 <View style={styles.recordingOverlaySquare}>
                                                    <View style={styles.stopSquareWhite} />
                                                 </View>
                                              )}
                                           </View>
                                        )}
                                     </LinearGradient>
                                  ) : (
                                     /* INACTIVE SIDE ITEM (50px COMPACT CIRCLE) */
                                     <View style={styles.inactiveSideCircleRing}>
                                        {item.type === 'none' ? (
                                           <View style={styles.noneCircleInner}>
                                              <Ionicons name="camera" size={20} color="#aaa" />
                                           </View>
                                        ) : (
                                           <View style={styles.thumbCircleInner}>
                                              {item.thumb ? (
                                                 <Image source={{ uri: item.thumb }} style={StyleSheet.absoluteFill} />
                                              ) : (
                                                 <LinearGradient colors={itemGradient as [string, string]} style={StyleSheet.absoluteFill} />
                                              )}
                                              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={StyleSheet.absoluteFill} />
                                           </View>
                                        )}
                                     </View>
                                  )}

                                  <Text
                                    style={[
                                      styles.circleItemLabel,
                                      isSelected && { color: itemGradient[0] || COLORS.cyan, fontWeight: '900', fontSize: 8.5 }
                                    ]}
                                    numberOfLines={1}
                                  >
                                     {item.name}
                                  </Text>
                               </TouchableOpacity>
                            );
                         }}
                       />

                       {/* LEFT ACTION: GALLERY */}
                       <TouchableOpacity style={styles.leftActionBtn} onPress={pickGallery}>
                          <View style={styles.subIconBox}>
                             <Ionicons name="images" size={22} color="#fff" />
                          </View>
                          <Text style={styles.sideQuickLabel}>Gallery</Text>
                       </TouchableOpacity>

                       {/* RIGHT ACTION: FLIP / TOOLS */}
                       <TouchableOpacity style={styles.rightActionBtn} onPress={() => setFacing(f => f === 'front' ? 'back' : 'front')}>
                          <View style={styles.subIconBox}>
                             <MaterialCommunityIcons name="camera-flip" size={22} color="#fff" />
                          </View>
                          <Text style={styles.sideQuickLabel}>Flip</Text>
                       </TouchableOpacity>
                    </View>
                 </View>
              </View>

              {/* EXPANDED TOOL PANELS */}
              {activeTab !== 'Record' && (
                 <View style={styles.panelOverlay}>
                    <BlurView intensity={90} tint="dark" style={styles.panelContainer}>
                       <View style={styles.panelHeader}>
                          <Text style={styles.panelTitle}>{activeTab.toUpperCase()}</Text>
                          <TouchableOpacity onPress={() => setActiveTab('Record')}><Ionicons name="close-circle" size={26} color="#444" /></TouchableOpacity>
                       </View>

                       {activeTab === 'Beauty' && (
                          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                             <View style={styles.beautyRack}>
                                {/* QUICK PRESET BUTTONS */}
                                <View style={styles.beautyPresetRow}>
                                   {[
                                     { label: 'OFF', values: { smooth: 0, skinTone: 0, sharpen: 0, brightEyes: 0 } },
                                     { label: 'NATURAL 🌸', values: { smooth: 35, skinTone: 30, sharpen: 25, brightEyes: 35 } },
                                     { label: 'GLAM ✨', values: { smooth: 65, skinTone: 55, sharpen: 45, brightEyes: 65 } },
                                     { label: 'ULTRA 🌟', values: { smooth: 100, skinTone: 85, sharpen: 60, brightEyes: 90 } },
                                   ].map((preset) => (
                                      <TouchableOpacity
                                        key={preset.label}
                                        style={styles.presetPillBtn}
                                        onPress={() => {
                                           setBeautyParams(preset.values);
                                           if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                        }}
                                      >
                                         <Text style={styles.presetPillTxt}>{preset.label}</Text>
                                      </TouchableOpacity>
                                   ))}
                                </View>

                                {/* INTERACTIVE PRECISE SLIDERS */}
                                <BeautySliderBar
                                  label="Smooth Skin"
                                  icon="sparkles"
                                  value={beautyParams.smooth}
                                  onChange={(v) => setBeautyParams(prev => ({ ...prev, smooth: v }))}
                                />
                                <BeautySliderBar
                                  label="Skin Tone"
                                  icon="color-palette"
                                  value={beautyParams.skinTone}
                                  onChange={(v) => setBeautyParams(prev => ({ ...prev, skinTone: v }))}
                                />
                                <BeautySliderBar
                                  label="Clarity Focus"
                                  icon="contrast"
                                  value={beautyParams.sharpen}
                                  onChange={(v) => setBeautyParams(prev => ({ ...prev, sharpen: v }))}
                                />
                                <BeautySliderBar
                                  label="Bright Eyes"
                                  icon="eye"
                                  value={beautyParams.brightEyes}
                                  onChange={(v) => setBeautyParams(prev => ({ ...prev, brightEyes: v }))}
                                />

                                <TouchableOpacity
                                  style={styles.resetLinkBtn}
                                  onPress={() => {
                                     setBeautyParams({ smooth: 0, skinTone: 0, sharpen: 0, brightEyes: 0 });
                                     if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                  }}
                                >
                                   <Ionicons name="refresh" size={13} color="#aaa" />
                                   <Text style={styles.resetText}>RESET ALL TO 0%</Text>
                                </TouchableOpacity>
                             </View>
                          </ScrollView>
                       )}

                       {activeTab === 'Sounds' && (
                          <View style={styles.soundRemixPanel}>
                             {/* SOUND REMIX HEADER */}
                             <View style={styles.soundRemixHeader}>
                                <View style={styles.soundRemixTitleRow}>
                                   <Ionicons name="musical-notes" size={16} color={COLORS.purple} />
                                   <Text style={styles.soundRemixTitleText}>SOUND REMIX</Text>
                                </View>

                                {/* CATEGORY TABS: FOR YOU, TRENDING, SAVED */}
                                <View style={styles.soundCategoryTabRow}>
                                   {['For You', 'Trending', 'Saved'].map((tab) => (
                                      <TouchableOpacity
                                         key={tab}
                                         style={[styles.soundTabPill, soundFilterTab === tab && styles.soundTabPillActive]}
                                         onPress={() => setSoundFilterTab(tab as any)}
                                      >
                                         <Text style={[styles.soundTabText, soundFilterTab === tab && styles.soundTabTextActive]}>
                                            {tab}
                                         </Text>
                                      </TouchableOpacity>
                                   ))}
                                </View>
                             </View>

                             {/* TRACKS LIST */}
                             <ScrollView style={styles.soundsList} showsVerticalScrollIndicator={false}>
                                {(soundFilterTab === 'Saved'
                                   ? audioLibrary.filter(s => savedSoundIds.has(s.id))
                                   : audioLibrary
                                ).map((s) => {
                                   const isSelected = selectedAudio?.id === s.id;
                                   const isSaved = savedSoundIds.has(s.id);
                                   return (
                                      <View key={s.id} style={[styles.soundRemixCard, isSelected && styles.soundRemixCardActive]}>
                                         <View style={styles.soundRemixThumbBox}>
                                            <Image source={{ uri: s.thumbnail_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop' }} style={styles.soundRemixThumbImg} />
                                            <TouchableOpacity
                                               style={styles.soundRemixPlayOverlay}
                                               onPress={() => handlePreviewPlaySound(s)}
                                            >
                                               <Ionicons name={playingPreviewId === s.id ? "pause" : "play"} size={12} color="#FFF" />
                                            </TouchableOpacity>
                                         </View>

                                         <View style={styles.soundRemixInfoBox}>
                                            <Text style={styles.soundRemixNameTxt} numberOfLines={1}>
                                               {s.name}
                                            </Text>
                                            <Text style={styles.soundRemixArtistTxt} numberOfLines={1}>
                                               {s.artist || 'VOEXI Original'}
                                            </Text>
                                            <Text style={styles.soundRemixDurationTxt}>
                                               {s.duration || '00:30'}
                                            </Text>
                                         </View>

                                         <View style={styles.soundRemixRightActions}>
                                            <TouchableOpacity
                                               style={styles.soundRemixSaveBtn}
                                               onPress={() => toggleSaveReelSound(s)}
                                            >
                                               <Ionicons
                                                  name={isSaved ? "bookmark" : "bookmark-outline"}
                                                  size={18}
                                                  color={isSaved ? COLORS.cyan : "rgba(255,255,255,0.6)"}
                                               />
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                               style={[styles.soundRemixUseBtn, isSelected && styles.soundRemixUseBtnSelected]}
                                               onPress={() => handleAudioSelect(s)}
                                            >
                                               <Text style={styles.soundRemixUseBtnTxt}>
                                                  {isSelected ? 'SELECTED' : 'Use this sound'}
                                               </Text>
                                            </TouchableOpacity>
                                         </View>
                                      </View>
                                   );
                                })}
                             </ScrollView>
                          </View>
                       )}

                       {activeTab === 'Filters' && (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTray}>
                             {LENSES.map(l => (
                                <TouchableOpacity key={l.id} style={styles.filterUnit} onPress={() => setActiveLens(l)}>
                                   <View style={[styles.filterBox, activeLens.id===l.id && styles.filterBoxActive]}>
                                      <Image source={{ uri: l.image }} style={StyleSheet.absoluteFill} />
                                      <LinearGradient colors={l.colors as [string, string]} style={StyleSheet.absoluteFill} />
                                   </View>
                                   <Text style={[styles.filterLabel, activeLens.id===l.id && {color:COLORS.purple}]}>{l.name}</Text>
                                </TouchableOpacity>
                             ))}
                          </ScrollView>
                       )}

                       {activeTab === 'Effects' && (
                          <View style={styles.placeholderPanel}><Ionicons name="sparkles" size={48} color={COLORS.purple} /><Text style={styles.placeholderText}>NEURAL EFFECTS MATRIX</Text></View>
                       )}

                       {activeTab === 'Background' && (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTray}>
                             <TouchableOpacity style={styles.filterUnit} onPress={() => { setSelectedBackground(null); setActiveTab('Record'); }}>
                                <View style={styles.noneBox}><Ionicons name="close" size={30} color="#fff" /></View>
                                <Text style={styles.filterLabel}>NONE</Text>
                             </TouchableOpacity>
                             {[
                                'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=400',
                                'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=400',
                                'https://images.unsplash.com/photo-1539721972319-f0e80a00d424?w=400',
                                'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=400'
                             ].map((bg, idx) => (
                                <TouchableOpacity key={idx} style={styles.filterUnit} onPress={() => { setSelectedBackground(bg); setActiveTab('Record'); }}>
                                   <View style={[styles.filterBox, selectedBackground === bg && styles.filterBoxActive]}>
                                      <Image source={{ uri: bg }} style={StyleSheet.absoluteFill} />
                                   </View>
                                   <Text style={styles.filterLabel}>BG {idx + 1}</Text>
                                </TouchableOpacity>
                             ))}
                             <TouchableOpacity style={styles.filterUnit} onPress={async () => {
                                const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
                                if(!res.canceled) { setSelectedBackground(res.assets[0].uri); setActiveTab('Record'); }
                             }}>
                                <View style={styles.subIconBox}><Ionicons name="add" size={30} color="#fff" /></View>
                                <Text style={styles.filterLabel}>CUSTOM</Text>
                             </TouchableOpacity>
                          </ScrollView>
                       )}

                       {activeTab === 'More' && (
                          <ScrollView contentContainerStyle={{ paddingVertical: 10 }} showsVerticalScrollIndicator={false}>
                             <View style={styles.moreGrid}>
                                <TouchableOpacity style={styles.moreToolItem} onPress={() => { setTimerMode(v => v === 'off' ? '3s' : v === '3s' ? '10s' : 'off'); setActiveTab('Record'); }}>
                                   <View style={styles.moreIconCircle}><Ionicons name="timer-outline" size={22} color={COLORS.cyan} /></View>
                                   <Text style={styles.moreToolLabel}>Timer ({timerMode})</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.moreToolItem} onPress={() => { setRecordingSpeed(s => s === '1x' ? '2x' : s === '2x' ? '3x' : '1x'); setActiveTab('Record'); }}>
                                   <View style={styles.moreIconCircle}><Ionicons name="speedometer-outline" size={22} color={COLORS.purple} /></View>
                                   <Text style={styles.moreToolLabel}>Speed ({recordingSpeed})</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.moreToolItem} onPress={() => setActiveTab('Beauty')}>
                                   <View style={styles.moreIconCircle}><Ionicons name="sparkles-outline" size={22} color={COLORS.pink} /></View>
                                   <Text style={styles.moreToolLabel}>Beauty Touch</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.moreToolItem} onPress={() => setActiveTab('Background')}>
                                   <View style={styles.moreIconCircle}><Ionicons name="image-outline" size={22} color="#FFD700" /></View>
                                   <Text style={styles.moreToolLabel}>Green Screen</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.moreToolItem} onPress={() => setActiveTab('AR Shot')}>
                                   <View style={styles.moreIconCircle}><Ionicons name="happy-outline" size={22} color={COLORS.purple} /></View>
                                   <Text style={styles.moreToolLabel}>AR Face Mask</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.moreToolItem} onPress={() => setActiveTab('Sounds')}>
                                   <View style={styles.moreIconCircle}><Ionicons name="musical-notes-outline" size={22} color={COLORS.cyan} /></View>
                                   <Text style={styles.moreToolLabel}>Voice FX</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.moreToolItem} onPress={() => setFacing(f => f === 'front' ? 'back' : 'front')}>
                                   <View style={styles.moreIconCircle}><MaterialCommunityIcons name="camera-flip" size={22} color="#fff" /></View>
                                   <Text style={styles.moreToolLabel}>Flip Cam</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.moreToolItem} onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')}>
                                   <View style={styles.moreIconCircle}><Ionicons name={flash === 'on' ? "flash" : "flash-off"} size={22} color="#fff" /></View>
                                   <Text style={styles.moreToolLabel}>Flashlight</Text>
                                </TouchableOpacity>
                             </View>
                          </ScrollView>
                       )}

                       {activeTab === 'AR Shot' && (
                          <ARShotPanel
                            onSelectEffect={(id) => {
                                setSelectedAREffect(id);
                                if (id) setActiveTab('Record');
                            }}
                          />
                       )}
                    </BlurView>
                 </View>
              )}
           </SafeAreaView>
        </View>

        {/* INSTAGRAM & YOUTUBE SHORTS AUDIO SEGMENT TRIMMER SHEET */}
        <Modal visible={showAudioTrimmer} transparent animationType="slide" onRequestClose={closeAudioTrimmer}>
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeAudioTrimmer} />
            <View style={styles.audioTrimmerSheet}>
              <LinearGradient colors={['#100320', '#030008']} style={StyleSheet.absoluteFill} />

              {/* HEADER */}
              <View style={styles.trimmerHeader}>
                <TouchableOpacity onPress={closeAudioTrimmer}>
                  <Ionicons name="close" size={22} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.trimmerHeaderTitle}>ADJUST AUDIO LENGTH</Text>
                <TouchableOpacity style={styles.confirmTrimBtn} onPress={confirmAudioTrim}>
                  <Text style={styles.confirmTrimBtnText}>DONE</Text>
                </TouchableOpacity>
              </View>

              {/* TRACK META */}
              <View style={styles.trimmerTrackMetaRow}>
                <Image
                  source={{ uri: trimmingSound?.thumbnail_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop' }}
                  style={styles.trimmerTrackImg}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.trimmerTrackTitle} numberOfLines={1}>{trimmingSound?.name || 'Sound Track'}</Text>
                  <Text style={styles.trimmerTrackSub} numberOfLines={1}>
                    @{trimmingSound?.artist || 'artist'} • Total: {formatSecs(soundMaxDurationSec)}
                  </Text>
                </View>

                {/* PLAY / PAUSE TOGGLE BUTTON */}
                <TouchableOpacity
                  style={styles.trimmerPlayPauseBtn}
                  onPress={toggleTrimmerPlayPause}
                  activeOpacity={0.8}
                >
                  <Ionicons name={isTrimmerPlaying ? "pause" : "play"} size={16} color="#FFF" style={{ marginLeft: isTrimmerPlaying ? 0 : 2 }} />
                </TouchableOpacity>

                <View style={styles.trimRangePill}>
                  <Ionicons name="time-outline" size={12} color={COLORS.cyan} />
                  <Text style={styles.trimRangeText}>
                    {formatSecs(soundStartOffsetSec)} - {formatSecs(Math.min(soundMaxDurationSec, soundStartOffsetSec + CLIP_DURATION_SEC))}
                  </Text>
                </View>
              </View>

              {/* WAVEFORM SLIDER WITH FIXED CENTER FRAME */}
              <View style={styles.waveformContainerBox} {...trimmerPanResponder.panHandlers}>
                <Animated.View
                  style={[
                    styles.waveformBarStrip,
                    {
                      transform: [
                        {
                          translateX: trimmerTranslateX,
                        },
                      ],
                    },
                  ]}
                >
                  {Array.from({ length: 60 }).map((_, i) => {
                    const barSec = (i / 60) * soundMaxDurationSec;
                    const isInSelectedFrame =
                      barSec >= soundStartOffsetSec &&
                      barSec <= soundStartOffsetSec + CLIP_DURATION_SEC;
                    const heightVal = trimmerAudioPeaks[i] || 16;

                    return (
                      <View
                        key={i}
                        style={[
                          styles.waveBar,
                          {
                            height: isInSelectedFrame ? heightVal : Math.max(8, Math.floor(heightVal * 0.5)),
                            backgroundColor: isInSelectedFrame ? COLORS.cyan : 'rgba(255, 255, 255, 0.2)',
                          },
                        ]}
                      />
                    );
                  })}
                </Animated.View>

                {/* FIXED CENTER FRAME WITH LIVE PLAYHEAD SWEEP */}
                <View
                  style={[styles.fixedTrimFrame, { width: TRIMMER_FRAME_WIDTH, left: TRIMMER_FRAME_LEFT }]}
                  pointerEvents="box-none"
                >
                  {/* PLAYBACK PROGRESS OVERLAY */}
                  <Animated.View
                    style={[
                      styles.trimFramePlayedFill,
                      {
                        width: trimmerPlayheadAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                    pointerEvents="none"
                  />

                  {/* SWEEPING DRAGGABLE PLAYHEAD LINE WITH GLOW DOT */}
                  <Animated.View
                    style={[
                      styles.trimFramePlayheadLine,
                      {
                        left: trimmerPlayheadAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                    {...playheadPanResponder.panHandlers}
                  >
                    <View style={styles.trimFramePlayheadDot} />
                  </Animated.View>

                  <View style={styles.trimFrameHandleLeft} pointerEvents="none" />
                  <View style={styles.trimFrameHandleRight} pointerEvents="none" />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // --- UI: STEP 2 (DESIGN STUDIO - HAND TOUCH DRAG & CANVAS ADJUST) ---
  if (step === 2) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#05050A" />

        {/* STANDARD TOP HEADER BAR */}
        <View style={styles.stepHeader}>
          <TouchableOpacity onPress={() => setStep(1)} style={styles.headerBackBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.stepTitleText}>DESIGN STUDIO (9:16 REEL)</Text>

          <TouchableOpacity onPress={() => setStep(3)} style={styles.nextBtn}>
            <Text style={styles.nextText}>NEXT ➔</Text>
          </TouchableOpacity>
        </View>

        {/* DRAGGABLE & PINCHABLE VIDEO CANVAS */}
        <View style={styles.editorArea}>
          <View style={styles.studioBox}>
            {/* AMBIENT GLOW BACKDROP MATCHING REELS FEED */}
            {media && (
              <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Image
                  source={{ uri: media }}
                  style={[StyleSheet.absoluteFillObject, { transform: [{ scale: 1.3 }] }]}
                  contentFit="cover"
                  blurRadius={Platform.OS === 'android' ? 35 : 60}
                />
                <BlurView
                  intensity={Platform.OS === 'android' ? 50 : 80}
                  tint="dark"
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.35)' }]} />
              </View>
            )}

            {/* DRAGGABLE & SCALABLE VIDEO */}
            <View style={{ flex: 1, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
              <Animated.View style={{
                width: '100%',
                height: '100%',
                transform: [
                  { translateX: panX },
                  { translateY: panY },
                  { scale: scale }
                ]
              }}>
                {Boolean(media && player) && (
                  <VideoView key={`reel_v_${media}`} player={player} style={StyleSheet.absoluteFill} contentFit={videoFitMode || 'cover'} nativeControls={false} pointerEvents="none" />
                )}
              </Animated.View>
            </View>

            {/* TRANSPARENT GESTURE CAPTURE LAYER DIRECTLY OVER VIDEO */}
            <View style={[StyleSheet.absoluteFillObject, { zIndex: 50 }]} {...panResponder.panHandlers} />

            <LinearGradient colors={activeLens.colors as [string, string]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          </View>
        </View>

        {/* FLOATING BOTTOM CONTROLS */}
        <SafeAreaView style={styles.floatingBottomControls} pointerEvents="box-none">
          <View style={styles.floatingActionRow}>
            {/* RESET BUTTON */}
            <TouchableOpacity style={styles.floatingIconBtn} onPress={resetGestures}>
              <Ionicons name="refresh" size={20} color="#FF3B30" />
            </TouchableOpacity>

            {/* FIT / COVER TOGGLE */}
            <TouchableOpacity
              style={[styles.floatingFitPill, videoFitMode === 'cover' && styles.floatingFitActive]}
              onPress={() => setVideoFitMode(m => m === 'cover' ? 'contain' : 'cover')}
            >
              <Ionicons name="crop-outline" size={16} color={videoFitMode === 'cover' ? '#fff' : '#aaa'} />
              <Text style={styles.floatingFitText}>{videoFitMode === 'cover' ? '9:16 COVER' : '16:9 CONTAIN'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaView>
    );
  }

  // --- UI: STEP 3 (DEDICATED REEL PREVIEW SECTION UI) ---
  if (step === 3) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.stepHeader}>
          <TouchableOpacity onPress={() => setStep(2)} style={styles.headerBackBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.stepTitleText}>REELS PREVIEW STUDIO</Text>
          <TouchableOpacity onPress={() => setStep(4)} style={styles.nextBtn}>
            <Text style={styles.nextText}>DETAILS ➔</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.previewContainer}>
          {/* CINEMA REEL PREVIEW FRAME */}
          <View style={styles.previewFrame}>
            {media && (
              <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Image
                  source={{ uri: media }}
                  style={[StyleSheet.absoluteFillObject, { transform: [{ scale: 1.3 }] }]}
                  contentFit="cover"
                  blurRadius={Platform.OS === 'android' ? 35 : 60}
                />
                <BlurView
                  intensity={Platform.OS === 'android' ? 50 : 80}
                  tint="dark"
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.35)' }]} />
              </View>
            )}

            <View style={{ flex: 1, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
              <Animated.View style={{
                width: '100%',
                height: '100%',
                transform: [
                  { translateX: panX },
                  { translateY: panY },
                  { scale: scale }
                ]
              }}>
                {Boolean(media && player) && (
                  <VideoView key={`reel_p_${media}`} player={player} style={StyleSheet.absoluteFill} contentFit={videoFitMode || 'cover'} nativeControls={false} />
                )}
              </Animated.View>
            </View>

            <LinearGradient colors={activeLens.colors as [string, string]} style={StyleSheet.absoluteFill} pointerEvents="none" />

            {/* TOP REELS BADGE */}
            <View style={styles.reelsBadgeTag}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.reelsBadgeTxt}>REELS FEED FORMAT (9:16)</Text>
            </View>
          </View>

          {/* PREVIEW CONVERSION CARD */}
          <View style={styles.conversionCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.formatIconCircle}>
                <MaterialCommunityIcons name="filmstrip" size={24} color={COLORS.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.conversionTitle}>STRICT REELS FEED TRANSMISSION</Text>
                <Text style={styles.conversionSub}>This post will broadcast exclusively to the REELS FEED tab.</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.confirmReelBtn} onPress={() => setStep(4)}>
              <LinearGradient colors={[COLORS.purple, COLORS.violet]} style={styles.confirmReelGrad}>
                <Text style={styles.confirmReelTxt}>CONFIRM REEL & SET DETAILS ➔</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // --- UI: STEP 4 (REELS MISSION CONTROL - FULL DETAILS PAGE) ---
  return (
    <SafeAreaView style={styles.container}>
       <StatusBar barStyle="light-content" />
       <View style={styles.stepHeader}>
          <TouchableOpacity onPress={() => setStep(3)} style={styles.headerBackBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.stepTitleText}>REELS MISSION CONTROL</Text>
          <View style={{ width: 32 }} />
       </View>

       <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>

          {/* 1. REEL DETAILS SUMMARY BANNER */}
          <View style={styles.reelFormatBanner}>
             <View style={styles.formatBannerLeft}>
                <MaterialCommunityIcons name="filmstrip" size={28} color={COLORS.purple} />
                <View style={{ marginLeft: 12 }}>
                   <Text style={styles.formatBannerTitle}>TYPE: REELS (9:16)</Text>
                   <Text style={styles.formatBannerSub}>Strictly routes to Reels Feed • {category}</Text>
                </View>
             </View>
             <View style={styles.formatBadgePill}>
                <Text style={styles.formatBadgeTxt}>REELS ONLY</Text>
             </View>
          </View>

          {/* UPLOADER & COLLABORATOR MISSION CONTROL IDENTITY CARD */}
          <View style={styles.missionIdentityCard}>
            <View style={styles.missionIdentityHeader}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.purple} />
              <Text style={styles.missionIdentityTitle}>CREATOR & COLLAB MATRIX</Text>
            </View>

            {/* UPLOADER / PRIMARY CREATOR */}
            <View style={styles.uploaderRowStep4}>
              <Image
                source={{ uri: currentUserProfile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserProfile?.channel_name || 'Uploader')}&background=A855F7&color=fff&bold=true` }}
                style={styles.uploaderAvatarStep4}
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.uploaderNameStep4} numberOfLines={1}>
                    @{currentUserProfile?.username || currentUserProfile?.channel_name || 'uploader'}
                  </Text>
                  <View style={styles.uploaderBadgePill}>
                    <Text style={styles.uploaderBadgeTxt}>PRIMARY UPLOADER 🚀</Text>
                  </View>
                </View>
                <Text style={styles.uploaderSubStep4}>{currentUserProfile?.channel_name || 'VOEXI STATION'}</Text>
              </View>
            </View>

            {/* NICHE / BELOW: COLLABORATION PARTNERS IF ADDED */}
            {collaborators.length > 0 ? (
              <View style={styles.collabSectionStep4}>
                <View style={styles.collabDividerStep4} />
                <Text style={styles.collabHeaderStep4}>COLLABORATOR PARTNERS ({collaborators.length})</Text>
                {collaborators.map((c: any, idx: number) => (
                  <View key={c.id || idx} style={styles.collabRowStep4}>
                    <Image
                      source={{ uri: c.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.username || 'Collab')}&background=00F2FE&color=fff&bold=true` }}
                      style={styles.collabAvatarStep4}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.collabNameStep4} numberOfLines={1}>
                          @{c.username || c.channel_name}
                        </Text>
                        <View style={styles.collabBadgePill}>
                          <Text style={styles.collabBadgeTxt}>COLLAB PARTNER 🤝</Text>
                        </View>
                      </View>
                      <Text style={styles.uploaderSubStep4}>{c.channel_name || 'Co-Creator'} • Invitation Pending</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noCollabStep4Row}>
                <Ionicons name="people-outline" size={14} color="#666" />
                <Text style={styles.noCollabStep4Txt}>No Collab Partner added (Optional - Add below)</Text>
              </View>
            )}
          </View>

          {/* 2. TITLE INPUT */}
          <Text style={styles.labelTitle}>REEL TITLE</Text>
          <TextInput
             style={styles.darkInput}
             placeholder="Title your Reel broadcast..."
             placeholderTextColor="#444"
             value={title}
             onChangeText={setTitle}
             maxLength={100}
          />

          {/* 3. DESCRIPTION INPUT */}
          <Text style={styles.labelTitle}>DESCRIPTION</Text>
          <TextInput
             style={[styles.darkInput, { height: 90, textAlignVertical: 'top' }]}
             placeholder="Tell your fans more about this Reel..."
             placeholderTextColor="#444"
             multiline
             value={description}
             onChangeText={setDescription}
             maxLength={1000}
          />

          {/* 4. HASHTAGS & PILLS */}
          <Text style={styles.labelTitle}>TAGS & SPECTRUM</Text>
          <TextInput
             style={styles.darkInput}
             placeholder="Add hashtags separated by commas..."
             placeholderTextColor="#444"
             value={tags}
             onChangeText={setTags}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
             {['#reels', '#viral', '#trending', '#dance', '#comedy', '#ai'].map(tag => (
                <TouchableOpacity key={tag} style={styles.tagSuggestion} onPress={() => setTags(t => t ? `${t}, ${tag}` : tag)}>
                   <Text style={styles.tagSugText}>{tag}</Text>
                </TouchableOpacity>
             ))}
          </ScrollView>

          {/* 5. CATEGORY SELECTION */}
          <Text style={styles.labelTitle}>BROADCAST SPECTRUM</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 25 }}>
             {GENRES.map(cat => {
                const isSel = category === cat;
                return (
                   <TouchableOpacity key={cat} onPress={() => setCategory(cat)} style={[styles.catPill, isSel && styles.catPillActive]}>
                      <Text style={[styles.catText, isSel && { color: '#fff' }]}>{cat}</Text>
                   </TouchableOpacity>
                );
             })}
          </ScrollView>

          {/* 5.5 REELS BROADCAST QUALITY SELECTOR */}
          <Text style={styles.labelTitle}>REELS BROADCAST QUALITY</Text>
          <View style={{ gap: 10, marginBottom: 25 }}>
             {[
               { id: '1080p', label: '💎 1080p Full HD (60 FPS)', desc: 'Highest clarity & maximum viral engagement', badge: 'ULTRA HD' },
               { id: '720p', label: '⚡ 720p HD (Balanced)', desc: 'Fast processing & high definition streaming', badge: 'HIGH' },
               { id: '480p', label: '📱 480p SD (Fast Upload)', desc: 'Standard definition, saves mobile upload data', badge: 'NORMAL' },
               { id: '360p', label: '🔋 360p Data Saver', desc: 'Ultra compact size for slow networks', badge: 'COMPACT' },
             ].map(q => {
               const isSel = qualityPreset === q.id;
               return (
                 <TouchableOpacity
                   key={q.id}
                   style={[styles.qualitySelectCard, isSel && styles.qualitySelectActive]}
                   onPress={() => {
                     setQualityPreset(q.id as any);
                     if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                   }}
                   activeOpacity={0.8}
                 >
                   <Ionicons name={isSel ? "checkmark-circle" : "ellipse-outline"} size={20} color={isSel ? COLORS.purple : "#666"} />
                   <View style={{ flex: 1 }}>
                     <Text style={[styles.qualitySelectTitle, isSel && { color: "#FFF", fontWeight: "900" }]}>{q.label}</Text>
                     <Text style={styles.qualitySelectSub}>{q.desc}</Text>
                   </View>
                   <View style={[styles.qualityPill, isSel && { backgroundColor: COLORS.purple }]}>
                     <Text style={[styles.qualityPillTxt, isSel && { color: "#FFF" }]}>{q.badge}</Text>
                   </View>
                 </TouchableOpacity>
               );
             })}
          </View>

          {/* 6. GPS LOCATION SELECTOR */}
          <Text style={styles.labelTitle}>GPS SIGNAL LOCATION</Text>
          <TouchableOpacity style={styles.locationSelector} onPress={() => setShowLocModal(true)}>
             <Ionicons name="location" size={20} color={COLORS.purple} />
             <Text style={styles.locText}>{location || 'Select GPS Location'}</Text>
             <Ionicons name="chevron-forward" size={16} color="#444" />
          </TouchableOpacity>

          {/* MULTI-COLLABORATOR SELECTOR SECTION */}
          <Text style={styles.labelTitle}>COLLABORATION PARTNERS ({collaborators.length} SELECTED)</Text>
          <View style={{ marginBottom: 25 }}>
             {collaborators.length > 0 ? (
               <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 5 }}>
                  {collaborators.map(c => (
                     <View key={c.id} style={styles.collabPillCard}>
                        <Image source={{ uri: c.avatar_url || 'https://via.placeholder.com/50' }} style={{ width: 24, height: 24, borderRadius: 12 }} />
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>@{c.username || c.channel_name}</Text>
                        <TouchableOpacity onPress={() => toggleCollaborator(c)}>
                           <Ionicons name="close-circle" size={18} color="#FF3B30" />
                        </TouchableOpacity>
                     </View>
                  ))}
                  <TouchableOpacity style={styles.addMoreCollabBtn} onPress={() => { fetchSuggestedPartners(); setShowCollabModal(true); }}>
                     <Ionicons name="add-circle" size={18} color={COLORS.cyan} />
                     <Text style={{ color: COLORS.cyan, fontSize: 12, fontWeight: 'bold' }}>+ ADD MORE</Text>
                  </TouchableOpacity>
               </ScrollView>
             ) : (
               <TouchableOpacity style={styles.locationSelector} onPress={() => { fetchSuggestedPartners(); setShowCollabModal(true); }}>
                  <Ionicons name="people" size={20} color={COLORS.cyan} />
                  <Text style={styles.locText}>Invite Multiple Friends by Username or VX ID...</Text>
                  <Ionicons name="chevron-forward" size={16} color="#444" />
               </TouchableOpacity>
             )}
          </View>

          {/* 7. VISIBILITY MODE */}
          <Text style={styles.labelTitle}>BROADCAST VISIBILITY</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 25 }}>
             <TouchableOpacity style={[styles.visCard, visibility === 'public' && styles.visCardActive]} onPress={() => setVisibility('public')}>
                <Ionicons name="globe" size={18} color={visibility === 'public' ? COLORS.cyan : '#666'} />
                <Text style={[styles.visLabel, visibility === 'public' && { color: '#fff' }]}>Public</Text>
             </TouchableOpacity>
             <TouchableOpacity style={[styles.visCard, visibility === 'scheduled' && styles.visCardActive]} onPress={() => { setVisibility('scheduled'); setShowSchedulePicker(true); }}>
                <Ionicons name="time" size={18} color={visibility === 'scheduled' ? COLORS.purple : '#666'} />
                <Text style={[styles.visLabel, visibility === 'scheduled' && { color: '#fff' }]}>Scheduled</Text>
             </TouchableOpacity>
          </View>

          {/* 8. ADVANCED BROADCAST CONTROLS */}
          <TouchableOpacity style={styles.advancedSettingsBtn} onPress={() => setShowAdvancedSettings(true)}>
             <Ionicons name="options-outline" size={20} color={COLORS.purple} />
             <Text style={styles.advBtnText}>Advanced Broadcast Controls</Text>
             <Ionicons name="chevron-forward" size={16} color="#444" />
          </TouchableOpacity>

          {/* 9. SPECTRUM INTEGRITY STATUS */}
          <View style={styles.integrityNode}>
             <RadarSync />
             <Text style={styles.integrityTag}>AI SPECTRUM INTEGRITY: 100% OPTIMAL</Text>
          </View>

          {/* 10. LAUNCH BROADCAST BUTTON */}
          <TouchableOpacity style={styles.launchBtn} onPress={onPublish} disabled={loading}>
             <LinearGradient colors={[COLORS.purple, COLORS.violet]} style={styles.launchGrad}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.launchText}>INITIATE REEL BROADCAST</Text>}
             </LinearGradient>
          </TouchableOpacity>
          <View style={{ height: 60 }} />
       </ScrollView>

       {/* MODAL 1: LOCATION SEARCH */}
       <Modal visible={showLocModal} animationType="slide">
          <SafeAreaView style={styles.fullLocSheet}>
             <View style={styles.locHeader}>
                <TouchableOpacity onPress={() => setShowLocModal(false)}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
                <Text style={styles.locHeaderTitle}>GPS LOCATION</Text>
                <View style={{ width: 24 }} />
             </View>
             <TouchableOpacity style={styles.detectBtn} onPress={detectMyLocation}>
                <Ionicons name="navigate-circle" size={24} color={COLORS.purple} />
                <Text style={styles.detectBtnText}>AUTODETECT GPS LOCATION</Text>
             </TouchableOpacity>
             <View style={styles.locSearchBox}>
                <Ionicons name="search" size={20} color="#666" />
                <TextInput autoFocus style={styles.locInput} placeholder="Search Country, State or City..." placeholderTextColor="#444" value={locSearch} onChangeText={handleLocationSearch} />
             </View>
             <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                {locResults.map(l => (
                   <TouchableOpacity key={l.name} style={styles.locItem} onPress={() => { setLocation(l.name); setShowLocModal(false); }}>
                      <View style={styles.locIconCirc}><Ionicons name="pin" size={18} color="#fff" /></View>
                      <Text style={styles.locItemText}>{l.name}</Text>
                   </TouchableOpacity>
                ))}
             </ScrollView>
          </SafeAreaView>
       </Modal>

       {/* MODAL 2: SCHEDULER */}
       <Modal visible={showSchedulePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
             <View style={styles.scheduleSheet}>
                <Text style={styles.clockTitle}>REEL BROADCAST SCHEDULER</Text>
                <TouchableOpacity style={styles.confirmSchedBtn} onPress={() => setShowSchedulePicker(false)}>
                   <Text style={{ color: '#000', fontWeight: '900' }}>CONFIRM TIME</Text>
                </TouchableOpacity>
             </View>
          </View>
       </Modal>

       {/* MODAL 3: ADVANCED CONTROLS */}
       <Modal visible={showAdvancedSettings} animationType="slide">
          <SafeAreaView style={styles.settingsPage}>
             <View style={styles.settingsHeader}>
                <TouchableOpacity onPress={() => setShowAdvancedSettings(false)}><Ionicons name="arrow-back" size={28} color="#fff" /></TouchableOpacity>
                <Text style={styles.headerText}>REEL BROADCAST CONTROLS</Text>
                <View style={{ width: 28 }} />
             </View>
             <ScrollView style={{ padding: 20 }}>
                <View style={styles.settingsSurfaceFull}>
                   {[
                      { label: 'Hide Likes', val: hideLikes, s: setHideLikes },
                      { label: 'Hide Ratings', val: hideRatings, s: setHideRatings },
                      { label: 'Lock Comments', val: disableComments, s: setDisableComments },
                      { label: 'Lock Sharing', val: disableSharing, s: setDisableSharing },
                      { label: 'Earn VX Coins', val: monetize, s: setMonetize }
                   ].map((s) => (
                      <View key={s.label} style={styles.settingRowLarge}>
                         <Text style={styles.settingLabelLarge}>{s.label}</Text>
                         <Switch value={s.val} onValueChange={s.s} trackColor={{ false: '#222', true: COLORS.purple }} />
                      </View>
                   ))}
                </View>
                <TouchableOpacity style={styles.settingsDoneBtn} onPress={() => setShowAdvancedSettings(false)}>
                   <Text style={styles.doneBtnText}>CONFIRM SETTINGS</Text>
                </TouchableOpacity>
             </ScrollView>
          </SafeAreaView>
       </Modal>

       {/* MODAL 4: MULTI-COLLABORATOR SEARCH & SUGGESTIONS */}
       <Modal visible={showCollabModal} animationType="slide">
          <SafeAreaView style={styles.fullLocSheet}>
             <View style={styles.locHeader}>
                <TouchableOpacity onPress={() => setShowCollabModal(false)}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
                <Text style={styles.locHeaderTitle}>SELECT COLLABORATORS 🤝 ({collaborators.length})</Text>
                <TouchableOpacity onPress={() => setShowCollabModal(false)}>
                   <Text style={{ color: COLORS.cyan, fontWeight: '900', fontSize: 13 }}>DONE</Text>
                </TouchableOpacity>
             </View>

             <View style={styles.locSearchBox}>
                <Ionicons name="search" size={20} color="#666" />
                <TextInput
                  style={styles.locInput}
                  placeholder="Search Username or VX ID Number (e.g. VX1001)..."
                  placeholderTextColor="#444"
                  value={collabSearch}
                  onChangeText={searchPartners}
                />
             </View>

             <Text style={[styles.labelTitle, { marginLeft: 20, marginTop: 5, marginBottom: 10 }]}>
                {collabSearch.length > 0 ? 'SEARCH RESULTS' : 'SUGGESTED FRIENDS & CREATORS ✨'}
             </Text>

             <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                {collabResults.map(user => {
                   const isSelected = collaborators.some(u => u.id === user.id);
                   return (
                      <TouchableOpacity
                        key={user.id}
                        style={[styles.locItem, isSelected && { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}
                        onPress={() => toggleCollaborator(user)}
                      >
                         <Image source={{ uri: user.avatar_url || 'https://via.placeholder.com/50' }} style={{ width: 42, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: isSelected ? COLORS.cyan : '#333' }} />
                         <View style={{ marginLeft: 15, flex: 1 }}>
                           <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{user.channel_name || user.username}</Text>
                           <Text style={{ color: COLORS.cyan, fontSize: 11, fontWeight: '500' }}>@{user.username || 'user'} • VX ID: {user.vx_id_number || 'VX1001'}</Text>
                         </View>

                         <Ionicons
                           name={isSelected ? "checkmark-circle" : "add-circle-outline"}
                           size={26}
                           color={isSelected ? "#00FF66" : COLORS.purple}
                         />
                      </TouchableOpacity>
                   );
                })}
             </ScrollView>

             {/* CONFIRM BUTTON */}
             <TouchableOpacity style={styles.confirmCollabBtn} onPress={() => setShowCollabModal(false)}>
                <LinearGradient colors={[COLORS.purple, COLORS.violet]} style={{ paddingVertical: 16, alignItems: 'center', borderRadius: 20 }}>
                   <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1 }}>
                     CONFIRM ({collaborators.length}) COLLABORATORS 🤝
                   </Text>
                </LinearGradient>
             </TouchableOpacity>
          </SafeAreaView>
       </Modal>

       {loading && (
          <View style={styles.fullLoader}>
             <ActivityIndicator size="large" color={COLORS.purple} />
             <Text style={styles.loaderText}>BROADCASTING REEL...</Text>
             <Text style={styles.progressText}>{uploadProgress}%</Text>
             <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${uploadProgress}%` }]} /></View>
          </View>
       )}

       {isProcessing && (
          <View style={styles.fullLoader}>
             <ActivityIndicator size="large" color={COLORS.cyan} />
             <Text style={styles.loaderText}>NEURAL PROCESSING ACTIVE...</Text>
             <Text style={styles.subtext}>Optimizing Spectra & Speed</Text>
          </View>
       )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cameraUI: { ...StyleSheet.absoluteFillObject },
  topHub: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 6 : 10,
    zIndex: 100,
  },
  topCloseCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  compactSoundPillContainer: {
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    maxWidth: 220,
    elevation: 6,
  },
  compactSoundPillGrad: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 19,
  },
  compactSoundNameTxt: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    maxWidth: 130,
  },
  musicIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  musicIconCircleActive: {
    backgroundColor: 'rgba(0,242,254,0.2)',
    borderWidth: 1,
    borderColor: COLORS.cyan,
  },
  capsuleTextContainer: {
    flex: 1,
    marginHorizontal: 10,
  },
  soundNameText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  soundMetaText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  clearAudioBtn: {
    padding: 2,
  },
  waveRow: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 15 },
  waveBar: { width: 2, borderRadius: 1 },
  workFrame: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 6,
  },
  leftFloatingRail: {
    gap: 12,
    alignItems: 'center',
    marginLeft: 2,
  },
  rightFloatingRail: {
    gap: 12,
    alignItems: 'center',
    marginRight: 2,
  },
  floatingRailBtn: {
    alignItems: 'center',
    width: 46,
  },
  floatingIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  floatingIconActive: {
    borderColor: COLORS.cyan,
    backgroundColor: 'rgba(0,242,254,0.25)',
  },
  floatingToolText: {
    color: '#fff',
    fontSize: 8.5,
    fontWeight: 'bold',
    marginTop: 3,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 3,
  },
  controlCenter: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 25 },
  speedHub: { flexDirection: 'row', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 25, padding: 5, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  speedPill: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 20 },
  speedPillActive: { backgroundColor: '#fff', shadowColor: '#fff', shadowRadius: 15, shadowOpacity: 0.6 },
  speedLabel: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  timerDisplay: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginBottom: 25 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.pink, marginRight: 10, shadowColor: COLORS.pink, shadowRadius: 10, shadowOpacity: 1 },
  timeVal: { color: '#fff', fontSize: 20, fontWeight: 'bold', letterSpacing: 2 },
  mixerBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 40, gap: 20, marginBottom: 35 },
  mixCol: { flex: 1 },
  mixLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 8, fontWeight: 'bold', letterSpacing: 1 },
  mixTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2 },
  mixFill: { height: '100%', backgroundColor: COLORS.purple, borderRadius: 2, shadowColor: COLORS.purple, shadowRadius: 8, shadowOpacity: 1 },
  mixIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(168,85,247,0.35)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.purple },
  carouselContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 5,
  },
  activeEffectBadge: {
    marginBottom: 8,
  },
  badgeGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,242,254,0.35)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  catPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  catPillBtnActive: {
    backgroundColor: COLORS.purple,
    borderColor: '#00F2FE',
  },
  catPillText: {
    color: '#aaa',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  catPillTextActive: {
    color: '#fff',
  },
  cameraWheelFrame: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigCenteredRingGlow: {
    width: 84,
    height: 84,
    borderRadius: 42,
    padding: 3.5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },
  whitePureCaptureInner: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  whiteCaptureCenterDot: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#ffffff',
    borderWidth: 2.5,
    borderColor: '#eee',
  },
  effectThumbInnerCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveSideCircleRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    padding: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
  leftActionBtn: {
    position: 'absolute',
    left: 20,
    bottom: 25,
    alignItems: 'center',
    zIndex: 20,
  },
  rightActionBtn: {
    position: 'absolute',
    right: 20,
    bottom: 25,
    alignItems: 'center',
    zIndex: 20,
  },
  sideQuickLabel: {
    color: '#aaa',
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 4,
  },
  circleRingOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleRingActive: {
    borderColor: '#00F2FE',
    borderWidth: 2.5,
    shadowColor: '#00F2FE',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ scale: 1.15 }],
  },
  noneCircleInner: {
    flex: 1,
    width: '100%',
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbCircleInner: {
    flex: 1,
    width: '100%',
    borderRadius: 25,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleItemLabel: {
    color: '#888',
    fontSize: 7,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
  },
  circleItemLabelActive: {
    color: '#00F2FE',
    fontWeight: '900',
  },
  triggerZone: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 55 },
  recordTrigger: { width: 90, height: 90, justifyContent: 'center', alignItems: 'center' },
  recordOuter: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  recordInner: { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center' },
  stopSquare: { width: 26, height: 26, backgroundColor: '#fff', borderRadius: 4 },
  subBtn: { alignItems: 'center', gap: 6 },
  subIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  subLabel: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  modeStrip: { position: 'absolute', bottom: 0, width: width, height: 90 },
  modeBlur: { flex: 1 },
  modeScroll: { alignItems: 'center', paddingHorizontal: 20 },
  modeAnchor: { alignItems: 'center', marginHorizontal: 15, minWidth: 65, gap: 5 },
  modeAnchorLabel: { color: '#888', fontSize: 10, fontWeight: '900' },
  panelOverlay: { position: 'absolute', bottom: 90, width: width, height: 260 },
  panelContainer: { flex: 1, borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  panelTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  beautyRack: {
    paddingVertical: 5,
    gap: 14,
  },
  beautyPresetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  presetPillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  presetPillTxt: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  beautyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepperBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  attrTagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 100,
  },
  attrTag: {
    color: '#fff',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  attrBarTouchable: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
  },
  attrBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  attrFillGrad: {
    height: '100%',
    borderRadius: 4,
  },
  attrNumText: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '900',
    width: 36,
    textAlign: 'right',
  },
  resetLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  resetText: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  soundsList: { flex: 1 },
  soundRemixPanel: { flex: 1, paddingHorizontal: 5 },
  soundRemixHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  soundRemixTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  soundRemixTitleText: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  soundCategoryTabRow: { flexDirection: 'row', gap: 6 },
  soundTabPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  soundTabPillActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  soundTabText: { color: '#64748B', fontSize: 10, fontWeight: '800' },
  soundTabTextActive: { color: '#FFF', fontWeight: '900' },
  soundRemixCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  soundRemixCardActive: { backgroundColor: 'rgba(168,85,247,0.15)', borderColor: COLORS.purple },
  soundRemixThumbBox: { width: 44, height: 44, borderRadius: 10, overflow: 'hidden', position: 'relative', backgroundColor: '#111' },
  soundRemixThumbImg: { width: '100%', height: '100%' },
  soundRemixPlayOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  soundRemixInfoBox: { flex: 1, marginLeft: 10, marginRight: 6 },
  soundRemixNameTxt: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  soundRemixArtistTxt: { color: COLORS.purple, fontSize: 10, marginTop: 2, fontWeight: '700' },
  soundRemixDurationTxt: { color: '#64748B', fontSize: 9, marginTop: 2, fontWeight: '600' },
  soundRemixRightActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  soundRemixSaveBtn: { padding: 4 },
  soundRemixUseBtn: { backgroundColor: COLORS.purple, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  soundRemixUseBtnSelected: { backgroundColor: COLORS.cyan },
  soundRemixUseBtnTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  // REELS MISSION CONTROL QUALITY SELECTOR
  qualitySelectCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  qualitySelectActive: { backgroundColor: 'rgba(168, 85, 247, 0.15)', borderColor: COLORS.purple },
  qualitySelectTitle: { color: '#aaa', fontSize: 13, fontWeight: '700' },
  qualitySelectSub: { color: '#666', fontSize: 10, marginTop: 2 },
  qualityPill: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  qualityPillTxt: { color: '#888', fontSize: 9, fontWeight: '900' },
  soundCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  soundThumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  soundTitle: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  soundBy: { color: '#666', fontSize: 10, marginTop: 4 },
  filterTray: { flexDirection: 'row', paddingHorizontal: 5 },
  filterUnit: { alignItems: 'center', marginRight: 18 },
  filterBox: { width: 70, height: 70, borderRadius: 35, overflow: 'hidden', backgroundColor: '#111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  filterBoxActive: { borderWidth: 3, borderColor: COLORS.purple },
  filterLabel: { color: '#fff', fontSize: 10, marginTop: 8, fontWeight: '900', letterSpacing: 0.5 },
  placeholderPanel: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 15 },
  placeholderText: { color: '#666', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  moreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', paddingHorizontal: 5 },
  moreToolItem: { width: (width - 100) / 4, alignItems: 'center', gap: 6, marginBottom: 12 },
  moreIconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  darkInput: { backgroundColor: '#080808', borderRadius: 15, padding: 18, color: '#fff', marginBottom: 20, borderWidth: 1, borderColor: '#111' },
  catPill: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, backgroundColor: '#111', marginRight: 10, borderWidth: 1, borderColor: '#222', flexDirection: 'row', alignItems: 'center' },
  catPillActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  catText: { color: '#666', fontSize: 11, fontWeight: 'bold' },
  labelTitle: { color: '#444', fontSize: 10, fontWeight: '900', marginBottom: 10, letterSpacing: 1 },
  locationSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', padding: 18, borderRadius: 15, marginBottom: 25, borderWidth: 1, borderColor: '#111', gap: 12 },
  locText: { color: '#fff', flex: 1, fontSize: 13, fontWeight: 'bold' },
  visCard: { flex: 1, backgroundColor: '#080808', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#111', alignItems: 'center', gap: 8 },
  visCardActive: { borderColor: COLORS.purple, backgroundColor: '#100020' },
  visLabel: { color: '#666', fontSize: 12, fontWeight: 'bold' },
  fullLocSheet: { flex: 1, backgroundColor: '#000' },
  locHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  locHeaderTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  locSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', margin: 20, borderRadius: 12, paddingHorizontal: 15, height: 50 },
  locInput: { flex: 1, color: '#fff', marginLeft: 10 },
  locItem: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  locIconCirc: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  locItemText: { color: '#eee', fontSize: 14, marginLeft: 15 },
  detectBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', marginHorizontal: 20, padding: 15, borderRadius: 12, gap: 12, borderWidth: 1, borderColor: COLORS.purple, marginBottom: 20 },
  detectBtnText: { color: COLORS.purple, fontWeight: 'bold', fontSize: 14 },
  tagSuggestion: { backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginRight: 10, borderWidth: 0.5, borderColor: '#222' },
  tagSugText: { color: COLORS.cyan, fontSize: 11, fontWeight: 'bold' },

  audioTrimmerSheet: { width: '100%', backgroundColor: '#0B0518', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 36 : 24, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(168,85,247,0.4)' },
  trimmerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  trimmerHeaderTitle: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  confirmTrimBtn: { backgroundColor: COLORS.purple, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  confirmTrimBtnText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  trimmerTrackMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  trimmerTrackImg: { width: 38, height: 38, borderRadius: 8 },
  trimmerPlayPauseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.purple, justifyContent: 'center', alignItems: 'center' },
  trimmerTrackTitle: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  trimmerTrackSub: { color: COLORS.purple, fontSize: 9.5, marginTop: 2, fontWeight: '700' },
  trimRangePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,242,254,0.12)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,242,254,0.3)' },
  trimRangeText: { color: COLORS.cyan, fontSize: 9.5, fontWeight: '900' },
  waveformContainerBox: { height: 72, backgroundColor: '#05020B', borderRadius: 16, justifyContent: 'center', marginVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', position: 'relative' },
  waveformBarStrip: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingRight: 200 },
  waveBar: { width: 3, borderRadius: 2 },
  fixedTrimFrame: { position: 'absolute', top: 8, bottom: 8, borderWidth: 2, borderColor: COLORS.cyan, borderRadius: 12, backgroundColor: 'rgba(0, 242, 254, 0.08)', zIndex: 10, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  trimFramePlayedFill: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0, 242, 254, 0.25)' },
  trimFramePlayheadLine: { position: 'absolute', top: 0, bottom: 0, width: 2.5, backgroundColor: '#FFF', zIndex: 15, shadowColor: COLORS.cyan, shadowRadius: 6, shadowOpacity: 0.9, alignItems: 'center' },
  trimFramePlayheadDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.cyan, borderWidth: 1, borderColor: '#FFF', marginTop: 2 },
  trimFrameHandleLeft: { width: 4, height: 22, backgroundColor: COLORS.cyan, borderRadius: 2, marginLeft: 4, zIndex: 20 },
  trimFrameHandleRight: { width: 4, height: 22, backgroundColor: COLORS.cyan, borderRadius: 2, marginRight: 4, zIndex: 20 },
  livePlayheadLine: { position: 'absolute', top: 0, bottom: 0, width: 3, backgroundColor: '#FFF', zIndex: 20, shadowColor: COLORS.cyan, shadowRadius: 8, shadowOpacity: 1, alignItems: 'center' },
  playheadGlowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.cyan, marginTop: 4, borderWidth: 1.5, borderColor: '#FFF' },
  draggableStickerHandle: { position: 'absolute', top: 0, bottom: 0, width: 24, zIndex: 30, alignItems: 'center' },
  topStickerPill: { width: 22, height: 16, borderRadius: 8, backgroundColor: COLORS.cyan, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.cyan, shadowRadius: 6, shadowOpacity: 0.9, marginTop: 2 },
  stickerVerticalLine: { flex: 1, width: 3, backgroundColor: COLORS.cyan, shadowColor: COLORS.cyan, shadowRadius: 6, shadowOpacity: 0.9 },
  scrubberTouchableTrack: { ...StyleSheet.absoluteFillObject },
  scrubberSliderTrackBox: { height: 28, justifyContent: 'center', marginVertical: 4, position: 'relative' },
  scrubberTrackBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 3, overflow: 'hidden' },
  scrubberTrackFill: { height: '100%', backgroundColor: COLORS.cyan, borderRadius: 3 },
  scrubberGlowKnob: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.cyan, shadowColor: COLORS.cyan, shadowRadius: 8, shadowOpacity: 0.9, elevation: 6 },
  knobInnerPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.purple },
  advancedSettingsBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#080808', padding: 18, borderRadius: 15, marginBottom: 25, borderWidth: 1, borderColor: '#111' },
  advBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold', flex: 1 },
  settingsPage: { flex: 1, backgroundColor: '#000' },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  settingsSurfaceFull: { backgroundColor: '#0A0A0A', borderRadius: 25, padding: 20 },
  settingRowLarge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20, borderBottomWidth: 0.5, borderBottomColor: '#111' },
  settingLabelLarge: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  settingsDoneBtn: { backgroundColor: COLORS.purple, padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 40 },
  doneBtnText: { color: '#fff', fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end', alignItems: 'center' },
  scheduleSheet: { backgroundColor: '#0A0A0A', padding: 25, borderRadius: 25, width: '85%', alignItems: 'center' },
  clockTitle: { color: '#fff', fontSize: 14, fontWeight: '900', marginBottom: 20 },
  confirmSchedBtn: { backgroundColor: COLORS.cyan, paddingHorizontal: 25, paddingVertical: 12, borderRadius: 15, marginTop: 15 },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 12,
    paddingBottom: 14,
    backgroundColor: '#05050A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerBackBtn: { padding: 4 },
  stepTitleText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  nextBtn: { backgroundColor: COLORS.purple, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  nextText: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  editorArea: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', backgroundColor: '#000' },
  studioBox: { width: '100%', height: '100%', backgroundColor: '#050505', overflow: 'hidden' },

  /* CROP GUIDES & TOUCH GESTURE STYLES */
  cropGuideFrame: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 20 },
  cornerGuide: { position: 'absolute', width: 24, height: 24, borderColor: '#00F2FE' },
  topLeftCorner: { top: 20, left: 20, borderTopWidth: 3, borderLeftWidth: 3 },
  topRightCorner: { top: 20, right: 20, borderTopWidth: 3, borderRightWidth: 3 },
  bottomLeftCorner: { bottom: 20, left: 20, borderBottomWidth: 3, borderLeftWidth: 3 },
  bottomRightCorner: { bottom: 20, right: 20, borderBottomWidth: 3, borderRightWidth: 3 },
  gestureHintBadge: { position: 'absolute', top: 30, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.4)' },
  gestureHintText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },

  /* FLOATING FULL SCREEN OVERLAY STYLES */
  floatingTopHeader: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 12,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
    zIndex: 100,
  },
  floatingHeaderCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  floatingHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  floatingHeaderTitle: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  floatingNextBtn: {
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 8,
  },
  floatingNextGrad: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  floatingNextText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  floatingBottomControls: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 25 : 35,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  gesturePillInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.82)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.35)',
    marginBottom: 12,
  },
  gesturePillText: {
    color: '#fff',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  floatingActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  floatingIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.4)',
  },
  floatingFitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  floatingFitActive: {
    borderColor: COLORS.purple,
    backgroundColor: 'rgba(168,85,247,0.3)',
  },
  floatingFitText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  /* STEP 3 PREVIEW SECTION STYLES */
  previewContainer: { flex: 1, backgroundColor: '#000', padding: 15, justifyContent: 'space-between' },
  previewFrame: { flex: 1, borderRadius: 28, overflow: 'hidden', backgroundColor: '#050505', borderWidth: 1.5, borderColor: 'rgba(168, 85, 247, 0.4)' },
  reelsBadgeTag: { position: 'absolute', top: 15, left: 15, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.4)', zIndex: 10 },
  greenPulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00FF66' },
  reelsBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  conversionCard: { backgroundColor: '#0A0A14', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginTop: 12 },
  formatIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(168,85,247,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.purple },
  conversionTitle: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  conversionSub: { color: '#888', fontSize: 10, marginTop: 2, fontWeight: '500' },
  confirmReelBtn: { marginTop: 14, borderRadius: 18, overflow: 'hidden' },
  confirmReelGrad: { paddingVertical: 14, alignItems: 'center' },
  confirmReelTxt: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  /* REEL FORMAT DETAILS SUMMARY BANNER */
  reelFormatBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0A0A14', padding: 18, borderRadius: 22, marginBottom: 20, borderWidth: 1.5, borderColor: 'rgba(168,85,247,0.3)' },
  formatBannerLeft: { flexDirection: 'row', alignItems: 'center' },
  formatBannerTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  formatBannerSub: { color: '#888', fontSize: 10, marginTop: 2 },
  formatBadgePill: { backgroundColor: COLORS.purple, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  formatBadgeTxt: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  editorToolbar: { flexDirection: 'row', justifyContent: 'center', gap: 40, paddingVertical: 40 },
  toolBtn: { alignItems: 'center', gap: 10 },
  toolTag: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '900' },
  finalReview: { backgroundColor: '#050505', borderRadius: 40, overflow: 'hidden', marginBottom: 30, borderWidth: 1, borderColor: '#111' },
  finalCinema: { width: '100%', aspectRatio: 9/16 },
  liveTag: { position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(255,1,126,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  liveText: { color: COLORS.pink, fontSize: 8, fontWeight: '900' },
  finalMeta: { padding: 25 },
  finalTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 10 },
  finalSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  launchBtn: { borderRadius: 30, overflow: 'hidden' },
  launchGrad: { paddingVertical: 22, alignItems: 'center' },
  launchText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  integrityNode: { alignItems: 'center', marginBottom: 40 },
  integrityTag: { color: COLORS.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 15 },
  collabPillCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#100028', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(168,85,247,0.4)' },
  addMoreCollabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0, 242, 254, 0.12)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: COLORS.cyan },
  confirmCollabBtn: { marginHorizontal: 20, marginBottom: 20, borderRadius: 20, overflow: 'hidden' },

  /* MISSION IDENTITY CARD STYLES */
  missionIdentityCard: {
    backgroundColor: '#0F0E1A',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    marginBottom: 20,
  },
  missionIdentityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  missionIdentityTitle: {
    color: COLORS.purple,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  uploaderRowStep4: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uploaderAvatarStep4: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.purple,
  },
  uploaderNameStep4: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  uploaderBadgePill: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  uploaderBadgeTxt: {
    color: COLORS.purple,
    fontSize: 8,
    fontWeight: '900',
  },
  uploaderSubStep4: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  collabSectionStep4: {
    marginTop: 10,
  },
  collabDividerStep4: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 10,
  },
  collabHeaderStep4: {
    color: COLORS.cyan,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  collabRowStep4: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  collabAvatarStep4: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.cyan,
  },
  collabNameStep4: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  collabBadgePill: {
    backgroundColor: 'rgba(0, 242, 254, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  collabBadgeTxt: {
    color: COLORS.cyan,
    fontSize: 8,
    fontWeight: '900',
  },
  noCollabStep4Row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  noCollabStep4Txt: {
    color: '#666',
    fontSize: 11,
    fontStyle: 'italic',
  },

  fullLoader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  loaderText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginTop: 20 },
  progressText: { color: COLORS.cyan, fontSize: 24, fontWeight: '900', marginTop: 10 },
  progressTrack: { width: '60%', height: 4, backgroundColor: '#222', borderRadius: 2, marginTop: 15, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.purple },
  subtext: { color: COLORS.cyan, fontSize: 10, marginTop: 10, fontWeight: 'bold', letterSpacing: 1 },
  countdownOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.3)' },
  countdownText: { fontSize: 120, fontWeight: '900', color: '#fff', textShadowColor: COLORS.purple, textShadowRadius: 20 },
});
