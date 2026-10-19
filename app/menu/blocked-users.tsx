import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

interface BlockedUser {
  id: string;
  blocked_id: string;
  profiles: {
    channel_name: string;
    avatar_url: string;
    full_name: string;
  };
}

export default function BlockedUsersScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  async function fetchBlockedUsers() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('blocked_users')
        .select(`
          id,
          blocked_id,
          profiles:blocked_id (
            channel_name,
            avatar_url,
            full_name
          )
        `)
        .eq('blocker_id', user.id);

      if (error) {
        if (error.code === 'PGRST116' || error.code === 'PGRST204' || error.code === 'PGRST205') {
          // Table missing or empty - handle gracefully for real app
          setBlockedUsers([]);
        } else {
          // Log other errors but don't crash
          setBlockedUsers([]);
        }
      } else {
        setBlockedUsers(data as any || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnblock(item: BlockedUser) {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${item.profiles?.channel_name || 'this user'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('blocked_users')
              .delete()
              .eq('id', item.id);

            if (!error) {
              setBlockedUsers(prev => prev.filter(u => u.id !== item.id));
            } else {
              Alert.alert('Error', 'Could not unblock user. Please try again.');
            }
          }
        }
      ]
    );
  }

  const renderUser = ({ item }: { item: BlockedUser }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.avatarPlaceholder}>
          {item.profiles?.avatar_url ? (
            <Image source={{ uri: item.profiles.avatar_url }} style={styles.avatar} />
          ) : (
            <Text style={styles.avatarInitial}>
              {(item.profiles?.channel_name || 'U').charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View>
          <Text style={styles.userName}>{item.profiles?.channel_name || 'Unknown User'}</Text>
          <Text style={styles.userFull}>{item.profiles?.full_name || '@user'}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.unblockBtn}
        onPress={() => handleUnblock(item)}
      >
        <Text style={styles.unblockText}>Unblock</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={VOEXITheme.colors.primary} size="large" />
        </View>
      ) : blockedUsers.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={64} color="#222" />
          <Text style={styles.emptyTitle}>No blocked users</Text>
          <Text style={styles.emptySub}>Users you block will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          renderItem={renderUser}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#111'
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  list: { padding: 20 },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#080808',
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#111'
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarPlaceholder: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  avatar: { width: '100%', height: '100%' },
  avatarInitial: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  userName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  userFull: { color: '#666', fontSize: 12 },
  unblockBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#222'
  },
  unblockText: { color: VOEXITheme.colors.primary, fontSize: 12, fontWeight: 'bold' },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 20 },
  emptySub: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 8 }
});
