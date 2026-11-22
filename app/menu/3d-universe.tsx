import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Dimensions, TextInput, ActivityIndicator, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { Avatar3DEngine } from '../../components/avatar/Avatar3DEngine';
import { SERVER_IP, AVATAR_SERVER_PORT } from '../../constants/config';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width > 700 ? (width - 60) / 3 : (width - 40) / 2;

const FALLBACK_MODEL = `http://${SERVER_IP}:${AVATAR_SERVER_PORT}/avatar/models/male%20human%203d%20model.glb`;

export default function VOEXI3DUniverseScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [universeAvatars, setUniverseAvatars] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'MALE' | 'FEMALE' | 'CUSTOM'>('ALL');

  useEffect(() => {
    fetchUniverseAvatars();
  }, []);

  const fetchUniverseAvatars = async () => {
    try {
      setLoading(true);
      // Fetch profiles and their 3D avatars
      const { data: profilesData, error: profErr } = await supabase
        .from('profiles')
        .select('id, username, channel_name, avatar_url, gender, vx_id_number, diamond_balance')
        .limit(50);

      if (profErr) throw profErr;

      // Fetch avatars table data
      const { data: avatarsData } = await supabase
        .from('avatars')
        .select('user_id, avatar_url, top_color, bottom_color, metadata, avatar_source');

      const avatarMap = new Map();
      if (avatarsData) {
        avatarsData.forEach((av: any) => {
          avatarMap.set(av.user_id, av);
        });
      }

      const combined = (profilesData || []).map((p: any) => {
        const avRecord = avatarMap.get(p.id);
        const modelUri = avRecord?.avatar_url || (p.avatar_url && p.avatar_url.endsWith('.glb') ? p.avatar_url : FALLBACK_MODEL);
        const metadata = avRecord?.metadata || {};

        return {
          id: p.id,
          username: p.username || 'VOEXI Agent',
          channel_name: p.channel_name || '@agent',
          vx_id_number: p.vx_id_number || 'VX-0000',
          gender: p.gender || 'Male',
          modelUri,
          top_color: avRecord?.top_color || '#A855F7',
          bottom_color: avRecord?.bottom_color || '#00F2FE',
          metadata,
          image: p.avatar_url && !p.avatar_url.endsWith('.glb') ? p.avatar_url : null
        };
      });

      setUniverseAvatars(combined);
    } catch (e) {
      console.error('[3D UNIVERSE] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredAvatars = universeAvatars.filter((item) => {
    const matchesSearch =
      item.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.channel_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vx_id_number.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFilter === 'MALE') return item.gender.toLowerCase() === 'male';
    if (selectedFilter === 'FEMALE') return item.gender.toLowerCase() === 'female';
    if (selectedFilter === 'CUSTOM') return item.modelUri && !item.modelUri.includes('male human');
    return true;
  });

  return (
    <LinearGradient colors={['#05050A', '#0D071E', '#020205']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#00F2FE" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>🌐 3D AVATAR UNIVERSE</Text>
            <Text style={styles.headerSub}>Explore Live 3D Models & Vault Avatars</Text>
          </View>
          <TouchableOpacity onPress={fetchUniverseAvatars} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color="#A855F7" />
          </TouchableOpacity>
        </View>

        {/* SEARCH & FILTERS */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#00F2FE" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search agents by name, ID or channel..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterRow}>
            {(['ALL', 'MALE', 'FEMALE', 'CUSTOM'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, selectedFilter === filter && styles.filterChipActive]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setSelectedFilter(filter);
                }}
              >
                <Text style={[styles.filterText, selectedFilter === filter && styles.filterTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* CONTENT GRID */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#00F2FE" />
            <Text style={styles.loadingText}>Initializing Holographic 3D Grid...</Text>
          </View>
        ) : filteredAvatars.length === 0 ? (
          <View style={styles.centerContainer}>
            <MaterialCommunityCommunityIcons name="cube-outline" size={64} color="#A855F7" />
            <Text style={styles.emptyTitle}>No 3D Avatars Found</Text>
            <Text style={styles.emptySub}>Agents haven't published their 3D models yet.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredAvatars}
            keyExtractor={(item) => item.id}
            numColumns={width > 700 ? 3 : 2}
            contentContainerStyle={styles.gridContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.cardWrapper}
                activeOpacity={0.9}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  router.push(`/user/${item.id}`);
                }}
              >
                <LinearGradient colors={['rgba(26, 16, 51, 0.8)', 'rgba(10, 10, 20, 0.95)']} style={styles.card}>

                  {/* 3D ENGINE PREVIEW CONTAINER */}
                  <View style={styles.canvasContainer}>
                    <Avatar3DEngine
                      ref={undefined}
                      gender={item.gender.toLowerCase() as 'male' | 'female'}
                      modelUri={item.modelUri}
                      topColor={item.top_color}
                      bottomColor={item.bottom_color}
                      initialHair={item.metadata?.hair || 'Cyber Spikes'}
                      initialShirt={item.metadata?.shirt || 'Cyber Jacket'}
                      initialPant={item.metadata?.pant || 'Cyber Joggers'}
                      initialGear={item.metadata?.gear || 'Cyber Visor'}
                      initialShoe={item.metadata?.shoe || 'Cyber Kicks'}
                      initialSock={item.metadata?.sock || 'High Neon Socks'}
                    />

                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>3D LIVE</Text>
                    </View>
                  </View>

                  {/* USER INFO */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.username} numberOfLines={1}>{item.username}</Text>
                    <Text style={styles.channelName} numberOfLines={1}>{item.channel_name}</Text>

                    <View style={styles.cardMetaRow}>
                      <View style={styles.idBadge}>
                        <Text style={styles.idText}>{item.vx_id_number}</Text>
                      </View>
                      <View style={styles.genderBadge}>
                        <Text style={styles.genderText}>{item.gender}</Text>
                      </View>
                    </View>
                  </View>

                </LinearGradient>
              </TouchableOpacity>
            )}
          />
        )}

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)'
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)'
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  headerSub: { color: '#00F2FE', fontSize: 11, fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)'
  },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 35, 0.9)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)'
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  filterChipActive: {
    backgroundColor: 'rgba(0, 242, 254, 0.2)',
    borderColor: '#00F2FE'
  },
  filterText: { color: '#94A3B8', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  filterTextActive: { color: '#00F2FE' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { color: '#00F2FE', fontSize: 13, fontWeight: '700', marginTop: 15, letterSpacing: 0.5 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 15 },
  emptySub: { color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 6 },
  gridContent: { paddingHorizontal: 12, paddingBottom: 30 },
  cardWrapper: { width: CARD_WIDTH, margin: 6 },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  canvasContainer: {
    width: '100%',
    height: 210,
    backgroundColor: '#020205',
    position: 'relative'
  },
  liveBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.4)'
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00F2FE', marginRight: 5 },
  liveText: { color: '#00F2FE', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  cardFooter: { padding: 12 },
  username: { color: '#fff', fontSize: 14, fontWeight: '900' },
  channelName: { color: '#A855F7', fontSize: 11, fontWeight: '700', marginTop: 1 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  idBadge: {
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)'
  },
  idText: { color: '#00F2FE', fontSize: 9, fontWeight: '800' },
  genderBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)'
  },
  genderText: { color: '#C084FC', fontSize: 9, fontWeight: '800' }
});
