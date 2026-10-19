import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { VOEXITheme } from '../constants/theme';
import { NeonInput } from '../components/NeonInput';
import { NeonButton } from '../components/NeonButton';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

/**
 * VOEXI UNIVERSAL PASSWORD RESET (WEB & MOBILE)
 * This page is the primary target for recovery redirects.
 */
export default function UniversalResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const router = useRouter();

  // Password Requirements State
  const [checks, setChecks] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    symbol: false,
    match: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    validateSession();
  }, []);

  const validateSession = async () => {
    try {
      // 1. Initial check (Immediate fragment parsing on Web)
      const { data: { session }, error } = await supabase.auth.getSession();

      if (session) {
        setInitializing(false);
        return;
      }

      // 2. Event Listener (Ensures tokens are captured as the app mounts)
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        console.log("DEBUG: Reset page auth event:", event);
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && newSession)) {
          setInitializing(false);
        }
      });

      // 3. Fail-safe Timeout
      const timer = setTimeout(() => {
        setInitializing((isInit) => {
          if (isInit) setErrorState('Invalid or expired reset link. Please request a new link from the VOEXI app.');
          return false;
        });
      }, 5000);

      return () => {
        listener.subscription.unsubscribe();
        clearTimeout(timer);
      };
    } catch (e) {
      setErrorState('Neural link failure. Please try again.');
      setInitializing(false);
    }
  };

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

  const isFormValid = Object.values(checks).every(Boolean);

  async function handleReset() {
    if (!isFormValid) return;

    setLoading(true);
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      } else {
        if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSuccess(true);
      }
    } catch (e: any) {
      console.error('Password reset error:', e);
      Alert.alert('Security Protocol Failed', e.message || 'The neural link could not be updated.');
    } finally {
      setLoading(false);
    }
  }

  const Requirement = ({ label, met }: { label: string; met: boolean }) => (
    <View style={styles.reqRow}>
      <Ionicons
        name={met ? "checkmark-circle" : "ellipse-outline"}
        size={14}
        color={met ? "#00ff00" : "#333"}
      />
      <Text style={[styles.reqText, met && { color: '#888' }]}>{label}</Text>
    </View>
  );

  if (initializing) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#100', '#000']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={VOEXITheme.colors.primary} />
      </View>
    );
  }

  if (errorState) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#100', '#000']} style={StyleSheet.absoluteFill} />
        <View style={styles.contentCenter}>
          <Ionicons name="alert-circle-outline" size={80} color="#ff4444" />
          <Text style={styles.brandTitle}>LINK INVALID</Text>
          <Text style={styles.instruction}>{errorState}</Text>
          <NeonButton
            title="RETURN TO LOGIN"
            onPress={() => router.replace('/(auth)/login')}
            style={{ marginTop: 30, width: '100%' }}
          />
        </View>
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#100', '#000']} style={StyleSheet.absoluteFill} />
        <View style={styles.contentCenter}>
          <View style={styles.successCircle}>
            <Ionicons name="shield-checkmark" size={50} color="#00ff00" />
          </View>
          <Text style={styles.brandTitle}>NEURAL KEY UPDATED</Text>
          <Text style={styles.instruction}>
            Your password has been changed successfully. You can now return to the VOEXI app and log in.
          </Text>
          {Platform.OS === 'web' ? (
             <Text style={styles.webSuccessHint}>You can now close this browser tab.</Text>
          ) : (
            <NeonButton
              title="RETURN TO STATION"
              onPress={() => router.replace('/(tabs)')}
              style={{ marginTop: 30, width: '100%' }}
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#100', '#000']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.brandTitle}>CREATE NEW PASSWORD</Text>
            <Text style={styles.tagline}>SECURE NEURAL ACCESS</Text>
          </View>

          <View style={styles.glassCard}>
            <Text style={styles.mainInstruction}>
              Choose a secure new password for your VOEXI account.
            </Text>

            <View style={styles.inputContainer}>
              <NeonInput
                label="NEW PASSWORD"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                icon="lock-closed-outline"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.requirementsGrid}>
              <Requirement label="At least 8 characters" met={checks.length} />
              <Requirement label="Uppercase letter" met={checks.upper} />
              <Requirement label="Lowercase letter" met={checks.lower} />
              <Requirement label="Include a number" met={checks.number} />
              <Requirement label="Special character (@, #, $)" met={checks.symbol} />
            </View>

            <View style={[styles.inputContainer, { marginTop: 20 }]}>
              <NeonInput
                label="CONFIRM NEW PASSWORD"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                icon="shield-checkmark-outline"
                secureTextEntry={!showConfirmPassword}
                error={confirmPassword !== '' && !checks.match}
              />
              <TouchableOpacity
                style={styles.eyeToggle}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <NeonButton
              title="UPDATE PASSWORD"
              onPress={handleReset}
              loading={loading}
              disabled={!isFormValid || loading}
              style={{ marginTop: 30 }}
            />
          </View>

          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={{ marginTop: 40 }}
          >
            <Text style={{ color: '#444', fontWeight: 'bold', letterSpacing: 1 }}>CANCEL RECOVERY</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  scrollContent: { padding: 24, paddingTop: 80, alignItems: 'center' },
  contentCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  brandTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', letterSpacing: 4, textAlign: 'center' },
  tagline: { color: VOEXITheme.colors.secondary, fontSize: 10, fontWeight: 'bold', letterSpacing: 2, marginTop: 5 },
  glassCard: { width: '100%', maxWidth: 500, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 25, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  mainInstruction: { color: '#aaa', fontSize: 13, marginBottom: 25, textAlign: 'center', lineHeight: 20 },
  instruction: { color: '#aaa', fontSize: 16, textAlign: 'center', lineHeight: 24, marginTop: 20 },
  successCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0, 255, 0, 0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  requirementsGrid: { paddingHorizontal: 10, gap: 8 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reqText: { color: '#444', fontSize: 12, fontWeight: '500' },
  inputContainer: { width: '100%', position: 'relative' },
  eyeToggle: { position: 'absolute', right: 15, top: 38, zIndex: 10 },
  webSuccessHint: { color: '#666', fontSize: 13, marginTop: 20, textAlign: 'center' }
});
