import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, FlatList, Image, TouchableOpacity, TextInput, ActivityIndicator, Dimensions, RefreshControl, Alert, Animated, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const LOCAL_SERVER_BASE = 'http://192.168.31.39:8080';

// Check if a URL is a valid, playable audio URL
const isValidAudioUrl = (url: any): boolean => {
  if (!url || typeof url !== 'string') return false;
  const lower = url.trim().toLowerCase();
  // Filter out image URLs that were improperly cataloged
  if (lower.includes('unsplash.com') || lower.includes('via.placeholder') || lower.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return false;
  }
  if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('file://') || lower.startsWith('content://')) {
    return true;
  }
  return false;
};

// Formats seconds into MM:SS
const formatTime = (millis: number) => {
  if (!millis || isNaN(millis) || millis <= 0) return '0:00';
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export default function NewSoundStudio() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { fromChat, chatId, fromStudio, mediaUri, mediaType } = params;

  const [loading, setLoading] = useState(true);
  const [sounds, setSounds] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'Discover' | 'Saved'>('Discover');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Audio Playback State
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [positionMillis, setPositionMillis] = useState<number>(0);
  const [durationMillis, setDurationMillis] = useState<number>(0);
  const audioRef = useRef<Audio.Sound | null>(null);

  // Equalizer Animation
  const eq1 = useRef(new Animated.Value(0.3)).current;
  const eq2 = useRef(new Animated.Value(0.7)).current;
  const eq3 = useRef(new Animated.Value(0.4)).current;
  const eq4 = useRef(new Animated.Value(0.9)).current;

  // Cleanup audio when leaving screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (audioRef.current) {
          audioRef.current.stopAsync().catch(() => {});
          audioRef.current.unloadAsync().catch(() => {});
          audioRef.current = null;
        }
        setPlayingId(null);
      };
    }, [])
  );

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldRouteThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    }).catch(() => {});

    // Load saved sounds from AsyncStorage
    AsyncStorage.getItem('@saved_sounds').then(raw => {
      if (raw) {
        try {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) setSavedIds(new Set(arr));
        } catch (e) {}
      }
    }).catch(() => {});

    return () => {
      if (audioRef.current) audioRef.current.unloadAsync().catch(() => {});
    };
  }, []);

  // Save / Bookmark Sound Toggle
  const toggleSaveSound = async (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const soundId = item.id;
    const isSaved = savedIds.has(soundId);

    const newSet = new Set(savedIds);
    if (isSaved) {
      newSet.delete(soundId);
    } else {
      newSet.add(soundId);
    }
    setSavedIds(newSet);

    try {
      await AsyncStorage.setItem('@saved_sounds', JSON.stringify(Array.from(newSet)));

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (isSaved) {
          await supabase.from('saved_sounds').delete().eq('user_id', user.id).eq('sound_id', soundId);
        } else {
          await supabase.from('saved_sounds').upsert({
            user_id: user.id,
            sound_id: soundId,
            created_at: new Date().toISOString()
          }, { onConflict: 'user_id,sound_id' });
        }
      }
    } catch (e) {
      console.warn('[SOUND STUDIO] Save sound error:', e);
    }
  };

  // Equalizer Bar Loop Animation
  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    if (playingId) {
      animLoop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(eq1, { toValue: 1.0, duration: 250, useNativeDriver: true }),
            Animated.timing(eq1, { toValue: 0.2, duration: 300, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(eq2, { toValue: 0.3, duration: 350, useNativeDriver: true }),
            Animated.timing(eq2, { toValue: 0.95, duration: 280, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(eq3, { toValue: 0.85, duration: 220, useNativeDriver: true }),
            Animated.timing(eq3, { toValue: 0.25, duration: 320, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(eq4, { toValue: 0.35, duration: 290, useNativeDriver: true }),
            Animated.timing(eq4, { toValue: 1.0, duration: 240, useNativeDriver: true }),
          ]),
        ])
      );
      animLoop.start();
    } else {
      eq1.setValue(0.3);
      eq2.setValue(0.7);
      eq3.setValue(0.4);
      eq4.setValue(0.9);
    }
    return () => { if (animLoop) animLoop.stop(); };
  }, [playingId]);

  // Main Audio Fetcher (100% Local Server Exclusive)
  const fetchSoundTracks = useCallback(async (query = '') => {
    try {
      setLoading(true);

      // 1. Local Media Server Uplink (http://192.168.31.39:8080/files.json)
      let serverTracks: any[] = [];
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1200);
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
              return {
                id: item.id || `srv_${item.filename}`,
                title: item.title || item.filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
                url: url,
                uploader: item.uploader ? item.uploader.replace('@', '') : 'admin_creator',
                category: 'SOUNDS',
                created_at: item.created_at || item.uploaded_at,
                sizeMb: item.sizeMb || '0.3',
                views: item.views || 0,
                likes: item.likes || 0,
                thumbnail_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop'
              };
            });
          }
        }
      } catch (e) {
        console.warn('[SOUND STUDIO] Local Media Server connection warning:', e);
      }

      // 2. AsyncStorage Local Uploads (@my_local_uploads)
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
            }).map((item: any) => ({
              id: item.id || `loc_${Math.random()}`,
              title: item.title || 'Local Sound Track',
              url: item.media_url,
              uploader: item.profiles?.username || 'me',
              category: 'SOUNDS',
              created_at: item.created_at,
              thumbnail_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop'
            }));
          }
        }
      } catch (e) {}

      // Combine only local server and local app uploads
      const seenUrls = new Set<string>();
      const combined: any[] = [];

      const addTrack = (track: any) => {
        if (!track || !track.url) return;
        let cleanUrl = String(track.url).trim().replace(/[\[\]"']/g, '');
        if (cleanUrl.startsWith('/')) cleanUrl = `${LOCAL_SERVER_BASE}${cleanUrl}`;
        else if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('file://') && !cleanUrl.startsWith('content://')) {
          cleanUrl = `${LOCAL_SERVER_BASE}/${cleanUrl}`;
        }

        if (isValidAudioUrl(cleanUrl) && !seenUrls.has(cleanUrl)) {
          seenUrls.add(cleanUrl);
          combined.push({
            ...track,
            url: cleanUrl
          });
        }
      };

      serverTracks.forEach(addTrack);
      localTracks.forEach(addTrack);

      let targetList = combined;
      if (activeTab === 'Saved') {
        targetList = combined.filter(t => savedIds.has(t.id));
      }

      // Filter by search query
      if (query.trim().length > 0) {
        const q = query.toLowerCase().trim();
        targetList = targetList.filter(t => t.title.toLowerCase().includes(q) || t.uploader.toLowerCase().includes(q));
      }

      setSounds(targetList);
    } catch (e) {
      console.error('[NEW SOUND STUDIO] Fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, savedIds]);

  useEffect(() => { fetchSoundTracks(); }, [fetchSoundTracks]);

  // Audio Playback Engine
  const playTrack = async (item: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      // Toggle Pause if clicking current track
      if (playingId === item.id) {
        if (audioRef.current) {
          await audioRef.current.pauseAsync().catch(() => {});
        }
        setPlayingId(null);
        return;
      }

      // Stop previous track
      if (audioRef.current) {
        await audioRef.current.unloadAsync().catch(() => {});
        audioRef.current = null;
      }

      const soundUrl = item.url;
      if (!isValidAudioUrl(soundUrl)) {
        setSounds(prev => prev.filter(s => s.id !== item.id));
        return;
      }

      setPlayingId(item.id);
      setPositionMillis(0);
      setDurationMillis(0);

      const { sound } = await Audio.Sound.createAsync(
        { uri: soundUrl },
        { shouldPlay: true, volume: 1.0 },
        (status: any) => {
          if (status.isLoaded) {
            setPositionMillis(status.positionMillis || 0);
            setDurationMillis(status.durationMillis || 0);
            if (status.didJustFinish) {
              setPlayingId(null);
              setPositionMillis(0);
            }
          }
        }
      );

      audioRef.current = sound;
    } catch (e: any) {
      setPlayingId(null);
      // Automatically remove dead/stale 404 track from UI list
      setSounds(prev => prev.filter(s => s.id !== item.id));
    }
  };

  // Select Sound and Return to Studio Editor / Upload
  const handleUseSoundTrack = async (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (audioRef.current) {
      await audioRef.current.stopAsync().catch(() => {});
      await audioRef.current.unloadAsync().catch(() => {});
      audioRef.current = null;
    }
    setPlayingId(null);

    let targetPath: any = '/(tabs)/upload';
    if (fromStudio === 'video') targetPath = '/studio/video-editor';
    else if (fromStudio === 'story') targetPath = '/studio/story-editor';
    else if (fromStudio === 'reels') targetPath = '/studio/reels-editor';

    router.replace({
      pathname: targetPath,
      params: {
        soundId: item.id,
        soundUrl: item.url,
        soundName: item.title,
        fromLibrary: 'true',
        mediaUri: mediaUri,
        mediaType: mediaType
      }
    });
  };

  const renderSoundCard = ({ item }: { item: any }) => {
    const isPlaying = playingId === item.id;
    const isSaved = savedIds.has(item.id);

    return (
      <View style={[styles.trackCard, isPlaying && styles.trackCardActive]}>
        <LinearGradient
          colors={isPlaying ? ['rgba(168, 85, 247, 0.15)', 'rgba(0, 242, 254, 0.08)'] : ['rgba(255, 255, 255, 0.03)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />

        <TouchableOpacity style={styles.cardMainClick} onPress={() => playTrack(item)} activeOpacity={0.8}>
          <View style={styles.coverBox}>
            <Image source={{ uri: item.thumbnail_url }} style={styles.coverImg} />
            <View style={styles.playIconCircle}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={18} color="#FFF" />
            </View>
          </View>

          <View style={styles.trackDetailsBox}>
            <Text style={[styles.trackTitleText, isPlaying && { color: '#00F2FE' }]} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.artistRow}>
              <Ionicons name="person-outline" size={11} color="#A855F7" />
              <Text style={styles.artistNameText} numberOfLines={1}>
                @{item.uploader}
              </Text>
              {item.sizeMb && <Text style={styles.sizeMbText}>• {item.sizeMb} MB</Text>}
            </View>

            {/* LIVE ANIMATED EQUALIZER OR PROGRESS BAR */}
            {isPlaying ? (
              <View style={styles.eqWrapper}>
                <View style={styles.eqBarContainer}>
                  <Animated.View style={[styles.eqBar, { transform: [{ scaleY: eq1 }] }]} />
                  <Animated.View style={[styles.eqBar, { transform: [{ scaleY: eq2 }] }]} />
                  <Animated.View style={[styles.eqBar, { transform: [{ scaleY: eq3 }] }]} />
                  <Animated.View style={[styles.eqBar, { transform: [{ scaleY: eq4 }] }]} />
                </View>

                <View style={styles.timeTracker}>
                  <Text style={styles.timeText}>{formatTime(positionMillis)} / {formatTime(durationMillis)}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.trackPillBadge}>
                <Text style={styles.trackPillText}>🎵 VOEXI FREQUENCY</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* ACTION BUTTONS GROUP: USE + SAVE */}
        <View style={styles.actionRowGroup}>
          <TouchableOpacity style={styles.useSoundBtn} onPress={() => handleUseSoundTrack(item)}>
            <LinearGradient colors={['#A855F7', '#6D28D9']} style={styles.useBtnGrad}>
              <Ionicons name="add" size={14} color="#FFF" />
              <Text style={styles.useBtnText}>USE</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, isSaved && styles.saveBtnActive]}
            onPress={() => toggleSaveSound(item)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={15}
              color={isSaved ? "#00F2FE" : "#94A3B8"}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* TOP CYBERPUNK HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backIconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerMainTitle}>SOUND <Text style={{ color: '#00F2FE' }}>STUDIO</Text> 🎵</Text>
          <Text style={styles.headerSubTitle}>VOEXI FREQUENCY VAULT</Text>
        </View>

        <View style={styles.liveFreqBadge}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.liveFreqText}>8080 LIVE</Text>
        </View>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchBarBox}>
        <Ionicons name="search" size={18} color="#64748B" style={{ marginRight: 10 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search sounds, music tracks, artists..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            fetchSoundTracks(text);
          }}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); fetchSoundTracks(''); }}>
            <Ionicons name="close-circle" size={18} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>

      {/* TOP DISCOVER VS SAVED TAB SWITCHER */}
      <View style={styles.topTabContainer}>
        <TouchableOpacity
          style={[styles.topTabPill, activeTab === 'Discover' && styles.topTabPillActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setActiveTab('Discover');
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="compass-outline" size={15} color={activeTab === 'Discover' ? '#FFF' : '#64748B'} />
          <Text style={[styles.topTabText, activeTab === 'Discover' && styles.topTabTextActive]}>
            DISCOVER
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabPill, activeTab === 'Saved' && styles.topTabPillActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setActiveTab('Saved');
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="bookmark" size={14} color={activeTab === 'Saved' ? '#00F2FE' : '#64748B'} />
          <Text style={[styles.topTabText, activeTab === 'Saved' && styles.topTabTextActive]}>
            SAVED ({savedIds.size})
          </Text>
        </TouchableOpacity>
      </View>

      {/* SOUND TRACKS LIST */}
      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={VOEXITheme.colors.primary} size="large" />
          <Text style={styles.loadingText}>SYNCING AUDIO FREQUENCIES...</Text>
        </View>
      ) : (
        <FlatList
          data={sounds}
          keyExtractor={(item) => item.id}
          renderItem={renderSoundCard}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchSoundTracks(searchQuery);
              }}
              tintColor="#A855F7"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name={activeTab === 'Saved' ? "bookmark-outline" : "music-off"} size={48} color="#334155" />
              <Text style={styles.emptyTitle}>
                {activeTab === 'Saved' ? 'NO SAVED SOUNDS YET' : 'NO SOUND TRACKS FOUND'}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === 'Saved'
                  ? 'Tap the bookmark icon 🔖 next to any sound track in Discover to save it for quick access!'
                  : 'Upload an audio file (.mp3 / .m4a) from the Studio Upload screen to feature it in Sound Studio!'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#03030A' },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#121226' },
  backIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerTitleBox: { alignItems: 'center' },
  headerMainTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },
  headerSubTitle: { color: '#64748B', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  liveFreqBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34, 197, 94, 0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.3)' },
  greenPulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  liveFreqText: { color: '#22C55E', fontSize: 8, fontWeight: '900' },

  searchBarBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B0B18', marginHorizontal: 16, marginTop: 15, marginBottom: 12, paddingHorizontal: 15, height: 48, borderRadius: 16, borderWidth: 1, borderColor: '#1E1E38' },
  searchInput: { flex: 1, color: '#FFF', fontSize: 13, fontWeight: '600' },

  topTabContainer: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 15, backgroundColor: '#0B0B18', borderRadius: 16, padding: 4, borderWidth: 1, borderColor: '#1E1E38' },
  topTabPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  topTabPillActive: { backgroundColor: '#18182B', borderWidth: 1, borderColor: '#A855F7' },
  topTabText: { color: '#64748B', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  topTabTextActive: { color: '#FFF', fontWeight: '900' },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  loadingText: { color: '#64748B', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 15 },

  trackCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#080814', marginBottom: 12, borderRadius: 20, padding: 12, borderWidth: 1, borderColor: '#1A1A30', overflow: 'hidden' },
  trackCardActive: { borderColor: '#00F2FE', backgroundColor: '#0A0A1F' },

  cardMainClick: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  coverBox: { width: 54, height: 54, borderRadius: 14, overflow: 'hidden', backgroundColor: '#14142B', position: 'relative' },
  coverImg: { width: '100%', height: '100%' },
  playIconCircle: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },

  trackDetailsBox: { marginLeft: 14, flex: 1 },
  trackTitleText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.3 },
  artistRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  artistNameText: { color: '#A855F7', fontSize: 11, fontWeight: '700' },
  sizeMbText: { color: '#64748B', fontSize: 10, fontWeight: '600' },

  trackPillBadge: { marginTop: 6, alignSelf: 'flex-start' },
  trackPillText: { color: '#64748B', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },

  eqWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  eqBarContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 16 },
  eqBar: { width: 3, height: 16, backgroundColor: '#00F2FE', borderRadius: 2 },
  timeTracker: { alignSelf: 'flex-end' },
  timeText: { color: '#00F2FE', fontSize: 10, fontWeight: '900' },

  actionRowGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  useSoundBtn: { borderRadius: 12, overflow: 'hidden' },
  useBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 9 },
  useBtnText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  saveBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  saveBtnActive: { backgroundColor: 'rgba(0, 242, 254, 0.15)', borderColor: '#00F2FE' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 30 },
  emptyTitle: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1, marginTop: 15 },
  emptySub: { color: '#64748B', fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 6, lineHeight: 18 }
});
