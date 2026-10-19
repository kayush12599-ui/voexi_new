import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Share, Modal, Pressable, Animated, Switch, Easing, Dimensions, Alert, ScrollView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { VOEXITheme } from '../constants/theme';
import { recordView, recordSave, recordLike } from '../lib/earnings';
import { useFollow } from '../lib/social';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

const isValidUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const VideoFeedItem = memo(({ item, isActive, isScreenFocused, itemHeight, currentUserId, onCommentPress, onReportPress, ghostMode, setGhostMode, autoScrollEnabled, setAutoScroll, gestureEnabled, setGestureEnabled, playbackSpeed, setPlaybackSpeed, onAutoScrollNext }: any) => {
  const router = useRouter();
  const [optionsModal, setOptionsModal] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const playPauseAnim = useRef(new Animated.Value(0)).current;
  const viewCounted = useRef(false);

  const lastTapRef = useRef<number>(0);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const togglePlayPause = () => {
    if (!player) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isPaused) {
      try { player.play(); } catch(e){}
      setIsPaused(false);
      Animated.timing(playPauseAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    } else {
      try { player.pause(); } catch(e){}
      setIsPaused(true);
      playPauseAnim.setValue(1);
    }
  };

  const handleScreenPress = () => {
    if (ghostMode) {
      setGhostMode(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 280;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (!isLiked) {
        handleLike();
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

      heartScale.setValue(0.2);
      heartOpacity.setValue(1);
      Animated.parallel([
        Animated.spring(heartScale, { toValue: 1.2, friction: 3, useNativeDriver: true }),
        Animated.timing(heartOpacity, { toValue: 0, duration: 700, delay: 200, useNativeDriver: true })
      ]).start();

      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (Date.now() - lastTapRef.current >= DOUBLE_TAP_DELAY && lastTapRef.current !== 0) {
          togglePlayPause();
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const finalUrl = useMemo(() => {
    let url = item.video_url || item.media_url || '';
    if (!url) return '';
    url = url.trim();
    if (url.startsWith('//')) url = 'https:' + url;
    if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('content://') && url !== '') {
      url = `https://voexi.b-cdn.net/${url}`;
    }
    return url.replace('videosvoexi.b-cdn.net', 'voexi.b-cdn.net').replace('VOEXI.b-cdn.net', 'voexi.b-cdn.net');
  }, [item]);

  const shouldPlay = isActive && isScreenFocused && Boolean(finalUrl);
  // ⚡ 60 FPS PERFORMANCE OPTIMIZATION: Only initialize native video player for active video
  const playerSource = shouldPlay ? finalUrl : '';
  const player = useVideoPlayer(playerSource, (p) => {
    if (p) p.loop = !autoScrollEnabled;
  });

  const rotateAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isActive && isScreenFocused) {
      Animated.loop(Animated.timing(rotateAnim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })).start();
    } else { rotateAnim.stopAnimation(); }
  }, [isActive, isScreenFocused]);

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  useEffect(() => {
    if (!player) return;

    if (isActive && isScreenFocused && playerSource) {
      setIsPaused(false);
      playPauseAnim.setValue(0);
      try {
        player.loop = !autoScrollEnabled;
        player.playbackRate = playbackSpeed;
        try { (player as any).rate = playbackSpeed; } catch (e) {}
        const res = player.play();
        if (res && typeof res.catch === 'function') res.catch(() => {});

        if (!viewCounted.current && !item.id?.includes('dummy')) {
          setTimeout(() => { recordView(item.id, item.user_id, currentUserId || undefined); viewCounted.current = true; }, 3000);
        }
      } catch (e) {
        console.warn("[VideoFeedItem Play Guard]:", e);
      }
    } else {
      try {
        player.pause();
      } catch (e) {}
    }
  }, [player, isActive, isScreenFocused, playerSource, autoScrollEnabled, playbackSpeed]);

  useEffect(() => {
    if (!player) return;
    const errorSub = player.addListener('error', (e) => {
      console.warn("[VideoFeedItem Player Error]:", e);
    });
    return () => {
      try { errorSub?.remove?.(); } catch (e) {}
    };
  }, [player]);

  const autoScrollTriggered = useRef(false);

  useEffect(() => {
    autoScrollTriggered.current = false;
  }, [isActive, item.id]);

  // Auto-scroll listener when video reaches completion
  useEffect(() => {
    if (!player) return;

    const triggerNext = () => {
      if (autoScrollEnabled && !autoScrollTriggered.current) {
        autoScrollTriggered.current = true;
        if (onAutoScrollNext) {
          onAutoScrollNext();
        }
      }
    };

    // Official native completion listener
    const subPlayToEnd = player.addListener('playToEnd', () => {
      triggerNext();
    });

    // Precision fallback listener: requires currentTime > 1.5s AND reached duration end
    const subTimeUpdate = player.addListener('timeUpdate', ({ currentTime }: any) => {
      if (
        autoScrollEnabled &&
        player.duration > 2 &&
        currentTime > 1.5 &&
        currentTime >= player.duration - 0.3
      ) {
        triggerNext();
      }
    });

    return () => {
      try { subPlayToEnd?.remove?.(); } catch (e) {}
      try { subTimeUpdate?.remove?.(); } catch (e) {}
    };
  }, [player, autoScrollEnabled, onAutoScrollNext]);

  const { isFollowing, toggleFollow } = useFollow(currentUserId, item.user_id);
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(parseInt(item.likes_count) || 0);
  const [isSaved, setIsSaved] = useState(false);

  const isPenDrive = !isValidUuid(item.id) || item.id?.startsWith('pendrive_') || item.id?.includes('dummy');

  useEffect(() => {
    if (item.id) {
      AsyncStorage.getItem(`liked_${item.id}`).then(val => {
        if (val !== null) setIsLiked(JSON.parse(val));
      });
      AsyncStorage.getItem(`pendrive_save_${item.id}`).then(val => {
        if (val !== null) setIsSaved(JSON.parse(val));
      });
      if (currentUserId && isValidUuid(item.id)) {
        supabase.from('likes').select('id').eq('post_id', item.id).eq('user_id', currentUserId).maybeSingle()
          .then(({ data }) => { if (data) setIsLiked(true); });
      }
    }
  }, [item.id, currentUserId]);

  const handleLike = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const nS = !isLiked; setIsLiked(nS);
    setLikes(p => nS ? p + 1 : Math.max(0, p - 1));
    await recordLike(item.id, currentUserId, nS);

    // Live Algorithm Score Update for Media Server
    fetch('http://192.168.31.39:8080/api/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: item.filename || item.id, isLiked: nS })
    }).catch(() => {});
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Watch @${creatorUsername} on VOEXI!\n\n${item.title || 'Reel'}\n${finalUrl}`,
        url: finalUrl
      });
      fetch('http://192.168.31.39:8080/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: item.filename || item.id, event_type: 'share', userId: currentUserId || 'guest', category: item.category })
      }).catch(() => {});
    } catch (e) {}
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const ns = !isSaved;
    setIsSaved(ns);
    if (isPenDrive) {
      try {
        await AsyncStorage.setItem(`pendrive_save_${item.id}`, JSON.stringify(ns));
        fetch('http://192.168.31.39:8080/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: item.id, isSaved: ns })
        }).catch(() => {});
      } catch (e) {}
    } else {
      if (ns) await recordSave(item.id);
    }
    Alert.alert("SAVED", ns ? "Reel saved to your bookmarks." : "Reel removed from saved.");
  };

  const typeLabel = item.post_type === 'Video' ? 'Video' : item.post_type === 'Photo' ? 'Photo' : 'Signal';

  const creatorProfile = useMemo(() => {
    if (!item) return null;
    if (Array.isArray(item.profiles)) return item.profiles[0] || null;
    if (item.profiles && typeof item.profiles === 'object') return item.profiles;
    return null;
  }, [item]);

  const creatorChannelName = creatorProfile?.channel_name || creatorProfile?.username || item?.channel_name || item?.username || 'VOEXI CREATOR';
  const creatorUsername = creatorProfile?.username || creatorProfile?.channel_name || item?.username || item?.channel_name || 'creator';
  const creatorAvatar = creatorProfile?.avatar_url || item?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(creatorChannelName)}&background=A855F7&color=fff&bold=true`;

  return (
    <View style={{ height: itemHeight, width: width, backgroundColor: '#000', paddingVertical: 12, paddingHorizontal: 6, overflow: 'hidden' }}>
      <View style={{ flex: 1, borderRadius: 24, backgroundColor: '#0A0A0F', overflow: 'hidden', borderWidth: 1, borderColor: '#1A1A24', position: 'relative' }}>
      {(item.thumbnail_url || item.media_url) && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Image
            source={{ uri: item.thumbnail_url || item.media_url }}
            style={[StyleSheet.absoluteFillObject, { transform: [{ scale: 1.3 }] }]}
            contentFit="cover"
            blurRadius={Platform.OS === 'android' ? 35 : 60}
          />
          <BlurView
            intensity={Platform.OS === 'android' ? 50 : 80}
            tint="dark"
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.35)' }]} />
        </View>
      )}

      {isActive && isScreenFocused && playerSource && player && (
        <View style={{ flex: 1, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{
            width: '100%',
            height: '100%',
            transform: [
              { translateX: item.crop_x || 0 },
              { translateY: item.crop_y || 0 },
              { scale: item.crop_scale || 1.0 }
            ]
          }}>
            <VideoView
              key={`feed_player_${item.id}`}
              player={player}
              style={StyleSheet.absoluteFillObject}
              contentFit={item.crop_fit || (item.aspect_ratio && item.aspect_ratio > 1.2 ? "contain" : "cover")}
              nativeControls={false}
            />
          </View>
        </View>
      )}

      <Pressable style={StyleSheet.absoluteFill} onPress={handleScreenPress}>
        <Animated.View style={[styles.centerPlayBtn, { opacity: playPauseAnim, transform: [{ scale: playPauseAnim }] }]} pointerEvents="none">
          <View style={styles.playIconCircle}>
            <Ionicons name={isPaused ? "play" : "pause"} size={38} color="#fff" style={{ marginLeft: isPaused ? 4 : 0 }} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.centerHeartBtn, { opacity: heartOpacity, transform: [{ scale: heartScale }] }]} pointerEvents="none">
          <Ionicons name="heart" size={100} color="#FF017E" style={styles.heartGlow} />
        </Animated.View>
      </Pressable>

      <LinearGradient colors={['rgba(0,0,0,0.1)', 'transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} pointerEvents="none" />

      {autoScrollEnabled && !ghostMode && (
        <View style={styles.autoScrollBadge}>
          <Ionicons name="repeat" size={12} color="#00F2FE" />
          <Text style={styles.autoScrollBadgeText}>AUTO-SCROLL ON</Text>
        </View>
      )}

      {playbackSpeed !== 1.0 && !ghostMode && (
        <View style={[styles.autoScrollBadge, { top: autoScrollEnabled ? 85 : 50, backgroundColor: 'rgba(255, 215, 0, 0.2)', borderColor: '#FFD700' }]}>
          <Ionicons name="flash" size={12} color="#FFD700" />
          <Text style={[styles.autoScrollBadgeText, { color: '#FFD700' }]}>{playbackSpeed}x SPEED</Text>
        </View>
      )}

      {ghostMode && (
        <TouchableOpacity
          style={styles.ghostExitPill}
          onPress={() => {
            setGhostMode(false);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="eye-off" size={14} color="#00F2FE" />
          <Text style={styles.ghostExitText}>GHOST MODE ACTIVE • TAP SCREEN TO EXIT</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.overlay, ghostMode && { opacity: 0 }]} pointerEvents={ghostMode ? 'none' : 'auto'}>
        <View style={styles.bottomInfo}>
          <View style={styles.uploaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => item.user_id && router.push(`/user/${item.user_id}`)}>
                 <Image source={{ uri: creatorAvatar }} style={styles.miniAvatar} />
              </TouchableOpacity>
              {Array.isArray(item.collaborators) && item.collaborators.length > 0 ? (
                item.collaborators.map((c: any, idx: number) => (
                  <TouchableOpacity key={c.id || idx} onPress={() => c.id && router.push(`/user/${c.id}`)} style={{ marginLeft: -12 }}>
                     <Image source={{ uri: c.avatar_url || 'https://via.placeholder.com/100' }} style={[styles.miniAvatar, { borderWidth: 1.5, borderColor: '#A855F7' }]} />
                  </TouchableOpacity>
                ))
              ) : (item.collaborator_avatar || item.collaborator_name) && (
                <TouchableOpacity onPress={() => item.collaborator_id && router.push(`/user/${item.collaborator_id}`)} style={{ marginLeft: -12 }}>
                   <Image source={{ uri: item.collaborator_avatar || 'https://via.placeholder.com/100' }} style={[styles.miniAvatar, { borderWidth: 1.5, borderColor: '#A855F7' }]} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.nameCol}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  @{creatorUsername}
                </Text>
                <View style={styles.onlineDot} />
                {item.user_id && currentUserId !== item.user_id && (
                  <TouchableOpacity
                    style={[styles.subBtn, isFollowing && styles.subBtnActive]}
                    onPress={toggleFollow}
                  >
                    <Text style={[styles.subBtnText, isFollowing && styles.subBtnTextActive]}>
                      {isFollowing ? 'SUBSCRIBED' : 'SUBSCRIBE'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* COLLABORATOR NAME SHOWN BELOW UPLOADER */}
              {(Array.isArray(item.collaborators) && item.collaborators.length > 0) ? (
                <View style={styles.collabRowBelow}>
                  <Ionicons name="people" size={11} color="#00F2FE" />
                  <Text style={styles.collabTextFeed} numberOfLines={1}>
                    Collab: {item.collaborators.map((c: any) => `@${c.username || c.channel_name}`).join(', ')}
                  </Text>
                </View>
              ) : item.collaborator_name ? (
                <View style={styles.collabRowBelow}>
                  <Ionicons name="people" size={11} color="#00F2FE" />
                  <Text style={styles.collabTextFeed} numberOfLines={1}>
                    Collab: @{item.collaborator_name}
                  </Text>
                </View>
              ) : null}

              <Text style={styles.categoryTxt}>{creatorChannelName.toUpperCase()} • {creatorProfile?.category || item.category || 'EXPLORER'}</Text>
            </View>
          </View>

          <Text style={styles.titleText}>{item.title || 'VOEXI SIGNAL'}</Text>
          <Text style={styles.descText} numberOfLines={2}>{item.description || ''}</Text>
        </View>

        <View style={styles.sidebar}>
          <TouchableOpacity style={styles.sideBtn} onPress={handleLike}>
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={26} color={isLiked ? VOEXITheme.colors.primary : "#fff"} />
            <Text style={styles.sideBtnText}>{likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideBtn} onPress={() => onCommentPress(item)}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#fff" />
            <Text style={styles.sideBtnText}>{item.comments_count || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideBtn} onPress={() => router.push({ pathname: '/menu/rate-signal', params: { postId: item.id } })}>
            <Ionicons name="star-outline" size={24} color="#FFD700" />
            <Text style={[styles.sideBtnText, {color: '#FFD700'}]}>RATE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideBtn} onPress={handleShare}>
            <Ionicons name="paper-plane-outline" size={24} color="#00F2FE" />
            <Text style={[styles.sideBtnText, {color: '#00F2FE'}]}>SHARE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideBtn} onPress={handleSave}>
             <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={24} color={isSaved ? VOEXITheme.colors.primary : "#fff"} />
             <Text style={[styles.sideBtnText, isSaved && { color: VOEXITheme.colors.primary }]}>{isSaved ? 'SAVED' : 'SAVE'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideBtn} onPress={() => setOptionsModal(true)}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
            <Text style={styles.sideBtnText}>MORE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideBtn} onPress={() => router.push(`/remix/${item.id}`)}>
             <Animated.View style={[styles.diskWrapper, { transform: [{ rotate }] }]}>
                <Image source={{ uri: item.profiles?.avatar_url || 'https://via.placeholder.com/100' }} style={styles.diskCover} />
             </Animated.View>
             <Text style={styles.sideBtnText}>REMIX</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={optionsModal} transparent animationType="slide" onRequestClose={() => setOptionsModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOptionsModal(false)} />
          <View style={styles.optionsSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>REELS MISSION CONTROL</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* CREATOR & COLLABORATOR MISSION CONTROL MATRIX CARD */}
              <View style={styles.missionCard}>
                <View style={styles.missionCardHeader}>
                  <Ionicons name="shield-checkmark-sharp" size={15} color="#A855F7" />
                  <Text style={styles.missionCardTitle}>CREATOR & COLLABORATOR MATRIX</Text>
                </View>

                {/* 1. UPLOADER DISPLAY */}
                <View style={styles.identityRow}>
                  <Image source={{ uri: creatorAvatar }} style={styles.uploaderAvatarModal} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.uploaderNameText} numberOfLines={1}>@{creatorUsername}</Text>
                      <View style={styles.uploaderPill}><Text style={styles.uploaderPillTxt}>UPLOADER 🚀</Text></View>
                    </View>
                    <Text style={styles.uploaderSubText}>{creatorChannelName} • Primary Creator</Text>
                  </View>
                </View>

                {/* 2. NICHE (BELOW): COLLAB PARTNER DISPLAY */}
                {(Array.isArray(item.collaborators) && item.collaborators.length > 0) ? (
                  <View style={styles.collabSectionModal}>
                    <View style={styles.collabDividerModal} />
                    <Text style={styles.collabSubHeaderModal}>COLLABORATION PARTNERS</Text>
                    {item.collaborators.map((c: any, idx: number) => (
                      <View key={c.id || idx} style={styles.identityRowCollab}>
                        <Image source={{ uri: c.avatar_url || 'https://via.placeholder.com/100' }} style={styles.collabAvatarModal} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.collabNameText} numberOfLines={1}>@{c.username || c.channel_name}</Text>
                            <View style={styles.collabPill}><Text style={styles.collabPillTxt}>COLLAB PARTNER 🤝</Text></View>
                          </View>
                          <Text style={styles.uploaderSubText}>{c.channel_name || 'Co-Creator'}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : item.collaborator_name ? (
                  <View style={styles.collabSectionModal}>
                    <View style={styles.collabDividerModal} />
                    <Text style={styles.collabSubHeaderModal}>COLLABORATOR PARTNER</Text>
                    <View style={styles.identityRowCollab}>
                      <Image source={{ uri: item.collaborator_avatar || 'https://via.placeholder.com/100' }} style={styles.collabAvatarModal} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.collabNameText} numberOfLines={1}>@{item.collaborator_name}</Text>
                          <View style={styles.collabPill}><Text style={styles.collabPillTxt}>COLLAB PARTNER 🤝</Text></View>
                        </View>
                        <Text style={styles.uploaderSubText}>Co-Creator</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noCollabModalRow}>
                    <Text style={styles.noCollabModalTxt}>Solo Reel • No Collaboration Partner Linked</Text>
                  </View>
                )}
              </View>
              {currentUserId === item.user_id && (
                <>
                  <TouchableOpacity style={styles.menuItem} onPress={() => { setOptionsModal(false); router.push({ pathname: '/menu/video-analytics', params: { id: item.id } }); }}>
                    <Text style={styles.menuLabel}>View Insights</Text>
                    <Ionicons name="stats-chart" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem} onPress={() => { setOptionsModal(false); Alert.alert("DELETE", "Are you sure you want to remove this reel?", [{ text: "Cancel" }, { text: "Delete", style: "destructive", onPress: () => Alert.alert("Deleted") }]); }}>
                    <Text style={[styles.menuLabel, {color: '#ff4444'}]}>Remove {typeLabel}</Text>
                    <Ionicons name="trash-outline" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity style={styles.menuItem} onPress={() => { setOptionsModal(false); Alert.alert("INTERESTED", "We will show you more reels like this."); }}>
                <Text style={styles.menuLabel}>Interested</Text>
                <Ionicons name="star" size={20} color="#FFD700" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setOptionsModal(false); Alert.alert("HIDDEN", "We will show fewer posts like this."); }}>
                <Text style={styles.menuLabel}>Not Interested</Text>
                <Ionicons name="eye-off-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={async () => { setOptionsModal(false); await Clipboard.setStringAsync(finalUrl); Alert.alert("COPIED", "Reel link copied to clipboard."); }}>
                <Text style={styles.menuLabel}>Copy Signal Link</Text>
                <Ionicons name="link-outline" size={20} color="#00F2FE" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setOptionsModal(false); Share.share({ url: finalUrl }); }}>
                <Text style={styles.menuLabel}>Share External</Text>
                <Ionicons name="share-social-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => { recordSave(item.id, currentUserId || ''); setOptionsModal(false); Alert.alert("SAVED", "Reel saved for offline access."); }}>
                <Text style={styles.menuLabel}>Download {typeLabel}</Text>
                <Ionicons name="download-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setOptionsModal(false); Alert.alert("RECOMMENDED", "Channel recommended to your feed network."); }}>
                <Text style={styles.menuLabel}>Recommend Channel</Text>
                <MaterialCommunityIcons name="broadcast" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setOptionsModal(false); handleSave(); }}>
                <Text style={styles.menuLabel}>{isSaved ? 'Unsave Reel' : 'Save Reel'}</Text>
                <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={20} color={isSaved ? VOEXITheme.colors.primary : "#fff"} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setOptionsModal(false); if (onReportPress) onReportPress(item); else Alert.alert("REPORTED", "Signal flagged for content review."); }}>
                <Text style={[styles.menuLabel, { color: '#ff4444' }]}>Report / Flag Signal</Text>
                <Ionicons name="flag-outline" size={20} color="#ff4444" />
              </TouchableOpacity>

              <View style={styles.sheetDivider} />
              <Text style={styles.sheetSubLabel}>PLAYBACK SPEED</Text>
              <View style={styles.speedRow}>
                {[0.5, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                  <TouchableOpacity
                    key={speed}
                    style={[styles.speedPill, playbackSpeed === speed && styles.speedPillActive]}
                    onPress={() => {
                      if (setPlaybackSpeed) setPlaybackSpeed(speed);
                      if (player) {
                        try {
                          player.playbackRate = speed;
                          (player as any).rate = speed;
                        } catch (e) {}
                      }
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    }}
                  >
                    <Text style={[styles.speedText, playbackSpeed === speed && styles.speedTextActive]}>
                      {speed === 1.0 ? '1.0x (Normal)' : `${speed}x`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.sheetDivider} />
              <Text style={styles.sheetSubLabel}>PRO TOOLS</Text>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetText}>Auto-Scroll</Text>
                  <Text style={styles.switchSubText}>Auto advance to next reel on completion</Text>
                </View>
                <Switch
                  value={autoScrollEnabled}
                  onValueChange={(val) => {
                    setAutoScroll(val);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  }}
                  thumbColor="#fff"
                  trackColor={{ true: VOEXITheme.colors.primary }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetText}>Ghost Mode</Text>
                  <Text style={styles.switchSubText}>Hide all UI overlays (Tap screen to exit)</Text>
                </View>
                <Switch
                  value={ghostMode}
                  onValueChange={(val) => {
                    setGhostMode(val);
                    setOptionsModal(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  }}
                  thumbColor="#fff"
                  trackColor={{ true: VOEXITheme.colors.primary }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetText}>Air Gestures</Text>
                  <Text style={styles.switchSubText}>Control scroll using front camera gestures</Text>
                </View>
                <Switch
                  value={gestureEnabled}
                  onValueChange={(val) => {
                    setGestureEnabled(val);
                    setOptionsModal(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                    if (val) {
                      Alert.alert("NEURAL AIR GESTURES 🖐️", "Hand gestures activated! Flick your hand up in front of the camera or tap the gesture trigger to scroll.");
                    }
                  }}
                  thumbColor="#fff"
                  trackColor={{ true: VOEXITheme.colors.primary }}
                />
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setOptionsModal(false)}><Text style={styles.closeText}>CANCEL</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  </View>
);
});

