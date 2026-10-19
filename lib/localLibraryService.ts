import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export interface LocalMedia {
  id: string;
  title: string;
  type: 'video' | 'sound';
  localUri: string;
  remoteUrl?: string;
  thumbnail?: string;
  date: string;
  isHidden: boolean;
}

const STORAGE_KEY = '@voexi_local_library';
const SETTINGS_KEY = '@voexi_local_settings';
const SAVED_SOUNDS_KEY = '@voexi_saved_sounds';

export const LocalLibraryService = {
  async getSavedSounds(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(SAVED_SOUNDS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
  },

  async toggleSaveSound(soundId: string) {
    try {
      const saved = await this.getSavedSounds();
      const updated = saved.includes(soundId) ? saved.filter(id => id !== soundId) : [...saved, soundId];
      await AsyncStorage.setItem(SAVED_SOUNDS_KEY, JSON.stringify(updated));
      return !saved.includes(soundId);
    } catch (e) { return false; }
  },

  async getLibrary(): Promise<LocalMedia[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
  },

  async getSettings() {
    try {
      const data = await AsyncStorage.getItem(SETTINGS_KEY);
      return data ? JSON.parse(data) : { hideLikes: false, hideComments: false };
    } catch (e) { return { hideLikes: false, hideComments: false }; }
  },

  async saveSettings(settings: any) {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {}
  },

  async saveToLibrary(media: LocalMedia) {
    try {
      const lib = await this.getLibrary();
      const updated = [media, ...lib];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  },

  async toggleHide(mediaId: string) {
    try {
      const lib = await this.getLibrary();
      const updated = lib.map(m => m.id === mediaId ? { ...m, isHidden: !m.isHidden } : m);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  },

  async deleteFromLibrary(mediaId: string) {
    try {
      const lib = await this.getLibrary();
      const item = lib.find(m => m.id === mediaId);
      if (item && item.localUri) {
        await FileSystem.deleteAsync(item.localUri, { idempotent: true });
      }
      const updated = lib.filter(m => m.id !== mediaId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  },

  async downloadMedia(remoteUrl: string, title: string, type: 'video' | 'sound', thumbnail?: string) {
    try {
      // 1. Permission Check
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') throw new Error('ERR_PERMISSION_DENIED');

      // 2. ULTRA FALLBACK DIRECTORY LOGIC
      // If documentDirectory is null, construction of path fails. We must have a valid string.
      let baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;

      // If still null (unlikely but happens on some Android builds), use a direct string path
      if (!baseDir) {
        baseDir = 'file:///data/user/0/com.voexi.app/files/';
      }

      // Ensure path ends with slash
      if (!baseDir.endsWith('/')) baseDir += '/';

      const folder = baseDir + 'VOEXIStorage/';

      // Attempt to create folder manually
      const folderInfo = await FileSystem.getInfoAsync(folder);
      if (!folderInfo.exists) {
        await FileSystem.makeDirectoryAsync(folder, { intermediates: true }).catch(e => console.log('Dir create managed'));
      }

      // 3. Create Unique File Name
      const fileName = `VX_${type.toUpperCase()}_${Date.now()}.${type === 'video' ? 'mp4' : 'mp3'}`;
      const localUri = folder + fileName;

      console.log('[LOCAL_STG] Downloading:', remoteUrl, 'TO:', localUri);

      // 4. Download with createDownloadResumable (Best for Android 11+)
      const downloader = FileSystem.createDownloadResumable(remoteUrl, localUri, {});
      const result = await downloader.downloadAsync();

      if (!result || !result.uri) throw new Error("ERR_CORE_IO_FAILURE");

      const media: LocalMedia = {
        id: Math.random().toString(36).substr(2, 9),
        title: title || 'Production',
        type,
        localUri: result.uri,
        remoteUrl,
        thumbnail,
        date: new Date().toISOString(),
        isHidden: false
      };

      await this.saveToLibrary(media);
      return { success: true, media };
    } catch (e: any) {
      console.error('[LOCAL_STG] Critical Error:', e);
      return { success: false, error: e.message || 'IO_FAIL' };
    }
  }
};
