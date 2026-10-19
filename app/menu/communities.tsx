import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Modal, TextInput, Dimensions, KeyboardAvoidingView, Platform, Pressable, Switch } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { uploadToBunny } from '../../lib/bunnyStorage';
import { useTheme } from '../../hooks/useTheme';

const { width, height } = Dimensions.get('window');
const THEME = {
  bg: '#000',
  card: '#0D0D12',
  accent: '#7C5CFF',
  accentSecondary: '#00D4FF',
  text: '#FFFFFF',
  textDim: '#8E8E93',
  border: '#1C1C1E',
  silver: '#C0C0C0',
  gold: '#FFD700',
  diamond: '#B9F2FF'
};

const CATEGORIES = ['Technology', 'Gaming', 'Entertainment', 'Music', 'Creator', 'Vibe', 'News', 'Lifestyle'];

export default function ClustersScreen() {
  const router = useRouter();
  const { create } = useLocalSearchParams();
  const { theme: themeMode, isLight } = useTheme();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Search/Join states
  const [joinSearch, setJoinSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Creation States
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('Technology');
  const [newGroupType, setNewGroupType] = useState<'public' | 'private' | 'friends'>('public');
  const [newGroupPassword, setNewGroupPassword] = useState('');
  const [groupLogo, setGroupLogo] = useState<string | null>(null);
  const [isClusterAgreed, setIsClusterAgreed] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchGroups = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (user) {
      const { data: memberships } = await supabase.from('group_members').select('group_id, role').eq('user_id', user.id);
      if (memberships && memberships.length > 0) {
        const groupIds = memberships.map(m => m.group_id);
        const { data: groupsList } = await supabase.from('groups').select('*').in('id', groupIds);
        if (groupsList) {
          const chats = await Promise.all(groupsList.map(async (group) => {
            const membership = memberships.find(m => m.group_id === group.id);
            const { data: lastMsg } = await supabase.from('messages').select('content, created_at, type, sender_id, is_read').eq('group_id', group.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
            const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('group_id', group.id).neq('sender_id', user.id).eq('is_read', false);
            return { ...group, lastMessage: lastMsg, unreadCount: count || 0, userRole: membership?.role };
          }));
          setGroups(chats.sort((a, b) => new Date(b.lastMessage?.created_at || 0).getTime() - new Date(a.lastMessage?.created_at || 0).getTime()));
        }
      } else setGroups([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGroups();
    if (create === 'true') {
      setCreateModalVisible(true);
    }
  }, [create]);

  // Fetch all public clusters when Discover modal opens or search changes
  useEffect(() => {
    if (joinModalVisible) {
      handleSearchGroups();
    }
  }, [joinModalVisible]);

  // Real-time search whenever joinSearch changes (even 1 letter!)
  useEffect(() => {
    if (!joinModalVisible) return;
    const timer = setTimeout(() => {
      handleSearchGroups();
    }, 150);

    return () => clearTimeout(timer);
  }, [joinSearch]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase().trim();
    return groups.filter(g =>
      g.name?.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q) ||
      g.category?.toLowerCase().includes(q) ||
      g.id?.toLowerCase().includes(q)
    );
  }, [groups, searchQuery]);

  const pickClusterLogo = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setGroupLogo(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  const handleSearchGroups = async () => {
    setSearching(true);
    try {
      const term = joinSearch.trim().toLowerCase();

      // Fetch all groups from database
      const { data: allGroups } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (allGroups && allGroups.length > 0) {
        if (!term) {
          // Empty search: show all public clusters
          setSearchResults(allGroups);
        } else {
          // Filter 1 letter or more across Name, Description, Category, ID
          const matches = allGroups.filter(g =>
            g.name?.toLowerCase().includes(term) ||
            g.description?.toLowerCase().includes(term) ||
            g.category?.toLowerCase().includes(term) ||
            g.id?.toLowerCase().includes(term)
          );
          setSearchResults(matches);
        }
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      console.error("[CLUSTER_SEARCH_ERROR]", e);
    } finally {
      setSearching(false);
    }
  };

  const handleJoinCluster = async (groupId: string) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (existing) {
        Alert.alert("Info", "You are already a member of this cluster.");
        setJoinModalVisible(false);
        return;
      }

      const target = searchResults.find(r => r.id === groupId);
      if (target?.type === 'private') {
        Alert.alert("Private Cluster", "This cluster is private. Please join via a direct Invite Link or contact the Leader.");
        return;
      }

      const { error } = await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: currentUser.id,
        role: 'member'
      });

      if (!error) {
        Alert.alert("Success", "Welcome to the cluster!");
        setJoinModalVisible(false);
        setJoinSearch('');
        setSearchResults([]);
        fetchGroups();
      } else {
        if (error.code === '23505') Alert.alert("Note", "Syncing... You are already in this cluster.");
        else Alert.alert("Error", error.message);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return Alert.alert("Required", "Cluster name is required.");
    if (newGroupType === 'private' && !newGroupPassword.trim()) {
      return Alert.alert("Required", "Please set an Access Password for your Private Cluster.");
    }
    if (!isClusterAgreed) {
      return Alert.alert(
        "AGREEMENT REQUIRED",
        "Please agree to the Terms of Service and Community Guidelines to establish a cluster."
      );
    }

    setIsCreating(true);
    try {
      let activeUser = currentUser;
      if (!activeUser) {
        const { data: { user } } = await supabase.auth.getUser();
        activeUser = user;
      }

      if (!activeUser) {
        setIsCreating(false);
        return Alert.alert("Authentication Required", "Please log in to establish a cluster.");
      }

      let finalLogo = groupLogo;
      if (groupLogo && !groupLogo.startsWith('http')) {
        try {
          finalLogo = await uploadToBunny(groupLogo, 'image');
        } catch (e) {
          console.warn("[LOGO_UPLOAD_NOTICE]", e);
        }
      }

      const { data, error } = await supabase.from('groups').insert({
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || null,
        category: newGroupCategory,
        type: newGroupType,
        password: newGroupType === 'private' ? newGroupPassword.trim() : null,
        avatar_url: finalLogo || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(newGroupName)}`,
        created_by: activeUser.id
      }).select().single();

      if (error) {
        console.error("[CREATE_CLUSTER_ERROR]", error);
        Alert.alert("Establish Failed", error.message);
      } else if (data) {
        // Explicitly insert leader into group_members to guarantee membership
        await supabase.from('group_members').upsert({
          group_id: data.id,
          user_id: activeUser.id,
          role: 'leader',
          tier: 'diamond'
        }, { onConflict: 'group_id, user_id' }).catch(() => {});

        setCreateModalVisible(false);
        setNewGroupName('');
        setNewGroupDesc('');
        setNewGroupCategory('Technology');
        setNewGroupType('public');
        setNewGroupPassword('');
        setGroupLogo(null);
        setIsClusterAgreed(false);
        await fetchGroups();
        Alert.alert("CLUSTER ESTABLISHED", `Cluster "${newGroupName}" is live!`);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to establish cluster.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <LinearGradient colors={isLight ? ['#fff', '#f9f9f9'] : ['#000', '#050505']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/menu')}
          style={[styles.backBtn, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]}
        >
          <Ionicons name="chevron-back" size={24} color={isLight ? '#000' : "#fff"} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>CLUSTERS</Text>
          <View style={styles.statusDot} />
        </View>
        <TouchableOpacity
          onPress={() => setCreateModalVisible(true)}
          style={styles.addBtn}
        >
          <LinearGradient colors={[THEME.accent, THEME.accentSecondary]} style={styles.addBtnGradient}>
            <Ionicons name="add" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBarContainer}>
        <View style={[styles.searchBox, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]}>
          <Ionicons name="search" size={18} color={THEME.textDim} />
          <TextInput
            placeholder="Search clusters..."
            placeholderTextColor={THEME.textDim}
            style={[styles.searchInput, isLight && { color: '#000' }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={THEME.textDim} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isLight && { color: '#999' }]}>YOUR ACTIVE LINKS</Text>
          <TouchableOpacity onPress={() => setJoinModalVisible(true)} style={styles.joinBtn}>
            <Text style={styles.joinBtnText}>DISCOVER</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator color={THEME.accent} size="large" />
            <Text style={styles.loaderText}>Syncing Clusters...</Text>
          </View>
        ) : (
          groups.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconContainer}>
                <MaterialCommunityIcons name="molecule" size={80} color={isLight ? '#F5F5F5' : THEME.card} />
                <View style={[styles.emptyIconOverlay, isLight && { backgroundColor: '#FFF', borderColor: '#EEE' }]}>
                  <Ionicons name="link-outline" size={30} color={THEME.accent} />
                </View>
              </View>
              <Text style={[styles.emptyTitle, isLight && { color: '#000' }]}>No Clusters Established</Text>
              <Text style={styles.emptySubtitle}>Join or create a cluster to start connecting with other creators.</Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setCreateModalVisible(true)}
              >
                <Text style={styles.emptyActionText}>CREATE CLUSTER</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.groupsList}>
              {filteredGroups.map((g) => {
                  const isLastMessageMine = g.lastMessage?.sender_id === currentUser?.id;
                  const time = g.lastMessage ? new Date(g.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                  // Tier-specific styling
                  const tierColor = g.tier === 'diamond' ? THEME.diamond : g.tier === 'gold' ? THEME.gold : THEME.silver;
                  const tierIcon = g.tier === 'diamond' ? 'diamond' : g.tier === 'gold' ? 'crown' : 'medal';

                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.groupCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }, { borderLeftColor: tierColor, borderLeftWidth: 3 }]}
                      onPress={() => router.push(`/menu/chat/${g.id}?type=group`)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.avatarWrapper}>
                        <Image source={{ uri: g.avatar_url }} style={[styles.groupAvatar, { borderColor: tierColor + '44', borderWidth: 1 }]} />
                        <View style={[styles.tierBadgeMini, { backgroundColor: tierColor }]}>
                          <MaterialCommunityIcons name={tierIcon as any} size={8} color="#000" />
                        </View>
                        {g.unreadCount > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{g.unreadCount > 99 ? '99+' : g.unreadCount}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.contentContainer}>
                        <View style={styles.nameRow}>
                          <View style={styles.nameBadgeContainer}>
                            <Text style={[styles.groupName, isLight && { color: '#000' }]} numberOfLines={1}>{g.name}</Text>
                            <View style={[styles.tierLabel, { backgroundColor: tierColor + '15', borderColor: tierColor + '30' }]}>
                              <Text style={[styles.tierLabelText, { color: tierColor }]}>{g.tier?.toUpperCase() || 'SILVER'}</Text>
                            </View>
                            {g.userRole === 'leader' && (
                              <View style={styles.roleBadge}>
                                <Text style={styles.roleText}>LEADER</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.timeText, g.unreadCount > 0 && { color: THEME.accent }]}>{time}</Text>
                        </View>

                        <View style={styles.lastMsgRow}>
                          {isLastMessageMine && (
                            <Ionicons
                              name={g.lastMessage?.is_read ? "checkmark-done" : "checkmark"}
                              size={14}
                              color={g.lastMessage?.is_read ? THEME.accentSecondary : '#444'}
                              style={{ marginRight: 5 }}
                            />
                          )}
                          <Text style={[styles.lastMsg, g.unreadCount > 0 && { color: isLight ? '#000' : '#FFF', fontWeight: '600' }]} numberOfLines={1}>
                            {g.lastMessage?.type === 'text' ? g.lastMessage?.content : (g.lastMessage ? `Sent a ${g.lastMessage.type}` : 'Recruiting agents...')}
                          </Text>
                        </View>

                        <View style={styles.groupMetaRow}>
                           <View style={styles.metaItem}>
                              <Ionicons name="people-outline" size={10} color={THEME.textDim} />
                              <Text style={styles.metaText}>{g.member_count || '1'} Agents</Text>
                           </View>
                           <View style={styles.metaDivider} />
                           <Text style={styles.metaTextID}>ID: {g.id.split('-')[0].toUpperCase()}</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.settingsBtn}
                        onPress={() => router.push({ pathname: '/menu/cluster-settings', params: { clusterId: g.id } })}
                      >
                        <Ionicons name="chevron-forward" size={18} color={isLight ? '#CCC' : "#333"} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
            </View>
          )
        )}
      </ScrollView>

      {/* JOIN MODAL */}
      <Modal visible={joinModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setJoinModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{justifyContent: 'flex-end', flex: 1}}>
            <Pressable style={[styles.modalContent, isLight && { backgroundColor: '#FFF', borderColor: '#EEE' }]} onPress={e => e.stopPropagation()}>
              <View style={[styles.dragBar, isLight && { backgroundColor: '#EEE' }]} />
              <Text style={[styles.modalTitle, isLight && { color: '#000' }]}>DISCOVER CLUSTERS</Text>

              <View style={[styles.modalSearchContainer, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]}>
                <TextInput
                  style={[styles.modalSearchInput, isLight && { color: '#000' }]}
                  placeholder="Enter Cluster Name or ID..."
                  placeholderTextColor={THEME.textDim}
                  value={joinSearch}
                  onChangeText={setJoinSearch}
                  onSubmitEditing={handleSearchGroups}
                  autoFocus
                />
                <TouchableOpacity style={styles.searchBtnInner} onPress={handleSearchGroups}>
                  {searching ? (
                    <ActivityIndicator size="small" color={THEME.accent} />
                  ) : (
                    <Ionicons name="search" size={20} color={THEME.accent} />
                  )}
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.resultsScroll} showsVerticalScrollIndicator={false}>
                {!searching && searchResults.length === 0 && joinSearch.trim() !== '' && (
                  <View style={styles.noResultsBox}>
                    <Ionicons name="ios-search-outline" size={40} color={isLight ? '#F5F5F5' : THEME.card} />
                    <Text style={styles.noResultsText}>No clusters found.</Text>
                  </View>
                )}

                {searchResults.map(res => (
                  <View key={res.id} style={[styles.resItem, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
                    <Image source={{uri: res.avatar_url}} style={styles.resAvatar} />
                    <View style={{flex: 1}}>
                      <Text style={[styles.resName, isLight && { color: '#000' }]}>{res.name}</Text>
                      <Text style={styles.resMeta}>{res.type?.toUpperCase()} • {res.category || 'COMMUNITY'}</Text>
                    </View>
                    <TouchableOpacity style={styles.joinActionBtn} onPress={() => handleJoinCluster(res.id)}>
                      <Text style={styles.joinActionText}>JOIN</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              <TouchableOpacity
                onPress={() => { setJoinModalVisible(false); setSearchResults([]); setJoinSearch(''); }}
                style={styles.closeModalBtn}
              >
                <Text style={styles.closeModalText}>DISMISS</Text>
              </TouchableOpacity>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* FULL-FEATURED ESTABLISH CLUSTER MODAL */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View style={[styles.createModalContent, isLight && { backgroundColor: '#FFF', borderColor: '#EEE' }]}>
              <View style={[styles.dragBar, isLight && { backgroundColor: '#EEE' }]} />
              <Text style={[styles.createModalTitle, isLight && { color: '#000' }]}>ESTABLISH CLUSTER</Text>
              <Text style={styles.createModalSubtitle}>Set up your channel, rules, and privacy mode.</Text>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.6 }}>
                {/* LOGO PICKER */}
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                  <TouchableOpacity onPress={pickClusterLogo} activeOpacity={0.8}>
                    <View style={[styles.clusterLogoCircle, isLight && { backgroundColor: '#F0F0F0', borderColor: THEME.accent }]}>
                      {groupLogo ? (
                        <Image source={{ uri: groupLogo }} style={styles.clusterLogoImg} />
                      ) : (
                        <Ionicons name="camera-outline" size={28} color={isLight ? '#888' : '#888'} />
                      )}
                      <View style={styles.clusterLogoCamBadge}>
                        <Ionicons name="add" size={12} color="#fff" />
                      </View>
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.logoHintText}>CHOOSE CLUSTER LOGO</Text>
                </View>

                {/* CLUSTER NAME */}
                <View style={styles.createInputContainer}>
                  <Text style={styles.inputLabel}>CLUSTER NAME *</Text>
                  <TextInput
                    style={[styles.modalInput, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE', color: '#000' }]}
                    placeholder="e.g. Creator Hub, Cyber AI, Tech Vibe"
                    placeholderTextColor={THEME.textDim}
                    value={newGroupName}
                    onChangeText={setNewGroupName}
                  />
                </View>

                {/* DESCRIPTION / BIO */}
                <View style={styles.createInputContainer}>
                  <Text style={styles.inputLabel}>DESCRIPTION / PURPOSE</Text>
                  <TextInput
                    style={[styles.modalInput, { height: 70, textAlignVertical: 'top' }, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE', color: '#000' }]}
                    placeholder="Describe the topic and rules for agents..."
                    placeholderTextColor={THEME.textDim}
                    value={newGroupDesc}
                    onChangeText={setNewGroupDesc}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* CATEGORY SELECTOR */}
                <View style={styles.createInputContainer}>
                  <Text style={styles.inputLabel}>CATEGORY</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {CATEGORIES.map((cat) => {
                      const isSel = newGroupCategory.toLowerCase() === cat.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setNewGroupCategory(cat)}
                          style={[
                            styles.categoryChip,
                            isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' },
                            isSel && { backgroundColor: THEME.accent, borderColor: THEME.accent }
                          ]}
                        >
                          <Text style={[styles.categoryChipText, isSel && { color: '#fff', fontWeight: 'bold' }]}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* PRIVACY TYPE */}
                <View style={styles.createInputContainer}>
                  <Text style={styles.inputLabel}>PRIVACY TYPE (PUBLIC / PRIVATE)</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      { id: 'public', label: 'Public', icon: 'earth-outline' },
                      { id: 'private', label: 'Private', icon: 'lock-closed-outline' },
                      { id: 'friends', label: 'Friends', icon: 'people-outline' }
                    ].map((typeItem) => {
                      const isSel = newGroupType === typeItem.id;
                      return (
                        <TouchableOpacity
                          key={typeItem.id}
                          onPress={() => setNewGroupType(typeItem.id as any)}
                          style={[
                            styles.typePill,
                            isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' },
                            isSel && { backgroundColor: 'rgba(124, 92, 255, 0.18)', borderColor: THEME.accent }
                          ]}
                        >
                          <Ionicons name={typeItem.icon as any} size={14} color={isSel ? THEME.accent : '#888'} />
                          <Text style={[styles.typePillText, isSel && { color: THEME.accent, fontWeight: 'bold' }]}>
                            {typeItem.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* CLUSTER PASSWORD FOR PRIVATE */}
                {newGroupType === 'private' && (
                  <View style={styles.createInputContainer}>
                    <Text style={styles.inputLabel}>ACCESS PASSWORD *</Text>
                    <TextInput
                      style={[styles.modalInput, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE', color: '#000' }]}
                      placeholder="Set password for private agents"
                      placeholderTextColor={THEME.textDim}
                      value={newGroupPassword}
                      onChangeText={setNewGroupPassword}
                      secureTextEntry
                    />
                  </View>
                )}

                {/* MANDATORY TERMS & COMMUNITY GUIDELINES AGREEMENT ROW */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setIsClusterAgreed(!isClusterAgreed)}
                  style={[
                    styles.clusterAgreeRow,
                    isClusterAgreed && { borderColor: THEME.accent, backgroundColor: 'rgba(124, 92, 255, 0.12)' },
                    isLight && { backgroundColor: isClusterAgreed ? 'rgba(124, 92, 255, 0.1)' : '#F5F5F5', borderColor: isClusterAgreed ? THEME.accent : '#EEE' }
                  ]}
                >
                  <View style={[
                    styles.checkboxCircle,
                    isClusterAgreed && { backgroundColor: THEME.accent, borderColor: THEME.accent }
                  ]}>
                    {isClusterAgreed && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.clusterAgreeText, isLight && { color: '#333' }]}>
                      I agree to VOEXI{' '}
                      <Text style={styles.clusterAgreeLink} onPress={(e) => { e.stopPropagation(); router.push('/menu/terms'); }}>Terms of Service</Text>
                      {' '}and{' '}
                      <Text style={styles.clusterAgreeLink} onPress={(e) => { e.stopPropagation(); router.push('/menu/community-guidelines'); }}>Community Guidelines</Text>.
                    </Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>

              <TouchableOpacity
                style={[
                  styles.createConfirmBtn,
                  (!isClusterAgreed || !newGroupName.trim()) && { opacity: 0.4 }
                ]}
                onPress={handleCreateGroup}
                disabled={!isClusterAgreed || !newGroupName.trim() || isCreating}
              >
                <LinearGradient
                  colors={isClusterAgreed && newGroupName.trim() ? [THEME.accent, THEME.accentSecondary] : ['#333', '#222']}
                  style={styles.btnGradient}
                >
                  {isCreating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="add-circle-outline" size={18} color={isClusterAgreed && newGroupName.trim() ? '#fff' : '#888'} />
                      <Text style={[styles.btnText, (!isClusterAgreed || !newGroupName.trim()) && { color: '#888' }]}>
                        CREATE COMMUNITY
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0A0A0F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1A1A1F'
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase'
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.accent,
    marginLeft: 8,
    shadowColor: THEME.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 5
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden'
  },
  addBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    marginBottom: 20
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0F',
    paddingHorizontal: 15,
    height: 50,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#1A1A1F'
  },
  searchInput: { flex: 1, color: '#fff', marginLeft: 12, fontSize: 15 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 5
  },
  sectionTitle: { color: THEME.textDim, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  joinBtn: {
    backgroundColor: 'rgba(124, 92, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.2)'
  },
  joinBtnText: { color: THEME.accent, fontSize: 10, fontWeight: '900' },
  groupsList: { gap: 12 },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D12',
    padding: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1A1A1F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  avatarWrapper: { position: 'relative', marginRight: 15 },
  groupAvatar: { width: 60, height: 60, borderRadius: 20, backgroundColor: '#1C1C1E' },
  unreadBadge: {
    position: 'absolute',
    bottom: -4,
    left: -4,
    backgroundColor: THEME.accent,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0D0D12',
    zIndex: 11
  },
  tierBadgeMini: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0D0D12',
    zIndex: 10
  },
  tierLabel: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 8
  },
  tierLabelText: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  groupMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  metaText: {
    color: THEME.textDim,
    fontSize: 9,
    fontWeight: '700'
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#333'
  },
  metaTextID: {
    color: '#333',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  unreadText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  contentContainer: { flex: 1, justifyContent: 'center' },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  nameBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  groupName: { color: '#fff', fontSize: 16, fontWeight: '700', marginRight: 8 },
  roleBadge: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)'
  },
  roleText: { color: THEME.accentSecondary, fontSize: 7, fontWeight: '900' },
  timeText: { color: THEME.textDim, fontSize: 10, fontWeight: '500' },
  lastMsgRow: { flexDirection: 'row', alignItems: 'center' },
  lastMsg: { color: THEME.textDim, fontSize: 13, flex: 1 },
  settingsBtn: { padding: 4, marginLeft: 8 },
  loaderContainer: { alignItems: 'center', marginTop: 100 },
  loaderText: { color: THEME.textDim, marginTop: 15, fontSize: 12, fontWeight: '600' },
  emptyBox: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIconContainer: { position: 'relative', marginBottom: 20 },
  emptyIconOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }],
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#111'
  },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 10 },
  emptySubtitle: { color: THEME.textDim, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyActionBtn: {
    marginTop: 25,
    backgroundColor: THEME.accent,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 15
  },
  emptyActionText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' },
  modalContent: {
    backgroundColor: '#0D0D12',
    padding: 25,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    borderWidth: 1,
    borderColor: '#1C1C1E'
  },
  dragBar: { width: 36, height: 5, backgroundColor: '#2C2C2E', borderRadius: 2.5, alignSelf: 'center', marginBottom: 25 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '900', textAlign: 'center', marginBottom: 25, letterSpacing: 1 },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#050505',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#1C1C1E'
  },
  modalSearchInput: { flex: 1, color: '#fff', padding: 15, fontSize: 15 },
  searchBtnInner: { padding: 15 },
  resultsScroll: { maxHeight: 350, marginTop: 10 },
  noResultsBox: { alignItems: 'center', paddingVertical: 40 },
  noResultsText: { color: THEME.textDim, marginTop: 10, fontSize: 14 },
  resItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#16161C',
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1C1C1E'
  },
  resAvatar: { width: 45, height: 45, borderRadius: 15, marginRight: 15 },
  resName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  resMeta: { color: THEME.textDim, fontSize: 9, fontWeight: '800', marginTop: 3 },
  joinActionBtn: {
    backgroundColor: THEME.accent,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10
  },
  joinActionText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  closeModalBtn: { marginTop: 15, padding: 15, alignItems: 'center' },
  closeModalText: { color: THEME.textDim, fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  createModalContent: {
    backgroundColor: '#0D0D12',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 25,
    paddingBottom: 35,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    maxHeight: height * 0.85
  },
  createModalTitle: { color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 4, letterSpacing: 1 },
  createModalSubtitle: { color: THEME.textDim, fontSize: 11, textAlign: 'center', marginBottom: 20 },
  clusterLogoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#050505',
    borderWidth: 2,
    borderColor: THEME.accent,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  clusterLogoImg: { width: '100%', height: '100%' },
  clusterLogoCamBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: THEME.accent,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center'
  },
  logoHintText: { color: THEME.textDim, fontSize: 9, fontWeight: '900', marginTop: 8, letterSpacing: 1 },
  createInputContainer: { marginBottom: 18 },
  inputLabel: { color: THEME.accent, fontSize: 9, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
  modalInput: {
    backgroundColor: '#050505',
    color: '#fff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    fontSize: 14
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#1C1C1E'
  },
  categoryChipText: { color: THEME.textDim, fontSize: 11 },
  typePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#1C1C1E'
  },
  typePillText: { color: THEME.textDim, fontSize: 12 },
  clusterAgreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 15,
    marginBottom: 20,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#555',
    justifyContent: 'center',
    alignItems: 'center'
  },
  clusterAgreeText: { color: '#888', fontSize: 11, lineHeight: 16 },
  clusterAgreeLink: { color: THEME.accent, fontWeight: 'bold', textDecorationLine: 'underline' },
  createConfirmBtn: { borderRadius: 15, overflow: 'hidden', marginTop: 15 },
  btnGradient: { padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  cancelBtn: { padding: 12, marginTop: 5, alignItems: 'center' },
  cancelBtnText: { color: THEME.textDim, fontWeight: '700', fontSize: 12 }
});
