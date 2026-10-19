import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, TextInput, Animated, ActivityIndicator, Alert, Image, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { ModerationService } from '../../lib/moderationService';
import { AnomalyCategory, SignalType } from '../../types/moderation';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

interface NeuralAuditModalProps {
  visible: boolean;
  onClose: () => void;
  targetId: string;
  targetUserId: string;
  signalType: SignalType;
  currentUserId: string;
}

const ANOMALIES: { label: AnomalyCategory; desc: string }[] = [
  { label: 'Malicious Transmission', desc: 'Spam, scams or deceptive signals.' },
  { label: 'Harmful Frequency', desc: 'Violence, harassment or threats.' },
  { label: 'Hate Resonance', desc: 'Hate speech or discriminatory code.' },
  { label: 'Restricted Signal', desc: 'Adult content or unsafe frequency.' },
  { label: 'Incompatible Code', desc: 'Copyright or intellectual property theft.' },
  { label: 'Distorted Reality', desc: 'Misinformation or fake data.' },
  { label: 'Biometric Fraud', desc: 'Identity theft or AI-generated fakes.' },
  { label: 'Spectrum Overload', desc: 'Low quality, flashing lights or noise.' },
  { label: 'Signal Piracy', desc: 'Streaming unauthorized live data.' },
  { label: 'Agent Harassment', desc: 'Bullying or targeting specific agents.' },
  { label: 'Illegal Traffic', desc: 'Promoting illegal goods or services.' },
  { label: 'Privacy Breach', desc: 'Revealing private neural data.' },
  { label: 'Cruelty Log', desc: 'Content showing harm to animals/beings.' },
  { label: 'Terror Directive', desc: 'Promoting violent extremism.' },
  { label: 'Other Deviation', desc: 'Anything else out of spectrum.' }
];