export default VideoFeedItem;

const styles = StyleSheet.create({
  centerPlayBtn: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  playIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' },
  centerHeartBtn: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 12 },
  heartGlow: { textShadowColor: '#FF017E', textShadowRadius: 25 },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-end', paddingBottom: Platform.OS === 'android' ? 80 : 95, paddingLeft: 10, paddingRight: 2 },
  bottomInfo: { flex: 1, paddingRight: 4, paddingBottom: 15 },
  uploaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  miniAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#fff' },
  nameCol: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00ff00' },
  subBtn: { backgroundColor: 'rgba(124, 58, 237, 0.4)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 0.5, borderColor: 'rgba(124, 58, 237, 0.6)' },
  subBtnActive: { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderColor: 'rgba(255, 255, 255, 0.3)' },
  subBtnText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  subBtnTextActive: { color: 'rgba(255, 255, 255, 0.7)' },
  categoryTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800', marginTop: 2 },
  collabRowBelow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  collabTextFeed: { color: '#00F2FE', fontSize: 10, fontWeight: '800' },
  titleText: { color: '#fff', fontWeight: '900', fontSize: 16, marginTop: 5 },
  descText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4, lineHeight: 16 },
  sidebar: { width: 50, alignItems: 'center', gap: 12, paddingRight: 0 },
  sideBtn: { alignItems: 'center', width: '100%' },
  sideBtnText: { color: '#fff', fontSize: 8, fontWeight: '900', marginTop: 3, textTransform: 'uppercase', textAlign: 'center' },
  diskWrapper: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fff' },
  diskCover: { width: 22, height: 22, borderRadius: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  optionsSheet: { backgroundColor: '#0A0A0F', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, paddingBottom: 20, maxHeight: '80%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#333', alignSelf: 'center', marginBottom: 20, borderRadius: 2 },
  sheetTitle: { color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginBottom: 15 },
  missionCard: { backgroundColor: '#12121E', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)', marginBottom: 15 },
  missionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  missionCardTitle: { color: '#A855F7', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  identityRowCollab: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  uploaderAvatarModal: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: '#A855F7' },
  collabAvatarModal: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: '#00F2FE' },
  uploaderNameText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  collabNameText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  uploaderSubText: { color: '#888', fontSize: 10, marginTop: 1 },
  uploaderPill: { backgroundColor: 'rgba(168, 85, 247, 0.25)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  uploaderPillTxt: { color: '#A855F7', fontSize: 8, fontWeight: '900' },
  collabPill: { backgroundColor: 'rgba(0, 242, 254, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  collabPillTxt: { color: '#00F2FE', fontSize: 8, fontWeight: '900' },
  collabSectionModal: { marginTop: 8 },
  collabDividerModal: { height: 1, backgroundColor: '#1A1A28', marginVertical: 8 },
  collabSubHeaderModal: { color: 'rgba(0, 242, 254, 0.7)', fontSize: 8, fontWeight: '900', letterSpacing: 0.8, marginBottom: 4 },
  noCollabModalRow: { marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#1A1A28' },
  noCollabModalTxt: { color: '#555', fontSize: 10, fontStyle: 'italic' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1A1A24' },
  menuLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  sheetText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  switchSubText: { color: '#666', fontSize: 10, marginTop: 2 },
  autoScrollBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 35,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
    zIndex: 90,
  },
  autoScrollBadgeText: {
    color: '#00F2FE',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  ghostExitPill: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 35,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.5)',
    zIndex: 999,
    elevation: 20,
  },
  ghostExitText: {
    color: '#00F2FE',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sheetSubLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginBottom: 10, marginTop: 15 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  sheetDivider: { height: 1, backgroundColor: '#1A1A24', marginVertical: 10 },
  closeBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  closeText: { color: '#666', fontWeight: 'bold' },
  speedRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginVertical: 10 },
  speedPill: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#14141E', borderWidth: 1, borderColor: '#222', alignItems: 'center' },
  speedPillActive: { backgroundColor: VOEXITheme.colors.primary, borderColor: VOEXITheme.colors.primary },
  speedText: { color: '#888', fontSize: 10, fontWeight: 'bold' },
  speedTextActive: { color: '#fff' }
});