import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VoexiIcon } from '../components/VoexiIcon';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

const { width, height } = Dimensions.get('window');

export default function BrandingScreen() {
  const router = useRouter();
  const { isLight } = useTheme();

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <StatusBar barStyle={isLight ? "dark-content" : "light-content"} />
      <LinearGradient colors={isLight ? ['#fff', '#f9f9f9', '#fff'] : ['#000', '#0a0a0a', '#000']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, isLight && { backgroundColor: '#F5F5F5' }]}>
          <Ionicons name="close" size={28} color={isLight ? '#000' : '#fff'} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={[styles.brandTitle, isLight && { color: '#000' }]}>VOEXI</Text>
        <Text style={styles.brandSubtitle}>OFFICIAL BRAND IDENTITY</Text>

        <View style={styles.logoContainer}>
          <View style={styles.glowBg} />
          <VoexiIcon size={280} />
        </View>

        <View style={styles.specsContainer}>
          <View style={styles.specRow}>
            <View style={[styles.dot, { backgroundColor: '#FF0080' }]} />
            <Text style={styles.specText}>NEON MAGENTA (0% - 1024px)</Text>
          </View>
          <View style={styles.specRow}>
            <View style={[styles.dot, { backgroundColor: '#7928CA' }]} />
            <Text style={styles.specText}>DEEP PURPLE (FOLDING CORE)</Text>
          </View>
          <View style={styles.specRow}>
            <View style={[styles.dot, { backgroundColor: '#00F2FE' }]} />
            <Text style={styles.specText}>CYAN BLUE (TRANSITION END)</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.applyBtn, isLight && { backgroundColor: '#000' }]} onPress={() => router.replace('/')}>
          <Text style={[styles.applyText, isLight && { color: '#fff' }]}>ENTER PLATFORM</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { padding: 20, alignItems: 'flex-end' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 50 },
  brandTitle: { color: '#fff', fontSize: 42, fontWeight: '900', letterSpacing: 15, marginBottom: 5 },
  brandSubtitle: { color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 60 },
  logoContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  glowBg: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#FF0080', opacity: 0.15, filter: 'blur(60px)' as any },
  specsContainer: { marginTop: 80, gap: 15 },
  specRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  specText: { color: '#666', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  applyBtn: { marginTop: 80, backgroundColor: '#fff', paddingHorizontal: 40, paddingVertical: 18, borderRadius: 15 },
  applyText: { color: '#000', fontWeight: '900', fontSize: 12, letterSpacing: 2 }
});
