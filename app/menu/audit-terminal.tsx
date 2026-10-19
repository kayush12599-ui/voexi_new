import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { ModerationService } from '../../lib/moderationService';
import { DirectiveType } from '../../types/moderation';

const { width } = Dimensions.get('window');

export default function AuditTerminal() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [rationale, setRationale] = useState('');

  const DIRECTIVES: { type: DirectiveType; icon: any; color: string; desc: string }[] = [
    { type: 'Issue Strike', icon: 'flash', color: '#ffd700', desc: 'Add permanent violation mark.' },
    { type: 'Terminate Signal', icon: 'trash', color: '#ff4444', desc: 'Delete content from spectrum.' },
    { type: 'Isolate Channel', icon: 'lock-closed', color: '#ff0000', desc: 'Suspend account access.' },
    { type: 'Wipe Profile', icon: 'skull', color: '#000', desc: 'Permanent ban from VOEXI.' },
    { type: 'Restore Frequency', icon: 'refresh', color: '#00ff00', desc: 'Clear all flags.' },
    { type: 'Ignore Interference', icon: 'close-circle', color: '#666', desc: 'Dismiss report as noise.' }
  ];

  useEffect(() => { fetchAuditTelemetry(); }, [id]);

  const fetchAuditTelemetry = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('signal_audits')
        .select('*, profiles!initiator_id(*), target:profiles!target_user_id(*)')
        .eq('id', id)
        .single();

      if (error) throw error;

      let targetContent = null;
      if (data.signal_type === 'video') {
         const { data: v } = await supabase.from('posts').select('*').eq('id', data.signal_id).single();
         targetContent = v;
      } else if (data.signal_type === 'comment') {
         const { data: c } = await supabase.from('comments').select('*').eq('id', data.signal_id).single();
         targetContent = c;
      }

      setAudit({ ...data, targetContent });
    } catch (e) {
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const executeDirective = async (type: DirectiveType) => {
    if (!rationale.trim() && type !== 'Ignore Interference') {
        return Alert.alert("COMMANDER LOG REQUIRED", "Provide rationale for this directive.");
    }

    Alert.alert(
      "CONFIRM DIRECTIVE",
      `Are you authorized to ${type.toUpperCase()}?`,
      [
        { text: "ABORT", style: "cancel" },
        { text: "EXECUTE", style: "destructive", onPress: async () => {
            try {
              setProcessing(true);
              const { data: { user } } = await supabase.auth.getUser();
              await ModerationService.issueDirective(user!.id, String(id), type, rationale);
              Alert.alert("DIRECTIVE SYNCED", "The Spectrum has been re-calibrated.");
              router.back();
            } catch (e: any) {
              Alert.alert("Neural Error", e.message);
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
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>AUDIT TERMINAL: VX-{String(id).slice(0,8).toUpperCase()}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.telemetryRow}>
           <TelemetryPill label="ANOMALY" val={audit.anomaly_category} color="#fff" />
           <TelemetryPill label="RISK" val={audit.risk_level.toUpperCase()} color={audit.risk_level === 'critical' ? '#ff0000' : '#00F2FE'} />
        </View>

        <View style={styles.monitorFrame}>
           <Text style={styles.frameLabel}>NEURAL DATA LOG</Text>
           <Text style={styles.logBody}>"{audit.neural_log || 'No context log.'}"</Text>
           {audit.evidence_fingerprint && (
              <Image source={{ uri: audit.evidence_fingerprint }} style={styles.evidenceImg} />
           )}
        </View>

        <View style={styles.signalPreview}>
           <Text style={styles.frameLabel}>SIGNAL UNDER REVIEW</Text>
           <View style={styles.previewBox}>
              <Text style={styles.previewTitle}>{audit.targetContent?.title || audit.targetContent?.content || '[REMOVED]'}</Text>
              {audit.signal_type === 'video' && (
                 <TouchableOpacity style={styles.viewBtn} onPress={() => router.push(`/video/${audit.signal_id}`)}>
                    <Text style={styles.viewBtnText}>VIEW TRANSMISSION</Text>
                 </TouchableOpacity>
              )}
           </View>
        </View>

        <View style={styles.entities}>
           <EntityNode label="INITIATOR" user={audit.profiles} />
           <EntityNode label="TARGET" user={audit.target} />
        </View>

        <View style={styles.commandInputArea}>
           <Text style={styles.frameLabel}>COMMANDER RATIONALE</Text>
           <TextInput
             style={styles.rationaleInput}
             placeholder="Log the reasoning for this directive..."
             placeholderTextColor="#333"
             multiline
             value={rationale}
             onChangeText={setRationale}
           />

           <View style={styles.directivesGrid}>
              {DIRECTIVES.map(d => (
                <TouchableOpacity
                  key={d.type}
                  style={[styles.directiveBtn, { borderColor: d.color + '44' }]}
                  onPress={() => executeDirective(d.type)}
                >
                   <MaterialCommunityIcons name={d.icon} size={20} color={d.color || '#fff'} />
                   <View>
                      <Text style={[styles.dirTitle, { color: d.color === '#000' ? '#fff' : (d.color || '#fff') }]}>{d.type.toUpperCase()}</Text>
                      <Text style={styles.dirDesc}>{d.desc}</Text>
                   </View>
                </TouchableOpacity>
              ))}
           </View>
        </View>
      </ScrollView>

      {processing && <View style={styles.workingOverlay}><ActivityIndicator size="large" color={VOEXITheme.colors.primary} /><Text style={styles.workingText}>SYNCING DIRECTIVE...</Text></View>}
    </SafeAreaView>
  );
}

const TelemetryPill = ({ label, val, color }: any) => (
  <View style={styles.telePill}>
     <Text style={styles.teleLabel}>{label}</Text>
     <Text style={[styles.teleVal, { color }]}>{val}</Text>
  </View>
);

const EntityNode = ({ label, user }: any) => (
  <View style={styles.nodeBox}>
     <Text style={styles.nodeLabel}>{label}</Text>
     <View style={styles.nodeInfo}>
        <Image source={{ uri: user?.avatar_url || 'https://via.placeholder.com/50' }} style={styles.nodeAvatar} />
        <View>
           <Text style={styles.nodeName}>@{user?.username}</Text>
           <Text style={styles.nodeStrikes}>{user?.strikes || 0} STRIKES</Text>
        </View>
     </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 25, borderBottomWidth: 1, borderBottomColor: '#111' },
  headerTitle: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  content: { padding: 25 },
  telemetryRow: { flexDirection: 'row', gap: 15, marginBottom: 30 },
  telePill: { flex: 1, backgroundColor: '#050505', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#111' },
  teleLabel: { color: '#333', fontSize: 7, fontWeight: '900', marginBottom: 5 },
  teleVal: { fontSize: 11, fontWeight: 'bold' },
  monitorFrame: { backgroundColor: '#080808', padding: 20, borderRadius: 20, marginBottom: 25, borderWidth: 1, borderColor: '#111' },
  frameLabel: { color: '#444', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15 },
  logBody: { color: '#aaa', fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
  evidenceImg: { width: '100%', height: 200, borderRadius: 15, marginTop: 20, resizeMode: 'cover' },
  signalPreview: { backgroundColor: '#050505', padding: 20, borderRadius: 20, marginBottom: 25, borderWidth: 1, borderColor: '#151515' },
  previewBox: { gap: 10 },
  previewTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  viewBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8, backgroundColor: '#111', borderWidth: 1, borderColor: '#222' },
  viewBtnText: { color: VOEXITheme.colors.secondary, fontSize: 9, fontWeight: '900' },
  entities: { flexDirection: 'row', gap: 15, marginBottom: 30 },
  nodeBox: { flex: 1, backgroundColor: '#080808', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#111' },
  nodeLabel: { color: '#222', fontSize: 7, fontWeight: '900', marginBottom: 10 },
  nodeInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nodeAvatar: { width: 30, height: 30, borderRadius: 15 },
  nodeName: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  nodeStrikes: { color: '#ff4444', fontSize: 7, fontWeight: '900' },
  commandInputArea: { paddingBottom: 100 },
  rationaleInput: { backgroundColor: '#080808', color: '#fff', padding: 20, borderRadius: 20, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#111', fontSize: 14 },
  directivesGrid: { marginTop: 30, gap: 12 },
  directiveBtn: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: '#050505', padding: 18, borderRadius: 15, borderWidth: 1 },
  dirTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  dirDesc: { color: '#444', fontSize: 9, marginTop: 2 },
  workingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  workingText: { color: VOEXITheme.colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 2, marginTop: 20 }
});
