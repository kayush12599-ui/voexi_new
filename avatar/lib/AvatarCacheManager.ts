import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CacheEntry {
  assetId: string;
  remoteUrl: string;
  localPath: string;
  version: string;
  cachedAt: number;
}

const CACHE_INDEX_KEY = '@voexi_avatar_cache_index';

export class AvatarCacheManager {
  private static cacheIndex = new Map<string, CacheEntry>();
  private static isInitialized = false;

  private static async init(): Promise<void> {
    if (this.isInitialized) return;
    try {
      const raw = await AsyncStorage.getItem(CACHE_INDEX_KEY);
      if (raw) {
        const list: CacheEntry[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach((entry) => this.cacheIndex.set(entry.assetId, entry));
        }
      }
      this.isInitialized = true;
    } catch (e) {
      console.warn('[VOEXI Avatar Cache] Init failed:', e);
    }
  }

  public static async getCachedAssetUrl(
    assetId: string,
    remoteUrl: string,
    version: string = '1.0.0'
  ): Promise<{ url: string; cacheHit: boolean }> {
    await this.init();

    if (!remoteUrl || remoteUrl.startsWith('procedural:') || remoteUrl.startsWith('data:')) {
      return { url: remoteUrl, cacheHit: true };
    }

    const entry = this.cacheIndex.get(assetId);
    if (entry && entry.version === version && entry.localPath) {
      return { url: entry.localPath, cacheHit: true };
    }

    await this.recordCacheEntry({
      assetId,
      remoteUrl,
      localPath: remoteUrl,
      version,
      cachedAt: Date.now(),
    });

    return { url: remoteUrl, cacheHit: false };
  }

  public static async recordCacheEntry(entry: CacheEntry): Promise<void> {
    await this.init();
    this.cacheIndex.set(entry.assetId, entry);
    try {
      const list = Array.from(this.cacheIndex.values());
      await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(list));
    } catch (e) {}
  }
}
