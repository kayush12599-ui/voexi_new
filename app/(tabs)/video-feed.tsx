import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { StyleSheet, View, FlatList, StatusBar, ActivityIndicator, Dimensions, Modal, Pressable, TouchableOpacity, Text, Alert, Platform, useWindowDimensions, TextInput, KeyboardAvoidingView, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useLocalSearchParams, useGlobalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { VOEXITheme } from '../../constants/theme';
import SafeGestureCamera from '../../components/SafeGestureCamera';
import VideoFeedItem from '../../components/VideoFeedItem';
import InFeedTestAdCard from '../../components/InFeedTestAdCard';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import { ServerDiscovery } from '../../lib/serverDiscovery';

const CommentVideoThumbnail = memo(({ mediaUrl }: { mediaUrl: string }) => {
  try {
    const player = useVideoPlayer(mediaUrl, p => {
      p.loop = true;
    });
    return (
      <View style={{ width: 180, height: 130, borderRadius: 10, marginTop: 6, backgroundColor: '#000', overflow: 'hidden' }}>
        <VideoView style={StyleSheet.absoluteFillObject} player={player} />
      </View>
    );
  } catch(e) {
    return (
      <View style={{ width: 180, height: 130, borderRadius: 10, marginTop: 6, backgroundColor: '#14142B', justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="play-circle-outline" size={32} color="#A855F7" />
      </View>
    );
  }
});

export default function VideoFeedScreen() {
  const router = useRouter();
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const { height: windowHeight } = useWindowDimensions();
  const [feedHeight, setFeedHeight] = useState<number>(0);

  const onFeedLayout = useCallback((e: any) => {
    const h = e.nativeEvent.layout.height;
    if (h > 100 && Math.abs(h - feedHeight) > 1) {
      setFeedHeight(h);
    }
  }, [feedHeight]);

  const viewportHeight = feedHeight > 0 ? feedHeight : windowHeight;

  const isFocused = useIsFocused();
  const [videos, setVideos] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [targetIndex, setTargetIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [ghostMode, setGhostMode] = useState(false);
  const [gestureEnabled, setGestureEnabled] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [commentsModal, setCommentsModal] = useState(false);
  const [selectedCommentPost, setSelectedCommentPost] = useState<any>(null);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);

  const [replyToComment, setReplyToComment] = useState<{ id: string; user: string } | null>(null);
  const [likedComments, setLikedComments] = useState<{ [id: string]: { liked: boolean; count: number } }>({});
  const [expandedReplies, setExpandedReplies] = useState<{ [parentId: string]: boolean }>({});
  const [attachmentMedia, setAttachmentMedia] = useState<{ uri: string; type: 'image' | 'video' | 'voice' } | null>(null);
  const commentInputRef = useRef<TextInput>(null);

  const toggleExpandReplies = (parentId: string) => {
    setExpandedReplies(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  const getTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    const past = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (isNaN(diffSec) || diffSec < 5) return 'Just now';
    if (diffSec < 60) return `${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 30) return `${diffDay}d`;
    return past.toLocaleDateString();
  };

  const toggleLikeComment = (cmtId: string) => {
    setLikedComments(prev => {
      const current = prev[cmtId] || { liked: false, count: 0 };
      const newLiked = !current.liked;
      const newCount = newLiked ? current.count + 1 : Math.max(0, current.count - 1);
      return { ...prev, [cmtId]: { liked: newLiked, count: newCount } };
    });
  };

  const togglePinComment = (cmtId: string) => {
    setCommentsList(prev => prev.map(c => c.id === cmtId ? { ...c, is_pinned: !c.is_pinned } : c));
  };

  const handleReplyPress = (cmt: any) => {
    const handle = cmt.profiles?.channel_name || cmt.profiles?.username || cmt.user || '@user';
    const targetParentId = cmt.parent_id || cmt.id;

    // Auto-expand nested replies thread on Reply tap!
    setExpandedReplies(prev => ({ ...prev, [targetParentId]: true }));
    setReplyToComment({ id: cmt.id, user: handle });

    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 100);
  };

  const handleUserProfilePress = (userId?: string) => {
    if (!userId || userId === 'guest_user') return;
    setCommentsModal(false);
    if (currentUserId && userId === currentUserId) {
      router.push('/profile');
    } else {
      router.push(`/user/${userId}`);
    }
  };

  const pickPhotoAttachment = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAttachmentMedia({ uri: result.assets[0].uri, type: 'image' });
      }
    } catch (e) {}
  };

  const pickVideoAttachment = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        videoMaxDuration: 10, // STRICT 10 SECONDS MAX DURATION LIMIT
        quality: 0.7,
        allowsEditing: true
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.duration && asset.duration > 11000) {
          Alert.alert("Video Limit (10s)", "Comment videos are strictly limited to 10 seconds or shorter.");
          return;
        }
        setAttachmentMedia({ uri: asset.uri, type: 'video' });
      }
    } catch (e) {}
  };

  const toggleVoiceAttachment = () => {
    if (attachmentMedia?.type === 'voice') {
      setAttachmentMedia(null);
    } else {
      setAttachmentMedia({ uri: 'voice_signal_audio', type: 'voice' });
      Alert.alert("Voice Signal Attached", "🎙️ Voice Signal attached to your comment!");
    }
  };

  const openCommentOptionsMenu = (cmt: any) => {
    const handle = cmt.profiles?.channel_name || cmt.profiles?.username || cmt.user || '@user';
    Alert.alert(
      `Comment Options (${handle})`,
      cmt.content || cmt.text || 'Choose an action:',
      [
        {
          text: "✏ Edit Comment",
          onPress: () => {
            Alert.prompt(
              "Edit Comment",
              "Update your comment text:",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Save",
                  onPress: (newText) => {
                    if (newText && newText.trim()) {
                      setCommentsList(prev => prev.map(c => c.id === cmt.id ? { ...c, content: newText.trim(), text: newText.trim() } : c));
                    }
                  }
                }
              ],
              "plain-text",
              cmt.content || cmt.text || ''
            );
          }
        },
        {
          text: cmt.is_pinned ? "📌 Unpin Comment" : "📌 Pin Comment",
          onPress: () => togglePinComment(cmt.id)
        },
        {
          text: "🗑 Delete Comment",
          style: "destructive",
          onPress: () => {
            setCommentsList(prev => prev.filter(c => c.id !== cmt.id));
            const targetFileKey = selectedCommentPost?.filename || selectedCommentPost?.id || selectedCommentPost?.title;
            if (targetFileKey) {
              fetch(`http://192.168.31.39:8080/api/comments?file=${encodeURIComponent(targetFileKey)}&cmtId=${encodeURIComponent(cmt.id)}`, {
                method: 'DELETE'
              }).catch(() => {});
            }
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const isUuid = (id: string | null | undefined): boolean => {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  };

  const fetchCommentsForPost = async (postItem: any) => {
    if (!postItem) return;
    setLoadingComments(true);

    const postId = typeof postItem === 'string' ? postItem : (postItem.filename || postItem.id || postItem.title || '');
    const cacheKey = `@comments_v2_${postId}`;

    // 1. Instant Cache Load from AsyncStorage
    try {
      const cachedStr = await AsyncStorage.getItem(cacheKey);
      if (cachedStr) {
        const cachedArr = JSON.parse(cachedStr);
        if (Array.isArray(cachedArr) && cachedArr.length > 0) {
          setCommentsList(cachedArr);
          setLoadingComments(false);
        }
      }
    } catch(e) {}

    // 2. Fetch from Media Server
    const cleanFileName = typeof postItem === 'object' ? (postItem.filename || postItem.title || postItem.id) : postItem;
    let serverComments: any[] = [];

    try {
      const res = await fetch(`http://192.168.31.39:8080/api/comments?file=${encodeURIComponent(cleanFileName)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.comments) && data.comments.length > 0) {
        serverComments = data.comments.map((c: any, idx: number) => ({
          id: c.id || `cmt_srv_${idx}_${Date.now()}`,
          content: c.text || c.content || '',
          text: c.text || c.content || '',
          type: c.type || 'text',
          media_url: c.media_url,
          created_at: c.created_at || new Date().toISOString(),
          profiles: { username: c.user || '@viewer', channel_name: c.user || '@viewer', avatar_url: c.avatar || 'https://via.placeholder.com/50' }
        }));
      }
    } catch(e) {}

    // 3. Query Supabase ONLY IF postId is a valid UUID
    if (serverComments.length === 0 && isUuid(postId)) {
      try {
        const { data } = await supabase
          .from('comments')
          .select('*, profiles(username, avatar_url, channel_name)')
          .eq('post_id', postId)
          .order('created_at', { ascending: false });
        if (data && data.length > 0) {
          serverComments = data;
        }
      } catch(e) {}
    }

    if (serverComments.length > 0) {
      setCommentsList(serverComments);
      AsyncStorage.setItem(cacheKey, JSON.stringify(serverComments)).catch(() => {});
      if (typeof postItem === 'object') {
        postItem.comments = serverComments;
        postItem.comments_count = serverComments.length;
      }
    }

    setLoadingComments(false);
  };

  const handleAddComment = async () => {
    if ((!commentInput.trim() && !attachmentMedia) || !selectedCommentPost) return;
    const text = commentInput.trim();
    const attached = attachmentMedia;
    setCommentInput('');
    setAttachmentMedia(null);

    let activeUserId = currentUserId;
    let realUserHandle = '@app_user';
    let userAvatar = 'https://via.placeholder.com/50';

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        activeUserId = authData.user.id;
        const { data: prof } = await supabase.from('profiles').select('username, channel_name, avatar_url').eq('id', activeUserId).maybeSingle();
        if (prof) {
          realUserHandle = prof.channel_name || prof.username || '@user_' + activeUserId.substring(0, 6);
          if (prof.avatar_url) userAvatar = prof.avatar_url;
        }
      }
    } catch(e) {}

    const replyUser = replyToComment ? replyToComment.user : null;
    const parentId = replyToComment ? replyToComment.id : null;
    setReplyToComment(null);

    const commentText = text || (attached?.type === 'voice' ? '🎙 Voice Signal' : (attached?.type === 'video' ? '🎬 Video Signal (10s)' : '🖼 Visual Signal'));

    const newCommentObj = {
      id: `cmt_${Date.now()}`,
      post_id: selectedCommentPost.id,
      user_id: activeUserId || 'guest_user',
      content: commentText,
      text: commentText,
      type: attached?.type || 'text',
      media_url: attached?.uri || null,
      reply_to_user: replyUser,
      parent_id: parentId,
      created_at: new Date().toISOString(),
      profiles: {
        username: realUserHandle,
        channel_name: realUserHandle,
        avatar_url: userAvatar
      }
    };

    // 1. Instant State & AsyncStorage Cache Update
    setCommentsList(prev => {
      const updated = [newCommentObj, ...prev];
      const postId = selectedCommentPost.filename || selectedCommentPost.id || selectedCommentPost.title;
      AsyncStorage.setItem(`@comments_v2_${postId}`, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    if (!selectedCommentPost.comments) selectedCommentPost.comments = [];
    selectedCommentPost.comments.unshift(newCommentObj);
    if (typeof selectedCommentPost.comments_count === 'number') {
      selectedCommentPost.comments_count += 1;
    }

    const targetFileKey = selectedCommentPost.filename || selectedCommentPost.id || selectedCommentPost.title;

    // 2. Save to Local Media Server Always
    fetch('http://192.168.31.39:8080/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: targetFileKey,
        user: realUserHandle,
        avatar: userAvatar,
        text: replyUser ? `↳ Replying to ${replyUser}: ${commentText}` : commentText,
        type: attached?.type || 'text',
        media_url: attached?.uri || null
      })
    }).catch(() => {});

    // 3. Save to Supabase DB ONLY IF post ID is a valid UUID
    if (isUuid(selectedCommentPost.id) && activeUserId && isUuid(activeUserId)) {
      try {
        await supabase
          .from('comments')
          .insert({
            post_id: selectedCommentPost.id,
            user_id: activeUserId,
            content: commentText,
            parent_id: parentId
          });
      } catch (e) {}
    }
  };

  const flatListRef = useRef<FlatList>(null);

  // Fast fetch helper with timeout safety
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

  const fetchFeed = async () => {
    // 1. INSTANT LOCAL CACHE RENDER (0ms delay)
    try {
      const localRaw = await AsyncStorage.getItem('@my_local_uploads');
      if (localRaw && videos.length === 0) {
        const localList = JSON.parse(localRaw);
        if (Array.isArray(localList)) {
          const localReels = localList.filter((p: any) => {
            const pt = p.post_type?.toLowerCase() || '';
            const isReelByType = pt === 'reels' || pt === 'reel' || p.is_reel === true;
            const isVerticalRatio = (p.height && p.width && p.height > p.width) || (p.aspect_ratio && typeof p.aspect_ratio === 'number' && p.aspect_ratio < 1.0);
            return (isReelByType || isVerticalRatio) && pt !== 'photo' && pt !== 'story';
          });
          if (localReels.length > 0) {
            setVideos(localReels);
            setLoading(false);
          }
        }
      }
    } catch (e) {}

    if (videos.length === 0) setLoading(true);

    try {
      // 2. PARALLEL NETWORK FETCH FOR REELS
      const [sessionRes, supabasePostsRes, penDriveRes] = await Promise.allSettled([
        supabase.auth.getSession(),
        supabase
          .from('posts')
          .select('*, profiles:profiles!posts_user_id_fkey(*)')
          .or('post_type.in.("Reels","Reel","reels","reel"),is_reel.eq.true')
          .order('created_at', { ascending: false })
          .limit(50),
        fetchWithTimeout('http://192.168.31.39:8080/files.json', 1200),
      ]);

      const session = sessionRes.status === 'fulfilled' ? sessionRes.value.data.session : null;
      if (session?.user) setCurrentUserId(session.user.id);

      let supabasePosts = (supabasePostsRes.status === 'fulfilled' && supabasePostsRes.value.data)
        ? supabasePostsRes.value.data
        : [];

      // Fallback in case profiles(*) join returned null/error
      if (supabasePosts.length === 0) {
        try {
          const { data: fallbackData } = await supabase
            .from('posts')
            .select('*, profiles(*)')
            .in('post_type', ['Reels', 'Reel', 'reels', 'reel'])
            .order('created_at', { ascending: false })
            .limit(50);
          if (fallbackData) supabasePosts = fallbackData;
        } catch (e) {}
      }

      // Fetch Local AsyncStorage Uploaded Reels
      let localReels: any[] = [];
      try {
        const localRaw = await AsyncStorage.getItem('@my_local_uploads');
        if (localRaw) {
          const localList = JSON.parse(localRaw);
          if (Array.isArray(localList)) {
            localReels = localList.filter((p: any) => {
              if (currentUserId && p.user_id && p.user_id !== currentUserId) return false;
              const pt = p.post_type?.toLowerCase() || '';
              const isReelByType = pt === 'reels' || pt === 'reel' || p.is_reel === true;
              const isVerticalRatio = (p.height && p.width && p.height > p.width) || (p.aspect_ratio && typeof p.aspect_ratio === 'number' && p.aspect_ratio < 1.0);
              return (isReelByType || isVerticalRatio) && pt !== 'photo' && pt !== 'story';
            });
          }
        }
      } catch (e) {}

      // Process PenDrive files safely
      let penDriveFiles: any[] = [];
      if (penDriveRes.status === 'fulfilled' && penDriveRes.value && penDriveRes.value.ok) {
        try {
          const allPenFiles = await penDriveRes.value.json();
          penDriveFiles = allPenFiles.filter((f: any) => {
            const pt = f.post_type?.toLowerCase() || '';
            const isVideoUrl = f.video_url || f.media_url?.match(/\.(mp4|mov|avi|mkv|webm)$/i) || f.media_url?.includes('192.168.31.39:8080');
            return isVideoUrl || pt === 'reels' || pt === 'reel' || pt === 'video' || pt === 'remix';
          });
        } catch (e) {}
      }

      const rawReqId = localParams.id || globalParams.id;
      const targetId = Array.isArray(rawReqId) ? rawReqId[0] : (rawReqId as string | undefined);

      const seenUrls = new Set<string>();
      let uniqueFeed: any[] = [];

      // Combine Supabase DB Posts FIRST, then Local Uploads, then PenDrive
      const rawCombined = [...supabasePosts, ...localReels, ...penDriveFiles];
      for (const post of rawCombined) {
        if (post && (post.media_url || post.video_url) && !seenUrls.has(post.media_url || post.video_url)) {
          const pt = post.post_type?.toLowerCase() || '';
          const isVideoUrl = post.video_url || post.media_url?.match(/\.(mp4|mov|avi|mkv|webm)$/i) || post.media_url?.includes('192.168.31.39:8080');
          const isReelByType = pt === 'reels' || pt === 'reel' || post.is_reel === true || pt === 'video' || pt === 'remix' || isVideoUrl;
          if (isReelByType && pt !== 'photo' && pt !== 'story' && pt !== 'writing') {
            seenUrls.add(post.media_url || post.video_url);
            uniqueFeed.push(post);
          }
        }
      }

      // Ensure the specifically requested reel is included in uniqueFeed if not already present
      if (targetId && !uniqueFeed.some(p => String(p.id) === String(targetId))) {
        // First check in local storage list
        try {
          const localRaw = await AsyncStorage.getItem('@my_local_uploads');
          if (localRaw) {
            const localList = JSON.parse(localRaw);
            const matched = localList.find((p: any) => String(p.id) === String(targetId));
            if (matched) {
              uniqueFeed = [matched, ...uniqueFeed];
            }
          }
        } catch (e) {}

        // If still not found, check Supabase
        if (!uniqueFeed.some(p => String(p.id) === String(targetId))) {
          try {
            const { data: targetPost } = await supabase
              .from('posts')
              .select('*, profiles(*)')
              .eq('id', targetId)
              .maybeSingle();

            if (targetPost) {
              uniqueFeed = [targetPost, ...uniqueFeed];
            }
          } catch (err) {
            console.warn("Fetch target post by ID error:", err);
          }
        }
      }

      const newReelUrlParam = localParams.newReelUrl || globalParams.newReelUrl;
      const newReelTitleParam = localParams.newReelTitle || globalParams.newReelTitle;
      const cropXParam = (localParams.cropX || globalParams.cropX) ? parseFloat((localParams.cropX || globalParams.cropX) as string) : undefined;
      const cropYParam = (localParams.cropY || globalParams.cropY) ? parseFloat((localParams.cropY || globalParams.cropY) as string) : undefined;
      const cropScaleParam = (localParams.cropScale || globalParams.cropScale) ? parseFloat((localParams.cropScale || globalParams.cropScale) as string) : undefined;
      const cropFitParam = ((localParams.cropFit || globalParams.cropFit) as string) || undefined;

      if (newReelUrlParam) {
        let myProfileData: any = null;
        if (currentUserId) {
          try {
            const { data: pData } = await supabase.from('profiles').select('channel_name, username, avatar_url').eq('id', currentUserId).maybeSingle();
            myProfileData = pData;
          } catch (e) {}
        }

        const creatorChannel = myProfileData?.channel_name || myProfileData?.username || 'My Station';
        const creatorUser = myProfileData?.username || 'me';
        const creatorAv = myProfileData?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(creatorChannel)}&background=A855F7&color=fff&bold=true`;

        const newReelObj = {
          id: `new_upload_${Date.now()}`,
          user_id: currentUserId || '00000000-0000-0000-0000-000000000000',
          title: (newReelTitleParam as string) || 'VOEXI REELS',
          media_url: newReelUrlParam as string,
          thumbnail_url: newReelUrlParam as string,
          post_type: 'Reels',
          media_type: 'video',
          is_reel: true,
          crop_x: cropXParam,
          crop_y: cropYParam,
          crop_scale: cropScaleParam,
          crop_fit: cropFitParam,
          likes_count: 1,
          comments_count: 0,
          profiles: {
            id: currentUserId,
            channel_name: creatorChannel,
            username: creatorUser,
            avatar_url: creatorAv
          },
          location: 'VOEXI NETWORK'
        };
        uniqueFeed = [newReelObj, ...uniqueFeed.filter(p => p.media_url !== newReelUrlParam)];
      }

      // Inject Google Mobile Ads In-Feed Test Placement every 5 items
      const feedWithAds: any[] = [];
      for (let i = 0; i < uniqueFeed.length; i++) {
        feedWithAds.push(uniqueFeed[i]);
        if ((i + 1) % 5 === 0 && i < uniqueFeed.length - 1) {
          feedWithAds.push({
            id: `in_feed_test_ad_${i + 1}`,
            isAd: true,
          });
        }
      }

      let initialActiveId = feedWithAds[0]?.id || null;
      let calculatedIndex = 0;

      if (targetId) {
        const foundIndex = feedWithAds.findIndex(v => String(v.id) === String(targetId));
        if (foundIndex !== -1) {
          calculatedIndex = foundIndex;
          initialActiveId = targetId;
        }
      }

      setVideos(feedWithAds);
      setActiveId(initialActiveId);
      setTargetIndex(calculatedIndex);
    } catch (e) {
      console.error("Feed Load Error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchFeed();
    }
  }, [isFocused]);

  // Handle target reel scrolling when params change or data loads
  useEffect(() => {
    const rawReqId = localParams.id || globalParams.id;
    const tid = Array.isArray(rawReqId) ? rawReqId[0] : (rawReqId as string | undefined);
    if (tid && videos.length > 0) {
      const idx = videos.findIndex(v => String(v.id) === String(tid));
      if (idx !== -1) {
        setActiveId(tid);
        setTargetIndex(idx);
        const timer = setTimeout(() => {
          try {
            flatListRef.current?.scrollToIndex({ index: idx, animated: false });
          } catch (e) {
            console.warn("Scroll to index error:", e);
          }
        }, 120);
        return () => clearTimeout(timer);
      }
    }
  }, [localParams.id, globalParams.id, videos, loading]);

  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const activeStartTimeRef = useRef<number>(Date.now());
  const activeVideoFilenameRef = useRef<string>('');

  const logAlgorithmEvent = (filename: string, eventType: 'watch' | 'skip' | 'share', durationSec?: number, category?: string) => {
    try {
      const activeHost = ServerDiscovery.getMediaServerUrl();
      fetch(`${activeHost}/api/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          userId: currentUserId || 'guest',
          event_type: eventType,
          duration_sec: durationSec || 0,
          category: category || 'ENTERTAINMENT'
        })
      }).catch(() => {});
    } catch (e) {}
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && viewableItems[0].item) {
      const newActive = viewableItems[0].item;
      const now = Date.now();
      const stayDurationSec = (now - activeStartTimeRef.current) / 1000;

      if (activeVideoFilenameRef.current) {
        if (stayDurationSec < 1.5) {
          logAlgorithmEvent(activeVideoFilenameRef.current, 'skip', stayDurationSec);
        } else {
          logAlgorithmEvent(activeVideoFilenameRef.current, 'watch', stayDurationSec, newActive.category);
        }
      }

      activeStartTimeRef.current = now;
      activeVideoFilenameRef.current = newActive.filename || newActive.id;
      setActiveId(newActive.id);
    }
  }).current;

  const onMomentumScrollEnd = useCallback((e: any) => {
    const h = viewportHeight > 0 ? viewportHeight : windowHeight;
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / h);
    if (videos[index] && videos[index].id !== activeId) {
      setActiveId(videos[index].id);
    }
  }, [videos, activeId, viewportHeight, windowHeight]);

  const handleAirGesture = useCallback((cmd: 'SWIPE_UP' | 'SWIPE_DOWN' | 'NONE') => {
    if (!flatListRef.current || videos.length === 0) return;
    const currentIndex = videos.findIndex(v => v.id === activeId);
    if (cmd === 'SWIPE_UP' && currentIndex < videos.length - 1) {
      const nextIndex = currentIndex + 1;
      setActiveId(videos[nextIndex].id);
      try {
        flatListRef.current.scrollToIndex({ index: nextIndex, animated: true });
      } catch (e) {}
    } else if (cmd === 'SWIPE_DOWN' && currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setActiveId(videos[prevIndex].id);
      try {
        flatListRef.current.scrollToIndex({ index: prevIndex, animated: true });
      } catch (e) {}
    }
  }, [videos, activeId]);

  const handleAutoScrollNext = useCallback(() => {
    if (!flatListRef.current || videos.length === 0) return;
    const currentIndex = videos.findIndex(v => String(v.id) === String(activeId));
    if (currentIndex >= 0 && currentIndex < videos.length - 1) {
      const nextIndex = currentIndex + 1;
      setActiveId(videos[nextIndex].id);
      try {
        flatListRef.current.scrollToIndex({ index: nextIndex, animated: true });
      } catch (e) {
        console.warn("Auto-scroll failed:", e);
      }
    }
  }, [videos, activeId]);

  const itemH = viewportHeight > 0 ? viewportHeight : windowHeight;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeGestureCamera isActive={gestureEnabled && isFocused} onGesture={handleAirGesture} />

      {/* UPPER LEFT REELS LOGO / TITLE */}
      <View style={styles.topHeaderLeft} pointerEvents="none">
        <Ionicons name="film-outline" size={18} color="#A855F7" />
        <Text style={styles.reelsHeaderTitle}>REELS</Text>
      </View>

      <View style={styles.feedWrapper} onLayout={onFeedLayout}>
        {loading && videos.length === 0 ? (
          <ActivityIndicator size="large" color={VOEXITheme.colors.primary} style={{ flex: 1 }} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={videos}
            keyExtractor={item => item.id}
            snapToInterval={itemH}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum={true}
            pagingEnabled={Platform.OS === 'ios'}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={onMomentumScrollEnd}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfigRef}
            initialScrollIndex={targetIndex > 0 && targetIndex < videos.length ? targetIndex : undefined}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                try {
                  flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
                } catch (e) {}
              }, 100);
            }}
            removeClippedSubviews={Platform.OS === 'android'}
            maxToRenderPerBatch={2}
            windowSize={3}
            initialNumToRender={Math.max(1, targetIndex + 1)}
            getItemLayout={(data, index) => ({
              length: itemH,
              offset: itemH * index,
              index,
            })}
            ListEmptyComponent={
              <View style={[styles.emptyContainer, { height: itemH }]}>
                <Ionicons name="film-outline" size={60} color="#333" />
                <Text style={styles.emptyText}>NO REELS FOUND</Text>
                <Text style={styles.emptySubtext}>Upload a Reel using the '+' button to broadcast here!</Text>
              </View>
            }
            renderItem={({ item }) => {
              if (item.isAd) {
                return (
                  <InFeedTestAdCard
                    itemHeight={itemH}
                    isActive={activeId === item.id}
                  />
                );
              }

              return (
                <VideoFeedItem
                  item={item}
                  isActive={activeId === item.id}
                  isScreenFocused={isFocused}
                  itemHeight={itemH}
                  currentUserId={currentUserId}
                  onCommentPress={() => {
                    setSelectedCommentPost(item);
                    setCommentsModal(true);
                    fetchCommentsForPost(item);
                  }}
                  onReportPress={() => Alert.alert("Audit", "Signal flagged.")}
                  ghostMode={ghostMode}
                  setGhostMode={setGhostMode}
                  autoScrollEnabled={autoScroll}
                  setAutoScroll={setAutoScroll}
                  gestureEnabled={gestureEnabled}
                  setGestureEnabled={setGestureEnabled}
                  playbackSpeed={playbackSpeed}
                  setPlaybackSpeed={setPlaybackSpeed}
                  onAutoScrollNext={handleAutoScrollNext}
                />
              );
            }}
          />
        )}
      </View>

      {/* COMMENTS MODAL */}
      <Modal visible={commentsModal} animationType="slide" transparent onRequestClose={() => setCommentsModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setCommentsModal(false)} />
          <View style={styles.fullSheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.dragHandle} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Text style={styles.sheetTitle}>💬 COMMENTS ({commentsList.length})</Text>
                <TouchableOpacity onPress={() => setCommentsModal(false)} style={styles.closeHeaderBtn}>
                  <Ionicons name="close" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {loadingComments ? (
              <ActivityIndicator color={VOEXITheme.colors.primary} style={{ marginVertical: 30 }} />
            ) : (() => {
              const topLevelComments = commentsList.filter(c => !c.parent_id);
              const repliesMap: { [parentId: string]: any[] } = {};

              commentsList.forEach(c => {
                if (c.parent_id) {
                  if (!repliesMap[c.parent_id]) repliesMap[c.parent_id] = [];
                  repliesMap[c.parent_id].push(c);
                }
              });

              return (
                <FlatList
                  data={[...topLevelComments].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))}
                  keyExtractor={(item, index) => item?.id ? `${item.id}_${index}` : `cmt_${index}`}
                  showsVerticalScrollIndicator={false}
                  style={{ flex: 1, marginVertical: 8 }}
                  ListEmptyComponent={
                    <View style={{ padding: 40, alignItems: 'center' }}>
                      <Ionicons name="chatbubbles-outline" size={44} color="#334155" />
                      <Text style={{ color: '#F1F5F9', marginTop: 12, fontSize: 13, fontWeight: 'bold' }}>No comments yet</Text>
                      <Text style={{ color: '#64748B', marginTop: 4, fontSize: 11 }}>Be the first to share your thoughts!</Text>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const userHandle = item.profiles?.channel_name || item.profiles?.username || item.user || '@viewer';
                    const avatarUrl = item.profiles?.avatar_url || item.avatar || 'https://via.placeholder.com/50';
                    const timeAgo = getTimeAgo(item.created_at);
                    const likeState = likedComments[item.id] || { liked: false, count: item.likes_count || 0 };
                    const childReplies = repliesMap[item.id] || [];
                    const isExpanded = !!expandedReplies[item.id];

                    return (
                      <View style={{ marginBottom: 12 }}>
                        {/* Parent Comment Card */}
                        <View style={styles.commentCard}>
                          <TouchableOpacity onPress={() => handleUserProfilePress(item.user_id)}>
                            <Image source={{ uri: avatarUrl }} style={styles.commentAvatar} />
                          </TouchableOpacity>

                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <TouchableOpacity onPress={() => handleUserProfilePress(item.user_id)}>
                                <Text style={styles.commentUser}>{userHandle}</Text>
                              </TouchableOpacity>
                              {item.is_pinned && (
                                <View style={styles.pinnedBadge}>
                                  <Ionicons name="pin" size={10} color="#EAB308" />
                                  <Text style={styles.pinnedTxt}>PINNED</Text>
                                </View>
                              )}
                            </View>

                            <Text style={styles.commentText}>{item.content || item.text || ''}</Text>

                            {/* Media Signal Attachments */}
                            {item.media_url && (
                              (item.type === 'image' || String(item.media_url).match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? (
                                <Image source={{ uri: item.media_url }} style={{ width: 160, height: 110, borderRadius: 10, marginTop: 6 }} />
                              ) : (item.type === 'video' || String(item.media_url).match(/\.(mp4|mov)$/i)) ? (
                                <CommentVideoThumbnail mediaUrl={item.media_url} />
                              ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(168,85,247,0.15)', padding: 8, borderRadius: 8, marginTop: 6, borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)' }}>
                                  <Ionicons name="mic-outline" size={16} color="#C084FC" />
                                  <Text style={{ color: '#F1F5F9', fontSize: 11, fontWeight: 'bold' }}>Voice Comment Signal</Text>
                                </View>
                              )
                            )}

                            {/* Action Buttons Row: Time • Reply (count) • 3-Dots */}
                            <View style={styles.commentActionBar}>
                              <Text style={styles.actionTime}>{timeAgo}</Text>

                              {/* Reply Button with Reply Count */}
                              <TouchableOpacity onPress={() => handleReplyPress(item)} style={styles.actionBtn}>
                                <Text style={[styles.actionBtnTxt, childReplies.length > 0 && { color: '#38BDF8', fontWeight: 'bold' }]}>
                                  Reply {childReplies.length > 0 ? `(${childReplies.length})` : ''}
                                </Text>
                              </TouchableOpacity>

                              {/* 3-Dots Action Button */}
                              <TouchableOpacity onPress={() => openCommentOptionsMenu(item)} style={styles.actionBtn}>
                                <Ionicons name="ellipsis-horizontal" size={14} color="#94A3B8" />
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Comment Heart Like Button */}
                          <TouchableOpacity onPress={() => toggleLikeComment(item.id)} style={styles.likeHeartCol}>
                            <Ionicons name={likeState.liked ? "heart" : "heart-outline"} size={16} color={likeState.liked ? "#EF4444" : "#64748B"} />
                            {likeState.count > 0 && <Text style={styles.likeCountTxt}>{likeState.count}</Text>}
                          </TouchableOpacity>
                        </View>

                        {/* Expanded Child Replies Thread */}
                        {isExpanded && (
                          <View style={{ marginLeft: 38, borderLeftWidth: 1.5, borderLeftColor: 'rgba(168, 85, 247, 0.4)', paddingLeft: 12 }}>
                            {childReplies.map((reply, rIdx) => {
                              const rUser = reply.profiles?.channel_name || reply.profiles?.username || reply.user || '@viewer';
                              const rAvatar = reply.profiles?.avatar_url || reply.avatar || 'https://via.placeholder.com/50';
                              const rTime = getTimeAgo(reply.created_at);
                              const rLikeState = likedComments[reply.id] || { liked: false, count: reply.likes_count || 0 };

                              return (
                                <View key={reply.id || `r_${rIdx}`} style={[styles.commentCard, { backgroundColor: 'rgba(255,255,255,0.015)', marginBottom: 8 }]}>
                                  <TouchableOpacity onPress={() => handleUserProfilePress(reply.user_id)}>
                                    <Image source={{ uri: rAvatar }} style={[styles.commentAvatar, { width: 28, height: 28 }]} />
                                  </TouchableOpacity>

                                  <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                      <TouchableOpacity onPress={() => handleUserProfilePress(reply.user_id)}>
                                        <Text style={[styles.commentUser, { fontSize: 11 }]}>{rUser}</Text>
                                      </TouchableOpacity>
                                      <Text style={styles.replyToBadge}>↳ Replying to {userHandle}</Text>
                                    </View>

                                    <Text style={[styles.commentText, { fontSize: 12 }]}>{reply.content || reply.text || ''}</Text>

                                    <View style={styles.commentActionBar}>
                                      <Text style={styles.actionTime}>{rTime}</Text>

                                      <TouchableOpacity onPress={() => openCommentOptionsMenu(reply)} style={styles.actionBtn}>
                                        <Ionicons name="ellipsis-horizontal" size={12} color="#94A3B8" />
                                      </TouchableOpacity>

                                      <TouchableOpacity onPress={() => handleReplyPress(reply)} style={styles.actionBtn}>
                                        <Text style={[styles.actionBtnTxt, { fontSize: 10 }]}>Reply</Text>
                                      </TouchableOpacity>
                                    </View>
                                  </View>

                                  <TouchableOpacity onPress={() => toggleLikeComment(reply.id)} style={styles.likeHeartCol}>
                                    <Ionicons name={rLikeState.liked ? "heart" : "heart-outline"} size={14} color={rLikeState.liked ? "#EF4444" : "#64748B"} />
                                    {rLikeState.count > 0 && <Text style={styles.likeCountTxt}>{rLikeState.count}</Text>}
                                  </TouchableOpacity>
                                </View>
                              );
                            })}

                            {/* Hide Replies Button */}
                            <TouchableOpacity
                              onPress={() => toggleExpandReplies(item.id)}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginBottom: 8 }}
                            >
                              <Ionicons name="chevron-up" size={12} color="#38BDF8" />
                              <Text style={{ color: '#38BDF8', fontSize: 10, fontWeight: '700' }}>Hide replies</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  }}
                />
              );
            })()}

            {/* Replying Banner Bar */}
            {replyToComment && (
              <View style={styles.replyingBar}>
                <Text style={styles.replyingTxt}>Replying to <Text style={{ color: '#C084FC', fontWeight: 'bold' }}>{replyToComment.user}</Text></Text>
                <TouchableOpacity onPress={() => setReplyToComment(null)}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            )}

            {/* Attached Media Signal Preview Bar */}
            {attachmentMedia && (
              <View style={styles.attachmentPreviewBar}>
                <Text style={styles.attachmentPreviewTxt}>
                  {attachmentMedia.type === 'image' ? '📸 Photo Attached' : (attachmentMedia.type === 'video' ? '📹 Video Attached (Max 10s)' : '🎙️ Voice Signal Attached')}
                </Text>
                <TouchableOpacity onPress={() => setAttachmentMedia(null)}>
                  <Ionicons name="close-circle" size={16} color="#F43F5E" />
                </TouchableOpacity>
              </View>
            )}

            {/* Compact Input Row with Right Side Attachment Buttons */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={styles.commentInputRow}>
                <TextInput
                  ref={commentInputRef}
                  style={styles.commentInput}
                  placeholder={replyToComment ? `Reply to ${replyToComment.user}...` : "Transmit comment..."}
                  placeholderTextColor="#64748B"
                  value={commentInput}
                  onChangeText={setCommentInput}
                />

                {/* Right Side Attachment Action Buttons */}
                <TouchableOpacity onPress={pickPhotoAttachment} style={styles.attachBtn}>
                  <Ionicons name="image-outline" size={18} color="#94A3B8" />
                </TouchableOpacity>

                <TouchableOpacity onPress={pickVideoAttachment} style={styles.attachBtn}>
                  <Ionicons name="videocam-outline" size={18} color="#94A3B8" />
                </TouchableOpacity>

                <TouchableOpacity onPress={toggleVoiceAttachment} style={styles.attachBtn}>
                  <Ionicons name="mic-outline" size={18} color="#94A3B8" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.sendBtn} onPress={handleAddComment}>
                  <Ionicons name="send" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topHeaderLeft: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 38,
    left: 16,
    zIndex: 99,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(10, 10, 15, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  reelsHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  feedWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
  emptyContainer: {
    height: 800,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#000',
  },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2, marginTop: 15 },
  emptySubtext: { color: '#666', fontSize: 11, textAlign: 'center', marginTop: 8, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  fullSheet: { backgroundColor: '#0A0A12', height: '76%', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12, borderTopWidth: 1, borderColor: 'rgba(168, 85, 247, 0.25)' },
  sheetHeader: { alignItems: 'center', marginBottom: 10 },
  dragHandle: { width: 36, height: 4, backgroundColor: '#334155', alignSelf: 'center', marginBottom: 10, borderRadius: 2 },
  sheetTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  closeHeaderBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 15 },
  commentCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10, backgroundColor: 'rgba(255, 255, 255, 0.025)', padding: 10, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.04)' },
  commentAvatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: '#A855F7' },
  commentUser: { color: '#C084FC', fontSize: 12, fontWeight: 'bold' },
  commentText: { color: '#F1F5F9', fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  pinnedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(234, 179, 8, 0.15)', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(234, 179, 8, 0.3)' },
  pinnedTxt: { color: '#EAB308', fontSize: 8, fontWeight: '900' },
  replyToBadge: { color: '#38BDF8', fontSize: 10, fontWeight: '600' },
  commentActionBar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  actionTime: { color: '#64748B', fontSize: 10, fontWeight: '600' },
  actionBtn: { paddingVertical: 2, paddingHorizontal: 4 },
  actionBtnTxt: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  likeHeartCol: { alignItems: 'center', justifyContent: 'flex-start', paddingLeft: 4, paddingTop: 2 },
  likeCountTxt: { color: '#64748B', fontSize: 9, fontWeight: '800', marginTop: 1 },
  replyingBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(168, 85, 247, 0.15)', borderLeftWidth: 3, borderLeftColor: '#A855F7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 6 },
  replyingTxt: { color: '#F8FAFC', fontSize: 11 },
  attachmentPreviewBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(56, 189, 248, 0.15)', borderLeftWidth: 3, borderLeftColor: '#38BDF8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 6 },
  attachmentPreviewTxt: { color: '#38BDF8', fontSize: 11, fontWeight: 'bold' },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#121222', borderRadius: 24, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)' },
  commentInput: { flex: 1, color: '#F8FAFC', fontSize: 12, minHeight: 34, paddingVertical: 0 },
  attachBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  sendBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#A855F7', justifyContent: 'center', alignItems: 'center', marginLeft: 2 }
});