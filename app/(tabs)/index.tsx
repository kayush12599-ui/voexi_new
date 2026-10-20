import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, StatusBar, ScrollView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { VOEXITheme } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { VoexiIcon } from '../../components/VoexiIcon';
import PostCard from '../../components/PostCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NeuralAuditModal } from '../../components/moderation/NeuralAuditModal';
import CreateMenuHoloOrbit from '../../components/CreateMenuHoloOrbit';
import { TopHeaderDiamondBadge } from '../../components/TopHeaderDiamondBadge';

const isReelPost = (p: any): boolean => {
  if (!p) return true;

  // Photos, Visual Portfolios & Articles are NEVER Reels!
  const mediaType = String(p.media_type || p.post_type || p.category || '').toLowerCase().trim();
  if (mediaType === 'photo' || mediaType === 'image' || mediaType === 'photos' || mediaType === 'writing' || mediaType === 'letter' || mediaType === 'text') {
    return false;
  }

  // 1. Explicit Boolean / String Flags
  if (p.is_reel === true || p.is_reel === 'true' || p.is_story === true || p.is_story === 'true') return true;

  // 2. Post Type / Category Check
  const pt = String(p.post_type || p.category || '').toLowerCase().trim();
  if (pt.includes('reel') || pt.includes('story') || pt.includes('short') || pt === 'story' || pt === 'story_mini') return true;

  // 3. Title & Description Keywords Check
  const title = String(p.title || '').toLowerCase();
  const desc = String(p.description || '').toLowerCase();
  if (
    title.includes('reel') ||
    title.includes('short') ||
    title.includes('story') ||
    desc.includes('#reel') ||
    desc.includes('#reels') ||
    desc.includes('#story') ||
    desc.includes('#shorts')
  ) {
    return true;
  }

  // 4. Media URL Keywords Check
  const url = String(p.media_url || p.video_url || '').toLowerCase();
  if (url.includes('reel') || url.includes('short') || url.includes('story')) return true;

  // 5. Reels Studio Metadata (crop_fit / crop_x / crop_y / crop_scale)
  if (p.crop_fit !== undefined || p.crop_x !== undefined || p.crop_y !== undefined || p.crop_scale !== undefined) {
    return true;
  }

  // 6. Strict Vertical 9:16 Aspect Ratio Detection
  const w = Number(p.width) || 0;
  const h = Number(p.height) || 0;
  const ratio = Number(p.aspect_ratio) || 0;

  if (h > 0 && w > 0 && h > w) return true;
  if (ratio > 0 && ratio < 0.95) return true;

  return false;
};

// Fast fetch with timeout to prevent local server hanging
const fetchWithTimeout = async (url: string, timeoutMs = 1200) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return response;
  } catch {
    return null;
  }
};

const sanitizeCreatorInfo = (rawName?: string | null, rawUser?: string | null) => {
  let name = (rawName || '').trim();
  let username = (rawUser || '').trim().toLowerCase().replace('@', '');

  const isGeneric = !name || name === 'VOEXI Creator' || name === 'VOEXI Broadcaster' || name === 'broadcaster' || name === 'admin_creator' || name.startsWith('user_') || name === 'user';

  if (isGeneric) {
    name = 'VOEXI Official';
    username = 'voexi_official';
  } else {
    if (!username || username === 'broadcaster' || username.startsWith('user_')) {
      username = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
  }

  return { name, username };
};

const getValidAvatarUrl = (rawUrl?: string | null, name: string = 'User'): string => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=A855F7&color=fff&bold=true`;
  }
  let url = rawUrl.trim();
  if (url === '' || url === 'null' || url === 'undefined') {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=A855F7&color=fff&bold=true`;
  }
  if (url.startsWith('//')) {
    return 'https:' + url;
  }
  // Local Server 2 Uploads
  if (url.startsWith('/uploads/') || url.startsWith('/files/') || url.startsWith('/avatar/') || url.startsWith('/logos/')) {
    return `http://192.168.31.39:8080${url}`;
  }
  if (url.startsWith('uploads/') || url.startsWith('files/') || url.startsWith('avatar/') || url.startsWith('logos/')) {
    return `http://192.168.31.39:8080/${url}`;
  }
  if (url.startsWith('/')) {
    return `https://voexi.b-cdn.net${url}`;
  }
  if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('content://')) {
    return `https://voexi.b-cdn.net/${url}`;
  }
  return url;
};

