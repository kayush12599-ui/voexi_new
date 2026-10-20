import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const EXPO_PROJECT_ID = '10ee8fef-dd05-492f-b9d5-c796a10fe3c6';

// 🛡️ EXPO GO SDK 53+ SAFEGUARD (Prevents side-effect error in Expo Go)
const isExpoGo = Constants.appOwnership === 'expo';

// Helper to safely get Notifications module only in Development / Standalone builds
const getNotifications = () => {
  if (isExpoGo) return null;
  try {
    return require('expo-notifications');
  } catch (e) {
    return null;
  }
};

// Configure Foreground Push Popup Behavior for Native Builds
const Notifications = getNotifications();
if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {}
}

/**
 * Send Remote Expo Push Notification via Expo Push HTTP API
 */
export const sendRemotePushNotification = async (expoPushToken: string, title: string, body: string, data: any = {}) => {
  if (!expoPushToken || typeof expoPushToken !== 'string') return;

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: `VOEXI ⚡ ${title}`,
    body: body,
    data: data,
    priority: 'high',
    badge: 1,
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (e) {
    console.warn('[PUSH NOTIF API ERROR]:', e);
  }
};

export const NotificationService = {
  /**
   * Register for push notifications and save token to user profile
   */
  async registerForPushNotifications(userId: string) {
    if (isExpoGo) {
      console.log('[NOTIF] Expo Go detected: Remote Push is supported in Development / Production APK builds.');
      return null;
    }

    try {
      const Notifs = getNotifications();
      if (!Notifs) return null;

      if (Platform.OS === 'android') {
        await Notifs.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifs.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#A855F7',
        });
      }

      const { status: existingStatus } = await Notifs.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifs.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return null;

      const tokenData = await Notifs.getExpoPushTokenAsync({
        projectId: EXPO_PROJECT_ID
      });
      const token = tokenData?.data;

      if (token && userId) {
        await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
        console.log('[NOTIF] Registered Expo Push Token:', token);
      }

      return token;
    } catch (e) {
      console.warn('[NOTIF REGISTER ERROR]:', e);
      return null;
    }
  },

  /**
   * Send both In-App Notification & Real Mobile Push Notification to target user
   */
  async notifyUser(targetUserId: string, title: string, body: string, type: string = 'general', senderId?: string, postId?: string) {
    if (!targetUserId) return;

    try {
      // 1. Log notification record into Supabase DB
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        sender_id: senderId || null,
        actor_id: senderId || null,
        type: type,
        title: title,
        message: body,
        content: body,
        post_id: postId || null,
        status: 'pending',
        read: false,
        created_at: new Date().toISOString()
      });

      // 2. Fetch target user's push token
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('push_token, notifications_enabled')
        .eq('id', targetUserId)
        .maybeSingle();

      if (targetProfile?.notifications_enabled !== false) {
        // Trigger local on-device alert popup
        await this.triggerLocalNotification(title, body, { type, postId, senderId });

        // Trigger remote Expo push alert
        if (targetProfile?.push_token) {
          await sendRemotePushNotification(targetProfile.push_token, title, body, { type, postId, senderId });
        }
      }
    } catch (e) {
      console.warn('[NOTIFY USER ERROR]:', e);
    }
  },

  /**
   * Trigger a local notification (Works on-device)
   */
  async triggerLocalNotification(title: string, body: string, data: any = {}) {
    if (isExpoGo) return;
    try {
      const Notifs = getNotifications();
      if (!Notifs) return;

      await Notifs.scheduleNotificationAsync({
        content: {
          title: `VOEXI: ${title}`,
          body,
          data,
          sound: 'default',
          priority: 'max',
        },
        trigger: null,
      });
    } catch (e) {}
  }
};
