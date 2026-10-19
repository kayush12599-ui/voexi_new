import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, Modal, FlatList, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../hooks/useLanguage';
import { SUPPORTED_LANGUAGES } from '../../utils/language';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { AuthService } from '../../lib/authService';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
// import * as LocalAuthentication from 'expo-local-authentication'; // Temporarily disabled due to missing library

import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import { useGestureSettings } from '../../hooks/useGestureSettings';
import { useTheme } from '../../hooks/useTheme';
import Constants from 'expo-constants';
import { TimeTracker } from '../../utils/timeTracker';

export default function SettingsScreen() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const { theme: themeMode, isLight, setThemeMode, interfaceGlow: globalInterfaceGlow, setInterfaceGlow } = useTheme();
  const { lang, changeLanguage, t } = useLanguage();
  const { settings: voiceSettings, updateSettings: updateVoiceSettings } = useVoiceSettings();
  const { settings: gestureSettings, updateSettings: updateGestureSettings } = useGestureSettings();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  const [settings, setSettings] = useState({
    privacyMode: 'public',
    notifications: true,
    emailAlerts: true,
    hapticsEnabled: true,
    dataSaver: false,
    autoPlay: true,
    sensitiveFilter: true,
    requireSubForFriend: false,
    bitrateOptimizer: true,
    twoFactorEnabled: false,
    biometricEnabled: false,
    interfaceGlow: true,
  });

  const [usageTime, setUsageTime] = useState('0m');
  const deviceName = Constants.deviceName || (Platform.OS === 'android' ? 'Android Node' : 'iOS Node');
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  useEffect(() => {
    fetchUserSettings();
    loadUsageStats();
  }, []);

  const loadUsageStats = async () => {
    const stats = await TimeTracker.getStats();
    const today = new Date().toISOString().split('T')[0];
    const seconds = stats[today] || 0;
    setUsageTime(TimeTracker.formatDuration(seconds));
  };

  const fetchUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (data) {
          setSettings({
            privacyMode: data.privacy_mode || 'public',
            notifications: data.notifications_enabled ?? true,
            emailAlerts: data.email_alerts ?? true,
            hapticsEnabled: data.haptics_enabled ?? true,
            dataSaver: data.data_saver ?? false,
            autoPlay: data.auto_play ?? true,
            sensitiveFilter: data.sensitive_filter ?? true,
            requireSubForFriend: data.require_sub_for_friend ?? false,
            bitrateOptimizer: data.bitrate_optimizer ?? true,
            twoFactorEnabled: data.two_factor_enabled ?? false,
            biometricEnabled: data.biometric_enabled ?? false,
            interfaceGlow: data.interface_glow ?? true,
          });
        }
      }
    } catch (e) {}
  };

  const handleGlowToggle = async () => {
    const next = !settings.interfaceGlow;
    setSettings(prev => ({ ...prev, interfaceGlow: next }));
    await setInterfaceGlow(next);
    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const syncSetting = async (key: keyof typeof settings, dbColumn: string, val: any) => {
    try {
      setSettings(prev => ({ ...prev, [key]: val }));
      if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ [dbColumn]: val }).eq('id', user.id);
      }
    } catch (e) {
      Alert.alert(t('common.error'), "Could not connect to neural network.");
    }
  };

  const handleSecurityToggle = async () => {
    const nextVal = !settings.twoFactorEnabled;
    if (settings.twoFactorEnabled) {
      Alert.alert(
        "SECURITY BREACH PROTOCOL",
        "Disabling Neural Link Security will expose your identity to higher risk. Authenticate to proceed.",
        [
          { text: "ABORT", style: "cancel" },
          { text: "DE-AUTHENTICATE", style: "destructive", onPress: () => syncSetting('twoFactorEnabled', 'two_factor_enabled', false) }
        ]
      );
    } else {
      syncSetting('twoFactorEnabled', 'two_factor_enabled', true);
      Alert.alert("IDENTITY LOCKED", "Neural Link Security (2FA) is now active for this Node.");
    }
  };

  const updateThemePreference = async (val: 'dark' | 'light') => {
    await setThemeMode(val);
    if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("VOEXI INTERFACE", `Spectrum background recalibrated to ${val.toUpperCase()}.`);
  };

  const updatePrivacy = async (mode: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ privacy_mode: mode }).eq('id', user.id);
        setSettings(prev => ({ ...prev, privacyMode: mode }));
        setPrivacyModalVisible(false);
      }
    } catch (e) { Alert.alert(t('common.error'), "Something went wrong."); }
  };

  const handleLanguageChange = async (code: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    await changeLanguage(code);
    setLangModalVisible(false);
    setTimeout(() => setIsProcessing(false), 200);
  };

  const handleBiometricToggle = async () => {
    Alert.alert("COMING SOON", "Biometric security module is being calibrated for this node.");
  };

  const currentLangName = (SUPPORTED_LANGUAGES || []).find(l => l.code === lang)?.name || 'English';

  const SettingItem = ({ icon, title, value, type, onPress, desc }: any) => (
    <View style={{ marginBottom: 15 }}>
      <TouchableOpacity style={[styles.item, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.itemLeft}>
          <View style={styles.iconContainer}><Ionicons name={icon} size={20} color={VOEXITheme.colors.primary} /></View>
          <Text style={[styles.itemTitle, isLight && { color: '#333' }]}>{title}</Text>
        </View>
        <View style={styles.itemRight}>
          {type === 'toggle' ? (
            <Switch value={!!value} onValueChange={onPress} trackColor={{ false: '#333', true: VOEXITheme.colors.primary }} thumbColor={value ? '#fff' : '#888'} />
          ) : (
            <View style={styles.valRow}><Text style={[styles.itemVal, isLight && { color: '#999' }]}>{value}</Text><Ionicons name="chevron-forward" size={16} color={isLight ? '#BBB' : '#444'} /></View>
          )}
        </View>
      </TouchableOpacity>
      {desc && <Text style={{ color: '#333', fontSize: 9, marginLeft: 65, marginTop: -8 }}>{desc}</Text>}
    </View>
  );

  const handleClearCache = async () => {
    Alert.alert("MAINTENANCE", "Clearing local neural cache to free memory. Proceed?", [
      { text: "ABORT", style: "cancel" },
      {
        text: "PURGE",
        onPress: async () => {
          try {
            const keys = await AsyncStorage.getAllKeys();
            const toKeep = ['supabase.auth.token', 'theme_mode', 'language_code', 'last_email'];
            const toRemove = keys.filter(k => !toKeep.some(tk => k.includes(tk)));
            await AsyncStorage.multiRemove(toRemove);

            if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("SUCCESS", "Cache wiped. Signal performance optimized.");
          } catch (e) {
            Alert.alert("ERROR", "Failed to clear cache.");
          }
        }
      }
    ]);
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "NUCLEAR IDENTITY WIPE",
      "WARNING: This will permanently erase your profile, all videos, and all signals. This is NOT a test. Data is NOT recoverable. Proceed?",
      [
        { text: "ABORT", style: "cancel" },
        {
          text: "WIPE EVERYTHING",
          style: "destructive",
          onPress: async () => {
            setIsProcessing(true);
            try {
              // 1. Trigger Hard Delete
              const { error } = await supabase.rpc('shred_identity_v2');

              if (error) {
                 // Fallback manual wipe if RPC fails
                 const { data: { user } } = await supabase.auth.getUser();
                 if (user) await supabase.from('profiles').delete().eq('id', user.id);
              }

              // 2. Local Cleanup
              await AsyncStorage.clear();
              await supabase.auth.signOut();

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.replace('/(auth)/login');
            } catch (e) {
              await supabase.auth.signOut();
              router.replace('/(auth)/login');
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      {settings.interfaceGlow && (
        <LinearGradient
          colors={[VOEXITheme.colors.primary + '33', 'transparent']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
        />
      )}
      <LinearGradient colors={[VOEXITheme.colors.primary + '11', isLight ? '#fff' : '#000']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/menu')}>
          <Ionicons name="arrow-back" size={24} color={isLight ? '#000' : '#fff'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>{t('settings.title')}</Text><View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, isLight && { color: '#999' }]}>{t('settings.account_privacy')}</Text>
        <SettingItem icon="lock-closed-outline" title={t('settings.account_privacy_btn')} value={settings.privacyMode.toUpperCase()} onPress={() => { if (!isProcessing) { setPrivacyModalVisible(true); } }} />
        <SettingItem
          icon="globe-outline"
          title={t('settings.country_language')}
          value={t('settings.global_preferences')}
          onPress={() => { if (!isProcessing) { router.push('/onboarding/country'); } }}
        />
        <SettingItem
          icon="color-palette-outline"
          title={t('settings.theme')}
          value={themeMode === 'dark' ? t('settings.theme_dark') : t('settings.theme_light')}
          onPress={() => updateThemePreference(themeMode === 'dark' ? 'light' : 'dark')}
        />
        <SettingItem
          icon="shield-checkmark-outline"
          title={t('settings.loyalty_filter')}
          value={settings.requireSubForFriend}
          type="toggle"
          onPress={() => syncSetting('requireSubForFriend', 'require_sub_for_friend', !settings.requireSubForFriend)}
          desc="Only subscribers can send you friend requests."
        />

        <SettingItem
          icon="sparkles-outline"
          title="Neural Interface Glow"
          value={settings.interfaceGlow}
          type="toggle"
          onPress={handleGlowToggle}
          desc="Enable premium neon glow across the Spectrum interface."
        />

        <SettingItem
          icon="finger-print-outline"
          title={t('settings.security')}
          value={settings.twoFactorEnabled}
          type="toggle"
          onPress={handleSecurityToggle}
          desc={t('settings.security_desc')}
        />

        <SettingItem
          icon="scan-outline"
          title="Biometric Access Lock"
          value={settings.biometricEnabled}
          type="toggle"
          onPress={handleBiometricToggle}
          desc="Protect your wallet and station with fingerprint/FaceID."
        />

        <SettingItem
          icon="notifications-outline"
          title={t('settings.notifications')}
          value="Manage Alerts"
          onPress={() => { if (!isProcessing) router.push('/menu/notifications-detail'); }}
        />
        <SettingItem icon="mail-outline" title={t('settings.email_alerts')} value={settings.emailAlerts} type="toggle" onPress={() => syncSetting('emailAlerts', 'email_alerts', !settings.emailAlerts)} />
        <SettingItem icon="vibrate-outline" title={t('settings.haptics')} value={settings.hapticsEnabled} type="toggle" onPress={() => syncSetting('hapticsEnabled', 'haptics_enabled', !settings.hapticsEnabled)} />

        <Text style={[styles.sectionTitle, isLight && { color: '#999' }]}>{t('settings.activity')}</Text>
        <SettingItem
          icon="time-outline"
          title={t('settings.history')}
          value="View"
          onPress={() => { if (!isProcessing) router.push('/menu/history'); }}
          desc={t('settings.history_desc')}
        />
        <SettingItem
          icon="notifications-outline"
          title={t('settings.notifications')}
          value="Manage Alerts"
          onPress={() => { if (!isProcessing) router.push('/menu/notifications-detail'); }}
        />

        <Text style={[styles.sectionTitle, isLight && { color: '#999' }]}>{t('settings.performance')}</Text>
        <SettingItem icon="phone-portrait-outline" title={t('settings.node_id')} value={deviceName} onPress={() => Alert.alert("NODE DETAILS", `Device Name: ${deviceName}\nOS Version: ${Platform.OS.toUpperCase()} ${Platform.Version}`)} />
        <SettingItem
          icon="speedometer-outline"
          title={t('settings.bitrate')}
          value={settings.bitrateOptimizer}
          type="toggle"
          onPress={() => syncSetting('bitrateOptimizer', 'bitrate_optimizer', !settings.bitrateOptimizer)}
          desc={t('settings.bitrate_desc')}
        />

        <Text style={[styles.sectionTitle, isLight && { color: '#999' }]}>{t('settings.preferences')}</Text>
        <SettingItem
          icon="play-circle-outline"
          title={t('settings.autoplay')}
          value={settings.autoPlay}
          type="toggle"
          onPress={() => syncSetting('autoPlay', 'auto_play', !settings.autoPlay)}
        />
        <SettingItem
          icon="eye-off-outline"
          title={t('settings.sensitive_filter')}
          value={settings.sensitiveFilter}
          type="toggle"
          onPress={() => syncSetting('sensitiveFilter', 'sensitive_filter', !settings.sensitiveFilter)}
        />

        <Text style={[styles.sectionTitle, isLight && { color: '#999' }]}>{t('settings.usage')}</Text>
        <SettingItem
          icon="time-outline"
          title={t('settings.time_on_voexi')}
          value={usageTime}
          onPress={() => Alert.alert("NEURAL USAGE", `You have spent ${usageTime} on the spectrum today.`, [{text: "Daily Limit", onPress: () => Alert.alert("Coming Soon", "Limit protocols are being developed.")}, {text: "Close"}])}
          desc={t('settings.usage_desc')}
        />

        <Text style={[styles.sectionTitle, isLight && { color: '#999' }]}>{t('settings.tools')}</Text>
        <SettingItem
           icon="mic-outline"
           title={t('settings.voice')}
           value={voiceSettings.enabled}
           type="toggle"
           onPress={async () => {
             const next = !voiceSettings.enabled;
             await updateVoiceSettings({ enabled: next });
             if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
             if (next) Alert.alert("VOICE COMMAND", "AI Assistant is now listening in Neural mode.");
           }}
        />
        <SettingItem
           icon="hand-right-outline"
           title={t('settings.gesture')}
           value={gestureSettings.enabled}
           type="toggle"
           onPress={async () => {
             const next = !gestureSettings.enabled;
             await updateGestureSettings({ enabled: next });
             if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
             if (next) Alert.alert("GESTURE SYNC", "Biometric scrolling enabled for Video Feed.");
           }}
        />
        <SettingItem icon="leaf-outline" title={t('settings.data_saver')} value={settings.dataSaver} type="toggle" onPress={() => syncSetting('dataSaver', 'data_saver', !settings.dataSaver)} />

        <Text style={[styles.sectionTitle, isLight && { color: '#999' }]}>{t('settings.identity')}</Text>
        <SettingItem icon="ban-outline" title={t('settings.blocked')} value="Manage Blocklist" onPress={() => router.push('/menu/blocked-users')} />
        <SettingItem
          icon="trash-bin-outline"
          title={t('settings.clear_cache')}
          value="Free Memory"
          onPress={handleClearCache}
        />
        <SettingItem
          icon="shield-half-outline"
          title={t('settings.safety')}
          value="Audit Controls"
          onPress={() => router.push('/menu/policy-center')}
        />
        <SettingItem
          icon="information-circle-outline"
          title="About VOEXI"
          value={`v${appVersion}`}
          onPress={() => router.push('/menu/about')}
        />
        <SettingItem
          icon="log-out-outline"
          title={t('settings.logout')}
          value={t('settings.logout_desc')}
          onPress={() => {
            Alert.alert("DISCONNECT", "Terminate your current neural link?", [
              { text: "STAY", style: "cancel" },
              { text: "DISCONNECT", style: "destructive", onPress: async () => { await AsyncStorage.removeItem('@my_local_uploads').catch(() => {}); await supabase.auth.signOut(); router.replace('/(auth)/login'); } }
            ]);
          }}
        />

        <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteAccount}><Text style={styles.dangerText}>{t('settings.delete_account')}</Text></TouchableOpacity>
      </ScrollView>

      {/* Language Modal */}
      <Modal visible={langModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>{t('settings.language')}</Text><TouchableOpacity onPress={() => setLangModalVisible(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <FlatList
              data={SUPPORTED_LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.langItem} onPress={() => handleLanguageChange(item.code)}>
                  <Text style={styles.langName}>{item.name}</Text>
                  {lang.startsWith(item.code) && <Ionicons name="checkmark-circle" size={20} color={VOEXITheme.colors.primary} />}
                </TouchableOpacity>
              )}
            />
        </View></View>
      </Modal>

      <Modal visible={privacyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ACCOUNT PRIVACY</Text>
              <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.privacyItem} onPress={() => updatePrivacy('public')}>
              <View>
                <Text style={styles.privacyLabel}>PUBLIC SPECTRUM</Text>
                <Text style={styles.privacyDesc}>Your profile and productions are visible to all agents.</Text>
              </View>
              {settings.privacyMode === 'public' && <Ionicons name="checkmark-circle" size={24} color={VOEXITheme.colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.privacyItem} onPress={() => updatePrivacy('private')}>
              <View>
                <Text style={styles.privacyLabel}>PRIVATE FREQUENCY</Text>
                <Text style={styles.privacyDesc}>Only authorized friends can view your neural station.</Text>
              </View>
              {settings.privacyMode === 'private' && <Ionicons name="checkmark-circle" size={24} color={VOEXITheme.colors.primary} />}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🛡️ WIPING OVERLAY */}
      {isProcessing && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }]}>
           <ActivityIndicator size="large" color={VOEXITheme.colors.primary} />
           <Text style={{ color: '#fff', marginTop: 20, fontWeight: 'bold', letterSpacing: 2 }}>ERASING IDENTITY...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  scrollContent: { padding: 20 },
  sectionTitle: { color: '#444', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginTop: 25, marginBottom: 15, textTransform: 'uppercase' },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20, backgroundColor: '#080808', borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: '#111' },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  itemTitle: { color: '#eee', fontSize: 15, fontWeight: 'bold' },
  valRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  itemVal: { color: '#444', fontSize: 13, fontWeight: 'bold' },
  dangerBtn: { marginTop: 40, alignItems: 'center', padding: 20 },
  dangerText: { color: '#551111', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, borderTopWidth: 1, borderTopColor: '#222' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  langItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#111' },
  langName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  privacyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#050505', borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#111' },
  privacyLabel: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  privacyDesc: { color: '#444', fontSize: 10, marginTop: 4, fontWeight: 'bold' }
});