export default function HomeScreen () {
  const router = useRouter();
  const { isLight } = useTheme();
  const insets = useSafeAreaInsets();

  const [posts, setPosts] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [hasMyStory, setHasMyStory] = useState(false);
  const [auditTarget, setAuditTarget] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState('DISCOVER');
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const fetchData = async (isRefreshing = false) => {
    // 1. INSTANT LOCAL CACHE LOAD (0ms delay UI render)
    try {
      const localRaw = await AsyncStorage.getItem('@my_local_uploads');
      if (localRaw) {
        const localList = JSON.parse(localRaw);
        if (Array.isArray(localList)) {
          const filtered = localList.filter((p: any) => !isReelPost(p));
          if (filtered.length > 0) {
            setPosts(prev => prev.length === 0 ? filtered : prev);
            setLoading(false);
          }
        }
      }
    } catch {
      // Local cache load optional
    }

    if (!isRefreshing && posts.length === 0) setLoading(true);

    try {
      // 2. PARALLEL NETWORK FETCH (ALL REQUESTS FIRE AT THE SAME TIME)
      const [sessionRes, supabasePostsRes, penDriveRes, creatorsRes, s2ProfilesRes] = await Promise.allSettled([
        supabase.auth.getSession(),
        supabase
          .from('posts')
          .select('*, profiles:profiles!posts_user_id_fkey(*)')
          .neq('is_reel', true)
          .not('post_type', 'ilike', '%reel%')
          .not('post_type', 'ilike', '%story%')
          .order('created_at', { ascending: false })
          .limit(50),
        fetchWithTimeout('http://192.168.31.39:8080/files.json', 1200),
        supabase.from('profiles').select('*').limit(15),
        fetchWithTimeout('http://192.168.31.39:8080/profiles.json', 1200),
      ]);

      const session = sessionRes.status === 'fulfilled' ? sessionRes.value.data.session : null;
      const myId = session?.user?.id || null;
      setUserId(myId);

      let supabasePosts = (supabasePostsRes.status === 'fulfilled' && supabasePostsRes.value.data)
        ? supabasePostsRes.value.data
        : [];

      // Fallback query if profiles join returned empty
      if (supabasePosts.length === 0) {
        try {
          const { data: rawFallback } = await supabase
            .from('posts')
            .select('*')
            .neq('is_reel', true)
            .not('post_type', 'ilike', '%reel%')
            .not('post_type', 'ilike', '%story%')
            .order('created_at', { ascending: false })
            .limit(50);
          if (rawFallback) supabasePosts = rawFallback;
        } catch {
          // Fallback fetch optional
        }
      }

      // Process PenDrive files
      let penDriveFiles: any[] = [];
      if (penDriveRes.status === 'fulfilled' && penDriveRes.value && penDriveRes.value.ok) {
        try {
          const allPenFiles = await penDriveRes.value.json();
          if (Array.isArray(allPenFiles)) penDriveFiles = allPenFiles;
        } catch {
          // PenDrive JSON parse optional
        }
      }

      // Build Server 2 Profiles Map (handles both Array & Dictionary formats)
      let server2ProfilesMap: Record<string, any> = {};
      if (s2ProfilesRes.status === 'fulfilled' && s2ProfilesRes.value && s2ProfilesRes.value.ok) {
        try {
          const s2Data = await s2ProfilesRes.value.json();
          if (Array.isArray(s2Data)) {
            s2Data.forEach((prof: any) => {
              if (prof.id) server2ProfilesMap[prof.id] = prof;
              if (prof.user_id) server2ProfilesMap[prof.user_id] = prof;
              if (prof.username) server2ProfilesMap[prof.username] = prof;
              if (prof.channel_name) server2ProfilesMap[prof.channel_name] = prof;
              if (prof.uploader) server2ProfilesMap[prof.uploader] = prof;
            });
          } else if (s2Data && typeof s2Data === 'object') {
            server2ProfilesMap = s2Data;
          }
        } catch {
          // Server 2 profiles JSON parse optional
        }
      }

      // Fetch AsyncStorage local uploads
      let localUploadsFiltered: any[] = [];
      try {
        const localRaw = await AsyncStorage.getItem('@my_local_uploads');
        if (localRaw) {
          const localUploads = JSON.parse(localRaw);
          if (Array.isArray(localUploads)) {
            localUploadsFiltered = localUploads.filter((p: any) => !isReelPost(p));
          }
        }
      } catch {
        // Local uploads fetch optional
      }

      // Combine Supabase DB Posts FIRST, then Local Uploads, then PenDrive
      const existingUrls = new Set(supabasePosts.map((p: any) => p.media_url || p.video_url));
      const newPenDrivePosts = penDriveFiles.filter((p: any) => !existingUrls.has(p.media_url || p.video_url));

      const rawCombined = [...supabasePosts, ...localUploadsFiltered, ...newPenDrivePosts];
      const seenUrls = new Set<string>();

      const allCombinedPosts = rawCombined.filter(p => {
        const url = p?.media_url || p?.video_url;
        if (!p || !url || seenUrls.has(url)) return false;

        // STRICT REEL FILTER: Exclude ALL Reels & Stories from Home Feed
        if (isReelPost(p)) return false;

        seenUrls.add(url);
        return true;
      });

      // Load user profile from local cache or Server 2
      if (myId) {
        try {
          if (server2ProfilesMap[myId]) {
            setUserProfile(server2ProfilesMap[myId]);
          } else {
            const cachedRaw = await AsyncStorage.getItem(`@cached_user_profile_${myId}`);
            if (cachedRaw) setUserProfile(JSON.parse(cachedRaw));
          }
        } catch {
          // Profile caching optional
        }
      }

      const fullPosts = allCombinedPosts.map(p => {
        const profObjCandidate = Array.isArray(p.profiles) ? p.profiles[0] : (p.profiles && typeof p.profiles === 'object' ? p.profiles : null);

        // Match Server 2 profile by user_id, uploader, username or channel_name
        const s2Prof = (p.user_id && server2ProfilesMap[p.user_id]) ||
                       (p.uploader && server2ProfilesMap[p.uploader]) ||
                       (p.username && server2ProfilesMap[p.username]) ||
                       (p.channel_name && server2ProfilesMap[p.channel_name]) ||
                       null;

        const rawName = profObjCandidate?.channel_name || profObjCandidate?.username || s2Prof?.channel_name || s2Prof?.username || p.channel_name || p.username || p.uploader || 'VOEXI Official';
        const rawUser = profObjCandidate?.username || profObjCandidate?.channel_name || s2Prof?.username || p.username || (p.uploader ? p.uploader.replace('@', '') : 'voexi_official');

        const { name: cName, username: uName } = sanitizeCreatorInfo(rawName, rawUser);

        const rawLogo = profObjCandidate?.custom_logo_url || profObjCandidate?.logo_url || profObjCandidate?.avatar_url ||
                        s2Prof?.custom_logo_url || s2Prof?.logo_url || s2Prof?.avatar_url ||
                        p.custom_logo_url || p.logo_url || p.avatar_url || p.user_avatar || p.uploader_avatar;

        const resolvedAvatar = getValidAvatarUrl(rawLogo, cName);

        const profObj = {
          id: p.user_id || profObjCandidate?.id || s2Prof?.id || `user_${p.id}`,
          channel_name: cName,
          username: uName,
          avatar_url: resolvedAvatar,
          ...(profObjCandidate || s2Prof || {})
        };

        let cleanTitle = p.title || p.description || 'VOEXI Production';
        if (cleanTitle.endsWith('.mp4') || cleanTitle.endsWith('.mov') || cleanTitle.endsWith('.m3u8') || cleanTitle.startsWith('VID_') || cleanTitle.startsWith('file_')) {
          cleanTitle = cleanTitle.replace(/\.[^/.]+$/, "").replace(/_/g, " ").replace(/-/g, " ");
          cleanTitle = cleanTitle.replace(/VID\s*\d+/gi, "VOEXI Studio Release").replace(/recording\s*\d+/gi, "Neural Spectrum Feed");
        }

        return {
          ...p,
          title: cleanTitle,
          profiles: profObj
        };
      });

      setPosts(fullPosts);

      // Check FRESH (<= 24 Hours) active stories from Supabase DB & local uploads
      let activeStoryUserIds = new Set<string>();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      const nowMs = Date.now();

      try {
        const { data: activeStories } = await supabase
          .from('posts')
          .select('user_id, created_at')
          .or('post_type.ilike.%story%,is_story.eq.true');

        if (activeStories && activeStories.length > 0) {
          activeStories.forEach(s => {
            const storyTime = s.created_at ? new Date(s.created_at).getTime() : nowMs;
            if (s.user_id && (nowMs - storyTime) < TWENTY_FOUR_HOURS) {
              activeStoryUserIds.add(s.user_id);
            }
          });
        }

        const localRaw = await AsyncStorage.getItem('@my_local_uploads');
        if (localRaw) {
          const localList = JSON.parse(localRaw);
          if (Array.isArray(localList)) {
            localList.forEach((p: any) => {
              const pt = (p.post_type || p.category || '').toLowerCase();
              if (p.is_story || pt.includes('story')) {
                const storyTime = p.created_at ? new Date(p.created_at).getTime() : nowMs;
                if ((nowMs - storyTime) < TWENTY_FOUR_HOURS) {
                  if (p.user_id) activeStoryUserIds.add(p.user_id);
                  if (myId) activeStoryUserIds.add(myId);
                }
              }
            });
          }
        }

        // Also check Server 2 active stories
        try {
          const s2Res = await fetch('http://192.168.31.39:8080/files.json').then(r => r.json()).catch(() => null);
          if (Array.isArray(s2Res)) {
            s2Res.forEach((f: any) => {
              const pt = (f.post_type || f.category || '').toLowerCase();
              if (f.is_story || pt.includes('story') || f.filename?.toLowerCase().startsWith('story_')) {
                const fileTime = f.uploaded_at ? new Date(f.uploaded_at).getTime() : nowMs;
                if ((nowMs - fileTime) < TWENTY_FOUR_HOURS) {
                  if (f.user_id) activeStoryUserIds.add(f.user_id);
                  if (myId) activeStoryUserIds.add(myId);
                }
              }
            });
          }
        } catch {
          // Server 2 active stories check optional
        }
      } catch {
        // Active stories check optional
      }

      if (myId && activeStoryUserIds.has(myId)) {
        setHasMyStory(true);
      } else {
        setHasMyStory(false);
      }

      // Process creators list safely with active stories check
      const creatorsData = (creatorsRes.status === 'fulfilled' && creatorsRes.value.data) ? creatorsRes.value.data : [];
      if (creatorsData.length > 0) {
        const realUsers = creatorsData.map((u: any) => {
          const s2Prof = server2ProfilesMap[u.id || u.user_id];
          const displayName = u.channel_name || u.username || s2Prof?.channel_name || s2Prof?.username || 'broadcaster';
          const handleName = u.username || s2Prof?.username || displayName;
          const rawAv = u.custom_logo_url || u.logo_url || u.avatar_url || s2Prof?.custom_logo_url || s2Prof?.logo_url || s2Prof?.avatar_url;
          return {
            ...u,
            channel_name: displayName,
            username: handleName,
            avatar_url: getValidAvatarUrl(rawAv, displayName),
            hasStory: activeStoryUserIds.has(u.id || u.user_id)
          };
        });
        setCreators(realUsers);
      }
    } catch (e) {
      console.error("Home Fetch Error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, []);

  const [activeId, setActiveId] = useState<string | null>(null);
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveId(viewableItems[0].item.id);
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const handleCreateMenuSelect = (id: string) => {
    setShowCreateMenu(false);
    switch(id) {
      case 'photo':
        router.push('/upload?initialType=Photo');
        break;
      case 'reels':
        router.push('/studio/reels-editor');
        break;
      case 'sound':
        router.push('/upload?initialType=Sound');
        break;
      case 'video':
        router.push('/studio/video-editor');
        break;
      case 'live':
        router.push('/studio/live-setup');
        break;
      case 'neural':
        router.push('/upload?initialType=Neural Writing');
        break;
      case 'story':
        router.push('/studio/story-editor');
        break;
    }
  };

  const myAvatarUri = getValidAvatarUrl(
    userProfile?.custom_logo_url || userProfile?.logo_url || userProfile?.avatar_url,
    userProfile?.username || userProfile?.channel_name || 'Me'
  );

  const filteredPosts = useMemo(() => {
    if (!activeCategory || activeCategory === 'DISCOVER') return posts;
    return posts.filter(p => {
      const pt = String(p.post_type || p.media_type || '').toUpperCase();
      const cat = String(p.category || p.title || p.description || '').toUpperCase();

      if (activeCategory === 'READER VIEW') {
        return pt.includes('PHOTO') || pt.includes('IMAGE') || pt.includes('WRITING') || pt.includes('LETTER') || pt.includes('TEXT') || pt.includes('ARTICLE') || pt.includes('NEURAL') || p.media_type === 'image' || p.media_type === 'text' || !p.video_url;
      }
      if (activeCategory === 'PHOTO') {
        return pt === 'PHOTO' || pt === 'IMAGE' || p.media_type === 'image' || cat.includes('PHOTO') || cat.includes('PHOTOS');
      }
      if (activeCategory === 'WRITING') {
        return pt === 'WRITING' || pt === 'LETTER' || pt === 'TEXT' || pt === 'NEURAL WRITING' || p.media_type === 'text' || cat.includes('WRITING') || cat.includes('NEURAL');
      }

      return cat.includes(activeCategory.toUpperCase()) || pt.includes(activeCategory.toUpperCase());
    });
  }, [posts, activeCategory]);

  return (
    <View style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <StatusBar barStyle={isLight ? "dark-content" : "light-content"} translucent backgroundColor="transparent" />

      {/* 1. TOP HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 10) + 4 }, isLight && { backgroundColor: '#fff', borderBottomColor: '#EEE' }]}>
         <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.push('/branding')} style={styles.brandContainer}>
              <VoexiIcon size={32} isLight={isLight} />
              <Text style={[styles.premiumBrandText, { color: isLight ? '#000' : '#fff' }]}>VOEXI</Text>
            </TouchableOpacity>

            <View style={styles.headerRight}>
               <TopHeaderDiamondBadge isLight={isLight} />

               <TouchableOpacity onPress={() => router.push('/search-portal')} style={styles.youtubeSearchBtn}>
                  <Feather name="search" size={20} color={isLight ? '#000' : '#fff'} />
               </TouchableOpacity>

               <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.headerActionBtn}>
                  <Ionicons name="notifications-outline" size={22} color={isLight ? '#000' : '#fff'} />
               </TouchableOpacity>

               <TouchableOpacity onPress={() => router.replace('/(tabs)/menu')} style={styles.headerMenuBtn}>
                  <Ionicons name="grid-outline" size={18} color="#FFD700" />
               </TouchableOpacity>
            </View>
         </View>
      </View>

      <FlatList
        data={filteredPosts}
        keyExtractor={(item, index) => (item.id ? String(item.id) : `post_${index}`)}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={2}
        windowSize={3}
        initialNumToRender={2}
        updateCellsBatchingPeriod={50}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={VOEXITheme.colors.primary} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Ionicons name="planet-outline" size={60} color="#222" />
              <Text style={{ color: '#444', marginTop: 15, fontWeight: 'bold' }}>NO POSTS FOUND</Text>
            </View>
          ) : (
            <ActivityIndicator size="large" color={VOEXITheme.colors.primary} style={{ marginTop: 50 }} />
          )
        }
        ListHeaderComponent={
          <View>
            {/* 2. CATEGORIES PILLS */}
            <View style={styles.categoriesRow}>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15, alignItems: 'center' }}>
                  {['DISCOVER', 'WRITING', 'MUSIC', 'GAMING', 'TECH', 'NEWS', 'LIFESTYLE'].map((cat) => {
                     const isSelected = activeCategory === cat;
                     return (
                       <TouchableOpacity
                         key={cat}
                         onPress={() => setActiveCategory(cat)}
                         style={[
                           styles.catPill,
                           isSelected && styles.catPillActive,
                           isLight && { backgroundColor: isSelected ? '#A855F7' : '#F5F5F5', borderColor: '#EEE' }
                         ]}
                       >
                          <Text style={[styles.catText, isSelected && { color: '#fff' }, isLight && !isSelected && { color: '#666' }]}>{cat}</Text>
                       </TouchableOpacity>
                     );
                  })}
               </ScrollView>
            </View>

            {/* 3. STATION UPDATES (STORIES LIST) */}
            <View style={styles.storiesSection}>
               <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, isLight && { color: '#888' }]}>STATION UPDATES</Text>
                  <View style={styles.liveIndicator}>
                     <View style={styles.liveDot} />
                     <Text style={styles.liveText}>SYNCED</Text>
                  </View>
               </View>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
                  <TouchableOpacity
                    style={styles.storyItem}
                    onPress={() => router.push('/story/me')}
                  >
                     <View style={styles.storyOuterRing}>
                        <LinearGradient
                          colors={hasMyStory ? [VOEXITheme.colors.primary, VOEXITheme.colors.secondary] : (isLight ? ['#EEE', '#DDD'] : ['#222', '#111'])}
                          style={styles.storyGradientRing}
                        >
                           <View style={[styles.storyInnerContent, isLight && { backgroundColor: '#fff' }]}>
                              <Image source={{ uri: myAvatarUri }} style={styles.storyAvatar} />
                              {!hasMyStory && (
                                <View style={styles.plusIconBox}>
                                   <Ionicons name="add" size={12} color="#fff" />
                                </View>
                              )}
                           </View>
                        </LinearGradient>
                     </View>
                     <Text style={[styles.storyUser, isLight && { color: '#666' }]} numberOfLines={1}>My Station</Text>
                  </TouchableOpacity>

                  {creators.map((c, idx) => (
                    <TouchableOpacity
                      key={c.id || c.username || `creator_${idx}`}
                      style={styles.storyItem}
                      onPress={() => router.push(c.hasStory ? `/story/${c.id}` : `/user/${c.id}`)}
                    >
                       <View style={styles.storyOuterRing}>
                          <LinearGradient
                             colors={c.hasStory ? [VOEXITheme.colors.primary, VOEXITheme.colors.secondary] : (isLight ? ['#EEE', '#DDD'] : ['#222', '#111'])}
                             style={styles.storyGradientRing}
                          >
                             <View style={[styles.storyInnerContent, isLight && { backgroundColor: '#fff' }]}>
                                <Image source={{ uri: c.avatar_url }} style={styles.storyAvatar} />
                             </View>
                          </LinearGradient>
                       </View>
                       <Text style={[styles.storyUser, isLight && { color: '#666' }]} numberOfLines={1}>{c.username}</Text>
                    </TouchableOpacity>
                  ))}
               </ScrollView>
            </View>
            <View style={[styles.divider, isLight && { backgroundColor: '#F0F0F0' }]} />
          </View>
        }
        renderItem={({ item }) => (
          <PostCard
            item={item}
            isPlaying={activeId === item.id}
            currentUserId={userId}
            isLight={isLight}
            onUploaderPress={(id: any) => router.push(`/user/${id}`)}
            onCardPress={(cardItem: any) => {
              const itemObj = (typeof cardItem === 'object' && cardItem !== null) ? cardItem : item;
              const pt = String(itemObj?.post_type || '').toLowerCase();
              const isReel = itemObj?.is_reel === true || pt.includes('reel');

              if (isReel) {
                router.push({ pathname: '/(tabs)/video-feed', params: { id: itemObj.id } });
              } else {
                router.push(`/video/${itemObj.id || cardItem}`);
              }
            }}
            onAuditPress={(p: any) => setAuditTarget(p)}
          />
        )}
      />

      <CreateMenuHoloOrbit
        visible={showCreateMenu}
        onClose={() => setShowCreateMenu(false)}
        onSelect={handleCreateMenuSelect}
      />

      {auditTarget && (
        <NeuralAuditModal
          visible={!!auditTarget}
          onClose={() => setAuditTarget(null)}
          targetId={auditTarget.id}
          targetUserId={auditTarget.user_id}
          signalType={auditTarget.post_type === 'Photo' ? 'image' : 'video'}
          currentUserId={userId || ''}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center', backgroundColor: '#000' },
  header: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#000000',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  premiumBrandText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  youtubeSearchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMenuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesRow: {
    height: 55,
    paddingVertical: 10,
  },
  catPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 8,
  },
  catPillActive: {
    backgroundColor: VOEXITheme.colors.primary,
  },
  catText: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  storiesSection: { marginBottom: 20, marginTop: 5 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  sectionTitle: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0, 242, 254, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: VOEXITheme.colors.secondary },
  liveText: { color: VOEXITheme.colors.secondary, fontSize: 7, fontWeight: '900' },
  storyItem: { marginRight: 20, alignItems: 'center' },
  storyOuterRing: { width: 72, height: 72, borderRadius: 36, padding: 2, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  storyGradientRing: { width: 68, height: 68, borderRadius: 34, padding: 2.5 },
  storyInnerContent: { flex: 1, backgroundColor: '#000', borderRadius: 32, padding: 2, justifyContent: 'center', alignItems: 'center' },
  storyAvatar: { width: '100%', height: '100%', borderRadius: 30 },
  storyUser: { color: '#aaa', fontSize: 10, marginTop: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  plusIconBox: { position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: VOEXITheme.colors.primary, borderWidth: 3, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.16)', marginHorizontal: 0, marginBottom: 15 }
});
