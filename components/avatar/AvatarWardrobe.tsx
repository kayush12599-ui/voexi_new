import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export interface WardrobeItem {
  id: string;
  name: string;
  category: string;
  color: string;
  price: string;
  img: string;
  locked?: boolean;
}

export interface BundleItem {
  id: string;
  name: string;
  topColor: string;
  bottomColor: string;
  price: string;
  glowColor: string;
}

export interface AvatarWardrobeProps {
  gender: 'Male' | 'Female';
  activeCategory: string;
  selectedItemId: string;
  onSelectCategory: (cat: string) => void;
  onSelectItem: (item: WardrobeItem) => void;
  onSelectBundle: (bundle: BundleItem) => void;
}

const CATEGORIES = [
  { name: 'Outfit', icon: 'tshirt-crew' },
  { name: 'Top', icon: 'tshirt-crew' },
  { name: 'Bottom', icon: 'hanger' },
  { name: 'Shoes', icon: 'shoe-sneaker' },
  { name: 'Hair', icon: 'face-man' },
  { name: 'Accessories', icon: 'watch' },
  { name: 'Bundles', icon: 'package-variant-closed' },
];

const BUNDLES: BundleItem[] = [
  { id: 'street', name: 'VOEXI Street Bundle', topColor: '#A855F7', bottomColor: '#1E1B4B', price: '2,499', glowColor: '#A855F7' },
  { id: 'royal', name: 'VOEXI Royal Gold', topColor: '#EAB308', bottomColor: '#09090B', price: '3,200', glowColor: '#EAB308' },
  { id: 'cyber', name: 'VOEXI Cyber Neon', topColor: '#00F2FE', bottomColor: '#030712', price: '2,800', glowColor: '#00F2FE' },
  { id: 'casual', name: 'VOEXI Casual White', topColor: '#FFFFFF', bottomColor: '#3F3F46', price: '1,800', glowColor: '#A1A1AA' },
];

