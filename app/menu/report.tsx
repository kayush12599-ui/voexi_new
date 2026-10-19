import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';
import { MailService } from '../../lib/mailService';

export default function HelpSupportHub() {
  const router = useRouter();
  const { theme: themeMode, isLight } = useTheme();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

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

      // 3. Dispatch Cloud Email Alert to support@voexi.com
      await MailService.sendNeuralAlert(
        'support@voexi.com',
        `[VOEXI SUPPORT TICKET] ${subject}`,
        `User Email: ${userEmail}\nUser ID: ${userId || 'Anonymous'}\n\nSubject: ${subject}\n\nMessage:\n${message}`
      );

      setLoading(false);

      // 4. Prompt user with confirmation & option to open native Mail App directly
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

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <View style={[styles.header, isLight && { borderBottomColor: '#EEE' }]}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={28} color={isLight ? '#000' : "#fff"} /></TouchableOpacity>
        <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>SPECTRUM SUPPORT</Text>
        <View style={{width: 28}} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
         <View style={styles.heroBox}>
            <Ionicons name="help-buoy" size={60} color={VOEXITheme.colors.primary} />
            <Text style={[styles.heroTitle, isLight && { color: '#000' }]}>How can we assist your station?</Text>
            <Text style={styles.heroSub}>Direct uplink to VOEXI technical commanders.</Text>
         </View>

         <View style={styles.inputGroup}>
            <Text style={[styles.label, isLight && { color: '#CCC' }]}>TRANSMISSION SUBJECT</Text>
            <TextInput
              style={[styles.input, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE', color: '#000' }]}
              placeholder="e.g. Monetization Error, Bug Report..."
              placeholderTextColor="#333"
              value={subject}
              onChangeText={setSubject}
            />

            <Text style={[styles.label, isLight && { color: '#CCC' }]}>NEURAL LOG (MESSAGE)</Text>
            <TextInput
              style={[styles.input, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE', color: '#000' }, {height: 150, textAlignVertical: 'top'}]}
              placeholder="Describe the technical deviation in detail..."
              placeholderTextColor="#333"
              multiline
              value={message}
              onChangeText={setMessage}
            />
         </View>

         <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            <LinearGradient colors={[VOEXITheme.colors.primary, '#9333ea']} style={styles.submitBtnInner}>
               {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>INITIATE SUPPORT UPLINK</Text>}
            </LinearGradient>
         </TouchableOpacity>

         <View style={styles.footerInfo}>
            <Ionicons name="shield-checkmark" size={16} color="#00ff00" />
            <Text style={styles.footerText}>Secure SSL encrypted transmission to support@voexi.com</Text>
         </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  content: { padding: 25 },
  heroBox: { alignItems: 'center', marginBottom: 40, marginTop: 10 },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 20, textAlign: 'center' },
  heroSub: { color: '#444', fontSize: 12, marginTop: 8, textAlign: 'center' },
  inputGroup: { marginBottom: 30 },
  label: { color: '#444', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12 },
  input: { backgroundColor: '#080808', borderRadius: 15, padding: 18, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#111', marginBottom: 25 },
  submitBtn: { borderRadius: 20, overflow: 'hidden', marginTop: 10 },
  submitBtnInner: { paddingVertical: 20, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '900', letterSpacing: 2, fontSize: 13 },
  footerInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 40, opacity: 0.5 },
  footerText: { color: '#aaa', fontSize: 10, fontWeight: 'bold' }
});
