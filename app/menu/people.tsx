import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../hooks/useTheme';
import { VOEXITheme } from '../../constants/theme';

const THEME = { bg: '#000', card: '#0a0a0f', accent: '#6366f1', text: '#fff', textDim: '#64748b', border: '#111' };

export default function PeopleHubScreen() {
  const router = useRouter();
  const { theme: themeMode, isLight } = useTheme();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [activeTab, setMode] = useState<'discover' | 'requests'>('discover');

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      fetchIncomingRequests(user.id);
      fetchSuggestedUsers(user.id);
    }
    setLoading(false);
  };

  const fetchIncomingRequests = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          id,
          status,
          sender_id,
          profiles:sender_id (
            id,
            username,
            avatar_url,
            vx_id_number
          )
        `)
        .eq('receiver_id', userId)
        .eq('status', 'pending');

      if (error) throw error;
      console.log("[VOEXI] Incoming Requests:", data?.length);
      setIncomingRequests(data || []);
    } catch (e) {
      console.error("[FETCH_REQ_ERROR]", e);
    }
  };

  const fetchSuggestedUsers = async (userId: string) => {
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id, username, vx_id_number, avatar_url')
      .neq('id', userId)
      .limit(20);

    if (allUsers) {
      // Fetch current friends to filter them out
      const { data: relations } = await supabase
        .from('friends')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

      const friendIds = relations ? relations.map(r => r.sender_id === userId ? r.receiver_id : r.sender_id) : [];
      setSuggestedUsers(allUsers.filter(u => !friendIds.includes(u.id)));
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, vx_id_number, avatar_url')
        .or(`vx_id_number.eq.${searchQuery},username.ilike.%${searchQuery}%`)
        .neq('id', currentUser?.id);

      if (error) throw error;
      setSearchResults(data || []);
      if (data?.length === 0) {
        Alert.alert("VOEXI", "No agent found with this ID or username.");
      }
    } catch (e) {
      console.error("[SEARCH_ERROR]", e);
      Alert.alert("Network Error", "Could not scan the neural network.");
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (targetUserId: string) => {
    if (!currentUser) {
      Alert.alert("Auth Error", "You must be logged in to connect.");
      return;
    }

    try {
      // 1. Fetch target user's preference and follower status
      const { data: targetProfile } = await supabase.from('profiles').select('require_sub_for_friend').eq('id', targetUserId).single();

      if (targetProfile?.require_sub_for_friend) {
         // Check if current user is following the target
         const { data: follow } = await supabase.from('followers').select('id').eq('follower_id', currentUser.id).eq('creator_id', targetUserId).maybeSingle();
         if (!follow) {
           Alert.alert("Subscription Required", "This creator only accepts friend requests from their subscribers. Please subscribe to them first!", [
             { text: "View Profile", onPress: () => router.push(`/user/${targetUserId}`) },
             { text: "Cancel", style: "cancel" }
           ]);
           return;
         }
      }

      console.log(`[VOEXI] Sending request from ${currentUser.id} to ${targetUserId}`);

      const { error } = await supabase.from('friends').insert({
        sender_id: currentUser.id,
        receiver_id: targetUserId,
        status: 'pending'
      });

      if (error) {
        if (error.code === '23505') {
          Alert.alert("Already Transmitted", "A neural link request has already been sent to this agent. Please wait for their response.");
        } else {
          console.error("[VOEXI] Request Error:", error);
          Alert.alert("System Notice", "Neural connection failed. Try again.");
        }
      } else {
        Alert.alert("Success", "Connection request transmitted across the VOEXI network!");
        setSearchResults(prev => prev.filter(u => u.id !== targetUserId));
        setSuggestedUsers(prev => prev.filter(u => u.id !== targetUserId));
      }
    } catch (e) {
      Alert.alert("Error", "Communication interrupted.");
    }
  };

  const respondRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('friends')
        .update({ status: status })
        .eq('id', requestId);

      if (error) throw error;

      Alert.alert("VOEXI", `Neural link ${status === 'accepted' ? 'established' : 'terminated'}.`);

      // Remove from local list
      setIncomingRequests(prev => prev.filter(req => req.id !== requestId));

      if (status === 'accepted') {
          router.push('/menu/chat');
      }
    } catch (e) {
      console.error("[RESPOND_ERROR]", e);
      Alert.alert("Error", "Uplink failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <View style={[styles.header, isLight && { borderBottomColor: '#EEE' }]}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color={isLight ? '#000' : "#fff"} /></TouchableOpacity>
        <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>PEOPLE HUB</Text>
        <View style={{width: 24}} />
      </View>

      <View style={styles.searchSection}>
        <View style={[styles.searchBar, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]}>
          <Ionicons name="search" size={20} color="#555" />
          <TextInput
            placeholder="Search by VX ID or Username..."
            placeholderTextColor="#555"
            style={[styles.searchInput, isLight && { color: '#000' }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
        </View>
      </View>

      <View style={[styles.tabs, isLight && { borderBottomColor: '#EEE' }]}>
        <TouchableOpacity onPress={() => setMode('discover')} style={[styles.tab, activeTab === 'discover' && styles.activeTab]}>
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>DISCOVER</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode('requests')} style={[styles.tab, activeTab === 'requests' && styles.activeTab]}>
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            REQUESTS {incomingRequests.length > 0 && `(${incomingRequests.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator style={{marginTop: 50}} color={THEME.accent} /> : (
        <ScrollView contentContainerStyle={{padding: 20}}>
          {activeTab === 'discover' ? (
            <>
              {searchResults.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, isLight && { color: '#CCC' }]}>SEARCH RESULTS</Text>
                  {searchResults.map(user => (
                    <View key={user.id} style={[styles.userCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
                      <Image source={{uri: user.avatar_url || 'https://via.placeholder.com/50'}} style={styles.avatar} />
                      <View style={{flex: 1}}>
                        <Text style={[styles.userName, isLight && { color: '#000' }]}>{user.username}</Text>
                        <Text style={styles.vxId}>VX: {user.vx_id_number}</Text>
                      </View>
                      <TouchableOpacity style={styles.addBtn} onPress={() => sendRequest(user.id)}>
                        <Ionicons name="person-add" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, isLight && { color: '#CCC' }]}>SUGGESTED FOR YOU</Text>
                {suggestedUsers.map(user => (
                  <View key={user.id} style={[styles.userCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
                    <Image source={{uri: user.avatar_url || 'https://via.placeholder.com/50'}} style={styles.avatar} />
                    <View style={{flex: 1}}>
                      <Text style={[styles.userName, isLight && { color: '#000' }]}>{user.username}</Text>
                      <Text style={styles.vxId}>VX: {user.vx_id_number}</Text>
                    </View>
                    <TouchableOpacity style={styles.addBtn} onPress={() => sendRequest(user.id)}>
                      <Text style={styles.btnText}>CONNECT</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.section}>
              {incomingRequests.length === 0 ? (
                <Text style={[styles.emptyText, isLight && { color: '#DDD' }]}>No pending chat requests.</Text>
              ) : (
                incomingRequests.map(req => {
                  const sender = Array.isArray(req.profiles) ? req.profiles[0] : req.profiles;
                  return (
                    <View key={req.id} style={[styles.reqCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
                      <Image source={{uri: sender?.avatar_url || 'https://via.placeholder.com/50'}} style={styles.avatar} />
                      <View style={{flex: 1}}>
                        <Text style={[styles.userName, isLight && { color: '#000' }]}>{sender?.username || 'Unknown Agent'}</Text>
                        <Text style={styles.vxId}>Sent a neural request</Text>
                      </View>
                      <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.acceptBtn} onPress={() => respondRequest(req.id, 'accepted')}>
                          <Ionicons name="checkmark" size={20} color="#000" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rejectBtn} onPress={() => respondRequest(req.id, 'rejected')}>
                          <Ionicons name="close" size={20} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  searchSection: { paddingHorizontal: 20, paddingBottom: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0A0F', paddingHorizontal: 15, height: 50, borderRadius: 15, borderWidth: 1, borderColor: '#1A1A1F' },
  searchInput: { flex: 1, color: '#fff', marginLeft: 12, fontSize: 15 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#0A0A0F', marginHorizontal: 20 },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: THEME.accent },
  tabText: { color: '#444', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  activeTabText: { color: THEME.accent },
  section: { marginBottom: 30 },
  sectionTitle: { color: '#333', fontSize: 10, fontWeight: '900', marginBottom: 15, letterSpacing: 1.5, textTransform: 'uppercase' },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D0D12', padding: 12, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: '#1A1A1F' },
  avatar: { width: 55, height: 55, borderRadius: 20, backgroundColor: '#000', marginRight: 15 },
  userName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  vxId: { color: THEME.textDim, fontSize: 11, fontWeight: '600', marginTop: 3 },
  addBtn: { backgroundColor: THEME.accent, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  btnText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  reqCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D0D12', padding: 15, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#1A1A1F' },
  actionRow: { flexDirection: 'row', gap: 10 },
  acceptBtn: { backgroundColor: '#10B981', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { backgroundColor: '#1A1A1F', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#333', textAlign: 'center', marginTop: 100, fontSize: 14, fontWeight: '700' },
});
