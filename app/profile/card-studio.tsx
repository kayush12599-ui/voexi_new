import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Dimensions, TextInput, Switch, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadToBunny, getLocalMediaServerUrl, uploadAssetToLocalServer } from '../../lib/bunnyStorage';
import { extractColorFromUri } from '../../lib/colorExtractor';
import { supabase } from '../../lib/supabase';
import { CARD_THEMES, CardTheme } from '../../constants/cardThemes';
import VXIdentityCard from '../../components/VXIdentityCard';
import { VOEXITheme } from '../../constants/theme';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 50) / 3;

const PALETTE_COLORS = [
  '#00F2FE', '#7C5CFF', '#10B981', '#EC4899', '#FFD700',
  '#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6', '#14B8A6'
];

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
  const [customBgUri, setCustomBgUri] = useState<string | null>(null);
  const [bgHasChanged, setBgHasChanged] = useState(false);
  const [customLogoUri, setCustomLogoUri] = useState<string | null>(null);
  const [logoHasChanged, setLogoHasChanged] = useState(false);
  const [blendThemeGlow, setBlendThemeGlow] = useState(false);
  const [badgeColor, setBadgeColor] = useState<string>('#00F2FE');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce Search to prevent UI lag
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
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (data) {
          setProfile(data);
          setSelectedThemeId(data.card_theme || 'default');
          setBlendThemeGlow(data.blend_theme_glow === true);
          if (data.extracted_primary_color) {
            setBadgeColor(data.extracted_primary_color);
          }
          if (data.card_background_uri || data.card_bg_url || data.custom_bg_uri) {
            setCustomBgUri(data.card_background_uri || data.card_bg_url || data.custom_bg_uri);
          }
          if (data.custom_logo_url || data.logo_url) {
            setCustomLogoUri(data.custom_logo_url || data.logo_url);
          }
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
        const uri = result.assets[0].uri;
        setCustomBgUri(uri);
        setSelectedThemeId('custom');
        const sampled = extractColorFromUri(uri);
        setBadgeColor(sampled.primary);
        setBgHasChanged(true);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not pick photo');
    }
  };

  // Pick custom logo photo from mobile gallery for station logo badge
  const pickCustomLogo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow gallery access in settings to set a custom logo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square badge logo
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setCustomLogoUri(result.assets[0].uri);
        setLogoHasChanged(true);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not pick logo photo');
    }
  };

  const removeCustomBackground = () => {
    setCustomBgUri(null);
    setBgHasChanged(true);
  };

  const removeCustomLogo = () => {
    setCustomLogoUri(null);
    setLogoHasChanged(true);
  };

  const handleApplyTheme = async () => {
    setSaving(true);
    try {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { data: sessionData } = await supabase.auth.getSession();
        user = sessionData?.session?.user || null;
      }

      if (!user) {
        Alert.alert("Login Required", "Please login to save card settings.");
        return;
      }

      let finalBgUrl = customBgUri;
      let finalLogoUrl = customLogoUri;

      // 1. Upload BG photo to Local Server 2 High Security Storage + Bunny CDN
      if (customBgUri && bgHasChanged && customBgUri.startsWith('file:')) {
        try {
          const uploadedLocal = await uploadAssetToLocalServer(customBgUri, 'card_bg').catch(() => null);
          const uploadedBunny = await uploadToBunny(customBgUri, 'image').catch(() => null);
          if (uploadedLocal) finalBgUrl = uploadedLocal;
          else if (uploadedBunny) finalBgUrl = uploadedBunny;
        } catch (e) {
          console.warn('Bg photo upload fallback:', e);
        }
      }

      // 2. Upload Logo photo to Local Server 2 High Security Storage + Bunny CDN
      if (customLogoUri && logoHasChanged && customLogoUri.startsWith('file:')) {
        try {
          const uploadedLocalLogo = await uploadAssetToLocalServer(customLogoUri, 'logo').catch(() => null);
          const uploadedBunnyLogo = await uploadToBunny(customLogoUri, 'image').catch(() => null);
          if (uploadedLocalLogo) finalLogoUrl = uploadedLocalLogo;
          else if (uploadedBunnyLogo) finalLogoUrl = uploadedBunnyLogo;
        } catch (e) {
          console.warn('Logo photo upload fallback:', e);
        }
      }

      const updatePayload: any = {
        card_background_uri: finalBgUrl || null,
        card_theme: selectedThemeId,
        extracted_primary_color: badgeColor,
        extracted_accent_color: badgeColor,
        updated_at: new Date().toISOString()
      };

      if (finalLogoUrl) {
        updatePayload.custom_logo_url = finalLogoUrl;
        updatePayload.avatar_url = finalLogoUrl;
      }
      if (typeof blendThemeGlow === 'boolean') updatePayload.blend_theme_glow = blendThemeGlow;

      // 3. Save to Server 1 (Supabase DB) with column error fallback
      let updateError = null;
      try {
        const { error } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', user.id);
        updateError = error;
      } catch (err) {
        updateError = err;
      }

      // If missing column error on Supabase, fallback retry with core columns
      if (updateError) {
        try {
          await supabase
            .from('profiles')
            .update({
              card_background_uri: finalBgUrl || null,
              card_theme: selectedThemeId,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
        } catch (e) {}
      }

      // 4. Update AsyncStorage cached profile
      const fullPayload = {
        ...updatePayload,
        card_background_uri: finalBgUrl,
        card_bg_url: finalBgUrl,
        custom_bg_uri: finalBgUrl,
        custom_logo_url: finalLogoUrl,
        logo_url: finalLogoUrl,
        card_theme: selectedThemeId,
        blend_theme_glow: blendThemeGlow,
        extracted_primary_color: badgeColor,
        extracted_accent_color: badgeColor
      };

      try {
        const cached = await AsyncStorage.getItem(`@cached_user_profile_${user.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          await AsyncStorage.setItem(`@cached_user_profile_${user.id}`, JSON.stringify({ ...parsed, ...fullPayload }));
        } else {
          await AsyncStorage.setItem(`@cached_user_profile_${user.id}`, JSON.stringify(fullPayload));
        }
      } catch (e) {}

      // 5. Dual-Sync Save to Server 2 (Local Media Server)
      try {
        const localServerUrl = getLocalMediaServerUrl();
        await fetch(`${localServerUrl}/api/profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: user.id,
            ...fullPayload
          })
        }).catch(() => {});
      } catch (e) {}

      Alert.alert('Success', 'VX Identity Card theme, background photo & logo saved successfully on Server!');
      router.back();
    } catch (e: any) {
      console.error("Save Theme Error:", e);
      Alert.alert('Error', e.message || 'Failed to save card settings');
    } finally {
      setSaving(false);
    }
  };

  const onSelectTheme = useCallback((id: string) => {
    setSelectedThemeId(id);
    const themeObj = CARD_THEMES.find(t => t.id === id);
    if (themeObj?.badgeColors?.[0]) {
      setBadgeColor(themeObj.badgeColors[0]);
    }
    if (!blendThemeGlow) {
      setCustomBgUri(null);
      setBgHasChanged(true);
    }
  }, [blendThemeGlow]);

  const renderThemeItem = useCallback(({ item }: { item: CardTheme }) => (
    <ThemeGalleryItem
      theme={item}
      isSelected={selectedThemeId === item.id}
      onSelect={onSelectTheme}
    />
  ), [selectedThemeId, onSelectTheme]);

  const selectedTheme = useMemo(() => CARD_THEMES.find(t => t.id === selectedThemeId) || CARD_THEMES[0], [selectedThemeId]);

  const mergedProfile = useMemo(() => {
    return {
      ...profile,
      card_background_uri: customBgUri,
      custom_logo_url: customLogoUri,
      blend_theme_glow: blendThemeGlow,
      extracted_primary_color: badgeColor,
      extracted_accent_color: badgeColor
    };
  }, [profile, customBgUri, customLogoUri, blendThemeGlow, badgeColor]);

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
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity onPress={pickCustomCardBackground} activeOpacity={0.8} style={styles.uploadBgBtn}>
              <Ionicons name="image-outline" size={13} color="#00F2FE" style={{ marginRight: 4 }} />
              <Text style={styles.uploadBgText}>
                {customBgUri ? 'CHANGE BG' : '🖼️ SET BG PHOTO'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={pickCustomLogo} activeOpacity={0.8} style={[styles.uploadBgBtn, { borderColor: '#A855F7', backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
              <Ionicons name="shield-outline" size={13} color="#A855F7" style={{ marginRight: 4 }} />
              <Text style={[styles.uploadBgText, { color: '#A855F7' }]}>
                {customLogoUri ? 'CHANGE LOGO' : '🛡️ SET LOGO'}
              </Text>
            </TouchableOpacity>

            {customBgUri && (
              <TouchableOpacity onPress={removeCustomBackground} style={styles.removeBgBtn}>
                <Ionicons name="trash-outline" size={12} color="#f43f5e" />
              </TouchableOpacity>
            )}
            {customLogoUri && (
              <TouchableOpacity onPress={removeCustomLogo} style={styles.removeBgBtn}>
                <Ionicons name="close-circle-outline" size={12} color="#f43f5e" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* CARD PREVIEW */}
        <View style={styles.previewContainer}>
          <VXIdentityCard
            profile={mergedProfile}
            themeId={selectedThemeId}
          />
        </View>

        {/* BLEND THEME GLOW & SEARCH CONTROLS ROW */}
        <View style={styles.controlsRow}>
          <View style={[styles.inputBox, { flex: 1 }]}>
            <Ionicons name="search-outline" size={14} color="#666" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.textInput}
              placeholder="Search themes gallery..."
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

          {customBgUri && (
            <View style={styles.blendToggleBox}>
              <Ionicons name="sparkles" size={12} color="#FFD700" style={{ marginRight: 4 }} />
              <Text style={styles.blendToggleText}>Blend Glow</Text>
              <Switch
                value={blendThemeGlow}
                onValueChange={setBlendThemeGlow}
                thumbColor={blendThemeGlow ? VOEXITheme.colors.primary : '#333'}
                trackColor={{ false: '#222', true: 'rgba(168, 85, 247, 0.4)' }}
                style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
              />
            </View>
          )}
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
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.applyText}>SAVE CARD THEME & OPTIONS</Text>}
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
    marginLeft: 2,
    padding: 4,
  },
  previewContainer: {
    marginBottom: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
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
  blendToggleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 38,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
  },
  blendToggleText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 'bold',
    marginRight: 2,
  },

  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  colorSwatchActive: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
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
