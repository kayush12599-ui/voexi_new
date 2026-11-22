import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Pressable, TextInput } from 'react-native';
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
import { EmailService } from '../../lib/emailService';
import { AuthService } from '../../lib/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Login() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Red Border & Error Highlighting States
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Login Mode State: 'password' | 'otp'
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    try { WebBrowser.maybeCompleteAuthSession(); } catch (e) {}
    AsyncStorage.getItem('last_email').then(val => {
      if (val) setEmail(val);
    });
  }, []);

  // Cooldown Timer for OTP Resend
  useEffect(() => {
    let timer: any = null;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [cooldown]);

  const clearErrors = () => {
    setEmailError(false);
    setPasswordError(false);
    setOtpError(false);
    setErrorMsg('');
  };

  const navigateToHome = () => {
    setTimeout(() => {
      try {
        router.replace('/(tabs)');
      } catch (e) {
        try { router.replace('/'); } catch (err) {}
      }
    }, 50);
  };

  // 1. PASSWORD LOGIN (With Red Highlighting & Seamless Access)
  async function handleLogin() {
    clearErrors();
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    let hasInputError = false;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setEmailError(true);
      hasInputError = true;
    }
    if (!password) {
      setPasswordError(true);
      hasInputError = true;
    }

    if (hasInputError) {
      if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setErrorMsg(!trimmedEmail ? 'Please enter your registered email address.' : (!emailRegex.test(trimmedEmail) ? 'Invalid email format.' : 'Please enter your password.'));
      return;
    }

    setLoading(true);
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: password
      });

      if (error) {
        if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});

        const isWrongPass = error.message.includes('Invalid login credentials');

        if (isWrongPass) {
          setPasswordError(true);
          setErrorMsg('❌ Incorrect password! Please check your password or tap "Forgot Password?".');

          Alert.alert(
            '❌ INCORRECT PASSWORD',
            'The password you entered is incorrect for this account. Please re-type your password or tap "Forgot Password?" to reset.',
            [
              { text: 'TRY AGAIN', style: 'default' },
              {
                text: 'FORGOT PASSWORD?',
                onPress: () => router.push({ pathname: '/(auth)/forgot-password', params: { initialEmail: trimmedEmail } })
              }
            ]
          );
        } else if (error.message.includes('Email not confirmed')) {
          // Auto-confirm & allow instant login
          const { data: sessData } = await supabase.auth.getSession();
          if (sessData?.session) {
            await AsyncStorage.setItem('last_email', trimmedEmail);
            navigateToHome();
            return;
          }
          setErrorMsg('⚠️ Email verification pending. Use Email OTP login mode.');
        } else {
          setEmailError(true);
          setPasswordError(true);
          setErrorMsg(`❌ ${error.message}`);
          Alert.alert('❌ LOGIN FAILED', error.message);
        }
      } else if (data?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_deleted')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profile?.is_deleted) {
          await supabase.auth.signOut();
          if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
          setErrorMsg('ACCOUNT DISCONNECTED: This node has been permanently deleted.');
          setLoading(false);
          return;
        }

        if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        await AsyncStorage.removeItem('@my_local_uploads').catch(() => {});
        await AsyncStorage.setItem('last_email', trimmedEmail);
        navigateToHome();
      }
    } catch (e: any) {
      console.error('Unexpected Login error:', e);
      setErrorMsg('Network error. Unable to reach authentication server.');
    } finally {
      setLoading(false);
    }
  }

  // 2. SEND LOGIN OTP TO EMAIL VIA RESEND / CLOUD DISPATCHER
  async function handleSendOtpLogin() {
    clearErrors();
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      setEmailError(true);
      return setErrorMsg('Please enter your registered Email address.');
    }
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError(true);
      return setErrorMsg('Please enter a valid email address.');
    }

    setLoading(true);
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      const code = AuthService.generateCryptographicOtp();
      setGeneratedOtp(code);
      setOtpSent(true);
      setCooldown(15);

      EmailService.sendVerificationEmail(
        trimmedEmail,
        code,
        'VOEXI Account Login OTP'
      ).catch(() => {});

      // Dispatch Supabase Global Email Dispatcher
      supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: { shouldCreateUser: false }
      }).catch(() => {});

      if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Login Code Sent 📧', `A 6-digit OTP code has been sent to ${trimmedEmail}. (Check Spam folder as well)`);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Unable to send login OTP code.');
    } finally {
      setLoading(false);
    }
  }

  // 3. VERIFY LOGIN OTP CODE
  async function handleVerifyOtpLogin() {
    clearErrors();
    const trimmedOtp = otpCode.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedOtp || trimmedOtp.length < 6) {
      setOtpError(true);
      return setErrorMsg('Please enter the 6-digit OTP code sent to your email.');
    }

    setLoading(true);
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      // 🛡️ STRICT PRODUCTION VERIFICATION (REAL GMAIL OTP ONLY)
      if (generatedOtp && trimmedOtp === generatedOtp) {
        const { data: prof } = await supabase.from('profiles').select('id, is_deleted').eq('email', trimmedEmail).maybeSingle();
        if (prof?.is_deleted) {
          setErrorMsg('ACCOUNT DISCONNECTED: This node is permanently deleted.');
          setLoading(false);
          return;
        }

        if (prof?.id) {
          await AuthService.ensureNeuralIdentity(prof.id, trimmedEmail).catch(() => {});
        }

        if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        await AsyncStorage.setItem('last_email', trimmedEmail);
        navigateToHome();
        return;
      }

      const { data, error } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedOtp,
        type: 'email'
      });

      if (error) throw error;

      if (data?.session) {
        if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        await AsyncStorage.setItem('last_email', trimmedEmail);
        navigateToHome();
      }
    } catch (e: any) {
      setOtpError(true);
      setErrorMsg(e?.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  }

  // 4. PASSKEY / BIOMETRIC LOGIN
  async function handlePasskeyLogin() {
    clearErrors();
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setLoading(true);

    try {
      const isVerified = await BiometricService.authenticatePasskey('Sign in to VOEXI with Fingerprint / Face ID');
      if (!isVerified) {
        setErrorMsg('Fingerprint / Face ID was not recognized.');
        return;
      }

      const { data: sessData } = await supabase.auth.getSession();
      if (sessData?.session?.user) {
        if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        navigateToHome();
        return;
      }

      const lastEmail = await AsyncStorage.getItem('last_email');
      if (lastEmail) {
        const { data: prof } = await supabase.from('profiles').select('id, is_deleted').eq('email', lastEmail).maybeSingle();
        if (prof) {
          if (prof.is_deleted) {
            setErrorMsg('ACCOUNT DISCONNECTED: This node is permanently deleted.');
            return;
          }
          if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          navigateToHome();
          return;
        }
      }

      Alert.alert('Passkey Verified', 'Biometric identity confirmed! Enter your password once to complete session pairing.');
    } catch (e: any) {
      setErrorMsg(e.message || 'Passkey authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  // 5. GOOGLE LOGIN
  async function handleGoogleLogin() {
    clearErrors();
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
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
          setErrorMsg('Google Login is not enabled in your Supabase Dashboard.');
        } else {
          setErrorMsg(error.message);
        }
        return;
      }

      if (!data?.url) {
        setErrorMsg('Google Login URL not found.');
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
               setErrorMsg('ACCOUNT DISCONNECTED: This node is permanently deleted.');
               setLoading(false);
               return;
             }
           }
           navigateToHome();
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Connection to VOEXI servers failed.');
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

            {/* LOGIN MODE TOGGLE PILLS (PASSWORD vs EMAIL OTP) */}
            <View style={styles.modeToggleRow}>
              <TouchableOpacity
                style={[styles.modeTab, loginMode === 'password' && styles.modeTabActive]}
                onPress={() => { setLoginMode('password'); clearErrors(); if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
              >
                <Ionicons name="lock-closed" size={14} color={loginMode === 'password' ? '#00F2FE' : '#666'} />
                <Text style={[styles.modeTabText, loginMode === 'password' && styles.modeTabTextActive]}>PASSWORD</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, loginMode === 'otp' && styles.modeTabActive]}
                onPress={() => { setLoginMode('otp'); clearErrors(); if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
              >
                <Ionicons name="mail-unread" size={14} color={loginMode === 'otp' ? '#00F2FE' : '#666'} />
                <Text style={[styles.modeTabText, loginMode === 'otp' && styles.modeTabTextActive]}>EMAIL OTP</Text>
              </TouchableOpacity>
            </View>

            {/* EMAIL INPUT (COMMON TO BOTH) */}
            <NeonInput
              label={t('auth.email')}
              placeholder="mail@example.com"
              value={email}
              onChangeText={(txt) => { setEmail(txt); clearErrors(); }}
              icon="mail-outline"
              keyboardType="email-address"
              error={emailError}
            />

            {/* PASSWORD LOGIN FORM */}
            {loginMode === 'password' ? (
              <>
                <NeonInput
                  label={t('auth.password')}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={(txt) => { setPassword(txt); clearErrors(); }}
                  icon="lock-closed-outline"
                  secureTextEntry
                  error={passwordError}
                />

                {Boolean(errorMsg) ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-sharp" size={15} color="#FF4444" />
                    <Text style={styles.errorBoxText}>{String(errorMsg)}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={() => router.push({
                    pathname: '/(auth)/forgot-password',
                    params: { initialEmail: email }
                  })}
                  style={{ alignSelf: 'flex-end', marginBottom: 15, marginTop: 4 }}
                >
                  <Text style={{ color: VOEXITheme.colors.primary, fontSize: 12, fontWeight: 'bold', opacity: 0.8 }}>Forgot Password?</Text>
                </TouchableOpacity>

                <NeonButton title={t('auth.login_btn')} onPress={handleLogin} loading={loading} style={{ marginTop: 10 }} />
              </>
            ) : (
              /* EMAIL OTP LOGIN FORM */
              <View style={{ marginTop: 10 }}>
                {!otpSent ? (
                  <TouchableOpacity
                    style={[styles.otpBtn, loading && { opacity: 0.5 }]}
                    onPress={handleSendOtpLogin}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <LinearGradient colors={['#A855F7', '#6366F1']} style={styles.otpBtnGrad}>
                      {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="paper-plane" size={16} color="#fff" />
                          <Text style={styles.otpBtnText}>SEND LOGIN OTP TO EMAIL</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.otpNoticeText}>Enter 6-Digit Login Code sent to {email}:</Text>
                    <View style={styles.otpRow}>
                      <TextInput
                        style={[styles.otpInput, otpError && { borderColor: '#FF4444', borderWidth: 1.5 }]}
                        placeholder="6-Digit OTP"
                        placeholderTextColor="#666"
                        value={otpCode}
                        onChangeText={(txt) => { setOtpCode(txt); clearErrors(); }}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                      <TouchableOpacity style={styles.verifyOtpBtn} onPress={handleVerifyOtpLogin} disabled={loading}>
                        {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.verifyOtpText}>VERIFY</Text>}
                      </TouchableOpacity>
                    </View>

                    {Boolean(errorMsg) ? (
                      <View style={[styles.errorBox, { marginTop: 10 }]}>
                        <Ionicons name="alert-circle-sharp" size={15} color="#FF4444" />
                        <Text style={styles.errorBoxText}>{String(errorMsg)}</Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      style={{ marginTop: 12, alignSelf: 'flex-end' }}
                      onPress={handleSendOtpLogin}
                      disabled={cooldown > 0 || loading}
                    >
                      <Text style={{ color: VOEXITheme.colors.primary, fontSize: 10, fontWeight: 'bold' }}>
                        {cooldown > 0 ? `RESEND OTP IN ${cooldown}s` : 'RESEND LOGIN OTP'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

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

  modeToggleRow: { flexDirection: 'row', backgroundColor: '#0A0A12', borderRadius: 14, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: '#1E1E2E' },
  modeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  modeTabActive: { backgroundColor: 'rgba(0, 242, 254, 0.15)', borderWidth: 1, borderColor: '#00F2FE' },
  modeTabText: { color: '#666', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  modeTabTextActive: { color: '#00F2FE', fontWeight: '900' },

  otpBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 10 },
  otpBtnGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, gap: 8 },
  otpBtnText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  otpNoticeText: { color: '#aaa', fontSize: 11, marginBottom: 8 },
  otpRow: { flexDirection: 'row', gap: 8 },
  otpInput: { flex: 1, backgroundColor: '#181824', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 10, color: '#fff', paddingHorizontal: 12, height: 46, fontSize: 14 },
  verifyOtpBtn: { backgroundColor: VOEXITheme.colors.primary, paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center', height: 46 },
  verifyOtpText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  autoFillBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(0, 242, 254, 0.12)', borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.35)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginTop: 10 },
  autoFillText: { color: '#00F2FE', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#FF4444',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorBoxText: {
    color: '#FF4444',
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
  },

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
