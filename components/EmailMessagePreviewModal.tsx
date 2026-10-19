import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface EmailMessagePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  toEmail: string;
  subject: string;
  otpCode: string;
  purpose: string;
  stationName?: string;
  onAutoFill?: () => void;
}

export const EmailMessagePreviewModal: React.FC<EmailMessagePreviewModalProps> = ({
  visible,
  onClose,
  toEmail,
  subject,
  otpCode,
  purpose,
  stationName,
  onAutoFill
}) => {
  if (!visible) return null;

  const openMailApp = async () => {
    try {
      const url = Platform.OS === 'ios' ? 'message://' : 'mailto:';
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL('https://mail.google.com');
      }
    } catch (e) {
      await Linking.openURL('https://mail.google.com').catch(() => {});
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>

          {/* DRAG HANDLE */}
          <View style={styles.dragHandle} />

          {/* EMAIL HEADER BAR */}
          <View style={styles.emailHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="mail" size={18} color="#A855F7" />
                <Text style={styles.inboxTitle}>INBOX MESSAGE PREVIEW</Text>
              </View>
              <Text style={styles.inboxSub}>Transmitted to {toEmail || 'recipient'}</Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>

            {/* EMAIL MESSAGE CARD FRAME */}
            <View style={styles.mailCard}>

              {/* SENDER META */}
              <View style={styles.metaRow}>
                <View style={styles.senderAvatar}>
                  <Text style={styles.avatarText}>V</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.senderName}>VOEXI Security Ops</Text>
                    <Text style={styles.timeTag}>Just Now</Text>
                  </View>
                  <Text style={styles.senderEmail}>noreply@voexi.com</Text>
                  <Text style={styles.toTag}>To: {toEmail}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* SUBJECT */}
              <Text style={styles.subjectText}>{subject}</Text>

              {/* EMAIL BODY STYLIZED CONTENT */}
              <View style={styles.mailBodyBox}>

                {/* BANNER */}
                <LinearGradient colors={['#A855F7', '#6366F1']} style={styles.bannerGrad}>
                  <Text style={styles.bannerLogo}>VOEXI</Text>
                  <Text style={styles.bannerSub}>NEURAL SECURITY OPERATIONS</Text>
                </LinearGradient>

                <View style={styles.bodyPadding}>
                  <Text style={styles.reqTag}>VERIFICATION REQUIRED</Text>
                  <Text style={styles.purposeText}>{purpose}</Text>
                  <Text style={styles.bodyDesc}>
                    Use the 6-digit OTP security code below to authorize this action for <Text style={{ color: '#fff', fontWeight: 'bold' }}>{toEmail}</Text>:
                  </Text>

                  {/* GLOWING OTP CONTAINER */}
                  <View style={styles.otpVaultBox}>
                    <Text style={styles.otpVaultLabel}>YOUR 6-DIGIT OTP CODE</Text>
                    <Text style={styles.otpValText}>{otpCode}</Text>
                    <Text style={styles.otpTimerText}>VALID FOR 10 MINUTES • DO NOT SHARE</Text>
                  </View>

                  {stationName && (
                    <View style={styles.stationRow}>
                      <Ionicons name="radio" size={14} color="#A855F7" />
                      <Text style={styles.stationLabel}>Target Station: </Text>
                      <Text style={styles.stationVal}>{stationName}</Text>
                    </View>
                  )}

                  <View style={styles.bodyFooter}>
                    <Text style={styles.footerNote}>
                      VOEXI Inc. • Aadhaar & Neural Encryption Certified Security Operations
                    </Text>
                  </View>
                </View>

              </View>

            </View>

            {/* ACTION BUTTONS */}
            <View style={styles.actionRow}>
              {onAutoFill && (
                <TouchableOpacity
                  style={styles.autoFillBtn}
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                    onAutoFill();
                    onClose();
                  }}
                >
                  <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.autoFillGrad}>
                    <Ionicons name="flash" size={18} color="#fff" />
                    <Text style={styles.autoFillText}>AUTO-FILL OTP CODE</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.openMailBtn} onPress={openMailApp}>
                <Ionicons name="mail-open" size={18} color="#A855F7" />
                <Text style={styles.openMailText}>OPEN GMAIL / MAIL APP</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 30 }} />
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end'
  },
  sheetContainer: {
    width: '100%',
    backgroundColor: '#0C0C14',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 20
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginTop: 10
  },
  emailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  inboxTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  inboxSub: { color: '#888', fontSize: 10, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollArea: { paddingHorizontal: 16, paddingTop: 14 },
  mailCard: {
    backgroundColor: '#12121E',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16
  },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  senderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A855F7',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  senderName: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  timeTag: { color: '#888', fontSize: 10 },
  senderEmail: { color: '#A855F7', fontSize: 11, marginTop: 1 },
  toTag: { color: '#888', fontSize: 10, marginTop: 1 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 12 },
  subjectText: { color: '#fff', fontSize: 15, fontWeight: '900', marginBottom: 14 },
  mailBodyBox: {
    backgroundColor: '#09090E',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  bannerGrad: { paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center' },
  bannerLogo: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  bodyPadding: { padding: 18 },
  reqTag: { color: '#A855F7', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 6 },
  purposeText: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 10 },
  bodyDesc: { color: '#aaa', fontSize: 12, lineHeight: 18, marginBottom: 16 },
  otpVaultBox: {
    backgroundColor: '#161626',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#A855F7',
    padding: 16,
    alignItems: 'center',
    marginVertical: 10,
    borderStyle: 'dashed'
  },
  otpVaultLabel: { color: '#aaa', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 },
  otpValText: { color: '#00F2FE', fontSize: 32, fontWeight: '900', letterSpacing: 8, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  otpTimerText: { color: '#22C55E', fontSize: 10, fontWeight: 'bold', marginTop: 6 },
  stationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  stationLabel: { color: '#aaa', fontSize: 11 },
  stationVal: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  bodyFooter: { marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  footerNote: { color: '#666', fontSize: 10, textAlign: 'center', lineHeight: 14 },
  actionRow: { gap: 10 },
  autoFillBtn: { borderRadius: 14, overflow: 'hidden' },
  autoFillGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, gap: 8 },
  autoFillText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  openMailBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderWidth: 1,
    borderColor: '#A855F7',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8
  },
  openMailText: { color: '#A855F7', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 }
});
