import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Dimensions, StatusBar, Animated, PanResponder, Modal, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { VOEXITheme } from '../constants/theme';
import { AIService } from '../lib/aiService';
import PostCard from '../components/PostCard';

const { width, height } = Dimensions.get('window');

const TRENDING_CHIPS = ['Phonk', 'Cyberpunk', 'Neural Art', 'Gaming', 'Tech'];

export default function SearchPortal() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Signals' | 'Stations'>('Signals');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // MODES
  const [isDrawing, setIsDrawing] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [lines, setLines] = useState<any[]>([]);

  // ANIMATIONS
  const glowAnim = useRef(new Animated.Value(0)).current;
  const voiceScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id || null));

    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) { setResults([]); return; }

    setLoading(true);
    try {
      const { data } = await supabase
        .from('posts')
        .select('*, profiles:profiles!posts_user_id_fkey(*), audio_owner:audio_owner_id(*)')
        .ilike('title', `%${text}%`)
        .limit(20);
      setResults(data || []);
    } finally {
      setLoading(false);
    }
  };

  const startVoiceSearch = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsVoiceActive(true);
    Animated.loop(
      Animated.sequence([
        Animated.timing(voiceScale, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(voiceScale, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    setTimeout(() => {
       setIsVoiceActive(false);
       handleSearch("Neural Frequency");
    }, 3000);
  };

  const handleVisionSearch = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5, base64: true });
    if (!result.canceled && result.assets[0].base64) {
      setLoading(true);
      const keywords = await AIService.analyzeImage(result.assets[0].base64);
      if (keywords) handleSearch(keywords);
      else setLoading(false);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gs) => {
        const { locationX, locationY } = e.nativeEvent;
        // Strict boundary check
        if (locationX > 0 && locationX < width - 60 && locationY > 0 && locationY < 230) {
          setLines(prev => [...prev, { x: locationX, y: locationY }]);
        }
      },
    })
  ).current;

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1A1A24', VOEXITheme.colors.primary]
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#000', '#050510']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* THE VAN BANNER: PSYCHOLOGICAL SALIENCE */}
        <Pressable
          onPress={() => handleSearch('trending')}
          style={styles.vanContainer}
        >
          <Animated.View style={[styles.vanInner, { borderColor: borderColor }]}>
             <View>
                <Text style={styles.vanTitle}>NEURAL NETWORK ACTIVE</Text>
                <Text style={styles.vanSubtitle}>SYNC WITH GLOBAL TRENDS</Text>
             </View>
             <MaterialCommunityIcons name="molecule" size={26} color={VOEXITheme.colors.secondary} />
          </Animated.View>
        </Pressable>

        <View style={styles.header}>
           <TouchableOpacity onPress={() => router.back()} style={styles.backCircle}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
           </TouchableOpacity>
           <Text style={styles.portalTitle}>NEURAL PORTAL</Text>
           <View style={{width: 44}} />
        </View>

        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
           {/* ADVANCED SEARCH CONSOLE */}
           <View style={styles.searchSection}>
              <Animated.View style={[styles.searchBar, { borderColor }]}>
                 <Ionicons name="search" size={20} color={VOEXITheme.colors.primary} />
                 <TextInput
                   style={styles.input}
                   placeholder="Discover the spectrum..."
                   placeholderTextColor="#444"
                   value={searchQuery}
                   onChangeText={handleSearch}
                   selectionColor={VOEXITheme.colors.primary}
                 />
                 <View style={styles.toolRow}>
                    <TouchableOpacity onPress={handleVisionSearch} style={styles.toolBtn}>
                       <Ionicons name="camera" size={22} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={startVoiceSearch} style={[styles.toolBtn, {backgroundColor: 'rgba(0, 242, 254, 0.1)'}]}>
                       <Ionicons name="mic" size={22} color={VOEXITheme.colors.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsDrawing(!isDrawing)} style={[styles.toolBtn, isDrawing && {backgroundColor: 'rgba(168, 85, 247, 0.1)'}]}>
                       <Ionicons name="pencil" size={20} color={isDrawing ? VOEXITheme.colors.primary : "#fff"} />
                    </TouchableOpacity>
                 </View>
              </Animated.View>
           </View>

           {/* DRAW PAD: CLIPPED & STABLE */}
           {isDrawing && (
             <View style={styles.drawSection}>
                <View style={styles.canvasContainer}>
                   <View style={styles.canvasHeader}>
                      <Text style={styles.canvasTitle}>NEURAL SKETCH</Text>
                      <TouchableOpacity onPress={() => setLines([])}><Text style={styles.clearText}>RESET</Text></TouchableOpacity>
                   </View>
                   <View style={styles.canvas} {...panResponder.panHandlers}>
                      {lines.map((p, i) => (
                        <View key={i} pointerEvents="none" style={[styles.point, { left: p.x - 2, top: p.y - 2 }]} />
                      ))}
                      {lines.length === 0 && <Text style={styles.canvasHint}>Trace a signal concept...</Text>}
                   </View>
                </View>
                <TouchableOpacity style={styles.submitDraw} onPress={() => { setIsDrawing(false); setLines([]); handleSearch("Art"); }}>
                   <LinearGradient colors={[VOEXITheme.colors.primary, '#6d28d9']} style={styles.drawSubmitBtn}>
                      <Text style={styles.drawSubmitText}>ANALYZE SKETCH</Text>
                   </LinearGradient>
                </TouchableOpacity>
             </View>
           )}

           <FlatList
             data={results}
             keyExtractor={item => item.id}
             renderItem={({ item }) => <PostCard item={item} currentUserId={userId} />}
             contentContainerStyle={styles.listContent}
             ListHeaderComponent={!searchQuery && !isDrawing && (
                <View style={styles.trendingContainer}>
                   <Text style={styles.sectionLabel}>RISING FREQUENCIES</Text>
                   <View style={styles.chipCloud}>
                      {TRENDING_CHIPS.map(tag => (
                        <TouchableOpacity key={tag} style={styles.chip} onPress={() => handleSearch(tag)}>
                           <Text style={styles.chipText}>#{tag.toUpperCase()}</Text>
                        </TouchableOpacity>
                      ))}
                   </View>
                </View>
             )}
           />
        </Animated.View>
      </SafeAreaView>

      {/* IMMERSIVE VOICE MODAL */}
      <Modal visible={isVoiceActive} transparent animationType="fade">
         <View style={styles.voiceOverlay}>
            <View style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.9)'}]} />
            <Animated.View style={[styles.voiceCircle, { transform: [{ scale: voiceScale }] }]}>
               <Ionicons name="mic" size={50} color={VOEXITheme.colors.primary} />
            </Animated.View>
            <Text style={styles.voiceTitle}>LISTENING</Text>
            <Text style={styles.voiceSubtitle}>Speak your thought to the core</Text>
            <TouchableOpacity style={styles.cancelVoice} onPress={() => setIsVoiceActive(false)}>
               <Text style={styles.cancelVoiceText}>DISCONNECT</Text>
            </TouchableOpacity>
         </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  vanContainer: { paddingHorizontal: 20, marginTop: 10, marginBottom: 10 },
  vanInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, borderWidth: 1 },
  vanTitle: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  vanSubtitle: { color: '#444', fontSize: 8, fontWeight: '900', marginTop: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  backCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  portalTitle: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 4, opacity: 0.6 },
  searchSection: { paddingHorizontal: 20, marginBottom: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0A0F', borderRadius: 22, height: 64, paddingHorizontal: 20, borderWidth: 1 },
  input: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 15 },
  toolRow: { flexDirection: 'row', gap: 10 },
  toolBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },

  drawSection: { paddingHorizontal: 20, marginBottom: 20 },
  canvasContainer: { height: 250, backgroundColor: '#050508', borderRadius: 25, borderWidth: 1, borderColor: '#1A1A24', overflow: 'hidden' },
  canvasHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, zIndex: 10 },
  canvasTitle: { color: '#222', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  clearText: { color: VOEXITheme.colors.primary, fontSize: 10, fontWeight: '900' },
  canvas: { flex: 1 },
  point: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: VOEXITheme.colors.primary },
  canvasHint: { position: 'absolute', top: '45%', alignSelf: 'center', color: '#111', fontSize: 12, fontWeight: 'bold' },
  submitDraw: { marginTop: 15, borderRadius: 18, overflow: 'hidden' },
  drawSubmitBtn: { padding: 18, alignItems: 'center' },
  drawSubmitText: { color: '#fff', fontWeight: '900', fontSize: 12 },

  listContent: { paddingBottom: 100 },
  trendingContainer: { paddingHorizontal: 25, marginTop: 10 },
  sectionLabel: { color: '#222', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
  chipCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 15, borderWidth: 1, borderColor: '#1A1A24' },
  chipText: { color: '#888', fontSize: 12, fontWeight: 'bold' },

  voiceOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  voiceCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(168, 85, 247, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(168, 85, 247, 0.3)' },
  voiceTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 30, letterSpacing: 5 },
  voiceSubtitle: { color: '#666', fontSize: 12, marginTop: 10, fontWeight: 'bold' },
  cancelVoice: { marginTop: 60, padding: 20 },
  cancelVoiceText: { color: '#444', fontSize: 12, fontWeight: '900', letterSpacing: 2 }
});
