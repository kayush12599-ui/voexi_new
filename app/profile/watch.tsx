import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

export default function WatchScreen() {
  const router = useRouter();

  const watchList = [
    { id: '1', name: 'Classic Elite', img: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&q=80' },
    { id: '2', name: 'Digital Matrix', img: 'https://images.unsplash.com/photo-1508685096489-7a18c61ce40b?w=400&q=80' },
    { id: '3', name: 'Smart Nexus', img: 'https://images.unsplash.com/photo-1544117519-31a4b719223d?w=400&q=80' },
    { id: '4', name: 'Royal Gold', img: 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=400&q=80' },
    { id: '5', name: 'Cyber Titanium', img: 'https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=400&q=80' },
    { id: '6', name: 'Sport Carbon', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80' },
    { id: '7', name: 'Neon Pulse', img: 'https://images.unsplash.com/photo-1617137968427-83c394297558?w=400&q=80' },
    { id: '8', name: 'Diamond Edge', img: 'https://images.unsplash.com/photo-1517462964-21fdcec3f25b?w=400&q=80' },
    { id: '9', name: 'Silver Spectre', img: 'https://images.unsplash.com/photo-1539533318448-1dbdf1f4d12b?w=400&q=80' },
    { id: '10', name: 'Obsidian Black', img: 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=400&q=80' },
    { id: '11', name: 'Luxury Horizon', img: 'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=400&q=80' },
    { id: '12', name: 'Future Core', img: 'https://images.unsplash.com/photo-1434494878577-86c23049599c?w=400&q=80' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#020205', '#080812', '#0D0D1A']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Watch</Text>
          <Text style={styles.headerSub}>Choose Your Watch</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.previewContainer}>
          <View style={styles.glowCircle} />
          <View style={styles.glowCircleGold} />
          <View style={styles.previewBox}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&q=90' }}
              style={StyleSheet.absoluteFill}
              contentMode="cover"
            />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
            <Text style={styles.previewLabel}>CURRENT WATCH</Text>
          </View>
        </View>

        <View style={styles.gridContainer}>
          {watchList.map((item) => (
            <View key={item.id} style={styles.watchCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.thumbnailContainer}>
                <Image
                  source={{ uri: item.img }}
                  style={styles.thumbnail}
                  contentMode="cover"
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.watchName}>{item.name}</Text>
                <View style={styles.soonBadge}>
                  <Text style={styles.soonText}>COMING SOON</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomActions}>
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)', '#000']} style={styles.bottomGradient} />
        <TouchableOpacity style={styles.applyBtn} disabled activeOpacity={0.7}>
          <LinearGradient
            colors={['rgba(168, 85, 247, 0.3)', 'rgba(255, 215, 0, 0.1)']}
            style={styles.applyBtnInner}
            start={{x:0, y:0}} end={{x:1, y:0}}
          >
            <Text style={styles.applyBtnText}>APPLY WATCH</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, zIndex: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  headerSub: { color: '#666', fontSize: 11, fontWeight: '700', marginTop: 4 },
  content: { flex: 1 },
  previewContainer: { alignItems: 'center', marginTop: 20, marginBottom: 40 },
  glowCircle: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(168, 85, 247, 0.12)', blurRadius: 70 },
  glowCircleGold: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255, 215, 0, 0.05)', blurRadius: 40, top: 10 },
  previewBox: { width: width * 0.5, height: width * 0.5, borderRadius: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.1)', overflow: 'hidden' },
  previewLabel: { position: 'absolute', bottom: 15, color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 2, textShadowColor: '#000', textShadowRadius: 5 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, justifyContent: 'space-between', gap: 20 },
  watchCard: { width: CARD_WIDTH, height: CARD_WIDTH * 1.3, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', padding: 8 },
  thumbnailContainer: { flex: 1, borderRadius: 18, overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%' },
  cardInfo: { marginTop: 12, alignItems: 'center' },
  watchName: { color: '#eee', fontSize: 12, fontWeight: '700' },
  soonBadge: { marginTop: 6, backgroundColor: 'rgba(255, 215, 0, 0.05)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.1)' },
  soonText: { color: '#FFD700', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  bottomActions: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, justifyContent: 'center', paddingHorizontal: 30 },
  bottomGradient: { ...StyleSheet.absoluteFillObject },
  applyBtn: { height: 58, borderRadius: 20, overflow: 'hidden', opacity: 0.6 },
  applyBtnInner: { flex: 1, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  applyBtnText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '900', letterSpacing: 2 }
});
