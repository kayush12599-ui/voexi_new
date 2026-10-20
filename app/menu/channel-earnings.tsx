import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, RefreshControl, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { VOEXITheme } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function ChannelEarningsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState({
    today: 0,
    weekly: 0,
    monthly: 0,
    total: 0,
    watchMins: 0,
    subs: 0
  });
  const [payouts, setPayouts] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data?.session?.user) return;
      const session = data.session;

      const now = new Date();
      const todayStart = new Date(now.setHours(0,0,0,0)).toISOString();
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [profRes, todayRes, weekRes, monthRes, payoutsRes] = await Promise.all([
        supabase.from('profiles').select('channel_balance, total_watch_minutes, subscribers_count').eq('id', session.user.id).single(),
        supabase.from('channel_revenue').select('amount').eq('user_id', session.user.id).gte('created_at', todayStart),
        supabase.from('channel_revenue').select('amount').eq('user_id', session.user.id).gte('created_at', weekAgo),
        supabase.from('channel_revenue').select('amount').eq('user_id', session.user.id).gte('created_at', monthAgo),
        supabase.from('creator_payouts').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(5)
      ]);

      const sum = (arr: any[]) => arr?.reduce((a,c) => a + (c.amount||0), 0) || 0;

      setAnalytics({
        today: sum(todayRes.data || []),
        weekly: sum(weekRes.data || []),
        monthly: sum(monthRes.data || []),
        total: profRes.data?.channel_balance || 0,
        watchMins: profRes.data?.total_watch_minutes || 0,
        subs: profRes.data?.subscribers_count || 0
      });

      setPayouts(payoutsRes.data || []);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const StatBox = ({ label, value, icon, color }: any) => (
    <View style={styles.statBox}>
       <View style={[styles.statIconBox, { backgroundColor: color + '15' }]}>
          <MaterialCommunityIcons name={icon} size={22} color={color} />
       </View>
       <View style={{flex: 1}}>
          <Text style={styles.statLab}>{label}</Text>
          <Text style={styles.statVal}>{value}</Text>
       </View>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator color={VOEXITheme.colors.primary} size="large" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#08080C', '#000']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ANALYTICS</Text>
        <TouchableOpacity onPress={() => fetchData()} style={styles.iconBtn}>
          <Ionicons name="refresh" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchData();}} tintColor="#fff" />}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        <View style={styles.heroSection}>
           <Text style={styles.heroLabel}>Total Revenue</Text>
           <View style={styles.heroMainRow}>
              <Text style={styles.heroSymbol}>₹</Text>
              <Text style={styles.heroVal}>{analytics.total.toLocaleString()}</Text>
           </View>
           <View style={styles.heroBadge}>
              <Ionicons name="flash" size={12} color="#00F2FE" />
              <Text style={styles.heroBadgeTxt}>Top 5% Creator</Text>
           </View>

           {analytics.total > 0 && (
             <TouchableOpacity
                style={styles.withdrawBtn}
                onPress={() => router.push('/menu/monetization')}
             >
                <LinearGradient
                  colors={[VOEXITheme.colors.primary, '#9333ea']}
                  start={{x:0,y:0}} end={{x:1,y:1}}
                  style={styles.withdrawGrad}
                >
                   <Text style={styles.withdrawText}>WITHDRAW FUNDS</Text>
                   <MaterialCommunityIcons name="bank-transfer-out" size={18} color="#000" />
                </LinearGradient>
             </TouchableOpacity>
           )}
        </View>

        <View style={styles.gridSection}>
           <View style={styles.row}>
              <StatBox label="Today" value={`₹${analytics.today}`} icon="calendar-today" color="#00F2FE" />
              <StatBox label="This Week" value={`₹${analytics.weekly}`} icon="calendar-week" color="#A855F7" />
           </View>
           <View style={styles.row}>
              <StatBox label="This Month" value={`₹${analytics.monthly}`} icon="calendar-month" color="#FFD700" />
              <StatBox label="Followers" value={analytics.subs} icon="account-multiple" color="#FF4444" />
           </View>
        </View>

        <View style={styles.chartCard}>
           <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Recent Payouts</Text>
           </View>
           {payouts.length > 0 ? payouts.map((p, i) => (
             <View key={i} style={styles.payoutRow}>
                <Text style={styles.payoutDate}>{new Date(p.created_at).toLocaleDateString()}</Text>
                <Text style={styles.payoutAmt}>₹{p.amount}</Text>
                <Text style={[styles.payoutStatus, {color: p.status === 'paid' ? '#00C851' : '#FF4444'}]}>{p.status.toUpperCase()}</Text>
             </View>
           )) : <Text style={styles.noData}>No payouts yet</Text>}
        </View>

        <View style={styles.chartCard}>
           <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Watch Minutes Engagement</Text>
              <View style={styles.timeBadge}><Text style={styles.timeBadgeText}>Last 30 Days</Text></View>
           </View>

           <View style={styles.vizBox}>
              <View style={styles.vizCircle}>
                 <LinearGradient colors={['#111', '#050505']} style={styles.vizCircleInner}>
                    <Text style={styles.vizVal}>{Math.floor(analytics.watchMins)}</Text>
                    <Text style={styles.vizLab}>MINS</Text>
                 </LinearGradient>
              </View>
              <View style={styles.vizSidebar}>
                 <View style={styles.vizItem}>
                    <View style={[styles.vizDot, {backgroundColor:'#00F2FE'}]} />
                    <Text style={styles.vizText}>Avg. 4.2m / video</Text>
                 </View>
                 <View style={styles.vizItem}>
                    <View style={[styles.vizDot, {backgroundColor:'#A855F7'}]} />
                    <Text style={styles.vizText}>78% Retention</Text>
                 </View>
              </View>
           </View>
        </View>

        <TouchableOpacity
          style={styles.proBtn}
          activeOpacity={0.8}
        >
           <LinearGradient colors={['#1A1A1A', '#080808']} style={styles.proBtnInner}>
              <View style={styles.proIconBox}>
                 <MaterialCommunityIcons name="lightning-bolt" size={24} color="#FFD700" />
              </View>
              <View style={{flex: 1}}>
                 <Text style={styles.proTitle}>Unlock Pro Insights</Text>
                 <Text style={styles.proSub}>Get deeper demographic analytics</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#444" />
           </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#111' },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  heroSection: { alignItems: 'center', marginVertical: 30 },
  heroLabel: { color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  heroMainRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 10 },
  heroSymbol: { color: VOEXITheme.colors.secondary, fontSize: 24, fontWeight: 'bold', marginTop: 10, marginRight: 5 },
  heroVal: { color: '#fff', fontSize: 56, fontWeight: '900' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#00F2FE15', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  heroBadgeTxt: { color: '#00F2FE', fontSize: 10, fontWeight: 'bold' },
  withdrawBtn: { marginTop: 20, height: 50, borderRadius: 15, overflow: 'hidden', width: '60%' },
  withdrawGrad: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  withdrawText: { color: '#000', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  gridSection: { padding: 20, gap: 15 },
  row: { flexDirection: 'row', gap: 15 },
  statBox: { flex: 1, backgroundColor: '#0A0A0A', borderRadius: 25, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#151515' },
  statIconBox: { width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  statLab: { color: '#444', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  statVal: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  chartCard: { margin: 20, backgroundColor: '#080808', borderRadius: 30, padding: 25, borderWidth: 1, borderColor: '#111' },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  chartTitle: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  timeBadge: { backgroundColor: '#111', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  timeBadgeText: { color: '#555', fontSize: 8, fontWeight: 'bold' },
  vizBox: { flexDirection: 'row', alignItems: 'center', gap: 30 },
  vizCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#111', padding: 10, justifyContent: 'center', alignItems: 'center' },
  vizCircleInner: { width: '100%', height: '100%', borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  vizVal: { color: '#fff', fontSize: 24, fontWeight: '900' },
  vizLab: { color: '#444', fontSize: 8, fontWeight: 'bold', marginTop: 2 },
  vizSidebar: { flex: 1, gap: 15 },
  vizItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vizDot: { width: 6, height: 6, borderRadius: 3 },
  vizText: { color: '#666', fontSize: 11, fontWeight: '500' },
  payoutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#111' },
  payoutDate: { color: '#444', fontSize: 11 },
  payoutAmt: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  payoutStatus: { fontSize: 9, fontWeight: 'bold' },
  noData: { color: '#333', fontSize: 11, textAlign: 'center', marginTop: 10 },
  proBtn: { marginHorizontal: 20, marginTop: 10 },
  proBtnInner: { padding: 20, borderRadius: 25, flexDirection: 'row', alignItems: 'center', gap: 15, borderWidth: 1, borderColor: '#1A1A1A' },
  proIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#111' },
  proTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  proSub: { color: '#444', fontSize: 11, marginTop: 2 }
});