export function AvatarWardrobe({
  gender,
  activeCategory,
  selectedItemId,
  onSelectCategory,
  onSelectItem,
  onSelectBundle
}: AvatarWardrobeProps) {
  const [selectedBundleId, setSelectedBundleId] = useState<string>('street');

  const maleItems: WardrobeItem[] = [
    { id: '1', name: 'VOEXI Cyber Suit', category: 'Outfit', price: '1,299', color: '#A855F7', img: 'https://images.unsplash.com/photo-1620331311520-246422ff82ff?w=400' },
    { id: '2', name: 'Crimson Tech Jacket', category: 'Top', price: '1,294', color: '#EF4444', img: 'https://images.unsplash.com/photo-1620331311520-246422ff82ff?w=400&color=red' },
    { id: '3', name: 'Royal Gold Hoodie', category: 'Top', price: '1,299', color: '#FBBF24', img: 'https://images.unsplash.com/photo-1620331311520-246422ff82ff?w=400&color=yellow' },
    { id: '4', name: 'Neon Blue Joggers', category: 'Bottom', price: '1,299', color: '#3B82F6', img: 'https://images.unsplash.com/photo-1620331311520-246422ff82ff?w=400&color=blue' },
    { id: '5', name: 'White Cyber Kicks', category: 'Shoes', price: '1,299', color: '#FFFFFF', img: 'https://images.unsplash.com/photo-1620331311520-246422ff82ff?w=400&color=white' },
    { id: '6', name: 'Emerald Mask', category: 'Accessories', price: '1,599', color: '#22C55E', img: 'https://images.unsplash.com/photo-1620331311520-246422ff82ff?w=400', locked: true },
  ];

  const femaleItems: WardrobeItem[] = [
    { id: 'f1', name: 'VOEXI Cyber Dress', category: 'Outfit', price: '1,299', color: '#EC4899', img: 'https://images.unsplash.com/photo-1605218403317-6e5ce01952ee?w=400' },
    { id: 'f2', name: 'Crimson Crop Top', category: 'Top', price: '1,294', color: '#EF4444', img: 'https://images.unsplash.com/photo-1605218403317-6e5ce01952ee?w=400&color=red' },
    { id: 'f3', name: 'Gold Tech Skirt', category: 'Bottom', price: '1,299', color: '#FBBF24', img: 'https://images.unsplash.com/photo-1605218403317-6e5ce01952ee?w=400&color=yellow' },
    { id: 'f4', name: 'Cyber Heels', category: 'Shoes', price: '1,299', color: '#3B82F6', img: 'https://images.unsplash.com/photo-1605218403317-6e5ce01952ee?w=400&color=blue' },
  ];

  const currentItems = gender === 'Male' ? maleItems : femaleItems;

  return (
    <View style={styles.wardrobeContainer}>
      <Text style={styles.sectionTitle}>CUSTOMIZE WARDROBE</Text>

      {/* CATEGORY TABS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.name}
            style={styles.categoryItem}
            onPress={() => onSelectCategory(cat.name)}
          >
            <View style={[styles.categoryIconBox, activeCategory === cat.name && styles.activeCategoryBox]}>
              <MaterialCommunityIcons
                name={cat.icon as any}
                size={20}
                color={activeCategory === cat.name ? '#FFFFFF' : '#71717A'}
              />
            </View>
            <Text style={[styles.categoryText, activeCategory === cat.name && { color: '#FFFFFF' }]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* BUNDLES OR ITEMS GRID */}
      {activeCategory === 'Bundles' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bundleList}>
          {BUNDLES.map(b => (
            <TouchableOpacity
              key={b.id}
              style={[styles.bundleCard, selectedBundleId === b.id && { borderColor: b.glowColor }]}
              onPress={() => {
                setSelectedBundleId(b.id);
                onSelectBundle(b);
              }}
            >
              <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
              <View style={[styles.bundleGlowBadge, { backgroundColor: b.glowColor }]} />
              <Text style={styles.bundleTitle}>{b.name}</Text>
              <View style={styles.bundlePriceRow}>
                <FontAwesome5 name="gem" size={10} color="#00F2FE" />
                <Text style={styles.bundlePriceText}>{b.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.itemsGrid}>
          {currentItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.itemCard, selectedItemId === item.id && styles.selectedCard]}
              onPress={() => !item.locked && onSelectItem(item)}
            >
              <View style={styles.itemImageContainer}>
                <Image
                  source={{ uri: item.img }}
                  style={[styles.itemImage, item.locked && { opacity: 0.3 }]}
                  contentMode="contain"
                />
                <View style={[styles.colorOverlay, { backgroundColor: item.color, opacity: 0.2 }]} />
              </View>

              {selectedItemId === item.id && (
                <View style={styles.selectedTick}>
                  <View style={styles.tickCircle}>
                    <Ionicons name="flash" size={8} color="#FFFFFF" />
                  </View>
                </View>
              )}

              {item.locked && (
                <View style={styles.lockOverlay}>
                  <Ionicons name="lock-closed" size={10} color="#FFFFFF" />
                </View>
              )}

              <View style={styles.priceContainer}>
                <FontAwesome5 name="gem" size={8} color="#00F2FE" />
                <Text style={styles.priceValue}>{item.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wardrobeContainer: {
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#05050A'
  },
  sectionTitle: {
    color: '#A855F7',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    paddingHorizontal: 15,
    marginBottom: 12
  },
  categoryScroll: {
    marginBottom: 16,
    paddingHorizontal: 12
  },
  categoryItem: {
    alignItems: 'center',
    gap: 6,
    marginRight: 20
  },
  categoryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  activeCategoryBox: {
    backgroundColor: '#A855F7',
    borderColor: '#C084FC'
  },
  categoryText: {
    color: '#71717A',
    fontSize: 9,
    fontWeight: '900'
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10
  },
  itemCard: {
    width: (width - 60) / 5,
    height: 95,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    padding: 4,
    position: 'relative'
  },
  selectedCard: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168, 85, 247, 0.12)'
  },
  selectedTick: {
    position: 'absolute',
    top: 4,
    left: 4,
    zIndex: 10
  },
  tickCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#A855F7',
    justifyContent: 'center',
    alignItems: 'center'
  },
  itemImageContainer: {
    width: '100%',
    height: '68%',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  itemImage: {
    width: '88%',
    height: '88%'
  },
  colorOverlay: {
    ...StyleSheet.absoluteFillObject
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 4
  },
  priceValue: {
    color: '#EEEEEE',
    fontSize: 8,
    fontWeight: '800'
  },
  lockOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  bundleList: {
    paddingHorizontal: 15,
    gap: 12
  },
  bundleCard: {
    width: 150,
    height: 80,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    padding: 12,
    justifyContent: 'space-between',
    position: 'relative'
  },
  bundleGlowBadge: {
    width: 24,
    height: 3,
    borderRadius: 2
  },
  bundleTitle: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900'
  },
  bundlePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  bundlePriceText: {
    color: '#00F2FE',
    fontSize: 10,
    fontWeight: '900'
  }
});
