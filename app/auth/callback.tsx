import { useEffect } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { AuthService } from '../../lib/authService';
import * as Linking from 'expo-linking';

export default function AuthCallback() {
  const router = useRouter();
  const url = Linking.useURL();

  useEffect(() => {
    const handleCallback = async () => {
      if (!url) return;

      try {
        const parsed = Linking.parse(url) as any;
        const queryParams = parsed?.queryParams;
        const fragment = parsed?.fragment;

        // Supabase tokens can be in query params or fragment (hash)
        let access_token = queryParams?.access_token || new URLSearchParams(fragment || '').get('access_token');
        let refresh_token = queryParams?.refresh_token || new URLSearchParams(fragment || '').get('refresh_token');
        let type = queryParams?.type || new URLSearchParams(fragment || '').get('type');

        if (access_token && refresh_token) {
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: access_token as string,
            refresh_token: refresh_token as string,
          });

          if (!error) {
            if (type === 'recovery') {
              router.replace('/(auth)/reset-password');
            } else if (session?.user?.email_confirmed_at) {
              await AuthService.ensureNeuralIdentity(
                session.user.id,
                session.user.email || '',
                session.user.user_metadata
              );
              router.replace('/(tabs)');
            } else {
              router.replace('/(auth)/signup');
            }
            return;
          } else {
            console.error('Error setting session:', error.message);
            if (error.message.includes('expired')) {
              Alert.alert('Link Expired', 'This password reset link has expired. Please request a new one.', [
                { text: 'OK', onPress: () => router.replace('/(auth)/forgot-password') }
              ]);
              return;
            }
          }
        }

        // Check if session is already established (e.g. by onAuthStateChange)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (session.user?.email_confirmed_at) {
            await AuthService.ensureNeuralIdentity(
              session.user.id,
              session.user.email || '',
              session.user.user_metadata
            );
            router.replace('/(tabs)');
          } else {
            router.replace('/(auth)/signup');
          }
          return;
        }

        // If we reach here and tokens were present but session failed, show error
        if (access_token || fragment?.includes('access_token')) {
           Alert.alert('Verification Failed', 'The verification link may have expired or is invalid.');
           router.replace('/(auth)/login');
        } else {
           // Fallback redirect if no tokens found but landed on callback
           router.replace('/(auth)/login');
        }
      } catch (err) {
        console.error('Unexpected error in auth callback:', err);
        router.replace('/(auth)/login');
      }
    };

    handleCallback();
  }, [url]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <ActivityIndicator size="large" color="#A855F7" />
    </View>
  );
}
