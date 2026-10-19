import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Image, FlatList, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { CreatorService, CreatorStats } from '../../lib/creatorService';
import { WalletService, WalletData } from '../../lib/walletService';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';

const { width } = Dimensions.get('window');

export default function CreatorDashboard() {
  const router = useRouter();
  const { theme: themeMode, isLight } = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [topVideos, setTopVideos] = useState<any[]>([]);
  const [recentGifts, setRecentGifts] = useState<any[]>([]);

  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchData();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [statsData, walletData, videos, gifts] = await Promise.all([
        CreatorService.getCreatorStats(user.id),
        WalletService.getWalletData(user.id),
        CreatorService.getTopVideos(user.id),
        CreatorService.getRecentGifts(user.id)
      ]);

      setStats(statsData);
      setWallet(walletData);
      setTopVideos(videos);
      setRecentGifts(gifts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <View style={[styles.loader, isLight && { backgroundColor: '#fff' }]}><ActivityIndicator color={VOEXITheme.colors.primary} /></View>;

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <View style={[styles.header, isLight && { borderBottomColor: '#EEE' }]}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={isLight ? '#000' : "#fff"} /></TouchableOpacity>
        <View style={styles.headerCenter}>
           <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>CREATOR DASHBOARD</Text>
           <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>REAL-TIME</Text>
           </View>
        </View>
        <TouchableOpacity onPress={() => router.push('/menu/monetization')}><Ionicons name="wallet-outline" size={24} color={VOEXITheme.colors.secondary} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* CREATOR VAULT (Revenue & Coins) */}
        <LinearGradient colors={isLight ? ['#F5F5F5', '#FFF'] : ['#1a1033', '#050505']} style={[styles.vaultCard, isLight && { borderColor: '#EEE' }]}>
           <View style={styles.vaultHeader}>
              <View>
                 <Text style={styles.vaultLabel}>CREATOR VAULT</Text>
                 <Text style={[styles.vaultBalance, isLight && { color: '#000' }]}>₹{wallet?.estimated_cash}</Text>
              </View>
              <View style={styles.vaultIconBg}>
                 <MaterialCommunityIcons name="safe-square" size={32} color={VOEXITheme.colors.primary} />
              </View>
           </View>
           <View style={styles.vaultFooter}>
              <View style={[styles.coinBadge, isLight && { backgroundColor: '#FFF', borderColor: '#EEE', borderWidth: 1 }]}>
                 <MaterialCommunityIcons name="database" size={14} color="#FFD700" />
                 <Text style={[styles.vaultCoins, isLight && { color: '#000' }]}>{wallet?.balance.toLocaleString()} VX Coins</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/menu/monetization')} style={styles.vaultAction}>
                 <Text style={styles.vaultActionText}>Withdraw</Text>
                 <Ionicons name="arrow-forward" size={12} color="#fff" />
              </TouchableOpacity>
           </View>
        </LinearGradient>

        {/* GROWTH PULSE & MOMENTUM METER */}
        <View style={styles.meterRow}>
           <View style={[styles.meterCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
              <Text style={styles.meterTitle}>MOMENTUM METER</Text>
              <View style={styles.momentumContainer}>
                 <View style={styles.momentumTrack}>
                    <LinearGradient
                      colors={[VOEXITheme.colors.primary, '#FF0080']}
                      style={[styles.momentumFill, { width: `${stats?.momentum || 0}%` }]}
                    />
                 </View>
                 <Text style={[styles.momentumVal, isLight && { color: '#000' }]}>{stats?.momentum}%</Text>
              </View>
              <Text style={styles.meterSub}>Engagement Velocity</Text>
           </View>

           <View style={[styles.meterCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
              <Text style={styles.meterTitle}>GROWTH PULSE</Text>
              <Animated.View style={[styles.pulseIconContainer, { transform: [{ scale: pulseAnim }] }]}>
                 <Ionicons name="heart-half" size={32} color={VOEXITheme.colors.secondary} />
              </Animated.View>
              <Text style={styles.pulseVal}>STABLE</Text>
              <Text style={styles.meterSub}>Channel Health</Text>
           </View>
        </View>

        {/* COMMUNITY POWER */}
        <View style={[styles.powerCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
           <View style={styles.powerHeader}>
              <View>
                 <Text style={styles.sectionTitle}>COMMUNITY POWER</Text>
                 <Text style={styles.powerDesc}>Total influence across VOEXI</Text>
              </View>
              <Text style={[styles.powerScore, isLight && { color: '#000' }]}>{stats?.communityPower}</Text>
           </View>
           <View style={styles.powerBarBg}>
              <LinearGradient
                colors={[VOEXITheme.colors.secondary, '#00F2FE']}
                start={{x:0, y:0}}
                end={{x:1, y:0}}
                style={[styles.powerBarFill, { width: `${Math.min(100, (stats?.communityPower || 0) / 500 * 100)}%` }]}
              />
           </View>
           <View style={styles.powerStats}>
              <Text style={styles.pStat}>{stats?.followersCount} Followers</Text>
              <Text style={styles.pStat}>{stats?.totalLikes} Likes</Text>
           </View>
        </View>

        {/* RECENT GIFTS */}
        <View style={styles.section}>
           <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, isLight && { color: '#CCC' }]}>RECENT GIFTS</Text>
              <TouchableOpacity onPress={() => {}}><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
           </View>
           {recentGifts.length === 0 ? (
             <View style={[styles.emptyBox, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
                <Ionicons name="gift-outline" size={32} color={isLight ? "#DDD" : "#111"} />
                <Text style={[styles.emptyText, isLight && { color: '#CCC' }]}>No gifts received yet</Text>
             </View>
           ) : (
             recentGifts.map((gift) => (
               <View key={gift.id} style={[styles.giftRow, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
                  <Image source={{ uri: gift.profiles?.avatar_url || 'https://via.placeholder.com/50' }} style={styles.giftAvatar} />
                  <View style={{ flex: 1 }}>
                     <Text style={[styles.giftUser, isLight && { color: '#000' }]}>@{gift.profiles?.username}</Text>
                     <Text style={styles.giftTime}>{new Date(gift.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={[styles.giftBadge, isLight && { backgroundColor: '#FFF', borderColor: '#EEE', borderWidth: 1 }]}>
                     <MaterialCommunityIcons name="database" size={12} color="#FFD700" />
                     <Text style={[styles.giftAmt, isLight && { color: '#000' }]}>{gift.coins}</Text>
                  </View>
               </View>
             ))
           )}
        </View>

        {/* PERFORMANCE ANALYTICS */}
        <View style={styles.section}>
           <Text style={[styles.sectionTitle, isLight && { color: '#CCC' }]}>TOP PRODUCTIONS</Text>
           {topVideos.map((video, idx) => (
             <TouchableOpacity key={video.id} style={[styles.videoCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
                <Text style={styles.videoRank}>{idx + 1}</Text>
                <Image source={{ uri: video.thumbnail_url || video.video_url }} style={styles.videoThumb} />
                <View style={{ flex: 1 }}>
                   <Text style={[styles.videoTitle, isLight && { color: '#000' }]} numberOfLines={1}>{video.title || 'Untitled'}</Text>
                   <View style={styles.videoMeta}>
                      <Ionicons name="eye-outline" size={12} color="#666" />
                      <Text style={styles.videoViews}>{video.views_count || 0}</Text>
                      <Ionicons name="heart-outline" size={12} color="#666" style={{marginLeft: 10}} />
                      <Text style={styles.videoViews}>{video.likes_count || 0}</Text>
                   </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={isLight ? "#CCC" : "#222"} />
             </TouchableOpacity>
           ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  liveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#22C55E' },
  liveText: { color: '#22C55E', fontSize: 8, fontWeight: '900' },
  content: { padding: 20 },
  vaultCard: { borderRadius: 24, padding: 25, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.2)' },
  vaultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vaultLabel: { color: '#A855F7', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  vaultBalance: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 5 },
  vaultIconBg: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(168, 85, 247, 0.1)', justifyContent: 'center', alignItems: 'center' },
  vaultFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 15, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)' },
  coinBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  vaultCoins: { color: '#FFD700', fontSize: 12, fontWeight: 'bold' },
  vaultAction: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: VOEXITheme.colors.primary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  vaultActionText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  meterRow: { flexDirection: 'row', gap: 15, marginBottom: 25 },
  meterCard: { flex: 1, backgroundColor: '#080808', padding: 20, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: '#111' },
  meterTitle: { color: '#444', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 15 },
  momentumContainer: { width: '100%', alignItems: 'center' },
  momentumTrack: { width: '100%', height: 4, backgroundColor: '#111', borderRadius: 2, overflow: 'hidden' },
  momentumFill: { height: '100%', borderRadius: 2 },
  momentumVal: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 10 },
  meterSub: { color: '#333', fontSize: 8, fontWeight: '900', marginTop: 5 },
  pulseIconContainer: { marginVertical: 8 },
  pulseVal: { color: VOEXITheme.colors.secondary, fontSize: 12, fontWeight: '900' },
  powerCard: { backgroundColor: '#080808', padding: 20, borderRadius: 24, marginBottom: 25, borderWidth: 1, borderColor: '#111' },
  powerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  sectionTitle: { color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  powerDesc: { color: '#222', fontSize: 9, fontWeight: '900', marginTop: 2 },
  powerScore: { color: '#fff', fontSize: 24, fontWeight: '900' },
  powerBarBg: { height: 6, backgroundColor: '#111', borderRadius: 3, overflow: 'hidden' },
  powerBarFill: { height: '100%', borderRadius: 3 },
  powerStats: { flexDirection: 'row', gap: 20, marginTop: 12 },
  pStat: { color: '#444', fontSize: 10, fontWeight: 'bold' },
  section: { marginBottom: 30 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  viewAll: { color: VOEXITheme.colors.primary, fontSize: 10, fontWeight: '900' },
  giftRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#050505', padding: 15, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: '#0A0A0A' },
  giftAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 15 },
  giftUser: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  giftTime: { color: '#333', fontSize: 10, marginTop: 2 },
  giftBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#111', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  giftAmt: { color: '#FFD700', fontSize: 12, fontWeight: '900' },
  emptyBox: { padding: 40, alignItems: 'center', backgroundColor: '#050505', borderRadius: 24, borderWidth: 1, borderColor: '#0A0A0A' },
  emptyText: { color: '#222', fontSize: 11, fontWeight: '900', marginTop: 10 },
  videoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#050505', padding: 12, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: '#0A0A0A' },
  videoRank: { color: '#222', fontSize: 12, fontWeight: '900', width: 25 },
  videoThumb: { width: 45, height: 60, borderRadius: 10, marginRight: 15 },
  videoTitle: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  videoMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  videoViews: { color: '#444', fontSize: 11, fontWeight: 'bold' }
});
