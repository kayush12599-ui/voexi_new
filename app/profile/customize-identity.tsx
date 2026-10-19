import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function IdentityCustomizationScreen() {
  const router = useRouter();

  const CustomCategoryCard = ({ img, label, route }: { img: string, label: string, route?: string }) => {
    const [showSoon, setShowSoon] = useState(false);

    const handlePress = () => {
      if (route) {
        console.log("Navigating to:", route);
        router.push(route as any);
      } else {
        console.log("Coming Soon tapped");
        setShowSoon(true);
        setTimeout(() => setShowSoon(false), 2000);
      }
    };

    return (
      <TouchableOpacity
        style={styles.categoryCard}
        activeOpacity={0.8}
        onPress={handlePress}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.cardLeft}>
          <View style={styles.categoryImageBox}>
            <Image
              source={{ uri: img }}
              style={styles.categoryImage}
              contentMode="cover"
            />
          </View>
          <Text style={styles.categoryLabel}>{label}</Text>
        </View>

        {showSoon ? (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>COMING SOON</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#020205', '#080812', '#0D0D1A']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Identity Customization</Text>
          <Text style={styles.headerSub}>Choose your personal style</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <TouchableOpacity
          style={styles.previewContainer}
          activeOpacity={0.9}
          onPress={() => router.push('/profile/card-studio')}
        >
          <View style={styles.glowCircle} />
          <View style={styles.stagePlatform}>
            <LinearGradient colors={['#1A1A2E', '#05050A']} style={StyleSheet.absoluteFill} />
          </View>
          <View style={styles.avatarPlaceholder}>
             <Image
               source={{ uri: 'https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=800&q=80' }}
               style={StyleSheet.absoluteFill}
               contentMode="contain"
             />
             <View style={[styles.techDot, { top: '20%', right: '20%', backgroundColor: '#FFD700' }]} />
             <View style={[styles.techDot, { bottom: '30%', left: '10%', backgroundColor: '#00F2FE' }]} />
          </View>
          <Text style={styles.previewLabel}>TAP TO EDIT VX IDENTITY CARD</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CUSTOMIZATION CATEGORIES</Text>
          <View style={styles.categoriesGrid}>
            <CustomCategoryCard img="https://images.unsplash.com/photo-1620331311520-246422ff82ff?w=200" label="VX Identity Card Studio" route="/profile/card-studio" />
            <CustomCategoryCard img="https://images.unsplash.com/photo-1551028719-00167b16eac5?w=200" label="Outfit" route="/profile/outfit" />
            <CustomCategoryCard img="https://images.unsplash.com/photo-1592647420148-bfcc175e1599?w=200" label="Hair" route="/profile/hair" />
            <CustomCategoryCard img="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200" label="Shoes" route="/profile/shoes" />
            <CustomCategoryCard img="https://images.unsplash.com/photo-1590483734732-23961f623e59?w=200" label="Mask" route="/profile/mask" />
            <CustomCategoryCard img="https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200" label="Accessories" route="/profile/accessories" />
            <CustomCategoryCard img="https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200" label="Watch" route="/profile/watch" />
            <CustomCategoryCard img="https://images.unsplash.com/photo-1553062407-98eebd4c7a6d?w=200" label="Backpack" route="/profile/backpack" />
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomActions} pointerEvents="box-none">
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)', '#000']}
          style={styles.bottomGradient}
          pointerEvents="none"
        />
        <TouchableOpacity style={styles.saveBtn} disabled activeOpacity={0.7}>
          <LinearGradient
            colors={['rgba(168, 85, 247, 0.3)', 'rgba(79, 70, 229, 0.2)']}
            style={styles.saveBtnInner}
            start={{x:0, y:0}} end={{x:1, y:0}}
          >
            <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
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
  previewContainer: { height: SCREEN_HEIGHT * 0.35, justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 30 },
  glowCircle: { position: 'absolute', width: width * 0.7, height: width * 0.7, borderRadius: width, backgroundColor: 'rgba(168, 85, 247, 0.04)' },
  stagePlatform: { position: 'absolute', bottom: '15%', width: width * 0.5, height: 20, borderRadius: 100, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', opacity: 0.5 },
  avatarPlaceholder: { width: width * 0.6, height: width * 0.6, justifyContent: 'center', alignItems: 'center' },
  techDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, shadowColor: '#fff', shadowRadius: 10, shadowOpacity: 1, elevation: 5 },
  previewLabel: { position: 'absolute', bottom: 0, color: '#333', fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  section: { paddingHorizontal: 25 },
  sectionTitle: { color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 20 },
  categoriesGrid: { gap: 15 },
  categoryCard: { height: 72, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  categoryImageBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#111', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  categoryImage: { width: '100%', height: '100%' },
  categoryLabel: { color: '#eee', fontSize: 16, fontWeight: '700' },
  comingSoonBadge: { backgroundColor: 'rgba(168, 85, 247, 0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)' },
  comingSoonText: { color: '#A855F7', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  bottomActions: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, justifyContent: 'center', paddingHorizontal: 30 },
  bottomGradient: { ...StyleSheet.absoluteFillObject },
  saveBtn: { height: 58, borderRadius: 20, overflow: 'hidden', opacity: 0.6 },
  saveBtnInner: { flex: 1, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  saveBtnText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '900', letterSpacing: 2 }
});
