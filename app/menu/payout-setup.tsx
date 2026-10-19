import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { WalletService } from '../../lib/walletService';
import { useTheme } from '../../hooks/useTheme';

export default function PayoutSetupScreen() {
  const router = useRouter();
  const { theme: themeMode, isLight } = useTheme();
  const [type, setType] = useState<'upi' | 'bank'>('upi');
  const [upiId, setUpiId] = useState('');
  const [bankAcc, setBankAcc] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (type === 'upi' && !upiId.includes('@')) {
      return Alert.alert('Invalid UPI', 'Please enter a valid UPI ID (e.g. name@bank)');
    }
    if (type === 'bank' && (bankAcc.length < 10 || bankIfsc.length < 5)) {
      return Alert.alert('Invalid Details', 'Please enter valid Bank Account and IFSC.');
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const success = await WalletService.savePayoutAccount(user.id, {
        payout_type: type,
        upi_id: type === 'upi' ? upiId : null,
        bank_account_number: type === 'bank' ? bankAcc : null,
        bank_ifsc: type === 'bank' ? bankIfsc : null
      });

      if (success) {
        Alert.alert('Success', 'Payout method saved successfully.');
        router.back();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <View style={[styles.header, isLight && { borderBottomColor: '#EEE' }]}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={28} color={isLight ? '#000' : "#fff"} /></TouchableOpacity>
        <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>PAYOUT SETUP</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.label, isLight && { color: '#CCC' }]}>SELECT PAYOUT METHOD</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }, type === 'upi' && styles.typeActive]}
              onPress={() => setType('upi')}
            >
              <Ionicons name="phone-portrait-outline" size={20} color={type === 'upi' ? '#fff' : (isLight ? '#999' : '#444')} />
              <Text style={[styles.typeText, isLight && { color: '#999' }, type === 'upi' && {color:'#fff'}]}>UPI ID</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }, type === 'bank' && styles.typeActive]}
              onPress={() => setType('bank')}
            >
              <Ionicons name="business-outline" size={20} color={type === 'bank' ? '#fff' : (isLight ? '#999' : '#444')} />
              <Text style={[styles.typeText, isLight && { color: '#999' }, type === 'bank' && {color:'#fff'}]}>BANK ACC</Text>
            </TouchableOpacity>
          </View>

          {type === 'upi' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>UPI ID (GPay, PhonePe, Paytm)</Text>
              <TextInput
                style={[styles.input, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE', color: '#000' }]}
                placeholder="example@upi"
                placeholderTextColor="#444"
                value={upiId}
                onChangeText={setUpiId}
                autoCapitalize="none"
              />
            </View>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>BANK ACCOUNT NUMBER</Text>
                <TextInput
                  style={[styles.input, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE', color: '#000' }]}
                  placeholder="00000000000"
                  placeholderTextColor="#444"
                  value={bankAcc}
                  onChangeText={setBankAcc}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>IFSC CODE</Text>
                <TextInput
                  style={[styles.input, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE', color: '#000' }]}
                  placeholder="SBIN0000000"
                  placeholderTextColor="#444"
                  value={bankIfsc}
                  onChangeText={setBankIfsc}
                  autoCapitalize="characters"
                />
              </View>
            </>
          )}

          <Text style={[styles.info, isLight && { color: '#CCC' }]}>
            Ensure these details are correct. Incorrect information will lead to failed payouts.
            VOEXI is not responsible for money sent to wrong accounts.
          </Text>

          <TouchableOpacity style={[styles.saveBtn, isLight && { backgroundColor: '#000' }]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.saveText, isLight && { color: '#fff' }]}>SAVE DETAILS</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  content: { padding: 25 },
  label: { color: '#444', fontSize: 10, fontWeight: 'bold', marginBottom: 15, letterSpacing: 1 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#080808', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#111' },
  typeActive: { backgroundColor: VOEXITheme.colors.primary, borderColor: VOEXITheme.colors.primary },
  typeText: { color: '#444', fontSize: 12, fontWeight: 'bold' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { color: '#666', fontSize: 11, marginBottom: 8, marginLeft: 5 },
  input: { backgroundColor: '#080808', color: '#fff', padding: 18, borderRadius: 15, borderWidth: 1, borderColor: '#111' },
  info: { color: '#333', fontSize: 11, lineHeight: 18, marginTop: 10 },
  saveBtn: { backgroundColor: '#fff', padding: 18, borderRadius: 20, marginTop: 40, alignItems: 'center' },
  saveText: { color: '#000', fontWeight: '900', letterSpacing: 1 }
});
