import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions, StatusBar, ScrollView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { VOEXITheme } from '../../constants/theme';
import { recordView } from '../../lib/earnings';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { VoexiIcon } from '../../components/VoexiIcon';
import PostCard from '../../components/PostCard';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NeuralAuditModal } from '../../components/moderation/NeuralAuditModal';
import CreateMenuHoloOrbit from '../../components/CreateMenuHoloOrbit';
import { TopHeaderDiamondBadge } from '../../components/TopHeaderDiamondBadge';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { isLight } = useTheme();
  const { t } = useLanguage();

  const [posts, setPosts] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserData] = useState<any>(null);
  const [hasMyStory, setHasMyStory] = useState(false);
  const [auditTarget, setAuditTarget] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState('DISCOVER');
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  // Fast fetch with timeout to prevent local server hanging
  const fetchWithTimeout = async (url: string, timeoutMs = 1200) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      return response;
    } catch (e) {
      return null;
    }
  };

  const isReelPost = (p: any): boolean => {
    if (!p) return true;

    // 1. Explicit Boolean / String Flags
    if (p.is_reel === true || p.is_reel === 'true' || String(p.is_reel) === 'true') return true;

    // 2. Post Type Check
    const pt = String(p.post_type || '').toLowerCase().trim();
    if (pt.includes('reel') || pt.includes('story') || pt.includes('short')) return true;

    // 3. Title & Description Keywords Check
    const title = String(p.title || '').toLowerCase();
    const desc = String(p.description || '').toLowerCase();
    if (
      title.includes('reel') ||
      title.includes('short') ||
      desc.includes('#reel') ||
      desc.includes('#reels') ||
      desc.includes('#shorts')
    ) {
      return true;
    }

    // 4. Media URL Keywords Check
    const url = String(p.media_url || p.video_url || '').toLowerCase();
    if (url.includes('reel') || url.includes('short')) return true;

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
    } catch (e) {}

    if (!isRefreshing && posts.length === 0) setLoading(true);

    try {
      // 2. PARALLEL NETWORK FETCH (ALL REQUESTS FIRE AT THE SAME TIME)
      const [sessionRes, supabasePostsRes, penDriveRes, creatorsRes] = await Promise.allSettled([
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
        } catch (e) {}
      }

      // Process PenDrive files
      let penDriveFiles: any[] = [];
      if (penDriveRes.status === 'fulfilled' && penDriveRes.value && penDriveRes.value.ok) {
        try {
          const allPenFiles = await penDriveRes.value.json();
          if (Array.isArray(allPenFiles)) penDriveFiles = allPenFiles;
        } catch (e) {}
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
      } catch (e) {}

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

      const fullPosts = allCombinedPosts.map(p => {
        const isMine = Boolean(myId && p.user_id === myId);
        let prof = p.profiles;
        if (isMine && userProfile && (!prof || !prof.channel_name)) {
          prof = {
            id: myId,
            channel_name: userProfile.channel_name || userProfile.username || 'My Station',
            username: userProfile.username || 'user',
            avatar_url: userProfile.avatar_url,
          };
        }
        return {
          ...p,
          title: p.title || p.description || 'VOEXI Production',
          profiles: prof || {
            id: p.user_id,
            channel_name: p.channel_name || p.username || 'VOEXI Broadcaster',
            username: p.username || 'broadcaster',
            avatar_url: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.title || 'VOEXI')}&background=A855F7&color=fff&bold=true`
          }
        };
      });

      setPosts(fullPosts);

      // Process creators list safely
      const creatorsData = (creatorsRes.status === 'fulfilled' && creatorsRes.value.data) ? creatorsRes.value.data : [];
      if (creatorsData.length > 0) {
        const realUsers = creatorsData.map((u: any) => {
          const displayName = u.username || u.channel_name || 'broadcaster';
          const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=A855F7&color=fff&bold=true`;
          return {
            ...u,
            username: displayName,
            avatar_url: u.avatar_url && u.avatar_url.startsWith('http') ? u.avatar_url : fallbackAvatar,
            hasStory: false
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

  // AUTO-REFRESH HOME FEED WHEN RETURNING FROM UPLOAD!
  useFocusEffect(
    useCallback(() => {
      fetchData(true);
    }, [])
  );

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

  const myAvatarUri = userProfile?.avatar_url && userProfile.avatar_url.startsWith('http')
    ? userProfile.avatar_url
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.username || userProfile?.channel_name || 'Me')}&background=A855F7&color=fff&bold=true`;

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isLight ? "dark-content" : "light-content"} />

      {/* 1. TOP HEADER */}
      <View style={[styles.header, isLight && { borderBottomColor: '#EEE' }]}>
         <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.push('/branding')} style={styles.brandContainer}>
              <VoexiIcon size={38} isLight={isLight} />
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
        data={posts}
        keyExtractor={item => item.id}
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
                  {['DISCOVER', 'MUSIC', 'GAMING', 'TECH', 'NEWS', 'LIFESTYLE'].map((cat) => {
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
                    onPress={() => router.push(hasMyStory ? '/story/me' : '/studio/story-editor')}
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

                  {creators.map(c => (
                    <TouchableOpacity
                      key={c.id}
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
            onCardPress={(id: any) => {
              if (item.is_reel === true || item.post_type === 'Reels' || item.post_type === 'Reel') {
                router.push({ pathname: '/(tabs)/video-feed', params: { id: item.id } });
              } else {
                router.push(`/video/${id}`);
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    paddingHorizontal: 15,
    height: 60,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 52,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumBrandText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  youtubeSearchBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMessageBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMenuBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  headerProfileBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#A855F7',
    overflow: 'hidden',
  },
  headerProfileAvatar: {
    width: '100%',
    height: '100%',
  },
  categoriesRow: {
    height: 55,
    paddingVertical: 10,
  },
  catPill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#111',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  catPillActive: {
    backgroundColor: VOEXITheme.colors.primary,
    borderColor: VOEXITheme.colors.primary,
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
  newBadge: { position: 'absolute', bottom: -5, alignSelf: 'center', backgroundColor: VOEXITheme.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#000' },
  newBadgeText: { color: '#fff', fontSize: 6, fontWeight: '900' },
  divider: { height: 1, backgroundColor: '#0A0A0F', marginHorizontal: 20, marginBottom: 15 }
});
