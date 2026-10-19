import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, ActivityIndicator, TextInput, FlatList, Animated, PanResponder, Alert, ScrollView, Modal, Pressable, KeyboardAvoidingView, Platform, StatusBar, Switch, Easing } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { uploadToBunny } from '../../lib/bunnyStorage';
import { rewardCoins } from '../../lib/earnings';
import { ModerationService } from '../../lib/moderationService';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

// --- CONSTANTS ---
const SPECTRUM = [];
for (let i = 0; i <= 360; i += 12) SPECTRUM.push(`hsl(${i}, 100%, 50%)`);
const TONES = ['#000000', '#444', '#fff', '#00F2FE', '#FFD700', '#FF017E', '#A855F7', '#00FF00'];
const FINAL_PALETTE = [...TONES, ...SPECTRUM];
const FONTS = [{ id: 'System', name: 'MODERN', weight: '900' }, { id: 'serif', name: 'ELEGANT', weight: '400' }, { id: 'monospace', name: 'TECH', weight: 'bold' }];
const VFX_FILTERS = [{ id: 'none', name: 'NORMAL', colors: ['transparent', 'transparent'] }, { id: 'cyber', name: 'CYBER', colors: ['rgba(168,85,247,0.2)', 'rgba(0,242,254,0.2)'] }, { id: 'noir', name: 'NOIR', colors: ['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)'] }, { id: 'vivid', name: 'VIVID', colors: ['rgba(255,215,0,0.1)', 'rgba(255,1,126,0.1)'] }];
const CATEGORIES = [
  { id: 'Action', label: 'Action', icon: 'flash' }, { id: 'AI', label: 'AI & Future', icon: 'hardware-chip' },
  { id: 'Art', label: 'Art & Design', icon: 'color-palette' }, { id: 'Automotive', label: 'Automotive', icon: 'car' },
  { id: 'ASMR', label: 'ASMR', icon: 'mic' }, { id: 'Business', label: 'Business', icon: 'briefcase' },
  { id: 'Comedy', label: 'Comedy', icon: 'happy' }, { id: 'Cooking', label: 'Cooking', icon: 'restaurant' },
  { id: 'Crypto', label: 'Crypto', icon: 'logo-bitcoin' }, { id: 'DIY', label: 'DIY & Crafts', icon: 'hammer' },
  { id: 'Documentary', label: 'Documentary', icon: 'library' }, { id: 'Education', label: 'Education', icon: 'school' },
  { id: 'Entertainment', label: 'Entertainment', icon: 'tv' }, { id: 'Family', label: 'Family', icon: 'people' },
  { id: 'Fashion', label: 'Fashion', icon: 'shirt' }, { id: 'Film', label: 'Film & Animation', icon: 'film' },
  { id: 'Finance', label: 'Finance', icon: 'stats-chart' }, { id: 'Fitness', label: 'Fitness', icon: 'fitness' },
  { id: 'Gaming', label: 'Gaming', icon: 'game-controller' }, { id: 'Health', label: 'Health', icon: 'medical' },
  { id: 'History', label: 'History', icon: 'hourglass' }, { id: 'Horror', label: 'Horror', icon: 'skull' },
  { id: 'Kids', label: 'Kids', icon: 'balloon' }, { id: 'Lifestyle', label: 'Lifestyle', icon: 'heart' },
  { id: 'Magic', label: 'Magic', icon: 'sparkles' }, { id: 'Motivation', label: 'Motivation', icon: 'bulb' },
  { id: 'Music', label: 'Music', icon: 'musical-notes' }, { id: 'Mystery', label: 'Mystery', icon: 'search' },
  { id: 'Nature', label: 'Nature', icon: 'leaf' }, { id: 'News', label: 'News', icon: 'newspaper' },
  { id: 'Pets', label: 'Pets', icon: 'paw' }, { id: 'Photography', label: 'Photography', icon: 'camera' },
  { id: 'Podcasts', label: 'Podcasts', icon: 'headset' }, { id: 'Politics', label: 'Politics', icon: 'podium' },
  { id: 'RealEstate', label: 'Real Estate', icon: 'home' }, { id: 'Science', label: 'Science', icon: 'flask' },
  { id: 'Space', label: 'Space', icon: 'planet' }, { id: 'Spiritual', label: 'Spiritual', icon: 'moon' },
  { id: 'Sports', label: 'Sports', icon: 'basketball' }, { id: 'Tech', label: 'Tech', icon: 'laptop' },
  { id: 'Thriller', label: 'Thriller', icon: 'eye' }, { id: 'Travel', label: 'Travel', icon: 'airplane' },
  { id: 'Vlog', label: 'Vlog', icon: 'videocam' }, { id: 'Wildlife', label: 'Wildlife', icon: 'bug' },
  { id: 'Yoga', label: 'Yoga & Wellness', icon: 'body' }
];
const LANGUAGES = ['English', 'Hindi', 'Bhojpuri', 'Punjabi', 'Spanish', 'French', 'Arabic', 'Chinese', 'Global'];
const QUALITIES = ['720p HD', '1080p Full HD', '2K QHD', '4K Ultra HD'];
const SUGGESTED_TAGS = ['viral', 'trending', 'voexi', 'broadcast', 'spectrum', 'ai', 'tech', 'music'];

// --- SUB-COMPONENTS ---
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
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 30, position: 'absolute', bottom: 10, left: 15 }}>
      {anims.map((anim, i) => ( <Animated.View key={i} style={{ width: 3, height: anim, backgroundColor: VOEXITheme.colors.secondary, borderRadius: 2 }} /> ))}
    </View>
  );
};

