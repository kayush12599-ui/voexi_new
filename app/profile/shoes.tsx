import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

export default function ShoesScreen() {
  const router = useRouter();

  const shoesList = [
    { id: '1', name: 'Neon Runners', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80' },
    { id: '2', name: 'Cyber Boots', img: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80' },
    { id: '3', name: 'Electric Highs', img: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&q=80' },
    { id: '4', name: 'Void Stealth', img: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&q=80' },
    { id: '5', name: 'Royal Soles', img: 'https://images.unsplash.com/photo-1533681018184-68bd1d8f39fe?w=400&q=80' },
    { id: '6', name: 'Phantom Kicks', img: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&q=80' },
    { id: '7', name: 'Spectrum Lows', img: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=400&q=80' },
    { id: '8', name: 'Aura Spikes', img: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=80' },
    { id: '9', name: 'Binary Flats', img: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80' },
    { id: '10', name: 'Pulse Mids', img: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&q=80' },
    { id: '11', name: 'Glitch Platforms', img: 'https://images.unsplash.com/photo-1520639889456-1215b8277114?w=400&q=80' },
    { id: '12', name: 'Zen Sandals', img: 'https://images.unsplash.com/photo-1603487759388-7e337e21d67a?w=400&q=80' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#020205', '#080812', '#0D0D1A']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Shoes</Text>
          <Text style={styles.headerSub}>Choose Your Shoes</Text>
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
              source={{ uri: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=90' }}
              style={StyleSheet.absoluteFill}
              contentMode="cover"
            />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
            <Text style={styles.previewLabel}>CURRENT SHOES</Text>
          </View>
        </View>

        <View style={styles.gridContainer}>
          {shoesList.map((item) => (
            <View key={item.id} style={styles.shoesCard}>
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
                <Text style={styles.shoesName}>{item.name}</Text>
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
            <Text style={styles.applyBtnText}>APPLY SHOES</Text>
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
  glowCircle: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(168, 85, 247, 0.1)', blurRadius: 60 },
  glowCircleGold: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255, 215, 0, 0.05)', blurRadius: 40, top: 20 },
  previewBox: { width: width * 0.5, height: width * 0.5, borderRadius: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.1)', overflow: 'hidden' },
  previewLabel: { position: 'absolute', bottom: 15, color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 2, textShadowColor: '#000', textShadowRadius: 5 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, justifyContent: 'space-between', gap: 20 },
  shoesCard: { width: CARD_WIDTH, height: CARD_WIDTH * 1.3, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', padding: 8 },
  thumbnailContainer: { flex: 1, borderRadius: 18, overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%' },
  cardInfo: { marginTop: 12, alignItems: 'center' },
  shoesName: { color: '#eee', fontSize: 12, fontWeight: '700' },
  soonBadge: { marginTop: 6, backgroundColor: 'rgba(255, 215, 0, 0.05)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.1)' },
  soonText: { color: '#FFD700', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  bottomActions: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, justifyContent: 'center', paddingHorizontal: 30 },
  bottomGradient: { ...StyleSheet.absoluteFillObject },
  applyBtn: { height: 58, borderRadius: 20, overflow: 'hidden', opacity: 0.6 },
  applyBtnInner: { flex: 1, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  applyBtnText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '900', letterSpacing: 2 }
});
