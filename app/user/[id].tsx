import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  FlatList,
  Linking,
  Alert,
  Share,
  Modal,
  Pressable,
  StatusBar
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useVideoPlayer, VideoView } from 'expo-video';
import SubscribeButton from '../../components/SubscribeButton';
import { useLanguage } from '../../hooks/useLanguage';
import VXIdentityCard from '../../components/VXIdentityCard';
import { getThemeById } from '../../constants/cardThemes';
import { useFollow } from '../../lib/social';
import { NeuralAuditModal } from '../../components/moderation/NeuralAuditModal';
import { GlobalBottomBar } from '../../components/GlobalBottomBar';
import { useTheme } from '../../hooks/useTheme';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 45) / 2;

const isValidUuid = (val: string | null | undefined): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

const InstagramPeekPreviewModal = ({ visible, item, onClose, onOpenFull, onLike }: any) => {
  const pt = (item?.post_type || '').toLowerCase();
  const isReel = (pt === 'reels' || pt === 'reel' || item?.is_reel === true) && pt !== 'video' && pt !== 'photo';
  const isVideo = pt === 'video' || isReel || item?.media_type === 'video';
  const mediaUrl = item?.video_url || item?.media_url || item?.thumbnail_url || '';

  const videoSource = visible && isVideo && mediaUrl ? mediaUrl : '';
  const player = useVideoPlayer(videoSource, (p) => {
    if (p) p.loop = true;
  });

  useEffect(() => {
    if (player) {
      if (visible && isVideo && videoSource) {
        try {
          player.play();
        } catch (e) {}
      } else {
        try {
          player.pause();
        } catch (e) {}
      }
    }
  }, [visible, player, isVideo, videoSource]);

  if (!item || !visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.previewOverlay} onPress={onClose}>
        <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint="dark" style={StyleSheet.absoluteFill} />

        <Pressable style={styles.previewCard} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.previewHeader}>
            <Image
              source={{ uri: item.profiles?.avatar_url || 'https://via.placeholder.com/100' }}
              style={styles.previewAvatar}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.previewName} numberOfLines={1}>
                {item.profiles?.channel_name || item.profiles?.username || 'VOEXI Creator'}
              </Text>
              <Text style={styles.previewHandle} numberOfLines={1}>
                @{item.profiles?.username || 'creator'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.previewCloseBtn}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Media Player / Image */}
          <View style={[styles.previewMediaBox, { aspectRatio: isReel ? 4 / 5 : 16 / 9 }]}>
            {isVideo && player ? (
              <VideoView
                player={player}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                nativeControls={false}
              />
            ) : (
              <Image
                source={{ uri: item.thumbnail_url || item.media_url }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
            )}
          </View>

          {/* Caption & Title */}
          <View style={styles.previewMetaBox}>
            <Text style={styles.previewTitle} numberOfLines={2}>
              {item.title || item.description || 'VOEXI Production'}
            </Text>
            <Text style={styles.previewStats}>
              {Number(item.views_count || 0).toLocaleString()} views  •  {Number(item.likes_count || 0).toLocaleString()} likes
            </Text>
          </View>

          {/* Action Console */}
          <View style={styles.previewActionsRow}>
            <TouchableOpacity style={styles.previewActionBtn} onPress={() => onLike?.(item)}>
              <Ionicons name="heart-outline" size={22} color="#fff" />
              <Text style={styles.previewActionLabel}>Like</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.previewActionBtn} onPress={() => { onClose(); onOpenFull?.(item); }}>
              <Ionicons name="expand" size={22} color="#A855F7" />
              <Text style={styles.previewActionLabel}>Open</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.previewActionBtn} onPress={() => { onClose(); Share.share({ message: `Watch on VOEXI: ${item.title || 'Production'}\nhttps://voexi.com/video/${item.id}` }); }}>
              <Ionicons name="paper-plane-outline" size={22} color="#fff" />
              <Text style={styles.previewActionLabel}>Share</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { isLight } = useTheme();
  const [previewPost, setPreviewPost] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'video' | 'reels' | 'photo' | 'live'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [postMenuVisible, setPostMenuVisible] = useState(false);
  const [auditTarget, setAuditTarget] = useState<{id: string, userId: string, type: any} | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [dirtLevel, setDirtLevel] = useState(0);

  // Moderation
  const [auditModalVisible, setAuditModalVisible] = useState(false);

  // Global Sync Hook
  const { isFollowing, subsCount, toggleFollow } = useFollow(currentUserId, id as string);

  // Subscribers List States
  const [subscribersModalVisible, setSubscribersModalVisible] = useState(false);
  const [subscribersList, setSubscribersList] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [listModalTitle, setListModalTitle] = useState('SUBSCRIBERS');

  // Connection State
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<any[]>([]);

  const theme = getThemeById(profile?.card_theme || 'default');

  const [counts, setCounts] = useState({
    subscribers: 0,
    friends: 0,
    totalViews: 0,
  });

  useEffect(() => {
    checkUser();
    if (id) {
        fetchUserData();
        fetchConnectionStatus();
    }
  }, [id]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
    if (user) {
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (data) setCurrentUserRole(data.role);
    }
  };

  const fetchConnectionStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !id) return;
    const { data } = await supabase.from('friends').select('status').or(`and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`).maybeSingle();
    if (data) setConnectionStatus(data.status);
    else setConnectionStatus(null);
  };

  const handleConnect = async () => {
    if (!currentUserId) return Alert.alert("Login Required", "Please login to connect.");
    if (connectionStatus === 'pending') return Alert.alert("Wait", "Request already sent.");
    if (connectionStatus === 'accepted') return router.push(`/menu/chat/${id}`);

    try {
      // CRITICAL CHECK: If target user requires subscription first
      if (profile?.require_sub_for_friend && !isFollowing) {
        return Alert.alert(
          "SUBSCRIPTION REQUIRED",
          `@${profile.username} only accepts friend requests from their subscribers. Please subscribe to their station first.`,
          [
            { text: "ABORT", style: "cancel" },
            { text: "SUBSCRIBE NOW", onPress: () => handleFollow() }
          ]
        );
      }

      const { error } = await supabase.from('friends').insert({
        sender_id: currentUserId,
        receiver_id: id,
        status: 'pending'
      });

      if (!error) {
        Alert.alert("Success", "Friend request sent!");
        setConnectionStatus('pending');
      }
    } catch (e) { Alert.alert("Error", "Could not send request."); }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserData();
  }, [id]);

  const handleFollow = async () => {
    await toggleFollow();
  };

  const fetchSubscribersList = async () => {
    try {
      setListModalTitle('SUBSCRIBERS');
      setSubsLoading(true);
      setSubscribersModalVisible(true);
      const { data, error } = await supabase
        .from('followers')
        .select('follower_id, profiles:follower_id(id, username, avatar_url, channel_name)')
        .eq('creator_id', id);
      if (error) throw error;
      setSubscribersList(data?.map(i => i.profiles) || []);
    } catch (e) { Alert.alert("Error", "Could not load list"); } finally { setSubsLoading(false); }
  };

  const fetchFriendsList = async () => {
    try {
      setListModalTitle('FRIENDS');
      setSubsLoading(true);
      setSubscribersModalVisible(true);
      const { data, error } = await supabase
        .from('friends')
        .select('sender_id, receiver_id, sender:profiles!sender_id(id, username, avatar_url, channel_name), receiver:profiles!receiver_id(id, username, avatar_url, channel_name)')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${id},receiver_id.eq.${id}`);
      if (error) throw error;
      const list = data.map(f => f.sender_id === id ? f.receiver : f.sender);
      setSubscribersList(list);
    } catch (e) { Alert.alert("Error", "Could not load friends"); } finally { setSubsLoading(false); }
  };

  const fetchUserData = async () => {
    try {
      if (!id) return;
      const rawId = Array.isArray(id) ? id[0] : (id as string);

      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id;

      // 1. Resolve target user profile (by UUID, username, or vx_id_number)
      let targetProfile: any = null;
      if (isValidUuid(rawId)) {
        const { data: profByUuid } = await supabase.from('profiles').select('*').eq('id', rawId).maybeSingle();
        targetProfile = profByUuid;
      }
      if (!targetProfile) {
        const { data: profByName } = await supabase.from('profiles').select('*').or(`username.eq.${rawId},vx_id_number.eq.${rawId}`).maybeSingle();
        targetProfile = profByName;
      }

      if (!targetProfile && !isValidUuid(rawId)) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const targetUserId = targetProfile?.id || rawId;

      if (targetProfile) {
        const rawProf = targetProfile;
        const displayName = rawProf.channel_name || rawProf.username || 'broadcaster';
        const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=A855F7&color=fff&bold=true`;

        setProfile({
          ...rawProf,
          channel_name: displayName,
          username: rawProf.username || 'broadcaster',
          avatar_url: rawProf.avatar_url && rawProf.avatar_url.startsWith('http') ? rawProf.avatar_url : fallbackAvatar,
        });

        if (rawProf.last_maintenance_at) {
          const last = new Date(rawProf.last_maintenance_at).getTime();
          const now = new Date().getTime();
          const diffDays = Math.floor((now - last) / (1000 * 3600 * 24));
          if (diffDays >= 3) {
            setIsDirty(true);
            setDirtLevel(diffDays);
          }
        }
      }

      // 2. Fetch Posts, Followers, Friends using explicit targetUserId
      const [postsRes, followersRes, friendsRes] = await Promise.all([
        supabase.from('posts').select('*, profiles:profiles!posts_user_id_fkey(*)').or(`user_id.eq.${targetUserId},collaborator_id.eq.${targetUserId}`).neq('post_type', 'Story').order('created_at', { ascending: false }),
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('creator_id', targetUserId),
        supabase.from('friends').select('*', { count: 'exact', head: true }).eq('status', 'accepted').or(`and(sender_id.eq.${targetUserId},receiver_id.eq.${uid}),and(sender_id.eq.${uid},receiver_id.eq.${targetUserId})`)
      ]);

      // Fetch Highlights
      const { data: hData } = await supabase.from('highlights').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false });
      if (hData) setHighlights(hData);

      let fetchedPosts: any[] = postsRes.data || [];
      if (fetchedPosts.length === 0) {
        try {
          const { data: fallbackPosts } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', targetUserId)
            .neq('post_type', 'Story')
            .order('created_at', { ascending: false });
          if (fallbackPosts && fallbackPosts.length > 0) {
            fetchedPosts = fallbackPosts;
          }
        } catch (e) {}
      }

      const fullUserPosts = fetchedPosts.map((p: any) => ({
        ...p,
        profiles: p.profiles || targetProfile || {
          channel_name: p.channel_name || p.username || 'VOEXI Broadcaster',
          username: p.username || 'broadcaster',
          avatar_url: p.avatar_url || ''
        }
      }));

      setUserPosts(fullUserPosts);

      const totalViews = fullUserPosts.reduce((acc: number, curr: any) => acc + (parseInt(curr.views_count) || 0), 0);

      setCounts({
        subscribers: followersRes.count || 0,
        friends: friendsRes.count || 0,
        totalViews: totalViews,
      });
    } catch (e) {
      console.error('[Profile Fetch Error]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = `https://voexi.com/user/${profile?.id}`;
      const shareMsg = `Check out ${profile?.username} on VOEXI! \n${shareUrl}`;
      await Share.share({ message: shareMsg, url: shareUrl });
    } catch (error: any) {
      Alert.alert('Share Error', error.message);
    }
  };

  const handlePostShare = async (post: any) => {
    const shareUrl = `https://voexi.com/video/${post.id}`;
    await Share.share({ message: `Watch this production by ${profile?.username} on VOEXI! \n${shareUrl}`, url: shareUrl });
    setPostMenuVisible(false);
  };

  const handleDeletePost = async () => {
    if (!selectedPost) return;
    Alert.alert("ADMIN ERASE", "As an authorized moderator, you are about to wipe this signal. Proceed?", [
      { text: "ABORT", style: 'cancel' },
      { text: "ERASE", style: 'destructive', onPress: async () => {
          try {
            const { error } = await supabase.from('posts').delete().eq('id', selectedPost.id);
            if (error) throw error;
            setUserPosts(prev => prev.filter(p => p.id !== selectedPost.id));
            setPostMenuVisible(false);
          } catch (e: any) { Alert.alert("Erase Failed", e.message); }
      }}
    ]);
  };

  const filteredPosts = useMemo(() => {
    let result = [...userPosts];

    // Filtering
    if (activeTab === 'video') {
      result = result.filter(p => {
        const pt = p.post_type?.toLowerCase() || '';
        return (pt === 'video' || p.media_type === 'video') && pt !== 'reels' && pt !== 'reel' && p.is_reel !== true;
      });
    } else if (activeTab === 'reels') {
      result = result.filter(p => {
        const pt = p.post_type?.toLowerCase() || '';
        return (pt === 'reels' || pt === 'reel' || p.is_reel === true) && pt !== 'video' && pt !== 'photo';
      });
    } else if (activeTab === 'photo') {
      result = result.filter(p => {
        const pt = p.post_type?.toLowerCase() || '';
        return pt === 'photo' || p.media_type === 'image';
      });
    } else if (activeTab === 'live') {
      result = result.filter(p => p.post_type?.toLowerCase() === 'live');
    }

    // Sorting
    if (sortBy === 'popular') {
      result.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [userPosts, activeTab, sortBy]);

  if (loading && !refreshing) {
    return (
        <View style={[styles.centerLoader, isLight && { backgroundColor: '#fff' }]}>
            <ActivityIndicator size="large" color={VOEXITheme.colors.primary} />
        </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <StatusBar barStyle={isLight ? "dark-content" : "light-content"} />
      <LinearGradient
        colors={[theme.colors[0], '#000']}
        style={[StyleSheet.absoluteFill, { opacity: isLight ? 0.05 : 0.2 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
      />
      <View style={[styles.header, isLight && { borderBottomWidth: 1, borderBottomColor: '#EEE' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={isLight ? '#000' : "#fff"} />
        </TouchableOpacity>
        <View style={{flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center'}}>
          <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>{profile?.username?.toUpperCase() || 'USER PROFILE'}</Text>
          {profile?.verification_status === 'verified' && (
            <View style={styles.verifiedDot} />
          )}
          {profile?.registration_number && (
            <MaterialCommunityIcons name="check-decagram" size={14} color={VOEXITheme.colors.primary} style={{marginLeft: 5}} />
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 15 }}>
           <TouchableOpacity onPress={() => {
              setAuditTarget({ id: id as string, userId: id as string, type: 'profile' });
              setAuditModalVisible(true);
           }}>
              <Ionicons name="shield-outline" size={22} color="#ff4444" />
           </TouchableOpacity>
           <TouchableOpacity onPress={handleShare}>
              <Ionicons name="share-social-outline" size={22} color={isLight ? '#000' : "#fff"} />
           </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={profile?.privacy_mode === 'private' && connectionStatus !== 'accepted' && currentUserId !== id ? [] : filteredPosts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        onRefresh={onRefresh}
        refreshing={refreshing}
        contentContainerStyle={styles.scrollContent}
        columnWrapperStyle={profile?.privacy_mode === 'private' && connectionStatus !== 'accepted' && currentUserId !== id ? null : styles.columnWrapper}
        ListHeaderComponent={
          <View style={styles.headerComponent}>
            <VXIdentityCard profile={profile} themeId={profile?.card_theme} isDirty={isDirty} dirtLevel={dirtLevel} />

            <View style={[styles.neuralInfoBar, isLight && { opacity: 0.8 }]}>
               <View style={[styles.infoPill, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]}>
                  <View style={[styles.statusDot, { backgroundColor: VOEXITheme.colors.primary }]} />
                  <Text style={[styles.infoPillText, isLight && { color: '#666' }]}>{profile?.neural_status || 'PSYCH-LINK ACTIVE'}</Text>
               </View>
               <View style={[styles.infoPill, { flex: 1 }, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]}>
                  <Ionicons name="flash" size={12} color="#FFD700" />
                  <View style={{ flex: 1, marginHorizontal: 8 }}>
                     <View style={[styles.xpTrack, isLight && { backgroundColor: '#DDD' }]}>
                        <View style={[styles.xpFill, { width: `${Math.min(((profile?.xp || 0) % 1000) / 10, 100)}%` }]} />
                     </View>
                  </View>
                  <Text style={[styles.infoPillText, isLight && { color: '#666' }]}>LVL {profile?.level || 1}</Text>
               </View>
            </View>

            {isDirty && (
              <View style={styles.abandonedBadge}>
                <Ionicons name="warning" size={14} color="#FFD700" />
                <Text style={styles.abandonedText}>STATION UNDER DECAY: AGENT INACTIVE FOR {dirtLevel} DAYS</Text>
              </View>
            )}

            <View style={styles.actionRow}>
                {currentUserId === id ? (
                  <TouchableOpacity
                    style={styles.analyticsBtn}
                    onPress={() => router.push('/menu/analytics')}
                  >
                    <Ionicons name="stats-chart" size={18} color="#fff" />
                    <Text style={styles.followBtnText}>VIEW ANALYTICS</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <SubscribeButton
                      isSubscribed={isFollowing}
                      onPress={handleFollow}
                      showBell={true}
                      size="medium"
                    />

                    <TouchableOpacity
                        style={[styles.connectBtn, connectionStatus === 'accepted' && styles.friendsBtn]}
                        onPress={handleConnect}
                    >
                        <Ionicons
                          name={connectionStatus === 'accepted' ? "chatbubbles" : (connectionStatus === 'pending' ? "time-outline" : "person-add")}
                          size={18}
                          color="#fff"
                        />
                        <Text style={styles.connectBtnText}>
                          {connectionStatus === 'accepted' ? 'FRIENDS' : (connectionStatus === 'pending' ? 'PENDING' : 'CONNECT')}
                        </Text>
                    </TouchableOpacity>
                  </>
                )}
            </View>

            <View style={[styles.statsBar, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]}>
               <TouchableOpacity
                 style={styles.statItem}
                 onLongPress={() => {
                   if (currentUserId === id) fetchSubscribersList();
                   else Alert.alert("Privacy", "Only the broadcaster can view the full subscriber list.");
                 }}
                 delayLongPress={500}
               >
                 <Text style={[styles.statVal, isLight && { color: '#000' }]}>{subsCount}</Text><Text style={[styles.statLab, isLight && { color: '#999' }]}>Subscribers</Text>
               </TouchableOpacity>
               <View style={[styles.statDivider, isLight && { backgroundColor: '#EEE' }]} />
               <TouchableOpacity
                 style={styles.statItem}
                 onLongPress={() => {
                   if (currentUserId === id || profile?.friends_visible) fetchFriendsList();
                   else Alert.alert("Privacy", "This broadcaster has restricted access to their friends list.");
                 }}
                 delayLongPress={500}
               >
                    <Text style={[styles.statVal, isLight && { color: '#000' }]}>{counts.friends}</Text>
                    <Text style={[styles.statLab, isLight && { color: '#999' }]}>Friends</Text>
               </TouchableOpacity>
                 <View style={[styles.statDivider, isLight && { backgroundColor: '#EEE' }]} />
                 <View style={styles.statItem}>
                    <Text style={[styles.statVal, isLight && { color: '#000' }]}>{counts.totalViews}</Text>
                    <Text style={[styles.statLab, isLight && { color: '#999' }]}>Total Views</Text>
                 </View>
            </View>

            <View style={styles.bioBox}>
               <Text style={[styles.bioText, isLight && { color: '#666' }]}>{profile?.bio || "Digital Creator on VOEXI Platform."}</Text>
            </View>

            {/* FRIENDS LIST FOR OTHERS (Human Psychology: Shows social proof) */}
            {currentUserId !== id && (
              <View style={[styles.friendsGlimpse, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
                <Text style={[styles.friendsGlimpseTitle, isLight && { color: '#999' }]}>{t('profile.connections')}</Text>
                <TouchableOpacity style={styles.friendsAvatarsRow} onPress={fetchFriendsList}>
                  <View style={{flexDirection: 'row'}}>
                    {subscribersList.slice(0, 5).map((f, i) => (
                      <Image key={i} source={{ uri: f.avatar_url }} style={[styles.glimpseAv, { marginLeft: i === 0 ? 0 : -15 }]} />
                    ))}
                    {counts.friends > 5 && (
                      <View style={[styles.glimpseAv, styles.moreAv, { marginLeft: -15 }, isLight && { backgroundColor: '#EEE' }]}><Text style={[styles.moreAvText, isLight && { color: '#666' }]}>+{counts.friends - 5}</Text></View>
                    )}
                  </View>
                  <Text style={styles.viewAllConnections}>{t('profile.view_all')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* PRIVACY LOCK UI */}
            {profile?.privacy_mode === 'private' && connectionStatus !== 'accepted' && currentUserId !== id ? (
              <View style={[styles.privacyLockBox, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
                 <LinearGradient colors={isLight ? ['#F9F9F9', '#FFF'] : ['#0A0A0A', '#000']} style={StyleSheet.absoluteFill} />
                 <Ionicons name="lock-closed" size={45} color={VOEXITheme.colors.primary} />
                 <Text style={[styles.lockTitle, isLight && { color: '#000' }]}>{t('profile.private_frequency')}</Text>
                 <Text style={[styles.lockDesc, isLight && { color: '#888' }]}>{t('profile.private_desc')}</Text>
                 <TouchableOpacity style={styles.requestAccessBtn} onPress={handleConnect}>
                    <Text style={styles.requestText}>{t('profile.request_access')}</Text>
                 </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* HIGHLIGHTS BAR */}
                <View style={styles.highlightsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 15 }}>
                      {highlights.map(h => (
                        <TouchableOpacity
                          key={h.id}
                          style={styles.addHighlightBtn}
                          onPress={() => router.push({ pathname: '/story/[id]', params: { id: profile.id, highlightId: h.id } })}
                        >
                          <View style={[styles.highlightCircle, isLight && { borderColor: '#EEE' }]}>
                              <Image source={{ uri: h.cover_url || 'https://via.placeholder.com/100' }} style={styles.highlightImg} />
                          </View>
                          <Text style={[styles.highlightName, isLight && { color: '#999' }]} numberOfLines={1}>{h.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                </View>

                <View style={styles.productionsHeader}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <View>
                      <Text style={[styles.productionsTitle, isLight && { color: '#000' }]}>STATION CONTENT</Text>
                      <View style={styles.titleLine} />
                    </View>
                    <View style={[styles.sortContainer, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]}>
                      <TouchableOpacity
                        style={[styles.sortBtn, sortBy === 'newest' && styles.activeSortBtn]}
                        onPress={() => setSortBy('newest')}
                      >
                        <Ionicons name="time" size={12} color={sortBy === 'newest' ? '#fff' : '#555'} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.sortBtn, sortBy === 'popular' && styles.activeSortBtn]}
                        onPress={() => setSortBy('popular')}
                      >
                        <Ionicons name="flame" size={12} color={sortBy === 'popular' ? '#fff' : '#555'} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.sortBtn, sortBy === 'oldest' && styles.activeSortBtn]}
                        onPress={() => setSortBy('oldest')}
                      >
                        <Ionicons name="calendar" size={12} color={sortBy === 'oldest' ? '#fff' : '#555'} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={[styles.tabBar, isLight && { borderBottomColor: '#EEE' }]}>
                  <TouchableOpacity style={[styles.tabItem, activeTab === 'all' && styles.activeTab]} onPress={() => setActiveTab('all')}>
                      <Ionicons name="grid-outline" size={20} color={activeTab === 'all' ? VOEXITheme.colors.primary : '#444'} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.tabItem, activeTab === 'video' && styles.activeTab]} onPress={() => setActiveTab('video')}>
                      <Ionicons name="videocam-outline" size={20} color={activeTab === 'video' ? VOEXITheme.colors.primary : '#444'} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.tabItem, activeTab === 'reels' && styles.activeTab]} onPress={() => setActiveTab('reels')}>
                      <MaterialCommunityIcons name="play-box-multiple-outline" size={20} color={activeTab === 'reels' ? VOEXITheme.colors.primary : '#444'} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.tabItem, activeTab === 'photo' && styles.activeTab]} onPress={() => setActiveTab('photo')}>
                      <Ionicons name="image-outline" size={20} color={activeTab === 'photo' ? VOEXITheme.colors.primary : '#444'} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.tabItem, activeTab === 'live' && styles.activeTab]} onPress={() => setActiveTab('live')}>
                      <Ionicons name="radio-outline" size={20} color={activeTab === 'live' ? VOEXITheme.colors.primary : '#444'} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const pt = (item.post_type || '').toLowerCase();
          const isReel = (pt === 'reels' || pt === 'reel' || item.is_reel === true) && pt !== 'video' && pt !== 'photo';
          const isLongFormOrPhoto = !isReel && (pt === 'video' || pt === 'photo' || item.media_type === 'image');
          return (
            <TouchableOpacity
              style={[styles.postCard, isLight && { backgroundColor: '#F5F5F5' }]}
              onPress={() => {
                if (isLongFormOrPhoto) {
                  router.push(`/video/${item.id}`);
                } else {
                  router.push({ pathname: '/(tabs)/video-feed', params: { id: item.id } });
                }
              }}
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                setPreviewPost({ ...item, profiles: item.profiles || profile });
                setShowPreviewModal(true);
              }}
              delayLongPress={180}
            >
              <Image source={{ uri: item.thumbnail_url || item.video_url }} style={styles.postThumb} />
              <TouchableOpacity
                style={styles.menuIconBox}
                onPress={() => { setSelectedPost(item); setPostMenuVisible(true); }}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <View style={styles.menuIconInner}>
                  <Ionicons name="ellipsis-vertical" size={16} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={styles.playOverlay}>
                 <Ionicons name="play" size={12} color="#fff" />
                 <Text style={styles.viewCountText}>{item.views_count || 0}</Text>
              </View>
              {item.post_type === 'Video' && (
                <View style={styles.landscapeBadge}>
                   <Ionicons name="desktop-outline" size={10} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="videocam-outline" size={40} color={isLight ? "#DDD" : "#222"} />
            <Text style={[styles.emptyText, isLight && { color: '#AAA' }]}>No productions yet</Text>
          </View>
        }
      />

      <Modal visible={postMenuVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setPostMenuVisible(false)}>
          <View style={styles.optionsSheet}>
            <View style={styles.dragBar} />
            <Text style={styles.sheetTitle}>SIGNAL OPTIONS</Text>

            <TouchableOpacity style={styles.sheetItem} onPress={() => handlePostShare(selectedPost)}>
              <Ionicons name="share-social-outline" size={20} color="#fff" />
              <Text style={styles.sheetText}>Share Signal</Text>
            </TouchableOpacity>

            {currentUserId === id && (
              <TouchableOpacity style={styles.sheetItem} onPress={() => { setPostMenuVisible(false); router.push({ pathname: '/menu/video-analytics', params: { id: selectedPost?.id } }); }}>
                <Ionicons name="stats-chart" size={20} color="#fff" />
                <Text style={styles.sheetText}>View Analytics</Text>
              </TouchableOpacity>
            )}

            {currentUserId !== id && (
              <TouchableOpacity style={styles.sheetItem} onPress={() => {
                const target = {
                  id: selectedPost.id,
                  userId: selectedPost.user_id,
                  type: (selectedPost.post_type === 'Photo' || selectedPost.media_type === 'image') ? 'image' : 'video'
                };
                setPostMenuVisible(false);
                setTimeout(() => {
                   setAuditTarget(target);
                   setAuditModalVisible(true);
                }, 400);
              }}>
                <Ionicons name="shield-outline" size={20} color="#ff4444" />
                <Text style={[styles.sheetText, {color: '#ff4444'}]}>Initiate Audit (Report)</Text>
              </TouchableOpacity>
            )}

            {currentUserId === id && (
              <>
                <View style={styles.sheetDivider} />
                <TouchableOpacity style={styles.sheetItem} onPress={handleDeletePost}>
                  <Ionicons name="trash-outline" size={20} color="#ff4444" />
                  <Text style={[styles.sheetText, {color: '#ff4444'}]}>Remove from Spectrum</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={() => setPostMenuVisible(false)} style={styles.closeBtn}><Text style={styles.closeText}>CANCEL</Text></TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* SUBSCRIBERS LIST MODAL */}
      <Modal
        visible={subscribersModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSubscribersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.subsModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{listModalTitle}</Text>
              <TouchableOpacity onPress={() => setSubscribersModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {subsLoading ? (
              <ActivityIndicator color={VOEXITheme.colors.primary} style={{marginTop: 30}} />
            ) : (
              <FlatList
                data={subscribersList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.subscriberRow}
                    onPress={() => {
                      setSubscribersModalVisible(false);
                      router.push(`/user/${item.id}`);
                    }}
                  >
                    <Image
                      source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }}
                      style={styles.subAvatar}
                    />
                    <View>
                      <Text style={styles.subName}>{item.channel_name || item.username}</Text>
                      <Text style={styles.subHandle}>@{item.username}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptySubsText}>No subscribers yet.</Text>
                }
                contentContainerStyle={{paddingBottom: 20}}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* NEURAL AUDIT MODAL */}
      {auditTarget && (
        <NeuralAuditModal
          visible={auditModalVisible}
          onClose={() => { setAuditModalVisible(false); setAuditTarget(null); }}
          targetId={auditTarget.id}
          targetUserId={auditTarget.userId}
          signalType={auditTarget.type}
          currentUserId={currentUserId || ''}
        />
      )}

      {/* GLOBAL BOTTOM NAVIGATION BAR */}
      <GlobalBottomBar activeTab="profile" />

      <InstagramPeekPreviewModal
        visible={showPreviewModal}
        item={previewPost}
        onClose={() => setShowPreviewModal(false)}
        onOpenFull={(p: any) => {
          const pt = (p.post_type || '').toLowerCase();
          const isReel = (pt === 'reels' || pt === 'reel' || p.is_reel === true) && pt !== 'video' && pt !== 'photo';
          if (isReel) {
            router.push({ pathname: '/(tabs)/video-feed', params: { id: p.id } });
          } else {
            router.push(`/video/${p.id}`);
          }
        }}
        onLike={(p: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          Alert.alert("LIKED", "Signal liked!");
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  verifiedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00ff00', marginLeft: 6, shadowColor: '#00ff00', shadowOffset: {width: 0, height: 0}, shadowOpacity: 1, shadowRadius: 5, elevation: 5 },
  neuralInfoBar: { flexDirection: 'row', gap: 10, marginTop: 15 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  infoPillText: { color: '#999', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  statusDot: { width: 4, height: 4, borderRadius: 2 },
  xpTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: '#FFD700', shadowColor: '#FFD700', shadowRadius: 5, shadowOpacity: 0.8, elevation: 3 },
  scrollContent: { paddingBottom: 20 },
  headerComponent: { paddingHorizontal: 20 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  followBtn: { flex: 1, height: 45, backgroundColor: VOEXITheme.colors.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  analyticsBtn: { flex: 1, height: 45, backgroundColor: '#1A1A1A', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333', gap: 10 },
  followingBtn: { backgroundColor: '#111', borderWidth: 1, borderColor: '#222' },
  followBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },
  connectBtn: { flex: 1, height: 45, backgroundColor: '#111', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#222', gap: 10 },
  friendsBtn: { backgroundColor: VOEXITheme.colors.secondary + '22', borderColor: VOEXITheme.colors.secondary },
  connectBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  statsBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25, backgroundColor: '#080808', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#111' },
  statItem: { alignItems: 'center', flex: 1 },
  statVal: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  statLab: { color: '#555', fontSize: 10, marginTop: 3, fontWeight: 'bold' },
  statDivider: { width: 1, height: 20, backgroundColor: '#222' },
  bioBox: { marginTop: 15 },
  bioText: { color: '#888', fontSize: 13, lineHeight: 18 },
  highlightsContainer: { marginTop: 20, marginBottom: 10 },
  addHighlightBtn: { alignItems: 'center', width: 65 },
  highlightCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, borderColor: '#222', padding: 2 },
  highlightImg: { width: '100%', height: '100%', borderRadius: 26 },
  highlightName: { color: '#666', fontSize: 10, marginTop: 5, fontWeight: 'bold', textAlign: 'center' },
  productionsHeader: { marginTop: 30, marginBottom: 15 },
  productionsTitle: { color: '#fff', fontSize: 12, fontWeight: 'bold', letterSpacing: 1.5 },
  titleLine: { width: 25, height: 2, backgroundColor: VOEXITheme.colors.primary, marginTop: 5 },
  columnWrapper: { justifyContent: 'space-between' },
  postCard: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.5, backgroundColor: '#080808', borderRadius: 12, overflow: 'hidden', marginBottom: 15 },
  postThumb: { width: '100%', height: '100%' },
  playOverlay: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  landscapeBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 6 },
  viewCountText: { color: '#fff', fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
  emptyBox: { paddingVertical: 50, alignItems: 'center' },
  emptyText: { color: '#222', fontSize: 14, fontWeight: 'bold', marginTop: 10 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  subsModalContent: { backgroundColor: '#0A0A0A', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '70%', padding: 20, borderTopWidth: 1, borderTopColor: '#222' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#111' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1.5 },
  subscriberRow: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#111' },
  subAvatar: { width: 45, height: 45, borderRadius: 22.5, borderWidth: 1, borderColor: '#222' },
  subName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  subHandle: { color: '#555', fontSize: 11 },
  emptySubsText: { color: '#444', textAlign: 'center', marginTop: 50, fontWeight: 'bold' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#111', marginTop: 10 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: VOEXITheme.colors.primary },
  sortContainer: { flexDirection: 'row', gap: 8, backgroundColor: '#0A0A0A', padding: 4, borderRadius: 8, borderWidth: 1, borderColor: '#111' },
  sortBtn: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderRadius: 4 },
  activeSortBtn: { backgroundColor: VOEXITheme.colors.primary },
  menuIconBox: { position: 'absolute', top: 0, right: 0, width: 44, height: 44, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  menuIconInner: { backgroundColor: 'rgba(0,0,0,0.5)', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  optionsSheet: { backgroundColor: '#0A0A0F', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, paddingBottom: 40, borderTopWidth: 1, borderColor: '#1A1A24', shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 20 },
  sheetTitle: { color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginBottom: 25 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 15 },
  sheetText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sheetDivider: { height: 1, backgroundColor: '#1A1A24', marginVertical: 10 },
  dragBar: { width: 40, height: 4, backgroundColor: '#222', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  closeBtn: { padding: 15, alignItems: 'center' },
  closeText: { fontWeight: 'bold', color: '#888' },
  privacyLockBox: { padding: 40, alignItems: 'center', backgroundColor: '#050505', borderRadius: 25, marginTop: 30, borderWidth: 1, borderColor: '#111', overflow: 'hidden' },
  lockTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2, marginTop: 15 },
  lockDesc: { color: '#444', fontSize: 11, textAlign: 'center', marginTop: 10, lineHeight: 18, fontWeight: 'bold' },
  requestAccessBtn: { marginTop: 25, backgroundColor: VOEXITheme.colors.primary, paddingHorizontal: 25, paddingVertical: 12, borderRadius: 15 },
  requestText: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 1 },

  // Abandoned Status
  abandonedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 215, 0, 0.1)', padding: 10, borderRadius: 10, marginTop: 15, gap: 8, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.2)' },
  abandonedText: { color: '#FFD700', fontSize: 8, fontWeight: '900', letterSpacing: 1 },

  // Friends Glimpse
  friendsGlimpse: { marginTop: 20, padding: 15, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20 },
  friendsGlimpseTitle: { color: '#444', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  friendsAvatarsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  glimpseAv: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: '#000' },
  moreAv: { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  moreAvText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  viewAllConnections: { color: VOEXITheme.colors.primary, fontSize: 10, fontWeight: 'bold' },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewCard: {
    width: width - 40,
    backgroundColor: '#0F0F16',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    elevation: 20,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
    backgroundColor: '#14141F',
  },
  previewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: VOEXITheme.colors.primary,
  },
  previewName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  previewHandle: {
    color: '#888',
    fontSize: 11,
  },
  previewCloseBtn: {
    width: 30,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewMediaBox: {
    width: '100%',
    backgroundColor: '#000',
  },
  previewMetaBox: {
    padding: 14,
    backgroundColor: '#14141F',
  },
  previewTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  previewStats: {
    color: '#888',
    fontSize: 11,
    fontWeight: '500',
  },
  previewActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#222',
    backgroundColor: '#0F0F16',
  },
  previewActionBtn: {
    alignItems: 'center',
    gap: 2,
  },
  previewActionLabel: {
    color: '#ccc',
    fontSize: 10,
    fontWeight: '600',
  },
});
