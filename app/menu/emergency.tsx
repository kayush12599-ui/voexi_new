import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';

export default function SafetyEmergencyHub() {
  const router = useRouter();
  const { theme: themeMode, isLight } = useTheme();

  const initiateSOS = () => {
    Alert.alert(
      "STATION SOS",
      "This will notify Spectrum Command of an immediate safety breach. Confirm?",
      [
        { text: "ABORT", style: "cancel" },
        { text: "CONFIRM SOS", style: "destructive", onPress: () => Alert.alert("SOS DISPATCHED", "Neural emergency signal sent to HQ.") }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <View style={[styles.header, isLight && { borderBottomColor: '#EEE' }]}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={28} color={isLight ? '#000' : "#fff"} /></TouchableOpacity>
        <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>SAFETY CENTER</Text>
        <View style={{width: 28}} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
         <LinearGradient colors={['#ff000022', 'transparent']} style={styles.alertBox}>
            <MaterialCommunityIcons name="shield-alert" size={50} color="#ff0000" />
            <Text style={styles.alertTitle}>STATION INTEGRITY AT RISK?</Text>
            <Text style={styles.alertSub}>Immediate tools for emergency safety protocols.</Text>
         </LinearGradient>

         <View style={styles.actionGrid}>
            <TouchableOpacity style={[styles.actionCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]} onPress={initiateSOS}>
               <View style={[styles.iconBox, {backgroundColor: '#ff0000'}]}><Ionicons name="flashlight" size={30} color="#fff" /></View>
               <Text style={[styles.actionLabel, isLight && { color: '#000' }]}>SOS SIGNAL</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]} onPress={() => router.push('/menu/settings')}>
               <View style={[styles.iconBox, {backgroundColor: '#A855F7'}]}><Ionicons name="lock-closed" size={30} color="#fff" /></View>
               <Text style={[styles.actionLabel, isLight && { color: '#000' }]}>LOCK STATION</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]} onPress={() => router.push('/menu/communities')}>
               <View style={[styles.iconBox, {backgroundColor: '#00F2FE'}]}><Ionicons name="people" size={30} color="#fff" /></View>
               <Text style={[styles.actionLabel, isLight && { color: '#000' }]}>MODERATORS</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]} onPress={() => router.push('/menu/report')}>
               <View style={[styles.iconBox, {backgroundColor: '#FFD700'}]}><Ionicons name="megaphone" size={30} color="#fff" /></View>
               <Text style={[styles.actionLabel, isLight && { color: '#000' }]}>REPORT ABUSE</Text>
            </TouchableOpacity>
         </View>

         <View style={[styles.safetyGuide, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }]}>
            <Text style={styles.guideTitle}>SAFETY PROTOCOLS</Text>
            <View style={styles.guideItem}><Ionicons name="checkmark-circle" size={18} color="#00ff00" /><Text style={[styles.guideText, isLight && { color: '#666' }]}>Keep your Neural Access Key private.</Text></View>
            <View style={styles.guideItem}><Ionicons name="checkmark-circle" size={18} color="#00ff00" /><Text style={[styles.guideText, isLight && { color: '#666' }]}>Use 'Audit Signal' for harmful broadcasts.</Text></View>
            <View style={styles.guideItem}><Ionicons name="checkmark-circle" size={18} color="#00ff00" /><Text style={[styles.guideText, isLight && { color: '#666' }]}>Block disruptive agents immediately.</Text></View>
         </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  content: { padding: 25 },
  alertBox: { padding: 30, borderRadius: 30, alignItems: 'center', borderWidth: 1, borderColor: '#330000', marginBottom: 35 },
  alertTitle: { color: '#ff0000', fontSize: 18, fontWeight: '900', marginTop: 15, letterSpacing: 1 },
  alertSub: { color: '#666', fontSize: 12, marginTop: 8, textAlign: 'center' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'center' },
  actionCard: { width: '45%', backgroundColor: '#080808', padding: 20, borderRadius: 25, alignItems: 'center', borderWidth: 1, borderColor: '#111' },
  iconBox: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  actionLabel: { color: '#eee', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  safetyGuide: { marginTop: 40, padding: 25, backgroundColor: '#050505', borderRadius: 25, borderStyle: 'dashed', borderWidth: 1, borderColor: '#151515' },
  guideTitle: { color: '#333', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 20 },
  guideItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 },
  guideText: { color: '#888', fontSize: 13, fontWeight: '500' }
});
