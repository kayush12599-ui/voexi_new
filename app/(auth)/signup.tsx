import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Image, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { useRouter, Link, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { VOEXITheme } from '../../constants/theme';
import { NeonInput } from '../../components/NeonInput';
import { NeonButton } from '../../components/NeonButton';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { uploadToBunny } from '../../lib/bunnyStorage';
import { AuthService } from '../../lib/authService';
import { EmailService } from '../../lib/emailService';
import * as WebBrowser from 'expo-web-browser';
import { createURL, parse } from 'expo-linking';
import * as Haptics from 'expo-haptics';

/**
 * VOEXI SIGNUP WITH MANDATORY INLINE EMAIL OTP VERIFICATION FIRST
 */
export default function Signup() {
  const router = useRouter();
  const { initialEmail } = useLocalSearchParams<{ initialEmail?: string }>();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    try { WebBrowser.maybeCompleteAuthSession(); } catch (e) {}
  }, []);

  // Email Verification State
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(5);

  // Form State
  const [form, setForm] = useState({
    channelName: '',
    username: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail.trim().toLowerCase());
      setOtpSent(true);
    }
  }, [initialEmail]);

  // Cooldown Timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // 1. SEND OTP TO EMAIL VIA RESEND API
  const handleSendOtp = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) return Alert.alert('Missing Email', 'Please enter your Email address first.');
    if (!emailRegex.test(trimmedEmail)) return Alert.alert('Invalid Email', 'Please enter a valid email address.');

    setLoading(true);
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      // 🛡️ HIGH SECURITY CHECK: Verify if email is already registered in VOEXI
      const isAlreadyReg = await AuthService.isEmailAlreadyRegistered(trimmedEmail);
      if (isAlreadyReg) {
        if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        return Alert.alert(
          "EMAIL ALREADY REGISTERED ❌",
          `The email "${trimmedEmail}" is already linked to an existing VOEXI account.\n\nPlease tap LOGIN NOW to sign into your account, or use a different email address to register.`,
          [
            { text: "LOGIN NOW", onPress: () => router.push('/(auth)/login') },
            { text: "USE DIFFERENT EMAIL", style: "cancel" }
          ]
        );
      }

      // Generate 6-digit OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);

      // Open OTP input UI immediately
      setOtpSent(true);
      setCooldown(60);
      setAttemptsLeft(5);

      // Send live email via Resend API Key in background
      EmailService.sendVerificationEmail(
        trimmedEmail,
        code,
        'VOEXI Account Signup Verification OTP'
      ).then((res) => {
        if (!res.success) {
          console.warn('[Resend Email Notice]:', res.error);
        }
      }).catch((e) => {
        console.warn('[Resend Email Error]:', e.message);
      });

      // Backup Supabase Auth Trigger
      supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: { shouldCreateUser: true }
      }).catch(() => {});

      if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(
        'Verification Code Sent 📧',
        `A 6-digit verification code has been sent to your email inbox (${trimmedEmail}). Please enter the 6-digit code below to verify.`
      );
    } catch (e: any) {
      Alert.alert('Send OTP Failed', e.message || 'Unable to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  // 2. VERIFY OTP CODE
  const handleVerifyOtp = async () => {
    const trimmedOtp = otpCode.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedOtp || trimmedOtp.length < 6) {
      return Alert.alert('Code Required', 'Please enter the 6-digit verification code sent to your email.');
    }

    if (attemptsLeft <= 0) {
      return Alert.alert('Attempts Exceeded', 'Maximum verification attempts reached. Please click RE-EMIT to request a new code.');
    }

    setLoading(true);
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      if (trimmedOtp === generatedOtp) {
        if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setIsEmailVerified(true);
        Alert.alert('Email Verified ✓', 'Your email address has been successfully verified! Complete your station profile details below.');
        return;
      }

      let { data, error } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedOtp,
        type: 'email',
      });

      if (!error && data?.user) {
        if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setIsEmailVerified(true);
        Alert.alert('Email Verified ✓', 'Your email address has been successfully verified!');
        return;
      }

      const newAttempts = attemptsLeft - 1;
      setAttemptsLeft(newAttempts);
      if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert('Invalid Code', `The verification code entered is incorrect. ${newAttempts} attempt(s) remaining.`);

    } catch (e: any) {
      Alert.alert('Verification Error', e.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // 3. COMPLETE SIGNUP & PROFILE REGISTRATION
  const handleCompleteSignup = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const { channelName, username, mobile, password, confirmPassword } = form;

    if (!isEmailVerified) return Alert.alert('Email Not Verified', 'Please verify your email address first before creating an account.');
    if (!channelName.trim()) return Alert.alert('Missing Station Name', 'Please enter your Station Name.');
    if (!username.trim()) return Alert.alert('Missing Username', 'Please choose a Username.');

    const usernameRegex = /^[a-zA-Z0-9_.]{3,20}$/;
    if (!usernameRegex.test(username.trim().toLowerCase())) {
      return Alert.alert('Invalid Username', 'Username must be 3-20 characters long and contain only letters, numbers, underscores, or periods.');
    }

    if (!trimmedEmail) return Alert.alert('Missing Email', 'Please enter your Email address.');
    if (!mobile.trim()) return Alert.alert('Missing Mobile', 'Please enter your Mobile Number.');
    if (mobile.trim().length < 10) return Alert.alert('Invalid Mobile', 'Mobile number should be at least 10 digits.');

    if (!password) return Alert.alert('Missing Password', 'Please create a Password.');
    if (password.length < 6) {
      return Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
    }

    if (password !== confirmPassword) {
      return Alert.alert('Password Mismatch', 'Passwords do not match. Please re-type your confirm password.');
    }

    setLoading(true);
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      const trimmedUsername = username.trim().toLowerCase();

      // 🛡️ HIGH SECURITY CHECK: Duplicate Email Check
      const isEmailReg = await AuthService.isEmailAlreadyRegistered(trimmedEmail);
      if (isEmailReg) {
        if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        return Alert.alert(
          "EMAIL ALREADY REGISTERED ❌",
          `The email "${trimmedEmail}" is already registered. Please login to your existing account.`,
          [
            { text: "LOGIN NOW", onPress: () => router.push('/(auth)/login') },
            { text: "CANCEL", style: "cancel" }
          ]
        );
      }

      // 🛡️ HIGH SECURITY CHECK: Duplicate Username Check
      const isUserTaken = await AuthService.isUsernameTaken(trimmedUsername);
      if (isUserTaken) {
        if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        return Alert.alert(
          "USERNAME ALREADY TAKEN ❌",
          `The username "@${trimmedUsername}" is already claimed by another station. Please choose a unique username.`
        );
      }

      // Create Supabase User or Update
      const { data: updateData, error: updateError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: password,
        options: {
          data: {
            channel_name: channelName.trim(),
            username: trimmedUsername,
            mobile: mobile.trim(),
          }
        }
      });

      let user = updateData?.user;

      if (!user) {
        const { data: sessData } = await supabase.auth.getSession();
        user = sessData?.session?.user || null;
      }

      let avatarUrl = '';
      if (image) {
        try {
          avatarUrl = await uploadToBunny(image, 'image');
        } catch (e) {}
      }

      if (user) {
        await AuthService.ensureNeuralIdentity(user.id, trimmedEmail, {
          channel_name: channelName.trim(),
          username: trimmedUsername,
          mobile: mobile.trim(),
          avatar_url: avatarUrl,
        });
      }

      if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Account Created 🎉', 'Welcome to VOEXI! Your station has been established.');
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Account Creation Failed', e.message || 'Unable to establish channel station.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
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
        Alert.alert('Google Signup Failed', error.message);
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success' && result.url) {
          const { queryParams } = parse(result.url);
          let access_token = queryParams?.access_token;
          let refresh_token = queryParams?.refresh_token;

          if (access_token && refresh_token) {
             await supabase.auth.setSession({
               access_token: access_token as string,
               refresh_token: refresh_token as string,
             });
             router.replace('/(tabs)');
          }
        }
      }
    } catch (e: any) {
      Alert.alert('System Error', e.message || 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#100', '#000']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, width: '100%', minHeight: '100%' }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.logoCircle}><Text style={styles.logoV}>V</Text></View>
            <Text style={styles.brandTitle}>VOEXI</Text>
            <Text style={styles.tagline}>ESTABLISH NEURAL STATION</Text>
          </View>

          <View style={styles.glassCard}>
            <Text style={styles.welcomeText}>Create Station Account</Text>

            {/* STEP 1: EMAIL VERIFICATION */}
            <View style={styles.emailStepBox}>
              <Text style={styles.stepTitle}>1. EMAIL VERIFICATION</Text>
              <NeonInput
                label="EMAIL ADDRESS"
                placeholder="mail@example.com"
                value={email}
                onChangeText={setEmail}
                icon="mail-outline"
                keyboardType="email-address"
                editable={!isEmailVerified}
              />

              {!isEmailVerified && (
                <>
                  {!otpSent ? (
                    <TouchableOpacity
                      style={[styles.emitBtn, loading && { opacity: 0.5 }]}
                      onPress={handleSendOtp}
                      disabled={loading}
                      activeOpacity={0.7}
                    >
                      <LinearGradient colors={['#A855F7', '#6366F1']} style={styles.emitGrad}>
                        {loading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="paper-plane" size={16} color="#fff" />
                            <Text style={styles.emitBtnText}>SEND VERIFICATION CODE</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.otpNotice}>Enter 6-Digit Code sent to {email}:</Text>
                      <View style={styles.otpInputRow}>
                        <TextInput
                          style={styles.otpInput}
                          placeholder="6-Digit OTP"
                          placeholderTextColor="#666"
                          value={otpCode}
                          onChangeText={setOtpCode}
                          keyboardType="number-pad"
                          maxLength={6}
                        />
                        <TouchableOpacity style={styles.verifyOtpBtn} onPress={handleVerifyOtp} disabled={loading}>
                          {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.verifyOtpText}>VERIFY</Text>
                          )}
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={styles.reemitBtn}
                        onPress={handleSendOtp}
                        disabled={cooldown > 0 || loading}
                      >
                        <Text style={styles.reemitText}>
                          {cooldown > 0 ? `RESEND CODE IN ${cooldown}s` : 'RESEND CODE'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {isEmailVerified && (
                <View style={styles.verifiedBadgeRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                  <Text style={styles.verifiedBadgeText}>EMAIL VERIFIED ✓</Text>
                </View>
              )}
            </View>

            {/* STEP 2: PROFILE & STATION DETAILS */}
            <View style={{ marginTop: 20 }}>
              <Text style={styles.stepTitle}>2. STATION DETAILS</Text>

              <NeonInput label="STATION TITLE / CHANNEL NAME" placeholder="e.g. Neon Vibe Channel" value={form.channelName} onChangeText={(val) => setForm(f => ({ ...f, channelName: val }))} icon="radio-outline" />
              <NeonInput label="USERNAME (HANDLE)" placeholder="username" value={form.username} onChangeText={(val) => setForm(f => ({ ...f, username: val }))} icon="at-outline" autoCapitalize="none" />
              <NeonInput label="MOBILE NUMBER" placeholder="+91 9876543210" value={form.mobile} onChangeText={(val) => setForm(f => ({ ...f, mobile: val }))} icon="call-outline" keyboardType="phone-pad" />

              {/* AVATAR PICKER */}
              <TouchableOpacity onPress={pickImage} style={styles.avatarPicker}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="camera-outline" size={24} color="#aaa" />
                    <Text style={styles.avatarText}>CHOOSE PROFILE AVATAR</Text>
                  </View>
                )}
              </TouchableOpacity>

              <NeonInput label="PASSWORD" placeholder="••••••••" value={form.password} onChangeText={(val) => setForm(f => ({ ...f, password: val }))} icon="lock-closed-outline" secureTextEntry />
              <NeonInput label="CONFIRM PASSWORD" placeholder="••••••••" value={form.confirmPassword} onChangeText={(val) => setForm(f => ({ ...f, confirmPassword: val }))} icon="lock-closed-outline" secureTextEntry />

              <NeonButton
                title="ESTABLISH STATION"
                onPress={handleCompleteSignup}
                loading={loading}
                style={{ marginTop: 20 }}
              />
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.line} />
            </View>

            {/* GOOGLE SIGNUP BUTTON */}
            <Pressable
              style={({ pressed }) => [
                styles.googleBtn,
                pressed && { backgroundColor: 'rgba(255,255,255,0.1)', transform: [{ scale: 0.98 }] }
              ]}
              onPress={handleGoogleSignup}
            >
              <View style={styles.googleIconBox}>
                <Ionicons name="logo-google" size={20} color="#fff" />
              </View>
              <Text style={styles.googleBtnText}>SIGN UP WITH GOOGLE</Text>
            </Pressable>

          </View>

          <View style={styles.footer}>
            <Text style={{ color: '#666' }}>Already have a station? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity><Text style={{ color: VOEXITheme.colors.primary, fontWeight: 'bold' }}>Login</Text></TouchableOpacity>
            </Link>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', minHeight: '100vh', backgroundColor: '#000' },
  scrollContent: { padding: 20, paddingTop: 40, alignItems: 'center', width: '100%', maxWidth: 520, alignSelf: 'center' },
  header: { alignItems: 'center', marginBottom: 25, width: '100%' },
  backBtn: { position: 'absolute', left: 0, top: 0, padding: 8 },
  logoCircle: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#000', borderWidth: 2, borderColor: VOEXITheme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoV: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  brandTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff', letterSpacing: 6, marginTop: 10 },
  tagline: { color: VOEXITheme.colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginTop: 2 },
  glassCard: { width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  welcomeText: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  emailStepBox: { backgroundColor: '#10101A', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)' },
  stepTitle: { color: VOEXITheme.colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12 },
  emitBtn: { marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  emitGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, gap: 8 },
  emitBtnText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  otpNotice: { color: '#aaa', fontSize: 11, marginBottom: 8 },
  otpInputRow: { flexDirection: 'row', gap: 8 },
  otpInput: { flex: 1, backgroundColor: '#181824', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 10, color: '#fff', paddingHorizontal: 12, height: 46, fontSize: 14 },
  verifyOtpBtn: { backgroundColor: VOEXITheme.colors.primary, paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center', height: 46 },
  verifyOtpText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  reemitBtn: { marginTop: 10, alignSelf: 'flex-end' },
  reemitText: { color: VOEXITheme.colors.primary, fontSize: 10, fontWeight: 'bold' },
  verifiedBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,197,94,0.15)', padding: 12, borderRadius: 10, marginTop: 10 },
  verifiedBadgeText: { color: '#22C55E', fontSize: 12, fontWeight: '900' },
  avatarPicker: { marginVertical: 12, alignItems: 'center' },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { width: '100%', height: 60, backgroundColor: '#12121E', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  avatarText: { color: '#aaa', fontSize: 11, fontWeight: 'bold' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: '#444', marginHorizontal: 15, fontSize: 11, fontWeight: 'bold' },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, height: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  googleIconBox: { marginRight: 10 },
  googleBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  footer: { flexDirection: 'row', marginTop: 30 }
});
