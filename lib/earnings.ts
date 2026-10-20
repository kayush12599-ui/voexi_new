import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalMediaServerUrl } from './bunnyStorage';

const isValidUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

// Helper to update local post stats in @my_local_uploads
const updateLocalUploadStat = async (postId: string, statName: string, deltaOrVal: number, isDirectSet = false) => {
  try {
    const raw = await AsyncStorage.getItem('@my_local_uploads');
    if (!raw) return;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return;

    const updated = list.map((item: any) => {
      if (String(item.id) === String(postId) || String(item.filename) === String(postId) || String(item.title) === String(postId)) {
        const current = Number(item[statName]) || 0;
        const newVal = isDirectSet ? deltaOrVal : Math.max(0, current + deltaOrVal);
        return { ...item, [statName]: newVal };
      }
      return item;
    });

    await AsyncStorage.setItem('@my_local_uploads', JSON.stringify(updated));
  } catch (e) {}
};

export const recordView = async (postId: string, creatorId: string, viewerId?: string, searchTerm?: string) => {
  try {
    if (!postId) return null;

    // 1. Always update local device storage stats
    await updateLocalUploadStat(postId, 'views_count', 1);

    // 2. Sync to local Media Server
    fetch(`${getLocalMediaServerUrl()}/api/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: postId })
    }).catch(() => {});

    if (!isValidUuid(postId)) return null;

    // 3. Log for Supabase DB
    try {
      await supabase.from('analytics_views_log').insert({
        post_id: postId,
        creator_id: creatorId,
        viewer_id: viewerId || null
      });
    } catch (e) {}

    // 4. Log for Detailed Video Analytics
    if (viewerId && viewerId !== creatorId && isValidUuid(viewerId)) {
      try {
        const { data: follow } = await supabase.from('followers').select('id').eq('follower_id', viewerId).eq('creator_id', creatorId).maybeSingle();
        const { data: prevView } = await supabase.from('video_analytics_logs').select('id').eq('post_id', postId).eq('viewer_id', viewerId).maybeSingle();

        await supabase.from('video_analytics_logs').insert({
          post_id: postId,
          viewer_id: viewerId,
          is_subscriber: !!follow,
          is_returning_viewer: !!prevView,
          search_term: searchTerm || null
        });
      } catch (e) {}
    }

    // 5. ATOMIC INCREMENT for the post counter
    try {
      const { error } = await supabase.rpc('increment_post_stat', {
        target_post_id: postId,
        col_name: 'views_count'
      });

      if (error) {
        const { data } = await supabase.from('posts').select('views_count').eq('id', postId).single();
        const current = Number(data?.views_count || 0);
        await supabase.from('posts').update({ views_count: current + 1 }).eq('id', postId);
      }
    } catch (e) {}

    // 6. Monetization Logic
    if (viewerId && viewerId !== creatorId && isValidUuid(viewerId)) {
      try {
        const { data: profile } = await supabase.from('profiles').select('monetization_enabled').eq('id', creatorId).single();
        if (profile?.monetization_enabled) {
          const amount = 0.01;
          await supabase.from('channel_revenue').insert({
            user_id: creatorId, post_id: postId, viewer_id: viewerId, amount: amount, type: 'video_view'
          });
          await supabase.rpc('increment_channel_balance', { target_uid: creatorId, amount_to_add: amount });
        }
      } catch (e) {}
    }

    const { data: updatedPost } = await supabase.from('posts').select('views_count').eq('id', postId).single();
    return Number(updatedPost?.views_count || 0);
  } catch (e) {
    console.error('Record View Error:', e);
    return null;
  }
};

export const recordRetention = async (postId: string, viewerId: string | null, interested: boolean) => {
  try {
    if (isValidUuid(postId)) {
      await supabase.rpc('record_retention', { p_post_id: postId, p_viewer_id: viewerId, p_interested: interested });
    }
  } catch (e) {}
};

export const checkDailyLogin = async (userId: string) => {
  try {
    if (!isValidUuid(userId)) return;
    const today = new Date().toISOString().split('T')[0];
    const refId = `daily_${userId}_${today}`;
    return await supabase.rpc('reward_user_coins', { user_id: userId, amount_to_add: 5, ref_id: refId, description: `Daily Login Reward` });
  } catch (e) {}
};

export const recordSave = async (postId: string) => {
  try {
    if (!postId) return;
    await updateLocalUploadStat(postId, 'saves_count', 1);
    if (isValidUuid(postId)) {
      await supabase.rpc('increment_post_stat', { target_post_id: postId, col_name: 'saves_count' });
    }
  } catch (e) {}
};

export const recordLike = async (postId: string, userId: string | null, isLiking: boolean) => {
  try {
    if (!postId) return;

    // 1. Always save in local device storage for 100% instant persistence
    await AsyncStorage.setItem(`liked_${postId}`, JSON.stringify(isLiking));
    await updateLocalUploadStat(postId, 'likes_count', isLiking ? 1 : -1);

    // 2. Sync to Local Media Server
    fetch(`${getLocalMediaServerUrl()}/api/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, isLiked: isLiking })
    }).catch(() => {});

    // 3. Sync to Supabase DB if valid UUID
    if (userId && isValidUuid(postId) && isValidUuid(userId)) {
      if (isLiking) {
        await supabase.from('likes').upsert({ post_id: postId, user_id: userId }, { onConflict: 'post_id,user_id' });
        const { error } = await supabase.rpc('increment_post_stat', { target_post_id: postId, col_name: 'likes_count', amount: 1 });
        if (error) {
          const { data } = await supabase.from('posts').select('likes_count').eq('id', postId).single();
          const current = Number(data?.likes_count || 0);
          await supabase.from('posts').update({ likes_count: current + 1 }).eq('id', postId);
        }
      } else {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId);
        const { error } = await supabase.rpc('increment_post_stat', { target_post_id: postId, col_name: 'likes_count', amount: -1 });
        if (error) {
          const { data } = await supabase.from('posts').select('likes_count').eq('id', postId).single();
          const current = Number(data?.likes_count || 0);
          await supabase.from('posts').update({ likes_count: Math.max(0, current - 1) }).eq('id', postId);
        }
      }
    }
  } catch (e) {
    console.error('Record Like Error:', e);
  }
};

