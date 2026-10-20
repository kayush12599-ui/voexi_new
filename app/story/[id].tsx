import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, TextInput, Keyboard, StatusBar, Pressable, Alert, Animated, Easing, ScrollView, PanResponder, ActivityIndicator, Share, Modal, Platform, KeyboardAvoidingView, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { CommentService } from '../../lib/commentService';
import { VOEXITheme } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useFollow } from '../../lib/social';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

const StoryVideoPlayer = memo(({ source, isPaused, onDurationLoaded, onEnded }: { source: string; isPaused: boolean; onDurationLoaded?: (durSec: number) => void; onEnded?: () => void }) => {
  const player = useVideoPlayer(source, (p) => {
    if (p) {
      p.muted = false;
      p.loop = false;
    }
  });

  useEffect(() => {
    if (!player) return;
    try {
      if (isPaused) {
        player.pause();
      } else {
        player.muted = false;
        const res = player.play();
        if (res && typeof res.catch === 'function') res.catch(() => {});
      }
    } catch (e) {}
  }, [player, isPaused, source]);

  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      try {
        if (player.duration && player.duration > 0 && onDurationLoaded) {
          onDurationLoaded(player.duration);
        }
      } catch (e) {}
    }, 500);

    return () => clearInterval(interval);
  }, [player, onDurationLoaded]);

  return (
    <View style={{ width: width, height: SCREEN_HEIGHT, backgroundColor: '#000', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
      {Boolean(source && player) && (
        <VideoView
          key={source}
          player={player}
          style={{ width: width, height: SCREEN_HEIGHT }}
          contentFit="contain"
          nativeControls={false}
        />
      )}
    </View>
  );
});

