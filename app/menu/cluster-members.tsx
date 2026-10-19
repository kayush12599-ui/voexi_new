import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, TextInput, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const THEME = {
  bg: '#000',
  card: '#0A0A0F',
  accent: '#7C5CFF',
  secondary: '#00D4FF',
  text: '#fff',
  textDim: '#666',
  border: '#1A1A24',
};

export default function ClusterMembersScreen() {
  const { clusterId } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMembers();
  }, [clusterId]);

  const fetchMembers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('group_members')
      .select('*, profiles:user_id(username, avatar_url, vx_id_number)')
      .eq('group_id', clusterId);

    if (data) setMembers(data);
    setLoading(false);
  };

  const sortedMembers = [...members].sort((a, b) => {
    const tierMap: any = { diamond: 3, gold: 2, silver: 1, member: 0 };
    const tierA = a.tier || 'member';
    const tierB = b.tier || 'member';
    if (tierMap[tierA] !== tierMap[tierB]) return tierMap[tierB] - tierMap[tierA];
    if (a.role === 'leader') return -1;
    if (b.role === 'leader') return 1;
    return 0;
  });

  const filteredMembers = sortedMembers.filter(m =>
    (m.profiles?.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.profiles?.vx_id_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMember = ({ item: m }: { item: any }) => {
    const agentTier = m.tier || 'silver';
    const isDiamond = agentTier === 'diamond';
    const tierColor = isDiamond ? '#B9F2FF' : agentTier === 'gold' ? '#FFD700' : '#C0C0C0';
    const tierIcon = isDiamond ? 'diamond' : agentTier === 'gold' ? 'crown' : 'medal';

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        delayLongPress={300}
        onLongPress={() => {
           if (m.role !== 'leader') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              router.push({
                pathname: '/menu/cluster-member-manage',
                params: { clusterId, userId: m.user_id }
              });
           }
        }}
        onPress={() => {
           // Normal tap also opens management for convenience
           if (m.role !== 'leader') {
              router.push({
                pathname: '/menu/cluster-member-manage',
                params: { clusterId, userId: m.user_id }
              });
           }
        }}
        style={[styles.memberRow, isDiamond && styles.diamondRow]}
      >
        <View style={styles.avatarContainer}>
          <Image source={{ uri: m.profiles?.avatar_url || 'https://via.placeholder.com/50' }} style={[styles.avatar, isDiamond && { borderColor: tierColor, borderWidth: 2 }]} />
          <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
            <MaterialCommunityIcons name={tierIcon as any} size={8} color="#000" />
          </View>
        </View>

        <View style={{ flex: 1 }}>
           <View style={styles.nameRow}>
              <Text style={[styles.name, isDiamond && { color: tierColor }]}>{m.profiles?.username || 'Unknown'}</Text>
              {m.role === 'leader' && <View style={styles.leaderTag}><Text style={styles.tagText}>LEADER</Text></View>}
              {m.role === 'admin' && <View style={styles.adminTag}><Text style={styles.tagText}>ADMIN</Text></View>}
              <View style={[styles.tierTag, { borderColor: tierColor + '44' }]}>
                 <Text style={[styles.tierTagText, { color: tierColor }]}>{agentTier.toUpperCase()}</Text>
              </View>
           </View>
           <Text style={styles.vxId}>{m.profiles?.vx_id_number || 'VX-GUEST'}</Text>
           <Text style={styles.hint}>TAP OR HOLD TO MANAGE NEURAL LINK</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#222" />
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={THEME.accent} size="large" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CLUSTER AGENTS</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchSection}>
         <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#444" style={{ marginLeft: 15 }} />
            <TextInput
               style={styles.searchInput}
               placeholder="Search agent signature..."
               placeholderTextColor="#444"
               value={searchQuery}
               onChangeText={setSearchQuery}
            />
         </View>
      </View>

      <FlatList
        data={filteredMembers}
        renderItem={renderMember}
        keyExtractor={item => item.user_id}
        contentContainerStyle={styles.listPadding}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#111' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  searchSection: { padding: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0A0F', borderRadius: 15, borderWidth: 1, borderColor: '#1A1A24', height: 50 },
  searchInput: { flex: 1, color: '#fff', paddingHorizontal: 15, fontSize: 14 },
  listPadding: { paddingHorizontal: 20, paddingBottom: 40 },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#050508', borderRadius: 22, marginBottom: 12, borderWidth: 1, borderColor: '#111' },
  diamondRow: { backgroundColor: 'rgba(185, 242, 255, 0.05)', borderColor: 'rgba(185, 242, 255, 0.2)' },
  avatarContainer: { position: 'relative', marginRight: 15 },
  avatar: { width: 50, height: 50, borderRadius: 18, backgroundColor: '#111' },
  tierBadge: { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#050508' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: '#fff', fontSize: 14, fontWeight: '700' },
  vxId: { color: '#444', fontSize: 10, marginTop: 2, fontWeight: '700' },
  hint: { color: '#7C5CFF', fontSize: 7, fontWeight: '900', marginTop: 5, letterSpacing: 0.5, opacity: 0.6 },
  leaderTag: { backgroundColor: 'rgba(255, 215, 0, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1, borderColor: '#FFD700' },
  adminTag: { backgroundColor: 'rgba(0, 212, 255, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1, borderColor: '#00D4FF' },
  tierTag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 1 },
  tagText: { color: '#fff', fontSize: 6, fontWeight: '900' },
  tierTagText: { fontSize: 6, fontWeight: '900' }
});
