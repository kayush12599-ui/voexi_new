import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Modal, Pressable, Alert, Animated, Easing, Share, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { VOEXITheme } from '../constants/theme';
import { recordView, recordSave, recordLike } from '../lib/earnings';
import { useFollow } from '../lib/social';
import { useLanguage } from '../hooks/useLanguage';
import SubscribeButton from './SubscribeButton';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const isValidUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const PostCard = memo(({ item, isPlaying, onUploaderPress, onCardPress, currentUserId, isLight, onAuditPress }: any) => {
  const router = useRouter();
  const { t } = useLanguage();
  const isFocused = useIsFocused();
  const { isFollowing, toggleFollow } = useFollow(currentUserId, item.user_id);
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(parseInt(item.likes_count) || 0);
  const [commentsCount, setCommentsCount] = useState(parseInt(item.comments_count) || 0);
  const [optionsModal, setOptionsModal] = useState(false);
  const [shareModal, setShareModal] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [sendingPostTo, setSendingPostTo] = useState<string | null>(null);

  const heartAnim = useRef(new Animated.Value(0)).current;
  const [showHeart, setShowHeart] = useState(false);

  const fetchFriends = async () => {
    if (!currentUserId) return;
    setLoadingFriends(true);
    try {
      const { data: relations } = await supabase
        .from('friends')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

      if (relations && relations.length > 0) {
        const friendIds = relations.map(rel => rel.sender_id === currentUserId ? rel.receiver_id : rel.sender_id);
        const { data: profs } = await supabase.from('profiles').select('*').in('id', friendIds);
        setFriends(profs || []);
      }
    } catch (e) {
      console.error("[SHARE] Error fetching friends:", e);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleShareToFriend = async (friendId: string) => {
    if (!currentUserId) return;
    setSendingPostTo(friendId);
    try {
      const shareUrl = `https://voexi.com/video/${item.id}`;
      const content = `Check out this production: ${item.title}\n\n${shareUrl}`;

      const { error } = await supabase.from('messages').insert({
        sender_id: currentUserId,
        receiver_id: friendId,
        content: content,
        type: 'text'
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("SENT", "Signal transmitted to your friend!");
    } catch (e) {
      Alert.alert("FAILED", "Transmission interrupted.");
    } finally {
      setSendingPostTo(null);
    }
  };

  const handleExternalShare = async () => {
    const shareUrl = `https://voexi.com/video/${item.id}`;
    await Share.share({
      message: `Watch ${item.profiles?.channel_name || 'this creator'} on VOEXI!\n\n${item.title}\n${shareUrl}`,
      url: shareUrl
    });
    setShareModal(false);
  };

  const handleCopyLink = async () => {
    const shareUrl = `https://voexi.com/video/${item.id}`;
    await Clipboard.setStringAsync(shareUrl);
    setShareModal(false);
    Alert.alert("COPIED", "Post link saved to clipboard.");
  };

  const openShareSheet = () => {
    setShareModal(true);
    fetchFriends();
  };

  const finalMediaUrl = useMemo(() => {
    let url = item.video_url || item.media_url || '';
    if (!url) return '';
    url = url.trim();
    if (url.startsWith('//')) url = 'https:' + url;
    if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('content://') && url !== '') {
      url = `https://voexi.b-cdn.net/${url}`;
    }

    try {
      url = encodeURI(url);
    } catch (e) {}

    return url.replace('videosvoexi.b-cdn.net', 'voexi.b-cdn.net').replace('VOEXI.b-cdn.net', 'voexi.b-cdn.net');
  }, [item]);

  const pt = (item.post_type || '').toLowerCase();
  const isVideo = Boolean(finalMediaUrl) && (item.media_type === 'video' || pt === 'video' || finalMediaUrl.toLowerCase().includes('.mp4') || finalMediaUrl.includes('m3u8') || finalMediaUrl.includes('mov') || finalMediaUrl.includes('b-cdn'));
  const posterUri = item.thumbnail_url || finalMediaUrl;
  const shouldRenderVideo = isVideo && isPlaying && isFocused;

  const mediaAspectRatio = useMemo(() => {
    if (item.aspect_ratio && typeof item.aspect_ratio === 'number') {
      return Math.max(0.8, Math.min(1.78, item.aspect_ratio));
    }
    if (item.post_type === 'Photo' || item.post_type === 'Reels') return 4 / 5;
    return 16 / 9;
  }, [item]);

  // ⚡ 60 FPS PERFORMANCE OPTIMIZATION: Only initialize native video player for active playing item
  const playerSource = shouldRenderVideo && isVideo && finalMediaUrl ? finalMediaUrl : '';
  const player = useVideoPlayer(playerSource);

  useEffect(() => {
    if (!player) return;
    if (shouldRenderVideo && playerSource) {
      try {
        player.muted = true;
        player.loop = true;
        const res = player.play();
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      } catch (e) {
        console.warn("[Video Player Safeguard]:", e);
      }
    } else {
      try {
        player.pause();
      } catch (e) {}
    }
  }, [player, shouldRenderVideo, playerSource]);

  const isPenDrive = !isValidUuid(item.id) || item.id?.startsWith('pendrive_') || item.id?.includes('dummy');

  useEffect(() => {
    if (item.id) {
      AsyncStorage.getItem(`liked_${item.id}`).then(val => {
        if (val !== null) setIsLiked(JSON.parse(val));
      });
      if (currentUserId && isValidUuid(item.id)) {
        supabase.from('likes').select('id').eq('post_id', item.id).eq('user_id', currentUserId).maybeSingle()
          .then(({ data }) => { if (data) setIsLiked(true); });
      }
    }
  }, [item.id, currentUserId]);

  const handleLike = async () => {
    const newState = !isLiked;
    setIsLiked(newState);
    setLikes(prev => newState ? prev + 1 : Math.max(0, prev - 1));
    await recordLike(item.id, currentUserId, newState);
  };

  const handleDoubleTap = () => {
    if (!isLiked) handleLike();
    setShowHeart(true);
    heartAnim.setValue(0);
    Animated.sequence([
      Animated.spring(heartAnim, { toValue: 1.5, friction: 3, useNativeDriver: true }),
      Animated.timing(heartAnim, { toValue: 0, duration: 150, delay: 400, useNativeDriver: true, easing: Easing.linear })
    ]).start(() => setShowHeart(false));
  };

  const typeLabel = item.post_type === 'Video' ? 'Video' : item.post_type === 'Photo' ? 'Photo' : item.post_type === 'Letter' ? 'Letter' : 'Signal';

  const profileObj = useMemo(() => {
    if (!item) return null;
    if (Array.isArray(item.profiles)) return item.profiles[0] || null;
    if (item.profiles && typeof item.profiles === 'object') return item.profiles;
    return null;
  }, [item]);

  const creatorName = profileObj?.channel_name || profileObj?.username || item.channel_name || item.username || 'VOEXI Broadcaster';
  const creatorUsername = profileObj?.username || profileObj?.channel_name || item.username || item.channel_name || 'broadcaster';
  const rawAvatar = profileObj?.avatar_url || item.avatar_url || item.user_avatar;
  const creatorAvatar = rawAvatar && rawAvatar.startsWith('http')
    ? rawAvatar
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(creatorName)}&background=A855F7&color=fff&bold=true`;
  const postTitle = item.title || item.description || 'VOEXI Production';

  return (
    <View style={[styles.vxMainCard, isLight && { backgroundColor: '#fff' }]}>
      <View style={[styles.vxCardHeader, isLight && { borderBottomWidth: 0.5, borderBottomColor: '#EEE' }]}>
        <TouchableOpacity onPress={() => onUploaderPress(item.user_id)} style={styles.vxHeaderLeft}>
          <Image source={{ uri: creatorAvatar }} style={[styles.vxAvatar, isLight && { borderColor: '#EEE' }]} />
          <View style={{ flex: 1, marginRight: 6 }}>
             <Text style={[styles.vxCreatorName, isLight && { color: '#000' }]} numberOfLines={1}>
               {creatorName}
             </Text>
             <Text style={[styles.vxStationId, isLight && { color: '#999' }]} numberOfLines={1}>
               @{creatorUsername}
             </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.vxHeaderRight}>
           {item.user_id && currentUserId !== item.user_id && (
              <>
                <TouchableOpacity
                  onPress={() => router.push(`/menu/chat/${item.user_id}`)}
                  style={[styles.miniChatBtn, isLight && { backgroundColor: '#F0E6FF', borderColor: '#DDD' }]}
                >
                   <Ionicons name="chatbubble-ellipses-outline" size={14} color="#A855F7" />
                </TouchableOpacity>

                <SubscribeButton
                  isSubscribed={isFollowing}
                  onPress={toggleFollow}
                  showBell={false}
                  size="small"
                />
              </>
           )}
           <TouchableOpacity onPress={() => setOptionsModal(true)} style={{ padding: 5 }}>
             <Ionicons name="ellipsis-vertical" size={20} color={isLight ? '#000' : '#fff'} />
           </TouchableOpacity>
        </View>
      </View>

      <Pressable onPress={() => onCardPress(item.id)} onLongPress={handleDoubleTap} style={[styles.vxMediaContainerInner, { aspectRatio: 16 / 9 }, isLight && { backgroundColor: '#000' }]}>
        {posterUri && !shouldRenderVideo ? (
           <View style={StyleSheet.absoluteFill}>
              <Image source={{ uri: posterUri }} style={styles.vxMedia} contentFit="cover" />
              {isVideo && (
                <View style={styles.playOverlayIcon}>
                   <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.85)" />
                </View>
              )}
           </View>
        ) : shouldRenderVideo && player && playerSource ? (
           <VideoView key={`postcard_player_${item.id}`} player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
        ) : (
           <View style={[styles.vxMedia, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="videocam-outline" size={40} color="#333" />
           </View>
        )}
        {showHeart && <Animated.View style={[styles.heartOverlay, { transform: [{ scale: heartAnim }] }]}><Ionicons name="heart" size={100} color="#fff" /></Animated.View>}
      </Pressable>

      <View style={styles.vxInteractionConsole}>
        <View style={styles.vxActionGroup}>
          <TouchableOpacity style={styles.vxMainAction} onPress={handleLike}><Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color={isLiked ? VOEXITheme.colors.primary : (isLight ? "#000" : "#fff")} /><Text style={[styles.vxActionLabel, isLight && { color: '#666' }]}>{likes}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.vxMainAction} onPress={() => onCardPress(item.id)}><Ionicons name="chatbubble-outline" size={20} color={isLight ? "#000" : "#fff"} /><Text style={[styles.vxActionLabel, isLight && { color: '#666' }]}>{commentsCount}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.vxMainAction} onPress={openShareSheet}><Ionicons name="paper-plane-outline" size={20} color={isLight ? "#000" : "#fff"} /><Text style={[styles.vxActionLabel, isLight && { color: '#666' }]}>Share</Text></TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.vxRemixButton} onPress={() => router.push(`/remix/${item.id}`)}><LinearGradient colors={[VOEXITheme.colors.primary, '#4c1d95']} style={styles.vxRemixGradient}><Text style={styles.vxRemixText}>REMIX</Text></LinearGradient></TouchableOpacity>
      </View>

      <View style={styles.vxCaptionBox}>
         <Text style={[styles.vxPostTitle, isLight && { color: '#333' }]} numberOfLines={2}>
           {postTitle}
         </Text>
         <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
            <Text style={{ fontSize: 11, color: isLight ? '#666' : '#888', fontWeight: '500' }}>
              {Number(item.views_count || 0).toLocaleString()} views  •  {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Just now'}
            </Text>
         </View>
         {item.audio_owner?.username && (
            <TouchableOpacity onPress={() => router.push(`/user/${item.audio_owner_id}`)} style={[styles.vxAudioIdentityBadge, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]}>
               <Image source={{ uri: item.audio_owner.avatar_url || 'https://via.placeholder.com/50' }} style={styles.vxAudioOwnerImg} />
               <Text style={[styles.vxAudioOwnerName, isLight && { color: '#888' }]}>@{item.audio_owner.username}</Text>
               <MaterialCommunityIcons name="music-note" size={10} color={VOEXITheme.colors.secondary} style={{marginLeft: 4}} />
            </TouchableOpacity>
         )}
      </View>

      <Modal visible={optionsModal} animationType="slide" transparent onRequestClose={() => setOptionsModal(false)}>
        <View style={styles.optionsOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOptionsModal(false)} />
          <View style={[styles.optionsSheet, isLight && { backgroundColor: '#FFF' }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>SIGNAL OPTIONS</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {currentUserId === item.user_id && (
                <>
                  <TouchableOpacity style={[styles.menuItem, isLight && { borderBottomColor: '#EEE' }]} onPress={() => { setOptionsModal(false); router.push({ pathname: '/menu/video-analytics', params: { id: item.id } }); }}>
                    <Text style={[styles.menuLabel, isLight && { color: '#333' }]}>View Insights</Text>
                    <View style={[styles.menuIconBox, { backgroundColor: '#A855F7' }]}><Ionicons name="stats-chart" size={18} color="#fff" /></View>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.menuItem, isLight && { borderBottomColor: '#EEE' }]} onPress={() => { setOptionsModal(false); Alert.alert("DELETE", "Remove post?", [{ text: "Cancel" }, { text: "Delete", style: "destructive", onPress: () => Alert.alert("Deleted") }]); }}>
                    <Text style={[styles.menuLabel, { color: '#ff4444' }]}>Remove Post</Text>
                    <View style={[styles.menuIconBox, { backgroundColor: '#ff4444' }]}><Ionicons name="trash-outline" size={18} color="#fff" /></View>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity style={[styles.menuItem, isLight && { borderBottomColor: '#EEE' }]} onPress={() => { setOptionsModal(false); Alert.alert("INTERESTED", "Showing more like this."); }}>
                <Text style={[styles.menuLabel, isLight && { color: '#333' }]}>Interested</Text>
                <View style={[styles.menuIconBox, { backgroundColor: '#FFD700' }]}><Ionicons name="star" size={18} color="#000" /></View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, isLight && { borderBottomColor: '#EEE' }]} onPress={() => { setOptionsModal(false); Alert.alert("HIDDEN", "Showing fewer posts like this."); }}>
                <Text style={[styles.menuLabel, isLight && { color: '#333' }]}>Not Interested</Text>
                <View style={[styles.menuIconBox, { backgroundColor: '#444' }]}><Ionicons name="eye-off-outline" size={18} color="#fff" /></View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, isLight && { borderBottomColor: '#EEE' }]} onPress={async () => { setOptionsModal(false); await recordSave(item.id, currentUserId || ''); Alert.alert("SAVED", "Post saved to your bookmarks."); }}>
                <Text style={[styles.menuLabel, isLight && { color: '#333' }]}>Save Post</Text>
                <View style={[styles.menuIconBox, { backgroundColor: VOEXITheme.colors.primary }]}><Ionicons name="bookmark" size={18} color="#fff" /></View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, isLight && { borderBottomColor: '#EEE' }]} onPress={async () => { setOptionsModal(false); handleCopyLink(); }}>
                <Text style={[styles.menuLabel, isLight && { color: '#333' }]}>Copy Link</Text>
                <View style={[styles.menuIconBox, { backgroundColor: '#00F2FE' }]}><Ionicons name="link-outline" size={18} color="#000" /></View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, isLight && { borderBottomColor: '#EEE' }]} onPress={() => { setOptionsModal(false); openShareSheet(); }}>
                <Text style={[styles.menuLabel, isLight && { color: '#333' }]}>Send / Share Signal</Text>
                <View style={[styles.menuIconBox, { backgroundColor: '#EC4899' }]}><Ionicons name="paper-plane-outline" size={18} color="#fff" /></View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, isLight && { borderBottomColor: '#EEE' }]} onPress={() => { setOptionsModal(false); if (onAuditPress) onAuditPress(item); else Alert.alert("REPORTED", "Signal flagged for review."); }}>
                <Text style={[styles.menuLabel, { color: '#ff4444' }]}>Report Signal</Text>
                <View style={[styles.menuIconBox, { backgroundColor: 'rgba(255,68,68,0.2)' }]}><Ionicons name="flag-outline" size={18} color="#ff4444" /></View>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={{ padding: 15, alignItems: 'center' }} onPress={() => setOptionsModal(false)}><Text style={{ color: '#888', fontWeight: 'bold' }}>CANCEL</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* INSTAGRAM-STYLE SHARE MODAL */}
      <Modal visible={shareModal} animationType="slide" transparent onRequestClose={() => setShareModal(false)}>
        <View style={styles.optionsOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShareModal(false)} />
          <View style={[styles.shareSheet, isLight && { backgroundColor: '#FFF' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, isLight && { color: '#888' }]}>SEND SIGNAL</Text>

            <View style={styles.shareSearchBox}>
               <Ionicons name="search" size={18} color="#666" />
               <Text style={styles.shareSearchPlaceholder}>Search friends...</Text>
            </View>

            <View style={{ height: 180, marginBottom: 20 }}>
               {loadingFriends ? (
                 <ActivityIndicator color={VOEXITheme.colors.primary} style={{ marginTop: 50 }} />
               ) : (
                 <FlatList
                    horizontal
                    data={friends}
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={f => f.id}
                    contentContainerStyle={{ paddingHorizontal: 5 }}
                    renderItem={({ item: f }) => (
                       <TouchableOpacity style={styles.friendShareItem} onPress={() => handleShareToFriend(f.id)}>
                          <View style={styles.friendAvatarWrapper}>
                             <Image source={{ uri: f.avatar_url || 'https://via.placeholder.com/100' }} style={styles.friendShareAvatar} />
                             {sendingPostTo === f.id && (
                               <View style={styles.sendingOverlay}>
                                  <ActivityIndicator size="small" color="#fff" />
                               </View>
                             )}
                          </View>
                          <Text style={[styles.friendShareName, isLight && { color: '#333' }]} numberOfLines={1}>{f.username}</Text>
                          <View style={[styles.sendBtnSmall, { backgroundColor: sendingPostTo === f.id ? '#333' : VOEXITheme.colors.primary }]}>
                             <Text style={styles.sendBtnSmallText}>{sendingPostTo === f.id ? '...' : 'SEND'}</Text>
                          </View>
                       </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <View style={{ width: width - 50, justifyContent: 'center', alignItems: 'center' }}>
                         <Text style={{ color: '#444', fontSize: 12 }}>No synchronized agents found.</Text>
                      </View>
                    }
                 />
               )}
            </View>

            <View style={styles.externalShareRow}>
               <TouchableOpacity style={styles.externalAction} onPress={handleCopyLink}>
                  <View style={[styles.externalIconBox, { backgroundColor: 'rgba(255,255,255,0.05)' }]}><Ionicons name="link-outline" size={24} color={isLight ? "#000" : "#fff"} /></View>
                  <Text style={[styles.externalText, isLight && { color: '#666' }]}>Copy Link</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.externalAction} onPress={handleExternalShare}>
                  <View style={[styles.externalIconBox, { backgroundColor: 'rgba(255,255,255,0.05)' }]}><Ionicons name="share-outline" size={24} color={isLight ? "#000" : "#fff"} /></View>
                  <Text style={[styles.externalText, isLight && { color: '#666' }]}>Share To...</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.externalAction} onPress={() => { setShareModal(false); router.push('/(tabs)/upload'); }}>
                  <View style={[styles.externalIconBox, { backgroundColor: 'rgba(255,255,255,0.05)' }]}><Ionicons name="add-circle-outline" size={24} color={isLight ? "#000" : "#fff"} /></View>
                  <Text style={[styles.externalText, isLight && { color: '#666' }]}>Add to Story</Text>
               </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.closeShareBtn} onPress={() => setShareModal(false)}>
               <Text style={styles.closeShareText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
});

export default PostCard;

const styles = StyleSheet.create({
  vxMainCard: {
    backgroundColor: '#0A0A0F',
    borderRadius: 24,
    marginHorizontal: 15,
    marginBottom: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1A1A24',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  vxCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 14 },
  vxHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 },
  vxHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniChatBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#181824', borderWidth: 1, borderColor: '#2A2A3A', justifyContent: 'center', alignItems: 'center' },
  vxAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#fff' },
  vxCreatorName: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.2 },
  vxStationId: { color: '#666', fontSize: 9, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' },
  miniSubBtn: {
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 25,
    backgroundColor: '#A855F7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  miniSubText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  vxMediaContainerInner: { width: '100%', backgroundColor: '#000', overflow: 'hidden', position: 'relative' },
  vxMedia: { width: '100%', height: '100%' },
  playOverlayIcon: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)' },
  vxInteractionConsole: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 12 },
  vxActionGroup: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  vxMainAction: { alignItems: 'center', gap: 5 },
  vxActionLabel: { color: '#666', fontSize: 11, fontWeight: 'bold' },
  vxRemixButton: { borderRadius: 10, overflow: 'hidden' },
  vxRemixGradient: { paddingHorizontal: 15, paddingVertical: 8 },
  vxRemixText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  vxCaptionBox: { paddingHorizontal: 15, paddingBottom: 10 },
  vxPostTitle: { color: '#ddd', fontSize: 14, fontWeight: '600' },
  vxAudioIdentityBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#111', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#222' },
  vxAudioOwnerImg: { width: 16, height: 16, borderRadius: 8, marginRight: 6 },
  vxAudioOwnerName: { color: '#888', fontSize: 10, fontWeight: '900' },
  optionsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  optionsSheet: { backgroundColor: '#0A0A0F', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#333', alignSelf: 'center', marginBottom: 20, borderRadius: 2 },
  sheetTitle: { color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginBottom: 20 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#111' },
  menuLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  menuIconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  heartOverlay: { position: 'absolute', top: '50%', left: '50%', marginLeft: -50, marginTop: -50, zIndex: 100 },

  // SHARE SHEET STYLES
  shareSheet: { backgroundColor: '#0A0A0F', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, paddingBottom: 40 },
  shareSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', height: 45, borderRadius: 15, paddingHorizontal: 15, marginBottom: 25 },
  shareSearchPlaceholder: { color: '#666', marginLeft: 10, fontSize: 14 },
  friendShareItem: { alignItems: 'center', width: 90, marginRight: 15 },
  friendAvatarWrapper: { width: 65, height: 65, borderRadius: 32.5, marginBottom: 10, overflow: 'hidden', backgroundColor: '#111' },
  friendShareAvatar: { width: '100%', height: '100%' },
  sendingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  friendShareName: { color: '#aaa', fontSize: 10, fontWeight: 'bold', marginBottom: 8 },
  sendBtnSmall: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  sendBtnSmallText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  externalShareRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 10 },
  externalAction: { alignItems: 'center', gap: 8 },
  externalIconBox: { width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  externalText: { color: '#888', fontSize: 10, fontWeight: 'bold' },
  closeShareBtn: { marginTop: 40, alignItems: 'center', padding: 10 },
  closeShareText: { color: '#444', fontWeight: 'bold', letterSpacing: 1, fontSize: 12 }
});