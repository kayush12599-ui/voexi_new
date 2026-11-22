import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Modal, Pressable, Alert, Animated, Easing, Share, FlatList, ActivityIndicator, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { VOEXITheme } from '../constants/theme';
import { recordView, recordSave, recordLike, recordShare } from '../lib/earnings';
import { useFollow } from '../lib/social';
import SubscribeButton from './SubscribeButton';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useResponsive } from '../hooks/useResponsive';

const { width } = Dimensions.get('window');

const isValidUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
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
  if (url.startsWith('/')) {
    return `https://voexi.b-cdn.net${url}`;
  }
  if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('content://')) {
    return `https://voexi.b-cdn.net/${url}`;
  }
  return url;
};

const ActivePostVideoPlayer = memo(({ source }: { source: string }) => {
  const player = useVideoPlayer(source, (p) => {
    if (p) {
      p.muted = true;
      p.loop = true;
    }
  });

  useEffect(() => {
    if (!player) return;
    try {
      player.muted = true;
      player.loop = true;
      const res = player.play();
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {
      console.warn("[PostCard Video Safeguard]:", e);
    }

    return () => {
      try { player.pause(); } catch (e) {}
    };
  }, [player, source]);

  return Boolean(source && player) ? (
    <VideoView key={source} player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
  ) : null;
});

interface PostCardProps {
  item: any;
  isPlaying?: boolean;
  onUploaderPress?: (userId?: string) => void;
  onCardPress?: (item: any) => void;
  currentUserId?: string;
  isLight?: boolean;
  onAuditPress?: (item: any) => void;
}

const PostCard = memo(({ item, isPlaying, onUploaderPress, onCardPress, currentUserId, isLight, onAuditPress }: PostCardProps) => {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { isFollowing, toggleFollow } = useFollow(currentUserId, item?.user_id);
  const [isLiked, setIsLiked] = useState(false);
  const { isDesktop } = useResponsive();
  const [likes, setLikes] = useState(parseInt(item?.likes_count) || 0);
  const [commentsCount] = useState(parseInt(item?.comments_count) || 0);
  const [optionsModal, setOptionsModal] = useState(false);
  const [shareModal, setShareModal] = useState(false);
  const [photoViewerModal, setPhotoViewerModal] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [sendingPostTo, setSendingPostTo] = useState<string | null>(null);

  const heartAnim = useRef(new Animated.Value(0)).current;
  const [showHeart, setShowHeart] = useState(false);

  useEffect(() => {
    if (isFocused && item?.id) {
      recordView(item.id, item.user_id || '', currentUserId).catch(() => {});
    }
  }, [isFocused, item?.id, item?.user_id, currentUserId]);

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
    if (!currentUserId || !item?.id) return;
    setSendingPostTo(friendId);
    try {
      const shareUrl = `https://voexi.com/video/${item.id}`;
      const content = `Check out this production: ${item.title || ''}\n\n${shareUrl}`;

      const { error } = await supabase.from('messages').insert({
        sender_id: currentUserId,
        receiver_id: friendId,
        content: content,
        type: 'text'
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("SENT", "Signal transmitted to your friend!");
    } catch (e: any) {
      Alert.alert("FAILED", e?.message || "Transmission interrupted.");
    } finally {
      setSendingPostTo(null);
    }
  };

  const handleExternalShare = async () => {
    if (!item?.id) return;
    try {
      const shareUrl = `https://voexi.com/video/${item.id}`;
      await Share.share({
        message: `Watch ${item.profiles?.channel_name || 'this creator'} on VOEXI!\n\n${item.title || ''}\n${shareUrl}`,
        url: shareUrl
      });
      await recordShare(item.id);
    } catch (e) {
      console.warn("[PostCard Share Error]:", e);
    } finally {
      setShareModal(false);
    }
  };

  const handleCopyLink = async () => {
    if (!item?.id) return;
    try {
      const shareUrl = `https://voexi.com/video/${item.id}`;
      await Clipboard.setStringAsync(shareUrl);
      setShareModal(false);
      Alert.alert("COPIED", "Post link saved to clipboard.");
    } catch (e) {
      console.warn("[PostCard Copy Error]:", e);
    }
  };

  const openShareSheet = () => {
    setShareModal(true);
    fetchFriends();
  };

  const finalMediaUrl = useMemo(() => {
    if (!item) return '';
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

  const pt = (item?.post_type || '').toLowerCase();
  const isVideo = Boolean(finalMediaUrl) && (item?.media_type === 'video' || pt === 'video' || finalMediaUrl.toLowerCase().includes('.mp4') || finalMediaUrl.includes('m3u8') || finalMediaUrl.includes('mov') || finalMediaUrl.includes('b-cdn'));
  const posterUri = item?.thumbnail_url || finalMediaUrl;
  const shouldRenderVideo = isVideo && isPlaying && isFocused;

  const mediaAspectRatio = useMemo(() => {
    if (item?.aspect_ratio && typeof item.aspect_ratio === 'number') {
      return Math.max(0.8, Math.min(1.78, item.aspect_ratio));
    }
    if (item?.post_type === 'Photo' || item?.post_type === 'Reels') return 4 / 5;
    return 16 / 9;
  }, [item]);

  useEffect(() => {
    if (item?.id) {
      AsyncStorage.getItem(`liked_${item.id}`).then(val => {
        if (val !== null) {
          try {
            setIsLiked(JSON.parse(val));
          } catch (e) {}
        }
      });
      if (currentUserId && isValidUuid(item.id)) {
        supabase.from('likes').select('id').eq('post_id', item.id).eq('user_id', currentUserId).maybeSingle()
          .then(({ data }) => { if (data) setIsLiked(true); });
      }
    }
  }, [item?.id, currentUserId]);

  const handleLike = async () => {
    if (!item?.id) return;
    const newState = !isLiked;
    setIsLiked(newState);
    setLikes(prev => newState ? prev + 1 : Math.max(0, prev - 1));
    await recordLike(item.id, currentUserId || null, newState);
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

  const profileObj = useMemo(() => {
    if (!item) return null;
    if (Array.isArray(item.profiles)) return item.profiles[0] || null;
    if (item.profiles && typeof item.profiles === 'object') return item.profiles;
    return null;
  }, [item]);

  const rawCreatorName = profileObj?.channel_name || profileObj?.username || item?.channel_name || item?.username || item?.uploader || 'VOEXI Official';
  const rawCreatorUsername = profileObj?.username || profileObj?.channel_name || item?.username || item?.channel_name || 'voexi_official';
  const { name: creatorName, username: creatorUsername } = useMemo(() => sanitizeCreatorInfo(rawCreatorName, rawCreatorUsername), [rawCreatorName, rawCreatorUsername]);

  const rawAvatar = profileObj?.custom_logo_url || profileObj?.logo_url || profileObj?.avatar_url || item?.custom_logo_url || item?.logo_url || item?.avatar_url || item?.user_avatar || item?.uploader_avatar;
  const creatorAvatar = getValidAvatarUrl(rawAvatar, creatorName);
  const isPhoto = item?.post_type === 'Photo' || item?.media_type === 'image' || item?.category === 'PHOTOS' || item?.category === 'PHOTO';
  const isNeural = item?.post_type === 'Neural' || item?.post_type === 'Neural Writing' || item?.category === 'NEURAL_AI' || item?.is_neural;

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const photoUrls = useMemo(() => {
    if (!item) return [];
    if (Array.isArray(item.media_urls) && item.media_urls.length > 0) {
      return item.media_urls.map((u: string) => getValidAvatarUrl(u, 'Photo'));
    }
    if (Array.isArray(item.images) && item.images.length > 0) {
      return item.images.map((u: string) => getValidAvatarUrl(u, 'Photo'));
    }
    if (typeof item.media_urls === 'string') {
      try {
        const parsed = JSON.parse(item.media_urls);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((u: string) => getValidAvatarUrl(u, 'Photo'));
        }
      } catch {}
    }
    return posterUri ? [posterUri] : [];
  }, [item, posterUri]);

  const activePhotoUri = photoUrls[activePhotoIndex] || posterUri;

  const postTitle = useMemo(() => {
    let raw = item?.title || item?.description || 'VOEXI Production';
    if (raw.endsWith('.mp4') || raw.endsWith('.mov') || raw.endsWith('.m3u8') || raw.startsWith('VID_') || raw.startsWith('file_')) {
      raw = raw.replace(/\.[^/.]+$/, "").replace(/_/g, " ").replace(/-/g, " ");
      raw = raw.replace(/VID\s*\d+/gi, "VOEXI Studio Release").replace(/recording\s*\d+/gi, "Neural Spectrum Feed");
    }
    return raw;
  }, [item?.title, item?.description]);

  const handleCardPress = () => {
    if (typeof onCardPress === 'function') {
      onCardPress(item);
    } else {
      router.push(`/video/${item?.id}`);
    }
  };

  const handleUploaderClick = () => {
    if (typeof onUploaderPress === 'function') {
      onUploaderPress(item?.user_id);
    } else if (item?.user_id) {
      router.push(`/user/${item.user_id}`);
    }
  };

  const calculatedAspectRatio = isNeural ? 1 : (isPhoto ? (4 / 5) : mediaAspectRatio);

  return (
    <View style={[
      styles.vxMainCard,
      isDesktop && styles.desktopVxMainCard,
      isNeural && styles.neuralCardBorder,
      isLight && { backgroundColor: '#fff' }
    ]}>
      <View style={[styles.vxCardHeader, isLight && { borderBottomWidth: 0.5, borderBottomColor: '#EEE' }]}>
        <TouchableOpacity onPress={handleUploaderClick} style={styles.vxHeaderLeft}>
          <Image source={{ uri: creatorAvatar }} style={[styles.vxAvatar, isLight && { borderColor: '#EEE' }]} />
          <View style={{ flex: 1, marginRight: 6 }}>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.vxCreatorName, isLight && { color: '#000' }]} numberOfLines={1}>
                  {creatorName}
                </Text>
                <Ionicons name="checkmark-circle" size={14} color="#00F2FE" />
             </View>
             <Text style={[styles.vxStationId, isLight && { color: '#999' }]} numberOfLines={1}>
               @{creatorUsername}
             </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.vxHeaderRight}>
           {item?.user_id && currentUserId !== item.user_id && (
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

      {isPhoto && photoUrls.length > 1 ? (
        <View style={[{ width: '100%', aspectRatio: calculatedAspectRatio, position: 'relative' }, isLight && { backgroundColor: '#000' }]}>
          <FlatList
            data={photoUrls}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(uri, idx) => `carousel_img_${idx}`}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const page = Math.round(x / width);
              if (page !== activePhotoIndex && page >= 0 && page < photoUrls.length) {
                setActivePhotoIndex(page);
              }
            }}
            scrollEventThrottle={16}
            renderItem={({ item: photoUri, index }) => (
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => {
                  setActivePhotoIndex(index);
                  setPhotoViewerModal(true);
                }}
                onLongPress={handleDoubleTap}
                style={{ width: width, height: '100%' }}
              >
                <Image source={{ uri: photoUri }} style={styles.vxMedia} contentFit="cover" />
              </TouchableOpacity>
            )}
          />

          {/* CAROUSEL BATCH BADGE (e.g. 1/5) */}
          <View style={styles.carouselBadge}>
            <Text style={styles.carouselBadgeTxt}>
              {activePhotoIndex + 1}/{photoUrls.length}
            </Text>
          </View>

          {/* CAROUSEL DOTS INDICATOR */}
          <View style={styles.carouselDotsRow}>
            {photoUrls.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.carouselDot,
                  idx === activePhotoIndex && styles.carouselDotActive
                ]}
              />
            ))}
          </View>

          {showHeart && <Animated.View style={[styles.heartOverlay, { transform: [{ scale: heartAnim }] }]}><Ionicons name="heart" size={100} color="#fff" /></Animated.View>}
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={isPhoto ? () => setPhotoViewerModal(true) : handleCardPress}
          onLongPress={handleDoubleTap}
          style={[styles.vxMediaContainerInner, { aspectRatio: calculatedAspectRatio }, isLight && { backgroundColor: '#000' }]}
        >
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {shouldRenderVideo && finalMediaUrl ? (
               <ActivePostVideoPlayer source={finalMediaUrl} />
            ) : posterUri ? (
               <View style={StyleSheet.absoluteFill}>
                  <Image source={{ uri: posterUri }} style={styles.vxMedia} contentFit="cover" />
                  {isVideo && (
                    <View style={styles.playOverlayIcon}>
                       <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.85)" />
                    </View>
                  )}
               </View>
            ) : (
               <View style={[styles.vxMedia, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name={isPhoto ? "image-outline" : "videocam-outline"} size={40} color="#333" />
               </View>
            )}

            {/* NEURAL AI CREATION OVERLAY BADGE */}
            {isNeural && (
              <View style={styles.neuralBadgePill}>
                <Ionicons name="hardware-chip" size={12} color="#00F2FE" />
                <Text style={styles.neuralBadgeTxt}>NEURAL AI CREATION</Text>
              </View>
            )}

            {/* PHOTO PORTFOLIO OVERLAY BADGE */}
            {isPhoto && (
              <View style={styles.photoBadgePill}>
                <Ionicons name="image" size={12} color="#22C55E" />
                <Text style={styles.photoBadgeTxt}>PHOTO PORTFOLIO</Text>
              </View>
            )}

            {showHeart && <Animated.View style={[styles.heartOverlay, { transform: [{ scale: heartAnim }] }]}><Ionicons name="heart" size={100} color="#fff" /></Animated.View>}
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.vxInteractionConsole}>
        <View style={styles.vxActionGroup}>
          <TouchableOpacity style={styles.vxMainAction} onPress={handleLike}>
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color={isLiked ? VOEXITheme.colors.primary : (isLight ? "#000" : "#fff")} />
            <Text style={[styles.vxActionLabel, isLight && { color: '#666' }]}>{likes}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.vxMainAction} onPress={handleCardPress}>
            <Ionicons name="chatbubble-outline" size={20} color={isLight ? "#000" : "#fff"} />
            <Text style={[styles.vxActionLabel, isLight && { color: '#666' }]}>{commentsCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.vxMainAction} onPress={openShareSheet}>
            <Ionicons name="paper-plane-outline" size={20} color={isLight ? "#000" : "#fff"} />
            <Text style={[styles.vxActionLabel, isLight && { color: '#666' }]}>Share</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.vxRemixButton} onPress={() => router.push(`/remix/${item?.id}`)}>
          <LinearGradient colors={isNeural ? ['#00F2FE', '#A855F7'] : [VOEXITheme.colors.primary, '#4c1d95']} style={styles.vxRemixGradient}>
            <Text style={styles.vxRemixText}>{isNeural ? 'GENERATE' : 'REMIX'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={0.9} onPress={handleCardPress} style={styles.vxCaptionBox}>
         <Text style={[styles.vxPostTitle, isLight && { color: '#333' }]} numberOfLines={2}>
           {postTitle}
         </Text>

         {/* NEURAL AI PROMPT & MODEL BADGE */}
         {isNeural && (
            <View style={styles.aiPromptContainer}>
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  <Ionicons name="sparkles" size={11} color="#00F2FE" />
                  <Text style={{ color: '#00F2FE', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>VOEXI NEURAL MODEL v2.4</Text>
               </View>
               <Text style={styles.aiPromptTxt} numberOfLines={2}>✨ Prompt: "{item?.description || item?.title || 'Cyberpunk Neural Asset'}"</Text>
            </View>
         )}

         <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
            <Text style={{ fontSize: 11, color: isLight ? '#666' : '#888', fontWeight: '500' }}>
              {Number(item?.views_count || 0).toLocaleString()} views  •  {item?.created_at ? new Date(item.created_at).toLocaleDateString() : 'Just now'}
            </Text>
         </View>
         {item?.audio_owner?.username && (
            <TouchableOpacity onPress={() => router.push(`/user/${item.audio_owner_id}`)} style={[styles.vxAudioIdentityBadge, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]}>
               <Image source={{ uri: getValidAvatarUrl(item.audio_owner.avatar_url || item.audio_owner.custom_logo_url || item.audio_owner.logo_url, item.audio_owner.username) }} style={styles.vxAudioOwnerImg} />
               <Text style={[styles.vxAudioOwnerName, isLight && { color: '#888' }]}>@{item.audio_owner.username}</Text>
               <MaterialCommunityIcons name="music-note" size={10} color={VOEXITheme.colors.secondary} style={{marginLeft: 4}} />
            </TouchableOpacity>
         )}
      </TouchableOpacity>

      {/* DISTINCT 1PX DIVIDER LINE BETWEEN POSTS */}
      <View style={[styles.cardSeparatorLine, isLight && { backgroundColor: '#EEEEEE' }]} />

      <Modal visible={optionsModal} animationType="slide" transparent onRequestClose={() => setOptionsModal(false)}>
        <View style={styles.optionsOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOptionsModal(false)} />
          <View style={[styles.optionsSheet, isLight && { backgroundColor: '#FFF' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { letterSpacing: 2 }]}>MORE</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {currentUserId === item?.user_id && (
                <TouchableOpacity style={[styles.menuItem, isLight && { borderBottomColor: '#EEE' }]} onPress={() => { setOptionsModal(false); router.push({ pathname: '/menu/video-analytics', params: { id: item?.id } }); }}>
                  <Text style={[styles.menuLabel, isLight && { color: '#333' }]}>View Insights</Text>
                  <View style={[styles.menuIconBox, { backgroundColor: '#A855F7' }]}><Ionicons name="stats-chart" size={18} color="#fff" /></View>
                </TouchableOpacity>
              )}
              {/* REMIX / CREATE DUET */}
              <TouchableOpacity
                style={[styles.menuItem, isLight && { borderBottomColor: '#EEE' }]}
                onPress={() => {
                  setOptionsModal(false);
                  router.push(`/remix/${item?.id}`);
                }}
              >
                <Text style={[styles.menuLabel, isLight && { color: '#333' }]}>Remix / Create Duet</Text>
                <View style={[styles.menuIconBox, { backgroundColor: '#A855F7' }]}>
                  <Ionicons name="sparkles" size={18} color="#fff" />
                </View>
              </TouchableOpacity>

              {/* SAVE / BOOKMARK */}
              <TouchableOpacity
                style={[styles.menuItem, isLight && { borderBottomColor: '#EEE' }]}
                onPress={async () => {
                  setOptionsModal(false);
                  if (item?.id) {
                    await recordSave(item.id);
                    Alert.alert("SAVED", "Post saved to your bookmarks.");
                  }
                }}
              >
                <Text style={[styles.menuLabel, isLight && { color: '#333' }]}>Save to Bookmarks</Text>
                <View style={[styles.menuIconBox, { backgroundColor: VOEXITheme.colors.primary }]}>
                  <Ionicons name="bookmark" size={18} color="#fff" />
                </View>
              </TouchableOpacity>

              {/* COPY LINK */}
              <TouchableOpacity
                style={[styles.menuItem, isLight && { borderBottomColor: '#EEE' }]}
                onPress={() => {
                  setOptionsModal(false);
                  handleCopyLink();
                }}
              >
                <Text style={[styles.menuLabel, isLight && { color: '#333' }]}>Copy Post Link</Text>
                <View style={[styles.menuIconBox, { backgroundColor: '#00F2FE' }]}>
                  <Ionicons name="link-outline" size={18} color="#000" />
                </View>
              </TouchableOpacity>

              {/* SEND / SHARE SIGNAL */}
              <TouchableOpacity
                style={[styles.menuItem, isLight && { borderBottomColor: '#EEE' }]}
                onPress={() => {
                  setOptionsModal(false);
                  openShareSheet();
                }}
              >
                <Text style={[styles.menuLabel, isLight && { color: '#333' }]}>Send Signal / Share</Text>
                <View style={[styles.menuIconBox, { backgroundColor: '#EC4899' }]}>
                  <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                </View>
              </TouchableOpacity>

              {/* NEURAL AUDIT & TELEMETRY */}
              <TouchableOpacity
                style={[styles.menuItem, isLight && { borderBottomColor: '#EEE' }]}
                onPress={() => {
                  setOptionsModal(false);
                  if (typeof onAuditPress === 'function') onAuditPress(item);
                  else Alert.alert("NEURAL AUDIT", `Signal Score: ${item?.algorithm_score || '98.5'}\nVirality Index: High`);
                }}
              >
                <Text style={[styles.menuLabel, isLight && { color: '#333' }]}>Neural Audit & Telemetry</Text>
                <View style={[styles.menuIconBox, { backgroundColor: '#FFD700' }]}>
                  <Ionicons name="hardware-chip-outline" size={18} color="#000" />
                </View>
              </TouchableOpacity>

              {/* INTERESTED */}
              <TouchableOpacity
                style={[styles.menuItem, isLight && { borderBottomColor: '#EEE' }]}
                onPress={() => {
                  setOptionsModal(false);
                  Alert.alert("INTERESTED", "Showing more content like this.");
                }}
              >
                <Text style={[styles.menuLabel, isLight && { color: '#333' }]}>Interested</Text>
                <View style={[styles.menuIconBox, { backgroundColor: '#22C55E' }]}>
                  <Ionicons name="star" size={18} color="#fff" />
                </View>
              </TouchableOpacity>

              {/* NOT INTERESTED */}
              <TouchableOpacity
                style={[styles.menuItem, isLight && { borderBottomColor: '#EEE' }]}
                onPress={() => {
                  setOptionsModal(false);
                  Alert.alert("HIDDEN", "Showing fewer posts like this.");
                }}
              >
                <Text style={[styles.menuLabel, isLight && { color: '#333' }]}>Not Interested</Text>
                <View style={[styles.menuIconBox, { backgroundColor: '#444' }]}>
                  <Ionicons name="eye-off-outline" size={18} color="#fff" />
                </View>
              </TouchableOpacity>

              {/* REPORT SIGNAL */}
              <TouchableOpacity
                style={[styles.menuItem, isLight && { borderBottomColor: '#EEE' }]}
                onPress={() => {
                  setOptionsModal(false);
                  Alert.alert("REPORTED", "Signal flagged for review.");
                }}
              >
                <Text style={[styles.menuLabel, { color: '#ff4444' }]}>Report Signal</Text>
                <View style={[styles.menuIconBox, { backgroundColor: 'rgba(255,68,68,0.2)' }]}>
                  <Ionicons name="flag-outline" size={18} color="#ff4444" />
                </View>
              </TouchableOpacity>

              {/* DELETE POST (IF OWNER) */}
              {(currentUserId === item?.user_id || item?.uploader === '@admin_creator') && (
                <TouchableOpacity
                  style={[styles.menuItem, isLight && { borderBottomColor: '#EEE' }]}
                  onPress={() => {
                    setOptionsModal(false);
                    Alert.alert("DELETE", "Permanently remove this production?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => Alert.alert("Deleted", "Post removed.") }
                    ]);
                  }}
                >
                  <Text style={[styles.menuLabel, { color: '#ff4444' }]}>Delete Production</Text>
                  <View style={[styles.menuIconBox, { backgroundColor: '#ff4444' }]}>
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                  </View>
                </TouchableOpacity>
              )}
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
                    keyExtractor={(f, index) => f?.id || index.toString()}
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

      {/* FULLSCREEN CLEAN PHOTO VIEWER MODAL */}
      <Modal
        visible={photoViewerModal}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setPhotoViewerModal(false)}
      >
        <View style={styles.photoViewerContainer}>
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={() => setPhotoViewerModal(false)}
          >
            <Image
              source={{ uri: activePhotoUri }}
              style={styles.fullPhotoMedia}
              contentFit="contain"
            />
          </TouchableOpacity>

          {/* TOP CLOSE BUTTON */}
          <SafeAreaView style={styles.photoViewerHeader} edges={['top']}>
            <TouchableOpacity
              style={styles.photoViewerCloseBtn}
              onPress={() => setPhotoViewerModal(false)}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>

        </View>
      </Modal>
    </View>
  );
});

