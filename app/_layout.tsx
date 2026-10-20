import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus, View, Text, ActivityIndicator, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import * as SplashScreen from 'expo-splash-screen';
import { VOEXITheme } from '../constants/theme';
import { VoiceSettingsProvider } from '../hooks/useVoiceSettings';
import { GestureSettingsProvider } from '../hooks/useGestureSettings';
import { ThemeProvider as CustomThemeProvider } from '../hooks/useTheme';
import { DiamondThemeProvider } from '../hooks/useDiamondTheme';
import { checkDailyLogin } from '../lib/earnings';
import { initAds } from '../lib/ads';
import { I18nextProvider } from 'react-i18next';
import i18n, { initI18n } from '../i18n';
import { AuthService } from '../lib/authService';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

// 🛡️ UNHANDLED PROMISE REJECTION SHIELD: Suppress non-critical native keep-awake errors
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  try {
    const iconFontStyles = `
      @font-face { font-family: 'Ionicons'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype'); font-display: swap; }
      @font-face { font-family: 'MaterialCommunityIcons'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf') format('truetype'); font-display: swap; }
      @font-face { font-family: 'MaterialIcons'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf') format('truetype'); font-display: swap; }
      @font-face { font-family: 'Feather'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Feather.ttf') format('truetype'); font-display: swap; }
      @font-face { font-family: 'FontAwesome'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf') format('truetype'); font-display: swap; }
      @font-face { font-family: 'FontAwesome5_Solid'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf') format('truetype'); font-display: swap; }
      @font-face { font-family: 'AntDesign'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/AntDesign.ttf') format('truetype'); font-display: swap; }
      @font-face { font-family: 'Entypo'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Entypo.ttf') format('truetype'); font-display: swap; }
    `;
    const styleEl = document.createElement('style');
    styleEl.type = 'text/css';
    styleEl.appendChild(document.createTextNode(iconFontStyles));
    document.head.appendChild(styleEl);
  } catch (e) {}
}

if (Platform.OS !== 'web' && typeof global !== 'undefined') {
  try {
    const tracking = require('promise/setimmediate/rejection-tracking');
    if (tracking && typeof tracking.enable === 'function') {
      tracking.enable({
        allRejections: true,
        onUnhandled: (id: any, error: any) => {
          const msg = error?.message || String(error || '');
          if (msg.includes('keep awake') || msg.includes('Unable to activate')) {
            return; // Suppress harmless keep-awake promise rejection
          }
          console.warn(`Unhandled promise rejection (id: ${id}):`, error);
        },
        onHandled: () => {}
      });
    }
  } catch (e) {}

  if ((global as any).ErrorUtils) {
    const originalHandler = (global as any).ErrorUtils.getGlobalHandler?.();
    (global as any).ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
      if (error?.message?.includes('Unable to activate keep awake') || error?.message?.includes('keep awake')) {
        return;
      }
      if (originalHandler) originalHandler(error, isFatal);
    });
  }
}

