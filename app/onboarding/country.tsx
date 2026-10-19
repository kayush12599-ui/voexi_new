import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, TextInput, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../hooks/useLanguage';
import { VOEXITheme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COUNTRIES, Country } from '../../constants/countries';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CountrySelectScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  useEffect(() => {
    detectCountry();
  }, []);

  const detectCountry = async () => {
    try {
      const locales = Localization.getLocales();
      const regionCode = (locales && locales.length > 0) ? locales[0].regionCode : null;
      if (regionCode && COUNTRIES) {
        const found = COUNTRIES.find(c => c.code === regionCode);
        if (found) setSelectedCountry(found.code);
      }
    } catch (e) {
      console.warn('[Country] Detection logic failed', e);
    }
  };

  const filteredCountries = React.useMemo(() => {
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const handleSelect = async (country: Country) => {
    if (selectedCountry === country.code) {
      router.push({ pathname: '/onboarding/language', params: { countryCode: country.code } });
      return;
    }
    setSelectedCountry(country.code);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem('@voexi_country', country.code);
    router.push({ pathname: '/onboarding/language', params: { countryCode: country.code } });
  };

  const renderItem = useCallback(({ item }: { item: Country }) => (
    <TouchableOpacity
      style={[styles.item, selectedCountry === item.code && styles.itemSelected]}
      onPress={() => handleSelect(item)}
    >
      <Text style={styles.flag}>{item.flag}</Text>
      <Text style={[styles.name, selectedCountry === item.code && { color: VOEXITheme.colors.primary }]}>
        {item.name}
      </Text>
      <Text style={styles.code}>{item.code}</Text>
      {selectedCountry === item.code && (
        <Ionicons name="checkmark-circle" size={24} color={VOEXITheme.colors.primary} />
      )}
    </TouchableOpacity>
  ), [selectedCountry]);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#08080C', '#000']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <Text style={styles.title}>{t('onboarding.select_country')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.select_country_sub')}</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#444" />
        <TextInput
          style={styles.searchInput}
          placeholder={t('common.search_placeholder')}
          placeholderTextColor="#444"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredCountries}
        keyExtractor={item => item.code}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        getItemLayout={(_, index) => ({ length: 75, offset: 75 * index, index })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { padding: 30, paddingTop: 10 },
  title: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  subtitle: { color: '#444', fontSize: 12, marginTop: 5, fontWeight: 'bold' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0A0F', marginHorizontal: 20, paddingHorizontal: 15, height: 55, borderRadius: 15, borderWidth: 1, borderColor: '#1A1A1F', marginBottom: 20 },
  searchInput: { flex: 1, color: '#fff', marginLeft: 12, fontSize: 16 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 18, backgroundColor: '#080808', borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#111' },
  itemSelected: { borderColor: VOEXITheme.colors.primary, backgroundColor: 'rgba(124,92,255,0.05)' },
  flag: { fontSize: 24, marginRight: 15 },
  name: { flex: 1, color: '#fff', fontSize: 16, fontWeight: 'bold' },
  code: { color: '#333', fontSize: 12, fontWeight: '900', marginRight: 15 },
});
