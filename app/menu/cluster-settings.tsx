import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Switch, Dimensions, Platform, Modal, Image, TextInput, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
const THEME = {
  bg: '#000',
  card: '#0A0A0F',
  accent: '#7C5CFF',
  secondary: '#00D4FF',
  text: '#fff',
  textDim: '#666',
  border: '#1A1A24',
  danger: '#FF4444'
};

const CLUSTER_TIERS = [
  { id: 'silver', label: 'SILVER', icon: 'medal', color: '#C0C0C0' },
  { id: 'gold', label: 'GOLD', icon: 'crown', color: '#FFD700' },
  { id: 'diamond', label: 'DIAMOND', icon: 'diamond', color: '#B9F2FF' },
];

export default function ClusterSettingsScreen() {
  const { clusterId } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clusterData, setClusterData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  // Settings States
  const [tier, setTier] = useState('silver');
  const [type, setType] = useState('public');
  const [features, setFeatures] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');

  const [memberCount, setMemberCount] = useState(0);
  const [members, setMembers] = useState<any[]>([]);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [modulesModalVisible, setModulesModalVisible] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Agent Management States
  const [agentActionModalVisible, setAgentActionModalVisible] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
  }, [clusterId]);

  const fetchSettings = async () => {
    setLoading(true);
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    const { data } = await supabase.from('groups').select('*').eq('id', clusterId).single();
    if (data) {
      setClusterData(data);
      setTier(data.tier || 'silver');
      setType(data.type || 'public');
      setFeatures(data.features || []);
      setDescription(data.description || '');
      setPassword(data.password || '');

      const { data: membersData, count } = await supabase
        .from('group_members')
        .select('*, profiles:user_id(username, avatar_url, vx_id_number)', { count: 'exact' })
        .eq('group_id', clusterId);

      setMembers(membersData || []);
      setMemberCount(count || 0);
    }
    setLoading(false);
  };

  // TIER PERMISSION CALCULATIONS
  const currentUserMember = members.find(m => m.user_id === user?.id);
  const isLeader = clusterData?.created_by === user?.id || currentUserMember?.role === 'leader';
  const userTier = isLeader ? 'diamond' : (currentUserMember?.tier || 'silver');

  // Specific Tier Power Flags (User's Exact Specification)
  const canEditRules = userTier === 'diamond';
  const canToggleModules = userTier === 'diamond' || userTier === 'gold';
  const canChangePassword = userTier === 'diamond' || userTier === 'gold';
  const canAcceptRequests = userTier === 'diamond' || userTier === 'gold' || userTier === 'silver';
  const canRemoveMembers = userTier === 'diamond' || userTier === 'gold' || userTier === 'silver';

  const handleUpdateAgentTier = async (agentTier: string) => {
    if (!selectedAgent) return;

    if (userTier !== 'diamond') {
      return Alert.alert("ACCESS DENIED", "Only Diamond Tier Leaders can promote or reassign agent tiers.");
    }

    // TIER LIMITS LOGIC
    const silverCount = members.filter(m => (m.tier || 'silver') === 'silver').length;
    const goldCount = members.filter(m => m.tier === 'gold').length;
    const diamondCount = members.filter(m => m.tier === 'diamond').length;

    if (agentTier === 'diamond' && diamondCount >= 1 && selectedAgent.tier !== 'diamond') {
      return Alert.alert("NEURAL LIMIT", "Only 1 Diamond agent allowed (Leader Core).");
    }
    if (agentTier === 'gold' && goldCount >= 3 && selectedAgent.tier !== 'gold') {
      return Alert.alert("CAPACITY REACHED", "Gold tier is capped at 3 agents.");
    }
    if (agentTier === 'silver' && silverCount >= 7 && (selectedAgent.tier !== 'silver' && selectedAgent.tier !== null)) {
      return Alert.alert("NODE LIMIT", "Silver tier capacity (7) reached.");
    }

    const { error } = await supabase
      .from('group_members')
      .update({ tier: agentTier })
      .eq('group_id', clusterId)
      .eq('user_id', selectedAgent.user_id);

    if (!error) {
      setMembers(prev => prev.map(m => m.user_id === selectedAgent.user_id ? { ...m, tier: agentTier } : m));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAgentActionModalVisible(false);
    }
  };

  const handleChangeRole = async (userId: string, currentRole: string) => {
    if (userTier !== 'diamond') {
      return Alert.alert("ACCESS DENIED", "Only Diamond Leaders can assign Admin Authority.");
    }

    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    const { error } = await supabase.from('group_members').update({ role: newRole }).eq('group_id', clusterId).eq('user_id', userId);
    if (!error) {
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: newRole } : m));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setAgentActionModalVisible(false);
    }
  };

  const handleKickAgent = async (targetUser: any) => {
    if (!canRemoveMembers) {
      return Alert.alert("ACCESS DENIED", "Your tier rank cannot remove agents.");
    }

    const targetTier = targetUser.tier || 'silver';
    if (userTier === 'silver' && (targetTier === 'silver' || targetTier === 'gold' || targetTier === 'diamond')) {
      return Alert.alert("TIER POWER LIMIT", "Silver members can only remove basic non-tier members.");
    }
    if (userTier === 'gold' && (targetTier === 'gold' || targetTier === 'diamond')) {
      return Alert.alert("TIER POWER LIMIT", "Gold members cannot remove Gold or Diamond agents.");
    }

    Alert.alert("Terminate Link", `Permanently disconnect @${targetUser.profiles?.username || 'agent'}?`, [
      { text: "ABORT", style: "cancel" },
      { text: "DISCONNECT", style: "destructive", onPress: async () => {
          const { error } = await supabase.from('group_members').delete().eq('group_id', clusterId).eq('user_id', targetUser.user_id);
          if (!error) {
            setMembers(prev => prev.filter(m => m.user_id !== targetUser.user_id));
            setMemberCount(prev => prev - 1);
            setAgentActionModalVisible(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
      }}
    ]);
  };

  const toggleFeature = (f: string) => {
    if (!canToggleModules) {
      return Alert.alert("GOLD & DIAMOND EXCLUSIVE", "Only Gold and Diamond tier members can manage active modules.");
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const saveSettings = async () => {
    if (!canChangePassword && !canEditRules && !canToggleModules) {
      return Alert.alert("ACCESS DENIED", "Your tier rank is insufficient to modify cluster parameters.");
    }

    const updates: any = {};
    if (canEditRules) updates.description = description.trim() || null;
    if (canChangePassword) updates.password = password.trim() || null;
    if (canToggleModules) updates.features = features;

    const { error } = await supabase.from('groups').update(updates).eq('id', clusterId);
    if (!error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("CLUSTER CONFIG SYNCED", "Cluster rules, password, and module parameters updated.");
    } else {
      Alert.alert("Error", error.message);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={THEME.accent} size="large" /></View>;

  const sortedMembersList = [...members].sort((a, b) => {
    const tierMap: any = { diamond: 3, gold: 2, silver: 1, member: 0 };
    const tierA = a.tier || 'member';
    const tierB = b.tier || 'member';
    if (tierMap[tierA] !== tierMap[tierB]) return tierMap[tierB] - tierMap[tierA];
    if (a.role === 'leader') return -1;
    if (b.role === 'leader') return 1;
    return 0;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CLUSTER CONFIG</Text>
        <TouchableOpacity onPress={saveSettings} style={styles.saveBtn}>
          <Text style={styles.saveText}>SAVE</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* YOUR TIER POWER SUMMARY CARD */}
        <View style={[styles.powerCard, { borderColor: userTier === 'diamond' ? '#B9F2FF' : userTier === 'gold' ? '#FFD700' : '#C0C0C0' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <MaterialCommunityIcons name={userTier === 'diamond' ? 'diamond' : userTier === 'gold' ? 'crown' : 'medal'} size={28} color={userTier === 'diamond' ? '#B9F2FF' : userTier === 'gold' ? '#FFD700' : '#C0C0C0'} />
            <View style={{ flex: 1 }}>
              <Text style={styles.powerCardTitle}>YOUR RANK: {userTier.toUpperCase()}</Text>
              <Text style={styles.powerCardSub}>
                {userTier === 'diamond' && '💎 Diamond Leader: Master A-Z Controls (Create Rules, Password, Modules, Kick, Tiers)'}
                {userTier === 'gold' && '🥇 Gold Admin: Change Password, Active Modules, Accept Requests & Remove Members'}
                {userTier === 'silver' && '🥈 Silver Member: Accept Join Requests & Remove Basic Members'}
              </Text>
            </View>
          </View>
        </View>

        {/* STATS HUD */}
        <View style={styles.statsHud}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{memberCount}</Text>
            <Text style={styles.statLabel}>AGENTS</Text>
          </View>
          <View style={[styles.statItem, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: THEME.border }]}>
            <Text style={[styles.statVal, { color: THEME.secondary }]}>{userTier.toUpperCase()}</Text>
            <Text style={styles.statLabel}>YOUR TIER</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: '#00ff00' }]}>ACTIVE</Text>
            <Text style={styles.statLabel}>STATUS</Text>
          </View>
        </View>

        {/* CLUSTER RULES & DESCRIPTION (Diamond Leader Exclusive) */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.sectionLabel}>CLUSTER RULES & GUIDELINES</Text>
            <View style={[styles.tierBadgeBox, { backgroundColor: canEditRules ? 'rgba(185, 242, 255, 0.15)' : '#111', borderColor: canEditRules ? '#B9F2FF' : '#333' }]}>
              <MaterialCommunityIcons name="diamond" size={12} color={canEditRules ? '#B9F2FF' : '#666'} />
              <Text style={[styles.tierBadgeBoxText, { color: canEditRules ? '#B9F2FF' : '#666' }]}>
                {canEditRules ? 'DIAMOND EDIT' : 'DIAMOND EXCLUSIVE'}
              </Text>
            </View>
          </View>
          <TextInput
            style={[styles.rulesInput, !canEditRules && { opacity: 0.6 }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Write rules and guidelines for cluster members..."
            placeholderTextColor="#555"
            multiline
            numberOfLines={4}
            editable={canEditRules}
          />
          {!canEditRules && (
            <Text style={styles.rulesHintText}>Only the Diamond Leader can create or edit Cluster Rules.</Text>
          )}
        </View>

        {/* ACCESS PASSWORD (Gold & Diamond Exclusive) */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.sectionLabel}>ACCESS PASSWORD</Text>
            <View style={[styles.tierBadgeBox, { backgroundColor: canChangePassword ? 'rgba(255, 215, 0, 0.15)' : '#111', borderColor: canChangePassword ? '#FFD700' : '#333' }]}>
              <MaterialCommunityIcons name="crown" size={12} color={canChangePassword ? '#FFD700' : '#666'} />
              <Text style={[styles.tierBadgeBoxText, { color: canChangePassword ? '#FFD700' : '#666' }]}>
                GOLD & DIAMOND
              </Text>
            </View>
          </View>
          <TextInput
            style={[styles.modalInput, !canChangePassword && { opacity: 0.6 }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Set private cluster access password..."
            placeholderTextColor="#555"
            secureTextEntry
            editable={canChangePassword}
          />
        </View>

        {/* NEURAL TIER */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CLUSTER TIER</Text>
          <View style={styles.tierGrid}>
            {CLUSTER_TIERS.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tierCard, tier === t.id && { borderColor: t.color, backgroundColor: t.color + '10' }]}
                onPress={() => Alert.alert("VOEXI PRO", "Subscription required to change cluster tier.")}
              >
                <MaterialCommunityIcons name={t.icon as any} size={28} color={tier === t.id ? t.color : '#222'} />
                <Text style={[styles.tierName, { color: tier === t.id ? t.color : '#333' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* MODULES & MEMBER POWERS OPTION CARD */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CLUSTER MODULES & PERMISSIONS</Text>
          <TouchableOpacity
            style={styles.adminBtn}
            onPress={() => setModulesModalVisible(true)}
          >
             <LinearGradient colors={['#1A1A24', '#0A0A0F']} style={styles.adminGradient}>
                <Ionicons name="options-outline" size={22} color={THEME.accent} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                   <Text style={styles.adminBtnText}>MODULES & MEMBER POWERS</Text>
                   <Text style={{ color: '#888', fontSize: 10, marginTop: 2 }}>
                     Polls, AI Bot, Voice, Media, Gifts & Member Powers ({features.length}/8 Active)
                   </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#444" />
             </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ADMINISTRATION */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ADMINISTRATION</Text>
          <TouchableOpacity
            style={styles.adminBtn}
            onPress={() => router.push({ pathname: '/menu/cluster-members', params: { clusterId } })}
          >
             <LinearGradient colors={['#1A1A24', '#0A0A0F']} style={styles.adminGradient}>
                <Ionicons name="people" size={20} color="#fff" />
                <Text style={styles.adminBtnText}>MANAGE ACTIVE AGENTS</Text>
                <Ionicons name="chevron-forward" size={16} color="#444" style={{ marginLeft: 'auto' }} />
             </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* CLUSTER AGENTS LIST MODAL */}
      <Modal visible={membersModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.membersSheet}>
            <View style={styles.dragBar} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>CLUSTER AGENTS</Text>
              <TouchableOpacity onPress={() => setMembersModalVisible(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
               <Ionicons name="search" size={18} color="#444" style={{ marginLeft: 15 }} />
               <TextInput style={styles.searchInput} placeholder="Search agent signature..." placeholderTextColor="#444" value={memberSearchQuery} onChangeText={setMemberSearchQuery} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {sortedMembersList.filter(m => (m.profiles?.username || '').toLowerCase().includes(memberSearchQuery.toLowerCase())).map(m => {
                const isDiamond = (m.tier || 'silver') === 'diamond';
                const tierColor = isDiamond ? '#B9F2FF' : m.tier === 'gold' ? '#FFD700' : '#C0C0C0';
                return (
                  <TouchableOpacity
                    key={m.user_id}
                    style={[styles.memberRowItem, isDiamond && styles.diamondRow]}
                    delayLongPress={300}
                    onLongPress={() => {
                      if (m.role !== 'leader') {
                        setSelectedAgent(m);
                        setAgentActionModalVisible(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                      }
                    }}
                  >
                    <Image source={{ uri: m.profiles?.avatar_url || 'https://via.placeholder.com/50' }} style={styles.memberAvatar} />
                    <View style={{ flex: 1 }}>
                       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Text style={[styles.memberName, isDiamond && { color: tierColor }]}>{m.profiles?.username || 'Unknown'}</Text>
                          {m.role === 'leader' && <View style={styles.leaderBadge}><Text style={styles.leaderBadgeText}>LEADER</Text></View>}
                          {m.role === 'admin' && <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>ADMIN</Text></View>}
                       </View>
                       <Text style={styles.memberVx}>{m.profiles?.vx_id_number || 'VX-GUEST'}</Text>
                       <Text style={styles.holdHint}>HOLD TO MANAGE AGENT</Text>
                    </View>
                    <Ionicons name="ellipsis-vertical" size={16} color="#222" />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* AGENT MANAGEMENT MODAL (Center) */}
      <Modal visible={agentActionModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlayCenter} onPress={() => setAgentActionModalVisible(false)}>
           <View style={styles.agentActionSheet}>
              <View style={styles.agentActionHeader}>
                 <Image source={{ uri: selectedAgent?.profiles?.avatar_url }} style={styles.actionAvatar} />
                 <View>
                    <Text style={styles.sheetTitle}>AGENT NEURAL LINK</Text>
                    <Text style={styles.agentSub}>Configuring @{selectedAgent?.profiles?.username}</Text>
                 </View>
              </View>

              <Text style={styles.actionLabel}>ASSIGN RANK</Text>
              <View style={styles.tierOptionGrid}>
                 {[
                   { id: 'silver', label: 'SILVER AGENT', color: '#C0C0C0', icon: 'medal', limit: 7, count: members.filter(m => (m.tier || 'silver') === 'silver').length },
                   { id: 'gold', label: 'GOLD AGENT', color: '#FFD700', icon: 'crown', limit: 3, count: members.filter(m => m.tier === 'gold').length },
                   { id: 'diamond', label: 'DIAMOND AGENT', color: '#B9F2FF', icon: 'diamond', limit: 1, count: members.filter(m => m.tier === 'diamond').length }
                 ].map(t => (
                   <TouchableOpacity
                     key={t.id}
                     style={[styles.tierOptionBtn, selectedAgent?.tier === t.id && { borderColor: t.color, backgroundColor: t.color + '10' }]}
                     onPress={() => handleUpdateAgentTier(t.id)}
                   >
                      <MaterialCommunityIcons name={t.icon as any} size={20} color={t.color} />
                      <View style={{ flex: 1 }}>
                         <Text style={[styles.tierOptionText, { color: t.color }]}>{t.label}</Text>
                         <Text style={styles.tierLimitText}>{t.count}/{t.limit} Active</Text>
                      </View>
                      {selectedAgent?.tier === t.id && <Ionicons name="checkmark-circle" size={18} color={t.color} />}
                   </TouchableOpacity>
                 ))}
              </View>

              <Text style={[styles.actionLabel, { marginTop: 20 }]}>AUTHORITY</Text>
              <TouchableOpacity style={styles.adminToggleBtn} onPress={() => handleChangeRole(selectedAgent.user_id, selectedAgent.role)}>
                 <Ionicons name="shield-checkmark-outline" size={20} color={selectedAgent?.role === 'admin' ? THEME.secondary : '#444'} />
                 <Text style={[styles.adminToggleText, { color: selectedAgent?.role === 'admin' ? THEME.secondary : '#eee' }]}>
                    {selectedAgent?.role === 'admin' ? 'REVOKE ADMIN ACCESS' : 'GRANT ADMIN ACCESS'}
                 </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.removeAgentBtn} onPress={() => handleKickAgent(selectedAgent)}>
                 <Ionicons name="flash-outline" size={16} color={THEME.danger} />
                 <Text style={styles.removeAgentText}>TERMINATE AGENT LINK</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeBtn} onPress={() => setAgentActionModalVisible(false)}>
                 <Text style={styles.closeText}>DISMISS</Text>
              </TouchableOpacity>
           </View>
        </Pressable>
      </Modal>

      {/* CLUSTER ACTIVE MODULES & MEMBER POWERS MODAL */}
      <Modal visible={modulesModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.membersSheet}>
            <View style={styles.dragBar} />
            <View style={styles.sheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="options" size={20} color={THEME.accent} />
                <Text style={styles.sheetTitle}>ACTIVE MODULES & MEMBER POWERS</Text>
              </View>
              <TouchableOpacity onPress={() => setModulesModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={{ color: '#888', fontSize: 11, marginBottom: 15 }}>
              Enable or disable modules. Members only have access to enabled modules ({canToggleModules ? 'Gold/Diamond Power' : 'Read Only'}).
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={styles.modulesBox}>
                {[
                  {
                    id: 'polls',
                    label: 'Live Polls & Voting',
                    icon: 'stats-chart-outline',
                    onText: '🟢 MEMBERS CAN CREATE & VOTE',
                    offText: '🔴 POLLS DISABLED FOR MEMBERS',
                    desc: 'Real-time polls & surveys in cluster chat'
                  },
                  {
                    id: 'ai_bot',
                    label: 'Neural AI Assistant',
                    icon: 'hardware-chip-outline',
                    onText: '🟢 MEMBERS CAN CHAT WITH AI',
                    offText: '🔴 AI ASSISTANT DISABLED',
                    desc: 'Automated AI bot responses & moderation'
                  },
                  {
                    id: 'voice',
                    label: 'Voice Signals',
                    icon: 'mic-outline',
                    onText: '🟢 MEMBERS CAN SEND VOICE NOTES',
                    offText: '🔴 VOICE NOTES DISABLED',
                    desc: 'High-fidelity audio & voice messages'
                  },
                  {
                    id: 'media',
                    label: 'Ultra Media Gallery',
                    icon: 'image-outline',
                    onText: '🟢 MEMBERS CAN SHARE MEDIA',
                    offText: '🔴 MEDIA SHARING DISABLED',
                    desc: 'Photos, videos & HD attachments in chat'
                  },
                  {
                    id: 'gifts',
                    label: 'VX Virtual Gifts',
                    icon: 'gift-outline',
                    onText: '🟢 MEMBERS CAN SEND GIFTS',
                    offText: '🔴 VIRTUAL GIFTS DISABLED',
                    desc: 'Send virtual gifts & rewards to members'
                  },
                  {
                    id: 'sounds',
                    label: 'Sound Library Tracks',
                    icon: 'musical-notes-outline',
                    onText: '🟢 MEMBERS CAN SHARE SOUNDS',
                    offText: '🔴 SOUND SHARING DISABLED',
                    desc: 'Custom audio & music track sharing'
                  },
                  {
                    id: 'view_once',
                    label: 'View-Once Signals',
                    icon: 'eye-outline',
                    onText: '🟢 MEMBERS CAN SEND VIEW-ONCE',
                    offText: '🔴 VIEW-ONCE SIGNALS DISABLED',
                    desc: 'Self-destructing photo & video signals'
                  },
                  {
                    id: 'reactions',
                    label: 'Signal Reactions',
                    icon: 'heart-outline',
                    onText: '🟢 MEMBERS CAN REACT WITH EMOJIS',
                    offText: '🔴 EMOJI REACTIONS DISABLED',
                    desc: 'Emoji reactions on cluster chat messages'
                  },
                ].map((f, i) => {
                  const isActive = features.includes(f.id);
                  return (
                    <View key={f.id} style={[styles.moduleRow, i !== 0 && { borderTopWidth: 1, borderTopColor: '#111' }]}>
                      <View style={[styles.moduleIconBox, { backgroundColor: isActive ? 'rgba(124, 92, 255, 0.15)' : '#0A0A0F', borderColor: isActive ? THEME.accent : '#222' }]}>
                        <Ionicons name={f.icon as any} size={20} color={isActive ? THEME.accent : '#555'} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.moduleName}>{f.label}</Text>
                          <Switch
                            value={isActive}
                            onValueChange={() => toggleFeature(f.id)}
                            trackColor={{ false: '#111', true: THEME.accent }}
                            disabled={!canToggleModules}
                          />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <View style={[
                            styles.memberPowerBadge,
                            { backgroundColor: isActive ? 'rgba(0, 200, 81, 0.12)' : 'rgba(255, 255, 255, 0.04)', borderColor: isActive ? '#00C851' : '#2A2A35' }
                          ]}>
                            <Text style={[styles.memberPowerBadgeText, { color: isActive ? '#00C851' : '#888' }]}>
                              {isActive ? f.onText : '🔒 LEADER ONLY / INACTIVE'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.moduleDescText}>{f.desc}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              <TouchableOpacity onPress={() => setModulesModalVisible(false)} style={styles.doneBtn}>
                <Text style={styles.doneBtnText}>DONE</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#000', borderBottomWidth: 1, borderBottomColor: '#111' },
  headerIcon: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  saveBtn: { backgroundColor: THEME.accent, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  saveText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  scroll: { padding: 20, paddingBottom: 100 },
  powerCard: { backgroundColor: '#05050A', borderRadius: 20, padding: 16, borderWidth: 1.5, marginBottom: 20 },
  powerCardTitle: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  powerCardSub: { color: '#aaa', fontSize: 10, lineHeight: 15, marginTop: 4 },
  statsHud: { flexDirection: 'row', backgroundColor: THEME.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: THEME.border, marginBottom: 30 },
  statItem: { flex: 1, alignItems: 'center', gap: 5 },
  statVal: { color: '#fff', fontSize: 18, fontWeight: '900' },
  statLabel: { color: THEME.textDim, fontSize: 8, fontWeight: '900' },
  section: { marginBottom: 30 },
  sectionLabel: { color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 10 },
  tierBadgeBox: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  tierBadgeBoxText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  rulesInput: { backgroundColor: '#050508', color: '#fff', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#1A1A24', fontSize: 13, minHeight: 90, textAlignVertical: 'top' },
  rulesHintText: { color: '#555', fontSize: 9, marginTop: 6, fontStyle: 'italic' },
  modalInput: { backgroundColor: '#050508', color: '#fff', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#1A1A24', fontSize: 14 },
  tierGrid: { flexDirection: 'row', gap: 12 },
  tierCard: { flex: 1, height: 100, borderRadius: 22, backgroundColor: '#050508', borderWidth: 1, borderColor: '#111', justifyContent: 'center', alignItems: 'center' },
  tierName: { fontSize: 9, fontWeight: '900', marginTop: 10 },
  modulesBox: { backgroundColor: THEME.card, borderRadius: 25, borderWidth: 1, borderColor: THEME.border, padding: 10 },
  moduleRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  moduleIconBox: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  moduleName: { color: '#eee', fontSize: 13, fontWeight: '700' },
  memberPowerBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, marginTop: 4 },
  memberPowerBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  moduleDescText: { color: '#555', fontSize: 10, marginTop: 4 },
  adminBtn: { borderRadius: 18, overflow: 'hidden' },
  adminGradient: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
  adminBtnText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  membersSheet: { backgroundColor: '#0A0A0F', borderTopLeftRadius: 35, borderTopRightRadius: 35, height: '85%', padding: 25, borderTopWidth: 1, borderColor: THEME.border },
  dragBar: { width: 40, height: 4, backgroundColor: '#222', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  sheetTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#050508', borderRadius: 15, borderWidth: 1, borderColor: '#1A1A24', height: 50, marginBottom: 20 },
  searchInput: { flex: 1, color: '#fff', paddingHorizontal: 15, fontSize: 14 },
  memberRowItem: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#050508', borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#111' },
  diamondRow: { backgroundColor: 'rgba(185, 242, 255, 0.05)', borderColor: 'rgba(185, 242, 255, 0.2)' },
  memberAvatar: { width: 45, height: 45, borderRadius: 15, marginRight: 15, backgroundColor: '#111' },
  memberName: { color: '#eee', fontSize: 14, fontWeight: '700' },
  memberVx: { color: '#444', fontSize: 10, marginTop: 2, fontWeight: '700' },
  holdHint: { color: THEME.accent, fontSize: 7, fontWeight: '900', marginTop: 5, letterSpacing: 0.5, opacity: 0.6 },
  leaderBadge: { backgroundColor: 'rgba(255, 215, 0, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1, borderColor: '#FFD700', marginLeft: 5 },
  leaderBadgeText: { color: '#FFD700', fontSize: 6, fontWeight: '900' },
  adminBadge: { backgroundColor: 'rgba(0, 212, 255, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1, borderColor: THEME.secondary, marginLeft: 5 },
  adminBadgeText: { color: THEME.secondary, fontSize: 6, fontWeight: '900' },
  agentActionSheet: { backgroundColor: '#0A0A0F', borderRadius: 35, width: width * 0.9, padding: 25, borderWidth: 1, borderColor: '#1A1A24' },
  agentActionHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 25, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#111' },
  actionAvatar: { width: 50, height: 50, borderRadius: 18, borderWidth: 1, borderColor: '#333' },
  agentSub: { color: '#666', fontSize: 11, marginTop: 2 },
  actionLabel: { color: '#444', fontSize: 9, fontWeight: '900', marginBottom: 15 },
  tierOptionGrid: { gap: 10 },
  tierOptionBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 18, borderWidth: 1, backgroundColor: '#050508', gap: 15, borderColor: '#111' },
  tierOptionText: { fontSize: 12, fontWeight: '900' },
  tierLimitText: { color: '#333', fontSize: 9, fontWeight: '700' },
  adminToggleBtn: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#050508', borderRadius: 18, borderWidth: 1, gap: 15, borderColor: '#111' },
  adminToggleText: { fontSize: 12, fontWeight: '900' },
  removeAgentBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, backgroundColor: 'rgba(255, 68, 68, 0.05)', borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255, 68, 68, 0.1)', marginTop: 20 },
  removeAgentText: { color: THEME.danger, fontSize: 10, fontWeight: '900' },
  closeBtn: { marginTop: 20, padding: 10, alignSelf: 'center' },
  closeText: { color: '#444', fontSize: 12, fontWeight: '900' },
  doneBtn: { backgroundColor: THEME.accent, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  doneBtnText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 }
});
