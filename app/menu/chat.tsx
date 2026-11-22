import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, Image, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';

const { width } = Dimensions.get('window');
const THEME = { bg: '#000', card: '#0a0a0f', accent: '#7C5CFF', text: '#fff', textDim: '#64748b', border: '#111' };

export default function DirectChatScreen() {
  const router = useRouter();
  const { theme: themeMode, isLight } = useTheme();
  const [friends, setFriends] = useState<any[]>([]);
  const [joinedClusters, setJoinedClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'clusters'>('all');

  const fetchFriendsAndMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (user) {
      checkPendingRequests(user.id);

      // 1. FETCH JOINED CLUSTERS / GROUPS FOR "YOUR ACTIVE LINKS"
      try {
        const { data: memberships } = await supabase
          .from('group_members')
          .select('group_id, role')
          .eq('user_id', user.id);

        if (memberships && memberships.length > 0) {
          const groupIds = memberships.map(m => m.group_id);
          const { data: groupsList } = await supabase.from('groups').select('*').in('id', groupIds);
          if (groupsList) {
            const clusterChats = await Promise.all(groupsList.map(async (group) => {
              const { data: lastMsg } = await supabase
                .from('messages')
                .select('content, created_at, type, sender_id, is_read')
                .eq('group_id', group.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('group_id', group.id)
                .neq('sender_id', user.id)
                .eq('is_read', false);

              return { ...group, lastMessage: lastMsg, unreadCount: count || 0, isGroup: true };
            }));
            setJoinedClusters(clusterChats.sort((a, b) => new Date(b.lastMessage?.created_at || 0).getTime() - new Date(a.lastMessage?.created_at || 0).getTime()));
          }
        }
      } catch (e) {
        console.error("Cluster Fetch Error:", e);
      }

      // 2. FETCH DIRECT 1-ON-1 FRIENDS & CHATS
      try {
        const { data: friendsData, error } = await supabase
          .from('friends')
          .select(`
            sender_id, receiver_id,
            sender:profiles!sender_id(id, username, avatar_url, channel_name),
            receiver:profiles!receiver_id(id, username, avatar_url, channel_name)
          `)
          .eq('status', 'accepted')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

        if (friendsData) {
          const list = await Promise.all(friendsData.map(async (f) => {
            const friendObj = f.sender_id === user.id ? f.receiver : f.sender;
            if (!friendObj) return null;

            const { data: lastMsg } = await supabase
              .from('messages')
              .select('content, created_at, type, sender_id, is_read')
              .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendObj.id}),and(sender_id.eq.${friendObj.id},receiver_id.eq.${user.id})`)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('sender_id', friendObj.id)
              .eq('receiver_id', user.id)
              .eq('is_read', false);

            return {
              ...friendObj,
              lastMessage: lastMsg,
              unreadCount: count || 0,
              isGroup: false
            };
          }));

          const validList = list.filter(Boolean);
          validList.sort((a, b) => new Date(b.lastMessage?.created_at || 0).getTime() - new Date(a.lastMessage?.created_at || 0).getTime());
          setFriends(validList);
        }
      } catch (e) {
        console.error("Friends Fetch Error:", e);
      }
    }
    setLoading(false);
  };

  const checkPendingRequests = async (userId: string) => {
    const { count } = await supabase
      .from('friends')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('status', 'pending');
    setHasPendingRequest(!!count && count > 0);
  };

  useFocusEffect(
    useCallback(() => {
      fetchFriendsAndMessages();
    }, [])
  );

  // Combine and Filter List
  const combinedList = [...joinedClusters, ...friends].filter(item => {
    const name = item.name || item.username || item.channel_name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredDisplayList = combinedList.filter(item => {
    if (activeTab === 'direct') return !item.isGroup;
    if (activeTab === 'clusters') return item.isGroup;
    return true;
  });

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={isLight ? '#000' : '#fff'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>DIRECT MESSAGES</Text>

        <TouchableOpacity onPress={() => router.push('/menu/people')} style={[styles.addBtn, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]}>
          <Ionicons name="person-add-outline" size={20} color={isLight ? '#000' : '#fff'} />
          {hasPendingRequest && <View style={styles.dot} />}
        </TouchableOpacity>
      </View>

      {/* SEARCH BOX */}
      <View style={[styles.searchBox, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]}>
        <Ionicons name="search" size={18} color={isLight ? '#888' : THEME.textDim} />
        <TextInput
          style={[styles.searchInput, isLight && { color: '#000' }]}
          placeholder="Search transmissions & clusters..."
          placeholderTextColor={isLight ? '#888' : THEME.textDim}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* YOUR ACTIVE LINKS (JOINED CLUSTERS HORIZONTAL SCROLL) */}
      <View style={styles.activeLinksSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isLight && { color: '#888' }]}>YOUR ACTIVE LINKS</Text>
          <TouchableOpacity onPress={() => router.push('/menu/clusters')}>
            <Text style={styles.viewAllText}>DISCOVER ({joinedClusters.length})</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeLinksScroll}>
          {/* CREATE CLUSTER PILL */}
          <TouchableOpacity style={styles.createClusterPill} onPress={() => router.push('/menu/clusters?create=true')}>
            <View style={styles.createClusterIcon}>
              <Ionicons name="add" size={24} color="#fff" />
            </View>
            <Text style={styles.clusterPillName}>Establish</Text>
          </TouchableOpacity>

          {joinedClusters.map((cluster) => {
            const time = cluster.lastMessage ? new Date(cluster.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            return (
              <TouchableOpacity
                key={cluster.id}
                style={styles.clusterPill}
                onPress={() => router.push(`/menu/chat/${cluster.id}?type=group`)}
              >
                <View style={styles.clusterPillAvatarWrapper}>
                  <Image source={{ uri: cluster.avatar_url }} style={styles.clusterPillAvatar} />
                  {cluster.unreadCount > 0 && (
                    <View style={styles.clusterPillUnread}>
                      <Text style={styles.clusterPillUnreadText}>{cluster.unreadCount > 99 ? '99+' : cluster.unreadCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.clusterPillName, isLight && { color: '#000' }]} numberOfLines={1}>
                  {cluster.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* TABS SELECTOR (ALL / DIRECT / CLUSTERS) */}
      <View style={styles.tabsRow}>
        {[
          { id: 'all', label: 'ALL SIGNALS' },
          { id: 'direct', label: 'DIRECT (1-ON-1)' },
          { id: 'clusters', label: 'CLUSTERS' },
        ].map(t => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setActiveTab(t.id as any)}
            style={[
              styles.tabBtn,
              activeTab === t.id && { backgroundColor: THEME.accent, borderColor: THEME.accent },
              isLight && activeTab !== t.id && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }
            ]}
          >
            <Text style={[styles.tabText, activeTab === t.id && { color: '#fff' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CHAT LIST */}
      {loading ? (
        <ActivityIndicator color={THEME.accent} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredDisplayList}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          renderItem={({ item }) => {
            const isGroup = item.isGroup;
            const title = item.name || item.channel_name || item.username || 'VOEXI User';
            const avatarUri = item.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=7C5CFF&color=fff&bold=true`;
            const lastMsgText = item.lastMessage ? (item.lastMessage.type === 'image' ? '📸 Attachment' : item.lastMessage.type === 'voice' ? '🎙️ Voice Signal' : item.lastMessage.content) : 'No transmissions yet';
            const time = item.lastMessage ? new Date(item.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            return (
              <TouchableOpacity
                style={[styles.chatCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}
                onPress={() => router.push(isGroup ? `/menu/chat/${item.id}?type=group` : `/menu/chat/${item.id}`)}
              >
                <View style={styles.avatarWrapper}>
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                  {isGroup && (
                    <View style={styles.clusterTypeBadge}>
                      <Ionicons name="people" size={10} color="#fff" />
                    </View>
                  )}
                  {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unreadCount}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.chatInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.chatName, isLight && { color: '#000' }]} numberOfLines={1}>{title}</Text>
                    <Text style={styles.timeText}>{time}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {isGroup && (
                      <View style={styles.clusterLabel}>
                        <Text style={styles.clusterLabelText}>CLUSTER</Text>
                      </View>
                    )}
                    <Text style={[styles.lastMsg, item.unreadCount > 0 && { color: THEME.accent, fontWeight: 'bold' }]} numberOfLines={1}>
                      {lastMsgText}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="chat-remove-outline" size={50} color={isLight ? '#CCC' : '#333'} />
              <Text style={[styles.empty, isLight && { color: '#888' }]}>No active transmissions found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center', position: 'relative', borderWidth: 1, borderColor: '#1A1A1F' },
  dot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#000' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0A0F', marginHorizontal: 20, paddingHorizontal: 15, height: 48, borderRadius: 15, borderWidth: 1, borderColor: '#1A1A1F', marginBottom: 15 },
  searchInput: { flex: 1, color: '#fff', marginLeft: 10, fontSize: 14 },
  activeLinksSection: { marginBottom: 15 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  sectionTitle: { color: THEME.textDim, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  viewAllText: { color: THEME.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  activeLinksScroll: { paddingHorizontal: 20, gap: 14 },
  createClusterPill: { alignItems: 'center', width: 60 },
  createClusterIcon: { width: 55, height: 55, borderRadius: 20, backgroundColor: THEME.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  clusterPill: { alignItems: 'center', width: 60 },
  clusterPillAvatarWrapper: { position: 'relative', marginBottom: 6 },
  clusterPillAvatar: { width: 55, height: 55, borderRadius: 20, backgroundColor: '#111', borderWidth: 1.5, borderColor: THEME.accent },
  clusterPillUnread: { position: 'absolute', top: -3, right: -3, backgroundColor: THEME.accent, minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  clusterPillUnreadText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  clusterPillName: { color: '#aaa', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 15 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0A0A0F', borderWidth: 1, borderColor: '#1A1A1F', alignItems: 'center' },
  tabText: { color: '#666', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  chatCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 18, backgroundColor: '#050508', borderWidth: 1, borderColor: '#111' },
  avatarWrapper: { position: 'relative', marginRight: 14 },
  avatar: { width: 52, height: 52, borderRadius: 20, backgroundColor: '#0A0A0F', borderWidth: 1, borderColor: '#1A1A1F' },
  clusterTypeBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: THEME.accent, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  unreadBadge: { position: 'absolute', top: -3, right: -3, backgroundColor: THEME.accent, minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  unreadText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  chatInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  clusterLabel: { backgroundColor: 'rgba(124, 92, 255, 0.18)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(124, 92, 255, 0.3)' },
  clusterLabelText: { color: THEME.accent, fontSize: 7, fontWeight: '900' },
  lastMsg: { color: THEME.textDim, fontSize: 12, flex: 1 },
  timeText: { color: '#444', fontSize: 10, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  empty: { color: THEME.textDim, fontSize: 13, marginTop: 10, fontWeight: '600' }
});
