import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Dimensions, TextInput, FlatList, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { VOEXITheme } from '../../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const MOCK_SOUNDS = [
  { id: '1', title: 'Raga of Revenge', artist: 'Anirudh Ravichander', duration: '1:00', usage: '115K VX', thumb: 'https://via.placeholder.com/100/FF0000/FFFFFF?text=Raga' },
  { id: '2', title: "DON'T STOP - Slowed", artist: 'GLXXMSTRIDER', duration: '1:00', usage: '6.7M VX', thumb: 'https://via.placeholder.com/100/00F2FE/FFFFFF?text=Stop' },
  { id: '3', title: 'PASSO BEM SOLTO', artist: 'ATLXS', duration: '1:00', usage: '21M VX', thumb: 'https://via.placeholder.com/100/FF00CC/FFFFFF?text=Passo' },
  { id: '4', title: 'AVANGARD (Ultra Slow)', artist: 'LONOWN', duration: '1:00', usage: '853K VX', thumb: 'https://via.placeholder.com/100/3C096C/FFFFFF?text=Ava' },
  { id: '5', title: 'Shararat', artist: 'Shashwat Sachdev', duration: '1:00', usage: '1.4M VX', thumb: 'https://via.placeholder.com/100/FFD700/FFFFFF?text=Sha' },
  { id: '6', title: 'Headlights', artist: 'Alok, Alan Walker', duration: '1:00', usage: '2.1M VX', thumb: 'https://via.placeholder.com/100/00C851/FFFFFF?text=Head' },
];

export default function RemixStudioPage() {
  const router = useRouter();
  const { videoSource, audioSource } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState('Browse');
  const [search, setSearch] = useState('');

  const renderSoundItem = ({ item }: { item: typeof MOCK_SOUNDS[0] }) => (
    <TouchableOpacity
      style={styles.soundCard}
      onPress={() => router.push({ pathname: '/menu/editor', params: { videoSource, audioSource: item.thumb, remixType: 'music' } })}
    >
      <View style={styles.cardContent}>
        <Image source={{ uri: item.thumb }} style={styles.soundThumb} />
        <View style={styles.soundInfo}>
          <Text style={styles.soundTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.soundArtist}>{item.artist}</Text>
          <View style={styles.metaRow}>
             <Ionicons name="stats-chart" size={10} color={VOEXITheme.colors.secondary} />
             <Text style={styles.soundMeta}>{item.usage} PRODUCTIONS</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.useBtn}>
           <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <LinearGradient colors={['transparent', 'rgba(255,255,255,0.02)']} style={StyleSheet.absoluteFill} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#050505', '#000']} style={StyleSheet.absoluteFill} />

      {/* VX Unique Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backCircle}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VX SOUNDS</Text>
        <TouchableOpacity style={styles.aiChip}>
           <Text style={styles.aiChipText}>AI GENERATED</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={MOCK_SOUNDS}
        keyExtractor={(item) => item.id}
        renderItem={renderSoundItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Unique Search */}
            <View style={styles.searchWrapper}>
              <Ionicons name="search" size={18} color={VOEXITheme.colors.secondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search trending audio..."
                placeholderTextColor="#333"
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {/* Custom Styled Tabs */}
            <View style={styles.tabContainer}>
               <TouchableOpacity onPress={() => setActiveTab('Browse')} style={[styles.tabItem, activeTab === 'Browse' && styles.activeTab]}>
                  <Text style={[styles.tabText, activeTab === 'Browse' && styles.activeTabText]}>BROWSE</Text>
               </TouchableOpacity>
               <TouchableOpacity onPress={() => setActiveTab('Saved')} style={[styles.tabItem, activeTab === 'Saved' && styles.activeTab]}>
                  <Text style={[styles.tabText, activeTab === 'Saved' && styles.activeTabText]}>SAVED</Text>
               </TouchableOpacity>
            </View>

            {/* Unique Quick Action Card */}
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push({ pathname: '/menu/editor', params: { videoSource, audioSource, remixType: 'video' } })}
            >
               <LinearGradient colors={[VOEXITheme.colors.primary, '#600']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.quickGradient}>
                  <MaterialCommunityIcons name="sync" size={28} color="#fff" />
                  <View>
                     <Text style={styles.quickTitle}>USE ORIGINAL VIDEO SOUND</Text>
                     <Text style={styles.quickDesc}>Keep the source audio and sync your footage.</Text>
                  </View>
               </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>TRENDING VX TRACKS</Text>
          </>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  backCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 4 },
  aiChip: { backgroundColor: 'rgba(0, 242, 254, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.3)' },
  aiChipText: { color: '#00F2FE', fontSize: 9, fontWeight: 'bold' },

  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', marginHorizontal: 20, marginTop: 10, borderRadius: 15, paddingHorizontal: 15, height: 55, borderWidth: 1, borderColor: '#111' },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, marginLeft: 10, fontWeight: '500' },

  tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginVertical: 25, gap: 15 },
  tabItem: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#080808', borderWidth: 1, borderColor: '#111' },
  activeTab: { borderColor: VOEXITheme.colors.secondary, backgroundColor: 'rgba(0, 242, 254, 0.05)' },
  tabText: { color: '#444', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  activeTabText: { color: '#00F2FE' },

  quickAction: { marginHorizontal: 20, marginBottom: 30, borderRadius: 20, overflow: 'hidden', elevation: 10, shadowColor: VOEXITheme.colors.primary, shadowOpacity: 0.3, shadowRadius: 10 },
  quickGradient: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
  quickTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  quickDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 },

  sectionLabel: { color: '#333', fontSize: 10, fontWeight: '900', marginLeft: 25, marginBottom: 20, letterSpacing: 2 },
  listContent: { paddingBottom: 40 },
  soundCard: { marginHorizontal: 20, marginBottom: 12, borderRadius: 18, overflow: 'hidden', backgroundColor: '#080808', borderWidth: 1, borderColor: '#111' },
  cardContent: { flexDirection: 'row', alignItems: 'center', padding: 12, zIndex: 2 },
  soundThumb: { width: 55, height: 55, borderRadius: 12 },
  soundInfo: { flex: 1, marginLeft: 15 },
  soundTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  soundArtist: { color: '#666', fontSize: 12, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  soundMeta: { color: '#444', fontSize: 9, fontWeight: 'bold' },
  useBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#222' }
});