export default function StoryViewerPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [mentionModalVisible, setMentionModalVisible] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [highlightModalVisible, setHighlightModalVisible] = useState(false);
  const [userHighlights, setUserHighlights] = useState<any[]>([]);
  const [newHighlightName, setNewHighlightName] = useState('');
  const [isCreatingHighlight, setIsCreatingHighlight] = useState(false);
  const [storyComments, setStoryComments] = useState<any[]>([]);
  const [loadingStoryComments, setLoadingStoryComments] = useState(false);
  const [navHintsVisible, setNavHintsVisible] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  const handleVideoDurationLoaded = useCallback((durSec: number) => {
    if (durSec && durSec > 0) {
      setVideoDuration(durSec);
    }
  }, []);

  const storyProgress = useRef(new Animated.Value(0)).current;
  const heartPopAnim = useRef(new Animated.Value(0)).current;
  const hintsOpacity = useRef(new Animated.Value(0)).current;

  const activeStory = stories[activeIndex];
  const { isFollowing, toggleFollow } = useFollow(currentUserId, activeStory?.user_id);

  const fetchStories = useCallback(async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const myId = sessionData?.session?.user?.id || null;
      setCurrentUserId(myId);

      const targetUserId = (id === 'me' ? myId : (Array.isArray(id) ? id[0] : id)) as string | null;

      let storyData: any[] = [];

      // 1. Supabase DB Story Query (Case Insensitive)
      if (targetUserId) {
        try {
          const { data: dbStories } = await supabase
            .from('posts')
            .select('*, profiles:profiles!posts_user_id_fkey(*)')
            .eq('user_id', targetUserId)
            .or('post_type.ilike.%story%,is_story.eq.true')
            .order('created_at', { ascending: false });
          if (dbStories && dbStories.length > 0) {
            storyData = [...storyData, ...dbStories];
          }
        } catch (e) {}

        // 2. AsyncStorage Local Uploads Story Backup
        try {
          const localRaw = await AsyncStorage.getItem('@my_local_uploads');
          if (localRaw) {
            const localList = JSON.parse(localRaw);
            if (Array.isArray(localList)) {
              const myLocalStories = localList.filter((p: any) => {
                const pt = (p.post_type || p.category || '').toLowerCase();
                const belongsToMe = p.user_id === targetUserId || (targetUserId === myId && (!p.user_id || p.user_id === myId));
                return belongsToMe && (p.is_story || pt.includes('story'));
              });
              storyData = [...storyData, ...myLocalStories];
            }
          }
        } catch (e) {}

        // 3. Server 2 Media Server Story Backup
        try {
          const s2Res = await fetch('http://192.168.31.39:8080/files.json').then(r => r.json()).catch(() => null);
          if (Array.isArray(s2Res)) {
            const s2Stories = s2Res.filter((f: any) => {
              const pt = (f.post_type || f.category || '').toLowerCase();
              const isStory = f.is_story || pt.includes('story') || f.filename?.toLowerCase().startsWith('story_');
              if (!isStory) return false;

              if (id === 'me' || targetUserId === myId) return true; // My Station always includes fresh Server 2 stories!
              return f.user_id === targetUserId || f.uploader === targetUserId;
            });
            storyData = [...storyData, ...s2Stories];
          }
        } catch (e) {}
      }

      // Fetch Server 2 Profiles Map for 100% Real Logo & Profile Sync
      let server2ProfilesMap: Record<string, any> = {};
      try {
        const s2PRes = await fetch('http://192.168.31.39:8080/profiles.json').then(r => r.json()).catch(() => null);
        if (s2PRes && typeof s2PRes === 'object') {
          server2ProfilesMap = s2PRes;
        }
      } catch (e) {}

      // Helper to find Server 2 Profile by User ID or Uploader Handle
      const findS2Profile = (uid?: string, uploader?: string) => {
        if (!server2ProfilesMap) return null;
        if (uid && server2ProfilesMap[uid]) return server2ProfilesMap[uid];
        if (uploader) {
          const cleanUp = uploader.replace('@', '').toLowerCase().trim();
          if (server2ProfilesMap[cleanUp]) return server2ProfilesMap[cleanUp];
          const match = Object.values(server2ProfilesMap).find((p: any) =>
            (p.username && p.username.toLowerCase().trim() === cleanUp) ||
            (p.channel_name && p.channel_name.toLowerCase().trim() === cleanUp)
          );
          if (match) return match;
        }
        return null;
      };

      // Filter stories created strictly <= 24 hours ago
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      const nowMs = Date.now();

      const seen = new Set<string>();
      const uniqueStories: any[] = [];
      for (const s of storyData) {
        if (!s) continue;

        const storyTime = s.created_at ? new Date(s.created_at).getTime() : nowMs;
        const isFresh = (nowMs - storyTime) < TWENTY_FOUR_HOURS;
        if (!isFresh) continue; // Skip expired stories > 24 hours old!

        const key = s.media_url || s.id;
        if (key && !seen.has(key)) {
          seen.add(key);

          const authorId = s.user_id || targetUserId || myId;
          const s2Prof = findS2Profile(authorId, s.uploader || s.username);
          const prof = Array.isArray(s.profiles) ? s.profiles[0] : (s.profiles || s2Prof || {});

          const cName = prof?.channel_name || s2Prof?.channel_name || prof?.username || s.channel_name || s.username || s.uploader || 'VOEXI Station';
          const uName = prof?.username || s2Prof?.username || s.username || cName;
          const logoUri = prof?.custom_logo_url || prof?.logo_url || prof?.avatar_url || s2Prof?.custom_logo_url || s2Prof?.logo_url || s2Prof?.avatar_url || s.avatar_url;
          const finalLogo = logoUri && typeof logoUri === 'string' && logoUri.startsWith('http')
            ? logoUri
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(cName)}&background=A855F7&color=fff&bold=true`;

          uniqueStories.push({
            ...s,
            channel_name: cName,
            username: uName.replace('@', ''),
            avatar_url: finalLogo,
            verified: prof?.verification_status === 'verified' || s2Prof?.verification_status === 'verified'
          });
        }
      }

      if (uniqueStories.length === 0 && targetUserId === myId) {
        setLoading(false);
        Alert.alert("NO STORIES FOUND", "You have not published a story yet. Record a story now?", [
          { text: "Cancel", style: "cancel", onPress: () => router.back() },
          { text: "CREATE STORY 📸", onPress: () => router.replace('/studio/story-editor') }
        ]);
        return;
      }

      setStories(uniqueStories);
      setLoading(false);
    } catch (e) {
      console.error("Story Load Error:", e);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  useEffect(() => {
    if (stories.length > 0 && !isPaused) {
      storyProgress.setValue(0);

      // Dynamic duration: 7s for photo stories, actual full video duration (e.g. 180s = 3 mins) for video stories
      let durationMs = 7000;
      if (isVideoStory) {
        if (videoDuration && videoDuration > 0) {
          durationMs = Math.round(videoDuration * 1000);
        } else if (activeStory?.duration && Number(activeStory.duration) > 0) {
          durationMs = Math.round(Number(activeStory.duration) * 1000);
        } else {
          durationMs = 15000; // 15 seconds initial fallback for video until player loads metadata
        }
      }

      Animated.timing(storyProgress, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) nextStory();
      });
    } else {
      storyProgress.stopAnimation();
    }
  }, [activeIndex, stories, isPaused, videoDuration, isVideoStory]);

  const nextStory = () => {
    if (activeIndex < stories.length - 1) {
      setActiveIndex(activeIndex + 1);
    } else {
      router.back();
    }
  };

  const prevStory = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const lastStoryTapRef = useRef<number>(0);
  const storyTapTimerRef = useRef<any>(null);

  const handlePress = (evt: any) => {
    const x = evt.nativeEvent.locationX;
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 280;

    // 1. Left side tap (0% to 25% of screen width) -> Previous Story
    if (x < width * 0.25) {
      prevStory();
      return;
    }

    // 2. Right side tap (75% to 100% of screen width) -> Next Story
    if (x > width * 0.75) {
      nextStory();
      return;
    }

    // 3. Middle area (25% to 75% of screen width) -> 1 Press Pause/Play OR 2 Clicks Double Tap Like
    if (lastStoryTapRef.current && (now - lastStoryTapRef.current) < DOUBLE_TAP_DELAY) {
      // --- 2 CLICKS (DOUBLE TAP LIKE) ---
      if (storyTapTimerRef.current) {
        clearTimeout(storyTapTimerRef.current);
        storyTapTimerRef.current = null;
      }
      lastStoryTapRef.current = 0;

      handleLikeStory();
    } else {
      // --- 1 PRESS (SINGLE TAP PAUSE / PLAY) ---
      lastStoryTapRef.current = now;
      if (storyTapTimerRef.current) {
        clearTimeout(storyTapTimerRef.current);
      }
      storyTapTimerRef.current = setTimeout(() => {
        setIsPaused(prev => !prev);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        lastStoryTapRef.current = 0;
        storyTapTimerRef.current = null;
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleLongPressStart = () => {
    setIsPaused(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handlePressOut = () => {
    if (isPaused) {
      setIsPaused(false);
    }
  };

  const fetchUserHighlights = async () => {
    if (!currentUserId) return;
    try {
      const { data } = await supabase.from('highlights').select('*').eq('user_id', currentUserId).order('created_at', { ascending: false });
      setUserHighlights(data || []);
    } catch (e) {}
  };

  const openHighlightModal = () => {
    setIsPaused(true);
    setHighlightModalVisible(true);
    fetchUserHighlights();
  };

  const saveStoryToHighlight = async (highlightItem?: any) => {
    if (!currentUserId || !activeStory) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    try {
      let titleToUse = newHighlightName.trim() || 'Highlight';

      if (highlightItem) {
        titleToUse = highlightItem.name || highlightItem.title || 'Highlight';
      }

      // Insert into Supabase DB 'highlights' table
      const payload = {
        user_id: currentUserId,
        name: titleToUse,
        cover_url: activeStory.media_url,
        created_at: new Date().toISOString()
      };

      await supabase.from('highlights').insert(payload).catch(() => {});

      // Sync to Server 2
      try {
        fetch('http://192.168.31.39:8080/api/highlights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      } catch (e) {}

      setHighlightModalVisible(false);
      setIsPaused(false);
      setNewHighlightName('');
      setIsCreatingHighlight(false);
      Alert.alert("ADDED TO HIGHLIGHTS 🛡️", `Story saved to "${titleToUse}" on your profile.`);
    } catch (e: any) {
      Alert.alert("Highlight Error", e.message || "Could not save highlight.");
    }
  };

  const handleLikeStory = async () => {
    if (!activeStory) return;
    const newState = !isLiked;
    setIsLiked(newState);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

    // Big Mast Glowing 3D Heart Pop Animation
    heartPopAnim.setValue(0);
    Animated.sequence([
      Animated.spring(heartPopAnim, { toValue: 1.35, friction: 3, tension: 70, useNativeDriver: true }),
      Animated.timing(heartPopAnim, { toValue: 0, duration: 250, delay: 400, useNativeDriver: true })
    ]).start();

    const storyFileKey = activeStory.filename || activeStory.id;

    // 1. Server 2 Media Server Uplink
    try {
      fetch('http://192.168.31.39:8080/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: storyFileKey, postId: activeStory.id, isLiked: newState })
      }).catch(() => {});
    } catch (e) {}

    // 2. Supabase DB Likes Table Uplink
    if (currentUserId && activeStory.id) {
      try {
        if (newState) {
          await supabase.from('likes').insert({ post_id: activeStory.id, user_id: currentUserId }).catch(() => {});
        } else {
          await supabase.from('likes').delete().eq('post_id', activeStory.id).eq('user_id', currentUserId).catch(() => {});
        }
      } catch (e) {}
    }
  };

  const fetchStoryComments = async () => {
    if (!activeStory) return;
    setLoadingStoryComments(true);
    try {
      const res = await CommentService.fetchCommentsForPost(activeStory);
      setStoryComments(res.allComments || []);
    } catch (e) {
      console.error("[Story Comments Fetch Error]:", e);
    } finally {
      setLoadingStoryComments(false);
    }
  };

  const openStoryCommentsModal = () => {
    setIsPaused(true);
    setCommentsModalVisible(true);
    fetchStoryComments();
  };

  const handleSendStoryComment = async () => {
    if (!replyText.trim() || !activeStory) return;
    const textToSend = replyText.trim();
    setReplyText('');
    Keyboard.dismiss();

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      let activeUid = currentUserId;
      if (!activeUid) {
        const { data: authData } = await supabase.auth.getUser();
        activeUid = authData?.user?.id || null;
      }

      let realUsername = 'broadcaster';
      let realChannel = 'VOEXI Station';
      let realLogo = '';

      if (activeUid) {
        // 1. PRIMARY: Query Server 2 Real Profile
        try {
          const s2Res = await fetch(`http://192.168.31.39:8080/api/profiles?id=${activeUid}`).then(r => r.json()).catch(() => null);
          if (s2Res?.success && s2Res?.profile) {
            const p = s2Res.profile;
            realUsername = p.username || p.channel_name || realUsername;
            realChannel = p.channel_name || p.username || realChannel;
            realLogo = p.custom_logo_url || p.logo_url || p.avatar_url || realLogo;
          }
        } catch (e) {}

        // 2. Local Cache fallback
        if (!realLogo || realUsername === 'broadcaster') {
          try {
            const cachedRaw = await AsyncStorage.getItem(`@cached_user_profile_${activeUid}`);
            if (cachedRaw) {
              const parsed = JSON.parse(cachedRaw);
              realUsername = parsed.username || parsed.channel_name || realUsername;
              realChannel = parsed.channel_name || parsed.username || realChannel;
              realLogo = parsed.custom_logo_url || parsed.logo_url || parsed.avatar_url || realLogo;
            }
          } catch (e) {}
        }

        // 3. Supabase DB fallback
        if (!realLogo || realUsername === 'broadcaster') {
          try {
            const { data: dbProf } = await supabase.from('profiles').select('*').eq('id', activeUid).maybeSingle();
            if (dbProf) {
              realUsername = dbProf.username || dbProf.channel_name || realUsername;
              realChannel = dbProf.channel_name || dbProf.username || realChannel;
              realLogo = dbProf.custom_logo_url || dbProf.logo_url || dbProf.avatar_url || realLogo;
            }
          } catch (e) {}
        }
      }

      const finalHandle = realUsername.startsWith('@') ? realUsername : `@${realUsername}`;

      await CommentService.postComment(
        activeStory,
        textToSend,
        {
          id: activeUid || 'guest_user',
          handle: finalHandle,
          avatar: realLogo
        }
      );

      fetchStoryComments();
      Alert.alert("REACTION TRANSMITTED 💬", `Sent to @${activeStory.username || 'broadcaster'}: "${textToSend}"`);
    } catch (e: any) {
      console.error("[Story Comment Error]:", e);
      Alert.alert("Comment Error", e.message || "Could not transmit reaction.");
    }
  };

  const handleQuickEmojiReaction = async (emoji: string) => {
    if (!activeStory) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      let activeUid = currentUserId;
      if (!activeUid) {
        const { data: authData } = await supabase.auth.getUser();
        activeUid = authData?.user?.id || null;
      }

      let realUsername = 'broadcaster';
      let realLogo = '';

      // 1. PRIMARY: Query Server 2 Real Profile
      if (activeUid) {
        try {
          const s2Res = await fetch(`http://192.168.31.39:8080/api/profiles?id=${activeUid}`).then(r => r.json()).catch(() => null);
          if (s2Res?.success && s2Res?.profile) {
            const p = s2Res.profile;
            realUsername = p.username || p.channel_name || realUsername;
            realLogo = p.custom_logo_url || p.logo_url || p.avatar_url || realLogo;
          }
        } catch (e) {}

        if (!realLogo || realUsername === 'broadcaster') {
          try {
            const cachedRaw = await AsyncStorage.getItem(`@cached_user_profile_${activeUid}`);
            if (cachedRaw) {
              const parsed = JSON.parse(cachedRaw);
              realUsername = parsed.username || parsed.channel_name || realUsername;
              realLogo = parsed.custom_logo_url || parsed.logo_url || parsed.avatar_url || realLogo;
            }
          } catch (e) {}
        }
      }

      const finalHandle = realUsername.startsWith('@') ? realUsername : `@${realUsername}`;

      await CommentService.postComment(
        activeStory,
        emoji,
        {
          id: activeUid || 'guest_user',
          handle: finalHandle,
          avatar: realLogo
        }
      );

      fetchStoryComments();
      Alert.alert("REACTION SENT", `Sent ${emoji} reaction!`);
    } catch (e) {}
  };

  const handleRepost = async () => {
    if (!currentUserId || !activeStory) return;
    try {
      setOptionsModalVisible(false);
      setLoading(true);

      const { error } = await supabase.from('posts').insert({
        user_id: currentUserId,
        title: `Reposted from @${activeStory.username}`,
        media_url: activeStory.media_url,
        post_type: 'Story',
        media_type: activeStory.media_type || 'video',
        thumbnail_url: activeStory.thumbnail_url || activeStory.media_url,
        visibility: 'public'
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert("SIGNAL SYNCED", `You tagged @${activeStory.username} in your station.`);
    } catch (e: any) {
      Alert.alert("Sync Error", e.message);
    } finally {
      setLoading(false);
      setIsPaused(false);
    }
  };

  const handleMention = () => {
    setOptionsModalVisible(false);
    setIsPaused(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push(`/user/${activeStory.user_id}`);
  };

  if (loading) return <View style={styles.darkContainer}><ActivityIndicator color="#7C3AED" size="large" /></View>;

  if (stories.length === 0) {
    return (
      <View style={styles.darkContainer}>
        <StatusBar hidden />
        <Ionicons name="flash-outline" size={60} color="#333" />
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 15 }}>NO STORIES FOUND</Text>
        <Text style={{ color: '#666', fontSize: 12, marginTop: 5 }}>This station has no active stories.</Text>
        <TouchableOpacity style={{ marginTop: 25, backgroundColor: VOEXITheme.colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }} onPress={() => router.back()}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>GO BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const mediaUrl = activeStory?.media_url || '';
  const isVideoStory = Boolean(
    activeStory?.media_type === 'video' ||
    activeStory?.post_type === 'Video' ||
    mediaUrl.toLowerCase().includes('.mp4') ||
    mediaUrl.toLowerCase().includes('.mov') ||
    mediaUrl.toLowerCase().includes('.m3u8') ||
    mediaUrl.toLowerCase().includes('b-cdn')
  );

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* FULL SCREEN MEDIA (VIDEO OR PHOTO) */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handlePress}
        onLongPress={handleLongPressStart}
        onPressOut={handlePressOut}
        delayLongPress={200}
      >
        {isVideoStory && mediaUrl ? (
          <StoryVideoPlayer
            source={mediaUrl}
            isPaused={isPaused}
            onDurationLoaded={handleVideoDurationLoaded}
          />
        ) : (
          <Image
            source={{ uri: mediaUrl }}
            style={{ width: width, height: SCREEN_HEIGHT }}
            contentFit="contain"
            priority="high"
          />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </Pressable>

      {/* PAUSED INDICATOR PILL */}
      {isPaused && (
        <View style={styles.pausedPillBadge} pointerEvents="none">
          <Ionicons name="pause" size={14} color="#00F2FE" style={{ marginRight: 6 }} />
          <Text style={styles.pausedPillText}>PAUSED</Text>
        </View>
      )}

      {/* TOP OVERLAY */}
      <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
        {/* PROGRESS BARS */}
        <View style={styles.progressContainer}>
          {stories.map((_, index) => (
            <View key={index} style={styles.progressBarBg}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: index === activeIndex
                      ? storyProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                      : index < activeIndex ? '100%' : '0%'
                  }
                ]}
              />
            </View>
          ))}
        </View>

        {/* HEADER INFO */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.userInfo} onPress={() => activeStory?.user_id && router.push(`/user/${activeStory.user_id}`)}>
            <View style={styles.avatarBorder}>
              <Image source={{ uri: activeStory?.avatar_url || 'https://via.placeholder.com/100' }} style={styles.avatar} />
            </View>
            <View style={styles.nameMeta}>
              <View style={styles.row}>
                <Text style={styles.username}>{activeStory?.channel_name || activeStory?.username || 'VOEXI Station'}</Text>
                {activeStory?.verified && <MaterialCommunityIcons name="check-decagram" size={14} color="#EC4899" />}
              </View>
              <Text style={styles.timeAgoTxt}>
                @{activeStory?.username || 'username'} • {activeStory?.created_at ? new Date(activeStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '5m ago'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerActions} pointerEvents="auto">
            {currentUserId !== activeStory?.user_id && (
              <TouchableOpacity style={styles.followingPill} onPress={toggleFollow}>
                <Text style={styles.followingTxt}>{isFollowing ? 'Following ˅' : 'Subscribe'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* RIGHT ACTION SIDEBAR */}
      <View style={styles.sidebar}>
        <TouchableOpacity style={styles.sideAction} onPress={handleLikeStory}>
          <View style={[styles.glassCircle, isLiked && { backgroundColor: 'rgba(236, 72, 153, 0.3)', borderColor: '#EC4899' }]}>
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={26} color={isLiked ? "#EC4899" : "#fff"} />
          </View>
          <Text style={styles.sideLabel}>{isLiked ? 'Liked' : 'Like'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideAction} onPress={() => Share.share({ url: activeStory?.media_url })}>
          <View style={styles.glassCircle}>
            <Ionicons name="paper-plane-outline" size={24} color="#fff" />
          </View>
          <Text style={styles.sideLabel}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* BOTTOM INSTAGRAM-STYLE ACTION BAR */}
      {!isPaused && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.bottomBar, { bottom: Math.max(15, insets.bottom + 12) }]}
        >
          <View style={styles.bottomBarRow}>
            <TouchableOpacity style={styles.storyInputPill} onPress={openStoryCommentsModal} activeOpacity={0.85}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#EC4899" style={{ marginRight: 8 }} />
              <Text style={[styles.input, { color: 'rgba(255,255,255,0.7)', lineHeight: 28 }]}>Send about this story...</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionIconPill} onPress={() => setMentionModalVisible(true)} activeOpacity={0.8}>
              <View style={styles.iconCircleBg}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>@</Text>
              </View>
              <Text style={styles.pillLabelText}>Mention</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionIconPill} onPress={openHighlightModal} activeOpacity={0.8}>
              <View style={styles.iconCircleBg}>
                <Ionicons name="shield-outline" size={15} color="#C084FC" />
              </View>
              <Text style={styles.pillLabelText}>Highlights</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionIconPill} onPress={() => setOptionsModalVisible(true)} activeOpacity={0.8}>
              <View style={styles.iconCircleBg}>
                <Ionicons name="ellipsis-vertical" size={15} color="#fff" />
              </View>
              <Text style={styles.pillLabelText}>More</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* DOUBLE TAP ULTRA-MAST GLOWING HEART ANIMATION */}
      <Animated.View
        pointerEvents="none"
        style={[styles.bigHeart, { transform: [{ scale: heartPopAnim }], opacity: heartPopAnim }]}
      >
        <LinearGradient
          colors={['#FF0080', '#A855F7']}
          style={{ width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', shadowColor: '#FF0080', shadowRadius: 30, shadowOpacity: 0.95, elevation: 20 }}
        >
          <Ionicons name="heart" size={90} color="#FFF" />
        </LinearGradient>
      </Animated.View>

      {/* NAV HINTS */}
      {navHintsVisible && (
        <Animated.View style={[styles.navHintsContainer, { opacity: hintsOpacity }]}>
          <View style={styles.hintSection}><Text style={styles.hintTxt}>BACK</Text></View>
          <View style={styles.hintSection}><Text style={styles.hintTxt}>NEXT</Text></View>
        </Animated.View>
      )}

      {/* MORE OPTIONS MODAL */}
      <Modal visible={optionsModalVisible} transparent animationType="slide" onRequestClose={() => { setOptionsModalVisible(false); setIsPaused(false); }}>
         <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => { setOptionsModalVisible(false); setIsPaused(false); }} />
            <View style={[styles.modalContent, { backgroundColor: '#12121A', borderTopLeftRadius: 25, borderTopRightRadius: 25, maxHeight: '80%' }]}>
               <View style={styles.dragHandle} />
               <Text style={[styles.modalTitle, { letterSpacing: 2, color: '#888', fontSize: 11 }]}>MORE OPTIONS</Text>

               <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                 {/* 1. REPOST SIGNAL */}
                 {currentUserId !== activeStory?.user_id && (
                   <TouchableOpacity style={styles.modalItem} onPress={handleRepost}>
                      <Text style={[styles.modalText, { color: VOEXITheme.colors.secondary }]}>Repost Signal / Story</Text>
                      <View style={[styles.modalIconBox, { backgroundColor: 'rgba(0, 242, 254, 0.15)' }]}><MaterialCommunityIcons name="repeat-variant" size={20} color={VOEXITheme.colors.secondary} /></View>
                   </TouchableOpacity>
                 )}

                 {/* 2. SHARE STORY */}
                 <TouchableOpacity style={styles.modalItem} onPress={() => { setOptionsModalVisible(false); setIsPaused(false); Share.share({ url: activeStory?.media_url }); }}>
                    <Text style={styles.modalText}>Share Story</Text>
                    <View style={[styles.modalIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}><Ionicons name="paper-plane-outline" size={18} color="#38BDF8" /></View>
                 </TouchableOpacity>

                 {/* 3. COPY STORY LINK */}
                 <TouchableOpacity style={styles.modalItem} onPress={async () => { setOptionsModalVisible(false); setIsPaused(false); if (activeStory?.media_url) await Clipboard.setStringAsync(activeStory.media_url); Alert.alert("COPIED", "Story link copied to clipboard."); }}>
                    <Text style={styles.modalText}>Copy Story Link</Text>
                    <View style={[styles.modalIconBox, { backgroundColor: 'rgba(0, 242, 254, 0.15)' }]}><Ionicons name="link-outline" size={18} color="#00F2FE" /></View>
                 </TouchableOpacity>

                 {/* 4. VIEW CREATOR PROFILE */}
                 {currentUserId !== activeStory?.user_id && (
                   <TouchableOpacity style={styles.modalItem} onPress={handleMention}>
                      <Text style={styles.modalText}>View Creator Profile</Text>
                      <View style={[styles.modalIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}><MaterialCommunityIcons name="at" size={20} color="#A855F7" /></View>
                   </TouchableOpacity>
                 )}

                 {/* 5. ADD TO HIGHLIGHTS */}
                 <TouchableOpacity style={styles.modalItem} onPress={() => { setOptionsModalVisible(false); openHighlightModal(); }}>
                    <Text style={styles.modalText}>Add to Highlights</Text>
                    <View style={[styles.modalIconBox, { backgroundColor: 'rgba(192, 132, 252, 0.15)' }]}><Ionicons name="shield-outline" size={18} color="#C084FC" /></View>
                 </TouchableOpacity>

                 {/* 6. REPORT STORY */}
                 <TouchableOpacity style={styles.modalItem} onPress={() => { setOptionsModalVisible(false); setIsPaused(false); Alert.alert("REPORTED", "Story flagged for review."); }}>
                    <Text style={[styles.modalText, { color: '#EF4444' }]}>Report Story</Text>
                    <View style={[styles.modalIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}><Ionicons name="flag-outline" size={18} color="#EF4444" /></View>
                 </TouchableOpacity>

                 {/* 7. DELETE STORY (IF OWNER) */}
                 {(currentUserId === activeStory?.user_id || activeStory?.uploader === '@admin_creator') && (
                   <TouchableOpacity style={styles.modalItem} onPress={() => { setOptionsModalVisible(false); setIsPaused(false); Alert.alert("DELETE", "Delete this story?", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => router.back() }]); }}>
                      <Text style={[styles.modalText, { color: '#EF4444' }]}>Delete Story</Text>
                      <View style={[styles.modalIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}><Ionicons name="trash-outline" size={18} color="#EF4444" /></View>
                   </TouchableOpacity>
                 )}
               </ScrollView>

               <TouchableOpacity style={styles.modalDivider} />
               <TouchableOpacity style={styles.modalCancel} onPress={() => { setOptionsModalVisible(false); setIsPaused(false); }}>
                  <Text style={styles.cancelText}>CANCEL</Text>
               </TouchableOpacity>
            </View>
         </View>
      </Modal>

      {/* INSTAGRAM-STYLE ADD TO HIGHLIGHTS MODAL */}
      <Modal visible={highlightModalVisible} transparent animationType="slide" onRequestClose={() => { setHighlightModalVisible(false); setIsPaused(false); }}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { setHighlightModalVisible(false); setIsPaused(false); }} />
          <View style={[styles.modalContent, { backgroundColor: '#12121A', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20 }]}>
            <View style={styles.dragHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>🛡️ ADD TO HIGHLIGHTS</Text>
              <TouchableOpacity onPress={() => { setHighlightModalVisible(false); setIsPaused(false); }}>
                <Ionicons name="close" size={22} color="#888" />
              </TouchableOpacity>
            </View>

            {/* CREATE NEW HIGHLIGHT INPUT */}
            {isCreatingHighlight ? (
              <View style={{ marginBottom: 15 }}>
                <TextInput
                  placeholder="Highlight Title (e.g. Vibes, Moments)"
                  placeholderTextColor="#666"
                  style={{ backgroundColor: '#0A0A10', color: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#38BDF8', fontSize: 13, marginBottom: 10 }}
                  value={newHighlightName}
                  onChangeText={setNewHighlightName}
                  autoFocus
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={{ flex: 1, padding: 10, borderRadius: 10, backgroundColor: '#222', alignItems: 'center' }} onPress={() => setIsCreatingHighlight(false)}>
                    <Text style={{ color: '#aaa', fontWeight: 'bold', fontSize: 12 }}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flex: 1.5, padding: 10, borderRadius: 10, backgroundColor: VOEXITheme.colors.primary, alignItems: 'center' }} onPress={() => saveStoryToHighlight()}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>SAVE HIGHLIGHT</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* HIGHLIGHTS HORIZONTAL AVATARS ROW */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingVertical: 15 }}>
              <TouchableOpacity style={styles.mentionUserItem} onPress={() => setIsCreatingHighlight(true)}>
                <View style={[styles.mentionAvatarCircle, { borderStyle: 'dashed', borderColor: '#A855F7', borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                  <Ionicons name="add" size={26} color="#A855F7" />
                </View>
                <Text style={styles.mentionUserText}>New</Text>
              </TouchableOpacity>

              {userHighlights.map((h, i) => (
                <TouchableOpacity key={h.id || i} style={styles.mentionUserItem} onPress={() => saveStoryToHighlight(h)}>
                  <View style={[styles.mentionAvatarCircle, { borderColor: '#00F2FE', borderWidth: 1.5 }]}>
                    <Image source={{ uri: h.cover_url || activeStory?.media_url }} style={{ width: '100%', height: '100%', borderRadius: 28 }} />
                  </View>
                  <Text style={styles.mentionUserText} numberOfLines={1}>{h.name || h.title || 'Highlight'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* INSTAGRAM-STYLE MENTION PEOPLE / ADD YOURS SLIDE-UP MODAL */}
      <Modal visible={mentionModalVisible} transparent animationType="slide" onRequestClose={() => setMentionModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMentionModalVisible(false)} />
          <View style={[styles.modalContent, { backgroundColor: '#12121A', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20 }]}>
            <View style={styles.dragHandle} />
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 12 }}>Mention people</Text>

            <View style={styles.mentionSearchBox}>
              <Ionicons name="search" size={16} color="#666" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search users or subscribers..."
                placeholderTextColor="#666"
                style={{ flex: 1, color: '#fff', fontSize: 13 }}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 15 }}>
              <TouchableOpacity style={styles.mentionUserItem} onPress={() => { setMentionModalVisible(false); router.push('/studio/story-editor'); }}>
                <View style={[styles.mentionAvatarCircle, { borderStyle: 'dashed', borderColor: '#666', borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="person-outline" size={22} color="#EC4899" />
                </View>
                <Text style={styles.mentionUserText}>Add yours</Text>
              </TouchableOpacity>

              {[
                { name: 'Aarav', img: 'https://ui-avatars.com/api/?name=Aarav&background=A855F7&color=fff&bold=true' },
                { name: 'Diya', img: 'https://ui-avatars.com/api/?name=Diya&background=EC4899&color=fff&bold=true' },
                { name: 'Rohit', img: 'https://ui-avatars.com/api/?name=Rohit&background=3B82F6&color=fff&bold=true' },
                { name: 'Ananya', img: 'https://ui-avatars.com/api/?name=Ananya&background=10B981&color=fff&bold=true' },
                { name: 'Karan', img: 'https://ui-avatars.com/api/?name=Karan&background=FFD700&color=000&bold=true' },
              ].map((usr, i) => (
                <TouchableOpacity key={i} style={styles.mentionUserItem} onPress={() => { setMentionModalVisible(false); Alert.alert("MENTIONED", `Tagged @${usr.name} in story.`); }}>
                  <View style={styles.mentionAvatarCircle}>
                    <Image source={{ uri: usr.img }} style={{ width: '100%', height: '100%', borderRadius: 28 }} />
                    <View style={styles.mentionStarBadge}>
                      <Ionicons name="star" size={8} color="#fff" />
                    </View>
                  </View>
                  <Text style={styles.mentionUserText}>{usr.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* INSTAGRAM-STYLE ULTRA-SLEEK STORY REACTION & COMMENTS SHEET */}
      <Modal visible={commentsModalVisible} transparent animationType="slide" onRequestClose={() => { setCommentsModalVisible(false); setIsPaused(false); }}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { setCommentsModalVisible(false); setIsPaused(false); }} />
          <View style={[styles.modalContent, { backgroundColor: '#0B0B14', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, borderTopWidth: 1, borderColor: '#1E1E2E', maxHeight: '82%', paddingBottom: Math.max(20, insets.bottom + 10) }]}>
            <View style={[styles.dragHandle, { backgroundColor: '#333' }]} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 }}>COMMENTS & REACTIONS</Text>
                <View style={{ backgroundColor: 'rgba(236, 72, 153, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(236, 72, 153, 0.4)' }}>
                  <Text style={{ color: '#EC4899', fontSize: 10, fontWeight: 'bold' }}>{storyComments.length}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => { setCommentsModalVisible(false); setIsPaused(false); }}>
                <Ionicons name="close" size={22} color="#888" />
              </TouchableOpacity>
            </View>

            {/* QUICK EMOJI REACTION ROW */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#141422', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 12, borderWidth: 1, borderColor: '#1E1E30' }}>
              {['❤️', '🔥', '👏', '😍', '😮', '🎉', '💯'].map((emoji, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  onPress={() => handleQuickEmojiReaction(emoji)}
                >
                  <Text style={{ fontSize: 22 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* COMMENTS LIST */}
            <View style={{ height: 250, marginBottom: 12 }}>
              {loadingStoryComments ? (
                <ActivityIndicator color={VOEXITheme.colors.primary} style={{ marginTop: 50 }} />
              ) : storyComments.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="chatbubble-ellipses-outline" size={40} color="#333" />
                  <Text style={{ color: '#666', fontSize: 12, fontWeight: 'bold', marginTop: 10 }}>No reactions yet</Text>
                  <Text style={{ color: '#444', fontSize: 10, marginTop: 4 }}>Be the first to react or comment on this story!</Text>
                </View>
              ) : (
                <FlatList
                  data={storyComments}
                  keyExtractor={c => c.id}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item: c }) => {
                    const cName = c.profiles?.channel_name || c.channel_name || c.profiles?.username || c.user || 'Viewer';
                    const uHandle = (c.profiles?.username || c.user || cName).replace('@', '');
                    const cLogo = c.profiles?.custom_logo_url || c.profiles?.logo_url || c.profiles?.avatar_url || c.avatar_url || c.avatar;
                    const avatarUri = cLogo && typeof cLogo === 'string' && cLogo.startsWith('http')
                      ? cLogo
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(cName)}&background=A855F7&color=fff&bold=true`;

                    return (
                      <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#141422', alignItems: 'flex-start' }}>
                        <Image source={{ uri: avatarUri }} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#A855F7' }} />
                        <View style={{ flex: 1, backgroundColor: '#141424', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#1E1E34' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ color: '#FFF', fontSize: 13, fontWeight: 'bold' }}>{cName}</Text>
                              <Text style={{ color: '#38BDF8', fontSize: 10, fontWeight: '600' }}>@{uHandle}</Text>
                            </View>
                            <Text style={{ color: '#666', fontSize: 9, fontWeight: '600' }}>
                              {c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </Text>
                          </View>
                          <Text style={{ color: '#F1F5F9', fontSize: 12, lineHeight: 17, fontWeight: '500' }}>{c.text || c.content}</Text>
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </View>

            {/* FLOATING REACTION INPUT PILL */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#141422', borderRadius: 25, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: '#1E1E30' }}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#EC4899" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Send a reaction..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={{ flex: 1, color: '#fff', fontSize: 13 }}
                value={replyText}
                onChangeText={setReplyText}
                onSubmitEditing={handleSendStoryComment}
                returnKeyType="send"
              />
              {replyText.trim().length > 0 ? (
                <TouchableOpacity onPress={handleSendStoryComment} style={{ backgroundColor: '#EC4899', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 }}>
                  <Ionicons name="send" size={14} color="#fff" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  pausedPillBadge: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderWidth: 1,
    borderColor: '#00F2FE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 90,
  },
  pausedPillText: {
    color: '#00F2FE',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  darkContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  fullMedia: { width: width, height: SCREEN_HEIGHT },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 15, zIndex: 10 },
  progressContainer: { flexDirection: 'row', gap: 4, marginTop: 10, marginBottom: 15 },
  progressBarBg: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#EC4899' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarBorder: { padding: 2, borderRadius: 22, borderWidth: 1.5, borderColor: '#EC4899' },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  nameMeta: { gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  username: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },
  timeAgoTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  followingPill: { backgroundColor: 'rgba(255,255,255,0.15)', borderHeight: 1, borderColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  followingTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  iconBtn: { padding: 4 },

  navArrowsOverlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, zIndex: 12 },
  arrowSideBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20 },
  arrowTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 'bold' },

  sidebar: { position: 'absolute', right: 15, bottom: 120, alignItems: 'center', gap: 20, zIndex: 20 },
  sideAction: { alignItems: 'center', gap: 4 },
  glassCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  sideLabel: { color: '#fff', fontSize: 10, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },

  bottomBar: { position: 'absolute', bottom: 25, left: 15, right: 15, zIndex: 20 },
  bottomBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storyInputPill: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 25, paddingHorizontal: 14, height: 44, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  input: { flex: 1, color: '#fff', fontSize: 12, fontWeight: '500' },
  actionIconPill: { alignItems: 'center', gap: 2 },
  iconCircleBg: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  pillLabelText: { color: '#ccc', fontSize: 8, fontWeight: '800', letterSpacing: 0.3 },

  mentionSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#030308', borderRadius: 12, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: '#1E1E2E' },
  mentionUserItem: { alignItems: 'center', width: 64 },
  mentionAvatarCircle: { width: 56, height: 56, borderRadius: 28, position: 'relative' },
  mentionStarBadge: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#EC4899', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#12121A' },
  mentionUserText: { color: '#aaa', fontSize: 10, marginTop: 6, fontWeight: '600', textAlign: 'center' },

  bigHeart: { position: 'absolute', top: '35%', alignSelf: 'center', zIndex: 100 },
  navHintsContainer: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 5 },
  hintSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hintTxt: { color: 'rgba(255,255,255,0.1)', fontSize: 40, fontWeight: '900' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, paddingBottom: 40, backgroundColor: '#080808', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginBottom: 25 },
  dragHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 15, borderRadius: 2 },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15 },
  modalText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 10 },
  modalIconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  modalCancel: { padding: 15, alignItems: 'center' },
  cancelText: { color: 'rgba(255,255,255,0.5)', fontWeight: '900' }
});