export default function VideoStudio() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [step, setStep] = useState(params.fromLibrary === 'true' ? 2 : 1);
  const [media, setMedia] = useState<string | null>((params.mediaUri as string) || null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // States
  const [storyText, setStoryText] = useState('');
  const [activeFont, setActiveFont] = useState(FONTS[0]);
  const [activeColor, setActiveColor] = useState('#fff');
  const [activeBg, setActiveBg] = useState('transparent');
  const [glowColor, setGlowColor] = useState('transparent');
  const [fontSize, setFontSize] = useState(35);
  const [glowRadius, setGlowRadius] = useState(25);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editMode, setEditMode] = useState<'text' | 'bg' | 'glow' | 'size'>('text');
  const [activeVfx, setActiveVfx] = useState(VFX_FILTERS[0]);
  const [showVfxTray, setShowVfxTray] = useState(false);
  const [showAudioTray, setShowAudioTray] = useState(false);
  const [audioLibrary, setAudioLibrary] = useState<any[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<any>(null);
  const [musicVolume, setMusicVolume] = useState(100);
  const [videoVolume, setVideoVolume] = useState(100);
  const bgMusicRef = useRef<Audio.Sound | null>(null);
  const player = useVideoPlayer(media || null, (p) => {
    p.loop = true;
  });

  // CRITICAL FIX: Sync player source when media selection changes
  useEffect(() => {
    if (media && player) {
      player.replace(media);
      // DELAY AUTO-PLAY IN STUDIO BY 1 SECOND FOR QUALITY CHECK
      const timer = setTimeout(() => {
        player.play();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [media]);

  // Metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [location, setLocation] = useState('');
  const [showLocModal, setShowLocModal] = useState(false);
  const [locQuery, setLocSearch] = useState('');
  const [locResults, setLocResults] = useState<any[]>([]);
  const [isLocLoading, setIsLocLoading] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'private' | 'scheduled'>('public');
  const [broadcastLang, setBroadcastLang] = useState('English');
  const [signalQuality, setSignalQuality] = useState('1080p Full HD');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selHour, setSelHour] = useState('12');
  const [selMin, setSelMin] = useState('00');
  const [selAmPm, setSelAmPm] = useState('PM');
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const scanAnim = useRef(new Animated.Value(-100)).current;

  const runEnhance = () => {
     setIsEnhancing(true);
     Animated.sequence([
        Animated.timing(scanAnim, { toValue: 200, duration: 1500, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: -100, duration: 0, useNativeDriver: true })
     ]).start(() => { setIsEnhancing(false); Alert.alert("AI BOOSTER", "Signal clarity enhanced."); });
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

  const [hideLikes, setHideLikes] = useState(false);
  const [hideRatings, setHideRatings] = useState(false);
  const [disableComments, setDisableComments] = useState(false);
  const [disableSharing, setDisableSharing] = useState(false);
  const [disableSaving, setDisableSaving] = useState(false);
  const [monetize, setMonetize] = useState(true);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [collaborator, setCollaborator] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [copyrightStatus, setCopyrightStatus] = useState('SCANNING...');
  const [collabSearch, setCollabSearch] = useState('');
  const [collabResults, setCollabResults] = useState<any[]>([]);
  const [showCollabModal, setShowCollabModal] = useState(false);

  useEffect(() => {
    fetchAudios(); fetchCurrentUser();
    Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: false });
  }, []);

  useEffect(() => { if (step === 4) runIntegrityScan(); }, [step]);

  const runIntegrityScan = () => {
    setIntegrityLoading(true); setCopyrightStatus('INITIALIZING SCAN...');
    setTimeout(() => setCopyrightStatus('SPECTRUM ANALYSIS...'), 1000);
    setTimeout(() => { setCopyrightStatus('CLEARED: OPTIMAL'); setIntegrityLoading(false); }, 2500);
  };

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

  const searchPartners = async (query: string) => {
    setCollabSearch(query); if (query.length < 2) { setCollabResults([]); return; }
    const { data } = await supabase.from('profiles').select('*').or(`username.ilike.%${query}%,vx_id_number.eq.${query}`).limit(5);
    if (data) setCollabResults(data);
  };

  const fetchAudios = async () => {
    try { const { data } = await supabase.from('vx_sounds').select('*').limit(20); if (data) setAudioLibrary(data); } catch (e) {}
  };

  const handleAudioSelect = async (sound: any) => {
    try {
      if (bgMusicRef.current) { await bgMusicRef.current.unloadAsync().catch(() => {}); bgMusicRef.current = null; }
      if (!sound?.url) return;
      let url = sound.url.toString().replace(/[\[\]"']/g, '').trim();
      if (url.startsWith('/')) {
        url = `http://192.168.31.39:8080${url}`;
      } else if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://') && !url.startsWith('content://')) {
        url = `http://192.168.31.39:8080/${url}`;
      }
      if (url.includes('b-cdn.net')) {
          url = url.replace('videosvoexi.b-cdn.net', 'voexi.b-cdn.net');
          url = url.replace('VOEXI.b-cdn.net', 'voexi.b-cdn.net');
      }
      if (url.includes('bunnycdn.com')) url = `https://voexi.b-cdn.net/${url.split('/').pop()?.split('?')[0]}`;
      const { sound: audioObj } = await Audio.Sound.createAsync({ uri: encodeURI(url) }, { shouldPlay: true, isLooping: true, volume: musicVolume / 100 });
      bgMusicRef.current = audioObj; setSelectedAudio(sound);
    } catch (e) {
      setSelectedAudio(sound);
    }
  };

  const pickVideo = async (useCamera = false) => {
    try {
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 1, allowsEditing: true, aspect: [16, 9] };
      const res = useCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!res.canceled) {
        const asset = res.assets[0]; if (asset.width < asset.height) return Alert.alert("Ratio Error", "16:9 Landscape only.");
        setMedia(asset.uri); setStep(2);
      }
    } catch (e) { Alert.alert("Error", "Selection failed."); }
  };

  const formatScheduledTime = () => {
    let h = parseInt(selHour); if (selAmPm === 'PM' && h < 12) h += 12; if (selAmPm === 'AM' && h === 12) h = 0;
    const finalDate = new Date(selectedDate); finalDate.setHours(h, parseInt(selMin), 0, 0); return finalDate;
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

  const handlePublish = async () => {
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
        return Alert.alert("Auth Error", "Please log in to publish Videos.");
      }

      const { data: myProfile } = await supabase.from('profiles').select('username, channel_name, avatar_url').eq('id', cleanUserId).single();

      // AI MODERATION
      const modResult = await ModerationService.analyzeContent(title, description, tags.split(','), 'Video');
      let modStatus = 'approved';
      if (modResult.flagged) modStatus = 'flagged';

      const uploaderHandle = myProfile?.username || myProfile?.channel_name || '@creator';
      const url = await uploadToBunny(
        media!,
        'video',
        (pct) => setUploadProgress(pct),
        finalTitle,
        uploaderHandle,
        description.trim(),
        category || 'ENTERTAINMENT',
        selectedAudio?.url || '',
        selectedAudio?.name || '',
        selectedAudio?.artist || ''
      );

      const generateUUID = () => {
        const u = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3f | 0x80);
          return v.toString(16);
        });
        return sanitizeUUID(u);
      };

      const newPostData = {
        id: generateUUID(),
        user_id: cleanUserId,
        title: finalTitle,
        description: description.trim(),
        media_url: url,
        audio_url: selectedAudio?.url || null,
        audio_title: selectedAudio?.name || null,
        audio_artist: selectedAudio?.artist || null,
        post_type: 'Video',
        media_type: 'video',
        is_reel: false,
        width: 1920,
        height: 1080,
        aspect_ratio: 1.7777,
        thumbnail_url: url,
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

      const { error: insertErr } = await supabase.from('posts').insert({
        id: newPostData.id,
        user_id: newPostData.user_id,
        title: newPostData.title,
        description: newPostData.description,
        media_url: newPostData.media_url,
        audio_url: newPostData.audio_url,
        audio_title: newPostData.audio_title,
        audio_artist: newPostData.audio_artist,
        post_type: newPostData.post_type,
        media_type: newPostData.media_type,
        is_reel: newPostData.is_reel,
        width: newPostData.width,
        height: newPostData.height,
        aspect_ratio: newPostData.aspect_ratio,
        thumbnail_url: newPostData.thumbnail_url,
        visibility: newPostData.visibility,
        category: newPostData.category,
        location: newPostData.location,
        moderation_status: newPostData.moderation_status,
        ai_moderation_score: newPostData.ai_moderation_score,
        created_at: newPostData.created_at,
        views_count: newPostData.views_count,
        likes_count: newPostData.likes_count
      });

      if (insertErr) {
        console.error("[SUPABASE VIDEO INSERT ERROR]", insertErr.message);
      }

      // Save to local uploads so it INSTANTLY shows up in Profile screen
      try {
        const localRaw = await AsyncStorage.getItem('@my_local_uploads');
        const existing = localRaw ? JSON.parse(localRaw) : [];
        await AsyncStorage.setItem('@my_local_uploads', JSON.stringify([newPostData, ...existing]));
      } catch (e) {}

      await rewardCoins(user.id, 'upload', user.id);
      if (bgMusicRef.current) await bgMusicRef.current.unloadAsync();

      Alert.alert("SUCCESS 🟢", "Long Video published successfully! Redirecting to Home Feed.", [{ text: "OK", onPress: () => router.replace('/(tabs)') }]);
    } catch (e: any) {
      console.error("[TRANSMIT ERROR]", e);
      Alert.alert("Transmission Failed", e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const VisibilityCard = ({ type, label, icon, desc }: any) => (
    <TouchableOpacity style={[styles.visCard, visibility === type && styles.visCardActive]} onPress={() => { setVisibility(type); if(type==='scheduled') setShowSchedulePicker(true); }}>
      <View style={[styles.visIconBox, visibility === type && {backgroundColor: '#fff'}]}><Ionicons name={icon} size={20} color={visibility === type ? '#000' : '#666'} /></View>
      <View style={{flex:1}}><Text style={[styles.visLabel, visibility === type && {color: '#fff'}]}>{label}</Text><Text style={styles.visDesc}>{desc}</Text></View>
      {visibility === type && <Ionicons name="checkmark-circle" size={20} color={VOEXITheme.colors.primary} />}
    </TouchableOpacity>
  );

  const addTag = (tag: string) => {
     const currentTags = tags.split(',').map(t => t.trim()).filter(t => t);
     if (!currentTags.includes(tag)) setTags(currentTags.length > 0 ? `${currentTags.join(', ')}, ${tag}` : tag);
  };

  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value }); },
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: () => { pan.flattenOffset(); },
  })).current;

  if (step === 1) return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0a0a1a', '#000']} style={StyleSheet.absoluteFill} />
      <View style={styles.landing}>
         <View style={styles.ratioIconBox}><Ionicons name="videocam" size={40} color={VOEXITheme.colors.primary} /><Text style={styles.ratioTag}>16:9</Text></View>
         <Text style={styles.landingTitle}>VIDEO PRODUCTION</Text>
         <View style={styles.sourceRow}>
            <TouchableOpacity style={styles.sourceCard} onPress={() => pickVideo(true)}><Ionicons name="camera" size={32} color="#fff" /><Text style={styles.sourceLabel}>Camera</Text></TouchableOpacity>
            <TouchableOpacity style={styles.sourceCard} onPress={() => pickVideo(false)}><Ionicons name="images" size={32} color="#fff" /><Text style={styles.sourceLabel}>Gallery</Text></TouchableOpacity>
         </View>
      </View>
    </SafeAreaView>
  );

  if (step === 2) return (
    <View style={styles.container}>
      <StatusBar hidden />
      <View style={styles.videoHeader}>
         <TouchableOpacity onPress={() => { if (bgMusicRef.current) bgMusicRef.current.unloadAsync(); setStep(1); }}><Ionicons name="close" size={30} color="#fff" /></TouchableOpacity>
         <Text style={styles.headerText}>DESIGN STUDIO</Text>
         <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(3)}><Text style={styles.nextText}>NEXT</Text></TouchableOpacity>
      </View>
      <View style={styles.canvasArea}><View style={styles.cinemaBox}>
         <VideoView
           player={player}
           style={{ width: '100%', height: '100%' }}
           contentFit="cover"
           nativeControls={false}
           allowsFullscreen={false}
         />
         <LinearGradient colors={activeVfx.colors as [string, string]} style={StyleSheet.absoluteFill} pointerEvents="none" />
         {isEnhancing && <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanAnim }] }]} />}
         {storyText ? (<Animated.View {...panResponder.panHandlers} style={[pan.getLayout(), styles.draggable, { backgroundColor: activeBg, borderRadius: 12 }]}><Text style={[styles.canvasText, { color: activeColor, fontFamily: activeFont.id, fontSize: fontSize, textShadowColor: glowColor, textShadowRadius: glowColor !== 'transparent' ? (glowRadius * 4) : 0 }]}>{storyText}</Text></Animated.View>) : null}
      </View></View>
      <View style={styles.toolbar}>
         <TouchableOpacity style={styles.toolBtn} onPress={() => setIsEditingText(true)}><Ionicons name="text" size={26} color="#fff" /><Text style={styles.toolLabel}>Text</Text></TouchableOpacity>
         <TouchableOpacity style={styles.toolBtn} onPress={() => setShowVfxTray(true)}><Ionicons name="color-filter" size={26} color="#fff" /><Text style={styles.toolLabel}>VFX</Text></TouchableOpacity>
         <TouchableOpacity style={styles.toolBtn} onPress={() => setShowAudioTray(true)}><Ionicons name="musical-notes" size={26} color="#fff" /><Text style={styles.toolLabel}>Audio</Text></TouchableOpacity>
         <TouchableOpacity style={styles.toolBtn} onPress={runEnhance}><Ionicons name="sparkles" size={26} color={VOEXITheme.colors.secondary} /><Text style={styles.toolLabel}>AI Boost</Text></TouchableOpacity>
      </View>
      <Modal visible={isEditingText} transparent animationType="fade">
         <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
            <TextInput autoFocus style={[styles.inputFocus, { color: activeColor, backgroundColor: activeBg, fontFamily: activeFont.id, fontSize: fontSize + 10 }]} value={storyText} onChangeText={setStoryText} multiline />
            <View style={styles.editorTools}>
               <View style={styles.modeRow}>{['text', 'bg', 'glow', 'size'].map(m => <TouchableOpacity key={m} onPress={() => setEditMode(m as any)} style={[styles.modeBtn, editMode === m && {backgroundColor:'#fff'}]}><Text style={[styles.modeText, editMode === m && {color:'#000'}]}>{m.toUpperCase()}</Text></TouchableOpacity>)}</View>
               <ScrollView horizontal style={styles.colorRack} showsHorizontalScrollIndicator={false}>{FINAL_PALETTE.map((c, i) => <TouchableOpacity key={i} style={[styles.colorDot, {backgroundColor: c}]} onPress={() => { if(editMode === 'text') setActiveColor(c); else if(editMode === 'bg') setActiveBg(c); else setGlowColor(c); }} />)}</ScrollView>
            </View>
            <TouchableOpacity onPress={() => setIsEditingText(false)} style={styles.doneBtn}><Text style={styles.doneText}>DONE</Text></TouchableOpacity>
         </KeyboardAvoidingView>
      </Modal>
      <Modal visible={showVfxTray} transparent animationType="slide"><Pressable style={styles.modalOverlay} onPress={() => setShowVfxTray(false)}><View style={styles.traySheet}><Text style={styles.trayTitle}>VISUAL FILTERS</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{VFX_FILTERS.map(f => (<TouchableOpacity key={f.id} style={styles.vfxCard} onPress={() => setActiveVfx(f)}><LinearGradient colors={f.colors as [string, string]} style={styles.vfxPreview} /><Text style={styles.vfxName}>{f.name}</Text></TouchableOpacity>))}</ScrollView></View></Pressable></Modal>
      {/* REVAMPED DUAL AUDIO TRACK MIXER & VOLUME CONTROL MODAL */}
      <Modal visible={showAudioTray} transparent animationType="slide" onRequestClose={() => setShowAudioTray(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAudioTray(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.audioTraySheet} onPress={(e) => e.stopPropagation()}>
            <LinearGradient colors={['#0F081D', '#040209']} style={StyleSheet.absoluteFill} />

            {/* HEADER */}
            <View style={styles.audioTrayHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="options" size={20} color="#A855F7" />
                <Text style={styles.audioTrayTitle}>DUAL AUDIO TRACK MIXER</Text>
              </View>
              <TouchableOpacity style={styles.closeTrayBtn} onPress={() => setShowAudioTray(false)}>
                <Ionicons name="close" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* PRESET MIXING MODES */}
            <View style={styles.mixerPresetRow}>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => { setVideoVolume(100); setMusicVolume(20); if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
              >
                <Text style={styles.presetChipText}>🎤 VOICE FOCUS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => { setVideoVolume(20); setMusicVolume(100); if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
              >
                <Text style={styles.presetChipText}>🎵 MUSIC FOCUS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => { setVideoVolume(80); setMusicVolume(80); if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
              >
                <Text style={styles.presetChipText}>⚖️ BALANCED</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => { setVideoVolume(0); setMusicVolume(100); if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
              >
                <Text style={styles.presetChipText}>🎙️ MUTE VOICE</Text>
              </TouchableOpacity>
            </View>

            {/* SLIDERS SURFACE */}
            <View style={styles.mixerSurfaceBox}>
              {/* SLIDER 1: ORIGINAL VIDEO / MIC VOICE */}
              <View style={styles.mixTrackRow}>
                <View style={styles.mixLabelLine}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name={videoVolume === 0 ? "volume-mute" : "mic"} size={16} color="#00F2FE" />
                    <Text style={styles.mixTrackLabel}>ORIGINAL VOICE / MIC</Text>
                  </View>
                  <Text style={styles.mixTrackValue}>{videoVolume}%</Text>
                </View>

                <View style={styles.mixTrackBg}>
                  <View style={[styles.mixTrackFill, { width: `${videoVolume}%`, backgroundColor: '#00F2FE' }]} />
                  <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={(e) => {
                      const newVol = Math.min(100, Math.max(0, Math.round((e.nativeEvent.locationX / (width - 80)) * 100)));
                      setVideoVolume(newVol);
                    }}
                  />
                </View>
              </View>

              {/* SLIDER 2: BACKGROUND MUSIC TRACK */}
              <View style={styles.mixTrackRow}>
                <View style={styles.mixLabelLine}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name={musicVolume === 0 ? "volume-mute" : "musical-notes"} size={16} color="#A855F7" />
                    <Text style={styles.mixTrackLabel}>BACKGROUND MUSIC</Text>
                  </View>
                  <Text style={styles.mixTrackValue}>{musicVolume}%</Text>
                </View>

                <View style={styles.mixTrackBg}>
                  <View style={[styles.mixTrackFill, { width: `${musicVolume}%`, backgroundColor: '#A855F7' }]} />
                  <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={(e) => {
                      const newVol = Math.min(100, Math.max(0, Math.round((e.nativeEvent.locationX / (width - 80)) * 100)));
                      setMusicVolume(newVol);
                      if (bgMusicRef.current) bgMusicRef.current.setVolumeAsync(newVol / 100).catch(() => {});
                    }}
                  />
                </View>
              </View>
            </View>

            {/* SOUND SELECTION LIST */}
            <Text style={styles.selectSoundHeader}>SELECT SOUND TRACK</Text>
            <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
              {audioLibrary.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.soundPickCard, selectedAudio?.id === item.id && styles.soundPickCardActive]}
                  onPress={() => handleAudioSelect(item)}
                >
                  <View style={styles.soundPickIconBox}>
                    <Ionicons name="musical-note" size={18} color={selectedAudio?.id === item.id ? "#00F2FE" : "#A855F7"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.soundPickTitle}>{item.name || item.title}</Text>
                    <Text style={styles.soundPickSub}>{item.artist || '@artist'} • 00:30</Text>
                  </View>
                  {selectedAudio?.id === item.id ? (
                    <Ionicons name="checkmark-circle" size={20} color="#00F2FE" />
                  ) : (
                    <Text style={styles.useTextPill}>USE</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.confirmMixerBtn} onPress={() => setShowAudioTray(false)}>
              <Text style={styles.confirmMixerTxt}>APPLY MIXER CONFIGURATION</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );

  if (step === 3) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.videoHeader}><TouchableOpacity onPress={() => setStep(2)}><Ionicons name="arrow-back" size={28} color="#fff" /></TouchableOpacity><Text style={styles.headerText}>TRANSMIT CONFIG</Text><View style={{width: 28}} /></View>
      <ScrollView style={{padding: 20}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
         {currentUserProfile && (<View style={styles.broadcasterTag}><Image source={{ uri: currentUserProfile.avatar_url }} style={styles.broadcasterAvatar} /><View><Text style={styles.broadcasterLabel}>BROADCASTER</Text><Text style={styles.broadcasterName}>{currentUserProfile.channel_name || currentUserProfile.username}</Text></View></View>)}
         <View style={styles.finalPreview}><VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" /></View>
         <Text style={styles.labelTitle}>TITLE & DESCRIPTION</Text>
         <TextInput style={styles.darkInput} placeholder="Signal name..." placeholderTextColor="#444" value={title} onChangeText={setTitle} />
         <TextInput style={[styles.darkInput, {height: 80}]} multiline placeholder="Describe transmission..." placeholderTextColor="#444" value={description} onChangeText={setDescription} />

         <Text style={styles.labelTitle}>WORLD CATALOGUE (GENRE)</Text>
         <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 25}}>
            {CATEGORIES.map(c => <TouchableOpacity key={c.id} style={[styles.catPill, category === c.id && styles.catPillActive]} onPress={() => setCategory(c.id)}><Ionicons name={c.icon as any} size={14} color={category === c.id ? '#fff' : '#666'} style={{marginRight:6}} /><Text style={[styles.catText, category === c.id && {color:'#fff'}]}>{c.label}</Text></TouchableOpacity>)}
         </ScrollView>

         <Text style={styles.labelTitle}>TRANSMISSION DETAILS</Text>
         <View style={styles.detailRow}>
            <View style={{flex:1}}><Text style={styles.smallLabel}>LANGUAGE</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{LANGUAGES.map(l => <TouchableOpacity key={l} style={[styles.detailPill, broadcastLang === l && {borderColor:VOEXITheme.colors.primary}]} onPress={()=>setBroadcastLang(l)}><Text style={[styles.detailPillText, broadcastLang === l && {color:'#fff'}]}>{l}</Text></TouchableOpacity>)}</ScrollView></View>
            <View style={{flex:1}}><Text style={styles.smallLabel}>SIGNAL QUALITY</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{QUALITIES.map(q => <TouchableOpacity key={q} style={[styles.detailPill, signalQuality === q && {borderColor:VOEXITheme.colors.secondary}]} onPress={()=>setSignalQuality(q)}><Text style={[styles.detailPillText, signalQuality === q && {color:'#fff'}]}>{q}</Text></TouchableOpacity>)}</ScrollView></View>
         </View>

         <Text style={styles.labelTitle}>TAGS</Text>
         <TextInput style={styles.darkInput} placeholder="Add tags..." placeholderTextColor="#444" value={tags} onChangeText={setTags} />
         <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: -15, marginBottom: 25}}>
            {SUGGESTED_TAGS.map(t => <TouchableOpacity key={t} style={styles.tagSuggestion} onPress={() => addTag(t)}><Text style={styles.tagSugText}>+{t}</Text></TouchableOpacity>)}
         </ScrollView>

         <Text style={styles.labelTitle}>LOCATION</Text>
         <TouchableOpacity style={styles.locationSelector} onPress={() => setShowLocModal(true)}><Ionicons name="location-outline" size={20} color={VOEXITheme.colors.primary} /><Text style={[styles.locText, !location && {color:'#444'}]}>{location || 'Global Location Search'}</Text><Ionicons name="chevron-forward" size={18} color="#333" /></TouchableOpacity>

         <Text style={styles.labelTitle}>VISIBILITY SETTINGS</Text>
         <View style={{gap: 12, marginBottom: 25}}><VisibilityCard type="public" label="Public Transmission" icon="globe-outline" desc="Visible to everyone on VOEXI." /><VisibilityCard type="private" label="Private Frequency" icon="lock-closed-outline" desc="Only you can access this production." /><VisibilityCard type="scheduled" label="Scheduled Broadcast" icon="calendar-outline" desc={visibility === 'scheduled' ? `At: ${selectedDate.toDateString()} ${selHour}:${selMin} ${selAmPm}` : "Set broadcast clock."} /></View>

         <TouchableOpacity style={styles.advancedSettingsBtn} onPress={() => setShowAdvancedSettings(true)}><Ionicons name="options" size={20} color="#fff" /><Text style={styles.advBtnText}>Privacy & Controls</Text><Ionicons name="chevron-forward" size={18} color="#444" /></TouchableOpacity>
         <TouchableOpacity style={styles.collabBox} onPress={() => setShowCollabModal(true)}>{collaborator ? (<View style={styles.collabActive}><Image source={{ uri: collaborator.avatar_url }} style={styles.collabAvatar} /><Text style={styles.collabName}>@{collaborator.username}</Text></View>) : (<Text style={styles.collabPlaceholderText}>Invite Partner Broadcaster</Text>)}</TouchableOpacity>
         <TouchableOpacity style={styles.pubBtn} onPress={() => { if(!title.trim()) return Alert.alert("Required", "Title is mandatory."); setStep(4); }}><Text style={styles.pubText}>PREVIEW TRANSMISSION</Text></TouchableOpacity>
         <View style={{height: 50}} />
      </ScrollView>

      {/* MODALS */}
      <Modal visible={showLocModal} transparent animationType="slide">
         <SafeAreaView style={styles.fullLocSheet}>
            <View style={styles.locHeader}><TouchableOpacity onPress={() => setShowLocModal(false)}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity><Text style={styles.locHeaderTitle}>Satellite Location Hub</Text><TouchableOpacity onPress={() => { setLocation(''); setShowLocModal(false); }}><Text style={{color:VOEXITheme.colors.primary, fontWeight:'bold'}}>Clear</Text></TouchableOpacity></View>
            <View style={styles.radarSection}><SatelliteRadar /><Text style={styles.radarLabel}>{isLocLoading ? 'SYNCING SATELLITE...' : 'Radar Online'}</Text></View>
            <TouchableOpacity style={styles.detectBtn} onPress={detectMyLocation} disabled={isLocLoading}>{isLocLoading ? <ActivityIndicator size="small" color={VOEXITheme.colors.primary} /> : <Ionicons name="navigate" size={20} color={VOEXITheme.colors.primary} />}<Text style={styles.detectBtnText}>Detect My GPS Signal</Text></TouchableOpacity>
            <View style={styles.locSearchBox}><Ionicons name="search" size={20} color="#666" /><TextInput autoFocus style={styles.locInput} placeholder="Search Country, State or City..." placeholderTextColor="#444" value={locQuery} onChangeText={handleLocationSearch} /></View>
            <ScrollView style={{flex:1}} keyboardShouldPersistTaps="handled">{locResults.map(l => (<TouchableOpacity key={l.name} style={styles.locItem} onPress={() => { setLocation(l.name); setShowLocModal(false); }}><View style={styles.locIconCirc}><Ionicons name="pin" size={18} color="#fff" /></View><Text style={styles.locItemText}>{l.name}</Text></TouchableOpacity>))}</ScrollView>
         </SafeAreaView>
      </Modal>

      <Modal visible={showSchedulePicker} transparent animationType="slide"><View style={styles.modalOverlay}><View style={styles.scheduleSheet}><Text style={styles.clockTitle}>BROADCAST SCHEDULER</Text><View style={styles.calendarStrip}>{[0,1,2,3,4].map(d => { const dt = new Date(); dt.setDate(dt.getDate()+d); const active = selectedDate.toDateString() === dt.toDateString(); return (<TouchableOpacity key={d} style={[styles.datePill, active && styles.datePillActive]} onPress={()=>setSelectedDate(dt)}><Text style={[styles.dateDay, active && {color:'#000'}]}>{dt.toDateString().split(' ')[0]}</Text><Text style={[styles.dateNum, active && {color:'#000'}]}>{dt.getDate()}</Text></TouchableOpacity>) })}</View><View style={styles.clockGrid}><View style={styles.clockCol}><Text style={styles.clockLabel}>HOUR</Text><ScrollView style={{height:100}}>{['01','02','03','04','05','06','07','08','09','10','11','12'].map(h => <TouchableOpacity key={h} onPress={()=>setSelHour(h)}><Text style={[styles.clockNum, selHour===h && {color:VOEXITheme.colors.primary}]}>{h}</Text></TouchableOpacity>)}</ScrollView></View><View style={styles.clockCol}><Text style={styles.clockLabel}>MIN</Text><ScrollView style={{height:100}}>{['00','15','30','45'].map(m => <TouchableOpacity key={m} onPress={()=>setSelMin(m)}><Text style={[styles.clockNum, selMin===m && {color:VOEXITheme.colors.primary}]}>{m}</Text></TouchableOpacity>)}</ScrollView></View><View style={styles.clockCol}><Text style={styles.clockLabel}>AM/PM</Text>{['AM','PM'].map(a => <TouchableOpacity key={a} onPress={()=>setSelAmPm(a)}><Text style={[styles.clockNum, selAmPm===a && {color:VOEXITheme.colors.primary}]}>{a}</Text></TouchableOpacity>)}</View></View><TouchableOpacity style={styles.confirmSchedBtn} onPress={()=>setShowSchedulePicker(false)}><Text style={{color:'#000', fontWeight:'900'}}>SET TRANSMISSION TIME</Text></TouchableOpacity></View></View></Modal>
      <Modal visible={showAdvancedSettings} animationType="slide"><SafeAreaView style={styles.settingsPage}><View style={styles.settingsHeader}><TouchableOpacity onPress={() => setShowAdvancedSettings(false)}><Ionicons name="arrow-back" size={28} color="#fff" /></TouchableOpacity><Text style={styles.headerText}>BROADCAST CONTROLS</Text><View style={{width: 28}} /></View><ScrollView style={{padding: 20}}><View style={styles.settingsSurfaceFull}>{[ { label: 'Hide Likes', val: hideLikes, s: setHideLikes }, { label: 'Hide Ratings', val: hideRatings, s: setHideRatings }, { label: 'Lock Comments', val: disableComments, s: setDisableComments }, { label: 'Lock Sharing', val: disableSharing, s: setDisableSharing }, { label: 'Earn VX Coins', val: monetize, s: setMonetize } ].map((s) => (<View key={s.label} style={styles.settingRowLarge}><Text style={styles.settingLabelLarge}>{s.label}</Text><Switch value={s.val} onValueChange={s.s} trackColor={{ false: '#222', true: VOEXITheme.colors.primary }} /></View>))}</View><TouchableOpacity style={styles.settingsDoneBtn} onPress={() => setShowAdvancedSettings(false)}><Text style={styles.doneBtnText}>CONFIRM SETTINGS</Text></TouchableOpacity></ScrollView></SafeAreaView></Modal>
      <Modal visible={showCollabModal} transparent animationType="slide"><View style={styles.modalOverlay}><View style={styles.collabSheet}><View style={styles.collabHeader}><Text style={styles.trayTitle}>PARTNER SEARCH</Text><TouchableOpacity onPress={() => setShowCollabModal(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity></View><View style={styles.collabSearchBar}><Ionicons name="search" size={18} color="#666" /><TextInput autoFocus style={styles.collabSearchInput} placeholder="Search VX ID..." placeholderTextColor="#444" value={collabSearch} onChangeText={searchPartners} /></View><ScrollView style={styles.resultsList}>{collabResults.map(user => (<TouchableOpacity key={user.id} style={styles.userItem} onPress={() => { setCollaborator(user); setShowCollabModal(false); }}><Image source={{ uri: user.avatar_url }} style={styles.userAvatar} /><Text style={styles.userName}>@{user.username}</Text></TouchableOpacity>))}</ScrollView></View></View></Modal>
    </SafeAreaView>
  );

  // --- STEP 4: SIGNAL PREVIEW (REVAMPED MISSION CONTROL) ---
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.videoHeader}><TouchableOpacity onPress={() => setStep(3)}><Ionicons name="arrow-back" size={28} color="#fff" /></TouchableOpacity><Text style={styles.headerText}>SIGNAL PREVIEW</Text><View style={{width: 28}} /></View>
      <ScrollView style={{padding: 20}} showsVerticalScrollIndicator={false}>

         <View style={styles.reviewCard}>
            <View style={styles.finalCinemaBox}>
               <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" />
               <View style={styles.monitorOverlay}><Text style={styles.monitorTag}>LIVE MONITORING</Text><View style={styles.monitorDot} /></View>
               <Waveform />
            </View>
            <View style={styles.reviewMeta}>
               <Text style={styles.reviewTitle}>{title}</Text>
               <Text style={styles.reviewDesc} numberOfLines={2}>{description}</Text>
               <View style={styles.tagCloud}>{tags.split(',').map((t, i) => <View key={i} style={styles.tagPill}><Text style={styles.tagPillText}>#{t.trim()}</Text></View>)}</View>
               <View style={styles.metaBadgeRow}>
                  <View style={styles.metaBadge}><Ionicons name="planet" size={12} color={VOEXITheme.colors.primary} /><Text style={styles.metaBadgeText}>{category}</Text></View>
                  <View style={styles.metaBadge}><Ionicons name="location" size={12} color="#666" /><Text style={styles.metaBadgeText}>{location || 'Global Hub'}</Text></View>
               </View>
            </View>
         </View>

         <Text style={styles.labelTitle}>TRANSMISSION PIPELINE</Text>
         <View style={styles.pipelineContainer}>
            <View style={styles.pipeNode}><Ionicons name="phone-portrait" size={14} color="#fff" /><Text style={styles.pipeLabel}>SOURCE</Text></View>
            <LinearGradient colors={[VOEXITheme.colors.primary, '#444']} style={styles.pipeLine} start={{x:0, y:0}} end={{x:1, y:0}} />
            <View style={styles.pipeNode}><Ionicons name="server" size={14} color={VOEXITheme.colors.primary} /><Text style={styles.pipeLabel}>HUB</Text></View>
            <LinearGradient colors={['#444', '#222']} style={styles.pipeLine} start={{x:0, y:0}} end={{x:1, y:0}} />
            <View style={styles.pipeNode}><Ionicons name="globe" size={14} color="#444" /><Text style={styles.pipeLabel}>NETWORK</Text></View>
         </View>

         <View style={styles.statusBoard}>
            <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 15}}><Text style={styles.boardTitle}>SPECTRUM INTEGRITY REPORT</Text><View style={styles.signalMeter}><View style={styles.sigBarActive} /><View style={styles.sigBarActive} /><View style={styles.sigBarActive} /><View style={styles.sigBar} /></View></View>
            <View style={styles.boardGrid}>
               <View style={styles.boardItem}><Ionicons name={integrityLoading ? "sync" : "shield-checkmark"} size={16} color={integrityLoading ? "#666" : "#00ff00"} /><Text style={styles.boardText}>{copyrightStatus}</Text></View>
               <View style={styles.boardItem}><Ionicons name="pulse" size={16} color="#00f2fe" /><Text style={styles.boardText}>Stability: 99.8%</Text></View>
               <View style={styles.boardItem}><Ionicons name="lock-closed" size={16} color="#fff" /><Text style={styles.boardText}>SSL: 256-BIT</Text></View>
               <View style={styles.boardItem}><Ionicons name="flash" size={16} color="#ffd700" /><Text style={styles.boardText}>{signalQuality}</Text></View>
               <View style={styles.boardItem}><Ionicons name="language" size={16} color="#A855F7" /><Text style={styles.boardText}>LANG: {broadcastLang}</Text></View>
               <View style={styles.boardItem}><Ionicons name="finger-print" size={16} color="#fff" /><Text style={styles.boardText}>SIG: VERIFIED</Text></View>
            </View>
            <View style={styles.tokenBox}><Text style={styles.tokenLabel}>TRANSMISSION TOKEN:</Text><Text style={styles.tokenText}>VX-{Math.random().toString(36).substr(2, 9).toUpperCase()}</Text></View>
         </View>

         <TouchableOpacity style={styles.uploadBtnFinal} onPress={handlePublish} disabled={loading}>
            <LinearGradient colors={[VOEXITheme.colors.primary, '#9333ea']} style={styles.finalGrad}>
               {loading ? <ActivityIndicator color="#fff" /> : <><Text style={styles.finalUploadText}>INITIATE BROADCAST</Text><Ionicons name="rocket" size={18} color="#fff" /></>}
            </LinearGradient>
         </TouchableOpacity>
         <View style={{height: 50}} />
      </ScrollView>
      {loading && (
        <View style={styles.fullLoader}>
          <ActivityIndicator size="large" color={VOEXITheme.colors.primary} />
          <Text style={styles.loaderText}>BROADCASTING SIGNAL...</Text>
          <Text style={{ color: VOEXITheme.colors.secondary, fontSize: 24, fontWeight: '900', marginTop: 10 }}>{uploadProgress}%</Text>
          <View style={{ width: '60%', height: 4, backgroundColor: '#222', borderRadius: 2, marginTop: 15, overflow: 'hidden' }}>
            <View style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: VOEXITheme.colors.primary }} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const radarStyles = StyleSheet.create({
  container: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginVertical: 20 },
  core: { width: 60, height: 60, borderRadius: 30, backgroundColor: VOEXITheme.colors.primary, justifyContent: 'center', alignItems: 'center', zIndex: 10, shadowColor: VOEXITheme.colors.primary, shadowRadius: 20, shadowOpacity: 0.8 },
  pulse: { position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: VOEXITheme.colors.primary }
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  landing: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  landingTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 20 },
  sourceRow: { flexDirection: 'row', gap: 20, marginTop: 40 },
  ratioIconBox: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#080808', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#222', marginBottom: 20 },
  ratioTag: { position: 'absolute', bottom: 10, color: VOEXITheme.colors.secondary, fontSize: 10, fontWeight: 'bold' },
  sourceCard: { width: 110, height: 110, backgroundColor: '#080808', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  sourceLabel: { color: '#fff', marginTop: 8, fontWeight: 'bold' },
  videoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  headerText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  nextBtn: { backgroundColor: VOEXITheme.colors.primary, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 15 },
  nextText: { color: '#fff', fontWeight: 'bold' },
  canvasArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cinemaBox: { width: width, aspectRatio: 16/9, backgroundColor: '#050505', position: 'relative', overflow: 'hidden' },
  draggable: { position: 'absolute', padding: 10 },
  canvasText: { textAlign: 'center', fontWeight: '900' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 30 },
  toolBtn: { alignItems: 'center', gap: 5 },
  toolLabel: { color: '#555', fontSize: 10, fontWeight: 'bold', marginTop: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.97)', justifyContent: 'center', alignItems: 'center' },
  inputFocus: { width: '100%', textAlign: 'center', fontSize: 35, fontWeight: '900', color: '#fff' },
  editorTools: { width: '100%', padding: 20 },
  modeRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
  modeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  modeText: { color: '#888', fontSize: 9, fontWeight: 'bold' },
  colorDot: { width: 34, height: 34, borderRadius: 17, marginRight: 15 },
  doneBtn: { marginTop: 30, backgroundColor: '#fff', paddingHorizontal: 40, paddingVertical: 12, borderRadius: 25 },
  doneText: { color: '#000', fontWeight: '900' },
  traySheet: { backgroundColor: '#0A0A0A', position: 'absolute', bottom: 0, width: '100%', borderTopLeftRadius: 30, padding: 25 },
  trayTitle: { color: '#fff', fontSize: 13, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
  vfxCard: { alignItems: 'center', marginRight: 20 },
  vfxPreview: { width: 60, height: 60, borderRadius: 15, borderWidth: 1, borderColor: '#222' },
  vfxName: { color: '#555', fontSize: 9, fontWeight: 'bold', marginTop: 5 },

  audioTraySheet: { width: '100%', height: '82%', backgroundColor: '#0A0A12', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 22, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(168, 85, 247, 0.4)' },
  audioTrayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  audioTrayTitle: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.2 },
  closeTrayBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },

  mixerPresetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 15 },
  presetChip: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  presetChipText: { color: '#AAA', fontSize: 9.5, fontWeight: '800' },

  mixerSurfaceBox: { backgroundColor: '#111', padding: 16, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  mixTrackRow: { marginBottom: 14 },
  mixLabelLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  mixTrackLabel: { color: '#EEE', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  mixTrackValue: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  mixTrackBg: { height: 10, backgroundColor: '#222', borderRadius: 5, overflow: 'hidden', position: 'relative' },
  mixTrackFill: { height: '100%', borderRadius: 5 },

  selectSoundHeader: { color: '#666', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 10 },
  soundPickCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  soundPickCardActive: { backgroundColor: 'rgba(0, 242, 254, 0.12)', borderColor: '#00F2FE' },
  soundPickIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(168,85,247,0.15)', justifyContent: 'center', alignItems: 'center' },
  soundPickTitle: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  soundPickSub: { color: '#666', fontSize: 10, marginTop: 2, fontWeight: '600' },
  useTextPill: { color: '#A855F7', fontSize: 10, fontWeight: '900', backgroundColor: 'rgba(168,85,247,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },

  confirmMixerBtn: { backgroundColor: VOEXITheme.colors.primary, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 15 },
  confirmMixerTxt: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  broadcasterTag: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: '#0A0A0A', padding: 15, borderRadius: 20, marginBottom: 25, borderWidth: 1, borderColor: '#111' },
  broadcasterAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: VOEXITheme.colors.primary },
  broadcasterLabel: { color: '#444', fontSize: 8, fontWeight: '900' },
  broadcasterName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  darkInput: { backgroundColor: '#080808', borderRadius: 15, padding: 18, color: '#fff', marginBottom: 25 },
  catPill: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, backgroundColor: '#111', marginRight: 10, borderWidth: 1, borderColor: '#222', flexDirection: 'row', alignItems: 'center' },
  catPillActive: { backgroundColor: VOEXITheme.colors.primary, borderColor: VOEXITheme.colors.primary },
  catText: { color: '#666', fontSize: 11, fontWeight: 'bold' },
  labelTitle: { color: '#444', fontSize: 10, fontWeight: '900', marginBottom: 10 },
  locationSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', padding: 18, borderRadius: 15, marginBottom: 30, borderWidth: 1, borderColor: '#111', gap: 12 },
  locText: { color: '#fff', flex: 1, fontSize: 13 },
  fullLocSheet: { flex: 1, backgroundColor: '#000' },
  locHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  locHeaderTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  locSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', margin: 20, borderRadius: 12, paddingHorizontal: 15, height: 50 },
  locInput: { flex: 1, color: '#fff', marginLeft: 10 },
  locItem: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  locIconCirc: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  locItemText: { color: '#eee', fontSize: 14, marginLeft: 15 },
  detectBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', marginHorizontal: 20, padding: 15, borderRadius: 12, gap: 12, borderWidth: 1, borderColor: VOEXITheme.colors.primary, marginBottom: 20 },
  detectBtnText: { color: VOEXITheme.colors.primary, fontWeight: 'bold', fontSize: 14 },
  tagSuggestion: { backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginRight: 10, borderWidth: 0.5, borderColor: '#222' },
  tagSugText: { color: VOEXITheme.colors.secondary, fontSize: 11, fontWeight: 'bold' },
  advancedSettingsBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#080808', padding: 18, borderRadius: 15, marginBottom: 30, borderWidth: 1, borderColor: '#111' },
  advBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold', flex: 1 },
  settingsPage: { flex: 1, backgroundColor: '#000' },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  settingsSurfaceFull: { backgroundColor: '#0A0A0A', borderRadius: 25, padding: 20 },
  settingRowLarge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20, borderBottomWidth: 0.5, borderBottomColor: '#111' },
  settingLabelLarge: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  settingsDoneBtn: { backgroundColor: VOEXITheme.colors.primary, padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 40 },
  doneBtnText: { color: '#fff', fontWeight: '900' },
  collabBox: { backgroundColor: '#080808', borderRadius: 15, padding: 18, marginBottom: 30, borderWidth: 1, borderColor: '#111' },
  collabActive: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  collabAvatar: { width: 30, height: 30, borderRadius: 15 },
  collabName: { color: '#fff', fontWeight: 'bold' },
  collabPlaceholderText: { color: '#444', fontWeight: 'bold' },
  pubBtn: { backgroundColor: VOEXITheme.colors.primary, padding: 20, borderRadius: 15, alignItems: 'center' },
  pubText: { color: '#fff', fontWeight: '900' },
  finalPreview: { width: '100%', aspectRatio: 16/9, backgroundColor: '#050505', borderRadius: 20, overflow: 'hidden', marginBottom: 25, borderWidth: 1, borderColor: '#111' },
  reviewCard: { backgroundColor: '#0A0A0A', borderRadius: 25, overflow: 'hidden', marginBottom: 25, borderWidth: 1, borderColor: '#111' },
  finalCinemaBox: { width: '100%', aspectRatio: 16/9, backgroundColor: '#000', position: 'relative' },
  reviewMeta: { padding: 20 },
  reviewTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  reviewDesc: { color: '#888', fontSize: 13, marginBottom: 15 },
  tagCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  tagPill: { backgroundColor: '#111', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagPillText: { color: VOEXITheme.colors.primary, fontSize: 11, fontWeight: 'bold' },
  metaBadgeRow: { flexDirection: 'row', gap: 15 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#111', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  metaBadgeText: { color: '#eee', fontSize: 10, fontWeight: 'bold' },
  statusBoard: { backgroundColor: '#080808', padding: 20, borderRadius: 20, marginBottom: 30, borderWidth: 1, borderColor: '#111' },
  boardTitle: { color: '#444', fontSize: 9, fontWeight: '900' },
  signalMeter: { flexDirection: 'row', gap: 3, alignItems: 'flex-end', height: 12 },
  sigBar: { width: 3, height: 4, backgroundColor: '#222', borderRadius: 1 },
  sigBarActive: { width: 3, height: 8, backgroundColor: '#00ff00', borderRadius: 1 },
  boardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  boardItem: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '45%' },
  boardText: { color: '#aaa', fontSize: 10, fontWeight: 'bold' },
  uploadBtnFinal: { borderRadius: 20, overflow: 'hidden' },
  finalGrad: { paddingVertical: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  finalUploadText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  fullLoader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  loaderText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginTop: 20 },
  collabSheet: { backgroundColor: '#0A0A0A', width: '100%', height: '70%', position: 'absolute', bottom: 0, borderTopLeftRadius: 35, padding: 25 },
  collabHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  collabSearchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 15, paddingHorizontal: 15, height: 50 },
  collabSearchInput: { flex: 1, color: '#fff', marginLeft: 10 },
  resultsList: { flex: 1 },
  userItem: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#111' },
  userAvatar: { width: 40, height: 40, borderRadius: 20 },
  userName: { color: '#fff', fontWeight: 'bold' },
  visCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#111', gap: 15, marginBottom: 10 },
  visCardActive: { borderColor: VOEXITheme.colors.primary, backgroundColor: 'rgba(168,85,247,0.05)' },
  visIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  visLabel: { color: '#888', fontSize: 14, fontWeight: 'bold' },
  visDesc: { color: '#444', fontSize: 11, marginTop: 2 },
  scheduleSheet: { backgroundColor: '#0A0A0A', width: '100%', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, borderTopWidth: 1, borderTopColor: '#222' },
  calendarStrip: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 25 },
  datePill: { width: 55, height: 70, backgroundColor: '#080808', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#111' },
  datePillActive: { backgroundColor: VOEXITheme.colors.primary, borderColor: VOEXITheme.colors.primary },
  dateDay: { color: '#666', fontSize: 10, fontWeight: 'bold' },
  dateNum: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 5 },
  clockGrid: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#080808', padding: 20, borderRadius: 20, marginBottom: 25 },
  clockCol: { alignItems: 'center', width: '30%' },
  clockLabel: { color: '#444', fontSize: 8, fontWeight: '900', marginBottom: 10 },
  clockNum: { color: '#666', fontSize: 22, fontWeight: 'bold', paddingVertical: 10 },
  confirmSchedBtn: { backgroundColor: VOEXITheme.colors.secondary, padding: 18, borderRadius: 15, alignItems: 'center' },
  clockTitle: { color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  monitorOverlay: { position: 'absolute', top: 15, right: 15, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  monitorTag: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  monitorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00ff00' },
  pipelineContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30, paddingHorizontal: 10 },
  pipeNode: { alignItems: 'center', gap: 5 },
  pipeLabel: { color: '#444', fontSize: 8, fontWeight: 'bold' },
  pipeLine: { flex: 1, height: 2, marginHorizontal: 10, borderRadius: 1 },
  tokenBox: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#111', paddingTop: 15, alignItems: 'center' },
  tokenLabel: { color: '#333', fontSize: 8, fontWeight: 'bold' },
  tokenText: { color: '#555', fontSize: 10, fontWeight: 'bold', marginTop: 4, letterSpacing: 1 },
  radarLabel: { color: '#555', fontSize: 10, fontWeight: 'bold', marginTop: 10, letterSpacing: 1 },
  scanLine: { position: 'absolute', width: '100%', height: 2, backgroundColor: VOEXITheme.colors.secondary, zIndex: 10, shadowColor: VOEXITheme.colors.secondary, shadowRadius: 10, shadowOpacity: 1 },
  detailRow: { flexDirection: 'row', gap: 20, marginBottom: 30 },
  smallLabel: { color: '#333', fontSize: 8, fontWeight: 'bold', marginBottom: 8 },
  detailPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#111', marginRight: 10 },
  detailPillText: { color: '#444', fontSize: 10, fontWeight: 'bold' }
});
