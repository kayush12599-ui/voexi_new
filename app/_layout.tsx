import '../lib/react19WebPolyfill';
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
      html, body, #root { height: 100%; width: 100%; margin: 0; padding: 0; overflow-x: hidden; background-color: #06060E; }
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
  const [initialized, setInitialized] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      try {
        activateKeepAwakeAsync('voexi_awake').catch(() => {});
      } catch (e) {}
    }
    return () => {
      if (Platform.OS !== 'web') {
        try {
          deactivateKeepAwake('voexi_awake').catch(() => {});
        } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    // 300ms Instant Safety Timeout (Prevents blank screen on refresh)
    const safetyTimer = setTimeout(() => {
      setInitialized(true);
      if (Platform.OS !== 'web') SplashScreen.hideAsync().catch(() => {});
    }, 300);

    const initializeAuth = async () => {
      try {
        initAds();
        initI18n().catch(() => {});

        // 1. INSTANT LOCAL SESSION RESTORE (0ms delay on refresh)
        try {
          const localSessionStr = await AsyncStorage.getItem('sb-iafmgtldihnhcvrfveev-auth-token');
          if (localSessionStr) {
            const parsed = JSON.parse(localSessionStr);
            const sess = parsed?.currentSession || (parsed?.access_token ? parsed : null);
            if (sess) setSession(sess as Session);
          }
        } catch (e) {}

        // Unblock UI immediately
        setInitialized(true);
        if (Platform.OS !== 'web') SplashScreen.hideAsync().catch(() => {});

        // 2. Background Supabase Auth Sync
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setSession(data.session);
          if (data.session.user?.email_confirmed_at) {
            AuthService.ensureNeuralIdentity(
              data.session.user.id,
              data.session.user.email || '',
              data.session.user.user_metadata
            ).catch(() => {});
            checkDailyLogin(data.session.user.id);
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

    const segs = (segments || []) as string[];
    const firstSeg = segs[0] || '';

    const inAuthGroup = firstSeg === '(auth)';
    const inSignup = inAuthGroup && segs[1] === 'signup';
    const inForgotPassword = segs[1] === 'forgot-password' || firstSeg === 'reset-password';
    const inIntro = firstSeg === 'intro';
    const isAtRoot = segs.length === 0 || firstSeg === '' || firstSeg === 'index';

    // 🛡️ SECURITY GUARD: Single authoritative navigation check with navigation readiness delay
    const isUserAuthenticated = !!session?.user;

    const timer = setTimeout(() => {
      try {
        if (session && isUserAuthenticated) {
          if ((inAuthGroup || inIntro || isAtRoot) && !inForgotPassword && !inSignup) {
            router.replace('/(tabs)');
          }
        } else {
          if (!inAuthGroup && !inIntro) {
            router.replace('/(auth)/login');
          }
        }
      } catch (e) {}
    }, 60);

    return () => clearTimeout(timer);
  }, [session, initialized, segments]);

  return (
    <I18nextProvider i18n={i18n}>
      <GestureHandlerRootView style={{ flex: 1, height: '100%', backgroundColor: '#000000' }}>
        <CustomThemeProvider>
          <DiamondThemeProvider>
            <GestureSettingsProvider>
              <VoiceSettingsProvider>
                <RootLayoutInner />
              </VoiceSettingsProvider>
            </GestureSettingsProvider>
          </DiamondThemeProvider>
        </CustomThemeProvider>
      </GestureHandlerRootView>
    </I18nextProvider>
  );
}

function RootLayoutInner() {
  return (
    <ThemeProvider value={DarkTheme}>
      <View style={{ flex: 1, height: '100%', backgroundColor: '#000000' }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000', flex: 1 } }} />
        <StatusBar style="light" />
      </View>
    </ThemeProvider>
  );
}

