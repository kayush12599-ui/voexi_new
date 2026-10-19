import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LocalLibraryService, LocalMedia } from '../../lib/localLibraryService';
import { VOEXITheme } from '../../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../hooks/useTheme';

export default function PrivacyVaultScreen() {
  const router = useRouter();
  const { theme: themeMode, isLight } = useTheme();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LocalMedia[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [storedPin, setStoredPin] = useState<string | null>(null);

  useEffect(() => {
    checkPin();
  }, []);

  const checkPin = async () => {
    const p = await AsyncStorage.getItem('@vault_pin');
    setStoredPin(p);
    if (!p) {
      setLoading(false);
    } else {
      setLoading(false);
    }
  };

  const handleAuth = () => {
    if (pin === storedPin) {
      setIsAuthenticated(true);
      loadHiddenItems();
    } else {
      Alert.alert("Error", "Incorrect PIN");
      setPin('');
    }
  };

  const handleSetupPin = async () => {
    if (pin.length < 4) return Alert.alert("Error", "PIN must be at least 4 digits");
    await AsyncStorage.setItem('@vault_pin', pin);
    setStoredPin(pin);
    setIsAuthenticated(true);
    loadHiddenItems();
  };

  const loadHiddenItems = async () => {
    setLoading(true);
    const data = await LocalLibraryService.getLibrary();
    setItems(data.filter(i => i.isHidden));
    setLoading(false);
  };

  const handleUnhide = async (id: string) => {
    await LocalLibraryService.toggleHide(id);
    loadHiddenItems();
    Alert.alert("Restored", "Item moved back to Local Library.");
  };

  const renderItem = ({ item }: { item: LocalMedia }) => (
    <View style={styles.itemCard}>
      <View style={styles.mediaPreview}>
         <Image source={{ uri: item.thumbnail || item.localUri }} style={styles.thumb} />
         <TouchableOpacity style={styles.playBtn} onPress={() => router.push({ pathname: '/menu/local-player', params: { uri: item.localUri, type: item.type } })}>
            <Ionicons name="play" size={20} color="#fff" />
         </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.meta}>{item.type.toUpperCase()} • HIDDEN</Text>
      </View>

      <TouchableOpacity onPress={() => handleUnhide(item.id)} style={styles.unhideBtn}>
         <Ionicons name="eye-outline" size={22} color={VOEXITheme.colors.primary} />
      </TouchableOpacity>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator color={VOEXITheme.colors.primary} /></View>;

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
        <View style={[styles.header, isLight && { borderBottomColor: '#EEE' }]}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={isLight ? '#000' : "#fff"} /></TouchableOpacity>
          <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>SECURE VAULT</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.authBox}>
           <Ionicons name="lock-closed" size={60} color={VOEXITheme.colors.primary} />
           <Text style={[styles.authTitle, isLight && { color: '#000' }]}>{storedPin ? 'Enter Vault PIN' : 'Setup Vault PIN'}</Text>
           <TextInput
             style={[styles.pinInput, isLight && { backgroundColor: '#F5F5F5', color: '#000' }]}
             value={pin}
             onChangeText={setPin}
             keyboardType="numeric"
             secureTextEntry
             placeholder="****"
             placeholderTextColor={isLight ? "#CCC" : "#333"}
             maxLength={6}
           />
           <TouchableOpacity style={styles.actionBtn} onPress={storedPin ? handleAuth : handleSetupPin}>
              <Text style={styles.actionText}>{storedPin ? 'UNLOCK' : 'SET PIN'}</Text>
           </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <View style={[styles.header, isLight && { borderBottomColor: '#EEE' }]}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={isLight ? '#000' : "#fff"} /></TouchableOpacity>
        <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>PRIVACY VAULT</Text>
        <TouchableOpacity onPress={() => setIsAuthenticated(false)}><Ionicons name="lock-open" size={22} color={VOEXITheme.colors.primary} /></TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.itemCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
            <View style={styles.mediaPreview}>
               <Image source={{ uri: item.thumbnail || item.localUri }} style={styles.thumb} />
               <TouchableOpacity style={styles.playBtn} onPress={() => router.push({ pathname: '/menu/local-player', params: { uri: item.localUri, type: item.type } })}>
                  <Ionicons name="play" size={20} color="#fff" />
               </TouchableOpacity>
            </View>

            <View style={styles.info}>
              <Text style={[styles.title, isLight && { color: '#000' }]} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.meta}>{item.type.toUpperCase()} • HIDDEN</Text>
            </View>

            <TouchableOpacity onPress={() => handleUnhide(item.id)} style={styles.unhideBtn}>
               <Ionicons name="eye-outline" size={22} color={VOEXITheme.colors.primary} />
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <View style={styles.center}>
             <Ionicons name="shield-checkmark-outline" size={80} color={isLight ? "#EEE" : "#111"} />
             <Text style={[styles.emptyTitle, isLight && { color: '#000' }]}>Vault is Empty</Text>
             <Text style={styles.sub}>Your private media is safe here.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  authBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  authTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 20 },
  pinInput: { backgroundColor: '#111', width: 200, height: 60, borderRadius: 15, color: '#fff', fontSize: 24, textAlign: 'center', marginTop: 30, letterSpacing: 10 },
  actionBtn: { backgroundColor: VOEXITheme.colors.primary, paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30, marginTop: 30 },
  actionText: { color: '#fff', fontWeight: '900', letterSpacing: 1 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', padding: 12, borderRadius: 18, marginBottom: 15, borderWidth: 1, borderColor: '#1A1A24' },
  mediaPreview: { width: 80, height: 60, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  thumb: { width: '100%', height: '100%' },
  playBtn: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: 15 },
  title: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  meta: { color: '#444', fontSize: 10, marginTop: 4, fontWeight: 'bold' },
  unhideBtn: { padding: 10 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 20 },
  sub: { color: '#444', fontSize: 13, textAlign: 'center', marginTop: 10 }
});
