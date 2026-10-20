import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Animated, Image, Modal, Pressable, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CreatorService, CreatorStats } from '../../lib/creatorService';
import { supabase } from '../../lib/supabase';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Circle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LiquidGlassCard } from '../../components/LiquidGlassCard';

const { width, height } = Dimensions.get('window');

const RANGES = [
  { id: '7D', label: '7 Days' },
  { id: '30D', label: '30 Days' },
  { id: '90D', label: '90 Days' },
  { id: '280D', label: '280 Days' },
  { id: '365D', label: '365 Days' },
  { id: 'LIFE', label: 'Lifetime' },
];

const CONTENT_TYPES = [
  { id: 'Video', label: 'VIDEOS', icon: 'videocam-outline', color: '#A855F7' },
  { id: 'Reels', label: 'REELS', icon: 'flash-outline', color: '#EC4899' },
  { id: 'Live', label: 'LIVE', icon: 'pulse-outline', color: '#FF4444' },
  { id: 'Photo', label: 'PHOTOS', icon: 'image-outline', color: '#00C851' },
  { id: 'Writing', label: 'WRITING', icon: 'create-outline', color: '#FFD700' },
  { id: 'Sound', label: 'SOUNDS', icon: 'musical-notes-outline', color: '#00F2FE' },
];

/**
 * PREMIUM GLOWING LINE CHART
 */
