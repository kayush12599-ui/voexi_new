import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Dimensions, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { uploadToBunny } from '../../lib/bunnyStorage';
import { supabase } from '../../lib/supabase';
import { CARD_THEMES, CardTheme } from '../../constants/cardThemes';
import VXIdentityCard from '../../components/VXIdentityCard';
import { VOEXITheme } from '../../constants/theme';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 50) / 3;

// Optimized Memoized Theme Item for Smooth Gallery Display
const ThemeGalleryItem = memo(({ theme, isSelected, onSelect }: { theme: CardTheme; isSelected: boolean; onSelect: (id: string) => void }) => {
  return (
    <TouchableOpacity
      style={[
        styles.themeItem,
        isSelected && styles.selectedThemeItem
      ]}
      activeOpacity={0.8}
      onPress={() => onSelect(theme.id)}
    >
      <LinearGradient
        colors={theme.colors as [string, string, ...string[]]}
        style={[
          styles.themePreview,
          isSelected && { borderColor: VOEXITheme.colors.primary, borderWidth: 2 }
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {isSelected && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
        )}
      </LinearGradient>
      <Text
        style={[styles.themeName, isSelected && styles.selectedThemeName]}
        numberOfLines={1}
      >
        {theme.name}
      </Text>
    </TouchableOpacity>
  );
});

export default function CardStudioScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [selectedThemeId, setSelectedThemeId] = useState('default');
  const [customLabel, setCustomLabel] = useState('');
  const [neuralStatus, setNeuralStatus] = useState('PSYCH-LINK ACTIVE');
  const [customBgUri, setCustomBgUri] = useState<string | null>(null);
  const [bgHasChanged, setBgHasChanged] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // 1. Debounce Search to prevent UI lag
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const filteredThemes = useMemo(() => {
    if (!debouncedQuery.trim()) return CARD_THEMES;
    const lowerQuery = debouncedQuery.toLowerCase();
    return CARD_THEMES.filter(theme =>
       theme.name.toLowerCase().includes(lowerQuery) ||
       (theme.pattern && theme.pattern.includes(lowerQuery))
    );
  }, [debouncedQuery]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
          setProfile(data);
          setSelectedThemeId(data.card_theme || 'default');
          setCustomLabel(data.custom_label || '');
          setNeuralStatus(data.neural_status || 'PSYCH-LINK ACTIVE');
          if (data.card_background_uri) setCustomBgUri(data.card_background_uri);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Pick custom photo from mobile gallery for card background theme
  const pickCustomCardBackground = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow gallery access in settings to set a custom card background photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 10], // Card aspect ratio
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setCustomBgUri(result.assets[0].uri);
        setBgHasChanged(true);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not pick photo');
    }
  };

  const removeCustomBackground = () => {
    setCustomBgUri(null);
    setBgHasChanged(true);
  };

  const handleApplyTheme = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let finalBgUrl = customBgUri;

        if (customBgUri && bgHasChanged) {
          try {
            finalBgUrl = await uploadToBunny(customBgUri, 'image');
          } catch (e) {
            console.error('Bunny bg photo upload error:', e);
            finalBgUrl = customBgUri;
          }
        }

        const { error } = await supabase
          .from('profiles')
          .update({
            card_background_uri: finalBgUrl || null,
            card_theme: selectedThemeId,
            custom_label: customLabel.trim() || null,
            neural_status: neuralStatus,
            updated_at: new Date()
          })
          .eq('id', user.id);

        if (error) throw error;
        Alert.alert('Success', 'VX Identity Card theme & background updated successfully!');
        router.back();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const onSelectTheme = useCallback((id: string) => {
    setSelectedThemeId(id);
  }, []);

  const renderThemeItem = useCallback(({ item }: { item: CardTheme }) => (
    <ThemeGalleryItem
      theme={item}
      isSelected={selectedThemeId === item.id}
      onSelect={onSelectTheme}
    />
  ), [selectedThemeId, onSelectTheme]);

  const mergedProfile = useMemo(() => ({
    ...profile,
    card_background_uri: customBgUri,
    custom_label: customLabel,
    neural_status: neuralStatus
  }), [profile, customBgUri, customLabel, neuralStatus]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={VOEXITheme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#10001a', '#000000']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VX IDENTITY STUDIO</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* FIXED PREVIEW SECTION */}
      <View style={styles.fixedPreview}>
        <View style={styles.previewHeaderRow}>
          <Text style={styles.sectionTitle}>LIVE PREVIEW</Text>
          <TouchableOpacity onPress={pickCustomCardBackground} activeOpacity={0.8} style={styles.uploadBgBtn}>
            <Ionicons name="image-outline" size={13} color="#00F2FE" style={{ marginRight: 4 }} />
            <Text style={styles.uploadBgText}>
              {customBgUri ? 'CHANGE BG PHOTO' : '🖼️ SET CUSTOM BG PHOTO'}
            </Text>
          </TouchableOpacity>
          {customBgUri && (
            <TouchableOpacity onPress={removeCustomBackground} style={styles.removeBgBtn}>
              <Ionicons name="trash-outline" size={12} color="#f43f5e" />
            </TouchableOpacity>
          )}
        </View>

        {/* CARD PREVIEW */}
        <View style={styles.previewContainer}>
          <VXIdentityCard
            profile={mergedProfile}
            themeId={selectedThemeId}
          />
        </View>

        {/* CONTROLS ROW: SEARCH & CUSTOM LABEL INPUT */}
        <View style={styles.controlsRow}>
          <View style={[styles.inputBox, { flex: 1 }]}>
            <Ionicons name="search-outline" size={14} color="#666" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.textInput}
              placeholder="Search themes..."
              placeholderTextColor="#444"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={14} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.inputBox, { flex: 1.2 }]}>
            <Ionicons name="pricetag-outline" size={14} color={VOEXITheme.colors.primary} style={{ marginRight: 6 }} />
            <TextInput
              style={styles.textInput}
              placeholder="Custom Card Label"
              placeholderTextColor="#444"
              value={customLabel}
              onChangeText={setCustomLabel}
              maxLength={20}
            />
          </View>
        </View>
      </View>

      {/* SCROLLABLE LIST AREA */}
      <View style={{ flex: 1 }}>
        <FlatList
          data={filteredThemes}
          keyExtractor={(item) => item.id}
          renderItem={renderThemeItem}
          numColumns={3}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.galleryScroll}
          initialNumToRender={21}
          maxToRenderPerBatch={18}
          windowSize={11}
          removeClippedSubviews={false}
          ListHeaderComponent={
            <View style={styles.galleryHeader}>
              <Text style={styles.sectionTitle}>THEME GALLERY</Text>
              <Text style={styles.themeCount}>{filteredThemes.length} THEMES</Text>
            </View>
          }
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.applyBtn, saving && { opacity: 0.7 }]}
          onPress={handleApplyTheme}
          disabled={saving}
        >
          <LinearGradient
            colors={[VOEXITheme.colors.primary, '#9333ea']}
            style={styles.applyGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.applyText}>APPLY CARD THEME</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold', letterSpacing: 2 },

  fixedPreview: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.85)'
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  uploadBgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
  },
  uploadBgText: {
    color: '#00F2FE',
    fontSize: 9,
    fontWeight: 'bold',
  },
  removeBgBtn: {
    marginLeft: 6,
    padding: 4,
  },
  previewContainer: {
    marginBottom: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 11,
  },

  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
    marginTop: 15
  },
  galleryScroll: {
    paddingBottom: 110,
    paddingHorizontal: 15,
  },

  sectionTitle: { color: '#666', fontSize: 10, fontWeight: 'bold', letterSpacing: 2 },
  themeCount: { color: VOEXITheme.colors.primary, fontSize: 10, fontWeight: 'bold' },

  themeItem: { width: ITEM_WIDTH, marginBottom: 12, alignItems: 'center', paddingHorizontal: 5 },
  themePreview: { width: '100%', aspectRatio: 1.6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  selectedThemeItem: { transform: [{ scale: 1.04 }] },
  checkBadge: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: VOEXITheme.colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#000' },
  themeName: { color: '#555', fontSize: 9, marginTop: 6, textAlign: 'center', fontWeight: 'bold' },
  selectedThemeName: { color: '#fff' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  applyBtn: { height: 50, borderRadius: 14, overflow: 'hidden' },
  applyGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  applyText: { color: '#fff', fontSize: 13, fontWeight: 'bold', letterSpacing: 1.5 },
});
