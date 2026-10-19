import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Image, Dimensions, FlatList, Animated, Pressable, StatusBar, ActivityIndicator, Share, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { VOEXITheme } from '../constants/theme';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

const CATEGORIES = ['All', 'Phonk', 'Cinematic', 'Lo-Fi', 'Pop', 'Cyberpunk', 'Dance'];

const CURATED_SOUNDS = [
  { id: 'curated_1', title: 'Neural Surge', creator: 'Cyber_Fury', duration: '0:30', usage: '1.2M', category: 'Cyberpunk', audio_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3', cover: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=400' },
  { id: 'curated_2', title: 'Neon Pulse', creator: 'Neon_Rider', duration: '0:30', usage: '800K', category: 'Phonk', audio_url: 'https://www.w3schools.com/html/horse.mp3', cover: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400' },
  { id: 'curated_3', title: 'Quantum Bass', creator: 'Bit_Master', duration: '0:25', usage: '2.5M', category: 'Cinematic', audio_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400' },
  { id: 'curated_4', title: 'Cyber Drift', creator: 'Aura_VX', duration: '0:45', usage: '540K', category: 'Lo-Fi', audio_url: 'https://www.w3schools.com/html/horse.mp3', cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400' },
  { id: 'curated_5', title: 'Solar Flare', creator: 'Apex_Pro', duration: '0:35', usage: '920K', category: 'Dance', audio_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400' }
];

export default function RemixCenter() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Trending');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sounds, setSounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Player States
  const [activeTrack, setActiveTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(30000);
  const [showFullPlayerModal, setShowFullPlayerModal] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    loadSavedIds();
    fetchSounds();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const loadSavedIds = async () => {
    try {
      const raw = await AsyncStorage.getItem('@saved_remix_sounds');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) setSavedIds(new Set(list));
      }
    } catch (e) {}
  };

  const fetchSounds = async () => {
    setLoading(true);
    try {
      const { data: dbSounds } = await supabase
        .from('vx_sounds')
        .select('*, profiles(username, avatar_url, channel_name)')
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: dbPosts } = await supabase
        .from('posts')
        .select('*, profiles(username, avatar_url, channel_name)')
        .neq('post_type', 'Story')
        .order('created_at', { ascending: false })
        .limit(20);

      const formattedDbSounds = (dbSounds || []).map(s => ({
        id: s.id,
        title: s.name || 'Neural Track',
        creator: s.profiles?.channel_name || s.profiles?.username || 'Creator',
        duration: '0:30',
        usage: '10K+',
        category: 'Originals',
        audio_url: s.url,
        cover: s.thumbnail_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400'
      }));

      const formattedDbPosts = (dbPosts || []).map(p => ({
        id: p.id,
        title: p.title || 'VOEXI Remix Track',
        creator: p.profiles?.channel_name || p.profiles?.username || 'Broadcaster',
        duration: '0:30',
        usage: `${p.views_count || 100} views`,
        category: 'Remixes',
        audio_url: p.media_url || p.video_url,
        cover: p.thumbnail_url || p.media_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400'
      }));

      const merged = [...CURATED_SOUNDS, ...formattedDbSounds, ...formattedDbPosts];
      const seen = new Set<string>();
      const unique = merged.filter(item => {
        if (!item.audio_url || seen.has(item.audio_url)) return false;
        seen.add(item.audio_url);
        return true;
      });

      setSounds(unique);
    } catch (e) {
      setSounds(CURATED_SOUNDS);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (millis: number) => {
    if (!millis || isNaN(millis)) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleTogglePlay = async (soundItem: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      if (activeTrack?.id === soundItem.id) {
        if (soundRef.current) {
          if (isPlaying) {
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
          } else {
            await soundRef.current.playAsync();
            setIsPlaying(true);
          }
        }
        return;
      }

      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      setActiveTrack(soundItem);
      setIsPlaying(true);
      setPositionMillis(0);

      const url = soundItem.audio_url;
      if (!url) return;

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, volume: 1.0 },
        (status: any) => {
          if (status.isLoaded) {
            setPositionMillis(status.positionMillis || 0);
            setDurationMillis(status.durationMillis || 30000);
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPositionMillis(0);
            }
          }
        }
      );
      soundRef.current = newSound;
    } catch (e) {
      setIsPlaying(false);
    }
  };

  const handleToggleSave = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const next = new Set(savedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSavedIds(next);
    try {
      await AsyncStorage.setItem('@saved_remix_sounds', JSON.stringify(Array.from(next)));
    } catch (e) {}
  };

  const handleUseSound = (sound: any) => {
    if (soundRef.current) {
      soundRef.current.unloadAsync().catch(() => {});
      setIsPlaying(false);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push({
      pathname: '/menu/editor',
      params: {
        audioSource: sound.audio_url || sound.cover || sound.id,
        remixType: 'music',
        soundName: sound.title
      }
    });
  };

  // Filtered sounds calculation
  const filteredSounds = sounds.filter(item => {
    const query = search.trim().toLowerCase();
    if (query) {
      const matchTitle = item.title?.toLowerCase().includes(query);
      const matchCreator = item.creator?.toLowerCase().includes(query);
      if (!matchTitle && !matchCreator) return false;
    }

    if (activeCategory !== 'All' && item.category !== activeCategory) {
      return false;
    }

    if (activeTab === 'Saved') {
      return savedIds.has(item.id);
    } else if (activeTab === 'Originals') {
      return item.category === 'Originals' || item.category === 'Cyberpunk';
    } else if (activeTab === 'Remixes') {
      return item.category === 'Remixes' || item.category === 'Phonk';
    }

    return true;
  });

  const renderSoundCard = ({ item }: { item: any }) => {
    const isPlayingThis = activeTrack?.id === item.id && isPlaying;
    const isBookmarked = savedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[styles.soundCard, isPlayingThis && styles.soundCardActive]}
        activeOpacity={0.9}
        onPress={() => handleTogglePlay(item)}
      >
        <View style={styles.coverWrapper}>
          <Image source={{ uri: item.cover }} style={styles.soundCover} />
          <View style={styles.playCenterCircle}>
            <Ionicons name={isPlayingThis ? "pause" : "play"} size={20} color="#fff" />
          </View>
        </View>

        <View style={styles.soundDetails}>
          <View style={styles.soundHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.soundTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.soundCreator}>By {item.creator}</Text>
            </View>
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{item.duration}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="waveform" size={14} color={VOEXITheme.colors.primary} />
              <Text style={styles.statText}>{item.usage}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="auto-fix" size={14} color="#00F2FE" />
              <Text style={styles.statText}>{item.category}</Text>
            </View>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.useBtn} onPress={() => handleUseSound(item)}>
              <LinearGradient colors={[VOEXITheme.colors.primary, '#6d28d9']} style={styles.useBtnGradient}>
                 <Ionicons name="sparkles" size={14} color="#fff" />
                 <Text style={styles.useBtnText}>USE SOUND</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.iconGroup}>
              <TouchableOpacity style={styles.actionIconCircle} onPress={() => handleToggleSave(item.id)}>
                <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={18} color={isBookmarked ? VOEXITheme.colors.primary : "#fff"} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIconCircle} onPress={() => Share.share({ message: `Listen to ${item.title} on VOEXI Remix Center!` })}>
                <Ionicons name="share-social-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />

      {/* BACKGROUND GRADIENT */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={['#1a1a2e', '#050505']} style={{ flex: 1 }} />
        <View style={styles.glowSpot} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* TOP HEADER */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
             <View>
                <Text style={styles.welcomeText}>VOEXI HUB</Text>
                <Text style={styles.mainTitle}>Remix Center</Text>
             </View>
             <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
                <Ionicons name="close" size={24} color="#fff" />
             </TouchableOpacity>
          </View>

          {/* SEARCH BAR */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInner}>
              <Ionicons name="search" size={20} color="#666" style={{ marginRight: 10 }} />
              <TextInput
                placeholder="Search sounds, creators, tracks..."
                placeholderTextColor="#666"
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color="#888" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* TABS / FILTERS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {['Trending', 'Originals', 'Remixes', 'Saved'].map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => {
                 Haptics.selectionAsync().catch(() => {});
                 setActiveTab(tab);
              }}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              {activeTab === tab && <View style={styles.activeDot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* CATEGORIES PILLS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ paddingHorizontal: 20 }}>
           {CATEGORIES.map(cat => {
             const isSel = activeCategory === cat;
             return (
               <TouchableOpacity
                 key={cat}
                 onPress={() => {
                   Haptics.selectionAsync().catch(() => {});
                   setActiveCategory(cat);
                 }}
                 style={[styles.catPill, isSel && styles.catPillActive]}
               >
                 <Text style={[styles.catPillText, isSel && { color: '#fff' }]}>{cat}</Text>
               </TouchableOpacity>
             );
           })}
        </ScrollView>

        {/* CENTRALIZED REMIX LIBRARY SECTION */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Global Remix Tracks ({filteredSounds.length})</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={VOEXITheme.colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredSounds}
            renderItem={renderSoundCard}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: activeTrack ? 120 : 80 }}
            ListEmptyComponent={
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Ionicons name="musical-notes-outline" size={48} color="#333" />
                <Text style={{ color: '#888', marginTop: 12, fontWeight: 'bold', fontSize: 13 }}>No sounds found in this selection.</Text>
              </View>
            }
          />
        )}

        {/* FLOATING PERSISTENT MUSIC PLAYER BAR */}
        {activeTrack && (
          <TouchableOpacity
            style={styles.floatingPlayerBar}
            activeOpacity={0.95}
            onPress={() => setShowFullPlayerModal(true)}
          >
            <View style={styles.miniProgressTrack}>
              <View
                style={[
                  styles.miniProgressFill,
                  { width: `${Math.min(100, Math.max(0, (positionMillis / (durationMillis || 1)) * 100))}%` }
                ]}
              />
            </View>

            <View style={styles.floatingPlayerInner}>
              <Image source={{ uri: activeTrack.cover }} style={styles.floatingCover} />

              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={styles.floatingTitle} numberOfLines={1}>
                  {activeTrack.title}
                </Text>
                <Text style={styles.floatingCreator} numberOfLines={1}>
                  @{activeTrack.creator} • {formatTime(positionMillis)} / {formatTime(durationMillis)}
                </Text>
              </View>

              <TouchableOpacity style={styles.floatingPlayBtn} onPress={() => handleTogglePlay(activeTrack)}>
                <Ionicons name={isPlaying ? "pause" : "play"} size={22} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.floatingUseBtn} onPress={() => handleUseSound(activeTrack)}>
                <LinearGradient colors={[VOEXITheme.colors.primary, '#6d28d9']} style={styles.floatingUseGradient}>
                  <Ionicons name="sparkles" size={12} color="#fff" />
                  <Text style={styles.floatingUseText}>USE</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        {/* EXPANDED FULL SCREEN MUSIC PLAYER MODAL */}
        <Modal visible={showFullPlayerModal} animationType="slide" transparent onRequestClose={() => setShowFullPlayerModal(false)}>
          <View style={styles.fullPlayerOverlay}>
            <LinearGradient colors={['#1F1135', '#050508']} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={{ flex: 1 }}>
              {/* Modal Header */}
              <View style={styles.fullPlayerHeader}>
                <TouchableOpacity style={styles.backCircle} onPress={() => setShowFullPlayerModal(false)}>
                  <Ionicons name="chevron-down" size={26} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.fullPlayerHeaderTitle}>VOEXI MUSIC CONSOLE</Text>
                <TouchableOpacity style={styles.backCircle} onPress={() => Share.share({ message: `Check out ${activeTrack?.title} on VOEXI!` })}>
                  <Ionicons name="share-social-outline" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 }}>
                {/* Vinyl Album Cover */}
                <View style={styles.vinylContainer}>
                  <Image source={{ uri: activeTrack?.cover }} style={styles.fullCoverImg} />
                  <View style={styles.vinylCenterDot} />
                </View>

                {/* Title & Artist */}
                <Text style={styles.fullTrackTitle} numberOfLines={1}>
                  {activeTrack?.title || 'Neural Frequency'}
                </Text>
                <Text style={styles.fullTrackCreator}>
                  Produced by @{activeTrack?.creator || 'VOEXI'}
                </Text>

                {/* Progress Slider Bar */}
                <View style={styles.fullProgressContainer}>
                  <View style={styles.fullProgressTrack}>
                    <View
                      style={[
                        styles.fullProgressFill,
                        { width: `${Math.min(100, Math.max(0, (positionMillis / (durationMillis || 1)) * 100))}%` }
                      ]}
                    />
                  </View>

                  <View style={styles.fullTimeRow}>
                    <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
                    <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
                  </View>
                </View>

                {/* Full Transport Controls */}
                <View style={styles.transportRow}>
                  <TouchableOpacity onPress={() => handleToggleSave(activeTrack?.id)}>
                    <Ionicons name={savedIds.has(activeTrack?.id) ? "bookmark" : "bookmark-outline"} size={26} color={savedIds.has(activeTrack?.id) ? VOEXITheme.colors.primary : "#888"} />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => {
                    if (soundRef.current) {
                      const newPos = Math.max(0, positionMillis - 5000);
                      soundRef.current.setPositionAsync(newPos).catch(() => {});
                    }
                  }}>
                    <Ionicons name="refresh-circle-outline" size={36} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.bigPlayCircle} onPress={() => handleTogglePlay(activeTrack)}>
                    <Ionicons name={isPlaying ? "pause" : "play"} size={36} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => {
                    if (soundRef.current) {
                      const newPos = Math.min(durationMillis, positionMillis + 5000);
                      soundRef.current.setPositionAsync(newPos).catch(() => {});
                    }
                  }}>
                    <Ionicons name="play-skip-forward-outline" size={32} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => Alert.alert("AUDIO ENHANCER", "HD Neural Equalizer Active")}>
                    <Ionicons name="options-outline" size={24} color="#00F2FE" />
                  </TouchableOpacity>
                </View>

                {/* Big Use Sound Button */}
                <TouchableOpacity
                  style={styles.bigUseBtn}
                  onPress={() => {
                    setShowFullPlayerModal(false);
                    handleUseSound(activeTrack);
                  }}
                >
                  <LinearGradient colors={[VOEXITheme.colors.primary, '#6d28d9']} style={styles.bigUseGradient}>
                    <MaterialCommunityIcons name="auto-fix" size={22} color="#fff" />
                    <Text style={styles.bigUseText}>USE THIS SOUND IN REMIX STUDIO</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  glowSpot: { position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: VOEXITheme.colors.primary, opacity: 0.1 },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  welcomeText: { color: VOEXITheme.colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  mainTitle: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 2 },
  backCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  searchContainer: {},
  searchInner: { flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 16, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
  tabScroll: { marginBottom: 10 },
  tabItem: { marginRight: 25, paddingVertical: 8, alignItems: 'center' },
  tabItemActive: {},
  tabText: { color: '#555', fontSize: 15, fontWeight: '800' },
  tabTextActive: { color: '#fff' },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: VOEXITheme.colors.primary, marginTop: 4 },
  catScroll: { marginBottom: 15 },
  catPill: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  catPillActive: { backgroundColor: VOEXITheme.colors.primary, borderColor: VOEXITheme.colors.primary },
  catPillText: { color: '#aaa', fontSize: 12, fontWeight: 'bold' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  soundCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  soundCardActive: { borderColor: VOEXITheme.colors.primary, backgroundColor: 'rgba(168, 85, 247, 0.08)' },
  coverWrapper: { width: 85, height: 85, borderRadius: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  soundCover: { width: '100%', height: '100%', position: 'absolute' },
  playCenterCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  soundDetails: { flex: 1, marginLeft: 14, justifyContent: 'space-between' },
  soundHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  soundTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  soundCreator: { color: '#666', fontSize: 11, marginTop: 2 },
  durationBadge: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  durationText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  statsRow: { flexDirection: 'row', gap: 15, marginTop: 4 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: '#888', fontSize: 11, fontWeight: '600' },
  cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  useBtn: { borderRadius: 10, overflow: 'hidden' },
  useBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  useBtnText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  iconGroup: { flexDirection: 'row', gap: 10 },
  actionIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },

  // FLOATING MINI PLAYER
  floatingPlayerBar: { position: 'absolute', bottom: 15, left: 15, right: 15, backgroundColor: '#120B20', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)', elevation: 15, shadowColor: '#A855F7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10 },
  miniProgressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.1)', width: '100%' },
  miniProgressFill: { height: '100%', backgroundColor: VOEXITheme.colors.primary },
  floatingPlayerInner: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  floatingCover: { width: 42, height: 42, borderRadius: 12 },
  floatingTitle: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  floatingCreator: { color: '#888', fontSize: 10, marginTop: 2 },
  floatingPlayBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  floatingUseBtn: { borderRadius: 12, overflow: 'hidden' },
  floatingUseGradient: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8 },
  floatingUseText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  // EXPANDED FULL PLAYER MODAL
  fullPlayerOverlay: { flex: 1, backgroundColor: '#050508' },
  fullPlayerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  fullPlayerHeaderTitle: { color: VOEXITheme.colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  vinylContainer: { width: width * 0.65, height: width * 0.65, borderRadius: (width * 0.65) / 2, overflow: 'hidden', borderWidth: 4, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 25, elevation: 15 },
  fullCoverImg: { width: '100%', height: '100%' },
  vinylCenterDot: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: '#000', borderWidth: 3, borderColor: '#fff' },
  fullTrackTitle: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  fullTrackCreator: { color: '#888', fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 30 },
  fullProgressContainer: { width: '100%', marginBottom: 30 },
  fullProgressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  fullProgressFill: { height: '100%', backgroundColor: VOEXITheme.colors.primary, borderRadius: 3 },
  fullTimeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  timeText: { color: '#666', fontSize: 11, fontWeight: '600' },
  transportRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%', marginBottom: 35 },
  bigPlayCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: VOEXITheme.colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 10 },
  bigUseBtn: { width: '100%', height: 56, borderRadius: 18, overflow: 'hidden' },
  bigUseGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  bigUseText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 }
});