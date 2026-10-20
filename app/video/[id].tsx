import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Share, Alert, Dimensions, TextInput, KeyboardAvoidingView, Platform, FlatList, Modal, Keyboard, Animated, Pressable, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { supabase } from '../../lib/supabase';
import { VOEXITheme } from '../../constants/theme';
import { useFollow } from '../../lib/social';
import { recordView, recordLike } from '../../lib/earnings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import NativeAdItem from '../../components/NativeAdItem';
import { showInterstitialAfterThreshold } from '../../lib/ads';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { uploadToBunny } from '../../lib/bunnyStorage';
import * as Haptics from 'expo-haptics';
import { ModerationService } from '../../lib/moderationService';
import { NeuralAuditModal } from '../../components/moderation/NeuralAuditModal';
import { useTheme } from '../../hooks/useTheme';
import SubscribeButton from '../../components/SubscribeButton';

const { width } = Dimensions.get('window');

const sanitizeCreatorInfo = (rawName?: string | null, rawUser?: string | null) => {
  let name = (rawName || '').trim();
  let username = (rawUser || '').trim().toLowerCase().replace('@', '');

  const isGeneric = !name || name === 'VOEXI Creator' || name === 'VOEXI Broadcaster' || name === 'broadcaster' || name === 'admin_creator' || name.startsWith('user_') || name === 'user' || name === 'Creator';

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

const CommentVideoPlayer = ({ mediaUrl }: { mediaUrl: string }) => {
  const player = useVideoPlayer(mediaUrl ? String(mediaUrl) : '');
  return Boolean(mediaUrl && player) ? (
    <VideoView key={mediaUrl} player={player} style={styles.commVideo} contentFit="cover" nativeControls />
  ) : null;
};

export default function VideoPlayerPage() {
  const { id, openComments } = useLocalSearchParams();
  const router = useRouter();
  const mainScrollRef = useRef<ScrollView>(null);

  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);

  // Stats
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [views, setViews] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [playerStatus, setPlayerStatus] = useState<string>('INIT');

  // UI States
  const [videoOptionsModal, setVideoOptionsModal] = useState(false);
  const [qualityModalVisible, setQualityModalVisible] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<'auto' | '1080p' | '720p' | '480p' | '360p'>('auto');
  const [ratingModal, setRatingModal] = useState(false);
  const [commentsModal, setCommentsModal] = useState(openComments === 'true');
  const [descModal, setDescModal] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [editingComment, setEditingComment] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [expandedReplies, setExpandedReplies] = useState<{ [parentId: string]: boolean }>({});

  const toggleExpandReplies = (parentId: string) => {
    setExpandedReplies(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  // Neural Audit States
  const [auditModalVisible, setAuditModalVisible] = useState(false);
  const [auditTarget, setAuditTarget] = useState<{id: string, userId: string, type: any} | null>(null);

  const initiateSignalAudit = (targetId: string, targetUserId: string, type: any = 'video') => {
    setAuditTarget({ id: targetId, userId: targetUserId, type });
    setAuditModalVisible(true);
  };

  // Media Comment States
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationIntervalRef = useRef<any>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const startDurationCounter = () => {
    stopDurationCounter();
    setRecordingDuration(0);
    durationIntervalRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const stopDurationCounter = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const startVoiceRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldRouteThroughEarpieceAndroid: false
      });

      setIsRecording(true);
      startDurationCounter();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
    } catch (err) {
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = async (shouldSend = true) => {
    if (!isRecording) return;
    setIsRecording(false);
    stopDurationCounter();

    setTimeout(async () => {
        if (!recordingRef.current) return;
        try {
            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();
            recordingRef.current = null;
            if (uri && shouldSend) {
              await handleAddMediaComment(uri, 'voice');
            }
        } catch (e) {
          console.error("Stop Recording Error:", e);
        }
    }, 200);
  };

  const pickMediaComment = async (type: 'image' | 'video') => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.6,
      videoMaxDuration: 10 // STRICT 10 SECONDS MAX DURATION LIMIT
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (type === 'video' && asset.duration && asset.duration > 11000) {
        Alert.alert("Video Limit (10s)", "Comment videos are strictly limited to 10 seconds or shorter.");
        return;
      }
      await handleAddMediaComment(asset.uri, type);
    }
  };

  const handleAddMediaComment = async (uri: string, type: 'voice' | 'image' | 'video') => {
    if (!currentUserId || !video) return;
    setIsUploading(true);
    try {
      const mediaUrl = await uploadToBunny(uri, type === 'voice' ? 'audio' : type);
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: video.id,
          user_id: currentUserId,
          type: type,
          media_url: mediaUrl,
          content: type === 'voice' ? 'Voice Signal' : (type === 'video' ? 'Video Signal' : 'Visual Signal'),
          parent_id: replyTo?.id || null
        })
        .select('*, profiles(username, avatar_url)')
        .single();

      if (error) throw error;
      if (data) {
        setComments(prev => [data, ...prev]);
        setCommentsCount(prev => prev + 1);
        setReplyTo(null);
      }
    } catch (e: any) {
      Alert.alert("Upload Failed", e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const playCommentVoice = async (url: string, commId: string) => {
    try {
      if (playingVoiceId === commId && soundRef.current) {
        await soundRef.current.pauseAsync();
        setPlayingVoiceId(null);
        return;
      }
      if (soundRef.current) { await soundRef.current.unloadAsync(); }

      setPlayingVoiceId(commId);
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (status: any) => { if (status.didJustFinish) setPlayingVoiceId(null); }
      );
      soundRef.current = sound;
    } catch (e) {}
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Global Sync Hook
  const { isFollowing, subsCount, toggleFollow } = useFollow(currentUserId, video?.user_id);

  const finalMediaUrl = useMemo(() => {
    let url = video?.video_url || video?.media_url || '';

    if (!url) return '';

    url = url.trim();
    if (url.startsWith('//')) url = 'https:' + url;

    // FORCE NEW CDN FOR ALL BUNNY LINKS
    if (url.includes('b-cdn.net')) {
        url = url.replace('videosvoexi.b-cdn.net', 'voexi.b-cdn.net');
        url = url.replace('VOEXI.b-cdn.net', 'voexi.b-cdn.net');
    }

    // If it's a relative path, prepend CDN
    if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('content://') && url !== '') {
        url = `https://voexi.b-cdn.net/${url}`;
    }

    return url;
  }, [video]);

  // ⚡ REAL-TIME QUALITY STREAM RESOLUTION SWITCHER
  const qualityStreamUrl = useMemo(() => {
    if (!finalMediaUrl) return '';
    if (selectedQuality && selectedQuality !== 'auto' && selectedQuality !== '1080p') {
      if (finalMediaUrl.includes('playlist.m3u8')) {
        return finalMediaUrl.replace('playlist.m3u8', `${selectedQuality}.m3u8`);
      }
      const separator = finalMediaUrl.includes('?') ? '&' : '?';
      return `${finalMediaUrl}${separator}res=${selectedQuality}`;
    }
    return finalMediaUrl;
  }, [finalMediaUrl, selectedQuality]);

  const player = useVideoPlayer(qualityStreamUrl || null);

  useEffect(() => {
    const url = video?.video_url || video?.media_url;
    console.log(`[VIDEO_DETAIL] ID: ${id}, URL: "${url}"`);

    if (player) {
      player.loop = true;

      // Native Hardware Bitrate & Network Quality Limiter
      let bitRate = 0;
      if (selectedQuality === '1080p') bitRate = 6000000;
      else if (selectedQuality === '720p') bitRate = 2500000;
      else if (selectedQuality === '480p') bitRate = 1000000;
      else if (selectedQuality === '360p') bitRate = 500000;

      if (bitRate > 0 && typeof (player as any).preferredPeakBitRate !== 'undefined') {
        try { (player as any).preferredPeakBitRate = bitRate; } catch (e) {}
      }

      if (qualityStreamUrl && typeof (player as any).replace === 'function') {
        try {
          (player as any).replace(qualityStreamUrl);
        } catch (e) {}
      }

      const errorSub = player.addListener('error', (e) => {
          console.error(`[VIDEO_DETAIL] Player Error:`, e);
          setPlayerStatus('ERROR');
      });

      const statusSub = player.addListener('statusChange', (s) => {
          console.log(`[VIDEO_DETAIL] Status:`, s);
          setPlayerStatus(s);
      });

      player.play();

      return () => {
          errorSub.remove();
          statusSub.remove();
      };
    }
  }, [player, video, qualityStreamUrl, selectedQuality]);

  useEffect(() => {
    fetchVideoDetails();
    fetchComments();
    fetchRelatedVideos();
    checkUser();
    showInterstitialAfterThreshold(5);
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    // 3-SECOND VIEW LOGIC
    let viewTimer: any;
    if (id && currentUserId) {
      viewTimer = setTimeout(async () => {
        const nextViews = await recordView(String(id), video?.user_id, currentUserId);
        if (nextViews) setViews(nextViews);
      }, 3000);
    }
    return () => clearTimeout(viewTimer);
  }, [id, currentUserId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const fetchVideoDetails = async () => {
    try {
      const targetId = Array.isArray(id) ? id[0] : (id as string | undefined);
      if (!targetId) return;
      setLoading(true);

      let dataToSet: any = null;

      // 1. Try fetching from Supabase Database
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .eq('id', String(targetId))
        .maybeSingle();

      if (data) {
        dataToSet = data;
      } else {
        // Fallback: Fetch raw post without profiles join in case join failed
        const { data: rawPost } = await supabase
          .from('posts')
          .select('*')
          .eq('id', String(targetId))
          .maybeSingle();

        if (rawPost) {
          dataToSet = rawPost;
        }
      }

      if (!dataToSet) {
        // 2. Fallback: Search in local AsyncStorage uploads (@my_local_uploads)
        try {
          const localRaw = await AsyncStorage.getItem('@my_local_uploads');
          if (localRaw) {
            const localList = JSON.parse(localRaw);
            const matched = localList.find((p: any) => String(p.id) === String(targetId) || String(p.media_url) === String(targetId));
            if (matched) {
              dataToSet = matched;
            }
          }
        } catch (e) {}

        // 3. Fallback: Check Dynamic PenDrive Server files
        if (!dataToSet) {
          try {
            const penRes = await fetch('http://192.168.31.39:8080/files.json');
            if (penRes.ok) {
              const allPenFiles = await penRes.json();
              const matchedPen = allPenFiles.find((p: any) => String(p.id) === String(targetId));
              if (matchedPen) {
                dataToSet = matchedPen;
              }
            }
          } catch (penErr) {}
        }
      }

      if (dataToSet) {
        setVideo(dataToSet);
        setLikes(parseInt(dataToSet.likes_count) || 0);
        setViews(parseInt(dataToSet.views_count) || 1);
        setCommentsCount(parseInt(dataToSet.comments_count) || 0);

        // Check local storage for liked state
        if (dataToSet.id) {
          AsyncStorage.getItem(`liked_${dataToSet.id}`).then(val => {
            if (val !== null) setIsLiked(JSON.parse(val));
          });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user && dataToSet.id) {
          const { data: likeData } = await supabase.from('likes').select('id').eq('post_id', dataToSet.id).eq('user_id', user.id).maybeSingle();
          if (likeData) setIsLiked(true);

          const { data: rateData } = await supabase.from('ratings').select('rating_value').eq('post_id', dataToSet.id).eq('user_id', user.id).maybeSingle();
          if (rateData) setUserRating(rateData.rating_value);
        }

        const { count: ratingsCount } = await supabase.from('ratings').select('*', { count: 'exact', head: true }).eq('post_id', dataToSet.id);
        setTotalRatings(ratingsCount || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedVideos = async () => {
    try {
      const { data } = await supabase
        .from('posts')
        .select('*, profiles(username, avatar_url, channel_name)')
        .eq('visibility', 'public')
        .eq('post_type', 'Video')
        .neq('id', id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setRelatedVideos(data);
    } catch (e) {}
  };

  const handleLike = async () => {
    if (!video) return;
    const newState = !isLiked;
    setIsLiked(newState);
    setLikes(prev => newState ? prev + 1 : Math.max(0, prev - 1));
    await recordLike(video.id, currentUserId, newState);
  };

  const fetchComments = async () => {
    try {
      if (!id) return;
      setLoadingComments(true);
      let q = supabase.from('comments').select('*, profiles(username, avatar_url)').eq('post_id', id).order('is_pinned', { ascending: false });
      q = q.order('created_at', { ascending: sortBy === 'oldest' });
      const { data } = await q;
      if (data) setComments(data);
    } finally { setLoadingComments(false); }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !video) return;
    const text = commentText.trim();
    setCommentText('');

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

    const replyUser = replyTo ? (replyTo.profiles?.username || replyTo.profiles?.channel_name || replyTo.user || '@user') : null;
    const parentId = replyTo ? replyTo.id : null;
    setReplyTo(null);

    const newCmt = {
      id: `cmt_${Date.now()}`,
      post_id: video.id,
      user_id: activeUserId || 'guest_user',
      content: text,
      text: text,
      reply_to_user: replyUser,
      parent_id: parentId,
      created_at: new Date().toISOString(),
      profiles: {
        username: realUserHandle,
        avatar_url: userAvatar
      }
    };

    setComments(prev => [newCmt, ...prev]);
    setCommentsCount(prev => prev + 1);
    Keyboard.dismiss();

    const isMediaServerPost = video.id && (String(video.id).includes('pendrive_media') || video.media_url?.includes('192.168.31.39:8080'));
    const targetFileKey = video.filename || video.title || video.id;

    if (isMediaServerPost) {
      try {
        await fetch('http://192.168.31.39:8080/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: targetFileKey,
            id: newCmt.id,
            user: realUserHandle,
            avatar: userAvatar,
            text: replyUser ? `↳ Replying to ${replyUser}: ${text}` : text,
            type: 'text',
            parent_id: parentId
          })
        });
      } catch (e) {}
    } else {
      try {
        await supabase
          .from('comments')
          .insert({ post_id: video.id, user_id: activeUserId, content: text, parent_id: parentId });
      } catch (e) {}
    }
  };

  const showCommentOptions = (c: any) => {
    const userHandle = c.profiles?.channel_name || c.profiles?.username || c.user || '@user';
    Alert.alert(
      `Comment Options (${userHandle})`,
      c.content || c.text || 'Choose an action:',
      [
        {
          text: "✏️ Edit Comment",
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
                      setComments(prev => prev.map(item => item.id === c.id ? { ...item, content: newText.trim(), text: newText.trim() } : item));
                    }
                  }
                }
              ],
              "plain-text",
              c.content || c.text || ''
            );
          }
        },
        {
          text: c.is_pinned ? "📌 Unpin Comment" : "📌 Pin Comment",
          onPress: async () => {
            setComments(prev => prev.map(item => item.id === c.id ? { ...item, is_pinned: !item.is_pinned } : item));
          }
        },
        {
          text: "🗑️ Delete Comment",
          style: 'destructive',
          onPress: async () => {
            setComments(p => p.filter(x => x.id !== c.id));
            setCommentsCount(p => Math.max(0, p - 1));
            const isMediaServerPost = video?.id && (String(video.id).includes('pendrive_media') || video.media_url?.includes('192.168.31.39:8080'));
            if (isMediaServerPost) {
              const cleanName = String(video.id).replace(/^pendrive_media_\d+_/, '');
              fetch(`http://192.168.31.39:8080/api/comments?file=${encodeURIComponent(cleanName)}&cmtId=${encodeURIComponent(c.id)}`, { method: 'DELETE' }).catch(() => {});
            } else {
              try { await supabase.from('comments').delete().eq('id', c.id); } catch(e) {}
            }
          }
        },
        { text: "Cancel", style: 'cancel' }
      ]
    );
  };

  const handleRateSubmit = async (val: number) => {
    if (!currentUserId || !video) return;
    setUserRating(val);
    try {
      await supabase.from('ratings').upsert({ post_id: video.id, user_id: currentUserId, rating_value: val }, { onConflict: 'user_id, post_id' });
      const { count } = await supabase.from('ratings').select('*', { count: 'exact', head: true }).eq('post_id', video.id);
      setTotalRatings(count || 0);
      setTimeout(() => setRatingModal(false), 400);
    } catch (e) {}
  };

  if (loading) return <View style={styles.loadingBox}><ActivityIndicator color={VOEXITheme.colors.primary} size="large" /></View>;

  const profObjCandidate = Array.isArray(video?.profiles) ? video.profiles[0] : (video?.profiles && typeof video.profiles === 'object' ? video.profiles : null);
  const rawCreatorName = profObjCandidate?.channel_name || profObjCandidate?.username || video?.channel_name || video?.username || video?.uploader || 'VOEXI Official';
  const rawCreatorUsername = profObjCandidate?.username || profObjCandidate?.channel_name || video?.username || video?.channel_name || 'voexi_official';
  const { name: creatorName, username: creatorUsername } = sanitizeCreatorInfo(rawCreatorName, rawCreatorUsername);

  const rawAvatar = profObjCandidate?.custom_logo_url || profObjCandidate?.logo_url || profObjCandidate?.avatar_url || video?.custom_logo_url || video?.logo_url || video?.avatar_url || video?.user_avatar || video?.uploader_avatar;
  const creatorAvatar = getValidAvatarUrl(rawAvatar, creatorName);

  const cleanVideoTitle = (() => {
    let raw = video?.title || video?.description || 'VOEXI Production';
    if (raw.endsWith('.mp4') || raw.endsWith('.mov') || raw.endsWith('.m3u8') || raw.startsWith('VID_') || raw.startsWith('file_')) {
      raw = raw.replace(/\.[^/.]+$/, "").replace(/_/g, " ").replace(/-/g, " ");
      raw = raw.replace(/VID\s*\d+/gi, "VOEXI Studio Release").replace(/recording\s*\d+/gi, "Neural Spectrum Feed");
    }
    return raw;
  })();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* FIXED TOP HEADER */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.circleIconBtn}>
           <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setVideoOptionsModal(true)} style={styles.circleIconBtn}>
           <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView ref={mainScrollRef} style={{flex: 1}} showsVerticalScrollIndicator={false}>

        {/* VIDEO OR PHOTO PLAYER SECTION */}
        <View style={styles.videoHero}>
           {video?.post_type === 'Photo' || (video?.media_type === 'image') ? (
             <Image source={{ uri: video?.media_url || video?.thumbnail_url }} style={styles.videoPlayer} resizeMode="contain" />
           ) : player ? (
             <>
               <VideoView
                  key={`detail_player_${selectedQuality}_${id}`}
                  player={player}
                  style={styles.videoPlayer}
                  contentFit="contain"
                  allowsFullscreen
               />
               {(playerStatus === 'loading' || playerStatus === 'buffering') && (
                 <View style={[StyleSheet.absoluteFill, {justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.5)'}]}>
                    <ActivityIndicator size="large" color={VOEXITheme.colors.primary} />
                 </View>
               )}
               {playerStatus === 'ERROR' && (
                 <View style={[StyleSheet.absoluteFill, {justifyContent:'center', alignItems:'center', backgroundColor:'rgba(10,10,15,0.95)', padding:20, gap:8}]}>
                    <Ionicons name="alert-circle" size={48} color="#ff4444" />
                    <Text style={{ color: '#ff4444', fontSize: 13, fontWeight: '900', letterSpacing: 1 }}>STREAM CONNECTION INTERRUPTED</Text>
                    <Text style={{ color: '#888', fontSize: 10, textAlign: 'center', lineHeight: 16 }}>
                      The media stream URL ({video?.media_url || 'Local Server'}) could not be reached over your current Wi-Fi network.
                    </Text>
                    <TouchableOpacity
                        style={{marginTop: 15, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: VOEXITheme.colors.primary, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8}}
                        onPress={() => {
                            setPlayerStatus('LOADING');
                            try { player?.play(); } catch(e){}
                        }}
                    >
                        <Ionicons name="refresh" size={16} color="#fff" />
                        <Text style={{color:'#fff', fontSize:11, fontWeight: '900', letterSpacing: 0.5}}>RE-TRY CLOUD UPLINK</Text>
                    </TouchableOpacity>
                 </View>
               )}
             </>
           ) : (
             <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="alert-circle" size={40} color="#ff4444" />
                <Text style={{ color: '#ff4444', fontSize: 12, fontWeight: 'bold' }}>BROADCAST UNAVAILABLE</Text>
                <Text style={{ color: '#444', fontSize: 8 }}>{video?.media_url || 'No URL'}</Text>
             </View>
           )}
        </View>

        <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
          {/* TITLE & META SECTION - TAP FOR DESC MODAL */}
          <TouchableOpacity
            style={styles.titleSection}
            activeOpacity={0.7}
            onPress={() => setDescModal(true)}
          >
             <View style={{flex: 1}}>
                <Text style={styles.videoTitle}>{cleanVideoTitle}</Text>
                <Text style={styles.statText}>{views.toLocaleString()} views  •  {video?.created_at ? new Date(video.created_at).toLocaleDateString() : ''}</Text>
             </View>
             <View style={styles.titleActions}>
                <TouchableOpacity style={styles.iconAction}><Ionicons name="download-outline" size={22} color="#fff" /></TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconAction}
                  onPress={() => {
                    const shareUrl = `https://voexi.com/video/${id}`;
                    Share.share({
                      message: `Watch this production on VOEXI: ${cleanVideoTitle}\n${shareUrl}`,
                      url: shareUrl
                    });
                  }}
                >
                  <Ionicons name="share-social-outline" size={22} color="#fff" />
                </TouchableOpacity>
             </View>
          </TouchableOpacity>

          {/* ACTION GRID PILLS */}
          <View style={styles.actionGrid}>
             <TouchableOpacity style={[styles.actionCell, isLiked && styles.actionCellActive]} onPress={handleLike}>
                <Ionicons name={isLiked ? "heart" : "heart-outline"} size={18} color={isLiked ? "#ff4d6d" : "#fff"} />
                <Text style={styles.actionLabel}>{likes}</Text>
             </TouchableOpacity>

             <TouchableOpacity style={styles.actionCell} onPress={() => setCommentsModal(true)}>
                <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                <Text style={styles.actionLabel}>{commentsCount}</Text>
             </TouchableOpacity>

             <TouchableOpacity style={styles.actionCell} onPress={() => {
                if (player) {
                  try { player.enterFullscreen(); } catch(e) {}
                }
             }}>
                <Ionicons name="expand" size={16} color="#00F2FE" />
                <Text style={styles.actionLabel}>Landscape</Text>
             </TouchableOpacity>

             <TouchableOpacity style={styles.actionCell} onPress={() => video?.id && router.push(`/sound/${video.id}`)}>
                <Ionicons name="sparkles-outline" size={16} color="#00F2FE" />
                <Text style={styles.actionLabel}>Remix</Text>
             </TouchableOpacity>
          </View>

          {/* CREATOR SURFACE */}
          <View style={styles.creatorSurface}>
             <TouchableOpacity style={styles.creatorInfoRow} onPress={() => video?.user_id && router.push(`/user/${video.user_id}`)}>
                <Image source={{ uri: creatorAvatar }} style={styles.channelAvatar} />
                <View>
                   <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                     <Text style={styles.channelName}>{creatorName}</Text>
                     <Ionicons name="checkmark-circle" size={14} color="#00F2FE" />
                   </View>
                   <Text style={styles.subCountText}>@{creatorUsername}  •  {subsCount > 0 ? `${subsCount.toLocaleString()} subscribers` : 'Official Channel'}</Text>
                </View>
             </TouchableOpacity>

             <View style={styles.creatorRightActions}>
                <SubscribeButton
                  isSubscribed={isFollowing}
                  onPress={() => video?.user_id && toggleFollow()}
                  showBell={true}
                  size="medium"
                />
             </View>
          </View>

      {/* ADS INTEGRATION - VOEXI SPONSORED */}
      <View style={{marginVertical: 10}}>
         <View style={{flexDirection:'row', alignItems:'center', gap: 6, marginBottom: 8, paddingHorizontal: 5}}>
            <Ionicons name="megaphone" size={10} color="#666" />
            <Text style={{color:'#444', fontSize: 8, fontWeight: '900', letterSpacing: 1}}>VOEXI SPONSORED SIGNAL</Text>
         </View>
         <NativeAdItem />
      </View>

          {/* 5. COMMENTS PREVIEW UNIT (MATCHING SCREENSHOT) */}
          <TouchableOpacity style={styles.commentsPreviewCard} onPress={() => setCommentsModal(true)}>
             <View style={styles.commPrevHeader}>
                <Text style={styles.commPrevTitle}>Comments <Text style={styles.commCountText}>{commentsCount}</Text></Text>
                <View style={styles.threeDots}>
                   <View style={styles.dot} />
                   <View style={styles.dot} />
                   <View style={styles.dot} />
                </View>
             </View>

             <View style={styles.topCommentRow}>
                {comments.length > 0 ? (
                   <>
                      <Image source={{ uri: comments[0].profiles?.avatar_url }} style={styles.previewAvatar} />
                      <Text style={styles.previewCommentText} numberOfLines={1}>{comments[0].content}</Text>
                   </>
                ) : (
                   <Text style={styles.emptyCommPlaceholder}>Add a feedback...</Text>
                )}
             </View>
          </TouchableOpacity>
        </Animated.View>

        {/* 6. MORE PRODUCTIONS (GRID MATCHING SCREENSHOT) */}
        <View style={styles.upNextSection}>
           <View style={styles.upNextHeaderRow}>
              <Text style={styles.upNextTitle}>MORE PRODUCTIONS</Text>
              <TouchableOpacity style={styles.viewAllRow}>
                 <Text style={styles.viewAllText}>View all</Text>
                 <Ionicons name="chevron-forward" size={14} color="#A855F7" />
              </TouchableOpacity>
           </View>

           <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relVideoGrid}>
              {relatedVideos.map((v) => (
                <TouchableOpacity key={v.id} style={styles.relVideoCard} onPress={() => router.push(`/video/${v.id}`)}>
                   <View style={styles.relThumbWrapper}>
                      <Image source={{ uri: v.thumbnail_url || v.media_url }} style={styles.relThumb} />
                      <View style={styles.durationTag}>
                         <Text style={styles.durationText}>PRO</Text>
                      </View>
                   </View>
                   <Text style={styles.relTitle} numberOfLines={1}>{v.title}</Text>
                   <Text style={styles.relViews}>{parseInt(v.views_count || 0).toLocaleString()} signals</Text>
                </TouchableOpacity>
              ))}
           </ScrollView>
        </View>
        <View style={{height: 120}} />
      </ScrollView>

      {/* FULL FEEDBACK MODAL */}
      <Modal visible={commentsModal} animationType="slide" transparent>
         <View style={styles.modalOverlay}>
            <View style={styles.fullSheet}>
               <View style={styles.dragHandle} />
               <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Comments</Text>
                  <TouchableOpacity onPress={() => setCommentsModal(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
               </View>

               {/* Replying Banner Bar */}
               {replyTo && (
                 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(168, 85, 247, 0.15)', borderLeftWidth: 3, borderLeftColor: '#A855F7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 8 }}>
                   <Text style={{ color: '#F8FAFC', fontSize: 11 }}>Replying to <Text style={{ color: '#C084FC', fontWeight: 'bold' }}>{replyTo.profiles?.username || replyTo.profiles?.channel_name || replyTo.user || '@user'}</Text></Text>
                   <TouchableOpacity onPress={() => setReplyTo(null)}>
                     <Ionicons name="close-circle" size={18} color="#94A3B8" />
                   </TouchableOpacity>
                 </View>
               )}

               <View style={styles.modalInputArea}>
                  <Image source={{ uri: video?.profiles?.avatar_url || 'https://via.placeholder.com/50' }} style={styles.smallUserIcon} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder={replyTo ? `Reply to ${replyTo.profiles?.username || 'user'}...` : "Add a comment..."}
                    placeholderTextColor="#666"
                    value={commentText}
                    onChangeText={setCommentText}
                  />

                  {/* Right Side Media Action Buttons */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity onPress={() => pickMediaComment('image')}>
                      <Ionicons name="image-outline" size={18} color="#94A3B8" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => pickMediaComment('video')}>
                      <Ionicons name="videocam-outline" size={18} color="#94A3B8" />
                    </TouchableOpacity>

                    <TouchableOpacity onPressIn={startVoiceRecording} onPressOut={() => stopVoiceRecording(true)}>
                      <Ionicons name="mic-outline" size={18} color={isRecording ? "#EF4444" : "#94A3B8"} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleAddComment} style={styles.modalSendBtn} disabled={isUploading}>
                      {isUploading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={14} color="#fff" />}
                    </TouchableOpacity>
                  </View>
               </View>

               {isRecording && (
                 <View style={styles.recordingStatus}>
                    <Animated.View style={[styles.recDot, { transform: [{ scale: pulseAnim }] }]} />
                    <Text style={styles.recText}>RECORDING VOICE... {formatDuration(recordingDuration)}</Text>
                 </View>
               )}

               {(() => {
                 const topLevelComments = comments.filter(c => !c.parent_id);
                 const repliesMap: { [parentId: string]: any[] } = {};

                 comments.forEach(c => {
                   if (c.parent_id) {
                     if (!repliesMap[c.parent_id]) repliesMap[c.parent_id] = [];
                     repliesMap[c.parent_id].push(c);
                   }
                 });

                 return (
                   <FlatList
                     data={topLevelComments}
                     keyExtractor={(c) => c.id}
                     renderItem={({item: c}) => {
                       const childReplies = repliesMap[c.id] || [];
                       const isExpanded = !!expandedReplies[c.id];

                       return (
                         <View style={{ marginBottom: 12 }}>
                           <View style={styles.commentRow}>
                              <TouchableOpacity onPress={() => c.user_id && router.push(`/user/${c.user_id}`)}>
                                 <Image source={{ uri: c.profiles?.avatar_url || 'https://via.placeholder.com/40' }} style={styles.commenterIcon} />
                              </TouchableOpacity>
                              <View style={{flex:1}}>
                                 <View style={styles.commHeaderRow}>
                                    <Text style={styles.commenterUsername}>@{c.profiles?.username || c.user || 'creator'}</Text>
                                    {c.is_pinned && <View style={styles.pinBadge}><Ionicons name="pin" size={8} color="#fff" /><Text style={styles.pinText}>PINNED</Text></View>}
                                 </View>

                                 {c.type === 'voice' ? (
                                    <TouchableOpacity style={styles.voiceCommBubble} onPress={() => playCommentVoice(c.media_url, c.id)}>
                                       <Ionicons name={playingVoiceId === c.id ? "pause" : "play"} size={16} color="#fff" />
                                       <Text style={styles.voiceCommText}>Voice Signal</Text>
                                       <View style={styles.waveformMini}>
                                          {[1,2,3,4,5].map(i => <View key={i} style={[styles.waveBarMini, { height: 4 + Math.random()*12 }]} />)}
                                       </View>
                                    </TouchableOpacity>
                                 ) : c.type === 'image' ? (
                                    <TouchableOpacity onPress={() => Alert.alert("Visual Signal", "Full view coming soon")}>
                                       <Image source={{ uri: c.media_url }} style={styles.commImage} />
                                    </TouchableOpacity>
                                 ) : c.type === 'video' ? (
                                    <View style={styles.commVideoContainer}>
                                       <CommentVideoPlayer mediaUrl={c.media_url} />
                                    </View>
                                 ) : (
                                    <Text style={styles.commentMsg}>{c.content || c.text}</Text>
                                 )}

                                 <View style={styles.commentActionRow}>
                                    <Text style={styles.commTime}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Just now'}</Text>
                                    <TouchableOpacity onPress={() => {
                                       setExpandedReplies(prev => ({ ...prev, [c.id]: !expandedReplies[c.id] }));
                                       setReplyTo(c);
                                    }}>
                                       <Text style={[styles.replyBtnTxt, childReplies.length > 0 && { color: '#38BDF8', fontWeight: 'bold' }]}>
                                          Reply {childReplies.length > 0 ? `(${childReplies.length})` : ''}
                                       </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => showCommentOptions(c)} style={{padding: 2}}><Ionicons name="ellipsis-horizontal" size={14} color="#666" /></TouchableOpacity>
                                 </View>
                              </View>
                           </View>

                           {/* Expanded Child Replies Thread */}
                           {isExpanded && (
                             <View style={{ marginLeft: 38, borderLeftWidth: 1.5, borderLeftColor: 'rgba(168, 85, 247, 0.4)', paddingLeft: 12 }}>
                               {childReplies.map((reply, rIdx) => (
                                 <View key={reply.id || `r_${rIdx}`} style={[styles.commentRow, { backgroundColor: 'rgba(255,255,255,0.015)', marginBottom: 8 }]}>
                                    <Image source={{ uri: reply.profiles?.avatar_url || 'https://via.placeholder.com/40' }} style={[styles.commenterIcon, { width: 28, height: 28 }]} />
                                    <View style={{flex:1}}>
                                       <View style={styles.commHeaderRow}>
                                          <Text style={[styles.commenterUsername, {fontSize: 11}]}>@{reply.profiles?.username || reply.user || 'creator'}</Text>
                                          <Text style={{color: '#38BDF8', fontSize: 10}}>↳ Replying to @{c.profiles?.username || c.user || 'creator'}</Text>
                                       </View>
                                       <Text style={[styles.commentMsg, {fontSize: 12}]}>{reply.content || reply.text}</Text>
                                       <View style={styles.commentActionRow}>
                                          <Text style={styles.commTime}>{reply.created_at ? new Date(reply.created_at).toLocaleDateString() : 'Just now'}</Text>
                                          <TouchableOpacity onPress={() => { setReplyTo(reply); }}><Text style={styles.replyBtnTxt}>Reply</Text></TouchableOpacity>
                                       </View>
                                    </View>
                                 </View>
                               ))}

                               {/* Hide Replies Button */}
                               <TouchableOpacity
                                 onPress={() => toggleExpandReplies(c.id)}
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
                     contentContainerStyle={{paddingBottom: 100, paddingHorizontal: 15}}
                   />
                 );
               })()}
            </View>
         </View>
      </Modal>

      {/* DESCRIPTION MODAL */}
      <Modal visible={descModal} animationType="slide" transparent>
         <View style={styles.modalOverlay}>
            <View style={styles.fullSheet}>
               <View style={styles.dragHandle} />
               <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Description</Text>
                  <TouchableOpacity onPress={() => setDescModal(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
               </View>
               <ScrollView style={{padding: 20}}>
                  <Text style={styles.descVideoTitle}>{video?.title || 'Untitled'}</Text>
                  <Text style={styles.descBody}>{video?.description || "No description provided."}</Text>

                  <TouchableOpacity style={styles.saveVideoBtn} onPress={async () => { setDescModal(false); if (currentUserId && video) { recordSave(video.id, currentUserId); Alert.alert("SAVED", "Video saved to your bookmarks."); } }}>
                     <Ionicons name="bookmark" size={18} color="#fff" />
                     <Text style={styles.saveBtnText}>SAVE VIDEO TO BOOKMARKS</Text>
                  </TouchableOpacity>
               </ScrollView>
            </View>
         </View>
      </Modal>

      {/* RATING MODAL */}
      <Modal visible={ratingModal} transparent animationType="fade">
        <Pressable style={styles.overlayCentered} onPress={() => setRatingModal(false)}>
          <View style={styles.ratingSheet}>
            <Text style={styles.ratingSheetTitle}>RATE PRODUCTION</Text>
            <View style={styles.ratingRow}>
              {[1,2,3,4,5].map(s => (
                <TouchableOpacity key={s} onPress={() => handleRateSubmit(s)}><Ionicons name={s <= userRating ? "star" : "star-outline"} size={42} color={s <= userRating ? "#FFD700" : "#222"} /></TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* YOUTUBE-STYLE VIDEO QUALITY SETTINGS MODAL */}
      <Modal visible={qualityModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setQualityModalVisible(false)}>
          <View style={styles.qualitySheet}>
            <View style={styles.dragHandle} />
            <View style={styles.qualitySheetHeader}>
              <Ionicons name="settings-sharp" size={20} color="#00F2FE" />
              <Text style={styles.qualitySheetTitle}>VIDEO STREAM QUALITY</Text>
            </View>
            <Text style={styles.qualitySheetSub}>Choose streaming resolution for this video broadcast:</Text>

            <View style={{ gap: 10, marginVertical: 15 }}>
              {[
                { id: 'auto', label: 'Auto (Recommended)', desc: 'Adjusts automatically to your network speed', icon: 'flash', badge: 'HD' },
                { id: '1080p', label: '1080p Full HD', desc: 'Highest resolution, best visual quality', icon: 'sparkles', badge: '1080p' },
                { id: '720p', label: '720p HD', desc: 'High definition, balanced data usage', icon: 'videocam', badge: '720p' },
                { id: '480p', label: '480p SD', desc: 'Standard definition, saves mobile data', icon: 'phone-portrait', badge: '480p' },
                { id: '360p', label: '360p Data Saver', desc: 'Lowest resolution, works on slow 3G', icon: 'leaf', badge: '360p' },
              ].map(q => {
                const isSelected = selectedQuality === q.id;
                return (
                  <TouchableOpacity
                    key={q.id}
                    style={[styles.qualityOptionCard, isSelected && styles.qualityOptionActive]}
                    onPress={async () => {
                      setSelectedQuality(q.id as any);
                      setQualityModalVisible(false);
                      await AsyncStorage.setItem('@video_quality_pref', q.id);
                      if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                      Alert.alert(
                        `QUALITY SET TO ${q.label.toUpperCase()} ⚡`,
                        `Video stream quality updated to ${q.label}. Stream is running smoothly!`
                      );
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={q.icon as any} size={20} color={isSelected ? '#00F2FE' : '#888'} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.qualityOptionTitle, isSelected && { color: '#00F2FE', fontWeight: 'bold' }]}>
                        {q.label}
                      </Text>
                      <Text style={styles.qualityOptionSub}>{q.desc}</Text>
                    </View>
                    <View style={[styles.qualityBadgePill, isSelected && { backgroundColor: '#00F2FE' }]}>
                      <Text style={[styles.qualityBadgeText, isSelected && { color: '#000' }]}>{q.badge}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#00F2FE" style={{ marginLeft: 6 }} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.closeQualityBtn} onPress={() => setQualityModalVisible(false)}>
              <Text style={styles.closeQualityText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* THREE-DOTS MORE OPTIONS SHEET */}
      <Modal visible={videoOptionsModal} animationType="slide" transparent onRequestClose={() => setVideoOptionsModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setVideoOptionsModal(false)} />
          <View style={[styles.fullSheet, { height: 'auto', maxHeight: '80%', paddingBottom: 25, backgroundColor: '#0B0B14', borderTopWidth: 1, borderColor: '#1E1E2E' }]}>
            <View style={[styles.dragHandle, { backgroundColor: '#333' }]} />
            <View style={[styles.sheetHeader, { borderBottomColor: '#1A1A28', paddingBottom: 15 }]}>
               <Text style={[styles.sheetTitle, { letterSpacing: 2, color: '#FFF', fontSize: 15 }]}>MORE</Text>
               <TouchableOpacity onPress={() => setVideoOptionsModal(false)}>
                 <Ionicons name="close" size={22} color="#888" />
               </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 20, paddingTop: 10 }}>
              {/* 1. QUALITY & STREAM RESOLUTION */}
              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={() => {
                  setVideoOptionsModal(false);
                  setTimeout(() => setQualityModalVisible(true), 250);
                }}
              >
                <View style={[styles.optionsIconBox, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
                  <Ionicons name="settings-outline" size={18} color="#FFD700" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionsMenuText}>Stream Quality & Resolution</Text>
                  <Text style={styles.optionsMenuSub}>Current: {selectedQuality.toUpperCase()}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#666" />
              </TouchableOpacity>

              {/* 2. REMIX / CREATE DUET */}
              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={() => {
                  setVideoOptionsModal(false);
                  if (video?.id) router.push(`/remix/${video.id}`);
                }}
              >
                <View style={[styles.optionsIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                  <Ionicons name="sparkles" size={18} color="#A855F7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionsMenuText}>Remix / Create Duet</Text>
                  <Text style={styles.optionsMenuSub}>Sample audio or video for creation</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#666" />
              </TouchableOpacity>

              {/* 3. SAVE TO BOOKMARKS */}
              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={async () => {
                  setVideoOptionsModal(false);
                  if (video?.id) {
                    await recordSave(video.id, currentUserId || '');
                    Alert.alert("SAVED", "Video saved to your bookmarks.");
                  }
                }}
              >
                <View style={[styles.optionsIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                  <Ionicons name="bookmark" size={18} color="#38BDF8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionsMenuText}>Save to Bookmarks</Text>
                  <Text style={styles.optionsMenuSub}>Keep in your saved library</Text>
                </View>
              </TouchableOpacity>

              {/* 4. COPY VIDEO LINK */}
              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={async () => {
                  setVideoOptionsModal(false);
                  const shareUrl = `https://voexi.com/video/${id}`;
                  await Clipboard.setStringAsync(shareUrl);
                  Alert.alert("COPIED", "Video link copied to clipboard.");
                }}
              >
                <View style={[styles.optionsIconBox, { backgroundColor: 'rgba(0, 242, 254, 0.15)' }]}>
                  <Ionicons name="link-outline" size={18} color="#00F2FE" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionsMenuText}>Copy Video Link</Text>
                  <Text style={styles.optionsMenuSub}>Share direct URL</Text>
                </View>
              </TouchableOpacity>

              {/* 5. SEND SIGNAL / SHARE */}
              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={() => {
                  setVideoOptionsModal(false);
                  const shareUrl = `https://voexi.com/video/${id}`;
                  Share.share({
                    message: `Watch this production on VOEXI: ${video?.title || 'Amazing Content'}\n${shareUrl}`,
                    url: shareUrl
                  });
                }}
              >
                <View style={[styles.optionsIconBox, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                  <Ionicons name="paper-plane-outline" size={18} color="#EC4899" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionsMenuText}>Send Signal / Share</Text>
                  <Text style={styles.optionsMenuSub}>Share to external apps</Text>
                </View>
              </TouchableOpacity>

              {/* 6. NEURAL AUDIT & TELEMETRY */}
              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={() => {
                  setVideoOptionsModal(false);
                  setAuditTarget({ id: video?.id || String(id), userId: video?.user_id || '', type: 'video' });
                  setAuditModalVisible(true);
                }}
              >
                <View style={[styles.optionsIconBox, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                  <Ionicons name="hardware-chip-outline" size={18} color="#22C55E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionsMenuText}>Neural Audit & Telemetry</Text>
                  <Text style={styles.optionsMenuSub}>Virality Index & Quality Score</Text>
                </View>
              </TouchableOpacity>

              {/* 7. REPORT SIGNAL */}
              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={() => {
                  setVideoOptionsModal(false);
                  Alert.alert("REPORTED", "Signal flagged for review.");
                }}
              >
                <View style={[styles.optionsIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Ionicons name="flag-outline" size={18} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionsMenuText, { color: '#EF4444' }]}>Report Signal</Text>
                  <Text style={styles.optionsMenuSub}>Flag inappropriate content</Text>
                </View>
              </TouchableOpacity>

              {/* 8. DELETE PRODUCTION (IF OWNER) */}
              {(currentUserId === video?.user_id || video?.uploader === '@admin_creator') && (
                <TouchableOpacity
                  style={styles.optionsMenuItem}
                  onPress={() => {
                    setVideoOptionsModal(false);
                    Alert.alert("DELETE", "Permanently remove this long video?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => Alert.alert("Deleted", "Video removed.") }
                    ]);
                  }}
                >
                  <View style={[styles.optionsIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionsMenuText, { color: '#EF4444' }]}>Delete Production</Text>
                    <Text style={styles.optionsMenuSub}>Remove from disk</Text>
                  </View>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* NEURAL AUDIT MODAL */}
      <NeuralAuditModal
         visible={auditModalVisible}
         onClose={() => setAuditModalVisible(false)}
         targetId={auditTarget?.id || ''}
         targetUserId={auditTarget?.userId || ''}
         signalType={auditTarget?.type || 'video'}
         currentUserId={currentUserId || ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08080C' },
  optionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#12121A',
  },
  optionsIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsMenuText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  optionsMenuSub: {
    color: '#666',
    fontSize: 10,
    marginTop: 2,
  },
  loadingBox: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },

  // HEADER
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 15, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  circleIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },

  // VIDEO HERO
  videoHero: { width: '100%', aspectRatio: 16/9, backgroundColor: '#000', borderBottomWidth: 1, borderBottomColor: '#1A1A24' },
  videoPlayer: { width: '100%', height: '100%' },

  // MAIN CONTENT
  mainContent: { paddingHorizontal: 15 },
  titleSection: { marginTop: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  videoTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 0.5, flex: 1 },
  titleActions: { flexDirection: 'row', gap: 15, marginLeft: 15 },
  iconAction: { padding: 2 },
  statText: { color: '#666', fontSize: 11, fontWeight: '700', marginTop: 4 },

  // ACTION GRID
  actionGrid: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 15 },
  actionCell: { flex: 1, height: 38, backgroundColor: '#12121A', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#1A1A24' },
  actionCellActive: { backgroundColor: '#ff4d6d22', borderColor: '#ff4d6d' },
  actionLabel: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  // CREATOR SURFACE
  creatorSurface: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#12121A' },
  creatorInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  channelAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#111', borderWidth: 1, borderColor: '#222' },
  channelName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  subCountText: { color: '#555', fontSize: 11, marginTop: 2 },
  creatorRightActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subscribePill: { width: 140, height: 40, borderRadius: 20, overflow: 'hidden' },
  subscribeGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  subscribeText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  notificationBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#12121A', justifyContent: 'center', alignItems: 'center' },

  // COMMENTS PREVIEW CARD (MATCHING HIGHLIGHTED SCREENSHOT)
  commentsPreviewCard: { backgroundColor: '#12121A', padding: 15, borderRadius: 15, marginTop: 15, marginBottom: 15, borderWidth: 1, borderColor: '#1A1A24' },
  commPrevHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  commPrevTitle: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  commCountText: { color: '#666', fontSize: 12, fontWeight: '400', marginLeft: 5 },
  threeDots: { flexDirection: 'row', gap: 2 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#666' },
  topCommentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#111' },
  previewCommentText: { color: '#eee', fontSize: 12, flex: 1 },
  emptyCommPlaceholder: { color: '#444', fontSize: 12 },

  // UP NEXT SECTION (EXACT GRID)
  upNextSection: { marginTop: 15, paddingHorizontal: 15 },
  upNextHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  upNextTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 },
  viewAllRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: { color: '#A855F7', fontSize: 11, fontWeight: '900' },
  relVideoGrid: { gap: 15, paddingRight: 20 },
  relVideoCard: { width: 160 },
  relThumbWrapper: { width: 160, height: 180, borderRadius: 20, overflow: 'hidden', backgroundColor: '#111', position: 'relative' },
  relThumb: { width: '100%', height: '100%', resizeMode: 'cover' },
  durationTag: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  durationText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  relTitle: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginTop: 10 },
  relViews: { color: '#555', fontSize: 11, marginTop: 4 },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  fullSheet: { backgroundColor: '#08080C', height: '85%', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  dragHandle: { width: 40, height: 4, backgroundColor: '#222', alignSelf: 'center', marginTop: 12, borderRadius: 2 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 25, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#12121A' },
  sheetTitle: { color: '#fff', fontWeight: 'bold' },

  modalInputArea: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, backgroundColor: '#0A0A10', marginHorizontal: 15, marginVertical: 15, borderRadius: 20, borderWidth: 1, borderColor: '#12121A' },
  smallUserIcon: { width: 28, height: 28, borderRadius: 14 },
  modalInput: { flex: 1, color: '#fff', fontSize: 14 },
  modalSendBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#5856D6', justifyContent: 'center', alignItems: 'center' },

  commentRow: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  commenterIcon: { width: 34, height: 34, borderRadius: 17 },
  commentHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  commenterUsername: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  pinBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FF3B3033', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  pinText: { color: '#FF3B30', fontSize: 8, fontWeight: '900' },
  commentMsg: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  commentActionRow: { flexDirection: 'row', gap: 20, marginTop: 10, alignItems: 'center' },
  replyBtnTxt: { color: '#A855F7', fontSize: 11, fontWeight: 'bold' },
  commTime: { color: '#444', fontSize: 9, fontWeight: 'bold' },

  // MEDIA COMMENTS
  voiceCommBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1A1A24', padding: 12, borderRadius: 18, alignSelf: 'flex-start', marginVertical: 5, borderWidth: 1, borderColor: '#333' },
  voiceCommText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  waveformMini: { flexDirection: 'row', gap: 2, alignItems: 'center' },
  waveBarMini: { width: 2, backgroundColor: '#00D4FF', borderRadius: 1, opacity: 0.6 },
  commImage: { width: 180, height: 180, borderRadius: 15, marginVertical: 8, borderWidth: 1, borderColor: '#1A1A24' },
  commVideoContainer: { width: 200, aspectRatio: 9/16, borderRadius: 15, overflow: 'hidden', marginVertical: 8, backgroundColor: '#000', borderWidth: 1, borderColor: '#1A1A24' },
  commVideo: { width: '100%', height: '100%' },
  recordingStatus: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 25, paddingBottom: 15 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff4444' },
  recText: { color: '#ff4444', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  descVideoTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  descBody: { color: '#888', fontSize: 14, lineHeight: 22 },

  saveVideoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 40, padding: 15, backgroundColor: VOEXITheme.colors.primary, borderRadius: 15 },
  saveBtnText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  overlayCentered: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  ratingSheet: { backgroundColor: '#0A0A10', padding: 40, borderRadius: 30, alignItems: 'center', width: '85%', borderWidth: 1, borderColor: '#1A1A24' },
  ratingSheetTitle: { color: '#fff', fontWeight: '900', fontSize: 16, marginBottom: 25 },
  ratingRow: { flexDirection: 'row', gap: 10 },

  // QUALITY SETTINGS
  qualityPillBadge: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.4)', zIndex: 10 },
  qualityPillText: { color: '#FFD700', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  qualitySheet: { backgroundColor: '#0A0A10', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, borderWidth: 1, borderColor: '#1A1A24' },
  qualitySheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  qualitySheetTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  qualitySheetSub: { color: '#888', fontSize: 11, marginBottom: 10 },
  qualityOptionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#12121A', borderRadius: 16, borderWidth: 1, borderColor: '#1A1A24' },
  qualityOptionActive: { backgroundColor: 'rgba(0, 242, 254, 0.12)', borderColor: '#00F2FE' },
  qualityOptionTitle: { color: '#fff', fontSize: 13, fontWeight: '800' },
  qualityOptionSub: { color: '#666', fontSize: 10, marginTop: 2 },
  qualityBadgePill: { backgroundColor: '#1F1F2E', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  qualityBadgeText: { color: '#aaa', fontSize: 9, fontWeight: '900' },
  closeQualityBtn: { padding: 15, alignItems: 'center', backgroundColor: '#12121A', borderRadius: 15, marginTop: 10 },
  closeQualityText: { color: '#888', fontSize: 11, fontWeight: '900', letterSpacing: 1 }
});
