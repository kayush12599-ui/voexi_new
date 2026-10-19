import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../hooks/useLanguage';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';

export default function NotificationsMessagesScreen() {
  const router = useRouter();
  const { isLight } = useTheme();
  const { t } = useLanguage();

  const [notifs, setNotifs] = useState({
    notif_m_direct: true,
    notif_m_group: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('notif_m_direct, notif_m_group').eq('id', user.id).maybeSingle();
        if (data) setNotifs(data);
      }
    } catch (e) {}
  };

  const syncSetting = async (key: string, val: boolean) => {
    try {
      setNotifs(prev => ({ ...prev, [key]: val }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ [key]: val }).eq('id', user.id);
      }
    } catch (e) { Alert.alert("Error", "Could not update preference."); }
  };

  const SubNotifItem = ({ icon, title, desc, value, onToggle }: any) => (
    <View style={[styles.item, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]}>
      <View style={styles.itemLeft}>
        <View style={styles.iconBox}><Ionicons name={icon} size={20} color={VOEXITheme.colors.primary} /></View>
        <View>
          <Text style={[styles.itemTitle, isLight && { color: '#333' }]}>{title}</Text>
          <Text style={styles.itemDesc}>{desc}</Text>
        </View>
      </View>
      <Switch value={value} onValueChange={onToggle} trackColor={{ false: '#333', true: VOEXITheme.colors.primary }} thumbColor={value ? '#fff' : '#888'} />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <LinearGradient colors={[VOEXITheme.colors.primary + '11', isLight ? '#fff' : '#000']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={isLight ? '#000' : '#fff'} /></TouchableOpacity>
        <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>MESSAGE ALERTS</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>COMMUNICATION</Text>
        <SubNotifItem icon="chatbubble-outline" title="Direct Messages" desc="When an agent sends you a private signal." value={notifs.notif_m_direct} onToggle={(v: any) => syncSetting('notif_m_direct', v)} />
        <SubNotifItem icon="people-outline" title="Group Chats" desc="Updates from your joined communities." value={notifs.notif_m_group} onToggle={(v: any) => syncSetting('notif_m_group', v)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  content: { padding: 20 },
  sectionLabel: { color: '#444', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15, marginLeft: 10 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#080808', padding: 18, borderRadius: 22, marginBottom: 12, borderWidth: 1, borderColor: '#111' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  itemTitle: { color: '#eee', fontSize: 14, fontWeight: 'bold' },
  itemDesc: { color: '#444', fontSize: 10, marginTop: 2, fontWeight: 'bold' }
});
