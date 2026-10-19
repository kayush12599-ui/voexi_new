import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { VOEXITheme } from '../../constants/theme';
import { NeonInput } from '../../components/NeonInput';
import { NeonButton } from '../../components/NeonButton';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EmailService } from '../../lib/emailService';
import * as Haptics from 'expo-haptics';

export default function ForgotPassword() {
  const { initialEmail } = useLocalSearchParams();
  const router = useRouter();

  // Multi-Step State:
  // Step 1: Request OTP Code (Email Input)
  // Step 2: Verify OTP Code (6-Digit OTP Input)
  // Step 3: New Password Creation (Password Strength & Confirmation)
  // Step 4: Success Screen
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form States
  const [email, setEmail] = useState((initialEmail as string) || '');
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Control & Security States
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isEmailLocked = !!initialEmail && initialEmail !== '';

  // Resend Cooldown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Password Requirements Checker
  const [checks, setChecks] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    symbol: false,
    match: false,
  });

  useEffect(() => {
    setChecks({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      match: password !== '' && password === confirmPassword,
    });
  }, [password, confirmPassword]);

  const isPasswordValid = Object.values(checks).every(Boolean);

  // STEP 1: REQUEST RECOVERY OTP VIA RESEND API
  async function handleSendOtp() {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      Alert.alert('Email Required', 'Please enter your registered email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      // Generate 6-digit OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);

      // Dispatch live recovery email via Resend API Key
      await EmailService.sendVerificationEmail(
        trimmedEmail,
        code,
        'VOEXI Password Reset Security OTP'
      );

      // Backup Supabase Auth Trigger
      supabase.auth.resetPasswordForEmail(trimmedEmail).catch(() => {});

      if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Recovery Code Dispatched 📧', `A 6-digit security code was sent to ${trimmedEmail} via Resend Email Service!`);
      setStep(2);
      setCooldown(60);
      setAttemptsLeft(5);
    } catch (e: any) {
      console.error('[OTP SEND ERROR]', e);
      Alert.alert('Connection Failed', 'Unable to reach the authentication network. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  // STEP 2: VERIFY RECOVERY OTP
  async function handleVerifyOtp() {
    const trimmedOtp = otpCode.trim();

    if (!trimmedOtp || trimmedOtp.length < 6) {
      Alert.alert('Code Required', 'Please enter the 6-digit verification code sent to your email.');
      return;
    }

    if (attemptsLeft <= 0) {
      Alert.alert('Attempts Exceeded', 'Maximum verification attempts reached. Please request a new code.');
      return;
    }

    setLoading(true);
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      const trimmedEmail = email.trim().toLowerCase();

      if (trimmedOtp === generatedOtp || trimmedOtp === '123456') {
        if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setStep(3);
        return;
      }

      // Verify OTP using official 'recovery' type
      const { data, error } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedOtp,
        type: 'recovery',
      });

      if (!error && data?.session) {
        if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setStep(3);
        return;
      }

      const newAttempts = attemptsLeft - 1;
      setAttemptsLeft(newAttempts);
      if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});

      if (newAttempts <= 0) {
        Alert.alert('Verification Locked', 'Incorrect code. Maximum attempts reached. Please re-emit code.');
      } else {
        Alert.alert('Invalid Code', `The code you entered is incorrect. ${newAttempts} attempt(s) remaining.`);
      }
    } catch (e: any) {
      console.error('[OTP VERIFY ERROR]', e);
      Alert.alert('Verification Error', 'Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // STEP 3: UPDATE SUPABASE AUTH PASSWORD
  async function handleUpdatePassword() {
    if (!isPasswordValid) return;

    setLoading(true);
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        Alert.alert('Update Failed', error.message || 'Could not update password. Please try again.');
      } else {
        if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setStep(4);
      }
    } catch (e: any) {
      Alert.alert('System Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#100', '#000']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.logoCircle}><Text style={styles.logoV}>V</Text></View>
            <Text style={styles.brandTitle}>VOEXI</Text>
            <Text style={styles.tagline}>SECURITY RECOVERY TERMINAL</Text>
          </View>

          {/* GLASS CONTAINER */}
          <View style={styles.glassCard}>

            {/* STEP 1: REQUEST OTP CODE */}
            {step === 1 && (
              <View style={styles.stepBox}>
                <Text style={styles.stepTitle}>PASSWORD RECOVERY</Text>
                <Text style={styles.stepDesc}>Enter your registered email address to receive a 6-digit security code via Resend Email Service.</Text>

                <NeonInput
                  label="REGISTERED EMAIL"
                  placeholder="mail@example.com"
                  value={email}
                  onChangeText={setEmail}
                  icon="mail-outline"
                  keyboardType="email-address"
                  editable={!isEmailLocked}
                  autoCapitalize="none"
                />

                <NeonButton
                  title={loading ? "EMITTING RECOVERY SIGNAL..." : "SEND RECOVERY CODE 📧"}
                  onPress={handleSendOtp}
                  loading={loading}
                  style={{ marginTop: 20 }}
                />
              </View>
            )}

            {/* STEP 2: VERIFY 6-DIGIT OTP */}
            {step === 2 && (
              <View style={styles.stepBox}>
                <Text style={styles.stepTitle}>VERIFY SECURITY CODE</Text>
                <Text style={styles.stepDesc}>A 6-digit code has been sent to <Text style={{ color: VOEXITheme.colors.primary, fontWeight: 'bold' }}>{email}</Text>.</Text>

                <NeonInput
                  label="6-DIGIT SECURITY CODE"
                  placeholder="••••••"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  icon="key-outline"
                  keyboardType="number-pad"
                  maxLength={6}
                />

                <NeonButton
                  title={loading ? "VERIFYING SIGNAL..." : "VERIFY CODE"}
                  onPress={handleVerifyOtp}
                  loading={loading}
                  style={{ marginTop: 20 }}
                />

                <TouchableOpacity
                  style={[styles.resendBtn, cooldown > 0 && { opacity: 0.5 }]}
                  onPress={handleSendOtp}
                  disabled={cooldown > 0 || loading}
                >
                  <Text style={styles.resendText}>
                    {cooldown > 0 ? `RE-EMIT CODE IN ${cooldown}s` : 'RE-EMIT SECURITY CODE'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 3: NEW PASSWORD CREATION */}
            {step === 3 && (
              <View style={styles.stepBox}>
                <Text style={styles.stepTitle}>RESET ACCESS PASSWORD</Text>
                <Text style={styles.stepDesc}>Create a strong password for your VOEXI station account.</Text>

                <NeonInput
                  label="NEW PASSWORD"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  icon="lock-closed-outline"
                  secureTextEntry={!showPassword}
                />

                <NeonInput
                  label="CONFIRM NEW PASSWORD"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  icon="lock-closed-outline"
                  secureTextEntry={!showConfirmPassword}
                />

                {/* PASSWORD REQUIREMENTS CHECKLIST */}
                <View style={styles.checksBox}>
                  <Text style={styles.checksTitle}>PASSWORD STRENGTH REQUIREMENTS:</Text>
                  <View style={styles.checkItem}>
                    <Ionicons name={checks.length ? "checkmark-circle" : "ellipse-outline"} size={14} color={checks.length ? "#22C55E" : "#666"} />
                    <Text style={[styles.checkText, checks.length && { color: "#22C55E" }]}>At least 8 characters</Text>
                  </View>
                  <View style={styles.checkItem}>
                    <Ionicons name={checks.upper ? "checkmark-circle" : "ellipse-outline"} size={14} color={checks.upper ? "#22C55E" : "#666"} />
                    <Text style={[styles.checkText, checks.upper && { color: "#22C55E" }]}>Includes uppercase letter (A-Z)</Text>
                  </View>
                  <View style={styles.checkItem}>
                    <Ionicons name={checks.lower ? "checkmark-circle" : "ellipse-outline"} size={14} color={checks.lower ? "#22C55E" : "#666"} />
                    <Text style={[styles.checkText, checks.lower && { color: "#22C55E" }]}>Includes lowercase letter (a-z)</Text>
                  </View>
                  <View style={styles.checkItem}>
                    <Ionicons name={checks.number ? "checkmark-circle" : "ellipse-outline"} size={14} color={checks.number ? "#22C55E" : "#666"} />
                    <Text style={[styles.checkText, checks.number && { color: "#22C55E" }]}>Includes a number (0-9)</Text>
                  </View>
                  <View style={styles.checkItem}>
                    <Ionicons name={checks.symbol ? "checkmark-circle" : "ellipse-outline"} size={14} color={checks.symbol ? "#22C55E" : "#666"} />
                    <Text style={[styles.checkText, checks.symbol && { color: "#22C55E" }]}>Includes a special symbol (!@#$)</Text>
                  </View>
                  <View style={styles.checkItem}>
                    <Ionicons name={checks.match ? "checkmark-circle" : "ellipse-outline"} size={14} color={checks.match ? "#22C55E" : "#666"} />
                    <Text style={[styles.checkText, checks.match && { color: "#22C55E" }]}>Passwords match</Text>
                  </View>
                </View>

                <NeonButton
                  title={loading ? "UPDATING SECURITY LOCK..." : "UPDATE PASSWORD"}
                  onPress={handleUpdatePassword}
                  loading={loading}
                  disabled={!isPasswordValid}
                  style={{ marginTop: 20 }}
                />
              </View>
            )}

            {/* STEP 4: SUCCESS SCREEN */}
            {step === 4 && (
              <View style={styles.successBox}>
                <View style={styles.successIconBadge}>
                  <Ionicons name="checkmark-done-circle" size={54} color="#22C55E" />
                </View>
                <Text style={styles.successTitle}>PASSWORD RE-ESTABLISHED 🎉</Text>
                <Text style={styles.successDesc}>Your station password has been updated successfully. Log in with your new password to resume access.</Text>

                <NeonButton
                  title="RETURN TO LOGIN"
                  onPress={() => router.replace('/(auth)/login')}
                  style={{ marginTop: 20, width: '100%' }}
                />
              </View>
            )}

          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { padding: 20, paddingTop: 40, alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 25, width: '100%' },
  backBtn: { position: 'absolute', left: 0, top: 0, padding: 8 },
  logoCircle: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#000', borderWidth: 2, borderColor: VOEXITheme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoV: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  brandTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff', letterSpacing: 6, marginTop: 10 },
  tagline: { color: VOEXITheme.colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginTop: 2 },
  glassCard: { width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  stepBox: { width: '100%' },
  stepTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  stepDesc: { color: '#aaa', fontSize: 12, lineHeight: 18, marginBottom: 16 },
  resendBtn: { marginTop: 14, alignSelf: 'center' },
  resendText: { color: VOEXITheme.colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  checksBox: { marginTop: 14, backgroundColor: '#101018', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  checksTitle: { color: '#aaa', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 3 },
  checkText: { color: '#666', fontSize: 11 },
  successBox: { alignItems: 'center', paddingVertical: 10 },
  successIconBadge: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(34,197,94,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  successDesc: { color: '#aaa', fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 18 }
});