const PerformancePulse = ({ data, color }: any) => {
  const chartWidth = width - 40;
  const chartHeight = 150;
  if (!data || data.length < 2) return null;

  const points = data.map((d: any, i: number) => {
    const x = (i / (data.length - 1)) * chartWidth;
    const y = chartHeight - (d.val / 100) * (chartHeight - 40) - 20;
    return { x, y, val: d.val };
  });

  const linePath = `M${points.map(p => `${p.x},${p.y}`).join(' L')}`;
  const areaPath = `${linePath} L${chartWidth},${chartHeight} L0,${chartHeight} Z`;

  return (
    <View style={styles.pulseGraphContainer}>
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.3" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Path d={areaPath} fill="url(#areaGrad)" />
        <Path d={linePath} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => {
          // Only show circles for every Nth point if there are many points to avoid clutter
          const skipInterval = data.length > 30 ? 5 : data.length > 15 ? 2 : 1;
          if (i % skipInterval !== 0 && i !== data.length - 1) return null;

          return (
            <React.Fragment key={i}>
              <Circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke={color} strokeWidth="2" />
              {data.length <= 12 && (
                <SvgText x={p.x} y={p.y - 12} fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">{p.val}</SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};

const getFallbackStats = (): CreatorStats => ({
  followersCount: 0,
  followingCount: 0,
  totalViews: 0,
  totalLikes: 0,
  totalComments: 0,
  totalSaves: 0,
  totalShares: 0,
  totalWatchTime: 0,
  averageRating: 0,
  totalRatingsCount: 0,
  remixCount: 0,
  communityPower: 0,
  momentum: 0,
  growthPulse: 0,
  skipRate: 0,
  interestRate: 0,
  subVsUnsub: { subs: 0, unsub: 0 },
  returningVsNew: { returning: 0, newViewers: 0 },
  activeHours: [
    { time: '0h', val: 10 }, { time: '3h', val: 20 }, { time: '6h', val: 40 },
    { time: '9h', val: 80 }, { time: '12h', val: 100 }, { time: '15h', val: 90 },
    { time: '18h', val: 85 }, { time: '21h', val: 50 }
  ],
  demographics: {
    countries: [{ name: 'India', val: 100 }],
    ages: [{ range: '18-24', val: 60 }, { range: '25-34', val: 40 }],
    devices: [{ type: 'Mobile', val: 90 }, { type: 'Desktop', val: 10 }],
    gender: [{ type: 'Male', val: 55 }, { type: 'Female', val: 45 }]
  },
  topSearchTerms: ['VOEXI', 'Reels', 'Music'],
  recentComments: [],
  remixers: [],
  mostRemixedVideos: [],
  topPerformers: {
    mostWatched: null,
    mostEngaging: null,
    subscriberMagnet: null,
    searchKing: null
  },
  contentAffinity: [
    { type: 'Trend Seekers', val: 85, description: 'Users who love viral signals.' }
  ],
  trends: {
    views: [{ day: 'Mon', val: 0 }, { day: 'Tue', val: 0 }, { day: 'Wed', val: 0 }, { day: 'Thu', val: 0 }, { day: 'Fri', val: 0 }, { day: 'Sat', val: 0 }, { day: 'Sun', val: 0 }],
    watchTime: [{ day: 'Mon', val: 0 }, { day: 'Tue', val: 0 }, { day: 'Wed', val: 0 }, { day: 'Thu', val: 0 }, { day: 'Fri', val: 0 }, { day: 'Sat', val: 0 }, { day: 'Sun', val: 0 }],
    subs: [{ day: 'Mon', val: 0 }, { day: 'Tue', val: 0 }, { day: 'Wed', val: 0 }, { day: 'Thu', val: 0 }, { day: 'Fri', val: 0 }, { day: 'Sat', val: 0 }, { day: 'Sun', val: 0 }],
    likes: [{ day: 'Mon', val: 0 }, { day: 'Tue', val: 0 }, { day: 'Wed', val: 0 }, { day: 'Thu', val: 0 }, { day: 'Fri', val: 0 }, { day: 'Sat', val: 0 }, { day: 'Sun', val: 0 }]
  }
});

export default function AnalyticsScreen() {
  const router = useRouter();
  const { theme: themeMode, isLight } = useTheme();
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [stats, setStats] = useState<CreatorStats>(getFallbackStats());
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CONTENT' | 'AUDIENCE'>('OVERVIEW');
  const [activeRange, setActiveRange] = useState('7D');
  const [activeContentType, setActiveContentType] = useState('Video');

  // Cache data by type to prevent lag
  const [cachedContent, setCachedContent] = useState<Record<string, any[]>>({});

  // Detailed Modal States
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<any>(null);
  const slideAnim = useRef(new Animated.Value(height)).current;

  // Refresh data when screen is focused (important for after editing content)
  useFocusEffect(
    useCallback(() => {
      fetchStats(activeRange);
      // Clear cache to force refresh content list if we are on content tab
      if (activeTab === 'CONTENT') {
        setCachedContent({});
        fetchTypeContent(activeContentType);
      }
    }, [activeRange, activeTab, activeContentType])
  );

  useEffect(() => {
    fetchStats(activeRange);
  }, [activeRange]);

  useEffect(() => {
    if (activeTab === 'CONTENT' && !cachedContent[activeContentType]) {
      fetchTypeContent(activeContentType);
    }
  }, [activeTab, activeContentType]);

  const fetchStats = async (range: string) => {
    try {
      setLoading(true);
      let { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const { data: sessionData } = await supabase.auth.getSession();
        user = sessionData?.session?.user || null;
      }

      if (!user) {
        setStats(getFallbackStats());
        return;
      }

      const [statsData, profileRes] = await Promise.all([
        CreatorService.getCreatorStats(user.id, range).catch(() => null),
        (async () => {
          try {
            return await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
          } catch (e) {
            return { data: null };
          }
        })()
      ]);

      setStats(statsData || getFallbackStats());
      if (profileRes?.data) setProfile(profileRes.data);

    } catch (e) {
      console.error("[ANALYTICS_FETCH_ERROR]", e);
      setStats(getFallbackStats());
    } finally {
      setLoading(false);
    }
  };

  const matchContentType = (p: any, targetType: string): boolean => {
    if (!p) return false;
    const target = targetType.toLowerCase().trim();
    const pt = String(p.post_type || p.category || p.type || '').toLowerCase().trim();
    const url = String(p.media_url || p.video_url || p.url || '').toLowerCase().trim();
    const isVideoFile = p.media_type === 'video' || /\.(mp4|mov|avi|mkv|webm)$/i.test(url);
    const isAudioFile = p.media_type === 'audio' || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(url);
    const isPhotoFile = p.media_type === 'image' || /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

    const isReel = p.is_reel === true || p.is_reel === 'true' || pt.includes('reel') || pt.includes('short') || url.includes('reel');

    if (target === 'reels') {
      return isReel || (isVideoFile && pt === 'reels');
    }

    if (target === 'video') {
      return isVideoFile && !isReel;
    }

    if (target === 'photo') {
      return isPhotoFile && !isReel;
    }

    if (target === 'live') {
      return pt.includes('live') || pt.includes('stream');
    }

    if (target === 'writing') {
      return pt.includes('writing') || pt.includes('blog') || pt.includes('article') || pt.includes('neural');
    }

    if (target === 'sound') {
      return isAudioFile || pt.includes('sound') || pt.includes('audio') || pt.includes('music');
    }

    return true;
  };

  const fetchTypeContent = async (type: string) => {
    try {
      setContentLoading(true);
      let { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const { data: sessionData } = await supabase.auth.getSession();
        user = sessionData?.session?.user || null;
      }

      let allRawPosts: any[] = [];

      // 1. Fetch from AsyncStorage local uploads cache
      try {
        const localRaw = await AsyncStorage.getItem('@my_local_uploads');
        if (localRaw) {
          const localList = JSON.parse(localRaw);
          if (Array.isArray(localList)) {
            const userLocals = localList.filter((p: any) => !user?.id || !p.user_id || p.user_id === user.id || p.profiles?.id === user.id);
            allRawPosts = [...allRawPosts, ...userLocals];
          }
        }
      } catch (e) {}

      // 2. Fetch from Supabase DB
      try {
        if (type === 'Sound' && user?.id) {
          const res = await supabase.from('vx_sounds').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
          if (res.data) allRawPosts = [...allRawPosts, ...res.data];
        }

        const { data: dbPosts } = user?.id
          ? await supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
          : await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(50);

        if (dbPosts) allRawPosts = [...allRawPosts, ...dbPosts];
      } catch (e) {}

      // 3. Fetch from Local Media Server (scripts/pendrive_server.js)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600);
        const serverRes = await fetch('http://192.168.31.39:8080/files.json', { signal: controller.signal }).then(r => r.json()).catch(() => null);
        clearTimeout(timeoutId);

        if (serverRes && Array.isArray(serverRes)) {
          const myServerPosts = serverRes.map((f: any) => ({
            id: f.id || `server_${f.filename}`,
            user_id: user?.id || 'server_user',
            title: f.title || f.filename,
            description: f.description || '',
            media_url: f.media_url || f.video_url || f.audio_url,
            post_type: f.post_type || f.category || 'Video',
            media_type: (f.audio_url || f.filename?.match(/\.(mp3|m4a|wav|aac|ogg|flac)$/i)) ? 'audio' : (f.filename?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'video'),
            is_reel: f.category === 'REELS' || f.post_type === 'Reels',
            thumbnail_url: f.thumbnail_url || f.media_url,
            created_at: f.created_at || f.uploaded_at || new Date().toISOString(),
            views_count: f.views || 0,
            likes_count: f.likes || 0
          }));
          allRawPosts = [...allRawPosts, ...myServerPosts];
        }
      } catch (e) {}

      // De-duplicate posts by id, media_url, or title
      const seen = new Set<string>();
      const mergedPosts: any[] = [];
      for (const p of allRawPosts) {
        if (!p) continue;
        const key = p.id || p.media_url || p.video_url || p.title;
        if (key && !seen.has(key)) {
          seen.add(key);
          mergedPosts.push(p);
        }
      }

      // Filter by type using matchContentType
      const filtered = mergedPosts.filter(p => matchContentType(p, type));
      filtered.sort((a, b) => (Number(b.views_count || b.views) || 0) - (Number(a.views_count || a.views) || 0));

      setCachedContent(prev => ({ ...prev, [type]: filtered }));
    } catch (e) {
      console.error("Fetch Content Type Error:", e);
    } finally {
      setContentLoading(false);
    }
  };

  const currentContent = useMemo(() => cachedContent[activeContentType] || [], [cachedContent, activeContentType]);

  const openMetricDetail = (type: string, title: string, value: any, icon: string, color: string, trendData: any) => {
    setSelectedMetric({ type, title, value, icon, color, dailyData: trendData });
    setDetailModalVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
  };

  const closeMetricDetail = () => {
    Animated.timing(slideAnim, { toValue: height, duration: 300, useNativeDriver: true }).start(() => setDetailModalVisible(false));
  };

  const StatBox = ({ title, value, icon, color, trend, type, trendData, isLight }: any) => (
    <TouchableOpacity
      style={[styles.statCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}
      activeOpacity={0.7}
      onPress={() => openMetricDetail(type, title, value, icon, color, trendData)}
      onLongPress={() => router.push('/menu/views-analytics')}
    >
      <View style={styles.cardTop}>
        <View style={[styles.iconCircle, { backgroundColor: color + '22' }]}>
           <Ionicons name={icon} size={18} color={color} />
        </View>
        {trend && <Text style={[styles.trendTxt, { color: trend > 0 ? '#00C851' : '#ff4444' }]}>{trend}%</Text>}
      </View>
      <Text style={[styles.statVal, isLight && { color: '#000' }]}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      <View style={[styles.cardFooter, isLight && { borderTopColor: '#EEE' }]}>
         <Text style={styles.footerLabel}>DEEP DIVE</Text>
         <Ionicons name="chevron-forward" size={10} color={isLight ? '#BBB' : "#333"} />
      </View>
    </TouchableOpacity>
  );

  const ProgressItem = ({ label, percentage, color }: any) => (
    <View style={styles.progItem}>
       <View style={styles.progLabelRow}>
          <Text style={styles.progLabel}>{label}</Text>
          <Text style={styles.progVal}>{percentage}%</Text>
       </View>
       <View style={styles.progTrack}>
          <View style={[styles.progFill, { width: `${percentage}%`, backgroundColor: color }]} />
       </View>
    </View>
  );

  if (loading && !stats) return <View style={[styles.loadingBox, isLight && { backgroundColor: '#fff' }]}><ActivityIndicator color={VOEXITheme.colors.primary} size="large" /></View>;

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <StatusBar barStyle={isLight ? "dark-content" : "light-content"} />
      <View style={[styles.header, isLight && { borderBottomColor: '#EEE', borderBottomWidth: 1 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.circleBtn, isLight && { backgroundColor: '#F5F5F5' }]}><Ionicons name="chevron-back" size={24} color={isLight ? '#000' : "#fff"} /></TouchableOpacity>
        <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>VX STUDIO ANALYTICS</Text>
        <TouchableOpacity onPress={() => { setCachedContent({}); fetchStats(activeRange); }} style={[styles.circleBtn, isLight && { backgroundColor: '#F5F5F5' }]}><Ionicons name="refresh" size={20} color={isLight ? '#000' : "#fff"} /></TouchableOpacity>
      </View>

      <View style={[styles.tabBar, isLight && { borderBottomColor: '#EEE' }]}>
         {['OVERVIEW', 'CONTENT', 'AUDIENCE'].map(t => (
           <TouchableOpacity key={t} onPress={() => setActiveTab(t as any)} style={[styles.tab, activeTab === t && styles.activeTab]}>
              <Text style={[styles.tabText, isLight && { color: '#999' }, activeTab === t && styles.activeTabText, activeTab === t && isLight && { color: VOEXITheme.colors.primary }]}>{t}</Text>
           </TouchableOpacity>
         ))}
      </View>

      {activeTab !== 'CONTENT' && (
        <View style={[styles.rangeBar, isLight && { backgroundColor: '#F9F9F9' }]}>
           <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 20}}>
              {RANGES.map(r => (
                 <TouchableOpacity
                   key={r.id}
                   onPress={() => setActiveRange(r.id)}
                   style={[styles.rangePill, isLight && { backgroundColor: '#FFF', borderColor: '#EEE' }, activeRange === r.id && styles.rangePillActive]}
                 >
                    <Text style={[styles.rangePillText, isLight && { color: '#999' }, activeRange === r.id && {color: '#fff'}]}>{r.label}</Text>
                 </TouchableOpacity>
              ))}
           </ScrollView>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {activeTab === 'OVERVIEW' && (
          <>
            <LiquidGlassCard style={[styles.premiumGraphSection, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
               <View style={styles.graphHeader}>
                  <View>
                     <Text style={[styles.graphTitle, isLight && { color: '#000' }]}>PERFORMANCE PULSE</Text>
                     <Text style={styles.graphSub}>Visual Intelligence ({activeRange})</Text>
                  </View>
                  <View style={styles.graphBadge}><Text style={styles.badgeTxt}>LIVE</Text></View>
               </View>
               <PerformancePulse color={VOEXITheme.colors.primary} data={stats?.trends.views} />
               <View style={styles.graphLabels}>
                  {stats?.trends.views.map((d, i) => {
                    const total = stats.trends.views.length;
                    const skip = total > 30 ? 10 : total > 15 ? 5 : total > 7 ? 2 : 1;
                    if (i % skip !== 0 && i !== total - 1) return null;
                    return <Text key={i} style={[styles.graphLabel, isLight && { color: '#CCC' }]}>{d.day}</Text>;
                  })}
               </View>
            </LiquidGlassCard>

               <View style={styles.grid}>
                  <StatBox type="views" title="Total Views" value={stats?.totalViews?.toLocaleString() || '0'} icon="eye-outline" color="#00F2FE" trend={12} trendData={stats?.trends.views} isLight={isLight} />
                  <StatBox type="watchTime" title="Watch Time" value={`${stats?.totalWatchTime || 0}m`} icon="time-outline" color="#A855F7" trend={8} trendData={stats?.trends.watchTime} isLight={isLight} />
                  <StatBox type="likes" title="Total Likes" value={stats?.totalLikes || 0} icon="heart-outline" color="#FF0080" trend={15} trendData={stats?.trends.likes} isLight={isLight} />
                  <StatBox type="shares" title="Total Shares" value={stats?.totalShares || 0} icon="share-social-outline" color="#3B82F6" trendData={stats?.trends.views} isLight={isLight} />
                  <StatBox type="saves" title="Total Saves" value={stats?.totalSaves || 0} icon="bookmark-outline" color="#EC4899" trendData={stats?.trends.likes} isLight={isLight} />
                  <StatBox type="remix" title="Total Remixes" value={stats?.remixCount || 0} icon="musical-notes-outline" color="#00F2FE" trendData={stats?.trends.views} isLight={isLight} />
               </View>

               {/* NEW: ENGAGEMENT INSIGHTS SECTION */}
               <View style={[styles.engagementSection, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
                  <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 15 }]}>PERFORMANCE PULSE</Text>
                  <Text style={styles.performanceStatusText}>
                     {stats && stats.interestRate > 15 ? "🔥 Your signals are performing above average. Audience loves your style." : "📉 Signal strength is low. Try more engaging titles or trending audio."}
                  </Text>
                  <View style={styles.engRow}>
                     <View style={styles.engItem}>
                        <Text style={styles.engVal}>{stats?.interestRate || 0}%</Text>
                        <Text style={styles.engLab}>Interest Score</Text>
                        <View style={styles.engBarBg}><View style={[styles.engBarFill, { width: `${stats?.interestRate || 0}%`, backgroundColor: '#00C851' }]} /></View>
                     </View>
                     <View style={styles.engItem}>
                        <Text style={styles.engVal}>{stats?.skipRate || 0}%</Text>
                        <Text style={styles.engLab}>Skip Rate</Text>
                        <View style={styles.engBarBg}><View style={[styles.engBarFill, { width: `${stats?.skipRate || 0}%`, backgroundColor: '#FF4444' }]} /></View>
                     </View>
                     <View style={styles.engItem}>
                        <Text style={styles.engVal}>{stats?.momentum || 0}%</Text>
                        <Text style={styles.engLab}>Momentum</Text>
                        <View style={styles.engBarBg}><View style={[styles.engBarFill, { width: `${stats?.momentum || 0}%`, backgroundColor: '#A855F7' }]} /></View>
                     </View>
                  </View>
               </View>

            <TouchableOpacity
               style={[styles.ratingVisualCard, isLight && { borderColor: '#EEE' }]}
               onPress={() => openMetricDetail('rating', 'Avg Rating', `${stats?.averageRating}/5`, 'star', '#FFD700', stats?.trends.likes)}
            >
               <LinearGradient colors={isLight ? ['#F5F5F5', '#FFF'] : ['#1A1A24', '#08080C']} style={styles.ratingGrad}>
                  <View style={styles.ratingLeft}>
                     <Text style={[styles.ratingScore, isLight && { color: '#000' }]}>{stats?.averageRating?.toFixed(1) || '0.0'}</Text>
                     <View style={styles.starsRow}>
                        {[1,2,3,4,5].map(s => (
                           <Ionicons key={s} name={s <= Math.round(stats?.averageRating || 0) ? "star" : "star-outline"} size={16} color="#FFD700" />
                        ))}
                     </View>
                     <Text style={styles.ratingLabel}>{stats?.totalRatingsCount || 0} Ratings</Text>
                  </View>
                  <View style={[styles.ratingDivider, isLight && { backgroundColor: '#EEE' }]} />
                  <View style={styles.ratingRight}>
                     <Text style={[styles.ratingTitle, isLight && { color: '#000' }]}>Intelligence</Text>
                     <Text style={styles.ratingSub}>Your production quality is currently in the top 15% of creators.</Text>
                  </View>
               </LinearGradient>
            </TouchableOpacity>

            <View style={styles.revenueBox}>
               <Text style={styles.sectionTitle}>CREATOR ECONOMY</Text>
               <LinearGradient colors={isLight ? ['#F9F9F9', '#F0F0F0'] : ['#000', '#0A0A10']} style={[styles.revCard, isLight && { borderWidth: 1, borderColor: '#EEE' }]}>
                  <View style={styles.revRow}>
                     <MaterialCommunityIcons name="database-marker" size={32} color="#FFD700" />
                     <View style={{flex: 1, marginLeft: 15}}>
                        <Text style={styles.revLabel}>VX EARNINGS</Text>
                        <Text style={[styles.revVal, isLight && { color: '#000' }]}>{(stats?.communityPower || 0) * 10} Coins</Text>
                     </View>
                     <TouchableOpacity style={styles.cashOutBtn} onPress={() => router.push('/menu/monetization')}>
                        <Text style={styles.cashOutText}>CASH OUT</Text>
                     </TouchableOpacity>
                  </View>
               </LinearGradient>
            </View>
          </>
        )}

        {activeTab === 'CONTENT' && (
          <View style={styles.contentView}>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
                {CONTENT_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.typeBtn, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }, activeContentType === type.id && { borderColor: type.color, backgroundColor: type.color + '22' }]}
                    onPress={() => setActiveContentType(type.id)}
                  >
                     <Ionicons name={type.icon as any} size={16} color={activeContentType === type.id ? type.color : (isLight ? '#999' : '#444')} />
                     <Text style={[styles.typeBtnText, isLight && { color: '#999' }, activeContentType === type.id && { color: type.color }]}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
             </ScrollView>

             {contentLoading ? (
                <View style={styles.emptyContent}><ActivityIndicator color={VOEXITheme.colors.primary} /></View>
             ) : currentContent.length > 0 ? currentContent.map(item => (
                <TouchableOpacity
                   key={item.id}
                   style={[styles.videoItem, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}
                   onPress={() => {
                      if (activeContentType === 'Sound') {
                        router.push(`/sound/${item.id}`);
                      } else {
                        router.push(`/menu/video-manager/${item.id}`);
                      }
                   }}
                >
                   <Image
                     source={{ uri: item.thumbnail_url || item.media_url || 'https://via.placeholder.com/150' }}
                     style={styles.videoThumb}
                   />
                   <View style={{flex: 1, marginLeft: 12}}>
                      <Text style={[styles.videoTitle, isLight && { color: '#000' }]} numberOfLines={1}>{item.title || item.name}</Text>
                      <Text style={styles.vStatText}>
                         {activeContentType === 'Sound' ? `Used in ${item.use_count || 0} videos` : `${item.views_count || 0} views • ${item.likes_count || 0} likes`}
                      </Text>
                   </View>
                   <Ionicons name={activeContentType === 'Sound' ? "musical-note" : "options-outline"} size={18} color={VOEXITheme.colors.primary} />
                </TouchableOpacity>
             )) : (
                <View style={styles.emptyContent}>
                   <Ionicons name="folder-open-outline" size={48} color={isLight ? '#EEE' : "#111"} />
                   <Text style={[styles.emptyText, isLight && { color: '#CCC' }]}>No {activeContentType} uploads found.</Text>
                </View>
             )}
          </View>
        )}

        {activeTab === 'AUDIENCE' && (
          <View style={styles.audienceView}>
             <View style={[styles.graphSection, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
                <View style={styles.graphHeader}>
                   <View>
                      <Text style={[styles.graphTitle, isLight && { color: '#000' }]}>PEAK ACTIVITY HEATMAP</Text>
                      <Text style={styles.graphSub}>When your audience is most active online</Text>
                   </View>
                   <MaterialCommunityIcons name="clock-fast" size={20} color={VOEXITheme.colors.primary} />
                </View>
                <View style={styles.heatmapRow}>
                   {(stats?.activeHours || []).map((h, i) => (
                     <View key={i} style={styles.heatCol}>
                        <View style={[styles.heatBar, { height: h.val, backgroundColor: h.val > 70 ? '#FFD700' : (isLight ? '#EEE' : '#1A1A24') }]} />
                        <Text style={[styles.heatTime, isLight && { color: '#CCC' }]}>{h.time}</Text>
                     </View>
                   ))}
                </View>
             </View>

             <View style={[styles.demoCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
                <Text style={styles.subSecTitle}>Viewer Loyalty</Text>
                <ProgressItem label="Returning Viewers" percentage={stats?.returningVsNew?.returning || 0} color="#3B82F6" />
                <ProgressItem label="New Viewers" percentage={stats?.returningVsNew?.newViewers || 0} color="#A855F7" />

                <View style={[styles.divider, isLight && { backgroundColor: '#EEE' }]} />

                <Text style={styles.subSecTitle}>Subscription Status</Text>
                <ProgressItem label="Subscribed" percentage={stats?.subVsUnsub?.subs || 0} color="#00C851" />
                <ProgressItem label="Not Subscribed" percentage={stats?.subVsUnsub?.unsub || 0} color="#FF4444" />
             </View>

             <View style={[styles.demoCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE', marginTop: 20 }]}>
                <Text style={styles.subSecTitle}>Content Affinity (Psychographics)</Text>
                <Text style={styles.affinityIntro}>Based on audience interaction patterns</Text>
                {(stats?.contentAffinity || []).map((aff, i) => (
                  <View key={i} style={styles.affinityItem}>
                     <View style={styles.affinityRow}>
                        <View style={{flex: 1}}>
                           <Text style={[styles.progLabel, {fontWeight: 'bold', color: isLight ? '#000' : '#fff'}]}>{aff.type}</Text>
                           <Text style={[styles.affinityDesc, isLight && { color: '#888' }]}>{aff.description}</Text>
                        </View>
                        <Text style={styles.progVal}>{aff.val}%</Text>
                     </View>
                     <View style={styles.progTrack}>
                        <View style={[styles.progFill, {width: `${aff.val}%`, backgroundColor: i % 2 === 0 ? VOEXITheme.colors.primary : VOEXITheme.colors.secondary}]} />
                     </View>
                  </View>
                ))}
             </View>

             {/* TOP VIEWING LOCATIONS / COUNTRIES */}
             <View style={[styles.demoCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE', marginTop: 20 }]}>
                <Text style={styles.subSecTitle}>Top Viewing Locations</Text>
                <Text style={styles.affinityIntro}>Real-time geographical viewer reach</Text>
                {(!stats?.demographics?.countries || stats.demographics.countries.length === 0) ? (
                  <Text style={{ color: '#888', fontSize: 11, paddingVertical: 8 }}>No location logs recorded yet.</Text>
                ) : (
                  stats.demographics.countries.map((c: any, i: number) => (
                    <ProgressItem key={i} label={`${c.name} (${c.count ? c.count.toLocaleString() : 0} Viewers)`} percentage={c.val} color="#00F2FE" />
                  ))
                )}
             </View>

             {/* GENDER & AGE BREAKDOWN */}
             <View style={[styles.demoCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE', marginTop: 20 }]}>
                <Text style={styles.subSecTitle}>Gender & Age Breakdown</Text>
                <Text style={styles.affinityIntro}>Viewer demographics ratio</Text>

                <Text style={[styles.subSecTitle, { fontSize: 11, marginTop: 10, color: VOEXITheme.colors.primary }]}>Gender Ratio</Text>
                {(!stats?.demographics?.gender || stats.demographics.gender.length === 0) ? (
                  <Text style={{ color: '#888', fontSize: 11, paddingVertical: 4 }}>No gender logs recorded yet.</Text>
                ) : (
                  stats.demographics.gender.map((g: any, i: number) => (
                    <ProgressItem key={i} label={`${g.type} (${g.count ? g.count.toLocaleString() : 0} Viewers)`} percentage={g.val} color={g.type === 'Male' ? '#3B82F6' : '#EC4899'} />
                  ))
                )}

                <View style={[styles.divider, isLight && { backgroundColor: '#EEE' }]} />

                <Text style={[styles.subSecTitle, { fontSize: 11, marginTop: 10, color: VOEXITheme.colors.secondary }]}>Age Groups</Text>
                {(!stats?.demographics?.ages || stats.demographics.ages.length === 0) ? (
                  <Text style={{ color: '#888', fontSize: 11, paddingVertical: 4 }}>No age logs recorded yet.</Text>
                ) : (
                  stats.demographics.ages.map((a: any, i: number) => (
                    <ProgressItem key={i} label={`${a.range} (${a.count ? a.count.toLocaleString() : 0} Viewers)`} percentage={a.val} color="#A855F7" />
                  ))
                )}
             </View>

             <View style={[styles.demoCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE', marginTop: 20 }]}>
                <Text style={styles.subSecTitle}>Gender Distribution</Text>
                {stats?.demographics.gender.map(g => (
                  <ProgressItem key={g.type} label={g.type} percentage={g.val} color={g.type === 'Male' ? '#3B82F6' : '#EC4899'} />
                ))}
                <View style={[styles.divider, isLight && { backgroundColor: '#EEE' }]} />
                <Text style={styles.subSecTitle}>Age Distribution</Text>
                {stats?.demographics.ages.map(a => (
                  <ProgressItem key={a.range} label={a.range} percentage={a.val} color="#A855F7" />
                ))}
             </View>

             <View style={[styles.demoCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE', marginTop: 20 }]}>
                <Text style={styles.subSecTitle}>Content Affinity (Psychographics)</Text>
                <Text style={styles.affinityIntro}>Based on audience interaction patterns</Text>
                {(stats?.contentAffinity || []).map((aff, i) => (
                  <View key={i} style={styles.affinityItem}>
                     <View style={styles.affinityRow}>
                        <View style={{flex: 1}}>
                           <Text style={[styles.progLabel, {fontWeight: 'bold', color: isLight ? '#000' : '#fff'}]}>{aff.type}</Text>
                           <Text style={[styles.affinityDesc, isLight && { color: '#888' }]}>{aff.description}</Text>
                        </View>
                        <Text style={styles.progVal}>{aff.val}%</Text>
                     </View>
                     <View style={styles.progTrack}>
                        <View style={[styles.progFill, {width: `${aff.val}%`, backgroundColor: i % 2 === 0 ? VOEXITheme.colors.primary : VOEXITheme.colors.secondary}]} />
                     </View>
                  </View>
                ))}
             </View>

             <View style={[styles.demoCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE', marginTop: 20 }]}>
                <Text style={styles.subSecTitle}>Top Geographic Locations</Text>
                {stats?.demographics.countries.map((c, i) => (
                  <View key={i} style={{marginBottom: 12}}>
                     <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5}}>
                        <Text style={[styles.progLabel, {fontSize: 13}]}>{c.name}</Text>
                        <Text style={[styles.progVal, {fontSize: 13}]}>{c.val}%</Text>
                     </View>
                     <View style={[styles.progTrack, {height: 4}]}>
                        <View style={[styles.progFill, {width: `${c.val}%`, backgroundColor: i === 0 ? '#3B82F6' : '#555'}]} />
                     </View>
                  </View>
                ))}
             </View>

             <View style={[styles.demoCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE', marginTop: 20 }]}>
                <Text style={styles.subSecTitle}>Content Affinity (Psychographics)</Text>
                <Text style={styles.affinityIntro}>Based on audience interaction patterns</Text>
                {(stats?.contentAffinity || []).map((aff, i) => (
                  <View key={i} style={styles.affinityItem}>
                     <View style={styles.affinityRow}>
                        <View style={{flex: 1}}>
                           <Text style={[styles.progLabel, {fontWeight: 'bold', color: isLight ? '#000' : '#fff'}]}>{aff.type}</Text>
                           <Text style={[styles.affinityDesc, isLight && { color: '#888' }]}>{aff.description}</Text>
                        </View>
                        <Text style={styles.progVal}>{aff.val}%</Text>
                     </View>
                     <View style={styles.progTrack}>
                        <View style={[styles.progFill, {width: `${aff.val}%`, backgroundColor: i % 2 === 0 ? VOEXITheme.colors.primary : VOEXITheme.colors.secondary}]} />
                     </View>
                  </View>
                ))}
             </View>

             <View style={[styles.demoCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE', marginTop: 20 }]}>
                <Text style={styles.subSecTitle}>Device Intelligence</Text>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                   {stats?.demographics.devices.map(d => (
                     <View key={d.type} style={{alignItems: 'center', flex: 1}}>
                        <MaterialCommunityIcons
                          name={d.type === 'Mobile' ? 'cellphone' : d.type === 'Desktop' ? 'desktop-mac' : 'tablet'}
                          size={24}
                          color={isLight ? '#444' : '#fff'}
                        />
                        <Text style={[styles.progVal, {marginTop: 8}]}>{d.val}%</Text>
                        <Text style={[styles.progLabel, {fontSize: 10}]}>{d.type}</Text>
                     </View>
                   ))}
                </View>
             </View>

             <View style={[styles.demoCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE', marginTop: 20 }]}>
                <Text style={styles.subSecTitle}>Content Affinity (Psychographics)</Text>
                <Text style={styles.affinityIntro}>Based on audience interaction patterns</Text>
                {(stats?.contentAffinity || []).map((aff, i) => (
                  <View key={i} style={styles.affinityItem}>
                     <View style={styles.affinityRow}>
                        <View style={{flex: 1}}>
                           <Text style={[styles.progLabel, {fontWeight: 'bold', color: isLight ? '#000' : '#fff'}]}>{aff.type}</Text>
                           <Text style={[styles.affinityDesc, isLight && { color: '#888' }]}>{aff.description}</Text>
                        </View>
                        <Text style={styles.progVal}>{aff.val}%</Text>
                     </View>
                     <View style={styles.progTrack}>
                        <View style={[styles.progFill, {width: `${aff.val}%`, backgroundColor: i % 2 === 0 ? VOEXITheme.colors.primary : VOEXITheme.colors.secondary}]} />
                     </View>
                  </View>
                ))}
             </View>

             <View style={[styles.demoCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE', marginTop: 20 }]}>
                <Text style={styles.subSecTitle}>Discovery Keywords</Text>
                <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
                   {stats?.topSearchTerms.map((term, i) => (
                     <View key={i} style={{backgroundColor: isLight ? '#fff' : '#111', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: isLight ? '#EEE' : '#1A1A24'}}>
                        <Text style={{color: isLight ? '#666' : '#AAA', fontSize: 11, fontWeight: 'bold'}}># {term}</Text>
                     </View>
                   ))}
                </View>
             </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* DEEP DIVE MODAL */}
      <Modal visible={detailModalVisible} transparent animationType="none">
         <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeMetricDetail} />
            <Animated.View style={[styles.detailSheet, { transform: [{ translateY: slideAnim }], backgroundColor: isLight ? '#FFF' : '#050505', borderColor: isLight ? '#EEE' : '#1A1A24' }]}>
               <View style={[styles.dragBar, isLight && { backgroundColor: '#EEE' }]} />
               <View style={styles.detailHeader}>
                  <Ionicons name={selectedMetric?.icon} size={32} color={selectedMetric?.color} />
                  <Text style={[styles.detailSheetTitle, isLight && { color: '#000' }]}>{selectedMetric?.title}</Text>
                  <TouchableOpacity onPress={closeMetricDetail} style={[styles.modalCloseBtn, isLight && { backgroundColor: '#F5F5F5' }]}><Ionicons name="close" size={20} color={isLight ? '#000' : "#fff"} /></TouchableOpacity>
               </View>
               <View style={[styles.lifetimeBox, isLight && { backgroundColor: '#F9F9F9' }]}>
                  <Text style={[styles.lifetimeVal, isLight && { color: '#000' }]}>{selectedMetric?.value}</Text>
                  <Text style={styles.lifetimeLabel}>TOTAL ({activeRange})</Text>
               </View>

               <Text style={[styles.dailyTitle, isLight && { color: '#999' }]}>Trend Breakdown</Text>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 20}}>
                  <View style={[styles.chartContainer, { width: Math.max(width - 50, (selectedMetric?.dailyData.length || 0) * 35) }]}>
                     {selectedMetric?.dailyData.map((d: any, i: number) => (
                       <View key={i} style={styles.chartCol}>
                          <View style={[styles.chartBarDetail, { height: (d.val / 100) * 100, backgroundColor: selectedMetric?.color, opacity: 0.6 }]}>
                             {selectedMetric?.dailyData.length < 15 && <Text style={styles.barValText}>{d.val}</Text>}
                          </View>
                          <Text style={styles.chartDay}>{d.day}</Text>
                       </View>
                     ))}
                  </View>
               </ScrollView>
               <TouchableOpacity style={[styles.closeFullBtn, isLight && { backgroundColor: '#000' }]} onPress={closeMetricDetail}><Text style={[styles.closeFullText, isLight && { color: '#FFF' }]}>DISMISS INSIGHTS</Text></TouchableOpacity>
            </Animated.View>
         </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05050C' },
  loadingBox: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#111' },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: VOEXITheme.colors.primary },
  tabText: { color: '#444', fontSize: 11, fontWeight: '900' },
  activeTabText: { color: '#fff' },
  rangeBar: { paddingVertical: 15, backgroundColor: '#08080C' },
  rangePill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#111', marginRight: 10, borderWidth: 1, borderColor: '#1A1A24' },
  rangePillActive: { backgroundColor: VOEXITheme.colors.primary, borderColor: VOEXITheme.colors.primary },
  rangePillText: { color: '#666', fontSize: 11, fontWeight: 'bold' },
  scrollContent: { padding: 20 },

  premiumGraphSection: { backgroundColor: '#0D0D15', padding: 20, borderRadius: 35, marginBottom: 25, borderWidth: 1, borderColor: '#1A1A24' },
  graphHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  graphTitle: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  graphSub: { color: '#444', fontSize: 9, marginTop: 4 },
  graphBadge: { backgroundColor: '#ff444422', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  badgeTxt: { color: '#ff4444', fontSize: 8, fontWeight: '900' },
  pulseGraphContainer: { paddingVertical: 10, marginHorizontal: -10 },
  graphLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  graphLabel: { color: '#222', fontSize: 9, fontWeight: 'bold' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: (width - 55) / 2, backgroundColor: '#0D0D15', padding: 20, borderRadius: 28, marginBottom: 15, borderWidth: 1, borderColor: '#1A1A24', overflow: 'hidden' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  iconCircle: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statVal: { color: '#fff', fontSize: 18, fontWeight: '900' },
  statTitle: { color: '#555', fontSize: 9, fontWeight: 'bold', marginTop: 4 },
  trendTxt: { fontSize: 10, fontWeight: '900' },
  cardFooter: { marginTop: 12, borderTopWidth: 0.5, borderTopColor: '#1A1A24', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLabel: { color: '#222', fontSize: 8, fontWeight: '900' },

  ratingVisualCard: { marginBottom: 25, borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: '#1A1A24' },
  ratingGrad: { padding: 25, flexDirection: 'row', alignItems: 'center' },
  ratingLeft: { alignItems: 'center', width: '40%' },
  ratingScore: { color: '#fff', fontSize: 42, fontWeight: '900' },
  starsRow: { flexDirection: 'row', gap: 2, marginVertical: 5 },
  ratingLabel: { color: '#444', fontSize: 9, fontWeight: 'bold' },
  ratingDivider: { width: 1, height: 80, backgroundColor: '#1A1A24', marginHorizontal: 20 },
  ratingRight: { flex: 1 },
  ratingTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  ratingSub: { color: '#444', fontSize: 11, marginTop: 4, lineHeight: 16 },

  typeSelector: { marginBottom: 20 },
  typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15, borderWidth: 1, borderColor: '#111', marginRight: 10 },
  typeBtnText: { color: '#444', fontSize: 10, fontWeight: '900' },
  videoItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D0D15', padding: 12, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: '#1A1A24' },
  videoThumb: { width: 44, height: 44, borderRadius: 12 },
  videoTitle: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  vStatText: { color: '#666', fontSize: 11 },

  eliteCard: { width: 160, height: 220, borderRadius: 20, marginRight: 15, overflow: 'hidden', backgroundColor: '#111', borderWidth: 1, borderColor: '#1A1A24' },
  eliteThumb: { width: '100%', height: '100%' },
  eliteOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 12 },
  eliteBadge: { backgroundColor: '#A855F7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8 },
  eliteBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  eliteTitle: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  eliteStat: { color: '#AAA', fontSize: 10, marginTop: 2 },

  audienceView: { paddingBottom: 40 },
  emptyContent: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#222', fontSize: 13, marginTop: 10, fontWeight: 'bold' },

  graphSection: { backgroundColor: '#0D0D15', padding: 25, borderRadius: 30, marginBottom: 20, borderWidth: 1, borderColor: '#1A1A24' },
  heatmapRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 100 },
  heatCol: { alignItems: 'center', gap: 10 },
  heatBar: { width: 12, borderRadius: 6 },
  heatTime: { color: '#222', fontSize: 8, fontWeight: 'bold' },

  sectionTitle: { color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15, marginTop: 20, textTransform: 'uppercase' },
  demoCard: { backgroundColor: '#0D0D15', padding: 25, borderRadius: 30, borderWidth: 1, borderColor: '#1A1A24' },
  subSecTitle: { color: '#666', fontSize: 10, fontWeight: '900', marginBottom: 15 },
  affinityIntro: { color: '#444', fontSize: 9, marginBottom: 15 },
  affinityItem: { marginBottom: 20 },
  affinityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  affinityDesc: { color: '#555', fontSize: 10, marginTop: 4 },
  progItem: { marginBottom: 15 },
  progLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progLabel: { color: '#888', fontSize: 12 },
  progVal: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  progTrack: { height: 6, backgroundColor: '#000', borderRadius: 3, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: 3 },
  divider: { height: 1, backgroundColor: '#111', marginVertical: 20 },

  engagementSection: { backgroundColor: '#0D0D15', padding: 20, borderRadius: 28, marginBottom: 15, borderWidth: 1, borderColor: '#1A1A24' },
  performanceStatusText: { color: '#666', fontSize: 11, marginBottom: 20, fontStyle: 'italic', lineHeight: 16 },
  engRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  engItem: { flex: 1, alignItems: 'center' },
  engVal: { color: '#fff', fontSize: 18, fontWeight: '900' },
  engLab: { color: '#444', fontSize: 8, fontWeight: '900', marginTop: 4, marginBottom: 8, textTransform: 'uppercase' },
  engBarBg: { width: '100%', height: 4, backgroundColor: '#000', borderRadius: 2, overflow: 'hidden' },
  engBarFill: { height: '100%', borderRadius: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'flex-end' },
  detailSheet: { backgroundColor: '#050505', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, paddingBottom: 60, height: '85%', borderTopWidth: 1, borderColor: '#1A1A24' },
  dragBar: { width: 40, height: 4, backgroundColor: '#222', alignSelf: 'center', marginBottom: 25 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 30 },
  detailSheetTitle: { color: '#fff', fontSize: 24, fontWeight: '900', flex: 1 },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  lifetimeBox: { padding: 30, borderRadius: 30, alignItems: 'center', backgroundColor: '#0D0D15', marginBottom: 30 },
  lifetimeVal: { color: '#fff', fontSize: 48, fontWeight: '900' },
  lifetimeLabel: { color: '#444', fontSize: 10, fontWeight: '900', marginTop: 5 },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150, paddingVertical: 10 },
  chartCol: { alignItems: 'center', gap: 8, marginHorizontal: 5 },
  chartBarDetail: { width: 25, borderRadius: 6, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 5 },
  barValText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  chartDay: { color: '#666', fontSize: 9, fontWeight: 'bold' },
  closeFullBtn: { marginTop: 40, padding: 20, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center' },
  closeFullText: { color: '#000', fontWeight: '900', fontSize: 12 },
  dailyTitle: { color: '#fff', fontSize: 14, fontWeight: '900', marginBottom: 20, textAlign: 'center' }
});
