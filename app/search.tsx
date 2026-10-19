import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Dimensions, Keyboard, Alert } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { VOEXITheme } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { AIService } from '../lib/aiService';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 2 - 15;

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Videos' | 'Creators'>('Videos');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [isSearchingByImage, setIsSearchingByImage] = useState(false);

  const pickImage = async () => {
    Alert.alert(
      "Visual Search",
      "Select an image to find similar videos",
      [
        {
          text: "Camera",
          onPress: () => handleImageSearch('camera')
        },
        {
          text: "Gallery",
          onPress: () => handleImageSearch('library')
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  const handleImageSearch = async (source: 'camera' | 'library') => {
    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission Denied", "Camera access is required for visual search.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.5,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission Denied", "Gallery access is required for visual search.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.5,
          base64: true,
        });
      }

      if (!result.canceled && result.assets[0].base64) {
        setIsSearchingByImage(true);
        setLoading(true);

        // Call AI service to describe image
        const description = await AIService.analyzeImage(result.assets[0].base64);
        if (description) {
          handleSearch(description);
        } else {
          Alert.alert("Error", "Could not analyze image. Try searching with text.");
          setLoading(false);
        }
        setIsSearchingByImage(false);
      }
    } catch (error) {
      console.error("Image search error:", error);
      Alert.alert("Error", "Visual search failed.");
      setLoading(false);
      setIsSearchingByImage(false);
    }
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const s = text.trim();
      if (activeTab === 'Videos') {
        const { data } = await supabase
          .from('posts')
          .select('*, profiles!posts_user_id_fkey(*)')
          .or(`title.ilike.%${s}%,description.ilike.%${s}%`)
          .in('post_type', ['Video', 'Reels', 'Photo'])
          .eq('visibility', 'public')
          .order('post_type', { ascending: false }) // Video will come before Reels/Photo usually
          .limit(40);
        setResults(data || []);
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${s}%,channel_name.ilike.%${s}%`)
          .limit(20);
        setResults(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch(searchQuery);
  }, [activeTab]);

  const renderVideoItem = ({ item }: any) => {
    const isVideo = item.post_type === 'Video';
    return (
      <View style={styles.vxMainCard}>
        {/* Header */}
        <View style={styles.vxCardHeader}>
          <TouchableOpacity onPress={() => router.push(`/user/${item.user_id}`)} style={styles.vxHeaderLeft}>
            <LinearGradient colors={[VOEXITheme.colors.primary, '#3b0764']} style={styles.vxAvatarRing}>
              <Image source={{ uri: item.profiles?.avatar_url || 'https://via.placeholder.com/100' }} style={styles.vxAvatar} />
            </LinearGradient>
            <View>
              <View style={styles.vxNameContainer}>
                <Text style={styles.vxCreatorName}>{item.profiles?.channel_name || 'VOEXI Creator'}</Text>
                {item.profiles?.registration_number && (
                  <MaterialCommunityIcons name="check-decagram" size={13} color={VOEXITheme.colors.secondary} />
                )}
              </View>
              <Text style={styles.vxStationId}>{item.location || 'GLOBAL NETWORK'}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={{ padding: 5 }}><Ionicons name="ellipsis-vertical" size={20} color="#fff" /></TouchableOpacity>
        </View>

        {/* Media */}
        <TouchableOpacity
          style={[styles.vxMediaContainerInner, isVideo && { aspectRatio: 16/9 }]}
          onPress={() => {
            if (isVideo) {
              router.push(`/video/${item.id}`);
            } else {
              router.push({ pathname: '/(tabs)/video-feed', params: { id: item.id } });
            }
          }}
        >
          <Image source={{ uri: item.thumbnail_url || item.media_url }} style={styles.vxMedia} contentFit="cover" />
          <LinearGradient colors={['transparent', 'transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} pointerEvents="none" />

          {/* Badges */}
          <View style={styles.vxTypeBadge}>
            <Text style={styles.vxBadgeText}>{item.category?.toUpperCase() || item.post_type?.toUpperCase() || 'PRODUCTION'}</Text>
          </View>
          <View style={styles.signalStatus}>
            <View style={styles.signalDot} />
            <Text style={styles.signalText}>LIVE SIGNAL</Text>
          </View>

          <View style={styles.vxViewCountBox}>
            <Ionicons name="flash" size={10} color="#FFD700" />
            <Text style={styles.vxViewText}>{(item.views_count || 0).toLocaleString()} SYNCED</Text>
          </View>

          {isVideo && (
             <View style={styles.playOverlay}>
                <Ionicons name="play" size={42} color="#fff" />
             </View>
          )}
        </TouchableOpacity>

        {/* Footer / Interaction Console */}
        <View style={styles.vxInteractionConsole}>
          <View style={styles.vxActionGroup}>
            <TouchableOpacity style={styles.vxMainAction}><Ionicons name="heart-outline" size={24} color="#fff" /><Text style={styles.vxActionLabel}>{item.likes_count || 0}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.vxMainAction}><Ionicons name="chatbubble-outline" size={20} color="#fff" /><Text style={styles.vxActionLabel}>{item.comments_count || 0}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.vxMainAction}><Ionicons name="paper-plane-outline" size={20} color={VOEXITheme.colors.secondary} /></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.vxRemixButton} onPress={() => router.push(`/remix/${item.id}`)}>
            <LinearGradient colors={[VOEXITheme.colors.primary, '#4c1d95']} style={styles.vxRemixGradient}>
              <Text style={styles.vxRemixText}>REMIX</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Caption */}
        <View style={styles.vxCaptionBox}>
          <Text style={styles.vxPostTitle} numberOfLines={2}>{item.title}</Text>
        </View>
      </View>
    );
  };

  const renderCreatorItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.creatorCard}
      onPress={() => router.push(`/user/${item.id}`)}
    >
      <Image source={{ uri: item.avatar_url || 'https://via.placeholder.com/100' }} style={styles.creatorAvatar} />
      <View style={styles.creatorInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.creatorName}>{item.channel_name || item.username}</Text>
          <MaterialCommunityIcons name="check-decagram" size={14} color={VOEXITheme.colors.secondary} />
        </View>
        <Text style={styles.creatorHandle}>@{item.username}</Text>
      </View>
      <TouchableOpacity style={styles.followBtn}>
        <Text style={styles.followText}>VIEW</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="Search VOEXI..."
            placeholderTextColor="#444"
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={pickImage} style={styles.cameraIcon}>
            <Ionicons name="camera" size={24} color={VOEXITheme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {['Videos', 'Creators'].map((tab: any) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={VOEXITheme.colors.primary} size="large" />
          {isSearchingByImage && (
            <Text style={styles.loadingText}>VOEXI AI is scanning your image...</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          numColumns={1}
          key={activeTab} // Force re-render on tab change
          renderItem={activeTab === 'Videos' ? renderVideoItem : renderCreatorItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            searchQuery !== '' ? (
              <View style={styles.center}>
                <Ionicons name="search-outline" size={60} color="#222" />
                <Text style={styles.emptyText}>No results found for "{searchQuery}"</Text>
              </View>
            ) : (
              <View style={styles.center}>
                <Text style={styles.hintText}>Search for your favorite creators and videos</Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 15 },
  backBtn: { padding: 5 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 15, paddingHorizontal: 15, height: 50, gap: 10 },
  input: { flex: 1, color: '#fff', fontSize: 16 },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 15, gap: 15 },
  tab: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: '#080808', borderWidth: 1, borderColor: '#111' },
  activeTab: { borderColor: VOEXITheme.colors.primary, backgroundColor: 'rgba(255,0,0,0.05)' },
  tabText: { color: '#444', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  activeTabText: { color: VOEXITheme.colors.primary },
  listContent: { padding: 10, paddingBottom: 40 },
  columnWrapper: { justifyContent: 'space-between' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#444', marginTop: 20, fontSize: 14, fontWeight: 'bold' },
  hintText: { color: '#222', fontSize: 14, fontWeight: 'bold' },
  cameraIcon: { marginLeft: 10, padding: 5, backgroundColor: '#181818', borderRadius: 10 },
  loadingText: { color: VOEXITheme.colors.primary, marginTop: 15, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },

  // Video Item (Home Style)
  vxMainCard: { marginBottom: 25 },
  vxCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  vxHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vxAvatarRing: { width: 40, height: 40, borderRadius: 16, padding: 1.5, justifyContent: 'center', alignItems: 'center' },
  vxAvatar: { width: '100%', height: '100%', borderRadius: 14, borderWidth: 1, borderColor: '#000' },
  vxNameContainer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  vxCreatorName: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  vxStationId: { color: '#555', fontSize: 9, fontWeight: 'bold', marginTop: 1 },
  vxMediaContainerInner: { width: '100%', aspectRatio: 4/5, backgroundColor: '#050505', borderRadius: 24, overflow: 'hidden', position: 'relative' },
  vxMedia: { width: '100%', height: '100%' },
  vxViewCountBox: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  vxViewText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  vxTypeBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, zIndex: 10 },
  vxBadgeText: { color: '#FFD700', fontSize: 7, fontWeight: '900' },
  vxInteractionConsole: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12 },
  vxActionGroup: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  vxMainAction: { alignItems: 'center', gap: 4 },
  vxActionLabel: { color: '#555', fontSize: 11, fontWeight: 'bold' },
  vxRemixButton: { borderRadius: 10, overflow: 'hidden' },
  vxRemixGradient: { paddingHorizontal: 14, paddingVertical: 7 },
  vxRemixText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  vxCaptionBox: { paddingHorizontal: 15, paddingBottom: 10 },
  vxPostTitle: { color: '#ddd', fontSize: 13, fontWeight: '500' },
  signalStatus: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 5, zIndex: 10 },
  signalDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#00ff00' },
  signalText: { color: '#fff', fontSize: 6, fontWeight: 'bold' },
  playOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },

  // Creator Item
  creatorCard: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#080808', borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#111' },
  creatorAvatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 1.5, borderColor: '#222' },
  creatorInfo: { flex: 1, marginLeft: 15 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  creatorName: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  creatorHandle: { color: '#555', fontSize: 12, marginTop: 2 },
  followBtn: { backgroundColor: '#111', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#222' },
  followText: { color: '#fff', fontSize: 10, fontWeight: 'bold' }
});
