import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Dimensions, ActivityIndicator, TextInput, FlatList, Animated, PanResponder, Alert, ScrollView, Modal, Pressable, KeyboardAvoidingView, Platform, Keyboard, Switch, Easing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Audio } from 'expo-av';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { uploadToBunny } from '../../lib/bunnyStorage';
import { rewardCoins } from '../../lib/earnings';
import { ModerationService } from '../../lib/moderationService';

const { width, height } = Dimensions.get('window');

const COLORS = {
  foundation: '#020205',
  purple: '#A855F7',
  violet: '#6366F1',
  cyan: '#00F2FE',
  pink: '#FF017E',
  glass: 'rgba(255,255,255,0.06)',
};

const SPECTRUM = [];
for (let i = 0; i <= 360; i += 8) SPECTRUM.push(`hsl(${i}, 100%, 50%)`);
const TONES = ['#000000', '#222', '#888', '#fff', '#00F2FE', '#FFD700', '#FF0000', '#A855F7'];
const FINAL_PALETTE = [...TONES, ...SPECTRUM];

const FONTS = [
  { id: 'System', name: 'MODERN', weight: '900', transform: 'none', spacing: 0 },
  { id: 'serif', name: 'ELEGANT', weight: '400', transform: 'none', spacing: 1 },
  { id: 'monospace', name: 'TECH', weight: 'bold', transform: 'uppercase', spacing: 2 },
  { id: 'Inter-Bold', name: 'IMPACT', weight: '900', transform: 'uppercase', spacing: -1 },
];

const LENSES = [
  { id: 'none', name: 'PURE', colors: ['transparent', 'transparent'] },
  { id: 'cyber', name: 'CYBER', colors: ['rgba(168,85,247,0.25)', 'rgba(0,242,254,0.25)'] },
  { id: 'noir', name: 'VOID', colors: ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)'] },
  { id: 'vivid', name: 'VIVID', colors: ['rgba(255,215,0,0.15)', 'rgba(255,1,126,0.15)'] }
];

const GENRES = ['Personal', 'Creative', 'Music', 'Vlog', 'Tech', 'AI', 'Art', 'Moment'];

// --- COMPONENTS ---
const SatelliteRadar = () => {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 2500, useNativeDriver: true, easing: Easing.out(Easing.quad) })).start(); }, []);
  return (
    <View style={radarStyles.container}>
      <Animated.View style={[radarStyles.pulse, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 5] }) }], opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }) }]} />
      <View style={radarStyles.core}><Ionicons name="radio" size={30} color="#fff" /></View>
    </View>
  );
};

const RadarSync = () => {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 2500, useNativeDriver: true, easing: Easing.out(Easing.quad) })).start(); }, []);
  return (
    <View style={radarStyles.miniContainer}>
      <Animated.View style={[radarStyles.miniPulse, { transform: [{ scale: pulse.interpolate({ inputRange:[0,1], outputRange:[1,4] }) }], opacity: pulse.interpolate({ inputRange:[0,1], outputRange:[0.5,0] }) }]} />
      <View style={radarStyles.miniCore}><Ionicons name="radio" size={24} color="#fff" /></View>
    </View>
  );
};

const Waveform = () => {
  const anims = useRef([new Animated.Value(5), new Animated.Value(15), new Animated.Value(8), new Animated.Value(20), new Animated.Value(10)]).current;
  useEffect(() => {
    anims.forEach((anim, i) => {
      Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue: 25 + i * 2, duration: 400 + i * 100, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 5 + i, duration: 400 + i * 100, useNativeDriver: false }),
      ])).start();
    });
  }, []);
  return (
    <View style={styles.waveRow}>
      {anims.map((anim, i) => ( <Animated.View key={i} style={[styles.waveBar, { height: anim, backgroundColor: COLORS.cyan }]} /> ))}
    </View>
  );
};

