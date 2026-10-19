import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { ModerationService } from '../../lib/moderationService';

export default function SubmitAppeal() {
  const { actionId, reportId } = useLocalSearchParams();
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return Alert.alert("Required", "Please provide a reason for your appeal.");

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await ModerationService.submitAppeal(user.id, String(actionId), reason);

      Alert.alert(
        "Appeal Logged",
        "Your appeal has been synchronized. A senior moderator will review the signal.",
        [{ text: "OK", onPress: () => router.replace('/(tabs)/profile') }]
      );
    } catch (e: any) {
      Alert.alert("Error", "Could not submit appeal: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>SUBMIT APPEAL</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
           <Ionicons name="information-circle" size={20} color={VOEXITheme.colors.primary} />
           <Text style={styles.infoText}>You are appealing a moderation action regarding a community guideline violation. Please explain why you believe this decision was incorrect.</Text>
        </View>

        <Text style={styles.label}>YOUR DEFENSE / EXPLANATION</Text>
        <TextInput
          style={styles.input}
          placeholder="State your case clearly..."
          placeholderTextColor="#444"
          multiline
          value={reason}
          onChangeText={setReason}
        />

        <TouchableOpacity
          style={[styles.submitBtn, !reason.trim() && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={loading || !reason.trim()}
        >
           {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.submitText}>TRANSMIT APPEAL</Text>}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>Appeals are reviewed within 48-72 hours. Decisions on appeals are final.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 20, borderBottomWidth: 1, borderBottomColor: '#111' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  content: { padding: 25 },
  infoBox: { flexDirection: 'row', gap: 12, backgroundColor: '#080808', padding: 20, borderRadius: 20, marginBottom: 35, borderWidth: 1, borderColor: '#111' },
  infoText: { flex: 1, color: '#666', fontSize: 13, lineHeight: 20 },
  label: { color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15 },
  input: { backgroundColor: '#0D0D15', borderRadius: 20, padding: 20, color: '#fff', fontSize: 15, minHeight: 180, textAlignVertical: 'top', borderWidth: 1, borderColor: '#1A1A24' },
  submitBtn: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginTop: 40, alignItems: 'center' },
  submitText: { color: '#000', fontWeight: '900', letterSpacing: 1 },
  disclaimer: { color: '#333', fontSize: 11, textAlign: 'center', marginTop: 25, lineHeight: 18 }
});
