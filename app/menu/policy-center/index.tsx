import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { VOEXITheme } from '../../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const POLICIES = [
  { id: 'community', title: 'Community Guidelines', icon: 'account-group', color: '#ff0055' },
  { id: 'creator', title: 'Creator Guidelines', icon: 'fountain-pen-tip', color: '#00ccff' },
  { id: 'monetization', title: 'Monetization Rules', icon: 'database', color: '#ffcc00' },
  { id: 'privacy', title: 'Privacy Policy', icon: 'shield-lock', color: '#00ffaa' },
  { id: 'terms', title: 'Terms of Use', icon: 'file-document-edit', color: '#aa00ff' },
];

export default function PolicyCenter() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filteredPolicies = POLICIES.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>POLICY CENTER</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={{ marginRight: 10 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search guidelines or terms..."
          placeholderTextColor="#444"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.introCard}>
          <LinearGradient colors={['#1a1a1a', '#0a0a0a']} style={styles.glassInner}>
            <MaterialCommunityIcons name="information-variant" size={30} color={VOEXITheme.colors.primary} />
            <Text style={styles.introTitle}>VOEXI TRUST & SAFETY</Text>
            <Text style={styles.introSub}>Learn how we keep our broadcast network safe, original, and rewarding for every broadcaster.</Text>
          </LinearGradient>
        </View>

        <View style={styles.grid}>
          {filteredPolicies.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.policyCard}
              onPress={() => router.push(`/menu/policy-center/${item.id}`)}
            >
              <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                <MaterialCommunityIcons name={item.icon as any} size={28} color={item.color} />
              </View>
              <Text style={styles.policyTitle}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={16} color="#333" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2, marginLeft: 15 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', margin: 20, paddingHorizontal: 15, height: 50, borderRadius: 15, borderWidth: 1, borderColor: '#111' },
  searchInput: { flex: 1, color: '#fff' },
  scrollContent: { paddingBottom: 50 },
  introCard: { marginHorizontal: 20, marginBottom: 30, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#151515' },
  glassInner: { padding: 25, alignItems: 'center' },
  introTitle: { color: '#fff', fontSize: 12, fontWeight: '900', marginTop: 10, letterSpacing: 1.5 },
  introSub: { color: '#666', fontSize: 11, textAlign: 'center', marginTop: 8, lineHeight: 16 },
  grid: { paddingHorizontal: 20 },
  policyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', padding: 15, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: '#111' },
  iconBox: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  policyTitle: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '700', marginLeft: 15 },
});
