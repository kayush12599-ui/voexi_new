import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { VOEXITheme } from '../constants/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isTestingLoop, setIsTestingLoop] = useState(false);
  const testIntervalRef = useRef<any>(null);

  const testMessages = [
    { type: 'like', user: 'cyber_fan', content: 'liked your production "Cyberpunk Reel"' },
    { type: 'comment', user: 'neon_creator', content: 'commented: "Insane quality signal!"' },
    { type: 'subscribe', user: 'subscriber_99', content: 'subscribed to your channel' },
    { type: 'collab_request', user: 'co_creator', content: 'wants to collaborate on Reel!' },
    { type: 'system', user: 'VOEXI', content: '⚡ Earned 10 VOEXI Diamonds from video view!' }
  ];

  const start4sTestLoop = () => {
    if (isTestingLoop) {
      if (testIntervalRef.current) clearInterval(testIntervalRef.current);
      setIsTestingLoop(false);
      if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      Alert.alert("TEST STOPPED 🔴", "4-Second Notification test loop stopped.");
      return;
    }

    setIsTestingLoop(true);
    if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Alert.alert("4s TEST STARTED ⚡", "A new dummy notification will arrive every 4 seconds!");

    let msgIndex = 0;
    testIntervalRef.current = setInterval(() => {
      const item = testMessages[msgIndex % testMessages.length];
      msgIndex++;

      const newDummy = {
        id: `test_${Date.now()}`,
        type: item.type,
        user: item.user,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user)}&background=A855F7&color=fff&bold=true`,
        content: item.content,
        time: 'Just now',
        timestamp: Date.now(),
        userId: 'test_user',
        status: 'pending',
        vxId: 'VX-9876'
      };

      setNotifications(prev => [newDummy, ...prev]);
      if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (testIntervalRef.current) clearInterval(testIntervalRef.current);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 0. Fetch User Preferences
      const { data: pref } = await supabase
        .from('profiles')
        .select('notifications_enabled, notif_v_likes, notif_v_comments, notif_r_likes, notif_r_comments, notif_profile')
        .eq('id', user.id)
        .single();

      if (pref && pref.notifications_enabled === false) {
        setNotifications([]);
        return;
      }

      // 1. Fetch new subscribers
      let subscribers: any[] = [];
      if (!pref || pref.notif_profile !== false) {
        const { data } = await supabase
          .from('followers')
          .select('created_at, follower_id, profiles!follower_id(username, avatar_url)')
          .eq('creator_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        subscribers = data || [];
      }

      // 2. Fetch my post IDs to filter interactions
      const { data: myPosts } = await supabase.from('posts').select('id, post_type').eq('user_id', user.id);
      const allMyPostIds = myPosts?.map(p => p.id) || [];

      // 3. Fetch recent likes
      let likes: any[] = [];
      if (allMyPostIds.length > 0) {
        const { data: likesData } = await supabase
          .from('likes')
          .select('created_at, user_id, post_id, profiles!user_id(username, avatar_url), posts!post_id(title, post_type)')
          .in('post_id', allMyPostIds)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(15);

        likes = (likesData || []).filter(l => {
          const pType = l.posts?.post_type;
          if (pType === 'Video' && pref?.notif_v_likes === false) return false;
          if ((pType === 'Reels' || pType === 'Reel') && pref?.notif_r_likes === false) return false;
          return true;
        });
      }

      // 4. Fetch recent comments
      let comments: any[] = [];
      if (allMyPostIds.length > 0) {
        const { data: commentsData } = await supabase
          .from('comments')
          .select('created_at, user_id, post_id, profiles!user_id(username, avatar_url), posts!post_id(title, post_type)')
          .in('post_id', allMyPostIds)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(15);

        comments = (commentsData || []).filter(c => {
          const pType = c.posts?.post_type;
          if (pType === 'Video' && pref?.notif_v_comments === false) return false;
          if ((pType === 'Reels' || pType === 'Reel') && pref?.notif_r_comments === false) return false;
          return true;
        });
      }

      // 5. Fetch friend requests
      const { data: friendReqs } = await supabase
        .from('friends')
        .select('created_at, sender_id, profiles!sender_id(username, avatar_url)')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // 6. Fetch Custom System & Collaboration Notifications
      const { data: systemNotifs } = await supabase
        .from('notifications')
        .select('*, profiles!sender_id(username, avatar_url, channel_name, vx_id_number)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Combine and format
      const combined = [
        ...(systemNotifs?.map(sn => {
          const senderProf = Array.isArray(sn.profiles) ? sn.profiles[0] : sn.profiles;
          const senderName = senderProf?.username || senderProf?.channel_name || 'VOEXI SYSTEM';
          const senderAvatar = senderProf?.avatar_url || 'https://via.placeholder.com/100';

          return {
            id: sn.id,
            type: sn.type || 'system',
            user: senderName,
            avatar: senderAvatar,
            content: sn.message || sn.title,
            time: new Date(sn.created_at).toLocaleDateString(),
            timestamp: new Date(sn.created_at).getTime(),
            userId: sn.sender_id || 'system',
            postId: sn.post_id,
            status: sn.status || 'pending',
            vxId: senderProf?.vx_id_number || 'VX'
          };
        }) || []),
        ...(subscribers?.map(s => ({
          id: `sub_${s.follower_id}`,
          type: 'subscribe',
          user: (Array.isArray(s.profiles) ? s.profiles[0] : s.profiles)?.username || 'User',
          avatar: (Array.isArray(s.profiles) ? s.profiles[0] : s.profiles)?.avatar_url,
          content: 'subscribed to your channel',
          time: new Date(s.created_at).toLocaleDateString(),
          timestamp: new Date(s.created_at).getTime(),
          userId: s.follower_id
        })) || []),
        ...(likes.map(l => ({
          id: `like_${l.user_id}_${l.post_id}`,
          type: 'like',
          user: (Array.isArray(l.profiles) ? l.profiles[0] : l.profiles)?.username || 'User',
          avatar: (Array.isArray(l.profiles) ? l.profiles[0] : l.profiles)?.avatar_url,
          content: `liked your production "${(Array.isArray(l.posts) ? l.posts[0] : l.posts)?.title}"`,
          time: new Date(l.created_at).toLocaleDateString(),
          timestamp: new Date(l.created_at).getTime(),
          userId: l.user_id
        }))),
        ...(comments.map(c => ({
          id: `comment_${c.user_id}_${c.post_id}`,
          type: 'comment',
          user: (Array.isArray(c.profiles) ? c.profiles[0] : c.profiles)?.username || 'User',
          avatar: (Array.isArray(c.profiles) ? c.profiles[0] : c.profiles)?.avatar_url,
          content: `commented on "${(Array.isArray(c.posts) ? c.posts[0] : c.posts)?.title}"`,
          time: new Date(c.created_at).toLocaleDateString(),
          timestamp: new Date(c.created_at).getTime(),
          userId: c.user_id
        }))),
        ...(friendReqs?.map(fr => ({
          id: `friend_${fr.sender_id}`,
          type: 'friend',
          user: (Array.isArray(fr.profiles) ? fr.profiles[0] : fr.profiles)?.username || 'User',
          avatar: (Array.isArray(fr.profiles) ? fr.profiles[0] : fr.profiles)?.avatar_url,
          content: 'sent you a connection request',
          time: new Date(fr.created_at).toLocaleDateString(),
          timestamp: new Date(fr.created_at).getTime(),
          userId: fr.sender_id
        })) || [])
      ].sort((a, b) => b.timestamp - a.timestamp);

      setNotifications(combined);

      // Mark unread as read in DB
      if (systemNotifs && systemNotifs.length > 0) {
        await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const acceptCollabRequest = async (notif: any) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (notif.postId) {
        try {
          await supabase
            .from('posts')
            .update({ collab_status: 'accepted' })
            .eq('id', notif.postId);
        } catch (e) {}
      }
      try {
        await supabase
          .from('notifications')
          .update({ status: 'accepted' })
          .eq('id', notif.id);
      } catch (e) {}

      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'accepted' } : n));
      Alert.alert("COLLABORATION ACCEPTED! 🟢", "You are now an official co-creator on this Reel transmission!");
    } catch (e) {
      Alert.alert("Notice", "Response processed.");
    }
  };

  const declineCollabRequest = async (notif: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      try {
        await supabase
          .from('notifications')
          .update({ status: 'declined' })
          .eq('id', notif.id);
      } catch (e) {}

      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'declined' } : n));
      Alert.alert("COLLABORATION DECLINED 🔴", "You declined the collaboration invite.");
    } catch (e) {}
  };

  const renderItem = ({ item }: any) => {
    if (item.type === 'collab_request' || item.type === 'collab') {
      const isAccepted = item.status === 'accepted';
      const isDeclined = item.status === 'declined';

      return (
        <View style={styles.collabNotifCard}>
          <LinearGradient colors={['#140028', '#0A0A14']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.collabHeaderRow}>
            <TouchableOpacity onPress={() => item.userId === 'system' ? null : router.push(`/user/${item.userId}`)}>
              <Image source={{ uri: item.avatar || 'https://via.placeholder.com/100' }} style={styles.collabAvatar} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={styles.collabUserText}>@{item.user}</Text>
                <View style={styles.collabBadgePill}><Text style={styles.collabBadgeTxt}>COLLAB INVITE 🤝</Text></View>
              </View>
              <Text style={styles.collabMsgText}>{item.content}</Text>
              <Text style={styles.timeText}>{item.time} • VX ID: {item.vxId}</Text>
            </View>
          </View>

          {/* ACTION BUTTONS: GREEN TICK (ACCEPT) & RED CROSS (DECLINE) */}
          {!isAccepted && !isDeclined ? (
            <View style={styles.collabBtnRow}>
              <TouchableOpacity style={styles.collabAcceptBtn} onPress={() => acceptCollabRequest(item)}>
                <Ionicons name="checkmark-circle" size={22} color="#00FF66" />
                <Text style={styles.collabAcceptTxt}>ACCEPT 🟢</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.collabDeclineBtn} onPress={() => declineCollabRequest(item)}>
                <Ionicons name="close-circle" size={22} color="#FF3B30" />
                <Text style={styles.collabDeclineTxt}>DECLINE 🔴</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.collabStatusBadge, isAccepted ? { backgroundColor: 'rgba(0,255,102,0.15)', borderColor: '#00FF66' } : { backgroundColor: 'rgba(255,59,48,0.15)', borderColor: '#FF3B30' }]}>
              <Ionicons name={isAccepted ? "checkmark-circle" : "close-circle"} size={18} color={isAccepted ? "#00FF66" : "#FF3B30"} />
              <Text style={[styles.collabStatusTxt, { color: isAccepted ? "#00FF66" : "#FF3B30" }]}>
                {isAccepted ? "COLLABORATION ACCEPTED 🟢" : "COLLABORATION DECLINED 🔴"}
              </Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.notifItem}>
        <TouchableOpacity onPress={() => item.userId === 'system' ? null : router.push(`/user/${item.userId}`)}>
          {item.type === 'system' ? (
             <LinearGradient colors={[VOEXITheme.colors.primary, '#000']} style={styles.systemIconBox}>
                <Ionicons name="notifications" size={24} color="#fff" />
             </LinearGradient>
          ) : (
             <Image source={{ uri: item.avatar || 'https://via.placeholder.com/100' }} style={styles.avatar} />
          )}
        </TouchableOpacity>
        <View style={styles.textContainer}>
          <Text style={styles.notifText}>
            <Text style={styles.boldText}>{item.userId === 'system' ? 'VOEXI' : `@${item.user}`}</Text> {item.content}
          </Text>
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
        <View style={styles.typeIcon}>
          <Ionicons
            name={
              item.type === 'like' ? 'heart' :
              item.type === 'comment' ? 'chatbubble' :
              item.type === 'friend' ? 'people' :
              item.type === 'system' ? 'flash' :
              item.type === 'subscribe' ? 'notifications' :
              'person-add'
            }
            size={14}
            color={
              item.type === 'like' ? '#ff4444' :
              item.type === 'comment' ? VOEXITheme.colors.secondary :
              item.type === 'friend' ? '#9333ea' :
              item.type === 'system' ? '#FFD700' :
              item.type === 'subscribe' ? VOEXITheme.colors.primary :
              VOEXITheme.colors.primary
            }
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
        <TouchableOpacity onPress={start4sTestLoop} style={[styles.testLoopBtn, isTestingLoop && styles.testLoopActive]}>
          <Ionicons name={isTestingLoop ? "stop-circle" : "flash"} size={14} color={isTestingLoop ? "#FF3B30" : "#00F2FE"} />
          <Text style={[styles.testLoopTxt, isTestingLoop && { color: "#FF3B30" }]}>
            {isTestingLoop ? "STOP" : "TEST 4s"}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={VOEXITheme.colors.primary} /></View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchNotifications();}} tintColor="#fff" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={60} color="#222" />
              <Text style={styles.emptyText}>No recent activity</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#111' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
  backBtn: { width: 40 },
  testLoopBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0, 242, 254, 0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#00F2FE' },
  testLoopActive: { backgroundColor: 'rgba(255, 59, 48, 0.15)', borderColor: '#FF3B30' },
  testLoopTxt: { color: '#00F2FE', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  list: { padding: 15 },
  notifItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', padding: 15, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: '#111' },
  avatar: { width: 45, height: 45, borderRadius: 22, marginRight: 15, borderWidth: 1, borderColor: '#222' },
  systemIconBox: { width: 45, height: 45, borderRadius: 15, marginRight: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  textContainer: { flex: 1 },
  notifText: { color: '#fff', fontSize: 13, lineHeight: 18 },
  boldText: { fontWeight: 'bold', color: '#fff' },
  timeText: { color: '#444', fontSize: 10, marginTop: 4 },
  typeIcon: { padding: 8, backgroundColor: '#000', borderRadius: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 150 },
  emptyText: { color: '#444', fontSize: 14, marginTop: 15, fontWeight: 'bold' },

  /* HIGH TECH COLLABORATION CARD STYLES */
  collabNotifCard: { backgroundColor: '#0A0A14', padding: 18, borderRadius: 22, marginBottom: 15, borderWidth: 1.5, borderColor: 'rgba(168, 85, 247, 0.4)', overflow: 'hidden' },
  collabHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
  collabAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: '#A855F7' },
  collabUserText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  collabBadgePill: { backgroundColor: 'rgba(168, 85, 247, 0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 0.8, borderColor: '#A855F7' },
  collabBadgeTxt: { color: '#00F2FE', fontSize: 9, fontWeight: '900' },
  collabMsgText: { color: '#ddd', fontSize: 12, marginTop: 4, lineHeight: 18 },
  collabBtnRow: { flexDirection: 'row', gap: 12, marginTop: 15 },
  collabAcceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(0, 255, 102, 0.12)', paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#00FF66' },
  collabAcceptTxt: { color: '#00FF66', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  collabDeclineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255, 59, 48, 0.12)', paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#FF3B30' },
  collabDeclineTxt: { color: '#FF3B30', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  collabStatusBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginTop: 12 },
  collabStatusTxt: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
});
