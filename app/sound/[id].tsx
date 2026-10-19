import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Dimensions, ActivityIndicator, FlatList, Share, RefreshControl, Animated, Modal, Pressable, Easing, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3 - 2;

const VideoItem = ({ item }: any) => {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.videoCard}
      onPress={() => router.push({ pathname: '/(tabs)/video-feed', params: { id: item.id } })}
    >
      <Image
        source={{ uri: item.thumbnail_url || item.media_url || 'https://via.placeholder.com/300x500?text=VOEXI+Signal' }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={StyleSheet.absoluteFill} />
      <View style={styles.videoStats}>
        <Ionicons name="play" size={10} color="#fff" />
        <Text style={styles.videoStatText}>{Number(item.views_count || 0).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function SoundAndRemixHub() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showJoinOptions, setShowJoinOptions] = useState(false);

  const [sound, setSound] = useState<any>(null);
  const [originalPost, setOriginalPost] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'Popular' | 'Latest'>('Popular');

  const [realStats, setRealStats] = useState({ totalPlays: 0, totalRemixes: 0 });
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchHubData();
    startRotation();
  }, [id, activeTab]);

  const startRotation = () => {
    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  };

  const fetchHubData = async () => {
    try {
      setLoading(true);
      let targetSoundId = null;
      let targetPostId = null;

      // 1. DATA RESOLUTION (Deep Discovery)
      const { data: soundData } = await supabase.from('vx_sounds').select('*, profiles(*)').eq('id', id).maybeSingle();

      if (soundData) {
        setSound(soundData);
        targetSoundId = soundData.id;
        const { data: opData } = await supabase.from('posts').select('*, profiles(*)').eq('sound_id', targetSoundId).order('created_at', {ascending: true}).limit(1).maybeSingle();
        if (opData) setOriginalPost(opData);
      } else {
        const { data: postData } = await supabase.from('posts').select('*, profiles(*)').eq('id', id).maybeSingle();
        if (postData) {
          setOriginalPost(postData);
          targetPostId = postData.id;
          targetSoundId = postData.sound_id;
          setSound({
            id: postData.sound_id,
            name: postData.audio_title || 'Original Signal Audio',
            url: postData.audio_url || postData.media_url,
            profiles: postData.profiles
          });
        }
      }

      // 2. FETCH LINKED SIGNAL TRANSMISSIONS (The Remix Grid)
      let query = supabase.from('posts').select('*, profiles(*)', { count: 'exact' }).eq('visibility', 'public');

      // Smart Filter: Match sound_id OR parent_post_id OR the ID itself
      const filterConditions = [];
      if (targetSoundId) filterConditions.push(`sound_id.eq.${targetSoundId}`);
      if (targetPostId || !targetSoundId) filterConditions.push(`parent_post_id.eq.${id}`);

      if (filterConditions.length > 0) {
        query = query.or(filterConditions.join(','));
      } else {
        query = query.eq('id', id); // Fallback to itself if nothing found
      }

      if (activeTab === 'Popular') query = query.order('views_count', { ascending: false });
      else query = query.order('created_at', { ascending: false });

      const { data: vids, count } = await query.limit(45);

      if (vids) {
        setVideos(vids);
        const remixPlays = vids.reduce((acc, curr) => acc + Number(curr.views_count || 0), 0);
        const mainPlays = originalPost ? Number(originalPost.views_count || 0) : 0;

        setRealStats({
          totalPlays: remixPlays + mainPlays,
          totalRemixes: count || vids.length
        });

        const usersMap = new Map();
        vids.forEach(v => { if (v.profiles) usersMap.set(v.user_id, v.profiles); });
        setTopUsers(Array.from(usersMap.values()).slice(0, 15));
      }
    } catch (e) {
      console.error('[HUB SYNC ERROR]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cleanMediaUrl = (url: string) => {
    if (!url) return '';
    let finalUrl = url.trim();
    if (finalUrl.startsWith('//')) finalUrl = 'https:' + finalUrl;
    if (finalUrl.includes('b-cdn.net')) {
        finalUrl = finalUrl.replace('videosvoexi.b-cdn.net', 'voexi.b-cdn.net');
        finalUrl = finalUrl.replace('VOEXI.b-cdn.net', 'voexi.b-cdn.net');
    }
    return finalUrl;
  };

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const player = useVideoPlayer(cleanMediaUrl(originalPost?.media_url || originalPost?.video_url || sound?.url || ''));

  useEffect(() => {
    if (player) {
      try {
        player.loop = true;
        player.muted = originalPost ? true : false;
        player.play();
      } catch(e) {}
    }
    return () => { if (player) try { player.pause(); } catch(e) {} };
  }, [player, originalPost, sound]);

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* 1. BROADCASTER ORIGINAL FRAME */}
      {originalPost && (
        <View style={styles.originalVideoContainer}>
           <View style={styles.originalVideoBox}>
              {player && <VideoView player={player} style={styles.originalVideo} contentFit="cover" nativeControls={false} />}
              <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent']} style={StyleSheet.absoluteFill} />
              <View style={styles.originalBadge}><Text style={styles.originalBadgeText}>ORIGINAL</Text></View>
           </View>
           <View style={styles.originalInfo}>
              <Text style={styles.originalTitle} numberOfLines={2}>{originalPost.title || 'Broadcast Signal'}</Text>
              <TouchableOpacity onPress={() => router.push(`/user/${originalPost.user_id}`)}>
                 <Text style={styles.originalCreator}>@{originalPost.profiles?.username}</Text>
              </TouchableOpacity>
              <View style={styles.hubStatsRow}>
                 <View style={styles.hubStatItem}><Text style={styles.hubStatVal}>{realStats.totalPlays.toLocaleString()}</Text><Text style={styles.hubStatLab}>PLAYS</Text></View>
                 <View style={styles.hubStatItem}><Text style={styles.hubStatVal}>{realStats.totalRemixes}</Text><Text style={styles.hubStatLab}>REMIXES</Text></View>
              </View>
           </View>
        </View>
      )}

      {/* 2. AUDIO METADATA (Rotating Vinyl) */}
      <View style={styles.soundMetaSection}>
        <Animated.View style={[styles.coverWrapper, { transform: [{ rotate: spin }] }]}>
          <LinearGradient colors={[VOEXITheme.colors.primary, '#600']} style={styles.coverRing}>
            <Image source={{ uri: originalPost?.thumbnail_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop' }} style={styles.coverImage} />
          </LinearGradient>
        </Animated.View>
        <View style={styles.soundText}>
           <Text style={styles.soundName} numberOfLines={1}>{sound?.name || 'VOEXI Audio'}</Text>
           <Text style={styles.soundStats}>{realStats.totalRemixes} Transmissions • {realStats.totalPlays.toLocaleString()} Plays</Text>
        </View>
        <View style={{flexDirection:'row', gap: 10}}>
           <TouchableOpacity style={styles.editBtn} onPress={() => router.push({ pathname: '/menu/editor', params: { audioSource: sound?.url, remixType: 'music' } })}>
              <MaterialCommunityIcons name="pencil" size={18} color="#fff" />
           </TouchableOpacity>
           <TouchableOpacity style={styles.saveBtn}><Ionicons name="bookmark-outline" size={24} color="#fff" /></TouchableOpacity>
        </View>
      </View>

      {/* 3. TRENDING CONTRIBUTORS */}
      {topUsers.length > 0 && (
        <View style={styles.origUsersSection}>
           <Text style={styles.sectionTitle}>TRENDING Broadcasters</Text>
           <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.origUsersList}>
              {topUsers.map((user, idx) => (
                <TouchableOpacity key={user.id} style={styles.userAvatarWrapper} onPress={() => router.push(`/user/${user.id}`)}>
                  <LinearGradient colors={idx === 0 ? ['#FFD700', '#000'] : ['#222', '#111']} style={styles.userAvatarRing}>
                    <Image source={{ uri: user.avatar_url }} style={styles.userAvatar} />
                  </LinearGradient>
                  {idx === 0 && <View style={styles.originBadge}><Text style={styles.originBadgeText}>STAR</Text></View>}
                  <Text style={styles.userNameText} numberOfLines={1}>{user.username}</Text>
                </TouchableOpacity>
              ))}
           </ScrollView>
        </View>
      )}

      {/* 4. CALL TO ACTION (Liquid Design) */}
      <TouchableOpacity style={styles.ctaBtn} onPress={() => setShowJoinOptions(true)}>
        <LinearGradient colors={[VOEXITheme.colors.primary, '#800']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.ctaGradient}>
           <MaterialCommunityIcons name="auto-fix" size={20} color="#fff" />
           <Text style={styles.ctaText}>TRANSMIT ON THIS FREQUENCY</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'Popular' && styles.activeTab]} onPress={() => setActiveTab('Popular')}><Text style={[styles.tabText, activeTab === 'Popular' && styles.activeTabText]}>POPULAR</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'Latest' && styles.activeTab]} onPress={() => setActiveTab('Latest')}><Text style={[styles.tabText, activeTab === 'Latest' && styles.activeTabText]}>LATEST</Text></TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) return <View style={styles.loader}><ActivityIndicator size="large" color={VOEXITheme.colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navIcon}><Ionicons name="chevron-back" size={28} color="#fff" /></TouchableOpacity>
        <Text style={styles.navTitle}>VOEXI HUB</Text>
        <TouchableOpacity onPress={() => Share.share({ message: `Tune into this signal on VOEXI!` })} style={styles.navIcon}><Ionicons name="share-outline" size={24} color="#fff" /></TouchableOpacity>
      </View>

      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => <VideoItem item={item} />}
        ListHeaderComponent={renderHeader()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchHubData();}} tintColor="#fff" />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={showJoinOptions} transparent animationType="slide">
         <Pressable style={styles.modalOverlay} onPress={() => setShowJoinOptions(false)}>
            <View style={styles.optionsCard}>
               <Text style={styles.optionsTitle}>JOIN FREQUENCY</Text>
               <TouchableOpacity style={styles.optionBtn} onPress={() => { setShowJoinOptions(false); router.push({ pathname: '/studio/story-editor', params: { soundId: sound?.id, soundUrl: sound?.url, soundName: sound?.name, parentPostId: originalPost?.id } }); }}>
                  <LinearGradient colors={['#1a1a1a', '#050505']} style={styles.optionGradient}><Ionicons name="flash" size={24} color={VOEXITheme.colors.secondary} /><View><Text style={styles.optionLabel}>TRANSMIT SIGNAL</Text><Text style={styles.optionSub}>Add this audio to your story</Text></View></LinearGradient>
               </TouchableOpacity>
               <TouchableOpacity onPress={() => setShowJoinOptions(false)} style={styles.closeBtn}><Text style={styles.closeBtnText}>CANCEL</Text></TouchableOpacity>
            </View>
         </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#111' },
  navIcon: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2.5 },
  headerContent: { padding: 15 },
  originalVideoContainer: { flexDirection: 'row', gap: 15, marginBottom: 30, backgroundColor: '#050505', padding: 10, borderRadius: 20, borderWidth: 1, borderColor: '#111' },
  originalVideoBox: { width: 110, height: 160, borderRadius: 15, overflow: 'hidden' },
  originalVideo: { width: '100%', height: '100%' },
  originalBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  originalBadgeText: { color: VOEXITheme.colors.secondary, fontSize: 7, fontWeight: '900' },
  originalInfo: { flex: 1, justifyContent: 'center' },
  originalTitle: { color: '#fff', fontSize: 15, fontWeight: '900' },
  originalCreator: { color: '#666', fontSize: 12, marginTop: 4, fontWeight: 'bold' },
  hubStatsRow: { flexDirection: 'row', gap: 15, marginTop: 15 },
  hubStatVal: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  hubStatLab: { color: '#444', fontSize: 8, fontWeight: '900', marginTop: 2 },
  soundMetaSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, gap: 15 },
  coverWrapper: { width: 70, height: 70, borderRadius: 35, padding: 2, backgroundColor: '#111' },
  coverRing: { width: '100%', height: '100%', borderRadius: 35, padding: 1.5, justifyContent: 'center', alignItems: 'center' },
  coverImage: { width: '100%', height: '100%', borderRadius: 35, borderWidth: 1, borderColor: '#000' },
  soundText: { flex: 1 },
  soundName: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  soundStats: { color: '#555', fontSize: 10, marginTop: 4, fontWeight: 'bold' },
  editBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  saveBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  origUsersSection: { marginBottom: 30 },
  sectionTitle: { color: '#444', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15, textTransform: 'uppercase' },
  origUsersList: { paddingRight: 20 },
  userAvatarWrapper: { alignItems: 'center', width: 60, marginRight: 15 },
  userAvatarRing: { width: 50, height: 50, borderRadius: 25, padding: 2, justifyContent: 'center', alignItems: 'center' },
  userAvatar: { width: '100%', height: '100%', borderRadius: 23, borderWidth: 1.5, borderColor: '#000' },
  originBadge: { position: 'absolute', top: -5, backgroundColor: '#FFD700', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  originBadgeText: { color: '#000', fontSize: 6, fontWeight: '900' },
  userNameText: { color: '#555', fontSize: 9, marginTop: 6, fontWeight: 'bold' },
  ctaBtn: { height: 52, borderRadius: 12, overflow: 'hidden', marginBottom: 35 },
  ctaGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  ctaText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#111' },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: VOEXITheme.colors.primary },
  tabText: { color: '#444', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  activeTabText: { color: '#fff' },
  list: { paddingBottom: 40 },
  videoCard: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.5, margin: 1, backgroundColor: '#050505' },
  videoStats: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  videoStatText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  optionsCard: { backgroundColor: '#0A0A0A', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, borderTopWidth: 1, borderTopColor: '#222' },
  optionsTitle: { color: '#fff', fontSize: 14, fontWeight: '900', textAlign: 'center', marginBottom: 25, letterSpacing: 2 },
  optionBtn: { marginBottom: 15, borderRadius: 15, overflow: 'hidden' },
  optionGradient: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 15 },
  optionLabel: { color: '#fff', fontSize: 13, fontWeight: '900' },
  optionSub: { color: '#555', fontSize: 10, marginTop: 2, fontWeight: 'bold' },
  closeBtn: { marginTop: 10, alignSelf: 'center', padding: 10 },
  closeBtnText: { color: '#444', fontSize: 11, fontWeight: 'bold' }
});
