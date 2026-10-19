import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { VOEXITheme } from '../../constants/theme';
import { LocalLibraryService } from '../../lib/localLibraryService';

const { width } = Dimensions.get('window');

export default function LocalLibraryHub() {
  const router = useRouter();
  const [stats, setStats] = useState({ videos: 0, sounds: 0, hidden: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await LocalLibraryService.getLibrary();
    setStats({
      videos: data.filter(i => i.type === 'video' && !i.isHidden).length,
      sounds: data.filter(i => i.type === 'sound' && !i.isHidden).length,
      hidden: data.filter(i => i.isHidden).length
    });
  };

  const LibBtn = ({ title, sub, icon, color, route }: any) => (
    <TouchableOpacity style={styles.libCard} onPress={() => router.push(route)}>
       <LinearGradient colors={['#111', '#050505']} style={styles.cardInner}>
          <View style={[styles.iconBox, { backgroundColor: color + '22' }]}>
             <Ionicons name={icon} size={24} color={color} />
          </View>
          <View style={styles.cardInfo}>
             <Text style={styles.cardTitle}>{title}</Text>
             <Text style={styles.cardSub}>{sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#222" />
       </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={26} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>MY LOCAL STUDIO</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroBox}>
           <LinearGradient colors={[VOEXITheme.colors.primary, '#6366F1']} style={styles.heroGrad}>
              <View>
                 <Text style={styles.heroTitle}>OFFLINE STORAGE</Text>
                 <Text style={styles.heroSub}>All media saved on this device</Text>
              </View>
              <MaterialCommunityIcons name="folder-zip" size={40} color="rgba(255,255,255,0.3)" />
           </LinearGradient>
        </View>

        <Text style={styles.sectionLabel}>COLLECTIONS</Text>

        <LibBtn
          title="Downloaded Videos"
          sub={`${stats.videos} productions ready for offline`}
          icon="cloud-download-outline"
          color="#00F2FE"
          route="/menu/downloads"
        />

        <LibBtn
          title="Saved Sounds"
          sub={`${stats.sounds} tracks for your next remix`}
          icon="musical-notes-outline"
          color="#00C851"
          route="/menu/downloads" // Shared screen for now, can filter
        />

        <LibBtn
          title="Privacy Vault"
          sub={`${stats.hidden} hidden items secured`}
          icon="lock-closed-outline"
          color="#EC4899"
          route="/menu/hide"
        />

        <View style={styles.privacyNote}>
           <Ionicons name="shield-checkmark" size={16} color="#444" />
           <Text style={styles.privacyText}>Items in this library are stored locally on your device and are not uploaded to our servers.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  content: { padding: 20 },
  heroBox: { borderRadius: 25, overflow: 'hidden', marginBottom: 30 },
  heroGrad: { padding: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 5, fontWeight: 'bold' },
  sectionLabel: { color: '#444', fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 15, marginLeft: 5 },
  libCard: { marginBottom: 12, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#111' },
  cardInner: { padding: 18, flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 15 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  cardSub: { color: '#555', fontSize: 11, marginTop: 4 },
  privacyNote: { marginTop: 40, padding: 20, backgroundColor: '#050505', borderRadius: 15, flexDirection: 'row', gap: 12 },
  privacyText: { color: '#333', fontSize: 11, flex: 1, lineHeight: 18, fontWeight: 'bold' }
});
