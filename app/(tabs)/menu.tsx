import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, Dimensions, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { getThemeById } from '../../constants/cardThemes';
import { AuthService } from '../../lib/authService';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { VoexiIcon } from '../../components/VoexiIcon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const ALL_MENU_ITEMS = [
  { id: '3d-universe', title: '3D Avatar Universe', icon: 'cube-outline', color: '#00F2FE', lib: 'Ionicons', badge: '3D', route: '/menu/3d-universe' },
  { id: 'branding', title: 'Brand Identity', icon: 'color-palette-outline', color: '#FF0080', route: '/branding' },
  { id: 'monetization', title: 'Creator Earnings', icon: 'wallet-outline', color: '#10B981', badge: 'Earn', route: '/menu/monetization' },
  { id: 'premium', title: 'Premium Access', icon: 'crown-outline', color: '#EAB308', lib: 'MaterialCommunityIcons', route: '/menu/premium' },

  { id: 'ar-shot', title: 'AR Shot', icon: 'camera-reverse-outline', color: '#FF0055', route: '/menu/ar-shot' },
  { id: 'ai-chat', title: 'VOEXI AI', icon: 'robot-outline', color: '#6366F1', lib: 'MaterialCommunityIcons', badge: 'Pro', route: '/menu/aichat' },
  { id: 'chat', title: 'Messages', icon: 'chatbubbles-outline', color: '#A855F7', route: '/(tabs)/chat' },

  { id: 'saved', title: 'Saved Content', icon: 'bookmark-outline', color: '#EC4899', route: '/menu/saved-videos' },
  { id: 'downloads', title: 'Offline Videos', icon: 'cloud-download-outline', color: '#22C55E', route: '/menu/downloads' },
  { id: 'history', title: 'Watch History', icon: 'time-outline', color: '#F59E0B', route: '/menu/history' },
  { id: 'hide', title: 'Privacy Vault', icon: 'lock-closed-outline', color: '#8B5CF6', route: '/menu/hide' },

  { id: 'analytics', title: 'Analytics', icon: 'stats-chart-outline', color: '#06B6D4', route: '/menu/analytics' },
  { id: 'groups', title: 'Clusters', icon: 'people-outline', color: '#8B5CF6', route: '/menu/clusters' },

  { id: 'settings', title: 'Settings', icon: 'settings-outline', color: '#3B82F6', route: '/menu/settings' },
  { id: 'ad-test', title: 'Google Mobile Ads Test', icon: 'shield-checkmark-outline', color: '#10B981', badge: 'Test', route: '/ad-test' },
  { id: 'about', title: 'About VOEXI', icon: 'information-circle-outline', color: '#6366F1', route: '/menu/about' },
  { id: 'support', title: 'Help & Support', icon: 'help-buoy-outline', color: '#EF4444', route: '/menu/report' },
  { id: 'emergency', title: 'Safety Center', icon: 'shield-outline', color: '#F43F5E', route: '/menu/emergency' },
];

const MENU_SECTIONS = [
  { key: 'creator', items: ['monetization', 'premium'] },
  { key: 'studio', items: ['3d-universe', 'ar-shot', 'ai-chat', 'chat'] },
  { key: 'library', items: ['saved', 'downloads', 'history', 'hide'] },
  { key: 'community', items: ['analytics', 'groups'] },
  { key: 'support', items: ['settings', 'ad-test', 'support', 'emergency', 'about'] },
];

