import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { VOEXITheme } from '../../constants/theme';
import { NeonInput } from '../../components/NeonInput';
import { NeonButton } from '../../components/NeonButton';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { createURL, parse } from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../hooks/useLanguage';
import { BiometricService } from '../../lib/biometricService';

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Login() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try { WebBrowser.maybeCompleteAuthSession(); } catch (e) {}
    AsyncStorage.getItem('last_email').then(val => {
      if (val) setEmail(val);
    });
  }, []);

  async function handleLogin() {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Missing Info', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: password
      });

      if (error) {
        if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        if (error.message.includes('Email not confirmed')) {
          Alert.alert(
            'Verification Required',
            'Your email address has not been verified yet. Please enter your 6-digit OTP to complete signup.',
            [
              {
                text: 'Enter OTP',
                onPress: () => router.push({ pathname: '/(auth)/signup', params: { initialEmail: trimmedEmail } })
              },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        } else if (error.message.includes('Invalid login credentials')) {
          Alert.alert('Login Failed', 'Wrong email or password. Please try again.');
        } else {
          Alert.alert('Access Denied', error.message);
        }
      } else if (data?.user) {
        if (!data.user.email_confirmed_at) {
          await supabase.auth.signOut();
          if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(
            'Verification Required',
            'Your email address has not been verified yet. Please enter your 6-digit OTP to complete signup.',
            [
              {
                text: 'Enter OTP',
                onPress: () => router.push({ pathname: '/(auth)/signup', params: { initialEmail: trimmedEmail } })
              },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_deleted')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profile?.is_deleted) {
          await supabase.auth.signOut();
          if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('IDENTITY ERASED', 'This node has been permanently disconnected.', [{ text: 'UNDERSTOOD' }]);
          setLoading(false);
          return;
        }

        if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await AsyncStorage.removeItem('@my_local_uploads').catch(() => {});
        await AsyncStorage.setItem('last_email', trimmedEmail);
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      console.error('Unexpected Login error:', e);
      Alert.alert('Error', 'Network error or server down. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskeyLogin() {
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);

    try {
      const isVerified = await BiometricService.authenticatePasskey('Sign in to VOEXI with Fingerprint / Face ID');
      if (!isVerified) {
        Alert.alert('Authentication Cancelled', 'Fingerprint / Face ID was not recognized.');
        return;
      }

      const { data: sessData } = await supabase.auth.getSession();
      if (sessData?.session?.user) {
        if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)');
        return;
      }

      const lastEmail = await AsyncStorage.getItem('last_email');
      if (lastEmail) {
        const { data: prof } = await supabase.from('profiles').select('id, is_deleted').eq('email', lastEmail).maybeSingle();
        if (prof) {
          if (prof.is_deleted) {
            Alert.alert('IDENTITY ERASED', 'This node is permanently disconnected.');
            return;
          }
          if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/(tabs)');
          return;
        }
      }

      Alert.alert('Passkey Verified', 'Biometric identity confirmed! Enter your password once to complete session pairing.');
    } catch (e: any) {
      Alert.alert('Passkey Error', e.message || 'Passkey authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);

    try {
      const redirectUrl = createURL('/');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        if (error.message.includes("provider is not enabled")) {
          Alert.alert('Provider Disabled', 'Google Login is not enabled in your Supabase Dashboard.');
        } else {
          Alert.alert('Google Login Failed', error.message);
        }
        return;
      }

      if (!data?.url) {
        Alert.alert('Error', 'Google Login URL not found.');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success' && result.url) {
        const { queryParams } = parse(result.url);
        let access_token = queryParams?.access_token;
        let refresh_token = queryParams?.refresh_token;

        if (access_token && refresh_token) {
           const { data: { user } } = await supabase.auth.setSession({
             access_token: access_token as string,
             refresh_token: refresh_token as string,
           });

           if (user) {
             const { data: prof } = await supabase.from('profiles').select('is_deleted').eq('id', user.id).maybeSingle();
             if (prof?.is_deleted) {
               await supabase.auth.signOut();
               Alert.alert('IDENTITY ERASED', 'This node is permanently disconnected.');
               setLoading(false);
               return;
             }
           }
           router.replace('/(tabs)');
        }
      }
    } catch (e: any) {
      Alert.alert('System Error', e.message || 'Connection to VOEXI servers failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#100', '#000']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, width: '100%', minHeight: '100%' }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoCircle}><Text style={styles.logoV}>V</Text></View>
            <Text style={styles.brandTitle}>VOEXI</Text>
            <Text style={styles.tagline}>PREMIUM CREATOR PLATFORM</Text>
          </View>

          <View style={styles.glassCard}>
            <Text style={styles.welcomeText}>{t('auth.login_title')}</Text>
            <NeonInput label={t('auth.email')} placeholder="mail@example.com" value={email} onChangeText={setEmail} icon="mail-outline" keyboardType="email-address" />
            <NeonInput label={t('auth.password')} placeholder="••••••••" value={password} onChangeText={setPassword} icon="lock-closed-outline" secureTextEntry />

            <TouchableOpacity
              onPress={() => router.push({
                pathname: '/(auth)/forgot-password',
                params: { initialEmail: email }
              })}
              style={{ alignSelf: 'flex-end', marginBottom: 15, marginTop: -5 }}
            >
              <Text style={{ color: VOEXITheme.colors.primary, fontSize: 12, fontWeight: 'bold', opacity: 0.8 }}>Forgot Password?</Text>
            </TouchableOpacity>

            <NeonButton title={t('auth.login_btn')} onPress={handleLogin} loading={loading} style={{ marginTop: 10 }} />

            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.line} />
            </View>

            {/* PASSKEY / BIOMETRIC LOGIN BUTTON */}
            <Pressable
              style={({ pressed }) => [
                styles.passkeyBtn,
                pressed && { backgroundColor: 'rgba(168,85,247,0.2)', transform: [{ scale: 0.98 }] }
              ]}
              onPress={handlePasskeyLogin}
            >
              <View style={styles.passkeyIconBox}>
                <Ionicons name="finger-print" size={22} color="#A855F7" />
              </View>
              <Text style={styles.passkeyBtnText}>SIGN IN WITH PASSKEY / FINGERPRINT</Text>
            </Pressable>

            {/* GOOGLE SIGN IN BUTTON */}
            <Pressable
              style={({ pressed }) => [
                styles.googleBtn,
                pressed && { backgroundColor: 'rgba(255,255,255,0.1)', transform: [{ scale: 0.98 }] }
              ]}
              onPress={handleGoogleLogin}
            >
              <View style={styles.googleIconBox}>
                <Ionicons name="logo-google" size={20} color="#fff" />
              </View>
              <Text style={styles.googleBtnText}>{t('auth.google_btn')}</Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={{color: '#444'}}>{t('auth.no_account')} </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity><Text style={{color: VOEXITheme.colors.primary, fontWeight: 'bold'}}>{t('auth.signup_btn')}</Text></TouchableOpacity>
            </Link>
          </View>

          <TouchableOpacity
            onPress={async () => {
              await supabase.auth.signOut();
              await AsyncStorage.removeItem('last_email');
              Alert.alert('System Reset', 'Your session and local cache have been cleared.');
            }}
            style={{ marginTop: 50, padding: 10 }}
          >
            <Text style={{ color: VOEXITheme.colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, opacity: 0.6 }}>LOGIN ISSUES? RESET SESSION</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', minHeight: '100vh', backgroundColor: '#000' },
  scrollContent: { padding: 24, paddingTop: 80, alignItems: 'center', width: '100%', maxWidth: 480, alignSelf: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 80, height: 80, borderRadius: 25, backgroundColor: '#000', borderWidth: 2, borderColor: VOEXITheme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  logoV: { fontSize: 48, fontWeight: 'bold', color: '#fff' },
  brandTitle: { fontSize: 32, fontWeight: 'bold', color: '#fff', letterSpacing: 8, marginTop: 15 },
  tagline: { color: VOEXITheme.colors.secondary, fontSize: 10, fontWeight: 'bold', letterSpacing: 2 },
  glassCard: { width: '100%', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 25, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  welcomeText: { fontSize: 24, fontWeight: 'bold' , color: '#fff', marginBottom: 20 },
  footer: { flexDirection: 'row', marginTop: 40 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: '#444', marginHorizontal: 15, fontSize: 12, fontWeight: 'bold' },
  passkeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderRadius: 15,
    height: 52,
    borderWidth: 1,
    borderColor: '#A855F7',
    marginBottom: 12
  },
  passkeyIconBox: { marginRight: 10 },
  passkeyBtnText: { color: '#A855F7', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  googleIconBox: { marginRight: 12 },
  googleBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' }
});
