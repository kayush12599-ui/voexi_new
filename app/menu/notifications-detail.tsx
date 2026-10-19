import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../hooks/useLanguage';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';

export default function NotificationsDetailScreen() {
  const router = useRouter();
  const { isLight } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);

  const [notifs, setNotifs] = useState({
    notif_video: true,
    notif_reels: true,
    notif_photo: true,
    notif_live: true,
    notif_profile: true,
    notif_analytics: true,
    notif_messages: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('notif_video, notif_reels, notif_photo, notif_live, notif_profile, notif_analytics, notif_messages').eq('id', user.id).maybeSingle();
        if (data) setNotifs(data);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const syncSetting = async (key: keyof typeof notifs, val: boolean) => {
    try {
      setNotifs(prev => ({ ...prev, [key]: val }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ [key]: val }).eq('id', user.id);
      }
    } catch (e) { Alert.alert("Error", "Could not update preference."); }
  };

  const NavItem = ({ icon, title, value, onPress, lib = 'Ionicons' }: any) => (
    <TouchableOpacity
      style={[styles.item, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]}
      onPress={onPress}
    >
      <View style={styles.itemLeft}>
        <View style={styles.iconBox}>
          {lib === 'Ionicons' ? <Ionicons name={icon} size={20} color={VOEXITheme.colors.primary} /> : <MaterialCommunityIcons name={icon} size={20} color={VOEXITheme.colors.primary} />}
        </View>
        <Text style={[styles.itemTitle, isLight && { color: '#333' }]}>{title}</Text>
      </View>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
        <Text style={{color: '#444', fontSize: 10, fontWeight: 'bold'}}>CUSTOMIZE</Text>
        <Ionicons name="chevron-forward" size={16} color="#444" />
      </View>
    </TouchableOpacity>
  );

  const NotifItem = ({ icon, title, value, onToggle, lib = 'Ionicons' }: any) => (
    <View style={[styles.item, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]}>
      <View style={styles.itemLeft}>
        <View style={styles.iconBox}>
          {lib === 'Ionicons' ? <Ionicons name={icon} size={20} color={VOEXITheme.colors.primary} /> : <MaterialCommunityIcons name={icon} size={20} color={VOEXITheme.colors.primary} />}
        </View>
        <Text style={[styles.itemTitle, isLight && { color: '#333' }]}>{title}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#333', true: VOEXITheme.colors.primary }}
        thumbColor={value ? '#fff' : '#888'}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <LinearGradient colors={[VOEXITheme.colors.primary + '11', isLight ? '#fff' : '#000']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={isLight ? '#000' : '#fff'} /></TouchableOpacity>
        <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>NOTIFICATION HUB</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>BROADCAST ALERTS</Text>
        <NavItem icon="videocam-outline" title="Video Alerts" onPress={() => router.push('/menu/notifications-video')} />
        <NavItem icon="play-box-multiple-outline" title="Reels Alerts" onPress={() => router.push('/menu/notifications-reels')} lib="MaterialCommunityIcons" />
        <NavItem icon="image-outline" title="Photo Alerts" onPress={() => router.push('/menu/notifications-photo')} />
        <NotifItem icon="radio-outline" title="Live Stream Alerts" value={notifs.notif_live} onToggle={(v: any) => syncSetting('notif_live', v)} />

        <Text style={[styles.sectionLabel, { marginTop: 30 }]}>STATION & ANALYTICS</Text>
        <NavItem icon="person-outline" title="Profile Activity" onPress={() => router.push('/menu/notifications-profile')} />
        <NavItem icon="analytics-outline" title="Channel Analytics" onPress={() => router.push('/menu/notifications-analytics')} />
        <NavItem icon="chatbubbles-outline" title="Message Alerts" onPress={() => router.push('/menu/notifications-messages')} />

        <View style={styles.infoBox}>
           <Ionicons name="information-circle-outline" size={16} color="#666" />
           <Text style={styles.infoText}>Manage how VOEXI communicates with your neural station.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  content: { padding: 20 },
  sectionLabel: { color: '#444', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15, marginLeft: 10 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#080808', padding: 18, borderRadius: 22, marginBottom: 12, borderWidth: 1, borderColor: '#111' },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  itemTitle: { color: '#eee', fontSize: 14, fontWeight: 'bold' },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 30, paddingHorizontal: 15, opacity: 0.5 },
  infoText: { color: '#666', fontSize: 10, fontWeight: 'bold' }
});
