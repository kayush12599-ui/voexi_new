import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LocalLibraryService, LocalMedia } from '../../lib/localLibraryService';
import { VOEXITheme } from '../../constants/theme';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useTheme } from '../../hooks/useTheme';

export default function DownloadsScreen() {
  const router = useRouter();
  const { theme: themeMode, isLight } = useTheme();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LocalMedia[]>([]);

  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    setLoading(true);
    const data = await LocalLibraryService.getLibrary();
    // Only show non-hidden items in Downloads
    setItems(data.filter(i => !i.isHidden));
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    Alert.alert("Delete Download", "Remove this file from your device?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          await LocalLibraryService.deleteFromLibrary(id);
          loadDownloads();
      }}
    ]);
  };

  const handleHide = async (id: string) => {
    await LocalLibraryService.toggleHide(id);
    loadDownloads();
    Alert.alert("Moved to Vault", "This file is now hidden in your Privacy Vault.");
  };

  const renderItem = ({ item }: { item: LocalMedia }) => (
    <View style={styles.itemCard}>
      <View style={styles.mediaPreview}>
         {item.type === 'video' ? (
           <Image source={{ uri: item.thumbnail || item.localUri }} style={styles.thumb} />
         ) : (
           <View style={[styles.thumb, {backgroundColor: '#111', justifyContent:'center', alignItems:'center'}]}>
              <Ionicons name="musical-note" size={30} color={VOEXITheme.colors.primary} />
           </View>
         )}
         <TouchableOpacity style={styles.playBtn} onPress={() => router.push({ pathname: '/menu/local-player', params: { uri: item.localUri, type: item.type } })}>
            <Ionicons name="play" size={20} color="#fff" />
         </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.meta}>{item.type.toUpperCase()} • {new Date(item.date).toLocaleDateString()}</Text>
      </View>

      <View style={styles.actions}>
         <TouchableOpacity onPress={() => handleHide(item.id)} style={styles.actionBtn}>
            <Ionicons name="eye-off-outline" size={22} color="#666" />
         </TouchableOpacity>
         <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={22} color="#ff4444" />
         </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <View style={[styles.header, isLight && { borderBottomColor: '#EEE' }]}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={isLight ? '#000' : "#fff"} /></TouchableOpacity>
        <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>LOCAL LIBRARY</Text>
        <TouchableOpacity onPress={loadDownloads}><Ionicons name="refresh" size={22} color={isLight ? '#000' : "#fff"} /></TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={VOEXITheme.colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[styles.itemCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
              <View style={styles.mediaPreview}>
                 {item.type === 'video' ? (
                   <Image source={{ uri: item.thumbnail || item.localUri }} style={styles.thumb} />
                 ) : (
                   <View style={[styles.thumb, {backgroundColor: isLight ? '#F0F0F0' : '#111', justifyContent:'center', alignItems:'center'}]}>
                      <Ionicons name="musical-note" size={30} color={VOEXITheme.colors.primary} />
                   </View>
                 )}
                 <TouchableOpacity style={styles.playBtn} onPress={() => router.push({ pathname: '/menu/local-player', params: { uri: item.localUri, type: item.type } })}>
                    <Ionicons name="play" size={20} color="#fff" />
                 </TouchableOpacity>
              </View>

              <View style={styles.info}>
                <Text style={[styles.title, isLight && { color: '#000' }]} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.meta}>{item.type.toUpperCase()} • {new Date(item.date).toLocaleDateString()}</Text>
              </View>

              <View style={styles.actions}>
                 <TouchableOpacity onPress={() => handleHide(item.id)} style={styles.actionBtn}>
                    <Ionicons name="eye-off-outline" size={22} color="#666" />
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={22} color="#ff4444" />
                 </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="cloud-download-outline" size={80} color={isLight ? "#EEE" : "#111"} />
              <Text style={[styles.emptyTitle, isLight && { color: '#000' }]}>No Local Content</Text>
              <Text style={styles.emptySub}>Downloaded videos and sounds will appear here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', padding: 12, borderRadius: 18, marginBottom: 15, borderWidth: 1, borderColor: '#111' },
  mediaPreview: { width: 80, height: 60, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  thumb: { width: '100%', height: '100%' },
  playBtn: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: 15 },
  title: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  meta: { color: '#444', fontSize: 10, marginTop: 4, fontWeight: 'bold' },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { padding: 10 },
  center: { alignItems: 'center', marginTop: 100 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 20 },
  emptySub: { color: '#444', fontSize: 13, textAlign: 'center', marginTop: 10, paddingHorizontal: 40 }
});
