import React, { useState } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { ModerationService } from '../../lib/moderationService';
import { ReportReason, ContentType } from '../../types/moderation';
import * as ImagePicker from 'expo-image-picker';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetId: string;
  targetUserId: string;
  contentType: ContentType;
  currentUserId: string;
}

const REASONS: ReportReason[] = [
  'Spam', 'Harassment or Bullying', 'Hate Speech', 'Violence',
  'Adult Content', 'Child Safety', 'Copyright', 'Fake Information',
  'Scam or Fraud', 'Other'
];

export const ReportModal: React.FC<ReportModalProps> = ({
  visible, onClose, targetId, targetUserId, contentType, currentUserId
}) => {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickScreenshot = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
    });
    if (!result.canceled) setScreenshot(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!reason) return Alert.alert("Required", "Please select a reason.");
    setLoading(true);
    try {
      await ModerationService.submitReport(
        currentUserId, targetUserId, contentType, targetId, reason, description, screenshot || undefined
      );
      Alert.alert("Report Submitted", "Thank you. Our moderation team will review this content.");
      onClose();
      // Reset state
      setReason(null); setDescription(''); setScreenshot(null);
    } catch (e: any) {
      Alert.alert("Error", "Could not submit report: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>REPORT {contentType.toUpperCase()}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>WHY ARE YOU REPORTING THIS?</Text>
            <View style={styles.reasonGrid}>
              {REASONS.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.reasonPill, reason === r && styles.activePill]}
                  onPress={() => setReason(r)}
                >
                  <Text style={[styles.reasonText, reason === r && {color: '#fff'}]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, {marginTop: 25}]}>ADDITIONAL DETAILS</Text>
            <TextInput
              style={styles.input}
              placeholder="Provide context..."
              placeholderTextColor="#444"
              multiline
              value={description}
              onChangeText={setDescription}
            />

            <TouchableOpacity style={styles.uploadBtn} onPress={pickScreenshot}>
               <Ionicons name="image-outline" size={18} color={VOEXITheme.colors.primary} />
               <Text style={styles.uploadText}>{screenshot ? 'SCREENSHOT ATTACHED' : 'ADD SCREENSHOT'}</Text>
            </TouchableOpacity>
            {screenshot && <Image source={{uri: screenshot}} style={styles.preview} />}

            <TouchableOpacity style={[styles.submitBtn, !reason && {opacity: 0.5}]} onPress={handleSubmit} disabled={loading || !reason}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.submitText}>SUBMIT TO MODERATORS</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#0A0A0A', height: '85%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  title: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  content: { flex: 1 },
  label: { color: '#444', fontSize: 10, fontWeight: '900', marginBottom: 15, letterSpacing: 1.5 },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  reasonPill: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: '#111', borderWidth: 1, borderColor: '#222' },
  activePill: { backgroundColor: VOEXITheme.colors.primary, borderColor: VOEXITheme.colors.primary },
  reasonText: { color: '#888', fontSize: 11, fontWeight: 'bold' },
  input: { backgroundColor: '#080808', color: '#fff', padding: 15, borderRadius: 15, minHeight: 100, textAlignVertical: 'top', marginTop: 10, borderWidth: 1, borderColor: '#111' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, backgroundColor: '#111', padding: 15, borderRadius: 15, alignSelf: 'flex-start' },
  uploadText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  preview: { width: 100, height: 100, borderRadius: 10, marginTop: 15 },
  submitBtn: { backgroundColor: '#fff', padding: 18, borderRadius: 15, marginTop: 35, alignItems: 'center' },
  submitText: { color: '#000', fontWeight: '900', letterSpacing: 1 }
});
