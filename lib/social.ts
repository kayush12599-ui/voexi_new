import { supabase } from './supabase';
import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

// Custom simple event emitter for global sync
type Listener = (data: FollowStatus) => void;
class FollowEmitter {
  private listeners: Listener[] = [];
  subscribe(fn: Listener) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }
  emit(data: FollowStatus) {
    this.listeners.forEach(l => l(data));
  }
}

const followEmitter = new FollowEmitter();

export interface FollowStatus {
  creatorId: string;
  isFollowing: boolean;
  subsCount?: number;
}

export function subscribeToFollows(fn: Listener) {
  return followEmitter.subscribe(fn);
}

/**
 * Validates if string is a valid PostgreSQL UUID
 */
const isValidUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

/**
 * Checks if a user is subscribed to a creator.
 */
export async function isSubscribed(followerId: string, creatorId: string): Promise<boolean> {
  if (!isValidUuid(followerId) || !isValidUuid(creatorId)) return false;
  try {
    const { data, error } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', followerId)
      .eq('creator_id', creatorId)
      .maybeSingle();

    if (error) return false;
    return !!data;
  } catch (error) {
    return false;
  }
}

/**
 * Gets total subscriber count for a creator.
 */
export async function getSubscriberCount(creatorId: string): Promise<number> {
  if (!isValidUuid(creatorId)) return 0;
  try {
    const { count, error } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creatorId);
    return count || 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Subscribes to a creator.
 */
export async function subscribeToCreator(followerId: string, creatorId: string) {
  if (!isValidUuid(followerId) || !isValidUuid(creatorId) || followerId === creatorId) {
    return { success: false };
  }
  try {
    // 1. Check if already subscribed
    const { data: existing } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', followerId)
      .eq('creator_id', creatorId)
      .maybeSingle();

    if (existing) {
      const newCount = await getSubscriberCount(creatorId);
      followEmitter.emit({ creatorId, isFollowing: true, subsCount: newCount });
      return { success: true };
    }

    // 2. Perform clean insert
    const { error: insertErr } = await supabase
      .from('followers')
      .insert({ follower_id: followerId, creator_id: creatorId });

    if (insertErr) {
      if (insertErr.code === '23505') {
        const newCount = await getSubscriberCount(creatorId);
        followEmitter.emit({ creatorId, isFollowing: true, subsCount: newCount });
        return { success: true };
      }
      console.warn("[SUBSCRIBE_INSERT_WARN]", insertErr);
      return { success: false, error: insertErr };
    }

    const newCount = await getSubscriberCount(creatorId);
    followEmitter.emit({ creatorId, isFollowing: true, subsCount: newCount });
    return { success: true };
  } catch (error: any) {
    console.warn("[SUBSCRIBE_CATCH_WARN]", error);
    return { success: false, error };
  }
}

/**
 * Unsubscribes from a creator.
 */
export async function unsubscribeFromCreator(followerId: string, creatorId: string) {
  if (!isValidUuid(followerId) || !isValidUuid(creatorId)) return { success: false };
  try {
    const { error } = await supabase
      .from('followers')
      .delete()
      .eq('follower_id', followerId)
      .eq('creator_id', creatorId);

    if (error) throw error;

    const newCount = await getSubscriberCount(creatorId);
    followEmitter.emit({ creatorId, isFollowing: false, subsCount: newCount });
    return { success: true };
  } catch (error) {
    console.warn("[UNSUBSCRIBE_WARN]", error);
    return { success: false, error };
  }
}

/**
 * Hook for global subscribe synchronization
 */
export function useFollow(currentUserId: string | null, creatorId: string, initialStatus: boolean = false) {
  const [following, setFollowing] = useState(initialStatus);
  const [subsCount, setSubsCount] = useState(0);

  useEffect(() => {
    if (!creatorId) return;

    // Fetch initial state
    const fetchInitial = async () => {
        const count = await getSubscriberCount(creatorId);
        setSubsCount(count);

        if (isValidUuid(currentUserId)) {
            const status = await isSubscribed(currentUserId!, creatorId);
            setFollowing(status);
        } else {
            setFollowing(false);
        }
    };

    fetchInitial();

    const unsubscribe = followEmitter.subscribe((data) => {
      if (data.creatorId === creatorId) {
        setFollowing(data.isFollowing);
        if (data.subsCount !== undefined) {
           setSubsCount(data.subsCount);
        }
      }
    });

    return () => unsubscribe();
  }, [creatorId, currentUserId]);

  const toggleFollow = async () => {
    if (!currentUserId || !isValidUuid(currentUserId)) {
        Alert.alert("Login Required", "Please login to subscribe to this station.");
        return;
    }
    if (!creatorId || !isValidUuid(creatorId) || currentUserId === creatorId) return;

    try {
      if (!following) {
        // Instant Optimistic Subscribe
        setFollowing(true);
        setSubsCount(prev => prev + 1);
        await subscribeToCreator(currentUserId, creatorId);
      } else {
        // Instant Optimistic Unsubscribe
        setFollowing(false);
        setSubsCount(prev => Math.max(0, prev - 1));
        await unsubscribeFromCreator(currentUserId, creatorId);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (e) {
      console.warn("[TOGGLE_FOLLOW_WARN]", e);
    }
  };

  return { isFollowing: following, subsCount, toggleFollow };
}
