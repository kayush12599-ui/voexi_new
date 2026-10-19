import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguage } from '../../hooks/useLanguage';
import { VOEXITheme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COUNTRIES } from '../../constants/countries';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

export default function LanguageSelectScreen() {
  const router = useRouter();
  const { countryCode } = useLocalSearchParams();
  const { t, lang, changeLanguage } = useLanguage();
  const [loading, setLoading] = useState(false);

  const country = COUNTRIES ? (COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0]) : { flag: '🌍', name: 'Global', languages: [] };
  const languages = country.languages;

  const handleFinalize = async (selectedLang: string) => {
    setLoading(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 1. Change Language Instantly
      await changeLanguage(selectedLang);

      // 2. Save Onboarding Completion
      await AsyncStorage.setItem('@voexi_onboarding_complete', 'true');

      // 3. Sync to Supabase if session exists
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          country: country.code,
          theme_preference: 'dark' // Default
        }).eq('id', user.id);

        // If already in settings (logged in), go back to settings
        router.replace('/(tabs)/menu');
      } else {
        router.replace('/(auth)/login');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#08080C', '#000']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
           <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('onboarding.select_language')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.select_language_sub')}</Text>
      </View>

      <View style={styles.countryBadge}>
         <Text style={styles.flag}>{country.flag}</Text>
         <Text style={styles.countryName}>{country.name.toUpperCase()}</Text>
      </View>

      <FlatList
        data={languages}
        keyExtractor={item => item.code}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, lang === item.code && styles.itemSelected]}
            onPress={() => handleFinalize(item.code)}
          >
            <View style={[styles.iconBox, { backgroundColor: lang === item.code ? VOEXITheme.colors.primary : '#111' }]}>
               <Text style={styles.langInitial}>{item.name[0]}</Text>
            </View>
            <Text style={[styles.name, lang === item.code && { color: VOEXITheme.colors.primary }]}>
              {item.name}
            </Text>
            {lang === item.code && (
              <Ionicons name="checkmark-circle" size={24} color={VOEXITheme.colors.primary} />
            )}
          </TouchableOpacity>
        )}
      />

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={VOEXITheme.colors.primary} />
          <Text style={styles.loaderText}>{t('onboarding.finalize')}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { padding: 30, paddingTop: 10 },
  backBtn: { marginBottom: 20 },
  title: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  subtitle: { color: '#444', fontSize: 12, marginTop: 5, fontWeight: 'bold' },
  countryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0A0F', marginHorizontal: 30, padding: 12, borderRadius: 15, borderWidth: 1, borderColor: '#1A1A1F', marginBottom: 30, gap: 12 },
  flag: { fontSize: 20 },
  countryName: { color: '#666', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 18, backgroundColor: '#080808', borderRadius: 25, marginBottom: 12, borderWidth: 1, borderColor: '#111' },
  itemSelected: { borderColor: VOEXITheme.colors.primary, backgroundColor: 'rgba(124,92,255,0.05)' },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  langInitial: { color: '#fff', fontWeight: '900', fontSize: 18 },
  name: { flex: 1, color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  loaderText: { color: '#fff', fontSize: 12, fontWeight: '900', marginTop: 20, letterSpacing: 2 }
});