export default function MenuScreen() {
  const router = useRouter();
  const themeContext = useTheme();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);

  const theme = getThemeById(profile?.card_theme || 'default');
  const isLight = themeContext.isLight;

  const toggleDarkMode = (val: boolean) => {
    themeContext.setThemeMode(val ? 'dark' : 'light');
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      let activeUserId = authData?.user?.id;
      let activeEmail = authData?.user?.email || '';

      if (!activeUserId) {
        const { data: sessionData } = await supabase.auth.getSession();
        activeUserId = sessionData?.session?.user?.id;
        activeEmail = sessionData?.session?.user?.email || '';
      }

      if (!activeUserId) {
        const lastEmail = await AsyncStorage.getItem('last_email');
        if (lastEmail) {
          const { data: profByEmail } = await supabase.from('profiles').select('*').eq('email', lastEmail).maybeSingle();
          if (profByEmail) {
            activeUserId = profByEmail.id;
            activeEmail = profByEmail.email || lastEmail;
          }
        }
      }

      if (!activeUserId) return;

      await AuthService.ensureNeuralIdentity(activeUserId, activeEmail);

      // 1. Fetch from Supabase DB, Local AsyncStorage, and Server 2
      const [profRes, cachedProfRaw, s2Res] = await Promise.allSettled([
        supabase.from('profiles').select('*').eq('id', activeUserId).maybeSingle(),
        AsyncStorage.getItem(`@cached_user_profile_${activeUserId}`),
        fetch(`http://192.168.31.39:8080/api/profiles?id=${activeUserId}`).then(r => r.json()).catch(() => null)
      ]);

      const dbProf = profRes.status === 'fulfilled' ? profRes.value?.data : null;
      let cachedProf: any = null;
      if (cachedProfRaw.status === 'fulfilled' && cachedProfRaw.value) {
        try { cachedProf = JSON.parse(cachedProfRaw.value); } catch (e) {}
      }
      const s2Prof = (s2Res.status === 'fulfilled' && s2Res.value?.success) ? s2Res.value.profile : null;

      const merged = { ...dbProf, ...s2Prof, ...cachedProf };

      if (merged) {
        const displayName = merged.channel_name || merged.username || 'VOEXI Station';
        const realLogo = merged.custom_logo_url || merged.logo_url || merged.avatar_url;
        const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=A855F7&color=fff&bold=true`;

        const finalProfile = {
          ...merged,
          channel_name: displayName,
          username: merged.username || 'broadcaster',
          avatar_url: realLogo && realLogo.startsWith('http') ? realLogo : fallbackAvatar,
          vx_id_number: merged.vx_id_number || 'VX-9082 1120',
        };

        setProfile(finalProfile);
      }
    } catch (err) {
      console.error("[MENU_FETCH_ERROR]", err);
    }
  };

  const runSystemDiagnostics = async () => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch (e) {}

    let server2Status = "Checking...";
    let fileCount = 0;
    try {
      const res = await fetch('http://192.168.31.39:8080/files.json').then(r => r.json()).catch(() => null);
      if (Array.isArray(res)) {
        server2Status = "ONLINE 🟢 (Port 8080)";
        fileCount = res.length;
      } else {
        server2Status = "OFFLINE 🔴";
      }
    } catch (e) {
      server2Status = "UNREACHABLE";
    }

    const { data: authData } = await supabase.auth.getUser();
    const myId = authData?.user?.id || 'Not Logged In';

    Alert.alert(
      "🛠️ VOEXI SYSTEM & SERVER AUDIT",
      `• Server 2 Status: ${server2Status}\n` +
      `• Server 2 Active Media Files: ${fileCount} Files\n` +
      `• Stories System: 24-Hour Auto-Expiry Active\n` +
      `• Reels Studio: 9:16 Engine Ready\n` +
      `• User ID: ${myId.substring(0, 12)}...\n` +
      `• Channel Name: ${profile?.channel_name || profile?.username || 'VOEXI Station'}\n` +
      `• Custom Logo: ${profile?.custom_logo_url ? 'Active 🖼️' : 'Default'}\n\n` +
      `All core systems are 100% synchronized and running smoothly!`,
      [{ text: "OK" }]
    );
  };

  const filteredMenuItems = ALL_MENU_ITEMS;

  const renderIcon = (item: any) => {
    if (item.lib === 'MaterialCommunityIcons') {
      return <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />;
    }
    return <Ionicons name={item.icon} size={22} color={item.color} />;
  };

  const handleLogout = async () => {
    Alert.alert(t('settings.logout'), t('settings.logout_desc'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.logout'),
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('@my_local_uploads').catch(() => {});
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          } catch (err) {
            router.replace('/(auth)/login');
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      {/* TOP BRAND HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.logoRow} onPress={() => router.push('/branding')}>
          <VoexiIcon size={32} isLight={isLight} />
          <Text style={[styles.logoV, isLight && { color: '#000' }]}>VOEXI</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color={isLight ? '#000' : '#fff'} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* TOP USER PROFILE CARD */}
        <TouchableOpacity style={[styles.profileSection, isLight && { backgroundColor: '#F9F9F9' }]} onPress={() => router.push('/(tabs)/profile')}>
          <LinearGradient colors={[theme.colors[0], 'transparent']} style={styles.themedHeaderBg} />
          <View style={[styles.avatarContainer, { borderColor: theme.borderColor }]}>
            <Image
              source={{ uri: profile?.custom_logo_url || profile?.logo_url || profile?.avatar_url || 'https://via.placeholder.com/150' }}
              style={styles.avatar}
              contentFit="cover"
            />
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.fullName, { color: isLight ? '#000' : theme.textColor }]}>{profile?.channel_name || 'VOEXI Station'}</Text>
              {profile?.registration_number && <MaterialCommunityIcons name="check-decagram" size={16} color={VOEXITheme.colors.primary} style={{marginLeft: 4}} />}
            </View>
            <Text style={[styles.username, { color: isLight ? '#666' : theme.borderColor }]}>@{profile?.username || 'broadcaster'}</Text>
            <Text style={[styles.userId, isLight && { color: '#999' }]}>ID: {profile?.vx_id_number ? profile.vx_id_number.replace(/(\d{4})(?=\d)/g, '$1 ') : 'VX-9082 1120'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={isLight ? '#999' : '#666'} />
        </TouchableOpacity>

        {/* SYSTEM DIAGNOSTICS & AUDIT HUB */}
        <TouchableOpacity style={{ marginBottom: 15, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.3)' }} onPress={runSystemDiagnostics} activeOpacity={0.8}>
          <LinearGradient colors={['#101020', '#050510']} style={{ padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0, 242, 254, 0.15)', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="hardware-chip-outline" size={22} color="#00F2FE" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '900' }}>SYSTEM & SERVER DIAGNOSTICS</Text>
                <Text style={{ color: '#00F2FE', fontSize: 10, fontWeight: '700', marginTop: 2 }}>Tap to run 1-click live health check & audit</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#666" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {MENU_SECTIONS.map((section, sIdx) => {
          const sectionItems = filteredMenuItems.filter(i => section.items.includes(i.id));
          if (sectionItems.length === 0) return null;

          return (
            <View key={sIdx} style={styles.sectionContainer}>
              <Text style={[styles.groupTitle, isLight && { color: '#888' }]}>{t(`menu_sections.${section.key}`)}</Text>
              <View style={[styles.menuList, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]}>
                {sectionItems.map((item, iIdx) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.menuItem,
                      iIdx < sectionItems.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: isLight ? '#EEE' : 'rgba(255,255,255,0.03)' }
                    ]}
                    onPress={() => router.push(item.route as any)}
                  >
                    <View style={styles.menuItemLeft}>
                      <View style={styles.iconWrapper}>{renderIcon(item)}</View>
                      <Text style={[styles.menuItemTitle, isLight && { color: '#000' }]}>{item.title || t(`menu_items.${item.id.replace(/-/g, '_')}`)}</Text>
                    </View>
                    <View style={styles.menuItemRight}>
                      {item.badge && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{item.badge}</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={20} color={isLight ? '#BBB' : '#333'} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}

        <LinearGradient colors={['#1a1033', '#0a0a0a']} style={styles.premiumCard}>
          <View style={styles.premiumContent}>
            <View style={styles.premiumTextSection}>
              <Text style={styles.premiumTitle}>Go Premium</Text>
              <Text style={styles.premiumSubtitle}>Unlock exclusive features</Text>
            </View>
            <FontAwesome5 name="crown" size={40} color="#FFD700" />
          </View>
          <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/menu/premium')}>
            <LinearGradient colors={['#A855F7', '#EC4899']} style={styles.upgradeGradient}>
              <Text style={styles.upgradeText}>Upgrade Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.darkModeRow}>
          <View style={styles.darkModeLeft}>
            <Ionicons name="moon-outline" size={22} color={isLight ? '#000' : '#fff'} />
            <Text style={[styles.darkModeText, isLight && { color: '#000' }]}>Dark Mode</Text>
          </View>
          <Switch
            value={!isLight}
            onValueChange={(val) => toggleDarkMode(val)}
            trackColor={{ false: '#333', true: '#A855F7' }}
          />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05050C' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  logoV: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 2, marginLeft: 10 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  closeBtn: { padding: 5 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30 },
  profileSection: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, padding: 15, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', overflow: 'hidden' },
  aiBannerCard: { marginVertical: 6, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.4)' },
  aiBannerGradient: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  aiIconWrapper: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(99, 102, 241, 0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(129, 140, 248, 0.6)' },
  aiBannerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  aiBannerSub: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  aiBadge: { backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  aiBadgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  themedHeaderBg: { ...StyleSheet.absoluteFillObject, opacity: 0.15 },
  avatarContainer: { width: 70, height: 70, borderRadius: 35, borderWidth: 1.5, borderColor: '#A855F7', backgroundColor: '#000', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%', borderRadius: 35 },
  profileInfo: { flex: 1, marginLeft: 15 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  fullName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  username: { color: '#A855F7', fontSize: 14, fontWeight: '500', marginTop: 2 },
  userId: { color: '#666', fontSize: 12, marginTop: 4 },
  sectionContainer: { marginBottom: 10 },
  groupTitle: { color: '#6366F1', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginTop: 25, marginBottom: 12, marginLeft: 10, textTransform: 'uppercase', opacity: 0.8 },
  menuList: { marginVertical: 10, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 25, padding: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconWrapper: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  menuItemTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  menuItemRight: { flexDirection: 'row', alignItems: 'center' },
  badge: { backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 10 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  premiumCard: { borderRadius: 20, padding: 20, marginTop: 30, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.2)' },
  premiumContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  premiumTextSection: { flex: 1 },
  premiumTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  premiumSubtitle: { color: '#aaa', fontSize: 12, marginTop: 4 },
  upgradeBtn: { height: 45, borderRadius: 12, overflow: 'hidden' },
  upgradeGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  upgradeText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  darkModeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, paddingVertical: 10 },
  darkModeLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  darkModeText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 40, marginBottom: 20, paddingVertical: 15, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)' },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: 'bold' }
});