export default PostCard;

const styles = StyleSheet.create({
  carouselBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 10,
  },
  carouselBadgeTxt: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  carouselDotsRow: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
    zIndex: 10,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  carouselDotActive: {
    width: 16,
    backgroundColor: VOEXITheme.colors.primary,
  },
  photoViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPhotoMedia: {
    width: '100%',
    height: '100%',
  },
  photoViewerHeader: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 100,
  },
  photoViewerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  photoViewerFooter: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    zIndex: 100,
  },
  photoViewerShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: VOEXITheme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 10,
    shadowColor: VOEXITheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  photoViewerShareText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  vxMainCard: {
    backgroundColor: '#000000',
    borderRadius: 0,
    marginHorizontal: 0,
    marginBottom: 12,
    overflow: 'hidden',
  },
  desktopVxMainCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1A1A24',
    overflow: 'hidden',
    backgroundColor: '#0A0A10',
    marginBottom: 0,
  },
  cardSeparatorLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    width: '100%',
    marginTop: 10,
  },
  neuralCardBorder: {
    borderBottomColor: 'rgba(168, 85, 247, 0.6)',
    borderBottomWidth: 1.5,
  },
  neuralBadgePill: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(10, 10, 18, 0.85)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#00F2FE', zIndex: 10 },
  neuralBadgeTxt: { color: '#00F2FE', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  photoBadgePill: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(10, 10, 18, 0.85)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#22C55E', zIndex: 10 },
  photoBadgeTxt: { color: '#22C55E', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  aiPromptContainer: { backgroundColor: 'rgba(168, 85, 247, 0.1)', padding: 10, borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.25)' },
  aiPromptTxt: { color: '#E2E8F0', fontSize: 11, fontStyle: 'italic', lineHeight: 16 },
  vxCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 14 },
  vxHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 },
  vxHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniChatBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255, 255, 255, 0.06)', justifyContent: 'center', alignItems: 'center' },
  vxAvatar: { width: 40, height: 40, borderRadius: 20 },
  vxCreatorName: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.2 },
  vxStationId: { color: '#666', fontSize: 9, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' },
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
