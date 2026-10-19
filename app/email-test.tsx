import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmailService } from '../lib/emailService';
import { VOEXITheme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';

export default function EmailTestScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleTestSend = async () => {
    if (!email.includes('@')) {
      return Alert.alert('Invalid Email', 'Please enter a valid target email.');
    }

    setLoading(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const result = await EmailService.sendVerificationEmail(email, code);

      if (result.success) {
        Alert.alert('Success', `Verification email dispatched to ${email}.\nID: ${result.id}`);
      } else {
        Alert.alert('Dispatch Failed', result.error || 'Server error occurred');
      }
    } catch (e: any) {
      Alert.alert('Network Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Email Relay Test', headerTransparent: true, headerTintColor: '#fff' }} />

      <View style={styles.content}>
        <Ionicons name="mail-unread-outline" size={80} color={VOEXITheme.colors.primary} />
        <Text style={styles.title}>Neural Email Relay</Text>
        <Text style={styles.subtitle}>Test your Cloudflare Worker + Resend integration.</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>TARGET EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="user@example.com"
            placeholderTextColor="#444"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.7 }]}
          onPress={handleTestSend}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.btnText}>DISPATCH TEST SIGNAL</Text>
          )}
        </TouchableOpacity>

        <View style={styles.hintBox}>
          <Ionicons name="information-circle-outline" size={16} color="#666" />
          <Text style={styles.hintText}>Ensure worker is deployed and URL is updated in lib/emailService.ts</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, padding: 30, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 20 },
  subtitle: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 10, marginBottom: 40 },
  inputContainer: { width: '100%', marginBottom: 25 },
  label: { color: VOEXITheme.colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 10 },
  input: { backgroundColor: '#0A0A0A', borderBottomWidth: 1, borderBottomColor: '#222', color: '#fff', padding: 15, fontSize: 16 },
  btn: { backgroundColor: '#fff', width: '100%', padding: 18, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#000', fontWeight: '900', letterSpacing: 1 },
  hintBox: { flexDirection: 'row', gap: 10, marginTop: 30, alignItems: 'center', paddingHorizontal: 20 },
  hintText: { color: '#444', fontSize: 11, textAlign: 'center' }
});