try {
  if (Platform.OS !== 'web') {
    SplashScreen.preventAutoHideAsync().catch(() => {});
  }
} catch (e) {}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      try {
        activateKeepAwakeAsync().catch(() => {});
      } catch (e) {}
    }
    return () => {
      if (Platform.OS !== 'web') {
        try {
          deactivateKeepAwake().catch(() => {});
        } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    // 3000ms Safety Timeout for Slow 3G / Remote Tunnel Connections
    const safetyTimer = setTimeout(() => {
      setInitialized(true);
      if (Platform.OS !== 'web') SplashScreen.hideAsync().catch(() => {});
    }, 3000);

    const initializeAuth = async () => {
      try {
        // 1. FAST LOCAL SESSION RESTORE (0ms Network Lag - Instant Offline & Slow 3G Access)
        const localSessionStr = await AsyncStorage.getItem('sb-iafmgtldihnhcvrfveev-auth-token');
        if (localSessionStr) {
          try {
            const parsed = JSON.parse(localSessionStr);
            const sess = parsed?.currentSession || (parsed?.access_token ? parsed : null);
            if (sess) {
              setSession(sess as Session);
            }
          } catch (e) {}
        }

        initAds();
        await initI18n();

        // 2. BACKGROUND SERVER SESSION SYNC WITH HIGH-SECURITY SHIELD
        const { data, error } = await supabase.auth.getSession();
        if (error || !data?.session) {
          // If server session is missing or invalid, purge local token
          setSession(null);
          await AsyncStorage.removeItem('sb-iafmgtldihnhcvrfveev-auth-token').catch(() => {});
        } else if (data?.session) {
          if (data.session.user?.email_confirmed_at) {
            // Check if profile is marked as deleted/erased
            const { data: profile } = await supabase
              .from('profiles')
              .select('is_deleted')
              .eq('id', data.session.user.id)
              .maybeSingle();

            if (profile?.is_deleted) {
              await supabase.auth.signOut().catch(() => {});
              await AsyncStorage.removeItem('sb-iafmgtldihnhcvrfveev-auth-token').catch(() => {});
              setSession(null);
            } else {
              setSession(data.session);
              AuthService.ensureNeuralIdentity(
                data.session.user.id,
                data.session.user.email || '',
                data.session.user.user_metadata
              ).catch(() => {});
              checkDailyLogin(data.session.user.id);
            }
          } else {
            setSession(data.session);
          }
        }
      } catch (err: any) {
        console.error('Auth Init Error:', err);
      } finally {
        clearTimeout(safetyTimer);
        setInitialized(true);
        if (Platform.OS !== 'web') SplashScreen.hideAsync().catch(() => {});
      }
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!newSession) {
        setSession(null);
        await AsyncStorage.removeItem('sb-iafmgtldihnhcvrfveev-auth-token').catch(() => {});
        return;
      }

      setSession(newSession);
      if (newSession && newSession.user?.email_confirmed_at && event === 'SIGNED_IN') {
        checkDailyLogin(newSession.user.id);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Smooth Navigation Guard
  useEffect(() => {
    if (!initialized) return;

    const segs = segments as string[];
    const inAuthGroup = segs[0] === '(auth)';
    const inSignup = inAuthGroup && (segs[1] === 'signup' || segs.length === 1);
    const inForgotPassword = segs[1] === 'forgot-password' || segs[0] === 'reset-password';
    const inIntro = segs[0] === 'intro';

    // 🛡️ SECURITY GUARD: Require email to be confirmed before auto-redirecting to /(tabs)
    const isEmailVerified = !!session?.user?.email_confirmed_at;

    if (session && isEmailVerified) {
      // Do NOT auto-redirect away from signup page while user is setting password and completing signup!
      if ((inAuthGroup || inIntro) && !inForgotPassword && !inSignup) {
        setTimeout(() => { try { router.replace('/(tabs)'); } catch (e) {} }, 100);
      }
    } else {
      // Unverified user or no session trying to access non-auth/non-intro routes
      if (!inAuthGroup && !inIntro && segs.length > 0 && segs[0] !== '') {
        setTimeout(() => { try { router.replace('/(auth)/login'); } catch (e) {} }, 100);
      }
    }
  }, [session, initialized, segments]);

  return (
    <I18nextProvider i18n={i18n}>
      <GestureHandlerRootView style={{ flex: 1, height: '100%', backgroundColor: '#000000' }}>
        <CustomThemeProvider>
          <DiamondThemeProvider>
            <GestureSettingsProvider>
              <VoiceSettingsProvider>
                <RootLayoutInner initialized={initialized} />
              </VoiceSettingsProvider>
            </GestureSettingsProvider>
          </DiamondThemeProvider>
        </CustomThemeProvider>
      </GestureHandlerRootView>
    </I18nextProvider>
  );
}

function RootLayoutInner({ initialized }: { initialized: boolean }) {
  if (!initialized) {
    return (
      <View style={{ flex: 1, height: '100%', backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', gap: 15 }}>
        <ActivityIndicator size="large" color={VOEXITheme.colors.primary} />
        <Text style={{ color: '#666', fontSize: 10, fontWeight: '900', letterSpacing: 2 }}>SYNCHRONIZING NEURAL LINK...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <View style={{ flex: 1, height: '100%', backgroundColor: '#000000' }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000', flex: 1 } }} />
        <StatusBar style="light" />
      </View>
    </ThemeProvider>
  );
}

module.exports = RootLayout;
module.exports.default = RootLayout;
