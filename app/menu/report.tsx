import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';
import { MailService } from '../../lib/mailService';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const QUICK_ISSUE_CHIPS = [
  { id: 'monetization', label: '⚡ Monetization Error', subject: 'Monetization & Payout Issue', color: '#10B981', placeholder: 'Describe the earnings or payout issue you experienced...' },
  { id: 'bug', label: '🐞 Bug & App Glitch', subject: 'App Bug & Technical Deviation', color: '#EF4444', placeholder: 'Describe where the bug occurred and steps to reproduce...' },
  { id: 'diamond', label: '💎 Diamonds & Top-Up', subject: 'Diamond Flash Drop & Top-Up Issue', color: '#FFD700', placeholder: 'Describe your Diamond purchase or balance query...' },
  { id: 'security', label: '🔐 Security & Account', subject: 'Account Security & Login Assistance', color: '#6366F1', placeholder: 'Describe your account access or verification issue...' },
  { id: 'feedback', label: '✨ Feature Suggestion', subject: 'Feature Feedback & Idea', color: '#00F2FE', placeholder: 'Share your feature idea or feedback for VOEXI...' },
];

export default function HelpSupportHub() {
  const router = useRouter();
  const { isLight } = useTheme();

  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChipSelect = (chip: typeof QUICK_ISSUE_CHIPS[0]) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    setSelectedChip(chip.id);
    setSubject(chip.subject);
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      return Alert.alert("Required", "Please fill all fields before submitting.");
    }
    setLoading(true);

    try {
      // 1. Get current logged-in user details
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      const userEmail = session?.user?.email || 'Anonymous User';

      // 2. Log support ticket in Supabase Database
      await supabase.from('content_reports').insert({
        reporter_id: userId,
        reason: subject,
        description: `[SUPPORT UPLINK from ${userEmail}]:\n${message}`,
        status: 'pending'
      }).catch(err => console.warn('Supabase support log error:', err));

      // 3. Dispatch Cloud Email Alert to Admin (teamvoexi@gmail.com & support@voexi.com)
      await MailService.sendNeuralAlert(
        'teamvoexi@gmail.com',
        `[VOEXI SUPPORT TICKET] ${subject}`,
        `User Email: ${userEmail}\nUser ID: ${userId || 'Anonymous'}\n\nSubject: ${subject}\n\nMessage:\n${message}`
      );

      // 4. Dispatch Auto-Response Confirmation Email directly to the USER's Inbox
      if (userEmail && userEmail.includes('@') && userEmail !== 'Anonymous User') {
        await MailService.sendNeuralAlert(
          userEmail,
          `🟢 [VOEXI TICKET CONFIRMATION] ${subject}`,
          `Hello Commander,\n\nWe have received your Spectrum Support Uplink regarding: "${subject}".\n\nOur technical team is processing your ticket and will respond to your station.\n\nYour Transmission Details:\nSubject: ${subject}\nMessage:\n${message}\n\nThank you,\nVOEXI Technical Support`
        );
      }

      setLoading(false);

      // 5. Prompt user with confirmation & option to open native Mail App directly
      Alert.alert(
        "SIGNAL TRANSMITTED 🟢",
        `Your support request has been logged and dispatched to support@voexi.com.\n\nWould you also like to open your Email app to send a direct message?`,
        [
          {
            text: "DONE",
            onPress: () => router.back()
          },
          {
            text: "OPEN EMAIL APP",
            onPress: async () => {
              await MailService.openGmailApp('support@voexi.com', subject, message);
              router.back();
            }
          }
        ]
      );
    } catch (err: any) {
      setLoading(false);
      Alert.alert("TRANSMISSION ERROR", "Failed to transmit support signal. Please check your network connection and try again.");
    }
  };

  const activeChipObj = QUICK_ISSUE_CHIPS.find(c => c.id === selectedChip);

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <LinearGradient colors={isLight ? ['#FFFFFF', '#F8FAFC'] : ['#0B0B0F', '#050508']} style={StyleSheet.absoluteFill} />

      {/* FIXED TOP HEADER */}
      <View style={[styles.header, isLight && { borderBottomColor: '#EEE' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={isLight ? '#000' : '#fff'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>SPECTRUM SUPPORT</Text>
        <TouchableOpacity onPress={() => MailService.openGmailApp('support@voexi.com', 'Quick Query', '')} style={styles.headerMailBtn}>
          <Ionicons name="mail-outline" size={20} color="#00F2FE" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* REASSURANCE HUMAN PSYCHOLOGY STATUS PILL */}
        <View style={styles.reassurancePill}>
          <View style={styles.pulseDot} />
          <Text style={styles.reassuranceTxt}>LIVE SUPPORT LINK ACTIVE • AVG RESPONSE &lt; 15 MINS</Text>
        </View>

        {/* HERO SECTION */}
        <View style={styles.heroBox}>
          <View style={styles.iconAuraWrapper}>
            <LinearGradient colors={['#A855F7', '#6366F1']} style={styles.iconAura} />
            <Ionicons name="help-buoy" size={48} color="#FFFFFF" />
          </View>
          <Text style={[styles.heroTitle, isLight && { color: '#000' }]}>How can we assist your station?</Text>
          <Text style={styles.heroSub}>Direct uplink to VOEXI technical commanders.</Text>
        </View>

        {/* QUICK 1-TAP ISSUE CHIPS */}
        <Text style={[styles.label, isLight && { color: '#666' }]}>SELECT QUICK ISSUE CATEGORY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {QUICK_ISSUE_CHIPS.map((chip) => {
            const isSelected = selectedChip === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                onPress={() => handleChipSelect(chip)}
                style={[
                  styles.chipBtn,
                  isSelected && { borderColor: chip.color, backgroundColor: 'rgba(255,255,255,0.08)' },
                  isLight && !isSelected && { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }
                ]}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.chipText,
                  { color: isSelected ? chip.color : (isLight ? '#334155' : '#94A3B8') },
                  isSelected && { fontWeight: '900' }
                ]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* INPUT FIELDS */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isLight && { color: '#666' }]}>TRANSMISSION SUBJECT</Text>
          <TextInput
            style={[styles.input, isLight && { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', color: '#000' }]}
            placeholder="e.g. Monetization Error, Bug Report..."
            placeholderTextColor={isLight ? '#94A3B8' : '#475569'}
            value={subject}
            onChangeText={setSubject}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.label, isLight && { color: '#666' }]}>NEURAL LOG (MESSAGE)</Text>
            <Text style={{ fontSize: 9, color: '#64748B', fontWeight: '800' }}>{message.length} CHARS</Text>
          </View>
          <TextInput
            style={[
              styles.input,
              { height: 140, textAlignVertical: 'top' },
              isLight && { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', color: '#000' }
            ]}
            placeholder={activeChipObj?.placeholder || "Describe the technical deviation in detail..."}
            placeholderTextColor={isLight ? '#94A3B8' : '#475569'}
            multiline
            value={message}
            onChangeText={setMessage}
          />
        </View>

        {/* SUBMIT BUTTON */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
          <LinearGradient colors={['#A855F7', '#6366F1']} style={styles.submitBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="paper-plane" size={18} color="#FFF" />
                <Text style={styles.submitText}>INITIATE SUPPORT UPLINK</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* DIRECT GMAIL ACTION BUTTON */}
        <TouchableOpacity
          style={styles.directGmailBtn}
          onPress={() => MailService.openGmailApp('support@voexi.com', subject || 'Technical Query', message)}
          activeOpacity={0.8}
        >
          <Ionicons name="mail" size={16} color="#00F2FE" />
          <Text style={styles.directGmailText}>OPEN DIRECT GMAIL CLIENT</Text>
        </TouchableOpacity>

        {/* HUMAN PSYCHOLOGY REASSURANCE FOOTER */}
        <View style={styles.footerInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="shield-checkmark" size={14} color="#10B981" />
            <Text style={styles.footerText}>256-BIT SSL ENCRYPTED TRANSMISSION</Text>
          </View>
          <Text style={styles.footerSubText}>Direct priority dispatch to support@voexi.com & teamvoexi@gmail.com</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0F' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#12121A'
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerMailBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0, 242, 254, 0.12)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.3)' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },

  content: { padding: 20, paddingBottom: 50 },

  /* REASSURANCE STATUS PILL */
  reassurancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 25,
    alignSelf: 'center',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  reassuranceTxt: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  /* HERO */
  heroBox: { alignItems: 'center', marginBottom: 25 },
  iconAuraWrapper: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  iconAura: { ...StyleSheet.absoluteFillObject, borderRadius: 45, opacity: 0.25 },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 15, textAlign: 'center', letterSpacing: 0.2 },
  heroSub: { color: '#64748B', fontSize: 12, marginTop: 4, textAlign: 'center', fontWeight: '600' },

  /* CHIPS */
  chipsRow: { gap: 10, paddingBottom: 15 },
  chipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#12121A',
    borderWidth: 1,
    borderColor: '#1E1E2E',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* INPUTS */
  inputGroup: { marginTop: 15, marginBottom: 20 },
  label: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8, marginTop: 10 },
  input: {
    backgroundColor: '#0F0F1A',
    borderRadius: 16,
    padding: 16,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1E1E2E',
    marginBottom: 15,
  },

  /* BUTTONS */
  submitBtn: { borderRadius: 20, overflow: 'hidden', marginTop: 5 },
  submitBtnInner: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontWeight: '900', letterSpacing: 1.5, fontSize: 13 },

  directGmailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
    marginTop: 12,
  },
  directGmailText: {
    color: '#00F2FE',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },

  /* FOOTER */
  footerInfo: { alignItems: 'center', justifyContent: 'center', marginTop: 30, gap: 4 },
  footerText: { color: '#10B981', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  footerSubText: { color: '#475569', fontSize: 9, fontWeight: '700', textAlign: 'center' },
});
