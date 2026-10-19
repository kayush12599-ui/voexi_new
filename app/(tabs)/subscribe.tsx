import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../hooks/useLanguage';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { VoexiIcon } from '../../components/VoexiIcon';

interface Channel {
  id: string;
  channel_name: string;
  username: string;
  avatar_url: string | null;
  category: string | null;
}

export default function SubscribeScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowingOnly, setIsFollowingOnly] = useState(true);

  useEffect(() => {
    fetchSubscriptions();

    // Instagram-like sync: Remove from list if unfollowed elsewhere
    const unsubscribe = subscribeToFollows((data) => {
      if (!data.isFollowing) {
        setChannels(prev => prev.filter(c => c.id !== data.creatorId));
      }
    });

    return () => unsubscribe();
  }, []);

  async function fetchSubscriptions() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Fetch creator_id from followers table
      const { data: followData, error: followError } = await supabase
        .from('followers')
        .select('creator_id')
        .eq('follower_id', user.id);

      if (followError) {
        console.error('Error fetching follows:', followError.message);
        fetchRealUsers();
        return;
      }

      if (followData && followData.length > 0) {
        const followingIds = followData.map(f => f.creator_id);

        // 2. Fetch profiles for these followingIds
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, channel_name, username, avatar_url, category')
          .in('id', followingIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError.message);
          fetchRealUsers();
        } else {
          setChannels(profilesData || []);
          setIsFollowingOnly(true);
          setLoading(false);
        }
      } else {
        // If not following anyone, show all creators as "Recommended"
        fetchRealUsers();
        setIsFollowingOnly(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  async function fetchRealUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, channel_name, username, avatar_url, category')
        .limit(20);

      if (!error && data) {
        setChannels(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const renderItem = ({ item }: { item: Channel }) => (
    <TouchableOpacity style={styles.channelItem} onPress={() => router.push(`/user/${item.id}`)}>
      <View style={styles.channelLeft}>
        <View style={styles.avatarContainer}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {(item.channel_name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.channel_name || 'Anonymous Creator'}</Text>
          <Text style={styles.subText}>
            {item.category || 'Creator'} • @{item.username || 'user'}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.notifBtn}>
        <Ionicons
          name={isFollowingOnly ? "notifications" : "person-add-outline"}
          size={22}
          color={isFollowingOnly ? VOEXITheme.colors.primary : "#444"}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <VoexiIcon size={30} />
          <Text style={styles.headerTitle}>
            {isFollowingOnly ? 'Following' : 'Recommended'}
          </Text>
        </View>
        <TouchableOpacity onPress={fetchSubscriptions}>
          <Ionicons name="refresh" size={20} color={VOEXITheme.colors.secondary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={VOEXITheme.colors.secondary} />
        </View>
      ) : channels.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={64} color="#222" />
          <Text style={styles.emptyText}>No creators found.</Text>
        </View>
      ) : (
        <FlatList
          data={channels}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchSubscriptions}
              tintColor={VOEXITheme.colors.secondary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#111' },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  logoLetter: { color: '#fff', fontSize: 16, fontWeight: '900' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  list: { padding: 15 },
  channelItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#080808', padding: 15, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: '#111' },
  channelLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarContainer: { width: 48, height: 48, marginRight: 15 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  avatarInitial: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  info: { flex: 1 },
  name: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  subText: { color: '#666', fontSize: 11, marginTop: 2, fontWeight: 'bold' },
  notifBtn: { padding: 5 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#444', marginTop: 10, fontSize: 14 }
});
