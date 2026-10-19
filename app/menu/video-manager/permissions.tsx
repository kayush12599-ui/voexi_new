import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { VOEXITheme } from '../../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function SignalPermissionsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [perms, setPerms] = useState({
    allow_saving: true,
    allow_downloads: true,
    allow_rating: true,
    allow_sharing: true,
  });

  useEffect(() => {
    fetchPermissions();
  }, [id]);

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase.from('posts').select('allow_saving, allow_downloads, allow_rating, allow_sharing').eq('id', id).single();
      if (data) {
        setPerms({
          allow_saving: data.allow_saving !== false,
          allow_downloads: data.allow_downloads !== false,
          allow_rating: data.allow_rating !== false,
          allow_sharing: data.allow_sharing !== false,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase.from('posts').update(perms).eq('id', id);
      if (error) throw error;
      Alert.alert("SUCCESS", "Signal permissions synchronized with the network.");
      router.back();
    } catch (e: any) {
      Alert.alert("SYNC FAILED", e.message);
    } finally {
      setSaving(false);
    }
  };

  const PermissionItem = ({ icon, title, desc, value, onToggle, color }: any) => (
    <View style={styles.itemCard}>
      <LinearGradient colors={['rgba(255,255,255,0.03)', 'transparent']} style={StyleSheet.absoluteFill} />
      <View style={styles.itemHeader}>
        <View style={[styles.iconBox, { backgroundColor: color + '22' }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={styles.itemTitle}>{title}</Text>
          <Text style={styles.itemDesc}>{desc}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#222', true: color }}
          thumbColor={value ? '#fff' : '#444'}
        />
      </View>
    </View>
  );

  if (loading) return <View style={styles.loadingBox}><ActivityIndicator color={VOEXITheme.colors.primary} size="large" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[VOEXITheme.colors.primary + '15', '#05050C']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SIGNAL PERMISSIONS</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>SYNC</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBanner}>
          <MaterialCommunityIcons name="shield-key-outline" size={24} color={VOEXITheme.colors.primary} />
          <Text style={styles.bannerText}>Configure how other agents interact with your broadcast signal across the Spectrum.</Text>
        </View>

        <Text style={styles.sectionLabel}>INTERACTION PROTOCOLS</Text>

        <PermissionItem
          icon="bookmark-outline"
          title="Neural Saving"
          desc="Allow agents to bookmark this signal to their private vault."
          value={perms.allow_saving}
          onToggle={(v: boolean) => setPerms({ ...perms, allow_saving: v })}
          color="#EC4899"
        />

        <PermissionItem
          icon="cloud-download-outline"
          title="Local Download"
          desc="Permit offline storage of this signal on unauthorized devices."
          value={perms.allow_downloads}
          onToggle={(v: boolean) => setPerms({ ...perms, allow_downloads: v })}
          color="#22C55E"
        />

        <PermissionItem
          icon="star-outline"
          title="Signal Rating"
          desc="Enable the 5-star neural evaluation scale for this broadcast."
          value={perms.allow_rating}
          onToggle={(v: boolean) => setPerms({ ...perms, allow_rating: v })}
          color="#EAB308"
        />

        <PermissionItem
          icon="share-social-outline"
          title="Spectrum Sharing"
          desc="Allow redirection of this signal to external networks."
          value={perms.allow_sharing}
          onToggle={(v: boolean) => setPerms({ ...perms, allow_sharing: v })}
          color="#3B82F6"
        />

        <View style={styles.warningBox}>
          <Ionicons name="information-circle-outline" size={18} color="#666" />
          <Text style={styles.warningText}>Changes are applied in real-time across the global network nodes.</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05050C' },
  loadingBox: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  saveBtn: { backgroundColor: VOEXITheme.colors.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 15, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  bannerText: { color: '#888', fontSize: 11, flex: 1, marginLeft: 12, lineHeight: 16 },
  sectionLabel: { color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 20, marginLeft: 5 },
  itemCard: { backgroundColor: '#0D0D15', borderRadius: 20, marginBottom: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#1A1A24' },
  itemHeader: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  itemTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  itemDesc: { color: '#555', fontSize: 11, marginTop: 4, lineHeight: 15 },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingHorizontal: 10 },
  warningText: { color: '#444', fontSize: 10, fontWeight: 'bold' }
});