export const NeuralAuditModal: React.FC<NeuralAuditModalProps> = ({
  visible, onClose, targetId, targetUserId, signalType, currentUserId
}) => {
  const router = useRouter();
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyCategory | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [log, setLog] = useState('');
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const radarAnim = useRef(new Animated.Value(0)).current;

  const handleCustomReasonChange = (text: string) => {
    const filteredText = text.replace(/[^a-zA-Z\s]/g, '');
    setCustomReason(filteredText);
  };

  const startAudit = async () => {
    if (!selectedAnomaly) return;
    if (selectedAnomaly === 'Other Deviation' && !customReason.trim()) {
      return Alert.alert("Input Required", "Please define the deviation type.");
    }

    setLoading(true);
    Animated.loop(
      Animated.timing(radarAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
    ).start();

    const finalLog = selectedAnomaly === 'Other Deviation'
      ? `TYPE: ${customReason}\nCONTEXT: ${log}`
      : log;

    try {
      // 1. CALL THE BACKEND
      const result = await ModerationService.initiateAudit(
        currentUserId, targetUserId, signalType, targetId, selectedAnomaly, finalLog, fingerprint || undefined
      );

      // 2. SHOW SUCCESS POPUP ONLY IF BACKEND CONFIRMED
      if (result) {
        setStep(3); // Success Screen
      }
    } catch (e: any) {
      if (e.message === 'AUTH_REQUIRED') {
        onClose();
        router.push('/(auth)/login');
      } else {
        Alert.alert("Submission Failed", e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const pickFingerprint = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
    if (!res.canceled) setFingerprint(res.assets[0].uri);
  };

  const reset = () => {
    setSelectedAnomaly(null); setCustomReason(''); setLog(''); setFingerprint(null); setStep(1);
    onClose();
  };

  if (step === 3) return (
    <Modal visible={visible} transparent animationType="fade">
       <View style={styles.overlay}>
          <LinearGradient colors={['#000', '#0a0a1a']} style={styles.successBox}>
             <View style={styles.successIconBox}>
                <Ionicons name="checkmark-shield" size={60} color="#00ff00" />
             </View>
             <Text style={styles.successTitle}>SUCCESS</Text>
             <Text style={styles.successDesc}>Report submitted successfully. Our moderation team has been notified. Verification ID: VX-{Math.random().toString(36).substr(2,9).toUpperCase()}</Text>
             <TouchableOpacity style={styles.closeBtnFinal} onPress={reset}><Text style={styles.btnTextFinal}>DISCONNECT</Text></TouchableOpacity>
          </LinearGradient>
       </View>
    </Modal>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.radarGroup}>
               <Animated.View style={[styles.radarDot, { opacity: radarAnim.interpolate({inputRange:[0, 0.5, 1], outputRange:[0, 1, 0]}) }]} />
               <Text style={styles.headerTitle}>SIGNAL AUDIT PROTOCOL</Text>
            </View>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
          </View>

          {step === 1 ? (
            <View style={{flex: 1}}>
               <Text style={styles.label}>SELECT ANOMALY CATEGORY</Text>
               <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.listContainer}>
                     {ANOMALIES.map(a => (
                       <TouchableOpacity
                         key={a.label}
                         style={[styles.listItem, selectedAnomaly === a.label && styles.listItemActive]}
                         onPress={() => setSelectedAnomaly(a.label)}
                       >
                          <Text style={[styles.listItemText, selectedAnomaly === a.label && {color: VOEXITheme.colors.primary}]}>{a.label.toUpperCase()}</Text>
                          {selectedAnomaly === a.label && <Ionicons name="checkmark-circle" size={18} color={VOEXITheme.colors.primary} />}
                       </TouchableOpacity>
                     ))}
                  </View>
               </ScrollView>

               {selectedAnomaly && (
                  <View style={styles.bottomConfirmArea}>
                     <Text style={styles.anomalyDescSelected}>{ANOMALIES.find(a => a.label === selectedAnomaly)?.desc}</Text>

                     {selectedAnomaly === 'Other Deviation' && (
                        <TextInput
                           style={styles.customInputSmall}
                           placeholder="Type reason (Letters only)..."
                           placeholderTextColor="#444"
                           value={customReason}
                           onChangeText={handleCustomReasonChange}
                           autoFocus
                        />
                     )}

                     <TouchableOpacity style={styles.nextBtnLarge} onPress={() => setStep(2)}>
                        <Text style={styles.nextBtnText}>PROCEED TO DATA LOG</Text>
                        <Ionicons name="chevron-forward" size={18} color="#fff" />
                     </TouchableOpacity>
                  </View>
               )}
            </View>
          ) : (
            <View style={{flex: 1}}>
               <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                  <Ionicons name="arrow-back" size={16} color="#666" />
                  <Text style={styles.backText}>RE-CATEGORIZE</Text>
               </TouchableOpacity>

               <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={styles.label}>NEURAL LOG (CONTEXT)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={selectedAnomaly === 'Other Deviation' ? `Explain '${customReason}'...` : "Describe the spectrum deviation..."}
                    placeholderTextColor="#333"
                    multiline
                    value={log}
                    onChangeText={setLog}
                  />

                  <TouchableOpacity style={styles.fingerprintBtn} onPress={pickFingerprint}>
                     <Ionicons name="finger-print" size={20} color={VOEXITheme.colors.primary} />
                     <Text style={styles.fingerprintText}>{fingerprint ? 'EVIDENCE CAPTURED' : 'ATTACH VISUAL FINGERPRINT'}</Text>
                  </TouchableOpacity>

                  {fingerprint && <Image source={{uri: fingerprint}} style={styles.evidencePreview} />}
                  <View style={{height: 100}} />
               </ScrollView>

               <View style={styles.stickySubmit}>
                  <TouchableOpacity
                    style={[styles.auditBtn, loading && {opacity: 0.5}]}
                    onPress={startAudit}
                    disabled={loading}
                  >
                     <LinearGradient colors={[VOEXITheme.colors.primary, '#9333ea']} style={styles.auditBtnInner}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.auditBtnText}>INITIATE FULL AUDIT</Text>}
                     </LinearGradient>
                  </TouchableOpacity>
               </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#000', height: '90%', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 25, borderTopWidth: 1, borderTopColor: '#1A1A24' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  radarGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radarDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff0000' },
  headerTitle: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  label: { color: '#333', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
  listContainer: { gap: 2 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#0A0A0A', paddingHorizontal: 5 },
  listItemActive: { borderBottomColor: VOEXITheme.colors.primary + '44' },
  listItemText: { color: '#888', fontSize: 13, fontWeight: 'bold', letterSpacing: 1 },
  bottomConfirmArea: { paddingVertical: 20, borderTopWidth: 1, borderTopColor: '#111', marginTop: 10 },
  anomalyDescSelected: { color: '#666', fontSize: 11, textAlign: 'center', marginBottom: 20, lineHeight: 16 },
  customInputSmall: { backgroundColor: '#080808', color: '#fff', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#151515', fontSize: 14, marginBottom: 20 },
  nextBtnLarge: { backgroundColor: '#111', padding: 18, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#222' },
  nextBtnText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  input: { backgroundColor: '#050505', color: '#fff', padding: 20, borderRadius: 20, minHeight: 150, textAlignVertical: 'top', borderWidth: 1, borderColor: '#111', fontSize: 15 },
  fingerprintBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, backgroundColor: '#080808', padding: 18, borderRadius: 15, borderWidth: 1, borderColor: '#111' },
  fingerprintText: { color: '#eee', fontSize: 11, fontWeight: 'bold' },
  evidencePreview: { width: 100, height: 100, borderRadius: 12, marginTop: 15, borderWidth: 1, borderColor: '#333' },
  stickySubmit: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 20, backgroundColor: '#000' },
  auditBtn: { borderRadius: 20, overflow: 'hidden' },
  auditBtnInner: { paddingVertical: 20, alignItems: 'center' },
  auditBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 2, fontSize: 13 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  backText: { color: '#666', fontSize: 9, fontWeight: '900' },
  successBox: { width: '90%', padding: 40, borderRadius: 40, alignItems: 'center', alignSelf: 'center', marginBottom: height * 0.15, borderWidth: 1, borderColor: '#1A1A24' },
  successIconBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,255,0,0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  successTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 3 },
  successDesc: { color: '#666', fontSize: 13, textAlign: 'center', marginTop: 15, lineHeight: 22 },
  closeBtnFinal: { marginTop: 30, padding: 15 },
  btnTextFinal: { color: VOEXITheme.colors.primary, fontWeight: '900', letterSpacing: 2 }
});