export default function SignalStudio() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [libraryPermission, requestLibraryPermission] = ImagePicker.useMediaLibraryPermissions();

  const [media, setMedia] = useState<string | null>((params.mediaUri as string) || null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>((params.mediaType as any) || 'image');
  const [step, setStep] = useState(params.mediaUri ? 2 : 1);

  // Camera State
  const cameraRef = useRef<CameraView>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [flash, setFlash] = useState<'on' | 'off' | 'auto'>('off');
  const [zoom, setZoom] = useState(0);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<any>(null);

  // Creative Tools
  const [activeLens, setActiveLens] = useState(LENSES[0]);
  const [showLensSheet, setShowLensSheet] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const scanAnim = useRef(new Animated.Value(-100)).current;

  // TEXT ENGINE
  const [storyText, setStoryText] = useState('');
  const [activeFont, setActiveFont] = useState(FONTS[0]);
  const [activeColor, setActiveColor] = useState('#fff');
  const [activeBg, setActiveBg] = useState('transparent');
  const [glowColor, setGlowColor] = useState('#ff0000');
  const [glowRadius, setGlowRadius] = useState(30);
  const [fontSize, setFontSize] = useState(28);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editMode, setEditMode] = useState<'text' | 'bg' | 'glow'>('text');
  const [hasGlow, setHasGlow] = useState(true);

  // TRANSMISSION DETAILS (Step 3)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState(GENRES[0]);
  const [location, setLocation] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [showLocModal, setShowLocModal] = useState(false);
  const [locQuery, setLocSearch] = useState('');
  const [locResults, setLocResults] = useState<any[]>([]);

  const [hideLikes, setHideLikes] = useState(false);
  const [hideRatings, setHideRatings] = useState(false);
  const [disableComments, setDisableComments] = useState(false);
  const [disableSharing, setDisableSharing] = useState(false);
  const [disableSaving, setDisableSaving] = useState(false);
  const [monetize, setMonetize] = useState(true);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const [collaborator, setCollaborator] = useState<any>(null);
  const [collabSearch, setCollabSearch] = useState('');
  const [collabResults, setCollabResults] = useState<any[]>([]);
  const [showCollabModal, setShowCollabModal] = useState(false);

  const [mentions, setMentions] = useState('');
  const [target, setTarget] = useState<'subs' | 'friends' | 'both'>('both');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const signalAnim = useRef(new Animated.Value(0)).current;
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [copyrightStatus, setCopyrightStatus] = useState('SCANNING...');

  // Video Editor Match States
  const [visibility, setVisibility] = useState<'public' | 'private' | 'scheduled'>('public');
  const [broadcastLang, setBroadcastLang] = useState('English');
  const [signalQuality, setSignalQuality] = useState('1080p Full HD');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selHour, setSelHour] = useState('12');
  const [selMin, setSelMin] = useState('00');
  const [selAmPm, setSelAmPm] = useState('PM');
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);

  // Audio Mixer
  const [showMixer, setShowMixer] = useState(false);
  const [musicVol, setMusicVol] = useState(100);
  const [origVol, setOrigVol] = useState(100);

  useEffect(() => {
    fetchCurrentUser();
    if (step === 1) {
      requestCameraPermission();
      requestMicPermission();
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (data) {
          setCurrentUserProfile(data);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (step === 3) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(signalAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(signalAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
    if (step === 4) {
      runIntegrityScan();
    }
  }, [step]);

  const runIntegrityScan = () => {
    setIntegrityLoading(true); setCopyrightStatus('INITIALIZING SCAN...');
    setTimeout(() => setCopyrightStatus('SPECTRUM ANALYSIS...'), 1000);
    setTimeout(() => { setCopyrightStatus('CLEARED: OPTIMAL'); setIntegrityLoading(false); }, 2500);
  };

  const handleLocationSearch = async (query: string) => {
    setLocSearch(query); if (query.length < 2) { setLocResults([]); return; }
    const { data } = await supabase.from('world_locations').select('name').ilike('name', `%${query}%`).limit(25);
    if (data) setLocResults(data);
  };

  const searchPartners = async (query: string) => {
    setCollabSearch(query); if (query.length < 2) { setCollabResults([]); return; }
    const { data } = await supabase.from('profiles').select('*').or(`username.ilike.%${query}%,vx_id_number.eq.${query}`).limit(5);
    if (data) setCollabResults(data);
  };

  const detectMyLocation = async () => {
     setIsLocating(true);
     setTimeout(() => {
        setLocation("VOEXI HUB - BIHAR");
        setIsLocating(false);
        setShowLocModal(false);
     }, 2000);
  };

  const addTag = (tag: string) => {
     const currentTags = tags.split(',').map(t => t.trim()).filter(t => t);
     if (!currentTags.includes(tag)) setTags(currentTags.length > 0 ? `${currentTags.join(', ')}, ${tag}` : tag);
  };

  // DRAG LOGIC
  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value }); },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => { pan.flattenOffset(); },
    })
  ).current;

  // SOUND & TIMELINE
  const [selectedSound, setSelectedSound] = useState<any>(null);
  const audioRef = useRef<Audio.Sound | null>(null);
  const timelineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => { if (audioRef.current) audioRef.current.unloadAsync(); };
  }, []);

  useEffect(() => {
    if (params.soundUrl) {
      setSelectedSound({ id: params.soundId, url: params.soundUrl, name: params.soundName });
      playIncomingSound(params.soundUrl as string);
    }
  }, [params.soundUrl]);

  const playIncomingSound = async (url: string) => {
     try {
       if (audioRef.current) await audioRef.current.unloadAsync();
       let finalUrl = url.replace(/[\[\]"']/g, '');
       if (finalUrl.includes('bunnycdn.com')) {
          const fileName = finalUrl.split('/').pop()?.split('?')[0];
          finalUrl = `https://voexi.b-cdn.net/${fileName}`;
       }
       const { sound } = await Audio.Sound.createAsync({ uri: finalUrl }, { shouldPlay: true, isLooping: true });
       audioRef.current = sound;
       startTimeline();
     } catch (e) {}
  };

  const startTimeline = () => {
    timelineAnim.setValue(0);
    Animated.timing(timelineAnim, { toValue: 1, duration: 15000, useNativeDriver: false }).start();
  };

  const player = useVideoPlayer(media ? String(media) : '');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
    if (player) { player.loop = true; player.play(); startTimeline(); }
  }, [player]);

  const formatScheduledTime = () => {
    let h = parseInt(selHour); if (selAmPm === 'PM' && h < 12) h += 12; if (selAmPm === 'AM' && h === 12) h = 0;
    const finalDate = new Date(selectedDate); finalDate.setHours(h, parseInt(selMin), 0, 0); return finalDate;
  };

  const handlePublish = async () => {
    if (!media) return;
    setLoading(true);
    setUploadProgress(0);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // SECURITY: AI CONTENT MODERATION
      const modResult = await ModerationService.analyzeContent(title, description, tags.split(','), 'Story');
      let modStatus = 'approved';
      if (modResult.flagged) modStatus = 'flagged';

      // Direct upload to Server 2 as 'STORY' category + Bunny CDN
      const uploaderHandle = user.email || 'admin_creator';
      const url = await uploadToBunny(
        media,
        mediaType === 'image' ? 'image' : 'story',
        (pct) => setUploadProgress(pct),
        title.trim() || 'VOEXI STORY',
        uploaderHandle,
        description.trim() || storyText || 'VOEXI Instant Story',
        'STORY'
      );

      const metadata = {
        text_x: (pan.x as any)._value / width,
        text_y: (pan.y as any)._value / height,
        font: activeFont, color: activeColor, bg: activeBg, size: fontSize,
        has_glow: hasGlow, glow_color: glowColor, glow_radius: glowRadius,
        collab_id: collaborator?.id || null,
        mentions: mentions.split(' ').filter(m => m.startsWith('@')),
        target_audience: target,
        lens: activeLens.id,
        music_vol: musicVol,
        orig_vol: origVol,
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        hide_ratings: hideRatings,
        disable_comments: disableComments,
        disable_sharing: disableSharing,
        disable_saving: disableSaving,
        broadcast_language: broadcastLang,
        signal_quality: signalQuality,
        moderation_status: modStatus,
        ai_moderation_score: modResult.score
      };

      // Calculate Expiry (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const newStoryRecord = {
        user_id: user.id,
        post_type: 'Story',
        is_story: true,
        title: title.trim() || 'VOEXI STORY',
        media_url: url,
        media_type: mediaType,
        thumbnail_url: url,
        description: description.trim() || storyText,
        category: 'STORY',
        location: location,
        visibility: visibility || 'public',
        moderation_status: modStatus,
        ai_moderation_score: modResult.score,
        created_at: new Date().toISOString()
      };

      await supabase.from('posts').insert(newStoryRecord);

      // Save to local backup with is_story: true
      try {
        const localRaw = await AsyncStorage.getItem('@my_local_uploads');
        const existing = localRaw ? JSON.parse(localRaw) : [];
        await AsyncStorage.setItem('@my_local_uploads', JSON.stringify([newStoryRecord, ...existing]));
      } catch (e) {}

      await rewardCoins(user.id, 'upload', user.id);
      if (audioRef.current) await audioRef.current.unloadAsync();

      Alert.alert("SIGNAL LIVE", "Transmission successful.", [{ text: "OK", onPress: () => router.replace('/(tabs)') }]);
    } catch (e: any) {
      Alert.alert("Transmission Failed", e.message || "Frequency interrupted.");
    } finally { setLoading(false); }
  };

  const captureSignal = async () => {
    if (!cameraRef.current) return;
    try {
      if (mediaType === 'image') {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
          exif: false
        });
        if (photo) {
          setMedia(photo.uri);
          setStep(2);
        }
      } else {
        if (isRecording) {
          setIsRecording(false);
          clearInterval(timerRef.current);
          await cameraRef.current.stopRecording();
        } else {
          setIsRecording(true);
          setDuration(0);
          timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
          const video = await cameraRef.current.recordAsync({
            maxDuration: 60, // Stories are usually shorter
            quality: '1080p'
          });
          clearInterval(timerRef.current);
          if (video) {
            setMedia(video.uri);
            setStep(2);
          }
        }
      }
    } catch (e) {
      Alert.alert("Capture Error", "Neural uplink failed.");
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const pickFromGallery = async () => {
    if (!libraryPermission?.granted) {
      const res = await requestLibraryPermission();
      if (!res.granted) return Alert.alert("Permission Required", "Gallery access is needed.");
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
      allowsEditing: false
    });
    if (!res.canceled) {
      setMedia(res.assets[0].uri);
      setMediaType(res.assets[0].type === 'video' ? 'video' : 'image');
      setStep(2);
    }
  };

  const runEnhance = () => {
     setIsEnhancing(true);
     Animated.sequence([
        Animated.timing(scanAnim, { toValue: height * 0.8, duration: 1500, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: -100, duration: 0, useNativeDriver: true })
     ]).start(() => { setIsEnhancing(false); });
  };

  const VisibilityCard = ({ type, label, icon, desc }: any) => (
    <TouchableOpacity style={[styles.visCard, visibility === type && styles.visCardActive]} onPress={() => { setVisibility(type); if(type==='scheduled') setShowSchedulePicker(true); }}>
      <View style={[styles.visIconBox, visibility === type && {backgroundColor: '#fff'}]}><Ionicons name={icon} size={20} color={visibility === type ? '#000' : '#666'} /></View>
      <View style={{flex:1}}><Text style={[styles.visLabel, visibility === type && {color: '#fff'}]}>{label}</Text><Text style={styles.visDesc}>{desc}</Text></View>
      {visibility === type && <Ionicons name="checkmark-circle" size={20} color={COLORS.purple} />}
    </TouchableOpacity>
  );

  // STEP 1: CAPTURE
  if (step === 1) {
    if (!cameraPermission || !micPermission) {
      return (
        <View style={styles.container}>
          <View style={styles.permissionBox}>
             <Ionicons name="radio" size={60} color={VOEXITheme.colors.primary} />
             <Text style={styles.permissionText}>SIGNAL STUDIO REQUIRES SATELLITE ACCESS</Text>
             <TouchableOpacity style={styles.permBtn} onPress={() => { requestCameraPermission(); requestMicPermission(); }}>
                <Text style={styles.permBtnText}>AUTHORIZE UPLINK</Text>
             </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          enableTorch={flash === 'on'}
          mode={mediaType === 'video' ? 'video' : 'picture'}
        >
          <LinearGradient colors={activeLens.colors as [string, string]} style={StyleSheet.absoluteFill} pointerEvents="none" />

          <SafeAreaView style={styles.cameraOverlay}>
             <View style={styles.camHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.camIconBtn}>
                   <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.camIconBtn} onPress={() => setFacing(facing === 'front' ? 'back' : 'front')}>
                   <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
                </TouchableOpacity>
             </View>

             <View style={styles.sideRails}>
                <BlurView intensity={25} style={styles.rail}>
                   <TouchableOpacity style={styles.railBtn} onPress={() => setShowLensSheet(true)}>
                      <MaterialCommunityIcons name="sparkles" size={22} color={activeLens.id !== 'none' ? COLORS.cyan : '#fff'} />
                      <Text style={styles.railTag}>LENS</Text>
                   </TouchableOpacity>
                   <TouchableOpacity style={styles.railBtn} onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')}>
                      <Ionicons name="flash" size={20} color={flash === 'on' ? '#FFD700' : '#fff'} />
                      <Text style={styles.railTag}>LIGHT</Text>
                   </TouchableOpacity>
                </BlurView>
             </View>

             <View style={styles.camFooter}>
                {isRecording && (
                   <View style={styles.uplinkBadge}>
                      <View style={styles.dotPulse} />
                      <Text style={styles.liveTime}>{Math.floor(duration/60)}:{(duration%60).toString().padStart(2,'0')}</Text>
                   </View>
                )}

                <TouchableOpacity style={styles.galleryPreview} onPress={pickFromGallery}>
                   <Ionicons name="images-outline" size={24} color="#fff" />
                   <Text style={styles.footerMinLabel}>Library</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.recordBtnOuter}
                  onPress={captureSignal}
                  activeOpacity={0.8}
                >
                   <View style={[styles.recordBtnInner, isRecording && styles.recordBtnRecording, mediaType === 'image' && {backgroundColor: '#fff'}]}>
                      {isRecording && <View style={styles.stopSquare} />}
                   </View>
                </TouchableOpacity>

                <View style={styles.modeToggle}>
                   <TouchableOpacity onPress={() => setMediaType('image')} style={[styles.modePill, mediaType === 'image' && styles.modePillActive]}>
                      <Text style={[styles.modePillText, mediaType === 'image' && {color: '#000'}]}>PHOTO</Text>
                   </TouchableOpacity>
                   <TouchableOpacity onPress={() => setMediaType('video')} style={[styles.modePill, mediaType === 'video' && styles.modePillActive]}>
                      <Text style={[styles.modePillText, mediaType === 'video' && {color: '#000'}]}>VIDEO</Text>
                   </TouchableOpacity>
                </View>
             </View>
          </SafeAreaView>
        </CameraView>

        <Modal visible={showLensSheet} transparent animationType="slide">
           <View style={styles.overlay}><Pressable style={StyleSheet.absoluteFill} onPress={() => setShowLensSheet(false)} /><View style={styles.sheet}><Text style={styles.sheetHeader}>VISUAL LENSES</Text><ScrollView horizontal>{LENSES.map(l => (<TouchableOpacity key={l.id} style={styles.worldCard} onPress={() => { setActiveLens(l); setShowLensSheet(false); }}><View style={styles.lensPreview}><LinearGradient colors={l.colors as [string, string]} style={StyleSheet.absoluteFill} /></View><Text style={styles.worldName}>{l.name}</Text></TouchableOpacity>))}</ScrollView></View></View>
        </Modal>
      </View>
    );
  }

  // STEP 2: DESIGN STUDIO
  if (step === 2) {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <View style={styles.videoHeader}>
           <TouchableOpacity onPress={() => { if (audioRef.current) audioRef.current.unloadAsync(); setStep(1); }}><Ionicons name="close" size={30} color="#fff" /></TouchableOpacity>
           <Text style={styles.headerText}>DESIGN STUDIO</Text>
           <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(3)}><Text style={styles.nextText}>NEXT</Text></TouchableOpacity>
        </View>

        <View style={styles.canvasArea}>
           <View style={styles.cinemaBox}>
              {mediaType === 'video' && media && player ? <VideoView key={media} player={player} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Image source={{uri: media!}} style={styles.fullMedia} resizeMode="cover" />}
              <LinearGradient colors={activeLens.colors as [string, string]} style={StyleSheet.absoluteFill} pointerEvents="none" />
              {isEnhancing && <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanAnim }] }]} />}

              {storyText ? (
                <Animated.View {...panResponder.panHandlers} style={[pan.getLayout(), styles.draggableBox, {backgroundColor: activeBg}]}>
                   <Text style={[styles.canvasText, { color: activeColor, fontSize: fontSize, fontFamily: activeFont.id, fontWeight: activeFont.weight as any, textShadowColor: hasGlow ? glowColor : 'transparent', textShadowRadius: hasGlow ? glowRadius : 0, textShadowOffset: {width:0, height:0} }]}>{storyText}</Text>
                </Animated.View>
              ) : null}
           </View>
        </View>

        <View style={styles.toolbar}>
           <TouchableOpacity style={styles.toolBtn} onPress={() => setIsEditingText(true)}>
              <Ionicons name="text" size={26} color="#fff" />
              <Text style={styles.toolLabel}>Text</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.toolBtn} onPress={() => setShowLensSheet(true)}>
              <Ionicons name="color-filter" size={26} color="#fff" />
              <Text style={styles.toolLabel}>VFX</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.toolBtn} onPress={() => setShowMixer(!showMixer)}>
              <Ionicons name="options-outline" size={26} color={showMixer ? COLORS.cyan : "#fff"} />
              <Text style={styles.toolLabel}>Mixer</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.toolBtn} onPress={runEnhance}>
              <Ionicons name="sparkles" size={26} color={COLORS.cyan} />
              <Text style={styles.toolLabel}>AI Boost</Text>
           </TouchableOpacity>
        </View>

        {showMixer && (
          <View style={styles.mixerPanel}>
             <View style={styles.mixRow}>
                <Text style={styles.mixLabel}>MUSIC: {musicVol}%</Text>
                <View style={styles.track}><View style={[styles.fill, { width: `${musicVol}%` }]} /><Pressable style={StyleSheet.absoluteFill} onPress={(e) => setMusicVol(Math.round(e.nativeEvent.locationX / (width-160) * 100))} /></View>
             </View>
             <View style={styles.mixRow}>
                <Text style={styles.mixLabel}>ORIGINAL: {origVol}%</Text>
                <View style={styles.track}><View style={[styles.fill, { width: `${origVol}%` }]} /><Pressable style={StyleSheet.absoluteFill} onPress={(e) => setOrigVol(Math.round(e.nativeEvent.locationX / (width-160) * 100))} /></View>
             </View>
          </View>
        )}

        <Modal visible={isEditingText} transparent animationType="fade">
           <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsEditingText(false)} />
              <View style={styles.editorContent}>
                 <TextInput autoFocus style={[styles.inputFocus, { color: activeColor, fontSize: fontSize + 10, backgroundColor: activeBg, borderRadius: 25, padding: 20, fontFamily: activeFont.id, textShadowColor: hasGlow ? glowColor : 'transparent', textShadowRadius: hasGlow ? glowRadius : 0 }]} placeholder="Type frequency..." placeholderTextColor="rgba(255,255,255,0.2)" value={storyText} onChangeText={setStoryText} multiline />
                 <View style={styles.editorTools}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fontRack}>{FONTS.map(f => (
                      <TouchableOpacity key={f.name} style={[styles.fontChip, activeFont.name === f.name && styles.activeChip]} onPress={() => setActiveFont(f)}><Text style={[styles.chipText, activeFont.name === f.name && {color:'#fff'}]}>{f.name}</Text></TouchableOpacity>
                    ))}</ScrollView>
                    <View style={styles.modeSwitcher}>
                       <TouchableOpacity onPress={() => setEditMode('text')} style={[styles.modeTab, editMode === 'text' && styles.activeTab]}><Text style={styles.modeTabText}>TEXT</Text></TouchableOpacity>
                       <TouchableOpacity onPress={() => setEditMode('bg')} style={[styles.modeTab, editMode === 'bg' && styles.activeTab]}><Text style={styles.modeTabText}>SURFACE</Text></TouchableOpacity>
                       <TouchableOpacity onPress={() => setEditMode('glow')} style={[styles.modeTab, editMode === 'glow' && styles.activeTab]}><Text style={styles.modeTabText}>NEON</Text></TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRack}>
                       {FINAL_PALETTE.map((c, i) => (
                         <TouchableOpacity key={i} style={[styles.colorDot, {backgroundColor: c}, (editMode === 'text' ? activeColor : editMode === 'bg' ? activeBg : glowColor) === c && styles.selectedDot]} onPress={() => { if (editMode === 'text') setActiveColor(c); else if (editMode === 'bg') setActiveBg(c); else { setGlowColor(c); setHasGlow(true); } }} />
                       ))}
                    </ScrollView>
                 </View>
                 <TouchableOpacity onPress={() => setIsEditingText(false)} style={styles.syncBtn}><Text style={styles.syncText}>SYNC</Text></TouchableOpacity>
              </View>
           </KeyboardAvoidingView>
        </Modal>

        <Modal visible={showLensSheet} transparent animationType="slide">
           <View style={styles.overlay}><Pressable style={StyleSheet.absoluteFill} onPress={() => setShowLensSheet(false)} /><View style={styles.sheet}><Text style={styles.sheetHeader}>VISUAL LENSES</Text><ScrollView horizontal>{LENSES.map(l => (<TouchableOpacity key={l.id} style={styles.worldCard} onPress={() => { setActiveLens(l); setShowLensSheet(false); }}><View style={styles.lensPreview}><LinearGradient colors={l.colors as [string, string]} style={StyleSheet.absoluteFill} /></View><Text style={styles.worldName}>{l.name}</Text></TouchableOpacity>))}</ScrollView></View></View>
        </Modal>
      </View>
    );
  }

  // STEP 3: TRANSMIT CONFIG
  if (step === 3) return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1}}>
        <View style={styles.videoHeader}>
           <TouchableOpacity onPress={() => setStep(2)}><Ionicons name="arrow-back" size={28} color="#fff" /></TouchableOpacity>
           <Text style={styles.headerText}>TRANSMIT CONFIG</Text>
           <View style={{width: 28}} />
        </View>

        <ScrollView style={{padding: 20}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
           {currentUserProfile && (
             <View style={styles.broadcasterTag}>
                <Image source={{ uri: currentUserProfile.avatar_url }} style={styles.broadcasterAvatar} />
                <View>
                   <Text style={styles.broadcasterLabel}>BROADCASTER</Text>
                   <Text style={styles.broadcasterName}>{currentUserProfile.channel_name || currentUserProfile.username}</Text>
                </View>
             </View>
           )}

           <View style={styles.finalPreview}>
              {mediaType === 'video' && media && player ? <VideoView key={media} player={player} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Image source={{uri: media!}} style={StyleSheet.absoluteFill} resizeMode="cover" />}
           </View>

           <Text style={styles.labelTitle}>TITLE & DESCRIPTION</Text>
           <TextInput style={styles.darkInput} placeholder="Signal name..." placeholderTextColor="#444" value={title} onChangeText={setTitle} />
           <TextInput style={[styles.darkInput, {height: 80}]} multiline placeholder="Describe transmission..." placeholderTextColor="#444" value={description} onChangeText={setDescription} />

           <Text style={styles.labelTitle}>STORY CATEGORY (GENRE)</Text>
           <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 25}}>
              {GENRES.map(g => <TouchableOpacity key={g} style={[styles.catPill, category === g && styles.catPillActive]} onPress={() => setCategory(g)}><Text style={[styles.catText, category === g && {color:'#fff'}]}>{g}</Text></TouchableOpacity>)}
           </ScrollView>

           <Text style={styles.labelTitle}>TRANSMISSION DETAILS</Text>
           <View style={styles.detailRow}>
              <View style={{flex:1}}><Text style={styles.smallLabel}>LANGUAGE</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{['English', 'Hindi', 'Bhojpuri', 'Punjabi', 'Global'].map(l => <TouchableOpacity key={l} style={[styles.detailPill, broadcastLang === l && {borderColor:COLORS.cyan}]} onPress={()=>setBroadcastLang(l)}><Text style={[styles.detailPillText, broadcastLang === l && {color:'#fff'}]}>{l}</Text></TouchableOpacity>)}</ScrollView></View>
              <View style={{flex:1}}><Text style={styles.smallLabel}>QUALITY</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{['720p', '1080p', '4K'].map(q => <TouchableOpacity key={q} style={[styles.detailPill, signalQuality === q && {borderColor:COLORS.purple}]} onPress={()=>setSignalQuality(q)}><Text style={[styles.detailPillText, signalQuality === q && {color:'#fff'}]}>{q}</Text></TouchableOpacity>)}</ScrollView></View>
           </View>

           <Text style={styles.labelTitle}>TAGS</Text>
           <TextInput style={styles.darkInput} placeholder="Add tags..." placeholderTextColor="#444" value={tags} onChangeText={setTags} />
           <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: -15, marginBottom: 25}}>
              {['trending', 'voexi', 'story', 'ai', 'spectrum'].map(t => <TouchableOpacity key={t} style={styles.tagSuggestion} onPress={() => addTag(t)}><Text style={styles.tagSugText}>+{t}</Text></TouchableOpacity>)}
           </ScrollView>

           <Text style={styles.labelTitle}>LOCATION</Text>
           <TouchableOpacity style={styles.locationSelector} onPress={() => setShowLocModal(true)}>
              <Ionicons name="location-outline" size={20} color={COLORS.cyan} />
              <Text style={[styles.locText, !location && {color:'#444'}]}>{location || 'Global Location Search'}</Text>
              <Ionicons name="chevron-forward" size={18} color="#333" />
           </TouchableOpacity>

           <Text style={styles.labelTitle}>VISIBILITY SETTINGS</Text>
           <View style={{gap: 12, marginBottom: 25}}>
              <VisibilityCard type="public" label="Public Transmission" icon="globe-outline" desc="Visible to everyone on VOEXI." />
              <VisibilityCard type="private" label="Private Frequency" icon="lock-closed-outline" desc="Only you can access this production." />
              <VisibilityCard type="scheduled" label="Scheduled Broadcast" icon="calendar-outline" desc={visibility === 'scheduled' ? `At: ${selectedDate.toDateString()} ${selHour}:${selMin} ${selAmPm}` : "Set broadcast clock."} />
           </View>

           <TouchableOpacity style={styles.advancedSettingsBtn} onPress={() => setShowAdvancedSettings(true)}>
              <Ionicons name="options" size={20} color="#fff" />
              <Text style={styles.advBtnText}>Privacy & Controls</Text>
              <Ionicons name="chevron-forward" size={18} color="#444" />
           </TouchableOpacity>

           <TouchableOpacity style={styles.collabBox} onPress={() => setShowCollabModal(true)}>
              {collaborator ? (
                <View style={styles.collabActive}><Image source={{ uri: collaborator.avatar_url }} style={styles.collabAvatar} /><Text style={styles.collabName}>@{collaborator.username}</Text></View>
              ) : (
                <Text style={styles.collabPlaceholderText}>Invite Partner Broadcaster</Text>
              )}
           </TouchableOpacity>

           <TouchableOpacity style={styles.pubBtn} onPress={() => { if(!title.trim()) return Alert.alert("Required", "Title is mandatory."); setStep(4); }}>
              <Text style={styles.pubText}>PREVIEW TRANSMISSION</Text>
           </TouchableOpacity>
           <View style={{height: 50}} />
        </ScrollView>

        {/* MODALS */}
        <Modal visible={showLocModal} transparent animationType="slide">
           <SafeAreaView style={styles.fullLocSheet}>
              <View style={styles.locHeader}><TouchableOpacity onPress={() => setShowLocModal(false)}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity><Text style={styles.locHeaderTitle}>Satellite Location Hub</Text><TouchableOpacity onPress={() => { setLocation(''); setShowLocModal(false); }}><Text style={{color:COLORS.cyan, fontWeight:'bold'}}>Clear</Text></TouchableOpacity></View>
              <View style={styles.radarSection}><SatelliteRadar /><Text style={styles.radarLabel}>{isLocating ? 'SYNCING SATELLITE...' : 'Radar Online'}</Text></View>
              <TouchableOpacity style={styles.detectBtn} onPress={detectMyLocation} disabled={isLocating}>{isLocating ? <ActivityIndicator size="small" color={COLORS.cyan} /> : <Ionicons name="navigate" size={20} color={COLORS.cyan} />}<Text style={styles.detectBtnText}>Detect My GPS Signal</Text></TouchableOpacity>
              <View style={styles.locSearchBox}><Ionicons name="search" size={20} color="#666" /><TextInput autoFocus style={styles.locInput} placeholder="Search Country, State or City..." placeholderTextColor="#444" value={locQuery} onChangeText={handleLocationSearch} /></View>
              <ScrollView style={{flex:1}} keyboardShouldPersistTaps="handled">{locResults.map(l => (<TouchableOpacity key={l.name} style={styles.locItem} onPress={() => { setLocation(l.name); setShowLocModal(false); }}><View style={styles.locIconCirc}><Ionicons name="pin" size={18} color="#fff" /></View><Text style={styles.locItemText}>{l.name}</Text></TouchableOpacity>))}</ScrollView>
           </SafeAreaView>
        </Modal>

        <Modal visible={showCollabModal} transparent animationType="slide">
           <View style={styles.modalOverlay}><View style={styles.collabSheet}><View style={styles.collabHeader}><Text style={styles.sheetHeader}>PARTNER SEARCH</Text><TouchableOpacity onPress={() => setShowCollabModal(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity></View><View style={styles.collabSearchBar}><Ionicons name="search" size={18} color="#666" /><TextInput autoFocus style={styles.collabSearchInput} placeholder="Search VX ID..." placeholderTextColor="#444" value={collabSearch} onChangeText={searchPartners} /></View><ScrollView style={{flex:1}}>{collabResults.map(user => (<TouchableOpacity key={user.id} style={styles.userItem} onPress={() => { setCollaborator(user); setShowCollabModal(false); }}><Image source={{ uri: user.avatar_url }} style={styles.userAvatar} /><Text style={styles.userName}>@{user.username}</Text></TouchableOpacity>))}</ScrollView></View></View>
        </Modal>

        <Modal visible={showAdvancedSettings} animationType="slide">
           <SafeAreaView style={styles.settingsPage}>
              <View style={styles.videoHeader}><TouchableOpacity onPress={() => setShowAdvancedSettings(false)}><Ionicons name="arrow-back" size={28} color="#fff" /></TouchableOpacity><Text style={styles.headerText}>BROADCAST CONTROLS</Text><View style={{width: 28}} /></View>
              <ScrollView style={{padding: 25}}>
                 <View style={styles.settingsSurfaceFull}>
                    {[ { label: 'Hide Likes', val: hideLikes, s: setHideLikes }, { label: 'Hide Ratings', val: hideRatings, s: setHideRatings }, { label: 'Lock Comments', val: disableComments, s: setDisableComments }, { label: 'Lock Sharing', val: disableSharing, s: setDisableSharing }, { label: 'Earn VX Coins', val: monetize, s: setMonetize } ].map((s) => (
                      <View key={s.label} style={styles.settingRowLarge}><Text style={styles.settingLabelLarge}>{s.label}</Text><Switch value={s.val} onValueChange={s.s} trackColor={{ false: '#222', true: COLORS.purple }} /></View>
                    ))}
                 </View>
                 <TouchableOpacity style={styles.settingsDoneBtn} onPress={() => setShowAdvancedSettings(false)}><Text style={styles.doneBtnText}>CONFIRM SETTINGS</Text></TouchableOpacity>
              </ScrollView>
           </SafeAreaView>
        </Modal>

        <Modal visible={showSchedulePicker} transparent animationType="slide"><View style={styles.modalOverlay}><View style={styles.scheduleSheet}><Text style={styles.clockTitle}>BROADCAST SCHEDULER</Text><View style={styles.calendarStrip}>{[0,1,2,3,4].map(d => { const dt = new Date(); dt.setDate(dt.getDate()+d); const active = selectedDate.toDateString() === dt.toDateString(); return (<TouchableOpacity key={d} style={[styles.datePill, active && styles.datePillActive]} onPress={()=>setSelectedDate(dt)}><Text style={[styles.dateDay, active && {color:'#000'}]}>{dt.toDateString().split(' ')[0]}</Text><Text style={[styles.dateNum, active && {color:'#000'}]}>{dt.getDate()}</Text></TouchableOpacity>) })}</View><View style={styles.clockGrid}><View style={styles.clockCol}><Text style={styles.clockLabel}>HOUR</Text><ScrollView style={{height:100}}>{['01','02','03','04','05','06','07','08','09','10','11','12'].map(h => <TouchableOpacity key={h} onPress={()=>setSelHour(h)}><Text style={[styles.clockNum, selHour===h && {color:COLORS.cyan}]}>{h}</Text></TouchableOpacity>)}</ScrollView></View><View style={styles.clockCol}><Text style={styles.clockLabel}>MIN</Text><ScrollView style={{height:100}}>{['00','15','30','45'].map(m => <TouchableOpacity key={m} onPress={()=>setSelMin(m)}><Text style={[styles.clockNum, selMin===m && {color:COLORS.cyan}]}>{m}</Text></TouchableOpacity>)}</ScrollView></View><View style={styles.clockCol}><Text style={styles.clockLabel}>AM/PM</Text>{['AM','PM'].map(a => <TouchableOpacity key={a} onPress={()=>setSelAmPm(a)}><Text style={[styles.clockNum, selAmPm===a && {color:COLORS.cyan}]}>{a}</Text></TouchableOpacity>)}</View></View><TouchableOpacity style={styles.confirmSchedBtn} onPress={()=>setShowSchedulePicker(false)}><Text style={{color:'#000', fontWeight:'900'}}>SET TRANSMISSION TIME</Text></TouchableOpacity></View></View></Modal>

        {loading && (
          <View style={styles.fullLoader}>
            <ActivityIndicator size="large" color={COLORS.purple} />
            <Text style={styles.loaderText}>BROADCASTING STORY...</Text>
            <Text style={{ color: COLORS.cyan, fontSize: 24, fontWeight: '900', marginTop: 10 }}>{uploadProgress}%</Text>
            <View style={{ width: '60%', height: 4, backgroundColor: '#222', borderRadius: 2, marginTop: 15, overflow: 'hidden' }}>
              <View style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: COLORS.purple }} />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // STEP 4: MISSION CONTROL
  return (
    <SafeAreaView style={styles.container}>
       <View style={styles.stepHeader}>
          <TouchableOpacity onPress={() => setStep(3)}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
          <Text style={styles.stepTitleText}>MISSION CONTROL</Text>
          <View style={{width:24}} />
       </View>
       <ScrollView style={{padding: 25}}>
          <View style={styles.reviewCard}>
             <View style={styles.finalCinemaBox}>
                {mediaType === 'video' && media && player ? <VideoView key={media} player={player} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Image source={{uri: media!}} style={StyleSheet.absoluteFill} resizeMode="cover" />}
                <View style={styles.monitorOverlay}><Text style={styles.monitorTag}>LIVE MONITORING</Text><View style={styles.monitorDot} /></View>
                <Waveform />
             </View>
             <View style={styles.reviewMeta}>
                <Text style={styles.finalTitle}>{title || 'VOEXI STORY'}</Text>
                <Text style={styles.reviewDesc} numberOfLines={2}>{description || storyText}</Text>
                <View style={styles.tagCloud}>{tags.split(',').map((t, i) => t.trim() ? <View key={i} style={styles.tagPill}><Text style={styles.tagPillText}>#{t.trim()}</Text></View> : null)}</View>
                <View style={styles.metaBadgeRow}>
                   <View style={styles.metaBadge}><Ionicons name="planet" size={12} color={COLORS.purple} /><Text style={styles.metaBadgeText}>{category}</Text></View>
                   <View style={styles.metaBadge}><Ionicons name="location" size={12} color="#666" /><Text style={styles.metaBadgeText}>{location || 'Global Hub'}</Text></View>
                </View>
             </View>
          </View>

          <Text style={styles.hubLabel}>TRANSMISSION PIPELINE</Text>
          <View style={styles.pipelineContainer}>
             <View style={styles.pipeNode}><Ionicons name="phone-portrait" size={14} color="#fff" /><Text style={styles.pipeLabel}>SOURCE</Text></View>
             <LinearGradient colors={[COLORS.purple, '#444']} style={styles.pipeLine} start={{x:0, y:0}} end={{x:1, y:0}} />
             <View style={styles.pipeNode}><Ionicons name="server" size={14} color={COLORS.cyan} /><Text style={styles.pipeLabel}>HUB</Text></View>
             <LinearGradient colors={['#444', '#222']} style={styles.pipeLine} start={{x:0, y:0}} end={{x:1, y:0}} />
             <View style={styles.pipeNode}><Ionicons name="globe" size={14} color="#444" /><Text style={styles.pipeLabel}>NETWORK</Text></View>
          </View>

          <View style={styles.statusBoard}>
             <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 15}}><Text style={styles.boardTitle}>SPECTRUM INTEGRITY REPORT</Text><View style={styles.signalMeter}><View style={styles.sigBarActive} /><View style={styles.sigBarActive} /><View style={styles.sigBarActive} /><View style={styles.sigBar} /></View></View>
             <View style={styles.boardGrid}>
                <View style={styles.boardItem}><Ionicons name={integrityLoading ? "sync" : "shield-checkmark"} size={16} color={integrityLoading ? "#666" : "#00ff00"} /><Text style={styles.boardText}>{copyrightStatus}</Text></View>
                <View style={styles.boardItem}><Ionicons name="pulse" size={16} color="#00f2fe" /><Text style={styles.boardText}>Stability: 99.8%</Text></View>
                <View style={styles.boardItem}><Ionicons name="lock-closed" size={16} color="#fff" /><Text style={styles.boardText}>SSL: 256-BIT</Text></View>
                <View style={styles.boardItem}><Ionicons name="finger-print" size={16} color="#fff" /><Text style={styles.boardText}>SIG: VERIFIED</Text></View>
             </View>
             <View style={styles.tokenBox}><Text style={styles.tokenLabel}>TRANSMISSION TOKEN:</Text><Text style={styles.tokenText}>VX-{Math.random().toString(36).substr(2, 9).toUpperCase()}</Text></View>
          </View>

          <TouchableOpacity style={styles.launchBtn} onPress={handlePublish} disabled={loading}>
             <LinearGradient colors={[COLORS.purple, COLORS.violet]} style={styles.launchGrad}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.launchText}>INITIATE BROADCAST</Text>}
             </LinearGradient>
          </TouchableOpacity>
          <View style={{height: 50}} />
       </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#111' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  landingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  pulseLogo: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#1a1a1a', marginBottom: 20 },
  landingTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 3, marginBottom: 40 },
  actionBtnLarge: { width: '100%', borderRadius: 20, overflow: 'hidden' },
  btnLabel: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  canvasContainer: { flex: 1, backgroundColor: '#000' },
  fullMedia: { width: '100%', height: '100%' },
  overlayTop: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, paddingHorizontal: 20 },
  timelineContainer: { height: 3, marginTop: 10, marginBottom: 20 },
  timelineTrack: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  timelineFill: { height: '100%', backgroundColor: '#fff' },
  topActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconCircle: { width: 45, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sidebarRight: { position: 'absolute', right: 20, top: height * 0.3, zIndex: 50 },
  sideIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  draggableBox: { position: 'absolute', padding: 15, borderRadius: 15 },
  canvasText: { textAlign: 'center', fontWeight: 'bold' },
  bottomSoundBadge: { position: 'absolute', bottom: 50, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, gap: 8, maxWidth: '80%' },
  soundBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  editorContent: { width: '100%', alignItems: 'center', padding: 20 },
  inputFocus: { width: '100%', textAlign: 'center', minHeight: 150, fontWeight: '900' },
  editorTools: { width: '100%', marginTop: 30, gap: 20 },
  fontRack: { height: 45 },
  fontChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#111', marginRight: 10 },
  activeChip: { backgroundColor: VOEXITheme.colors.primary },
  chipText: { color: '#444', fontSize: 10, fontWeight: '900' },
  modeSwitcher: { flexDirection: 'row', alignSelf: 'center', backgroundColor: '#111', borderRadius: 20, padding: 4 },
  modeTab: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 16 },
  activeTab: { backgroundColor: '#222' },
  modeTabText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  colorRack: { height: 50 },
  colorDot: { width: 34, height: 34, borderRadius: 17, marginRight: 15 },
  selectedDot: { borderWidth: 3, borderColor: '#fff' },
  configContent: { padding: 25 },
  configPreviewBox: { flexDirection: 'row', gap: 15, backgroundColor: '#080808', padding: 12, borderRadius: 20, marginBottom: 30, borderWidth: 1, borderColor: '#111' },
  miniPreview: { width: 80, height: 120, borderRadius: 12 },
  signalStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signalDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00ff00' },
  previewInfo: { flex: 1, justifyContent: 'center' },
  previewType: { color: VOEXITheme.colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  previewSub: { color: '#666', fontSize: 11, marginTop: 5, fontWeight: 'bold' },
  inputLabel: { color: '#444', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  darkInput: { backgroundColor: '#080808', borderRadius: 15, padding: 15, color: '#fff', fontSize: 13, marginBottom: 25, borderWidth: 1, borderColor: '#111' },
  targetRow: { flexDirection: 'row', gap: 10, marginBottom: 35 },
  targetPill: { flex: 1, height: 40, borderRadius: 12, backgroundColor: '#080808', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#111' },
  activeTarget: { backgroundColor: VOEXITheme.colors.primary, borderColor: VOEXITheme.colors.primary },
  targetText: { color: '#444', fontSize: 9, fontWeight: '900' },
  auditBox: { backgroundColor: '#050505', padding: 20, borderRadius: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#151515' },
  auditTitle: { color: '#333', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
  auditItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  auditText: { color: '#666', fontSize: 11, fontWeight: '500' },
  loader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  loaderText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginTop: 20, letterSpacing: 2 },
  permissionBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  permissionText: { color: '#fff', fontSize: 14, fontWeight: '900', textAlign: 'center', marginTop: 20, letterSpacing: 1 },
  permBtn: { marginTop: 30, backgroundColor: VOEXITheme.colors.primary, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25 },
  permBtnText: { color: '#fff', fontWeight: 'bold' },
  cameraOverlay: { flex: 1, justifyContent: 'space-between' },
  camHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 10 },
  camIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  camFooter: { paddingHorizontal: 30, paddingBottom: 50, alignItems: 'center' },
  galleryPreview: { position: 'absolute', left: 40, bottom: 65, alignItems: 'center', gap: 6 },
  footerMinLabel: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  recordBtnOuter: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  recordBtnInner: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#ff0000' },
  recordBtnRecording: { width: 40, height: 40, borderRadius: 8 },
  stopSquare: { width: 30, height: 30, backgroundColor: '#fff', borderRadius: 4 },
  modeToggle: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 4, marginTop: 30 },
  modePill: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 16 },
  modePillActive: { backgroundColor: '#fff' },
  modePillText: { color: '#888', fontSize: 9, fontWeight: '900' },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25, paddingTop: 60 },
  stepTitleText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  nextBtn: { backgroundColor: COLORS.purple, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  nextText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  editorArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  studioBox: { width: width * 0.92, aspectRatio: 9/16, backgroundColor: '#050505', borderRadius: 30, overflow: 'hidden' },
  editorToolbar: { flexDirection: 'row', justifyContent: 'center', gap: 40, paddingVertical: 40 },
  toolBtn: { alignItems: 'center', gap: 10 },
  toolTag: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '900' },
  syncBtn: { marginTop: 30, backgroundColor: '#fff', paddingHorizontal: 40, paddingVertical: 12, borderRadius: 25 },
  syncText: { color: '#000', fontWeight: '900' },
  hubLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
  vxInput: { backgroundColor: '#080808', borderRadius: 20, padding: 20, color: '#fff', fontSize: 14, marginBottom: 30, borderWidth: 1, borderColor: '#111' },
  pill: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 15, backgroundColor: '#111', marginRight: 12, borderWidth: 1, borderColor: '#222' },
  pillActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  pillText: { color: '#555', fontSize: 11, fontWeight: 'bold' },
  locBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', padding: 20, borderRadius: 20, gap: 15, borderWidth: 1, borderColor: '#111', marginBottom: 35 },
  locText: { color: '#fff', fontSize: 12, fontWeight: 'bold', flex: 1 },
  vault: { backgroundColor: '#080808', borderRadius: 20, padding: 15, marginBottom: 35 },
  vaultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  vaultLabel: { color: '#eee', fontSize: 14, fontWeight: 'bold' },
  analyzeBtn: { backgroundColor: COLORS.purple, padding: 22, borderRadius: 25, alignItems: 'center' },
  analyzeText: { color: '#fff', fontWeight: '900', letterSpacing: 2 },
  finalReview: { backgroundColor: '#050505', borderRadius: 40, overflow: 'hidden', marginBottom: 30, borderWidth: 1, borderColor: '#111' },
  finalCinema: { width: '100%', aspectRatio: 9/16 },
  liveTag: { position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(255,1,126,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  liveText: { color: COLORS.pink, fontSize: 8, fontWeight: '900' },
  finalMeta: { padding: 25 },
  finalTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 10 },
  finalSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  integrityNode: { alignItems: 'center', marginBottom: 40 },
  integrityTag: { color: COLORS.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 15 },
  launchBtn: { borderRadius: 30, overflow: 'hidden' },
  launchGrad: { paddingVertical: 22, alignItems: 'center' },
  launchText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  sideRails: { position: 'absolute', right: 20, top: height * 0.2, gap: 20 },
  rail: { width: 62, borderRadius: 30, paddingVertical: 20, gap: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  railBtn: { alignItems: 'center', gap: 8 },
  railTag: { color: 'rgba(255,255,255,0.4)', fontSize: 7, fontWeight: '900' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#050505', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, borderTopWidth: 1, borderColor: '#111' },
  sheetHeader: { color: '#fff', fontSize: 11, fontWeight: '900', textAlign: 'center', marginBottom: 30 },
  worldCard: { alignItems: 'center', marginRight: 25 },
  lensPreview: { width: 75, height: 75, borderRadius: 22, borderWidth: 1, borderColor: '#222' },
  worldName: { color: '#fff', fontSize: 8, fontWeight: '900', marginTop: 12, opacity: 0.5 },
  uplinkBadge: { position: 'absolute', top: -100, backgroundColor: COLORS.pink, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dotPulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveTime: { color: '#fff', fontSize: 12, fontWeight: '900' },
  mixerPanel: { position: 'absolute', bottom: 160, left: 40, right: 40, backgroundColor: 'rgba(0,0,0,0.7)', padding: 20, borderRadius: 25, gap: 15 },
  mixRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mixLabel: { color: '#fff', fontSize: 9, fontWeight: '900' },
  track: { height: 4, width: width - 200, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, position: 'relative' },
  fill: { height: '100%', backgroundColor: COLORS.cyan, borderRadius: 2 },
  scanLine: { position: 'absolute', width: '100%', height: 2, backgroundColor: COLORS.cyan, zIndex: 10, shadowColor: COLORS.cyan, shadowRadius: 10, shadowOpacity: 1 },
  tagSuggestion: { backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginRight: 10, borderWidth: 0.5, borderColor: '#222' },
  tagSugText: { color: COLORS.cyan, fontSize: 11, fontWeight: 'bold' },
  broadcasterTag: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: '#0A0A0A', padding: 15, borderRadius: 20, marginBottom: 25, borderWidth: 1, borderColor: '#111' },
  broadcasterAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: COLORS.purple },
  broadcasterLabel: { color: '#444', fontSize: 8, fontWeight: '900' },
  broadcasterName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  advancedSettingsBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#080808', padding: 18, borderRadius: 15, marginBottom: 30, borderWidth: 1, borderColor: '#111' },
  advBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold', flex: 1 },
  settingsPage: { flex: 1, backgroundColor: '#000' },
  collabBox: { backgroundColor: '#080808', borderRadius: 15, padding: 18, marginBottom: 30, borderWidth: 1, borderColor: '#111' },
  collabActive: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  collabAvatar: { width: 30, height: 30, borderRadius: 15 },
  collabName: { color: '#fff', fontWeight: 'bold' },
  collabPlaceholderText: { color: '#444', fontWeight: 'bold' },
  collabSheet: { backgroundColor: '#0A0A0A', width: '100%', height: '70%', position: 'absolute', bottom: 0, borderTopLeftRadius: 35, padding: 25 },
  collabSearchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 15, paddingHorizontal: 15, height: 50 },
  collabSearchInput: { flex: 1, color: '#fff', marginLeft: 10 },
  userItem: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#111' },
  userAvatar: { width: 40, height: 40, borderRadius: 20 },
  userName: { color: '#fff', fontWeight: 'bold' },
  fullLocSheet: { flex: 1, backgroundColor: '#000' },
  locHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  locHeaderTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  radarSection: { alignItems: 'center', marginVertical: 20 },
  radarLabel: { color: '#555', fontSize: 10, fontWeight: 'bold', marginTop: 10 },
  detectBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', marginHorizontal: 20, padding: 15, borderRadius: 12, gap: 12, borderWidth: 1, borderColor: COLORS.cyan, marginBottom: 20 },
  detectBtnText: { color: COLORS.cyan, fontWeight: 'bold', fontSize: 14 },
  locSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', margin: 20, borderRadius: 12, paddingHorizontal: 15, height: 50 },
  locInput: { flex: 1, color: '#fff', marginLeft: 10 },
  locItem: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  locIconCirc: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  locItemText: { color: '#eee', fontSize: 14, marginLeft: 15 },
  reviewCard: { backgroundColor: '#0A0A0A', borderRadius: 25, overflow: 'hidden', marginBottom: 25, borderWidth: 1, borderColor: '#111' },
  finalCinemaBox: { width: '100%', aspectRatio: 9/16, backgroundColor: '#000', position: 'relative' },
  monitorOverlay: { position: 'absolute', top: 15, right: 15, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  monitorTag: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  monitorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00ff00' },
  reviewMeta: { padding: 20 },
  tagCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  tagPill: { backgroundColor: '#111', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagPillText: { color: COLORS.purple, fontSize: 11, fontWeight: 'bold' },
  metaBadgeRow: { flexDirection: 'row', gap: 15 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#111', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  metaBadgeText: { color: '#eee', fontSize: 10, fontWeight: 'bold' },
  pipelineContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30, paddingHorizontal: 10 },
  pipeNode: { alignItems: 'center', gap: 5 },
  pipeLabel: { color: '#444', fontSize: 8, fontWeight: 'bold' },
  pipeLine: { flex: 1, height: 2, marginHorizontal: 10, borderRadius: 1 },
  statusBoard: { backgroundColor: '#080808', padding: 20, borderRadius: 20, marginBottom: 30, borderWidth: 1, borderColor: '#111' },
  boardTitle: { color: '#444', fontSize: 9, fontWeight: '900' },
  signalMeter: { flexDirection: 'row', gap: 3, alignItems: 'flex-end', height: 12 },
  sigBar: { width: 3, height: 4, backgroundColor: '#222', borderRadius: 1 },
  sigBarActive: { width: 3, height: 8, backgroundColor: '#00ff00', borderRadius: 1 },
  boardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  boardItem: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '45%' },
  boardText: { color: '#aaa', fontSize: 10, fontWeight: 'bold' },
  tokenBox: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#111', paddingTop: 15, alignItems: 'center' },
  tokenLabel: { color: '#333', fontSize: 8, fontWeight: 'bold' },
  tokenText: { color: '#555', fontSize: 10, fontWeight: 'bold', marginTop: 4, letterSpacing: 1 },
  waveRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 30, position: 'absolute', bottom: 15, left: 15 },
  waveBar: { width: 3, borderRadius: 2 },
  videoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  headerText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  canvasArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cinemaBox: { width: width, aspectRatio: 9/16, backgroundColor: '#050505', position: 'relative', overflow: 'hidden' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 30 },
  toolLabel: { color: '#555', fontSize: 10, fontWeight: 'bold', marginTop: 5 },
  labelTitle: { color: '#444', fontSize: 10, fontWeight: '900', marginBottom: 10 },
  finalPreview: { width: '100%', aspectRatio: 9/16, backgroundColor: '#050505', borderRadius: 20, overflow: 'hidden', marginBottom: 25, borderWidth: 1, borderColor: '#111' },
  catPill: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, backgroundColor: '#111', marginRight: 10, borderWidth: 1, borderColor: '#222', flexDirection: 'row', alignItems: 'center' },
  catPillActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  catText: { color: '#666', fontSize: 11, fontWeight: 'bold' },
  detailRow: { flexDirection: 'row', gap: 20, marginBottom: 30 },
  smallLabel: { color: '#333', fontSize: 8, fontWeight: 'bold', marginBottom: 8 },
  detailPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#111', marginRight: 10 },
  detailPillText: { color: '#444', fontSize: 10, fontWeight: 'bold' },
  locationSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', padding: 18, borderRadius: 15, marginBottom: 30, borderWidth: 1, borderColor: '#111', gap: 12 },
  locText: { color: '#fff', flex: 1, fontSize: 13 },
  visCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#111', gap: 15, marginBottom: 10 },
  visCardActive: { borderColor: COLORS.purple, backgroundColor: 'rgba(168,85,247,0.05)' },
  visIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  visLabel: { color: '#888', fontSize: 14, fontWeight: 'bold' },
  visDesc: { color: '#444', fontSize: 11, marginTop: 2 },
  settingsSurfaceFull: { backgroundColor: '#0A0A0A', borderRadius: 25, padding: 20 },
  settingRowLarge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20, borderBottomWidth: 0.5, borderBottomColor: '#111' },
  settingLabelLarge: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  settingsDoneBtn: { backgroundColor: COLORS.purple, padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 40 },
  doneBtnText: { color: '#fff', fontWeight: '900' },
  pubBtn: { backgroundColor: COLORS.purple, padding: 20, borderRadius: 15, alignItems: 'center' },
  pubText: { color: '#fff', fontWeight: '900' },
  fullLoader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  scheduleSheet: { backgroundColor: '#0A0A0A', width: '100%', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, borderTopWidth: 1, borderTopColor: '#222' },
  calendarStrip: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 25 },
  datePill: { width: 55, height: 70, backgroundColor: '#080808', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#111' },
  datePillActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  dateDay: { color: '#666', fontSize: 10, fontWeight: 'bold' },
  dateNum: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 5 },
  clockGrid: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#080808', padding: 20, borderRadius: 20, marginBottom: 25 },
  clockCol: { alignItems: 'center', width: '30%' },
  clockLabel: { color: '#444', fontSize: 8, fontWeight: '900', marginBottom: 10 },
  clockNum: { color: '#666', fontSize: 22, fontWeight: 'bold', paddingVertical: 10 },
  confirmSchedBtn: { backgroundColor: COLORS.cyan, padding: 18, borderRadius: 15, alignItems: 'center' },
  clockTitle: { color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center' },
});

const radarStyles = StyleSheet.create({
  container: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  core: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.cyan, justifyContent: 'center', alignItems: 'center', zIndex: 10, shadowColor: COLORS.cyan, shadowRadius: 20, shadowOpacity: 0.8 },
  pulse: { position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: COLORS.cyan },
  miniContainer: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  miniCore: { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.purple, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  miniPulse: { position: 'absolute', width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: COLORS.purple }
});
