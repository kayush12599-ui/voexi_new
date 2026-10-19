import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isValidUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const recordView = async (postId: string, creatorId: string, viewerId?: string, searchTerm?: string) => {
  try {
    if (!isValidUuid(postId)) {
      // Sync algorithmically verified view to local Media Server if running
      fetch('http://192.168.31.39:8080/api/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: postId })
      }).catch(() => {});
      return null;
    }

    // 1. Log for Global Aggregates
    await supabase.from('analytics_views_log').insert({
      post_id: postId,
      creator_id: creatorId,
      viewer_id: viewerId || null
    });

    // 2. Log for Detailed Video Analytics (Gender, Age, Search, etc.)
    if (viewerId && viewerId !== creatorId) {
      // Check if subscriber
      const { data: follow } = await supabase.from('followers').select('id').eq('follower_id', viewerId).eq('creator_id', creatorId).maybeSingle();

      // Check if returning viewer (has viewed this video before)
      const { data: prevView } = await supabase.from('video_analytics_logs').select('id').eq('post_id', postId).eq('viewer_id', viewerId).maybeSingle();

      await supabase.from('video_analytics_logs').insert({
        post_id: postId,
        viewer_id: viewerId,
        is_subscriber: !!follow,
        is_returning_viewer: !!prevView,
        search_term: searchTerm || null
      });
    }

    // 3. ATOMIC INCREMENT for the post counter
    await supabase.rpc('increment_post_stat', {
      target_post_id: postId,
      col_name: 'views_count'
    });

    // 3. Monetization Logic
    if (viewerId && viewerId !== creatorId) {
      const { data: profile } = await supabase.from('profiles').select('monetization_enabled').eq('id', creatorId).single();
      if (profile?.monetization_enabled) {
        const amount = 0.01;
        await supabase.from('channel_revenue').insert({
          user_id: creatorId, post_id: postId, viewer_id: viewerId, amount: amount, type: 'video_view'
        });
        await supabase.rpc('increment_channel_balance', { target_uid: creatorId, amount_to_add: amount });
      }
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
    await supabase.rpc('record_retention', { p_post_id: postId, p_viewer_id: viewerId, p_interested: interested });
  } catch (e) {}
};

export const checkDailyLogin = async (userId: string) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const refId = `daily_${userId}_${today}`;
    return await supabase.rpc('reward_user_coins', { user_id: userId, amount_to_add: 5, ref_id: refId, description: `Daily Login Reward` });
  } catch (e) {}
};

export const recordSave = async (postId: string) => {
  try {
    await supabase.rpc('increment_post_stat', { target_post_id: postId, col_name: 'saves_count' });
  } catch (e) {}
};

export const recordLike = async (postId: string, userId: string | null, isLiking: boolean) => {
  try {
    if (!postId) return;

    // 1. Always save in local device storage for 100% instant persistence
    await AsyncStorage.setItem(`liked_${postId}`, JSON.stringify(isLiking));

    // 2. If valid UUID and user is logged in, sync to Supabase DB
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
    } else {
      // Send to local Pen Drive server if running
      fetch('http://192.168.31.39:8080/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, isLiked: isLiking })
      }).catch(() => {});
    }
  } catch (e) {
    console.error('Record Like Error:', e);
  }
};

export const updateWatchTime = async (userId: string, videoId: string, secondsWatched: number, totalDuration: number) => {
  try {
    // 1. Increment Creator's Total Watch Time
    await supabase.rpc('increment_total_watch_time', { target_uid: userId, minutes_to_add: secondsWatched / 60 });

    // 2. Increment Video's Specific Watch Time
    await supabase.rpc('increment_post_stat', { target_post_id: videoId, col_name: 'total_watch_time_seconds', amount: Math.floor(secondsWatched) });
  } catch (e) {}
};

export const rewardCoins = async (userId: string, action: string, refId?: string) => {
  const { data } = await supabase.rpc('reward_user_coins', {
      user_id: userId, amount_to_add: action === 'ad_reward' ? 10 : 1, ref_id: refId || `${action}_${Date.now()}`, description: `Reward for ${action}`
  });
  return { success: !!data, amount: action === 'ad_reward' ? 10 : 1 };
};
