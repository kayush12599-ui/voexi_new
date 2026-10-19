import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, Image, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView } from 'react-native';
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
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'clusters'>('all');

  const fetchFriendsAndMessages = async () => {
    setLoading(true);
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
        } else {
          setJoinedClusters([]);
        }
      } catch (err) {
        console.error("[CLUSTERS_FETCH_ERROR]", err);
      }

      // 2. FETCH DIRECT MESSAGES (FRIENDS 1-ON-1)
      try {
        const { data: relations, error: relError } = await supabase
          .from('friends')
          .select('sender_id, receiver_id')
          .eq('status', 'accepted')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

        if (relError) console.error("[CHAT_LIST] Error:", relError);

        if (relations && relations.length > 0) {
          const friendIds = relations.map(rel => rel.sender_id === user.id ? rel.receiver_id : rel.sender_id);
          const uniqueFriendIds = [...new Set(friendIds)];
          const { data: profs } = await supabase.from('profiles').select('*').in('id', uniqueFriendIds);

          if (profs) {
            const chats = await Promise.all(profs.map(async (friend) => {
              const { data: lastMsg } = await supabase
                .from('messages')
                .select('content, created_at, type, sender_id, is_read')
                .is('group_id', null)
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${user.id})`)
                .order('created_at', { ascending: false }).limit(1).maybeSingle();

              const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('sender_id', friend.id)
                .eq('receiver_id', user.id)
                .eq('is_read', false);

              return { ...friend, lastMessage: lastMsg, unreadCount: count || 0, isGroup: false };
            }));
            setFriends(chats.sort((a, b) => new Date(b.lastMessage?.created_at || 0).getTime() - new Date(a.lastMessage?.created_at || 0).getTime()));
          }
        } else {
          setFriends([]);
        }
      } catch (err) {
        console.error("[DIRECT_MESSAGES_ERROR]", err);
      }
    }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { fetchFriendsAndMessages(); }, []));

  useEffect(() => {
    if (!currentUser?.id) return;

    const channelId = `chats_list_${currentUser.id}_${Date.now()}`;
    const channel = supabase.channel(channelId);

    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, () => {
        fetchFriendsAndMessages();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friends'
      }, () => fetchFriendsAndMessages())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_members'
      }, () => fetchFriendsAndMessages())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  const checkPendingRequests = async (userId: string) => {
    const { data } = await supabase.from('friends').select('id').eq('receiver_id', userId).eq('status', 'pending').limit(1);
    setHasPendingRequest(!!(data && data.length > 0));
  };

  // Combine or filter lists
  const allConversations = [...joinedClusters, ...friends].sort((a, b) =>
    new Date(b.lastMessage?.created_at || 0).getTime() - new Date(a.lastMessage?.created_at || 0).getTime()
  );

  const displayedList = activeTab === 'clusters' ? joinedClusters
    : activeTab === 'direct' ? friends
    : allConversations;

  const filteredList = displayedList.filter(item => {
    const name = item.name || item.username || item.channel_name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name="chevron-back" size={24} color={isLight ? '#000' : "#fff"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>MESSAGES & LINKS</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => router.push('/menu/clusters?create=true')} style={[styles.addBtn, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]}>
            <Ionicons name="people" size={18} color={THEME.accent} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/menu/people')} style={[styles.addBtn, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]}>
            <Ionicons name="person-add" size={18} color={isLight ? '#000' : "#fff"} />
            {hasPendingRequest && <View style={styles.dot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* SEARCH BAR */}
      <View style={[styles.searchBox, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]}>
        <Ionicons name="search" size={18} color="#555" />
        <TextInput
          placeholder="Search chats, clusters, friends..."
          placeholderTextColor="#555"
          style={[styles.searchInput, isLight && { color: '#000' }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#555" />
          </TouchableOpacity>
        )}
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
            <Text style={[styles.tabText, activeTab === t.id && { color: '#fff', fontWeight: 'bold' }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CONVERSATIONS LIST */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={THEME.accent} size="large" />
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => (item.isGroup ? `group-${item.id}` : `user-${item.id}`)}
          renderItem={({ item }) => {
            const isGroup = !!item.isGroup;
            const title = item.name || item.channel_name || item.username || 'VOEXI Agent';
            const avatar = item.avatar_url || 'https://via.placeholder.com/100';
            const isLastMessageMine = item.lastMessage?.sender_id === currentUser?.id;
            const time = item.lastMessage ? new Date(item.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const routePath = isGroup ? `/menu/chat/${item.id}?type=group` : `/menu/chat/${item.id}`;

            return (
              <TouchableOpacity
                style={[styles.chatCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}
                onPress={() => router.push(routePath as any)}
                activeOpacity={0.7}
              >
                <View style={styles.avatarWrapper}>
                  <Image source={{ uri: avatar }} style={[styles.avatar, isGroup && { borderRadius: 18, borderWidth: 1.5, borderColor: THEME.accent }]} />
                  {isGroup && (
                    <View style={styles.clusterTypeBadge}>
                      <MaterialCommunityIcons name="molecule" size={10} color="#fff" />
                    </View>
                  )}
                  {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
                    </View>
                  )}
                </View>

                <View style={[styles.chatInfo, isLight && { borderBottomColor: '#EEE' }]}>
                  <View style={styles.nameRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Text style={[styles.chatName, isLight && { color: '#000' }, item.unreadCount > 0 && { fontWeight: '900' }]} numberOfLines={1}>
                        {title}
                      </Text>
                      {isGroup && (
                        <View style={styles.clusterLabel}>
                          <Text style={styles.clusterLabelText}>CLUSTER</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.timeText, item.unreadCount > 0 && { color: THEME.accent }]}>{time}</Text>
                  </View>

                  <View style={styles.lastMsgRow}>
                    {isLastMessageMine && (
                      <Ionicons name={item.lastMessage?.is_read ? "checkmark-done" : "checkmark"} size={14} color={item.lastMessage?.is_read ? "#00F2FE" : "#444"} style={{ marginRight: 5 }} />
                    )}
                    <Text style={[styles.lastMsg, item.unreadCount > 0 && { color: isLight ? '#000' : '#fff', fontWeight: 'bold' }]} numberOfLines={1}>
                      {item.lastMessage?.type === 'text' ? item.lastMessage?.content
                        : item.lastMessage?.type === 'poll' ? '📊 Live Poll'
                        : item.lastMessage?.type === 'ai_text' ? '🤖 VOEXI AI Reply'
                        : item.lastMessage ? `[${item.lastMessage.type.toUpperCase()}]` : 'Tap to start signal transmission...'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
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
  timeText: { color: THEME.textDim, fontSize: 10, fontWeight: '600' },
  lastMsgRow: { flexDirection: 'row', alignItems: 'center' },
  lastMsg: { color: THEME.textDim, fontSize: 12, flex: 1 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  empty: { color: THEME.textDim, textAlign: 'center', marginTop: 15, fontSize: 13, fontWeight: '600' },
});
