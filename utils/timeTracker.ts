import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'voexi_usage_stats';

export interface UsageStats {
  [date: string]: number; // date as YYYY-MM-DD, value as seconds
}

export const TimeTracker = {
  async saveTime(seconds: number) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const statsJson = await AsyncStorage.getItem(STORAGE_KEY);
      const stats: UsageStats = statsJson ? JSON.parse(statsJson) : {};

      stats[today] = (stats[today] || 0) + seconds;

      // Keep only last 7 days to save space
      const dates = Object.keys(stats).sort().reverse().slice(0, 7);
      const filteredStats: UsageStats = {};
      dates.forEach(d => {
        filteredStats[d] = stats[d];
      });

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredStats));
    } catch (e) {
      console.error('Error saving time:', e);
    }
  },

  async getStats(): Promise<UsageStats> {
    try {
      const statsJson = await AsyncStorage.getItem(STORAGE_KEY);
      return statsJson ? JSON.parse(statsJson) : {};
    } catch (e) {
      return {};
    }
  },

  formatDuration(totalSeconds: number) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
};
