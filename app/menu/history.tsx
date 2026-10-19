import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../hooks/useTheme';

export default function WatchHistoryScreen() {
  const router = useRouter();
  const { isLight } = useTheme();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('video_analytics_logs')
        .select('*, posts(*, profiles!posts_user_id_fkey(*))')
        .eq('viewer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter unique posts to avoid duplicate history items
      const uniqueHistory: any[] = [];
      const seenIds = new Set();
      data?.forEach(item => {
        if (item.posts && !seenIds.has(item.posts.id)) {
          uniqueHistory.push(item);
          seenIds.add(item.posts.id);
        }
      });

      setHistory(uniqueHistory);
    } catch (error: any) {
      console.error('Fetch history error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    Alert.alert("ERASE LOGS", "This will permanently wipe your broadcast consumption history. Proceed?", [
      { text: "ABORT", style: "cancel" },
      { text: "PURGE", style: "destructive", onPress: async () => {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('video_analytics_logs').delete().eq('viewer_id', user?.id);
          setHistory([]);
      }}
    ]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.videoCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}
      onPress={() => router.push({
        pathname: item.posts.post_type === 'Reels' ? '/(tabs)/video-feed' : `/video/${item.posts.id}`,
        params: { id: item.posts.id }
      })}
    >
      <Image
        source={{ uri: item.posts.thumbnail_url || item.posts.media_url || 'https://via.placeholder.com/100' }}
        style={styles.thumbnail}
      />
      <View style={styles.videoInfo}>
        <Text style={[styles.videoTitle, isLight && { color: '#000' }]} numberOfLines={1}>{item.posts.title}</Text>
        <Text style={styles.videoMeta}>@{item.posts.profiles?.username || 'broadcaster'}</Text>
        <Text style={styles.timestamp}>{new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={isLight ? "#CCC" : "#222"} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <View style={[styles.header, isLight && { borderBottomColor: '#EEE' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={isLight ? "#000" : "#fff"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>WATCH HISTORY</Text>
        <TouchableOpacity onPress={clearHistory}><Ionicons name="trash-outline" size={22} color="#ff4444" /></TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={VOEXITheme.colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={80} color={isLight ? "#EEE" : "#111"} />
              <Text style={[styles.emptyTitle, isLight && { color: '#CCC' }]}>History is Empty</Text>
              <Text style={styles.emptySub}>Signals you consume will appear here.</Text>
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
  headerTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 15 },
  videoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', borderRadius: 15, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#111' },
  thumbnail: { width: 90, height: 60, borderRadius: 10, backgroundColor: '#111' },
  videoInfo: { flex: 1, marginLeft: 15 },
  videoTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  videoMeta: { color: '#555', fontSize: 11, fontWeight: '900' },
  timestamp: { color: '#222', fontSize: 9, marginTop: 4, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20 },
  emptySub: { color: '#444', fontSize: 12, textAlign: 'center', marginTop: 8 }
});
