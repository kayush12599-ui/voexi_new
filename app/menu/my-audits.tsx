import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';

export default function MyAuditsScreen() {
  const router = useRouter();
  const { theme: themeMode, isLight } = useTheme();
  const [loading, setLoading] = useState(true);
  const [audits, setAudits] = useState<any[]>([]);

  useEffect(() => { fetchMyAudits(); }, []);

  const fetchMyAudits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('signal_audits')
        .select('*, target:profiles!target_user_id(username, avatar_url)')
        .eq('initiator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAudits(data || []);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderAuditItem = ({ item }: { item: any }) => (
    <View style={styles.auditCard}>
       <View style={styles.cardHeader}>
          <Text style={styles.category}>{item.anomaly_category.toUpperCase()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.audit_status) }]}>
             <Text style={styles.statusText}>{item.audit_status.toUpperCase()}</Text>
          </View>
       </View>

       <View style={styles.targetRow}>
          <Image source={{ uri: item.target?.avatar_url || 'https://via.placeholder.com/40' }} style={styles.avatar} />
          <View>
             <Text style={styles.targetName}>Target: @{item.target?.username}</Text>
             <Text style={styles.signalType}>Signal: {item.signal_type.toUpperCase()}</Text>
          </View>
       </View>

       <Text style={styles.log} numberOfLines={2}>"{item.neural_log}"</Text>
       <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString()}</Text>
    </View>
  );

  const getStatusColor = (s: string) => {
    switch(s) {
      case 'resolved': return '#00ff00';
      case 'detecting': return '#00f2fe';
      case 'dismissed': return '#666';
      default: return '#ffd700';
    }
  };

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <View style={[styles.header, isLight && { borderBottomColor: '#EEE' }]}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={28} color={isLight ? '#000' : "#fff"} /></TouchableOpacity>
        <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>AUDIT TELEMETRY</Text>
        <TouchableOpacity onPress={fetchMyAudits}><Ionicons name="sync" size={20} color={isLight ? '#000' : "#fff"} /></TouchableOpacity>
      </View>

      <View style={styles.introBox}>
         <Text style={[styles.introTitle, isLight && { color: '#000' }]}>Your Active Audits</Text>
         <Text style={styles.introSub}>Tracking deviations you reported in the spectrum.</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={VOEXITheme.colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={audits}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[styles.auditCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
               <View style={styles.cardHeader}>
                  <Text style={[styles.category, isLight && { color: '#999' }]}>{item.anomaly_category.toUpperCase()}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.audit_status) }]}>
                     <Text style={styles.statusText}>{item.audit_status.toUpperCase()}</Text>
                  </View>
               </View>

               <View style={styles.targetRow}>
                  <Image source={{ uri: item.target?.avatar_url || 'https://via.placeholder.com/40' }} style={styles.avatar} />
                  <View>
                     <Text style={[styles.targetName, isLight && { color: '#000' }]}>Target: @{item.target?.username}</Text>
                     <Text style={styles.signalType}>Signal: {item.signal_type.toUpperCase()}</Text>
                  </View>
               </View>

               <Text style={[styles.log, isLight && { color: '#666' }]} numberOfLines={2}>"{item.neural_log}"</Text>
               <Text style={[styles.date, isLight && { color: '#CCC' }]}>{new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString()}</Text>
            </View>
          )}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={<Text style={[styles.empty, isLight && { color: '#DDD' }]}>NO AUDITS LOGGED YET.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  introBox: { paddingHorizontal: 25, marginBottom: 10 },
  introTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  introSub: { color: '#444', fontSize: 12, marginTop: 4 },
  auditCard: { backgroundColor: '#080808', borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#111' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  category: { color: '#aaa', fontSize: 9, fontWeight: '900' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: '#000', fontSize: 8, fontWeight: '900' },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#222' },
  targetName: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  signalType: { color: '#444', fontSize: 10, fontWeight: 'bold' },
  log: { color: '#666', fontSize: 12, fontStyle: 'italic', marginBottom: 10 },
  date: { color: '#222', fontSize: 9, fontWeight: 'bold' },
  empty: { color: '#222', fontSize: 11, fontWeight: '900', textAlign: 'center', marginTop: 100 },
});
