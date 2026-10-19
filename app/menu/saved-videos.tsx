import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Image, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../hooks/useTheme';

export default function SavedVideosScreen() {
  const router = useRouter();
  const { theme: themeMode, isLight } = useTheme();
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedItems = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('saved_videos')
        .select('*, posts(*, profiles:profiles!posts_user_id_fkey(*))')
        .eq('user_id', user.id);

      if (error) throw error;
      setSavedItems(data?.map(s => s.posts) || []);
    } catch (error) {
      console.error('Fetch saved items error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedItems();
  }, []);

  const removeSaved = async (id: string) => {
    Alert.alert("Remove from Collection", "Remove this video from your cloud list?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('saved_videos').delete().eq('user_id', user?.id).eq('post_id', id);
          fetchSavedItems();
      }}
    ]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.videoCard}
      onPress={() => router.push({
        pathname: '/(tabs)/video-feed',
        params: { id: item.id }
      })}
    >
      <Image
        source={{ uri: item.thumbnail_url || 'https://via.placeholder.com/100' }}
        style={styles.thumbnail}
      />
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.videoMeta}>@{item.profiles?.username || 'user'}</Text>
      </View>
      <TouchableOpacity style={styles.removeBtn} onPress={() => removeSaved(item.id)}>
        <Ionicons name="trash-outline" size={20} color="#f44" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <View style={[styles.header, isLight && { borderBottomColor: '#EEE' }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, isLight && { backgroundColor: '#F5F5F5' }]}>
          <Ionicons name="arrow-back" size={24} color={isLight ? "#000" : "#fff"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>MY COLLECTION</Text>
        <TouchableOpacity onPress={fetchSavedItems}><Ionicons name="refresh" size={20} color={isLight ? "#000" : "#fff"} /></TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={VOEXITheme.colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={savedItems}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.videoCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}
              onPress={() => router.push({
                pathname: '/(tabs)/video-feed',
                params: { id: item.id }
              })}
            >
              <Image
                source={{ uri: item.thumbnail_url || 'https://via.placeholder.com/100' }}
                style={styles.thumbnail}
              />
              <View style={styles.videoInfo}>
                <Text style={[styles.videoTitle, isLight && { color: '#000' }]} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.videoMeta}>@{item.profiles?.username || 'user'}</Text>
              </View>
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeSaved(item.id)}>
                <Ionicons name="trash-outline" size={20} color="#f44" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.iconCircle, isLight && { backgroundColor: '#F5F5F5' }]}>
                <Ionicons name="bookmark" size={50} color={VOEXITheme.colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, isLight && { color: '#000' }]}>Your collection is empty</Text>
              <Text style={styles.emptySub}>Download or save videos to see them here offline.</Text>
            </View>
          }
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#111'
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 15 },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#080808',
    borderRadius: 15,
    padding: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#111'
  },
  thumbnail: { width: 100, height: 60, borderRadius: 10, backgroundColor: '#111' },
  videoInfo: { flex: 1, marginLeft: 15 },
  videoTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  videoMeta: { color: '#666', fontSize: 12 },
  removeBtn: { padding: 10 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 100 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  emptySub: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  browseBtn: {
    marginTop: 30,
    backgroundColor: '#111',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222'
  },
  browseText: { color: VOEXITheme.colors.primary, fontWeight: 'bold' }
});