export const recordShare = async (postId: string) => {
  try {
    if (!postId) return;

    // 1. Always update local device storage stats
    await updateLocalUploadStat(postId, 'shares_count', 1);

    // 2. Sync to Local Media Server
    fetch(`${getLocalMediaServerUrl()}/api/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId })
    }).catch(() => {});

    // 3. Sync to Supabase DB if valid UUID
    if (isValidUuid(postId)) {
      const { error } = await supabase.rpc('increment_post_stat', { target_post_id: postId, col_name: 'shares_count', amount: 1 });
      if (error) {
        const { data } = await supabase.from('posts').select('shares_count').eq('id', postId).single();
        const current = Number(data?.shares_count || 0);
        await supabase.from('posts').update({ shares_count: current + 1 }).eq('id', postId);
      }
    }
  } catch (e) {
    console.error('Record Share Error:', e);
  }
};

export const updateWatchTime = async (userId: string, videoId: string, secondsWatched: number, totalDuration: number) => {
  try {
    if (userId && isValidUuid(userId)) {
      await supabase.rpc('increment_total_watch_time', { target_uid: userId, minutes_to_add: secondsWatched / 60 });
    }
    if (videoId && isValidUuid(videoId)) {
      await supabase.rpc('increment_post_stat', { target_post_id: videoId, col_name: 'total_watch_time_seconds', amount: Math.floor(secondsWatched) });
    }
  } catch (e) {}
};

export const rewardCoins = async (userId: string, action: string, refId?: string) => {
  if (!isValidUuid(userId)) return { success: false, amount: 0 };
  try {
    const { data } = await supabase.rpc('reward_user_coins', {
        user_id: userId, amount_to_add: action === 'ad_reward' ? 10 : 1, ref_id: refId || `${action}_${Date.now()}`, description: `Reward for ${action}`
    });
    return { success: !!data, amount: action === 'ad_reward' ? 10 : 1 };
  } catch (e) {
    return { success: false, amount: 0 };
  }
};
