import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_IP } from '../constants/config';

let activeMediaServerUrl = `http://${SERVER_IP}:8080`;
let activeAvatarServerUrl = `http://${SERVER_IP}:8085`;

const getDynamicWebHost = (): string => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
      return host;
    }
  }
  return SERVER_IP;
};

const CANDIDATE_IPS = [
  getDynamicWebHost(),
  'localhost',
  '127.0.0.1',
  SERVER_IP,
  '10.0.2.2', // Android Emulator Host
];

export const ServerDiscovery = {
  /**
   * Returns current active Media Server URL (Port 8080)
   */
  getMediaServerUrl(): string {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        return `http://${host}:8080`;
      }
    }
    return activeMediaServerUrl;
  },

  /**
   * Returns current active Avatar Server URL (Port 8085)
   */
  getAvatarServerUrl(): string {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        return `http://${host}:8085`;
      }
    }
    return activeAvatarServerUrl;
  },

  /**
   * Fast 400ms Auto-Discovery Health Check
   * Tests all candidate endpoints in parallel and picks the fastest responding host.
   */
  async discoverServers(): Promise<{ mediaUrl: string; avatarUrl: string; isOnline: boolean }> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') {
          activeMediaServerUrl = `http://${host}:8080`;
          activeAvatarServerUrl = `http://${host}:8085`;
          return { mediaUrl: activeMediaServerUrl, avatarUrl: activeAvatarServerUrl, isOnline: true };
        }
      }

      // Check cached working host first
      const cachedHost = await AsyncStorage.getItem('@active_server_host');
      if (cachedHost) {
        const isHostAlive = await this.testHost(cachedHost, 300);
        if (isHostAlive) {
          activeMediaServerUrl = `http://${cachedHost}:8080`;
          activeAvatarServerUrl = `http://${cachedHost}:8085`;
          return { mediaUrl: activeMediaServerUrl, avatarUrl: activeAvatarServerUrl, isOnline: true };
        }
      }

      // Test candidate IPs in parallel
      const checkPromises = CANDIDATE_IPS.map(async (host) => {
        const alive = await this.testHost(host, 400);
        return alive ? host : null;
      });

      const results = await Promise.all(checkPromises);
      const workingHost = results.find((h) => h !== null);

      if (workingHost) {
        activeMediaServerUrl = `http://${workingHost}:8080`;
        activeAvatarServerUrl = `http://${workingHost}:8085`;
        await AsyncStorage.setItem('@active_server_host', workingHost).catch(() => {});
        console.log(`[ServerDiscovery] Active local server found at: ${workingHost}`);
        return { mediaUrl: activeMediaServerUrl, avatarUrl: activeAvatarServerUrl, isOnline: true };
      }

      console.warn('[ServerDiscovery] No local server responding. Falling back to default IP & Supabase.');
      return { mediaUrl: activeMediaServerUrl, avatarUrl: activeAvatarServerUrl, isOnline: false };
    } catch (e) {
      return { mediaUrl: activeMediaServerUrl, avatarUrl: activeAvatarServerUrl, isOnline: false };
    }
  },

  async testHost(host: string, timeoutMs: number): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`http://${host}:8080/health`, { signal: controller.signal }).catch(() => null);
      clearTimeout(timer);
      return Boolean(res && res.ok);
    } catch (e) {
      return false;
    }
  }
};
