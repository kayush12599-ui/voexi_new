import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Dimensions } from 'react-native';
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
  danger: '#FF4444',
  border: '#1A1A24'
};

export default function ClusterMemberManageScreen() {
  const { clusterId, userId } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [allMembers, setAllMembers] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [clusterId, userId]);

  const fetchData = async () => {
    setLoading(true);
    const { data: memberData } = await supabase
      .from('group_members')
      .select('*, profiles:user_id(username, avatar_url, vx_id_number)')
      .eq('group_id', clusterId)
      .eq('user_id', userId)
      .single();

    const { data: membersList } = await supabase
      .from('group_members')
      .select('tier')
      .eq('group_id', clusterId);

    if (memberData) setMember(memberData);
    if (membersList) setAllMembers(membersList);
    setLoading(false);
  };

  const handleUpdateTier = async (newTier: string) => {
    const silverCount = allMembers.filter(m => (m.tier || 'silver') === 'silver').length;
    const goldCount = allMembers.filter(m => m.tier === 'gold').length;
    const diamondCount = allMembers.filter(m => m.tier === 'diamond').length;

    if (newTier === 'diamond' && diamondCount >= 1 && member.tier !== 'diamond') {
      return Alert.alert("NEURAL LIMIT", "Only 1 Diamond agent allowed (Leader Core).");
    }
    if (newTier === 'gold' && goldCount >= 3 && member.tier !== 'gold') {
      return Alert.alert("CAPACITY REACHED", "Gold tier is capped at 3 agents.");
    }
    if (newTier === 'silver' && silverCount >= 7 && (member.tier !== 'silver' && member.tier !== null)) {
      return Alert.alert("NODE LIMIT", "Silver tier capacity (7) reached.");
    }

    const { error } = await supabase
      .from('group_members')
      .update({ tier: newTier })
      .eq('group_id', clusterId)
      .eq('user_id', userId);

    if (!error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    }
  };

  const handleToggleAdmin = async () => {
    const newRole = member.role === 'admin' ? 'member' : 'admin';
    const { error } = await supabase.from('group_members').update({ role: newRole }).eq('group_id', clusterId).eq('user_id', userId);
    if (!error) {
      setMember({ ...member, role: newRole });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleKick = async () => {
    Alert.alert("Terminate Link", "Permanently disconnect this agent?", [
      { text: "ABORT", style: "cancel" },
      { text: "DISCONNECT", style: "destructive", onPress: async () => {
          const { error } = await supabase.from('group_members').delete().eq('group_id', clusterId).eq('user_id', userId);
          if (!error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          }
      }}
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={THEME.accent} size="large" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MANAGE AGENT</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.profileSection}>
           <Image source={{ uri: member.profiles?.avatar_url }} style={styles.avatar} />
           <Text style={styles.username}>@{member.profiles?.username}</Text>
           <Text style={styles.vxId}>{member.profiles?.vx_id_number}</Text>
        </View>

        <View style={styles.section}>
           <Text style={styles.label}>ASSIGN NEURAL RANK</Text>
           <View style={styles.tierGrid}>
             {[
               { id: 'silver', label: 'SILVER AGENT', color: '#C0C0C0', icon: 'medal', limit: 7, count: allMembers.filter(m => (m.tier || 'silver') === 'silver').length },
               { id: 'gold', label: 'GOLD AGENT', color: '#FFD700', icon: 'crown', limit: 3, count: allMembers.filter(m => m.tier === 'gold').length },
               { id: 'diamond', label: 'DIAMOND AGENT', color: '#B9F2FF', icon: 'diamond', limit: 1, count: allMembers.filter(m => m.tier === 'diamond').length }
             ].map(t => (
               <TouchableOpacity
                 key={t.id}
                 style={[styles.tierCard, member.tier === t.id && { borderColor: t.color, backgroundColor: t.color + '10' }]}
                 onPress={() => handleUpdateTier(t.id)}
               >
                 <MaterialCommunityIcons name={t.icon as any} size={28} color={t.color} />
                 <Text style={[styles.tierLabel, { color: t.color }]}>{t.label}</Text>
                 <Text style={styles.tierLimit}>{t.count}/{t.limit} Active</Text>
               </TouchableOpacity>
             ))}
           </View>
        </View>

        <View style={styles.section}>
           <Text style={styles.label}>AUTHORITY SETTINGS</Text>
           <TouchableOpacity style={[styles.actionBtn, member.role === 'admin' && styles.activeAdmin]} onPress={handleToggleAdmin}>
              <Ionicons name="shield-checkmark" size={20} color={member.role === 'admin' ? THEME.secondary : '#444'} />
              <Text style={[styles.actionBtnText, member.role === 'admin' && { color: THEME.secondary }]}>
                 {member.role === 'admin' ? 'REVOKE ADMIN STATUS' : 'GRANT ADMIN ACCESS'}
              </Text>
           </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.kickBtn} onPress={handleKick}>
           <Ionicons name="flash-outline" size={20} color={THEME.danger} />
           <Text style={styles.kickBtnText}>TERMINATE AGENT LINK</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  scroll: { padding: 20 },
  profileSection: { alignItems: 'center', marginBottom: 40 },
  avatar: { width: 100, height: 100, borderRadius: 35, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  username: { color: '#fff', fontSize: 20, fontWeight: '900' },
  vxId: { color: '#444', fontSize: 12, fontWeight: '700', marginTop: 5 },
  section: { marginBottom: 30 },
  label: { color: '#333', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
  tierGrid: { gap: 12 },
  tierCard: { flexDirection: 'row', alignItems: 'center', padding: 18, backgroundColor: '#0A0A0F', borderRadius: 22, borderWidth: 1, borderColor: '#111', gap: 15 },
  tierLabel: { fontSize: 12, fontWeight: '900', flex: 1 },
  tierLimit: { color: '#333', fontSize: 10, fontWeight: '800' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 18, backgroundColor: '#0A0A0F', borderRadius: 22, borderWidth: 1, borderColor: '#111', gap: 15 },
  activeAdmin: { borderColor: 'rgba(0, 212, 255, 0.2)', backgroundColor: 'rgba(0, 212, 255, 0.05)' },
  actionBtnText: { color: '#eee', fontSize: 12, fontWeight: '900' },
  kickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(255, 68, 68, 0.05)', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255, 68, 68, 0.1)', gap: 10, marginTop: 20 },
  kickBtnText: { color: THEME.danger, fontSize: 11, fontWeight: '900' }
});
