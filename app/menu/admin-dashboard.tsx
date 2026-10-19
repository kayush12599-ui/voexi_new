import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';

import { SERVER_IP, AVATAR_SERVER_PORT } from '../../constants/config';
import { KisanService, KisanApplicationRecord } from '../../lib/kisanService';
import { StudentService, StudentApplicationRecord } from '../../lib/studentService';
import { EmailService } from '../../lib/emailService';
import { EmailTemplates } from '../../lib/emailTemplate';
import { supabase } from '../../lib/supabase';

const SERVER_BASE_URL = `http://${SERVER_IP}:${AVATAR_SERVER_PORT}`;

export default function AdminDashboardScreen() {
  const router = useRouter();

  // Admin Auth State
  const [adminUserId, setAdminUserId] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Kisan Applications Moderation State
  const [kisanApps, setKisanApps] = useState<KisanApplicationRecord[]>([]);
  const [kisanFilter, setKisanFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [isKisanLoading, setIsKisanLoading] = useState<boolean>(false);

  // Student Applications Moderation State
  const [studentApps, setStudentApps] = useState<StudentApplicationRecord[]>([]);
  const [studentFilter, setStudentFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [isStudentLoading, setIsStudentLoading] = useState<boolean>(false);

  // Channel Ownership Transfer Moderation State
  const [transferApps, setTransferApps] = useState<any[]>([]);
  const [isTransferLoading, setIsTransferLoading] = useState<boolean>(false);
  const [transferFilter, setTransferFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  const [reviewReason, setReviewReason] = useState<string>('');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // Server & Asset State
  const [serverOnline, setServerOnline] = useState<boolean>(false);
  const [serverStats, setServerStats] = useState<{ totalFiles: number; storageMb: string }>({ totalFiles: 0, storageMb: '0' });
  const [serverModels, setServerModels] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Admin Upload State
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('EMOTES');
  const [diamonds, setDiamonds] = useState('590');
  const [selected3DFile, setSelected3DFile] = useState<any>(null);
  const [selectedThumbFile, setSelectedThumbFile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    checkServerAndFetchData();
    checkAdminRoleAndFetchData();
  }, []);

  const checkAdminRoleAndFetchData = async () => {
    try {
      setIsKisanLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const currentUid = authData?.user?.id;
      if (!currentUid) return;

      setAdminUserId(currentUid);
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', currentUid).maybeSingle();
      const adminRole = prof?.role === 'admin';
      setIsAdmin(adminRole);

      if (adminRole) {
        const apps = await KisanService.getAdminPendingApplications();
        setKisanApps(apps);
        fetchStudentApps();
        fetchTransferApps();
      }
    } catch (e) {
      console.warn('[ADMIN_ROLE_FETCH]', e);
    } finally {
      setIsKisanLoading(false);
    }
  };

  const fetchStudentApps = async () => {
    try {
      setIsStudentLoading(true);
      const { data, error } = await supabase
        .from('student_applications')
        .select('*, profiles:user_id(username, channel_name, email, avatar_url)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setStudentApps(data as any);
      }
    } catch (e) {
      console.warn('[ADMIN_STUDENT_FETCH]', e);
    } finally {
      setIsStudentLoading(false);
    }
  };

  const fetchTransferApps = async () => {
    try {
      setIsTransferLoading(true);
      const { data, error } = await supabase
        .from('security_logs')
        .select('*')
        .eq('event_type', 'channel_ownership_transfer_requested')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const parsed = data.map((log: any) => {
          let details: any = {};
          try { details = JSON.parse(log.details); } catch (e) {}
          return {
            id: log.id,
            user_id: log.user_id,
            cert_id: details.certificate_id || 'VX-XFR-000000',
            channel_name: details.channel_name || 'Station',
            channel_category: details.channel_category || 'Entertainment',
            status: details.status || 'pending_admin_approval',
            current_owner: details.current_owner || {},
            new_owner: details.new_owner || {},
            created_at: log.created_at || details.transferred_at || new Date().toISOString()
          };
        });
        setTransferApps(parsed);
      }
    } catch (e) {
      console.warn('[ADMIN_TRANSFER_FETCH]', e);
    } finally {
      setIsTransferLoading(false);
    }
  };

  const handleReviewTransferApp = async (app: any, decision: 'approved' | 'rejected') => {
    if (!adminUserId) {
      Alert.alert('Unauthorized', 'Admin session active required.');
      return;
    }

    if (decision === 'rejected' && !reviewReason) {
      Alert.alert('Rejection Reason Required', 'Please type a rejection reason for this ownership transfer.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const newStatus = decision === 'approved' ? 'approved_by_admin' : 'rejected_by_admin';

      // 1. Log approval/rejection event
      await supabase.from('security_logs').insert({
        user_id: app.user_id,
        event_type: `channel_transfer_${decision}`,
        details: JSON.stringify({
          certificate_id: app.cert_id,
          channel_name: app.channel_name,
          status: newStatus,
          reviewed_by: adminUserId,
          review_reason: reviewReason || 'Reviewed via Admin Dashboard',
          reviewed_at: new Date().toISOString(),
          current_owner: app.current_owner,
          new_owner: app.new_owner
        })
      });

      // 2. If approved, update station details
      if (decision === 'approved') {
        await supabase.from('profiles').update({
          channel_name: `${app.channel_name} (Assigned: ${app.new_owner.name || 'New Owner'})`,
          bio: `Station ownership officially transferred to ${app.new_owner.name} (${app.new_owner.email}). Certificate: ${app.cert_id}`,
          updated_at: new Date().toISOString()
        }).eq('id', app.user_id);
      }

      // 3. Dispatch Notification Emails
      if (decision === 'approved') {
        if (app.current_owner.email) {
          EmailService.sendVerificationEmail(
            app.current_owner.email,
            app.cert_id,
            `🎉 Station Ownership Transfer APPROVED for "${app.channel_name}"`
          ).catch(() => {});
        }
        if (app.new_owner.email) {
          EmailService.sendVerificationEmail(
            app.new_owner.email,
            app.cert_id,
            `🎉 Station Ownership Granted: You are now owner of "${app.channel_name}"`
          ).catch(() => {});
        }
      } else {
        if (app.current_owner.email) {
          EmailService.sendVerificationEmail(
            app.current_owner.email,
            app.cert_id,
            `❌ Station Ownership Transfer REJECTED: ${reviewReason || 'Verification issue'}`
          ).catch(() => {});
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Transfer Decision Processed', `Ownership Transfer ${app.cert_id} has been ${decision.toUpperCase()}!`);
      setReviewReason('');
      setSelectedAppId(null);
      fetchTransferApps();
    } catch (e: any) {
      Alert.alert('Review Error', e.message || 'Could not process review.');
    }
  };

  const handleReviewStudentApp = async (appId: string, decision: 'approved' | 'rejected' | 'info_required') => {
    if (!adminUserId) {
      Alert.alert('Unauthorized', 'Admin permissions required.');
      return;
    }

    if (decision === 'rejected' && !reviewReason) {
      Alert.alert('Rejection Reason Required', 'Please type a rejection reason for the student applicant.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await StudentService.reviewApplication(
        adminUserId,
        appId,
        decision,
        reviewReason
      );

      if (res.success) {
        Alert.alert('Review Submitted', res.message);
        setReviewReason('');
        setSelectedAppId(null);
        fetchStudentApps();
      } else {
        Alert.alert('Review Failed', res.message);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleViewStudentDocument = async (docPath?: string) => {
    if (!docPath) {
      Alert.alert('No Document', 'No document image was attached for this application.');
      return;
    }
    const signedUrl = await StudentService.getSignedDocumentUrl(docPath);
    if (signedUrl) {
      Linking.openURL(signedUrl).catch(() => {
        Alert.alert('Signed URL', signedUrl);
      });
    } else {
      Alert.alert('Access Denied', 'Unable to generate secure signed URL for private document.');
    }
  };

  const handleReviewKisanApp = async (appId: string, decision: 'approved' | 'rejected' | 'info_required') => {
    if (!adminUserId) {
      Alert.alert('Unauthorized', 'Admin permissions required.');
      return;
    }

    if (decision === 'rejected' && !reviewReason) {
      Alert.alert('Rejection Reason Required', 'Please type a rejection reason for the applicant.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await KisanService.reviewApplication(
        adminUserId,
        appId,
        decision,
        reviewReason,
        'Reviewed via VOEXI Admin Dashboard'
      );

      if (res.success) {
        Alert.alert('Review Submitted', res.message);
        setReviewReason('');
        setSelectedAppId(null);
        checkAdminRoleAndFetchData();
      } else {
        Alert.alert('Review Failed', res.message);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleViewPrivateDocument = async (docPath?: string) => {
    if (!docPath) {
      Alert.alert('No Document', 'No document image was attached for this application.');
      return;
    }
    const signedUrl = await KisanService.getSignedDocumentUrl(docPath);
    if (signedUrl) {
      Linking.openURL(signedUrl).catch(() => {
        Alert.alert('Signed URL', signedUrl);
      });
    } else {
      Alert.alert('Access Denied', 'Unable to generate secure signed URL for private document.');
    }
  };

  const checkServerAndFetchData = async () => {
    try {
      setIsRefreshing(true);
      const healthRes = await fetch(`${SERVER_BASE_URL}/health`).catch(() => null);
      setServerOnline(Boolean(healthRes && healthRes.ok));

      const modelsRes = await fetch(`${SERVER_BASE_URL}/api/v1/admin/assets`).catch(() => null);
      if (modelsRes && modelsRes.ok) {
        const data = await modelsRes.json();
        if (data && data.success && Array.isArray(data.assets)) {
          setServerModels(data.assets);

          let bytes = 0;
          data.assets.forEach((a: any) => {
            bytes += Number(a.sizeMb || 15) * 1024 * 1024;
          });

          setServerStats({
            totalFiles: data.assets.length,
            storageMb: (bytes / (1024 * 1024)).toFixed(1)
          });
        }
      }
    } catch (e) {
      console.warn('[ADMIN CONTROL] Server Fetch Error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const pick3DModel = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        setSelected3DFile(file);
        if (!itemName) {
          const clean = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
          setItemName(clean);
        }
      }
    } catch (e: any) {
      Alert.alert("FILE PICK ERROR", e.message);
    }
  };

  const pickThumbnailImage = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const res = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setSelectedThumbFile(res.assets[0]);
      }
    } catch (e: any) {
      Alert.alert("IMAGE PICK ERROR", e.message);
    }
  };

  const handleAdminUpload = async () => {
    try {
      if (!selected3DFile) {
        Alert.alert("3D FILE REQUIRED 📁", "Please select a 3D model file (.glb / .fbx)");
        return;
      }

      if (!itemName.trim()) {
        Alert.alert("ITEM NAME REQUIRED 🏷️", "Please enter a display name for the 3D asset.");
        return;
      }

      setIsUploading(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      const upload3DUrl = `${SERVER_BASE_URL}/api/v1/assets/upload?fileName=${encodeURIComponent(selected3DFile.name)}&itemName=${encodeURIComponent(itemName.trim())}&category=${encodeURIComponent(category)}&diamonds=${encodeURIComponent(diamonds || '590')}&creator=@admin_staff`;

      const uploadRes = await FileSystem.uploadAsync(upload3DUrl, selected3DFile.uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT
      });

      if (!uploadRes || !uploadRes.body) {
        throw new Error('No response from 3D Media Server on port 8085');
      }

      const parsedData = JSON.parse(uploadRes.body);
      if (!parsedData.success) {
        throw new Error(parsedData.error || 'Server upload failed');
      }

      const cleanModelName = parsedData.name;

      if (selectedThumbFile) {
        const ext = selectedThumbFile.name.split('.').pop().toLowerCase() || 'png';
        const imgUrl = `${SERVER_BASE_URL}/api/upload-image?modelFileName=${encodeURIComponent(cleanModelName)}`;
        await FileSystem.uploadAsync(imgUrl, selectedThumbFile.uri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: { 'x-image-ext': ext }
        }).catch(() => {});
      }

      Alert.alert(
        "3D ASSET PUBLISHED TO SERVER ✨",
        `'${itemName.trim()}' (${category}) has been uploaded and marked APPROVED on Server Port 8085!\n\nPrice: ${diamonds || '590'} Diamonds 💎\n\nSynchronized with Mobile App & Web Stage.`
      );

      // Reset Form
      setSelected3DFile(null);
      setSelectedThumbFile(null);
      setItemName('');
      setCategory('EMOTES');
      setDiamonds('590');

      checkServerAndFetchData();
    } catch (err: any) {
      Alert.alert(
        "UPLOAD FAILED ❌",
        `Could not upload asset to server.\n\nMake sure 'node scripts/avatar_server.js' is running!\n\nError: ${err.message}`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const updateAssetStatus = async (assetId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const res = await fetch(`${SERVER_BASE_URL}/api/v1/admin/assets/${encodeURIComponent(assetId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        checkServerAndFetchData();
      }
    } catch (e) {}
  };

  const handleOverridePrice = (asset: any) => {
    Alert.prompt(
      "OVERRIDE DIAMOND PRICE 💎",
      `Set new Diamond Economy price for '${asset.name}' (Minimum 590 💎 for Public):`,
      [
        { text: "CANCEL", style: "cancel" },
        {
          text: "SET PRICE",
          onPress: async (val) => {
            if (!val) return;
            const newPrice = Number(val);
            if (isNaN(newPrice) || newPrice < 0) return;

            try {
              const res = await fetch(`${SERVER_BASE_URL}/api/v1/admin/assets/${encodeURIComponent(asset.id || asset.filename)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ diamond_price: newPrice })
              });

              if (res.ok) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                checkServerAndFetchData();
              }
            } catch (e) {}
          }
        }
      ],
      'plain-text',
      String(asset.diamond_price || 590)
    );
  };

  const handleDeleteModel = (assetId: string, filename: string) => {
    Alert.alert(
      "PURGE & REJECT 3D ASSET 🗑️",
      `Are you sure you want to purge '${filename}' from server vault database and disk bucket?`,
      [
        { text: "CANCEL", style: "cancel" },
        {
          text: "PURGE & REJECT",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${SERVER_BASE_URL}/api/v1/admin/assets/${encodeURIComponent(assetId || filename)}`, {
                method: 'DELETE'
              });
              if (res.ok) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                checkServerAndFetchData();
              }
            } catch (e) {}
          }
        }
      ]
    );
  };

  const filteredAssets = serverModels.filter((a) => {
    if (activeFilter !== 'ALL' && a.status !== activeFilter) return false;
    if (activeCategory !== 'ALL' && (a.category !== activeCategory && a.type?.toUpperCase() !== activeCategory)) return false;
    return true;
  });

  const filteredTransfers = transferApps.filter((t) => {
    if (transferFilter === 'ALL') return true;
    if (transferFilter === 'PENDING') return t.status.includes('pending');
    if (transferFilter === 'APPROVED') return t.status.includes('approved');
    if (transferFilter === 'REJECTED') return t.status.includes('rejected');
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#030308', '#070712', '#0A0A18']} style={StyleSheet.absoluteFill} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>VOEXI ADMIN SECURITY DASHBOARD</Text>
          <Text style={styles.headerSub}>3D VAULT, TRANSFERS & SCHEME MODERATION</Text>
        </View>

        <TouchableOpacity onPress={checkAdminRoleAndFetchData} style={styles.headerBtn}>
          <Ionicons name="refresh-outline" size={22} color="#00F2FE" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        {/* 🔄 CHANNEL OWNERSHIP TRANSFERS MODERATION SECTION */}
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>🔄 CHANNEL OWNERSHIP TRANSFERS (72 HRS REVIEW)</Text>
            <TouchableOpacity onPress={fetchTransferApps}>
              <Ionicons name="refresh" size={18} color="#A855F7" />
            </TouchableOpacity>
          </View>

          {/* TRANSFER FILTERS */}
          <View style={styles.filterRow}>
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => {
              const isSel = transferFilter === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.filterChip, isSel && { borderColor: '#A855F7', backgroundColor: 'rgba(168,85,247,0.15)' }]}
                  onPress={() => setTransferFilter(st)}
                >
                  <Text style={[styles.filterChipText, isSel && { color: '#A855F7' }]}>{st}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isTransferLoading ? (
            <ActivityIndicator size="small" color="#A855F7" style={{ marginVertical: 20 }} />
          ) : filteredTransfers.length === 0 ? (
            <Text style={styles.emptyText}>No ownership transfer requests in this spectrum.</Text>
          ) : (
            filteredTransfers.map((item) => (
              <View key={item.id} style={styles.appCard}>
                <View style={styles.appHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.appName}>{item.channel_name} ({item.channel_category})</Text>
                    <Text style={styles.appSub}>Cert ID: {item.cert_id} • {new Date(item.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: item.status.includes('approved') ? '#10B981' : item.status.includes('rejected') ? '#EF4444' : '#F59E0B' }]}>
                    <Text style={styles.statusBadgeText}>
                      {item.status.includes('approved') ? 'APPROVED ✓' : item.status.includes('rejected') ? 'REJECTED ❌' : 'PENDING 72HRS'}
                    </Text>
                  </View>
                </View>

                {/* OWNER & RECIPIENT GRID */}
                <View style={styles.transferGrid}>
                  <View style={styles.transferGridCol}>
                    <Text style={styles.colTitle}>FROM (CURRENT OWNER)</Text>
                    <Text style={styles.colText}>Name: {item.current_owner?.name || 'N/A'}</Text>
                    <Text style={styles.colText}>Email: {item.current_owner?.email || 'N/A'}</Text>
                    <Text style={styles.colText}>Mobile: {item.current_owner?.mobile || 'N/A'}</Text>
                    {item.current_owner?.doc_url && (
                      <TouchableOpacity onPress={() => Linking.openURL(item.current_owner.doc_url)} style={styles.viewDocBtn}>
                        <Text style={styles.viewDocText}>VIEW OWNER ID DOC 📄</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.transferGridCol}>
                    <Text style={[styles.colTitle, { color: '#22C55E' }]}>TO (NEW ASSIGNEE)</Text>
                    <Text style={styles.colText}>Name: {item.new_owner?.name || 'N/A'}</Text>
                    <Text style={styles.colText}>Email: {item.new_owner?.email || 'N/A'}</Text>
                    <Text style={styles.colText}>Mobile: {item.new_owner?.mobile || 'N/A'}</Text>
                    {item.new_owner?.photo_url && (
                      <TouchableOpacity onPress={() => Linking.openURL(item.new_owner.photo_url)} style={styles.viewDocBtn}>
                        <Text style={styles.viewDocText}>VIEW RECIPIENT PHOTO 📷</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* REVIEW DECISION CONTROLS */}
                {item.status.includes('pending') && (
                  <View style={{ marginTop: 12 }}>
                    {selectedAppId === item.id ? (
                      <View style={{ gap: 8 }}>
                        <TextInput
                          style={styles.reasonInput}
                          placeholder="Type reason (required for Rejection)..."
                          placeholderTextColor="#666"
                          value={reviewReason}
                          onChangeText={setReviewReason}
                        />
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#22C55E', flex: 1 }]}
                            onPress={() => handleReviewTransferApp(item, 'approved')}
                          >
                            <Text style={styles.actionBtnText}>CONFIRM APPROVAL ✓</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#EF4444', flex: 1 }]}
                            onPress={() => handleReviewTransferApp(item, 'rejected')}
                          >
                            <Text style={styles.actionBtnText}>CONFIRM REJECTION ❌</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.openReviewBtn}
                        onPress={() => setSelectedAppId(item.id)}
                      >
                        <Text style={styles.openReviewText}>MODERATE TRANSFER REQUEST 🛡️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* SERVER DIAGNOSTICS CARD */}
        <View style={styles.diagCard}>
          <View style={styles.statusRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.statusDot, { backgroundColor: serverOnline ? '#10B981' : '#EF4444' }]} />
              <Text style={styles.statusText}>
                SERVER STATUS: <Text style={{ color: serverOnline ? '#10B981' : '#EF4444', fontWeight: '900' }}>{serverOnline ? 'ONLINE (PORT 8085)' : 'OFFLINE'}</Text>
              </Text>
            </View>

            <TouchableOpacity style={styles.openWebBtn} onPress={() => Linking.openURL(SERVER_BASE_URL)}>
              <Text style={styles.openWebText}>OPEN WEB STORE GATE 🌐</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{serverStats.totalFiles}</Text>
              <Text style={styles.statLbl}>3D VAULT DB ASSETS</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{SERVER_IP}:8085</Text>
              <Text style={styles.statLbl}>REST API GATE</Text>
            </View>
          </View>
        </View>

        {/* STAFF 3D UPLOAD FORM */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>⚡ DEPLOY STAFF 3D ASSET TO STORE GATE</Text>

          <Text style={styles.fieldLabel}>1. SELECT 3D MODEL FILE (.GLB / .FBX)</Text>
          <TouchableOpacity style={styles.pickerBox} onPress={pick3DModel} activeOpacity={0.8}>
            <Ionicons name={selected3DFile ? "checkmark-circle" : "cloud-upload-outline"} size={26} color="#00F2FE" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.pickerTitle} numberOfLines={1}>
                {selected3DFile ? selected3DFile.name : 'Choose 3D .glb or .fbx model file'}
              </Text>
              <Text style={styles.pickerSub}>
                {selected3DFile ? `${(selected3DFile.size / (1024*1024)).toFixed(1)} MB • Tap to change` : 'Select from storage'}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>2. ITEM DISPLAY NAME</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Cyber Capoeira Dance"
            placeholderTextColor="#555"
            value={itemName}
            onChangeText={setItemName}
          />

          <TouchableOpacity
            style={styles.uploadSubmitBtn}
            onPress={handleAdminUpload}
            disabled={isUploading}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#A855F7', '#00F2FE']} style={styles.uploadSubmitGradient}>
              {isUploading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.uploadSubmitText}>🚀 DEPLOY STAFF 3D ASSET</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030308' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  headerSub: { color: '#00F2FE', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  diagCard: { backgroundColor: '#0B0B14', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 16 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { color: '#AAA', fontSize: 11 },
  openWebBtn: { backgroundColor: 'rgba(0,242,254,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#00F2FE' },
  openWebText: { color: '#00F2FE', fontSize: 9, fontWeight: '900' },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, backgroundColor: '#12121F', padding: 10, borderRadius: 10, alignItems: 'center' },
  statVal: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  statLbl: { color: '#666', fontSize: 8, fontWeight: '700', marginTop: 2 },
  sectionCard: { backgroundColor: '#0B0B14', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 16 },
  sectionTitle: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  filterRow: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#12121F', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  filterChipText: { color: '#888', fontSize: 10, fontWeight: '900' },
  emptyText: { color: '#666', fontSize: 11, textAlign: 'center', marginVertical: 20 },
  appCard: { backgroundColor: '#12121F', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  appHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  appName: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  appSub: { color: '#888', fontSize: 10, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  transferGrid: { flexDirection: 'row', gap: 10, backgroundColor: '#090912', padding: 10, borderRadius: 10 },
  transferGridCol: { flex: 1 },
  colTitle: { color: '#A855F7', fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginBottom: 4 },
  colText: { color: '#CCC', fontSize: 10, marginBottom: 2 },
  viewDocBtn: { marginTop: 6, backgroundColor: 'rgba(168,85,247,0.15)', paddingVertical: 4, paddingHorizontal: 6, borderRadius: 6 },
  viewDocText: { color: '#A855F7', fontSize: 9, fontWeight: 'bold' },
  reasonInput: { backgroundColor: '#090912', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, color: '#FFF', paddingHorizontal: 10, paddingVertical: 8, fontSize: 11 },
  actionBtn: { paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  openReviewBtn: { backgroundColor: 'rgba(168,85,247,0.15)', paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#A855F7' },
  openReviewText: { color: '#A855F7', fontSize: 10, fontWeight: '900' },
  fieldLabel: { color: '#AAA', fontSize: 10, fontWeight: '900', marginTop: 12, marginBottom: 6 },
  pickerBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#12121F', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  pickerTitle: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  pickerSub: { color: '#666', fontSize: 10, marginTop: 2 },
  textInput: { backgroundColor: '#12121F', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', color: '#FFF', paddingHorizontal: 12, height: 46, fontSize: 12 },
  uploadSubmitBtn: { marginTop: 16, borderRadius: 12, overflow: 'hidden' },
  uploadSubmitGradient: { paddingVertical: 14, alignItems: 'center' },
  uploadSubmitText: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 }
});
