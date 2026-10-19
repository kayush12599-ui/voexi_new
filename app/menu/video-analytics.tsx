import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Share, TextInput, Alert, Modal, Switch, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { VOEXITheme } from '../../constants/theme';
import { VideoView, useVideoPlayer } from 'expo-video';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

const RetentionPulse = ({ color }: { color: string }) => {
  const chartWidth = width - 80;
  const chartHeight = 60;
  const points = [
    { x: 0, y: 10 }, { x: 10, y: 15 }, { x: 30, y: 25 },
    { x: 60, y: 45 }, { x: 80, y: 50 }, { x: 100, y: 55 },
  ];
  const d = `M ${points.map(p => `${(p.x / 100) * chartWidth},${p.y}`).join(' L ')}`;

  return (
    <View style={{ height: 70, justifyContent: 'center', marginTop: 10 }}>
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <SvgGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.4" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Path d={`${d} L ${chartWidth},${chartHeight} L 0,${chartHeight} Z`} fill="url(#retGrad)" />
        <Path d={d} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <Circle cx="0" cy="10" r="4" fill={color} />
        <Circle cx={chartWidth} cy="55" r="4" fill={color} />
      </Svg>
    </View>
  );
};

export default function VideoAnalyticsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawId = params.videoId || params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  console.log("[VIDEO_ANALYTICS] Received Params:", params);
  console.log("[VIDEO_ANALYTICS] Resolved ID:", id);

  const scrollRef = useRef<ScrollView>(null);
  const retentionRef = useRef<View>(null);

  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<any>(null);
  const [hourlyData, setHourlyData] = useState<number[]>(new Array(12).fill(0));
  const [stats, setStats] = useState({
    views: 0, likes: 0, comments: 0, shares: 0, saves: 0, rating: 0,
    avgWatchTime: '0:00', returningViewers: 0, newViewers: 0,
    subViewers: 0, nonSubViewers: 0,
    countries: [] as any[], ages: [] as any[], gender: [] as any[],
    searchTerms: [] as string[]
  });

  const finalUrl = useMemo(() => {
    let url = video?.video_url || video?.media_url || '';
    if (!url) return null;
    url = url.trim();
    if (url.includes('b-cdn.net')) {
        url = url.replace('videosvoexi.b-cdn.net', 'voexi.b-cdn.net');
        url = url.replace('VOEXI.b-cdn.net', 'voexi.b-cdn.net');
    }
    return url;
  }, [video]);

  const player = useVideoPlayer(finalUrl);

  useEffect(() => {
    fetchVideoStats();
  }, [id]);

  const fetchVideoStats = async () => {
    try {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      // Explicitly specify the relationship to avoid PGRST201
      const { data: videoData, error: videoError } = await supabase
        .from('posts')
        .select('*, author:profiles!posts_user_id_fkey(*)')
        .eq('id', id)
        .single();

      if (videoError || !videoData) {
        console.error("Video Fetch Error:", videoError);
        // Fallback to basic fetch without profiles if join fails
        const { data: fallbackData } = await supabase.from('posts').select('*').eq('id', id).single();
        if (fallbackData) {
          setVideo(fallbackData);
        } else {
          setLoading(false);
          return;
        }
      } else {
        setVideo(videoData);
      }

      // Fetch Hourly Views for the last 24h
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      const { data: hourlyViews } = await supabase
        .from('analytics_views_log')
        .select('created_at')
        .eq('post_id', id)
        .gte('created_at', yesterday.toISOString());

      if (hourlyViews) {
        const hours = new Array(12).fill(0);
        const now = new Date();
        hourlyViews.forEach(v => {
          const vDate = new Date(v.created_at);
          const diffHours = Math.floor((now.getTime() - vDate.getTime()) / (1000 * 60 * 60));
          if (diffHours >= 0 && diffHours < 24) {
            const index = 11 - Math.floor(diffHours / 2); // 12 bars for 24h (2h each)
            if (index >= 0) hours[index]++;
          }
        });
        setHourlyData(hours);
      }

      const { data: ratings } = await supabase.from('ratings').select('rating_value').eq('post_id', id);
      const avgR = ratings?.length ? (ratings.reduce((a,c) => a + c.rating_value, 0) / ratings.length).toFixed(1) : 0;

      // Fetch logs - using explicit relationship if possible, but keep it simple to avoid PGRST errors
      const { data: logs, error: logsError } = await supabase
        .from('video_analytics_logs')
        .select('*, viewer:profiles!viewer_id(username, avatar_url, country, gender, birth_year)')
        .eq('post_id', id);

      if (logsError) {
        console.warn("Logs Fetch Error (Continuing without logs):", logsError);
      }

      if (logs && logs.length > 0) {
        const total = logs.length || 1;
        const returning = logs.filter(l => l.is_returning_viewer).length;
        const subs = logs.filter(l => l.is_subscriber).length;

        const countryMap: any = {};
        const genderMap: any = { Male: 0, Female: 0, Others: 0 };
        const ageMap: any = { '18-24': 0, '25-34': 0, '35+': 0 };

        logs.forEach(l => {
          const c = l.viewer?.country || l.country || 'Unknown';
          countryMap[c] = (countryMap[c] || 0) + 1;
          const g = l.viewer?.gender || l.gender || 'Others';
          if (genderMap[g] !== undefined) genderMap[g]++;

          const birthYear = l.viewer?.birth_year;
          if (birthYear) {
            const age = new Date().getFullYear() - birthYear;
            if (age < 25) ageMap['18-24']++;
            else if (age < 35) ageMap['25-34']++;
            else ageMap['35+']++;
          }
        });

        // Calculate Avg. Retention
        const totalWatch = videoData.total_watch_time_seconds || 0;
        const totalViews = videoData.views_count || 1;
        const avgSeconds = totalWatch / totalViews;
        const mins = Math.floor(avgSeconds / 60);
        const secs = Math.floor(avgSeconds % 60);
        const avgFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

        setStats({
          views: videoData.views_count || 0,
          likes: videoData.likes_count || 0,
          comments: videoData.comments_count || 0,
          shares: videoData.shares_count || 0,
          saves: videoData.saves_count || 0,
          rating: avgR as any,
          avgWatchTime: avgFormatted,
          returningViewers: Math.round((returning/total)*100),
          newViewers: 100 - Math.round((returning/total)*100),
          subViewers: Math.round((subs/total)*100),
          nonSubViewers: 100 - Math.round((subs/total)*100),
          countries: Object.keys(countryMap).map(k => ({ name: k, val: Math.round((countryMap[k]/total)*100) })).sort((a,b) => b.val-a.val).slice(0,3),
          gender: Object.keys(genderMap).map(k => ({ type: k, val: Math.round((genderMap[k]/total)*100) })),
          ages: Object.keys(ageMap).map(k => ({ range: k, val: Math.round((ageMap[k]/total)*100) })),
          searchTerms: [...new Set(logs.map(l => l.search_term).filter(Boolean))].slice(0, 4) as string[]
        });
      } else {
        setStats(s => ({ ...s, views: videoData.views_count||0, likes: videoData.likes_count||0, comments: videoData.comments_count||0, rating: avgR as any }));
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const scrollToRetention = () => {
    const yPos = (retentionRef as any).currentY || 650;
    scrollRef.current?.scrollTo({ y: yPos - 20, animated: true });
  };

  const formatNumber = (num: number) => num >= 1000 ? (num / 1000).toFixed(1) + 'K' : num.toString();

  if (loading) return <View style={styles.center}><ActivityIndicator color={VOEXITheme.colors.primary} size="large" /></View>;
  if (!video) return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={48} color="#444" />
      <Text style={{color: '#fff', marginTop: 10, fontWeight: 'bold'}}>Signal Not Found</Text>
      <Text style={{color: '#444', fontSize: 10, marginTop: 5}}>Target: {String(id || 'Empty')}</Text>
      <TouchableOpacity onPress={() => router.back()} style={{marginTop: 20, padding: 10, backgroundColor: '#111', borderRadius: 10}}>
         <Text style={{color: VOEXITheme.colors.primary}}>BACK TO COMMAND</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={26} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>VIDEO INSIGHTS</Text>
        <TouchableOpacity onPress={() => Share.share({ message: `Check out: ${video.title}` })}><Ionicons name="share-outline" size={22} color="#fff" /></TouchableOpacity>
      </View>

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
        <View style={styles.previewCard}>
           <View style={styles.thumbContainer}>
              <VideoView player={player} style={styles.thumb} contentFit="cover" nativeControls={false} />
              <TouchableOpacity style={styles.playCenter} onPress={() => player.playing ? player.pause() : player.play()}>
                <Ionicons name={player.playing ? "pause" : "play"} size={20} color="#fff" />
              </TouchableOpacity>
           </View>
           <View style={styles.previewInfo}>
              <Text style={styles.vTitle}>{video.title}</Text>
              <Text style={styles.vDate}>Published {new Date(video.created_at).toLocaleDateString()}</Text>
           </View>
        </View>

        <Text style={styles.sectionLabel}>PERFORMANCE SUMMARY</Text>
        <View style={styles.statsGrid}>
           <View style={styles.statBox}><Text style={styles.statVal}>{formatNumber(stats.views)}</Text><Text style={styles.statLab}>Total Views</Text><View style={[styles.statDot, { backgroundColor: '#A855F7' }]} /></View>
           <View style={styles.statBox}><Text style={styles.statVal}>{formatNumber(stats.likes)}</Text><Text style={styles.statLab}>Hearts</Text><View style={[styles.statDot, { backgroundColor: '#ff4444' }]} /></View>
           <TouchableOpacity style={styles.statBox} onPress={scrollToRetention}><Text style={styles.statVal}>{stats.avgWatchTime}</Text><Text style={styles.statLab}>Avg. Retention</Text><Ionicons name="stats-chart" size={10} color="#00F2FE" style={{position:'absolute', top:15, right:15}} /></TouchableOpacity>
           <View style={styles.statBox}><Text style={styles.statVal}>{formatNumber(stats.comments)}</Text><Text style={styles.statLab}>Comments</Text><View style={[styles.statDot, { backgroundColor: '#00C851' }]} /></View>
           <View style={styles.statBox}><Text style={styles.statVal}>{formatNumber(stats.shares)}</Text><Text style={styles.statLab}>Shares</Text><View style={[styles.statDot, { backgroundColor: '#FFD700' }]} /></View>
           <View style={styles.statBox}><Text style={styles.statVal}>{formatNumber(stats.saves)}</Text><Text style={styles.statLab}>Saves</Text><View style={[styles.statDot, { backgroundColor: '#00F2FE' }]} /></View>
           <View style={[styles.statBox, {width: width - 40}]}><View style={{flexDirection:'row', alignItems:'center', gap: 10}}><Text style={[styles.statVal, {fontSize: 32}]}>{stats.rating}</Text><View><View style={{flexDirection:'row', gap:2}}>{[1,2,3,4,5].map(s => <Ionicons key={s} name="star" size={12} color={s <= Math.round(stats.rating) ? '#FFD700' : '#222'} />)}</View><Text style={styles.statLab}>AVERAGE RATING</Text></View></View></View>
        </View>

        <View style={styles.chartCard}>
           <View style={styles.graphHeader}><Text style={styles.cardTitle}>HOURLY REACH</Text><View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View></View>
           <View style={styles.graph}>
              {hourlyData.map((h, i) => {
                const max = Math.max(...hourlyData, 1);
                const height = (h / max) * 100;
                return (
                  <View key={i} style={styles.barContainer}>
                     <View style={[styles.bar, { height: Math.max(height, 5), backgroundColor: h === max && h > 0 ? '#A855F7' : '#1A1A24' }]}>
                        {h === max && h > 0 && <LinearGradient colors={['#A855F7', '#6366f1']} style={StyleSheet.absoluteFill} />}
                     </View>
                     <Text style={styles.barTime}>{i * 2}h</Text>
                  </View>
                );
              })}
           </View>
        </View>

        <View onLayout={(e) => (retentionRef as any).currentY = e.nativeEvent.layout.y} style={styles.retentionCard}><Text style={styles.cardTitle}>AUDIENCE RETENTION</Text><RetentionPulse color="#A855F7" /><View style={styles.retentionLabels}><Text style={styles.retText}>Start (100%)</Text><Text style={styles.retText}>End (12%)</Text></View></View>

        <Text style={styles.sectionLabel}>AUDIENCE INTELLIGENCE</Text>
        <View style={styles.audienceContainer}>
           <View style={styles.proAnalyticsCard}><LinearGradient colors={['#12121A', '#08080C']} style={styles.proCardInner}><View style={styles.cardHeader}><View style={styles.iconBadgePro}><MaterialCommunityIcons name="account-group" size={16} color="#A855F7" /></View><Text style={styles.proCardTitle}>LOYALTY</Text></View><View style={styles.loyaltyDataRow}><View style={styles.loyaltyStat}><Text style={styles.loyaltyValPro}>{stats.returningViewers}%</Text><Text style={styles.loyaltyLabPro}>Returning</Text></View><View style={styles.loyaltyStat}><Text style={styles.loyaltyValPro}>{stats.newViewers}%</Text><Text style={styles.loyaltyLabPro}>New</Text></View></View><View style={styles.progressTrackPro}><LinearGradient colors={['#A855F7', '#6366f1']} start={{x:0, y:0}} end={{x:1, y:0}} style={[styles.progressFillPro, {width: `${stats.returningViewers}%`}]} /></View></LinearGradient></View>
           <View style={styles.proAnalyticsCard}><LinearGradient colors={['#12121A', '#08080C']} style={styles.proCardInner}><View style={styles.cardHeader}><View style={[styles.iconBadgePro, {backgroundColor: '#FFD70022'}]}><MaterialCommunityIcons name="bell-ring" size={16} color="#FFD700" /></View><Text style={styles.proCardTitle}>SUBSCRIPTION</Text></View><View style={styles.loyaltyDataRow}><View style={styles.loyaltyStat}><Text style={[styles.loyaltyValPro, {color: '#FFD700'}]}>{stats.subViewers}%</Text><Text style={styles.loyaltyLabPro}>Subscribed</Text></View><View style={styles.loyaltyStat}><Text style={styles.loyaltyValPro}>{stats.nonSubViewers}%</Text><Text style={styles.loyaltyLabPro}>Non-Sub</Text></View></View><View style={styles.progressTrackPro}><View style={[styles.progressFillPro, {width: `${stats.subViewers}%`, backgroundColor: '#FFD700'}]} /></View></LinearGradient></View>
           <View style={styles.proDemoGrid}>
              <View style={styles.proDemoCard}>
                 <View style={{flexDirection:'row', alignItems:'center', gap:5, marginBottom:15}}>
                    <Ionicons name="male-female-outline" size={14} color="#666" />
                    <Text style={styles.proDemoTitle}>GENDER</Text>
                 </View>
                 {stats.gender.length > 0 ? stats.gender.map(g => (
                    <View key={g.type} style={styles.proDemoRow}>
                       <Text style={styles.proDemoLab}>{g.type}</Text>
                       <View style={styles.proDemoBar}>
                          <View style={[styles.proDemoFill, {width: `${g.val}%`, backgroundColor: g.type === 'Male' ? '#3B82F6' : g.type === 'Female' ? '#EC4899' : '#555'}]} />
                       </View>
                       <Text style={styles.proDemoPct}>{g.val}%</Text>
                    </View>
                 )) : <Text style={styles.noDataText}>Pending more views...</Text>}
              </View>
              <View style={styles.proDemoCard}>
                 <View style={{flexDirection:'row', alignItems:'center', gap:5, marginBottom:15}}>
                    <Ionicons name="calendar-outline" size={14} color="#666" />
                    <Text style={styles.proDemoTitle}>AGE REACH</Text>
                 </View>
                 {stats.ages.length > 0 ? stats.ages.map(a => (
                    <View key={a.range} style={styles.proDemoRow}>
                       <Text style={styles.proDemoLab}>{a.range}</Text>
                       <View style={styles.proDemoBar}>
                          <View style={[styles.proDemoFill, {width: `${a.val}%`, backgroundColor: '#A855F7'}]} />
                       </View>
                       <Text style={styles.proDemoPct}>{a.val}%</Text>
                    </View>
                 )) : <Text style={styles.noDataText}>Analyzing audience...</Text>}
              </View>
           </View>

           <View style={styles.proDiscoverySection}>
              <View style={{flexDirection:'row', alignItems:'center', gap:8, marginBottom:15}}>
                 <Ionicons name="compass-outline" size={16} color="#666" />
                 <Text style={styles.proDemoTitle}>TOP TRAFFIC SEARCHES</Text>
              </View>
              <View style={styles.proSearchGrid}>
                 {stats.searchTerms.length > 0 ? stats.searchTerms.map(term => (
                    <View key={term} style={styles.proSearchTag}>
                       <Ionicons name="search-outline" size={12} color="#444" />
                       <Text style={styles.proSearchText}>{term}</Text>
                    </View>
                 )) : (
                   <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                      <ActivityIndicator size="small" color="#222" />
                      <Text style={styles.noDataText}>Tracking search intel...</Text>
                   </View>
                 )}
              </View>
           </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1.5 },
  previewCard: { flexDirection: 'row', backgroundColor: '#080808', margin: 20, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: '#111' },
  thumbContainer: { width: 100, height: 60, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', position: 'relative' },
  thumb: { width: '100%', height: '100%' },
  playCenter: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  previewInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  vTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  vDate: { color: '#444', fontSize: 10, marginTop: 5, fontWeight: 'bold' },
  sectionLabel: { color: '#444', fontSize: 10, fontWeight: 'bold', marginLeft: 25, letterSpacing: 1.5 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 20, gap: 12 },
  statBox: { width: (width - 52) / 2, backgroundColor: '#080808', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#111' },
  statVal: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  statLab: { color: '#555', fontSize: 10, marginTop: 4, fontWeight: 'bold' },
  statDot: { position: 'absolute', top: 15, right: 15, width: 6, height: 6, borderRadius: 3 },
  chartCard: { backgroundColor: '#080808', marginHorizontal: 20, borderRadius: 25, padding: 20, borderWidth: 1, borderColor: '#111', marginTop: 10 },
  graphHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  liveBadge: { backgroundColor: '#ff444422', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveText: { color: '#ff4444', fontSize: 8, fontWeight: '900' },
  cardTitle: { color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  graph: { height: 120, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  barContainer: { alignItems: 'center', gap: 8 },
  bar: { width: 10, borderRadius: 5, overflow: 'hidden' },
  barTime: { color: '#222', fontSize: 8, fontWeight: 'bold' },
  retentionCard: { backgroundColor: '#080808', marginHorizontal: 20, borderRadius: 25, padding: 20, borderWidth: 1, borderColor: '#111', marginTop: 20 },
  retentionLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  retText: { color: '#444', fontSize: 9, fontWeight: 'bold' },
  audienceContainer: { paddingHorizontal: 20, marginTop: 15 },
  proAnalyticsCard: { marginBottom: 15, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#1A1A24' },
  proCardInner: { padding: 20 },
  iconBadgePro: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#A855F722', justifyContent: 'center', alignItems: 'center' },
  proCardTitle: { color: '#444', fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  loyaltyDataRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, marginBottom: 15 },
  loyaltyStat: { flex: 1 },
  loyaltyValPro: { color: '#fff', fontSize: 22, fontWeight: '900' },
  loyaltyLabPro: { color: '#333', fontSize: 8, fontWeight: 'bold', marginTop: 4 },
  progressTrackPro: { height: 4, backgroundColor: '#000', borderRadius: 2, overflow: 'hidden' },
  progressFillPro: { height: '100%', borderRadius: 2 },
  proDemoGrid: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  proDemoCard: { flex: 1, backgroundColor: '#080808', padding: 18, borderRadius: 24, borderWidth: 1, borderColor: '#111' },
  proDemoTitle: { color: '#333', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginBottom: 15 },
  proDemoRow: { marginBottom: 12 },
  proDemoLab: { color: '#666', fontSize: 8, fontWeight: 'bold', marginBottom: 4 },
  proDemoBar: { height: 3, backgroundColor: '#000', borderRadius: 1.5, overflow: 'hidden' },
  proDemoFill: { height: '100%', borderRadius: 1.5 },
  proDemoPct: { color: '#fff', fontSize: 9, fontWeight: '900', marginTop: 4, textAlign: 'right' },
  proDiscoverySection: { backgroundColor: '#080808', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#111', marginBottom: 20 },
  proSearchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  proSearchTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#000', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#1A1A24' },
  proSearchText: { color: '#888', fontSize: 10, fontWeight: 'bold' },
  noDataText: { color: '#333', fontSize: 10, fontWeight: 'bold' }
});
