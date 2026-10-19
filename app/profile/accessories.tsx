import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

export default function AccessoriesScreen() {
  const router = useRouter();

  const accessoriesList = [
    { id: '1', name: 'Neural Lens', img: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80' },
    { id: '2', name: 'Spectral Cap', img: 'https://images.unsplash.com/photo-1588850567047-380d7d6bba0b?w=400&q=80' },
    { id: '3', name: 'Cyber Necklace', img: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80' },
    { id: '4', name: 'Electric Earrings', img: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&q=80' },
    { id: '5', name: 'Quantum Ring', img: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80' },
    { id: '6', name: 'Void Bracelet', img: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80' },
    { id: '7', name: 'Spectrum Watch', img: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&q=80' },
    { id: '8', name: 'Nexus Backpack', img: 'https://images.unsplash.com/photo-1553062407-98eebd4c7a6d?w=400&q=80' },
    { id: '9', name: 'Ghost Mask', img: 'https://images.unsplash.com/photo-1554188248-986adbb73be4?w=400&q=80' },
    { id: '10', name: 'Shoulder Aura', img: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=400&q=80' },
    { id: '11', name: 'Digital Wings', img: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80' },
    { id: '12', name: 'Legacy Badge', img: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&q=80' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#020205', '#080812', '#0D0D1A']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Accessories</Text>
          <Text style={styles.headerSub}>Choose Your Accessories</Text>
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
              source={{ uri: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&q=90' }}
              style={StyleSheet.absoluteFill}
              contentMode="cover"
            />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
            <Text style={styles.previewLabel}>CURRENT ACCESSORIES</Text>
          </View>
        </View>

        <View style={styles.gridContainer}>
          {accessoriesList.map((item) => (
            <View key={item.id} style={styles.accCard}>
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
                <Text style={styles.accName}>{item.name}</Text>
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
            <Text style={styles.applyBtnText}>APPLY ACCESSORIES</Text>
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
  accCard: { width: CARD_WIDTH, height: CARD_WIDTH * 1.3, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', padding: 8 },
  thumbnailContainer: { flex: 1, borderRadius: 18, overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%' },
  cardInfo: { marginTop: 12, alignItems: 'center' },
  accName: { color: '#eee', fontSize: 12, fontWeight: '700' },
  soonBadge: { marginTop: 6, backgroundColor: 'rgba(255, 215, 0, 0.05)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.1)' },
  soonText: { color: '#FFD700', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  bottomActions: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, justifyContent: 'center', paddingHorizontal: 30 },
  bottomGradient: { ...StyleSheet.absoluteFillObject },
  applyBtn: { height: 58, borderRadius: 20, overflow: 'hidden', opacity: 0.6 },
  applyBtnInner: { flex: 1, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  applyBtnText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '900', letterSpacing: 2 }
});
