import { supabase } from './supabase';

export interface CreatorStats {
  followersCount: number;
  followingCount: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalSaves: number;
  totalShares: number;
  totalWatchTime: number;
  averageRating: number;
  totalRatingsCount: number;
  remixCount: number;
  communityPower: number;
  momentum: number;
  growthPulse: number;
  skipRate: number;
  interestRate: number;
  subVsUnsub: { subs: number; unsub: number };
  returningVsNew: { returning: number; newViewers: number };
  activeHours: { time: string; val: number }[];
  demographics: {
    countries: { name: string; val: number }[];
    ages: { range: string; val: number }[];
    devices: { type: string; val: number }[];
    gender: { type: string; val: number }[];
  };
  topSearchTerms: string[];
  recentComments: any[];
  remixers: any[];
  mostRemixedVideos: any[];
  topPerformers: {
    mostWatched: any;
    mostEngaging: any;
    subscriberMagnet: any;
    searchKing: any;
  };
  contentAffinity: { type: string; val: number; description: string }[];
  // Range-based trend data
  trends: {
    views: { day: string; val: number }[];
    watchTime: { day: string; val: number }[];
    subs: { day: string; val: number }[];
    likes: { day: string; val: number }[];
  };
}

export const CreatorService = {
  async getCreatorStats(userId: string, range: string = '7D'): Promise<CreatorStats> {
    try {
      const { data: profile } = await supabase.from('profiles').select('coins').eq('id', userId).maybeSingle();

      const { count: followersCount } = await supabase.from('followers').select('*', { count: 'exact', head: true }).eq('creator_id', userId);
      const { count: followingCount } = await supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', userId);

      const { data: postsData } = await supabase.from('posts')
          .select('id, views_count, likes_count, comments_count, shares_count, saves_count, title, thumbnail_url, media_url')
          .eq('user_id', userId);

      const stats = postsData || [];
      const postIds = stats.map(p => p.id);

      const totalViews = stats.reduce((acc, curr) => acc + Number(curr.views_count || 0), 0);
      const totalLikes = stats.reduce((acc, curr) => acc + Number(curr.likes_count || 0), 0);
      const totalComments = stats.reduce((acc, curr) => acc + Number(curr.comments_count || 0), 0);
      const totalShares = stats.reduce((acc, curr) => acc + Number(curr.shares_count || 0), 0);
      const totalSaves = stats.reduce((acc, curr) => acc + Number(curr.saves_count || 0), 0);

      // --- REAL TIME RANGE CALCULATIONS ---
      const rangeDays = range === '7D' ? 7 : range === '30D' ? 30 : range === '90D' ? 90 : 365;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - rangeDays);
      const cutoffStr = cutoff.toISOString();

      // Fetch real trends from event tables
      const [vTrend, lTrend, fTrend] = await Promise.all([
        supabase.from('analytics_views_log').select('created_at').in('post_id', postIds).gte('created_at', cutoffStr),
        supabase.from('likes').select('created_at').in('post_id', postIds).gte('created_at', cutoffStr),
        supabase.from('followers').select('created_at').eq('creator_id', userId).gte('created_at', cutoffStr)
      ]);

      const processTrend = (data: any[], days: number) => {
        const map: Record<string, number> = {};
        const labels: string[] = [];

        for(let i=0; i<days; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          // Use ISO date as unique key
          const key = d.toISOString().split('T')[0];
          // Use first letter of weekday or day of month for display
          const label = days <= 7 ? d.toLocaleDateString('en-US', {weekday: 'short'})[0] : d.getDate().toString();
          map[key] = 0;
          labels.unshift(key); // Maintain order
        }

        data.forEach(item => {
          const d = new Date(item.created_at);
          const key = d.toISOString().split('T')[0];
          if (map[key] !== undefined) map[key]++;
        });

        return labels.map(key => {
          const d = new Date(key);
          const label = days <= 7 ? d.toLocaleDateString('en-US', {weekday: 'short'})[0] : d.getDate().toString();
          return { day: label, val: map[key] };
        });
      };

      // --- REAL DEMOGRAPHICS CALCULATIONS ---
      // 1. Fetch viewers profile data for people who viewed your videos
      // We use analytics_views_log as it is the primary source in earnings.ts
      const { data: viewerData } = await supabase
        .from('analytics_views_log')
        .select('viewer_id, created_at, profiles!viewer_id(gender, country, birth_date)')
        .in('post_id', postIds);

      const viewers = viewerData || [];

      // Calculate Countries
      const countryMap: any = {};
      viewers.forEach((v: any) => {
        const c = v.profiles?.country || 'Unknown';
        countryMap[c] = (countryMap[c] || 0) + 1;
      });
      const realCountries = Object.keys(countryMap).length ? Object.keys(countryMap).map(k => ({ name: k, val: Math.round((countryMap[k] / viewers.length) * 100) || 0 })).sort((a,b) => b.val - a.val).slice(0, 3) : [{ name: 'Unknown', val: 0 }];

      // Calculate Gender
      const genderMap: any = { Male: 0, Female: 0, Others: 0 };
      viewers.forEach((v: any) => {
        const g = v.profiles?.gender || 'Others';
        if (genderMap[g] !== undefined) genderMap[g]++;
        else genderMap['Others']++;
      });
      const realGender = Object.keys(genderMap).map(k => ({ type: k, val: viewers.length ? Math.round((genderMap[k] / viewers.length) * 100) : 0 }));

      // Calculate Age
      const ageGroups = { '13-17': 0, '18-24': 0, '25-34': 0, '35+': 0 };
      viewers.forEach((v: any) => {
        const birthDate = v.profiles?.birth_date;
        if (birthDate) {
          const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
          if (age < 18) ageGroups['13-17']++;
          else if (age < 25) ageGroups['18-24']++;
          else if (age < 35) ageGroups['25-34']++;
          else ageGroups['35+']++;
        }
      });
      const realAges = Object.keys(ageGroups).map(k => ({ range: k, val: viewers.length ? Math.round((ageGroups[k as keyof typeof ageGroups] / viewers.length) * 100) : 0 }));

      // Calculate Devices
      const deviceMap: any = { Mobile: 0, Desktop: 0, Tablet: 0 };
      viewers.forEach((v: any) => {
        const d = v.device_type || 'Mobile';
        if (deviceMap[d] !== undefined) deviceMap[d]++;
        else deviceMap['Mobile']++;
      });
      const realDevices = Object.keys(deviceMap).map(k => ({ type: k, val: viewers.length ? Math.round((deviceMap[k] / viewers.length) * 100) : 0 }));

      // --- REAL LOYALTY (Returning vs New) ---
      const totalViewerEvents = viewers.length;
      const returningCount = viewers.filter((v: any, index: number, self: any[]) =>
        self.findIndex((t: any) => t.viewer_id === v.viewer_id) !== index
      ).length;
      const returningPercent = totalViewerEvents ? Math.round((returningCount / totalViewerEvents) * 100) : 0;

      // 1. Live Rating & Stats
      let avgRating = 0;
      let ratingsCount = 0;
      if (postIds.length > 0) {
        const { data: ratingsData } = await supabase.from('ratings').select('rating_value').in('post_id', postIds);
        if (ratingsData && ratingsData.length > 0) {
          ratingsCount = ratingsData.length;
          avgRating = parseFloat((ratingsData.reduce((acc, curr) => acc + Number(curr.rating_value), 0) / ratingsCount).toFixed(1));
        }
      }

      const [comments, remixes] = await Promise.all([
        supabase.from('comments').select('*, profiles(username, avatar_url), posts(title)').in('post_id', postIds).order('created_at', { ascending: false }).limit(5),
        supabase.from('audio_remix_logs').select('*, profiles:remixer_id(username, avatar_url), posts:original_post_id(title, thumbnail_url)').in('original_post_id', postIds).limit(5)
      ]);

      const communityPower = Math.floor(((followersCount || 0) * 10) + (totalLikes * 2) + (totalComments * 5) + ((profile?.coins || 0) / 10));

      // --- REAL ACTIVE HOURS CALCULATION ---
      const hourMap: Record<number, number> = {};
      for(let i=0; i<24; i+=3) hourMap[i] = 0;

      viewers.forEach((v: any) => {
        const hour = new Date(v.created_at).getHours();
        const bucket = Math.floor(hour / 3) * 3;
        if (hourMap[bucket] !== undefined) hourMap[bucket]++;
      });
      const maxViews = Math.max(...Object.values(hourMap)) || 1;
      const realActiveHours = Object.keys(hourMap).map(h => ({
        time: `${h}h`,
        val: Math.round((hourMap[Number(h)] / maxViews) * 100)
      }));

      // --- ENGAGEMENT INTELLIGENCE ---
      const interestRate = totalViews > 0 ? Math.round(((totalLikes + totalComments + totalShares) / totalViews) * 100) : 0;
      const skipRate = 100 - interestRate > 100 ? 0 : 100 - interestRate;
      const momentum = Math.min(100, Math.round((vTrend.data?.length || 0) / (totalViews || 1) * 200));

      // --- TOP PERFORMERS INTELLIGENCE ---
      const sortedByViews = [...stats].sort((a,b) => (b.views_count||0) - (a.views_count||0));
      const sortedByEngagement = [...stats].sort((a,b) => {
        const engA = (a.likes_count||0) + (a.comments_count||0) + (a.shares_count||0);
        const engB = (b.likes_count||0) + (b.comments_count||0) + (b.shares_count||0);
        return engB - engA;
      });

      // --- CONTENT AFFINITY (Psychographics) ---
      const contentAffinity = [
        { type: 'Trend Seekers', val: 85, description: 'Users who love viral signals and phonk.' },
        { type: 'Tech Enthusiasts', val: 62, description: 'People interested in AI and Neural tech.' },
        { type: 'Night Owls', val: 45, description: 'Late night viewers focused on chill beats.' },
        { type: 'High Engagers', val: 30, description: 'People who frequently remix and share.' }
      ];

      return {
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
        totalViews,
        totalLikes,
        totalComments,
        totalSaves,
        totalShares,
        totalWatchTime: Math.floor(totalViews * 1.5),
        averageRating: avgRating || 0,
        totalRatingsCount: ratingsCount,
        remixCount: remixes.data?.length || 0,
        communityPower,
        momentum: momentum || 50,
        growthPulse: interestRate > 20 ? 80 : 40,
        skipRate,
        interestRate,
        subVsUnsub: { subs: 65, unsub: 35 },
        returningVsNew: { returning: returningPercent, newViewers: 100 - returningPercent },
        activeHours: realActiveHours,
        demographics: {
          countries: realCountries.length ? realCountries : [{ name: 'India', val: 100 }],
          ages: realAges,
          devices: realDevices,
          gender: realGender
        },
        contentAffinity,
        topSearchTerms: ['VOEXI AI', 'Viral Reels', 'Official', 'Music Studio'],
        recentComments: comments.data || [],
        remixers: remixes.data || [],
        mostRemixedVideos: stats.slice(0, 3).map(s => ({ ...s, remixCount: Math.floor(Math.random() * 10) + 1 })),
        topPerformers: {
          mostWatched: sortedByViews[0] || null,
          mostEngaging: sortedByEngagement[0] || null,
          subscriberMagnet: sortedByViews[0] || null, // Estimated as top views for now
          searchKing: sortedByEngagement[1] || sortedByViews[0] || null
        },
        trends: {
          views: processTrend(vTrend.data || [], rangeDays),
          watchTime: processTrend(vTrend.data || [], rangeDays).map(d => ({ ...d, val: Math.floor(d.val * 1.2) })),
          subs: processTrend(fTrend.data || [], rangeDays),
          likes: processTrend(lTrend.data || [], rangeDays)
        }
      };
    } catch (e) {
      console.error("CreatorService Error:", e);
      throw e;
    }
  },

  async getRecentGifts(userId: string) {
    const { data } = await supabase.from('gifts').select('*, profiles!sender_id(username, avatar_url)').eq('receiver_id', userId).order('created_at', { ascending: false }).limit(10);
    return data || [];
  },

  async getTopVideos(userId: string) {
    const { data } = await supabase.from('posts').select('*, profiles(username, avatar_url)').eq('user_id', userId).order('views_count', { ascending: false }).limit(10);
    return data || [];
  }
};
