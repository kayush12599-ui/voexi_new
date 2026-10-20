import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Dimensions, StatusBar, Pressable, ScrollView, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { VOEXITheme } from '../constants/theme';
import { getLocalMediaServerUrl } from '../lib/bunnyStorage';
import { VoexiIcon } from '../components/VoexiIcon';
import { formatVxId } from '../components/VXIdentityCard';

const { width } = Dimensions.get('window');
const cardWidth = (width - 42) / 2;

const TRENDING_CHIPS = ['Phonk', 'Cyberpunk', 'Neural Art', 'Gaming', 'Tech', 'Music', 'Reels'];
const FILTER_TABS = ['ALL', 'CHANNELS', 'VIDEOS', 'REELS', 'PHOTOS', 'ARTICLES'];

/* --- 📡 CREATOR CHANNEL CARD COMPONENT --- */
const SearchChannelCard = memo(({ item }: any) => {
  const router = useRouter();
  const avatarUri = item.avatar_url && item.avatar_url.startsWith('http')
    ? item.avatar_url
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(item.username || 'Creator')}&background=A855F7&color=fff&bold=true`;

  const officialVxNo = formatVxId(item.vx_id_number || item.vx_number || item.phone_number || item.id);

  return (
    <TouchableOpacity
      style={styles.channelCard}
      onPress={() => router.push(`/user/${item.id}`)}
      activeOpacity={0.85}
    >
      <Image source={{ uri: avatarUri }} style={styles.channelAvatar} />
      <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.channelUsername} numberOfLines={1}>@{item.username}</Text>
          <Ionicons name="checkmark-circle" size={14} color="#00F2FE" />
        </View>
        <Text style={styles.channelTitle} numberOfLines={1}>{item.channel_name || 'VOEXI Channel Station'}</Text>
        <Text style={styles.channelMetaTxt} numberOfLines={1}>💳 IDENTITY NO: {officialVxNo}</Text>
      </View>

      <TouchableOpacity onPress={() => router.push(`/user/${item.id}`)} style={styles.channelVisitBtn}>
        <LinearGradient colors={['#A855F7', '#6366F1']} style={styles.channelVisitGradient}>
          <Text style={styles.channelVisitTxt}>VISIT ➔</Text>
        </LinearGradient>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

/* --- 🎬 MEDIA CONTENT GRID CARD COMPONENT --- */
const SearchGridCard = memo(({ item }: any) => {
  const router = useRouter();
  const pt = (item.post_type || item.category || '').toLowerCase();
  const isReel = item.is_reel === true || pt === 'reels' || pt === 'reel';
  const isPhoto = pt === 'photo' || pt === 'photos' || item.isPhoto;
  const isWriting = pt === 'writing' || pt === 'letter' || item.isText;

  const thumbnail = item.thumbnail_url || item.media_url || '';
  const title = item.title || item.filename || 'VOEXI Signal';
  const uploader = item.profiles?.username || item.profiles?.channel_name || item.uploader || 'creator';

  const handleCardPress = () => {
    if (isReel) {
      router.push({ pathname: '/(tabs)/video-feed', params: { id: item.id } });
    } else if (isPhoto || isWriting) {
      router.push({
        pathname: '/photo-feed',
        params: {
          id: String(item.id || ''),
          title: String(title),
          description: String(item.description || ''),
          content: String(item.content || item.description || ''),
          media_url: String(item.media_url || thumbnail),
          thumbnail_url: String(thumbnail),
          post_type: String(item.post_type || 'Photo'),
          uploader: String(uploader)
        }
      });
    } else {
      router.push(`/video/${item.id}`);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.gridCard, { width: cardWidth }]}
      onPress={handleCardPress}
      activeOpacity={0.85}
    >
      <View style={styles.gridMediaFrame}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.gridMediaImg} contentFit="cover" />
        ) : (
          <View style={styles.gridFallbackBox}>
            <Ionicons name={isWriting ? "document-text-outline" : "film-outline"} size={28} color="#475569" />
          </View>
        )}

        {/* TYPE BADGE */}
        <View style={styles.gridTypeBadge}>
          <Text style={styles.gridTypeTxt}>
            {isReel ? '🎬 REEL' : isPhoto ? '🖼️ PHOTO' : isWriting ? '✍️ ARTICLE' : '📹 VIDEO'}
          </Text>
        </View>

        {/* STATS OVERLAY */}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.gridBottomGradient}>
          <View style={styles.gridStatsRow}>
            <Text style={styles.gridViewsTxt}>👁️ {Number(item.views_count || item.views || 0).toLocaleString()}</Text>
            <Text style={styles.gridLikesTxt}>❤️ {Number(item.likes_count || item.likes || 0).toLocaleString()}</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.gridCardMeta}>
        <Text style={styles.gridTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.gridUploader} numberOfLines={1}>@{uploader}</Text>
      </View>
    </TouchableOpacity>
  );
});

/* --- MAIN SEARCH PORTAL SCREEN --- */
export default function SearchPortal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [channelsList, setChannelsList] = useState<any[]>([]);
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [allRawChannels, setAllRawChannels] = useState<any[]>([]);
  const [allRawMedia, setAllRawMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initialLoadData();
  }, []);

  const initialLoadData = async () => {
    setLoading(true);
    try {
      const localServerUrl = getLocalMediaServerUrl();

      // Parallel fetch from Supabase DB & Local Media Server
      const [supabasePostsRes, supabaseProfilesRes, penDriveRes] = await Promise.allSettled([
        supabase.from('posts').select('*, profiles:profiles!posts_user_id_fkey(*)').order('created_at', { ascending: false }).limit(60),
        supabase.from('profiles').select('*').limit(30),
        fetch(`${localServerUrl}/files.json`).catch(() => null)
      ]);

      let dbPosts = (supabasePostsRes.status === 'fulfilled' && supabasePostsRes.value.data) ? supabasePostsRes.value.data : [];
      let dbProfiles = (supabaseProfilesRes.status === 'fulfilled' && supabaseProfilesRes.value.data) ? supabaseProfilesRes.value.data : [];

      let serverFiles: any[] = [];
      if (penDriveRes.status === 'fulfilled' && penDriveRes.value && penDriveRes.value.ok) {
        try {
          const parsed = await penDriveRes.value.json();
          if (Array.isArray(parsed)) serverFiles = parsed;
        } catch (e) {}
      }

      let localUploads: any[] = [];
      try {
        const localRaw = await AsyncStorage.getItem('@my_local_uploads');
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed)) localUploads = parsed;
        }
      } catch (e) {}

      // 1. EXTRACT & MAP ALL CHANNELS
      const channelMap = new Map<string, any>();

      dbProfiles.forEach((p: any) => {
        const handle = String(p.username || p.channel_name || '').replace('@', '').trim();
        if (handle && !channelMap.has(handle.toLowerCase())) {
          channelMap.set(handle.toLowerCase(), {
            id: p.id,
            username: handle,
            channel_name: p.channel_name || handle,
            phone_number: p.phone_number || '',
            vx_id_number: p.vx_id_number || p.vx_number || '',
            avatar_url: p.avatar_url && p.avatar_url.startsWith('http') ? p.avatar_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(handle)}&background=A855F7&color=fff&bold=true`
          });
        }
      });

      serverFiles.forEach((f: any) => {
        const u = String(f.uploader || '').replace('@', '').trim();
        if (u && !channelMap.has(u.toLowerCase())) {
          channelMap.set(u.toLowerCase(), {
            id: f.user_id || u,
            username: u,
            channel_name: f.uploader || `${u} Station`,
            phone_number: '',
            vx_id_number: f.vx_number || f.filename || '',
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(u)}&background=A855F7&color=fff&bold=true`
          });
        }
      });

      localUploads.forEach((p: any) => {
        const u = String(p.profiles?.username || p.uploader || p.username || '').replace('@', '').trim();
        if (u && !channelMap.has(u.toLowerCase())) {
          channelMap.set(u.toLowerCase(), {
            id: p.user_id || u,
            username: u,
            channel_name: p.profiles?.channel_name || p.channel_name || u,
            phone_number: '',
            vx_id_number: p.profiles?.vx_id_number || p.vx_number || '',
            avatar_url: p.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u)}&background=A855F7&color=fff&bold=true`
          });
        }
      });

      const extractedChannels = Array.from(channelMap.values());
      setAllRawChannels(extractedChannels);
      setChannelsList(extractedChannels);

      // 2. EXTRACT & MAP ALL MEDIA POSTS
      const mappedServerFiles = serverFiles.map((f: any) => ({
        id: f.filename || f.id || `server_${Date.now()}_${Math.random()}`,
        filename: f.filename,
        title: f.title || f.filename,
        description: f.description || '',
        content: f.description || f.content || '',
        post_type: (f.category === 'WRITING' || f.isText) ? 'Writing' : (f.category === 'PHOTOS' || f.isPhoto ? 'Photo' : 'Video'),
        media_url: f.media_url || `${localServerUrl}/${encodeURIComponent(f.filename)}`,
        thumbnail_url: f.customThumb || f.media_url || `${localServerUrl}/${encodeURIComponent(f.filename)}`,
        likes_count: f.likes || 0,
        comments_count: f.comments ? f.comments.length : 0,
        views_count: f.views || 0,
        created_at: f.uploaded_at || new Date().toISOString(),
        uploader: f.uploader,
        profiles: { username: f.uploader || 'admin_creator', channel_name: f.uploader || 'VOEXI Station' }
      }));

      const combinedMedia = [...localUploads, ...mappedServerFiles, ...dbPosts];
      const seen = new Set<string>();
      let finalMedia: any[] = [];

      for (const item of combinedMedia) {
        if (!item) continue;
        const key = item.id || item.media_url || item.title;
        if (key && !seen.has(key)) {
          seen.add(key);
          finalMedia.push(item);
        }
      }

      setAllRawMedia(finalMedia);
      setMediaList(finalMedia);
    } catch (e) {
      console.error("[SEARCH PORTAL INITIAL LOAD ERROR]:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchTextChange = (text: string) => {
    setSearchQuery(text);
    const query = text.trim().toLowerCase();
    const cleanQuery = query.replace('@', '').trim();
    const digitsOnly = cleanQuery.replace(/[^0-9]/g, '');

    if (!cleanQuery) {
      setChannelsList(allRawChannels);
      setMediaList(allRawMedia);
      return;
    }

    if (Haptics) Haptics.selectionAsync().catch(() => {});

    // 1. FILTER CHANNELS
    const filteredChannels = allRawChannels.filter((c: any) => {
      const u = String(c.username || '').toLowerCase();
      const name = String(c.channel_name || '').toLowerCase();
      const phone = String(c.phone_number || '').replace(/[^0-9]/g, '');
      const vxNo = String(c.vx_id_number || c.vx_number || '').toLowerCase();

      const matchText = u.includes(cleanQuery) || name.includes(cleanQuery) || vxNo.includes(cleanQuery);
      const matchDigits = digitsOnly.length >= 2 && (phone.includes(digitsOnly) || vxNo.replace(/[^0-9]/g, '').includes(digitsOnly));

      return matchText || matchDigits;
    });

    setChannelsList(filteredChannels);

    // 2. FILTER MEDIA POSTS
    const filteredMedia = allRawMedia.filter((m: any) => {
      const t = String(m.title || '').toLowerCase();
      const d = String(m.description || '').toLowerCase();
      const fn = String(m.filename || '').toLowerCase();
      const id = String(m.id || '').toLowerCase();
      const u = String(m.profiles?.username || m.uploader || '').toLowerCase();
      const fnDigits = (fn + id).replace(/[^0-9]/g, '');

      const matchText = t.includes(cleanQuery) || d.includes(cleanQuery) || fn.includes(cleanQuery) || id.includes(cleanQuery) || u.includes(cleanQuery);
      const matchDigits = digitsOnly.length >= 2 && fnDigits.includes(digitsOnly);

      return matchText || matchDigits;
    });

    setMediaList(filteredMedia);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setChannelsList(allRawChannels);
    setMediaList(allRawMedia);
  };

  // Filter media items based on tab pill selection
  const displayedMediaList = useMemo(() => {
    if (activeFilter === 'CHANNELS') return [];
    if (activeFilter === 'VIDEOS') return mediaList.filter(m => m.post_type === 'Video');
    if (activeFilter === 'REELS') return mediaList.filter(m => m.is_reel === true || m.post_type === 'Reels' || m.post_type === 'Reel');
    if (activeFilter === 'PHOTOS') return mediaList.filter(m => m.post_type === 'Photo');
    if (activeFilter === 'ARTICLES') return mediaList.filter(m => m.post_type === 'Writing');
    return mediaList;
  }, [mediaList, activeFilter]);

  const displayedChannelsList = useMemo(() => {
    if (activeFilter === 'VIDEOS' || activeFilter === 'REELS' || activeFilter === 'PHOTOS' || activeFilter === 'ARTICLES') {
      return [];
    }
    return channelsList;
  }, [channelsList, activeFilter]);

  return (
    <View style={styles.screenContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* INTEGRATED SEARCH BAR WITH INLINE BACK BUTTON */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBarInner}>
            <TouchableOpacity onPress={() => router.back()} style={styles.inlineBackBtn}>
              <Ionicons name="arrow-back" size={18} color="#FFF" />
            </TouchableOpacity>

            <Ionicons name="search" size={18} color="#A855F7" style={{ marginLeft: 4 }} />

            <TextInput
              style={styles.searchInput}
              placeholder="Search @channel, username, VX number, title..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={handleSearchTextChange}
              selectionColor="#A855F7"
            />

            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* FILTER CATEGORY PILLS */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            {FILTER_TABS.map(tab => {
              const isSel = activeFilter === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterPill, isSel && styles.filterPillActive]}
                  onPress={() => {
                    setActiveFilter(tab);
                    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  }}
                >
                  <Text style={[styles.filterPillTxt, isSel && styles.filterPillTxtActive]}>{tab}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#A855F7" />
            <Text style={styles.loadingTxt}>INITIALIZING SEARCH PORTAL...</Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator={false}>

            {/* 1. RISING FREQUENCIES TRENDING CHIPS WHEN NO SEARCH QUERY (TOP) */}
            {!searchQuery && activeFilter === 'ALL' && (
              <View style={styles.trendingSection}>
                <View style={styles.trendingHeaderRow}>
                  <Ionicons name="flame" size={14} color="#FFD700" />
                  <Text style={styles.trendingHeaderTxt}>RISING FREQUENCIES • TRENDING SPECTRUM</Text>
                </View>
                <View style={styles.chipCloud}>
                  {TRENDING_CHIPS.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      style={styles.chipPill}
                      onPress={() => handleSearchTextChange(tag)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.chipTxt}>#{tag.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* 2. MATCHING CHANNELS / CREATORS SECTION */}
            {displayedChannelsList.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionHeaderTxt}>📡 MATCHING CHANNELS & STATIONS ({displayedChannelsList.length})</Text>
                {displayedChannelsList.map(item => (
                  <SearchChannelCard key={`chan_${item.id}_${item.username}`} item={item} />
                ))}
              </View>
            )}

            {/* 3. MATCHING MEDIA POSTS 2-COLUMN GRID */}
            {displayedMediaList.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionHeaderTxt}>🎬 MATCHING SIGNALS & MEDIA ({displayedMediaList.length})</Text>
                <View style={styles.mediaGridRow}>
                  {displayedMediaList.map(item => (
                    <SearchGridCard key={`media_${item.id}`} item={item} />
                  ))}
                </View>
              </View>
            )}

            {/* 4. EMPTY SEARCH STATE NOTICE */}
            {searchQuery.length > 0 && displayedChannelsList.length === 0 && displayedMediaList.length === 0 && (
              <View style={styles.emptyNoticeBox}>
                <Ionicons name="search-outline" size={48} color="#475569" />
                <Text style={styles.emptyNoticeTitle}>NO MATCHING STATIONS OR MEDIA</Text>
                <Text style={styles.emptyNoticeSub}>Try searching for a different handle, username, or VX number.</Text>
              </View>
            )}

          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#05050A' },
  searchBarContainer: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#0A0A10', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  searchBarInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#121222', borderRadius: 20, height: 48, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)' },
  inlineBackBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', marginRight: 2 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 13, fontWeight: '600', marginLeft: 8 },
  clearBtn: { padding: 4 },

  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  filterPillActive: { backgroundColor: 'rgba(168, 85, 247, 0.25)', borderColor: '#A855F7' },
  filterPillTxt: { color: '#64748B', fontSize: 10, fontWeight: '800' },
  filterPillTxtActive: { color: '#FFF', fontWeight: '900' },

  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt: { color: '#A855F7', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  sectionContainer: { paddingHorizontal: 15, marginTop: 14 },
  sectionHeaderTxt: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12 },

  // CHANNEL CARD STYLES
  channelCard: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F0F1A', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.4)', marginBottom: 10 },
  channelAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#A855F7' },
  channelUsername: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  channelTitle: { color: '#94A3B8', fontSize: 11, fontWeight: '700', marginTop: 1 },
  channelMetaTxt: { color: '#38BDF8', fontSize: 10, fontWeight: '800', marginTop: 2 },
  channelVisitBtn: { borderRadius: 10, overflow: 'hidden' },
  channelVisitGradient: { paddingHorizontal: 12, paddingVertical: 6 },
  channelVisitTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  // MEDIA GRID CARD STYLES
  mediaGridRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridCard: { marginBottom: 16, borderRadius: 16, backgroundColor: '#0A0A10', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  gridMediaFrame: { width: '100%', aspectRatio: 3 / 4, backgroundColor: '#111', position: 'relative', overflow: 'hidden' },
  gridMediaImg: { width: '100%', height: '100%' },
  gridFallbackBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A14' },
  gridTypeBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(10, 10, 18, 0.85)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  gridTypeTxt: { color: '#FFF', fontSize: 8, fontWeight: '900' },
  gridBottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 45, justifyContent: 'flex-end', paddingHorizontal: 8, paddingBottom: 6 },
  gridStatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gridViewsTxt: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  gridLikesTxt: { color: '#FF017E', fontSize: 9, fontWeight: '800' },
  gridCardMeta: { padding: 10 },
  gridTitle: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  gridUploader: { color: '#64748B', fontSize: 10, fontWeight: '700', marginTop: 2 },

  // TRENDING CHIPS
  trendingSection: { paddingHorizontal: 15, marginTop: 12, marginBottom: 20 },
  trendingHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  trendingHeaderTxt: { color: '#FFD700', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  chipCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  chipPillActive: {
    backgroundColor: 'rgba(0, 242, 254, 0.25)',
    borderColor: '#00F2FE',
  },
  chipTxt: { color: '#C084FC', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  chipTxtActive: { color: '#00F2FE', fontWeight: '900' },

  emptyNoticeBox: { padding: 40, alignItems: 'center' },
  emptyNoticeTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: 'bold', marginTop: 12 },
  emptyNoticeSub: { color: '#64748B', fontSize: 11, marginTop: 4, textAlign: 'center' }
});
