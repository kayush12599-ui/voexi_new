import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * VOEXI Notification Service
 * Optimized to prevent Expo Go errors while allowing future Native Push support.
 */

// Helper to safely get Notifications module
const getNotifications = () => {
    try {
        return require('expo-notifications');
    } catch (e) {
        return null;
    }
};

export const NotificationService = {
  /**
   * Register for push notifications and save token to user profile
   */
  async registerForPushNotifications(userId: string) {
    // 🛡️ EXPO GO SAFETY CHECK (SDK 53+ doesn't support push in Expo Go)
    if (Constants.appOwnership === 'expo') {
      console.log('[NOTIF] Remote Push is disabled in Expo Go. Use a development build.');
      return null;
    }

    try {
      const Device = require('expo-device');
      const Notifications = getNotifications();
      if (!Notifications || !Device.isDevice) return null;

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return null;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'YOUR_EXPO_PROJECT_ID'
      });
      const token = tokenData.data;

      await supabase.from('profiles').update({ push_token: token }).eq('id', userId);

      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return token;
    } catch (e) {
      return null;
    }
  },

  /**
   * Check if a notification should be shown based on user granular settings
   */
  async shouldNotifyUser(userId: string, category: string) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select(`notif_video, notif_reels, notif_photo, notif_live, notif_profile, notif_analytics, notif_messages, notifications_enabled`)
        .eq('id', userId)
        .maybeSingle();

      if (!profile || !profile.notifications_enabled) return false;

      switch (category) {
        case 'video': return profile.notif_video;
        case 'reels': return profile.notif_reels;
        case 'photo': return profile.notif_photo;
        case 'live': return profile.notif_live;
        case 'profile': return profile.notif_profile;
        case 'analytics': return profile.notif_analytics;
        case 'messages': return profile.notif_messages;
        default: return true;
      }
    } catch (e) {
      return true;
    }
  },

  /**
   * Internal function to log notification in DB
   */
  async logNotificationInDB(userId: string, type: string, message: string, actorId?: string, postId?: string) {
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        type,
        message,
        actor_id: actorId,
        post_id: postId,
        read: false
      });
    } catch (e) {}
  },

  /**
   * Trigger a local notification (Works in Expo Go)
   */
  async triggerLocalNotification(title: string, body: string, data: any = {}) {
    try {
      const Notifications = getNotifications();
      if (!Notifications) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `VOEXI: ${title}`,
          body,
          data,
          sound: true,
          priority: 'max',
        },
        trigger: null,
      });
    } catch (e) {}
  }
};
