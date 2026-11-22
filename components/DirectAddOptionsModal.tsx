import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Share,
  Platform,
  Alert
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { VOEXITheme } from '../constants/theme';
import * as Haptics from 'expo-haptics';

interface DirectAddOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: any;
  friends: any[];
  onRefreshData?: () => void;
}

export const DirectAddOptionsModal: React.FC<DirectAddOptionsModalProps> = ({
  visible,
  onClose,
  currentUser,
  friends,
  onRefreshData
}) => {
  const router = useRouter();
  const [activeSubTab, setActiveSubTab] = useState<'actions' | 'requests' | 'qr'>('actions');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (visible && currentUser?.id) {
      fetchRequests();
      fetchUserProfile();
    }
  }, [visible, currentUser]);

  const fetchUserProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();
      if (data) setUserProfile(data);
    } catch (e) {}
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          id,
          status,
          sender_id,
          profiles:sender_id (
            id,
            username,
            avatar_url,
            vx_id_number,
            channel_name
          )
        `)
        .eq('receiver_id', currentUser.id)
        .eq('status', 'pending');

      if (!error) {
        setPendingRequests(data || []);
      }
    } catch (e) {
      console.error('[FETCH_MODAL_REQ_ERR]', e);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleAcceptRequest = async (reqId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', reqId);

      if (error) throw error;

      setPendingRequests(prev => prev.filter(r => r.id !== reqId));
      onRefreshData?.();
      Alert.alert("LINK ESTABLISHED ⚡", "Friend request accepted successfully!");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to accept request.");
    }
  };

  const handleDeclineRequest = async (reqId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await supabase.from('friends').delete().eq('id', reqId);
      setPendingRequests(prev => prev.filter(r => r.id !== reqId));
      onRefreshData?.();
    } catch (e) {}
  };

  const handleShareProfile = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const handle = userProfile?.username || currentUser?.email?.split('@')[0] || 'creator';
      const shareUrl = `https://voexi.com/user/${handle}`;
      const message = `Connect with me on VOEXI Neural Network!\nUsername: @${handle}\nVX ID: ${userProfile?.vx_id_number || 'VX-9901'}\nLink: ${shareUrl}`;

      if (Platform.OS === 'web' && navigator.share) {
        await navigator.share({ title: 'VOEXI Profile', text: message, url: shareUrl });
      } else {
        await Share.share({ message });
      }
    } catch (e) {}
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <BlurView intensity={Platform.OS === 'ios' ? 70 : 90} tint="dark" style={StyleSheet.absoluteFill} />

        <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          {/* DRAG HANDLE */}
          <View style={styles.dragHandleBar} />

          {/* HEADER */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>DIRECT CONNECT HUB</Text>
              <Text style={styles.headerSub}>Instant Link, People Discovery & Neural QR</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* 3-WAY SUB-TAB SELECTOR */}
          <View style={styles.tabSelectorRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeSubTab === 'actions' && styles.tabBtnActive]}
              onPress={() => setActiveSubTab('actions')}
            >
              <Ionicons
                name="flash"
                size={14}
                color={activeSubTab === 'actions' ? '#FFD700' : '#888'}
              />
              <Text style={[styles.tabBtnText, activeSubTab === 'actions' && styles.tabBtnTextActive]}>
                Quick Actions
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeSubTab === 'requests' && styles.tabBtnActive]}
              onPress={() => setActiveSubTab('requests')}
            >
              <Ionicons
                name="person-add"
                size={14}
                color={activeSubTab === 'requests' ? '#A855F7' : '#888'}
              />
              <Text style={[styles.tabBtnText, activeSubTab === 'requests' && styles.tabBtnTextActive]}>
                Requests ({pendingRequests.length})
              </Text>
              {pendingRequests.length > 0 && <View style={styles.badgeDot} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeSubTab === 'qr' && styles.tabBtnActive]}
              onPress={() => setActiveSubTab('qr')}
            >
              <Ionicons
                name="qr-code"
                size={14}
                color={activeSubTab === 'qr' ? '#00F2FE' : '#888'}
              />
              <Text style={[styles.tabBtnText, activeSubTab === 'qr' && styles.tabBtnTextActive]}>
                My QR / Link
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB CONTENT */}
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 1. QUICK ACTIONS TAB */}
            {activeSubTab === 'actions' && (
              <View style={styles.tabContentBox}>
                <Text style={styles.sectionHeader}>PRIMARY NAVIGATION</Text>

                {/* START 1-ON-1 CHAT WITH FRIEND */}
                <Text style={styles.subSectionTitle}>NEW TRANSMISSION (SELECT FRIEND)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.friendsHorizontalList}>
                  {friends.length > 0 ? (
                    friends.map((friend) => (
                      <TouchableOpacity
                        key={friend.id}
                        style={styles.friendPill}
                        onPress={() => {
                          onClose();
                          router.push(`/menu/chat/${friend.id}`);
                        }}
                      >
                        <Image
                          source={{ uri: friend.avatar_url || 'https://via.placeholder.com/100' }}
                          style={styles.friendPillAvatar}
                        />
                        <Text style={styles.friendPillName} numberOfLines={1}>
                          {friend.username || friend.channel_name || 'Friend'}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.noFriendsText}>No direct contacts yet. Search below to add friends!</Text>
                  )}
                </ScrollView>

                {/* ACTION TILES */}
                <View style={styles.actionGrid}>
                  <TouchableOpacity
                    style={styles.actionTile}
                    onPress={() => {
                      onClose();
                      router.push('/menu/people');
                    }}
                  >
                    <LinearGradient colors={['#7C5CFF', '#4c1d95']} style={styles.tileIconCircle}>
                      <Ionicons name="search" size={22} color="#fff" />
                    </LinearGradient>
                    <View style={styles.tileTextCol}>
                      <Text style={styles.tileTitle}>Search People & Discover</Text>
                      <Text style={styles.tileDesc}>Find users by Neural ID, Name, or Username</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#666" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionTile}
                    onPress={() => {
                      onClose();
                      router.push('/menu/clusters?create=true');
                    }}
                  >
                    <LinearGradient colors={['#00F2FE', '#0077FF']} style={styles.tileIconCircle}>
                      <MaterialCommunityIcons name="account-group" size={22} color="#fff" />
                    </LinearGradient>
                    <View style={styles.tileTextCol}>
                      <Text style={styles.tileTitle}>Establish New Cluster</Text>
                      <Text style={styles.tileDesc}>Create private or public group chat channels</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 2. PENDING REQUESTS TAB */}
            {activeSubTab === 'requests' && (
              <View style={styles.tabContentBox}>
                <Text style={styles.sectionHeader}>INCOMING FRIEND REQUESTS</Text>

                {loadingRequests ? (
                  <ActivityIndicator color={VOEXITheme.colors.primary} style={{ marginVertical: 30 }} />
                ) : pendingRequests.length > 0 ? (
                  pendingRequests.map((req) => {
                    const prof = req.profiles;
                    return (
                      <View key={req.id} style={styles.reqCard}>
                        <Image
                          source={{ uri: prof?.avatar_url || 'https://via.placeholder.com/100' }}
                          style={styles.reqAvatar}
                        />
                        <View style={styles.reqMetaCol}>
                          <Text style={styles.reqName} numberOfLines={1}>
                            {prof?.username || prof?.channel_name || 'VOEXI Agent'}
                          </Text>
                          <Text style={styles.reqSub}>VX ID: {prof?.vx_id_number || 'VX-9000'}</Text>
                        </View>

                        <View style={styles.reqActionsRow}>
                          <TouchableOpacity
                            style={styles.acceptBtn}
                            onPress={() => handleAcceptRequest(req.id)}
                          >
                            <Ionicons name="checkmark" size={16} color="#fff" />
                            <Text style={styles.btnText}>Accept</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.declineBtn}
                            onPress={() => handleDeclineRequest(req.id)}
                          >
                            <Ionicons name="close" size={16} color="#ff4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyBox}>
                    <Ionicons name="checkmark-circle-outline" size={48} color="#444" />
                    <Text style={styles.emptyTitle}>ALL CLEAR</Text>
                    <Text style={styles.emptyDesc}>No pending friend requests right now.</Text>
                    <TouchableOpacity
                      style={styles.findPeopleBtn}
                      onPress={() => {
                        onClose();
                        router.push('/menu/people');
                      }}
                    >
                      <Ionicons name="person-add" size={16} color="#fff" />
                      <Text style={styles.findPeopleText}>Find People to Connect</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* 3. MY QR CODE & NEURAL LINK TAB */}
            {activeSubTab === 'qr' && (
              <View style={styles.tabContentBox}>
                <Text style={styles.sectionHeader}>YOUR NEURAL IDENTITY BADGE</Text>

                {/* QR CARD BADGE */}
                <LinearGradient
                  colors={['#181824', '#0d0d14']}
                  style={styles.qrCardContainer}
                >
                  <Image
                    source={{ uri: userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url || 'https://via.placeholder.com/120' }}
                    style={styles.qrAvatar}
                  />

                  <Text style={styles.qrUsername}>
                    @{userProfile?.username || currentUser?.email?.split('@')[0] || 'voexi_user'}
                  </Text>
                  <Text style={styles.qrVxId}>
                    ID: {userProfile?.vx_id_number || 'VX-9901-PRO'}
                  </Text>

                  {/* QR VISUAL CONTAINER */}
                  <View style={styles.qrVisualBox}>
                    <FontAwesome5 name="qrcode" size={110} color="#00F2FE" />
                  </View>

                  <Text style={styles.qrNote}>SCAN TO INSTANTLY CONNECT ON VOEXI</Text>
                </LinearGradient>

                {/* SHARE & SCAN BUTTONS */}
                <View style={styles.qrBtnRow}>
                  <TouchableOpacity style={styles.shareLinkBtn} onPress={handleShareProfile}>
                    <Ionicons name="share-social-outline" size={18} color="#fff" />
                    <Text style={styles.shareBtnText}>Share My Link</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.scanCameraBtn}
                    onPress={() => {
                      onClose();
                      router.push('/menu/people');
                    }}
                  >
                    <Ionicons name="camera-outline" size={18} color="#fff" />
                    <Text style={styles.scanBtnText}>Scan Code</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetContainer: {
    backgroundColor: '#0a0a0f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '85%',
  },
  dragHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerSub: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabSelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#12121c',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#1e1e2d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tabBtnText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#fff',
    fontWeight: '900',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff4444',
    marginLeft: -2,
  },
  scrollContent: {
    maxHeight: 480,
  },
  tabContentBox: {
    paddingBottom: 20,
  },
  sectionHeader: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  subSectionTitle: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  friendsHorizontalList: {
    marginBottom: 18,
  },
  friendPill: {
    alignItems: 'center',
    marginRight: 14,
    width: 60,
  },
  friendPillAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#7C5CFF',
    marginBottom: 4,
  },
  friendPillName: {
    color: '#ccc',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  noFriendsText: {
    color: '#666',
    fontSize: 11,
    fontStyle: 'italic',
    marginVertical: 10,
  },
  actionGrid: {
    gap: 10,
  },
  actionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12121c',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  tileIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileTextCol: {
    flex: 1,
  },
  tileTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  tileDesc: {
    color: '#888',
    fontSize: 10,
    marginTop: 2,
  },
  reqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12121c',
    padding: 10,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  reqAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#A855F7',
  },
  reqMetaCol: {
    flex: 1,
    marginLeft: 10,
  },
  reqName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  reqSub: {
    color: '#888',
    fontSize: 10,
    marginTop: 2,
  },
  reqActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  declineBtn: {
    padding: 6,
    backgroundColor: 'rgba(255,68,68,0.15)',
    borderRadius: 8,
  },
  btnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyTitle: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 10,
  },
  emptyDesc: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
  },
  findPeopleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C5CFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
    gap: 6,
  },
  findPeopleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  qrCardContainer: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.2)',
    marginBottom: 16,
  },
  qrAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#00F2FE',
    marginBottom: 8,
  },
  qrUsername: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  qrVxId: {
    color: '#00F2FE',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 1,
  },
  qrVisualBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginVertical: 16,
  },
  qrNote: {
    color: '#666',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  qrBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shareLinkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C5CFF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  scanCameraBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1e2d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  scanBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
});

export default DirectAddOptionsModal;
