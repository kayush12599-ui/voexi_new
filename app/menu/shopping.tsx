import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, FlatList, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const CATEGORIES = ['All', 'Card Themes', 'Avatars', 'Editor Assets', 'Music Packs'];

const STORE_ITEMS = [
  { id: '1', name: 'Cyberpunk Theme', category: 'Card Themes', price: 500, img: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=400', color: '#00F2FE' },
  { id: '2', name: 'Golden ID Frame', category: 'Card Themes', price: 1200, img: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400', color: '#FFD700' },
  { id: '3', name: 'Neon Glitch Pack', category: 'Editor Assets', price: 350, img: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=400', color: '#FF0080' },
  { id: '4', name: 'VOEXI Pro Avatar', category: 'Avatars', price: 99, img: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400', color: '#A855F7' },
  { id: '5', name: 'EDM Master Collection', category: 'Music Packs', price: 800, img: 'https://images.unsplash.com/photo-1514525253361-bee8718a74a2?w=400', color: '#00C851' },
];

export default function ShoppingScreen() {
  const router = useRouter();

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.itemCard}>
       <Image source={{ uri: item.img }} style={styles.itemImage} />
       <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemCat}>{item.category}</Text>
          <View style={styles.priceRow}>
             <MaterialCommunityIcons name="database" size={14} color="#FFD700" />
             <Text style={styles.priceText}>{item.price}</Text>
          </View>
       </View>
       <TouchableOpacity style={[styles.buyBtn, { backgroundColor: item.color }]}>
          <Ionicons name="cart-outline" size={18} color="#fff" />
       </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>VX STORE</Text>
        <TouchableOpacity style={styles.coinBalance} onPress={() => router.push('/menu/wallet')}>
           <MaterialCommunityIcons name="database" size={16} color="#FFD700" />
           <Text style={styles.balanceText}>2,450</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.catContainer}>
         <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {CATEGORIES.map((cat, idx) => (
              <TouchableOpacity key={idx} style={[styles.catChip, idx === 0 && styles.catActive]}>
                 <Text style={[styles.catText, idx === 0 && { color: '#fff' }]}>{cat}</Text>
              </TouchableOpacity>
            ))}
         </ScrollView>
      </View>

      <FlatList
        data={STORE_ITEMS}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 20 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  coinBalance: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  balanceText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  catContainer: { marginVertical: 10 },
  catChip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#080808', marginRight: 10, borderWidth: 1, borderColor: '#111' },
  catActive: { backgroundColor: VOEXITheme.colors.primary, borderColor: VOEXITheme.colors.primary },
  catText: { color: '#555', fontSize: 11, fontWeight: 'bold' },
  list: { paddingBottom: 40, paddingTop: 10 },
  itemCard: { width: (width - 55) / 2, backgroundColor: '#0A0A0A', borderRadius: 20, marginBottom: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#111' },
  itemImage: { width: '100%', height: 120, backgroundColor: '#111' },
  itemInfo: { padding: 12 },
  itemName: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  itemCat: { color: '#444', fontSize: 10, marginTop: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  priceText: { color: '#FFD700', fontSize: 12, fontWeight: 'bold' },
  buyBtn: { position: 'absolute', bottom: 10, right: 10, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }
});
