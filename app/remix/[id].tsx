import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Dimensions, ActivityIndicator, FlatList, RefreshControl, Animated, Easing, Modal, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3 - 2;

export default function RemixCenter() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const targetId = Array.isArray(id) ? id[0] : (id as string | undefined);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sourceData, setSourceData] = useState<any>(null);
  const [remixes, setRemixes] = useState<any[]>([]);
  const [stats, setStats] = useState({ plays: 0, remixCount: 0 });
  const [showRemixModeModal, setShowRemixModeModal] = useState(false);

  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchRemixData();
    Animated.loop(Animated.timing(rotateAnim, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })).start();
  }, [targetId]);

  const fetchRemixData = async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      // Fast Parallel Fetching via Promise.all
      const [postRes, rawPostRes, linkedRes, trendingRes] = await Promise.all([
        supabase.from('posts').select('*, profiles(*)').eq('id', targetId).maybeSingle(),
        supabase.from('posts').select('*').eq('id', targetId).maybeSingle(),
        supabase.from('posts').select('*, profiles(*)').or(`parent_post_id.eq.${targetId},sound_id.eq.${targetId}`).order('created_at', { ascending: false }).limit(30),
        supabase.from('posts').select('*, profiles(*)').order('views_count', { ascending: false }).limit(30)
      ]);

      let finalSource = postRes.data || rawPostRes.data;

      // Check local storage if not found in DB
      if (!finalSource) {
        try {
          const localRaw = await AsyncStorage.getItem('@my_local_uploads');
          if (localRaw) {
            const localList = JSON.parse(localRaw);
            finalSource = localList.find((p: any) => String(p.id) === String(targetId));
          }
        } catch (e) {}

        if (!finalSource) {
          const { data: sound } = await supabase
            .from('vx_sounds')
            .select('*, profiles(*)')
            .eq('id', targetId)
            .maybeSingle();
          if (sound) finalSource = sound;
        }
      }

      setSourceData(finalSource);

      const dbLinked = linkedRes.data || [];
      const dbTrending = trendingRes.data || [];

      const seenIds = new Set<string>();
      if (finalSource?.id) seenIds.add(finalSource.id);

      const mergedRemixes = [...dbLinked, ...dbTrending].filter(p => {
        if (!p || !p.id || seenIds.has(p.id)) return false;
        seenIds.add(p.id);
        return true;
      });

      setRemixes(mergedRemixes);
      const totalP = mergedRemixes.reduce((acc, curr) => acc + Number(curr.views_count || 0), 0);
      setStats({
        plays: totalP + Number(finalSource?.views_count || 0),
        remixCount: mergedRemixes.length
      });
    } catch (e) {
      console.warn("Remix Hub Fast Fetch Warning:", e);
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

  const mediaSourceUrl = cleanMediaUrl(sourceData?.video_url || sourceData?.media_url || sourceData?.audio_url || sourceData?.url || '');
  const player = useVideoPlayer(mediaSourceUrl ? String(mediaSourceUrl) : '');

  useEffect(() => {
    if (player && mediaSourceUrl) {
      try {
        player.loop = true;
        player.play();
      } catch (e) {}
    }
  }, [player, mediaSourceUrl]);

  const handleOpenRemixOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setShowRemixModeModal(true);
  };

  // Option 1: Full Video & Manual Editing
  const handleManualRemix = () => {
    setShowRemixModeModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const audioUrl = sourceData?.audio_url || sourceData?.media_url || sourceData?.video_url || '';
    const videoUrl = sourceData?.video_url || sourceData?.media_url || '';

    router.push({
      pathname: '/menu/editor',
      params: {
        videoSource: videoUrl,
        audioSource: audioUrl,
        remixType: 'video',
        mode: 'Manual',
        parentPostId: sourceData?.id,
        audioOwnerId: sourceData?.user_id
      }
    });
  };

  // Option 2: VX AI Remix
  const handleAiRemix = () => {
    setShowRemixModeModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const audioUrl = sourceData?.audio_url || sourceData?.media_url || sourceData?.video_url || '';
    const videoUrl = sourceData?.video_url || sourceData?.media_url || '';

    router.push({
      pathname: '/menu/editor',
      params: {
        videoSource: videoUrl,
        audioSource: audioUrl,
        remixType: 'video',
        mode: 'AI',
        autoMaster: 'true',
        parentPostId: sourceData?.id,
        audioOwnerId: sourceData?.user_id
      }
    });
  };

  // Option 3: Only Music / Audio Sync
  const handleMusicOnlyRemix = () => {
    setShowRemixModeModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const audioUrl = sourceData?.audio_url || sourceData?.media_url || sourceData?.video_url || '';

    router.push({
      pathname: '/studio/reels-editor',
      params: {
        soundUrl: audioUrl,
        soundName: sourceData?.title || sourceData?.name || 'Remix Sound',
        parentPostId: sourceData?.id,
        audioOwnerId: sourceData?.user_id
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>REMIX CENTER</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={VOEXITheme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={remixes}
          keyExtractor={item => item.id}
          numColumns={3}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRemixData(); }} tintColor={VOEXITheme.colors.primary} />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.sourceRow}>
                 <View style={styles.visualBox}>
                    {sourceData?.media_type === 'video' || sourceData?.post_type === 'Video' || sourceData?.post_type === 'Reels' || sourceData?.media_url?.includes('.mp4') ? (
                       Boolean(mediaSourceUrl && player) && <VideoView key={mediaSourceUrl} player={player} style={styles.previewMedia} contentFit="cover" nativeControls={false} />
                    ) : (
                       <Image source={{ uri: sourceData?.thumbnail_url || sourceData?.media_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400' }} style={styles.previewMedia} />
                    )}
                    <View style={styles.sourceBadge}><Text style={styles.sourceBadgeText}>SOURCE</Text></View>
                 </View>

                 <View style={styles.sourceInfo}>
                    <Text style={styles.sourceTitle} numberOfLines={2}>{sourceData?.title || sourceData?.name || 'Original Production'}</Text>
                    <Text style={styles.sourceCreator}>by @{sourceData?.profiles?.username || sourceData?.username || 'voexi'}</Text>
                    <View style={styles.statsRow}>
                       <View><Text style={styles.statVal}>{stats.plays.toLocaleString()}</Text><Text style={styles.statLab}>PLAYS</Text></View>
                       <View style={styles.statDivider} />
                       <View><Text style={styles.statVal}>{stats.remixCount}</Text><Text style={styles.statLab}>REMIXES</Text></View>
                    </View>
                 </View>
              </View>

              <TouchableOpacity style={styles.transmitBtn} onPress={handleOpenRemixOptions}>
                 <LinearGradient colors={[VOEXITheme.colors.primary, '#600']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.transmitGradient}>
                    <MaterialCommunityIcons name="auto-fix" size={22} color="#fff" />
                    <Text style={styles.transmitText}>CREATE REMIX SIGNAL</Text>
                 </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>TRENDING TRANSMISSIONS</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isReel = item.post_type === 'Reels' || item.is_reel === true;
            return (
              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => {
                  if (isReel) {
                    router.push({ pathname: '/(tabs)/video-feed', params: { id: item.id } });
                  } else {
                    router.push(`/video/${item.id}`);
                  }
                }}
              >
                 <Image source={{ uri: item.thumbnail_url || item.media_url || item.video_url }} style={StyleSheet.absoluteFill} />
                 <View style={styles.gridOverlay}>
                   <Ionicons name="play" size={10} color="#fff" />
                   <Text style={styles.gridStatText}>{Number(item.views_count || 0).toLocaleString()}</Text>
                 </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* REMIX MODE SELECTION MODAL */}
      <Modal
        visible={showRemixModeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRemixModeModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowRemixModeModal(false)}>
          <View style={styles.remixModeSheet}>
            <View style={styles.dragBar} />
            <Text style={styles.sheetTitle}>CHOOSE REMIX MODE</Text>
            <Text style={styles.sheetSubTitle}>Select how you want to remix this production</Text>

            {/* Option 1: Full Video & Manual Editing */}
            <TouchableOpacity style={styles.modeOptionCard} onPress={handleManualRemix}>
              <LinearGradient colors={['#1E1B4B', '#0F0E26']} style={styles.modeGradient}>
                <View style={[styles.modeIconBox, { backgroundColor: '#A855F7' }]}>
                  <Ionicons name="film-outline" size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modeTitle}>Full Video & Manual Editing</Text>
                  <Text style={styles.modeDesc}>Full video + audio synced in VX Editor for trimming, filters & speed controls</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#888" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Option 2: VX AI Remix */}
            <TouchableOpacity style={styles.modeOptionCard} onPress={handleAiRemix}>
              <LinearGradient colors={['#311042', '#120524']} style={styles.modeGradient}>
                <View style={[styles.modeIconBox, { backgroundColor: '#00F2FE' }]}>
                  <MaterialCommunityIcons name="auto-fix" size={24} color="#000" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modeTitle}>VX AI Remix & Neural Mastering</Text>
                  <Text style={styles.modeDesc}>AI audio mastering, neural clarity boost & auto-effect generation</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#888" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Option 3: Only Music */}
            <TouchableOpacity style={styles.modeOptionCard} onPress={handleMusicOnlyRemix}>
              <LinearGradient colors={['#064E3B', '#022C22']} style={styles.modeGradient}>
                <View style={[styles.modeIconBox, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="musical-notes-outline" size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modeTitle}>Only Music & Sound Sync</Text>
                  <Text style={styles.modeDesc}>Extract audio track only to record your own new video or reel</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#888" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRemixModeModal(false)}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  backBtn: { padding: 5 },
  navTitle: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  header: { padding: 20 },
  sourceRow: { flexDirection: 'row', gap: 20, marginBottom: 30 },
  visualBox: { width: 120, height: 180, borderRadius: 20, overflow: 'hidden', backgroundColor: '#050505', borderWidth: 1, borderColor: '#111' },
  previewMedia: { width: '100%', height: '100%' },
  sourceBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: VOEXITheme.colors.primary, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  sourceBadgeText: { color: '#fff', fontSize: 7, fontWeight: '900' },
  sourceInfo: { flex: 1, justifyContent: 'center' },
  sourceTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  sourceCreator: { color: '#888', fontSize: 13, fontWeight: 'bold', marginTop: 5 },
  statsRow: { flexDirection: 'row', gap: 20, marginTop: 20, alignItems: 'center' },
  statVal: { color: '#fff', fontSize: 16, fontWeight: '900' },
  statLab: { color: '#555', fontSize: 8, fontWeight: '900', marginTop: 2 },
  statDivider: { width: 1, height: 20, backgroundColor: '#222' },
  transmitBtn: { height: 56, borderRadius: 15, overflow: 'hidden', marginBottom: 30 },
  transmitGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  transmitText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  sectionTitle: { color: '#666', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
  gridItem: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.5, margin: 1, backgroundColor: '#050505' },
  gridOverlay: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  gridStatText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },

  // REMIX MODE MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  remixModeSheet: {
    backgroundColor: '#0A0A0F',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: '#1A1A24',
  },
  dragBar: {
    width: 40,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  sheetSubTitle: {
    color: '#888',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  modeOptionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  modeIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modeDesc: {
    color: '#999',
    fontSize: 10,
    marginTop: 3,
    lineHeight: 14,
  },
  cancelBtn: {
    marginTop: 15,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
});