import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { ModerationService } from '../../lib/moderationService';
import { ActionType } from '../../types/moderation';

const { width } = Dimensions.get('window');

export default function ReportDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [resolutionReason, setResolutionReason] = useState('');

  const ACTIONS: { type: ActionType; icon: any; color: string }[] = [
    { type: 'Approve', icon: 'checkmark-circle', color: '#00ff00' } as any,
    { type: 'Warn User', icon: 'alert-circle', color: '#ffd700' },
    { type: 'Remove Content', icon: 'trash', color: '#ff4444' },
    { type: 'Suspend Account', icon: 'lock-closed', color: '#ff0000' },
    { type: 'Permanently Ban', icon: 'skull', color: '#000' },
    { type: 'Reject Report', icon: 'close-circle', color: '#666' }
  ];

  useEffect(() => { fetchDetails(); }, [id]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*, reporter:reporter_id(*), reported:reported_user_id(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setReport(data);

      // Fetch the actual content being reported (e.g., video or comment)
      if (data.content_type === 'video') {
          const { data: post } = await supabase.from('posts').select('*').eq('id', data.content_id).single();
          if (post) setReport((prev: any) => ({ ...prev, targetContent: post }));
      } else if (data.content_type === 'comment') {
          const { data: comm } = await supabase.from('comments').select('*').eq('id', data.content_id).single();
          if (comm) setReport((prev: any) => ({ ...prev, targetContent: comm }));
      }
    } catch (e) {
      Alert.alert("Error", "Could not fetch signal details.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionType: ActionType) => {
    if (!resolutionReason.trim() && actionType !== 'Reject Report' && actionType !== 'Approve' as any) {
        return Alert.alert("Resolution Notes Required", "Please provide a reason for this action.");
    }

    Alert.alert(
      "CONFIRM NEURAL ACTION",
      `Are you sure you want to ${actionType}?`,
      [
        { text: "ABORT", style: "cancel" },
        { text: "EXECUTE", style: "destructive", onPress: async () => {
            try {
              setProcessing(true);
              const { data: { user } } = await supabase.auth.getUser();
              await ModerationService.resolveReport(user!.id, String(id), actionType, resolutionReason);
              Alert.alert("Action Synchronized", "The Spectrum has been updated.");
              router.back();
            } catch (e: any) {
              Alert.alert("Failure", "Neural link interrupted: " + e.message);
            } finally {
              setProcessing(false);
            }
          }}
      ]
    );
  };

  if (loading) return <View style={styles.loader}><ActivityIndicator color={VOEXITheme.colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>REPORT AUDIT: #{String(id).slice(-6)}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.metaBox}>
           <Text style={styles.label}>REASON: <Text style={styles.val}>{report.reason}</Text></Text>
           <Text style={styles.label}>TYPE: <Text style={styles.val}>{report.content_type.toUpperCase()}</Text></Text>
           <Text style={styles.label}>PRIORITY: <Text style={[styles.val, { color: report.priority === 'high' ? '#ff4444' : '#00f2fe' }]}>{report.priority.toUpperCase()}</Text></Text>
        </View>

        <View style={styles.card}>
           <Text style={styles.cardTitle}>USER DESCRIPTION</Text>
           <Text style={styles.bodyText}>"{report.description || 'No additional details provided.'}"</Text>
           {report.screenshot_url && (
             <TouchableOpacity onPress={() => Alert.alert("Signal Link", report.screenshot_url)}>
                <Image source={{ uri: report.screenshot_url }} style={styles.screenshot} />
             </TouchableOpacity>
           )}
        </View>

        <View style={styles.contentPreview}>
           <Text style={styles.cardTitle}>REPORTED CONTENT</Text>
           {report.content_type === 'video' ? (
             <View style={styles.videoMeta}>
                <Text style={styles.vTitle}>{report.targetContent?.title}</Text>
                <Text style={styles.vDesc} numberOfLines={3}>{report.targetContent?.description}</Text>
                <TouchableOpacity style={styles.viewBtn} onPress={() => router.push(`/video/${report.content_id}`)}>
                   <Text style={styles.viewBtnText}>WATCH SIGNAL</Text>
                </TouchableOpacity>
             </View>
           ) : (
             <Text style={styles.bodyText}>{report.targetContent?.content || '[CONTENT DELETED]'}</Text>
           )}
        </View>

        <View style={styles.entities}>
           <EntityBox label="REPORTER" user={report.reporter} />
           <EntityBox label="REPORTED" user={report.reported} />
        </View>

        <View style={styles.adminActionBox}>
           <Text style={styles.cardTitle}>RESOLUTION NOTES</Text>
           <TextInput
             style={styles.adminInput}
             placeholder="State the reason for this action..."
             placeholderTextColor="#333"
             multiline
             value={resolutionReason}
             onChangeText={setResolutionReason}
           />

           <View style={styles.actionsGrid}>
              {ACTIONS.map(a => (
                <TouchableOpacity
                  key={a.type}
                  style={[styles.actionBtn, { borderColor: a.color + '44' }]}
                  onPress={() => handleAction(a.type)}
                  disabled={processing}
                >
                   <MaterialCommunityIcons name={a.icon} size={20} color={a.color} />
                   <Text style={[styles.actionText, { color: a.color === '#000' ? '#fff' : a.color }]}>{a.type.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
           </View>
        </View>
      </ScrollView>
      {processing && <View style={styles.overlay}><ActivityIndicator size="large" color={VOEXITheme.colors.primary} /></View>}
    </SafeAreaView>
  );
}

const EntityBox = ({ label, user }: any) => (
  <View style={styles.entityBox}>
     <Text style={styles.entityLabel}>{label}</Text>
     <View style={styles.entityInfo}>
        <Image source={{ uri: user?.avatar_url || 'https://via.placeholder.com/50' }} style={styles.miniAvatar} />
        <View>
           <Text style={styles.username}>@{user?.username}</Text>
           <Text style={styles.strikes}>Strikes: {user?.strikes || 0}</Text>
        </View>
     </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 20, borderBottomWidth: 1, borderBottomColor: '#111' },
  headerTitle: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  content: { padding: 20 },
  metaBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginBottom: 25 },
  label: { color: '#444', fontSize: 10, fontWeight: 'bold' },
  val: { color: '#fff' },
  card: { backgroundColor: '#080808', padding: 20, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#111' },
  cardTitle: { color: '#444', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15 },
  bodyText: { color: '#aaa', fontSize: 14, lineHeight: 22 },
  screenshot: { width: '100%', height: 200, borderRadius: 15, marginTop: 15, resizeMode: 'cover' },
  contentPreview: { backgroundColor: '#050505', padding: 20, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#151515' },
  videoMeta: { gap: 8 },
  vTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  vDesc: { color: '#666', fontSize: 12 },
  viewBtn: { backgroundColor: '#111', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#222' },
  viewBtnText: { color: VOEXITheme.colors.primary, fontSize: 11, fontWeight: '900' },
  entities: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  entityBox: { flex: 1, backgroundColor: '#080808', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#111' },
  entityLabel: { color: '#333', fontSize: 8, fontWeight: '900', marginBottom: 10 },
  entityInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniAvatar: { width: 32, height: 32, borderRadius: 16 },
  username: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  strikes: { color: '#ff4444', fontSize: 8, fontWeight: 'bold' },
  adminActionBox: { marginBottom: 50 },
  adminInput: { backgroundColor: '#080808', borderRadius: 15, padding: 15, color: '#fff', fontSize: 14, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#111' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 25 },
  actionBtn: { width: (width - 60) / 2, backgroundColor: '#050505', padding: 15, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 8 },
  actionText: { fontSize: 10, fontWeight: '900' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }
});
