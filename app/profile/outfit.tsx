import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

export default function OutfitScreen() {
  const router = useRouter();

  const outfits = [
    { id: '1', name: 'Cyber Jacket', img: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80' },
    { id: '2', name: 'Tech Hoodie', img: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80' },
    { id: '3', name: 'Neon Suit', img: 'https://images.unsplash.com/photo-1594932224828-b4b059b8ff0f?w=400&q=80' },
    { id: '4', name: 'Urban Tactical', img: 'https://images.unsplash.com/photo-1516257988835-0525ecf63a52?w=400&q=80' },
    { id: '5', name: 'Royal Robe', img: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&q=80' },
    { id: '6', name: 'Future Street', img: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&q=80' },
    { id: '7', name: 'Void Stealth', img: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&q=80' },
    { id: '8', name: 'Spectral Cape', img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#020205', '#080812', '#0D0D1A']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Outfit</Text>
          <Text style={styles.headerSub}>Choose Your Style</Text>
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
          <View style={styles.previewBox}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&q=90' }}
              style={StyleSheet.absoluteFill}
              contentMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.previewLabel}>CURRENT OUTFIT</Text>
          </View>
        </View>

        <View style={styles.gridContainer}>
          {outfits.map((item) => (
            <View key={item.id} style={styles.outfitCard}>
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
                <Text style={styles.outfitName}>{item.name}</Text>
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
            colors={['rgba(168, 85, 247, 0.3)', 'rgba(79, 70, 229, 0.2)']}
            style={styles.applyBtnInner}
            start={{x:0, y:0}} end={{x:1, y:0}}
          >
            <Text style={styles.applyBtnText}>APPLY OUTFIT</Text>
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
  glowCircle: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(168, 85, 247, 0.12)', blurRadius: 60 },
  previewBox: { width: width * 0.55, height: width * 0.7, borderRadius: 32, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  previewLabel: { position: 'absolute', bottom: 15, color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 2, textShadowColor: '#000', textShadowRadius: 5 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, justifyContent: 'space-between', gap: 20 },
  outfitCard: { width: CARD_WIDTH, height: CARD_WIDTH * 1.4, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', padding: 8 },
  thumbnailContainer: { flex: 1, borderRadius: 18, overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%' },
  cardInfo: { marginTop: 10, alignItems: 'center' },
  outfitName: { color: '#eee', fontSize: 12, fontWeight: '700' },
  soonBadge: { marginTop: 4, backgroundColor: 'rgba(168, 85, 247, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.2)' },
  soonText: { color: '#A855F7', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  bottomActions: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, justifyContent: 'center', paddingHorizontal: 30 },
  bottomGradient: { ...StyleSheet.absoluteFillObject },
  applyBtn: { height: 58, borderRadius: 20, overflow: 'hidden', opacity: 0.6 },
  applyBtnInner: { flex: 1, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  applyBtnText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '900', letterSpacing: 2 }
});
