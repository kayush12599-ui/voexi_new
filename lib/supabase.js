import { Platform } from 'react-native';
if (Platform.OS !== 'web') {
  try {
    require('react-native-url-polyfill/auto');
  } catch (e) {}
}
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://iafmgtldihnhcvrfveev.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhZm1ndGxkaWhuaGN2cmZ2ZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMjk5MzEsImV4cCI6MjA5OTYwNTkzMX0.7hAl0CixGBN2YB8XRWTv3iCAXYfKMjJbnhPNQ8qkrI4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storageKey: 'sb-iafmgtldihnhcvrfveev-auth-token',
  },
});
