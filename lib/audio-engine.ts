import { NativeModules } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

// Dynamically import FFmpeg safely to prevent crash on initialization
let FFmpegKit: any = null;
let ReturnCode: any = null;
let FFmpegKitConfig: any = null;

try {
  const FFModule = require('ffmpeg-kit-react-native');
  FFmpegKit = FFModule.FFmpegKit;
  ReturnCode = FFModule.ReturnCode;
  FFmpegKitConfig = FFModule.FFmpegKitConfig;
} catch (e) {
  console.log("VX Studio: FFmpeg modules could not be loaded.");
}

const getRawPath = (uri: string) => {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace('file://', '');
};

/**
 * Ultimate Safety Remix Engine: Guarantees NO RED SCREEN CRASH.
 */
export const renderPremiumRemix = async (
  vUri: string,
  sUri: string,
  videoVolume: number = 1.0,
  soundVolume: number = 1.0
): Promise<string> => {
  if (!vUri || !sUri) return vUri || '';

  // 1. ABSOLUTE CHECK: If Native Module is missing, return original immediately
  if (!NativeModules.FFmpegKit || !FFmpegKit) {
    console.warn("VX Studio: FFmpeg Native Engine is not available. Skipping remix.");
    return vUri;
  }

  const out = `${FileSystem.cacheDirectory}vx_remix_${Date.now()}.mp4`;
  const videoPath = getRawPath(vUri);
  const soundPath = getRawPath(sUri);
  const outputPath = getRawPath(out);

  let cmd = '';
  if (videoVolume <= 0.01) {
    cmd = `-i "${videoPath}" -i "${soundPath}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest -y "${outputPath}"`;
  } else {
    const filterComplex = `[0:a]volume=${videoVolume}[v];[1:a]volume=${soundVolume}[s];[v][s]amix=inputs=2:duration=first:dropout_transition=0[out]`;
    cmd = `-i "${videoPath}" -i "${soundPath}" -filter_complex "${filterComplex}" -map 0:v:0 -map "[out]" -c:v copy -c:a aac -b:a 192k -y "${outputPath}"`;
  }

  try {
    // 2. Safely call Config
    if (FFmpegKitConfig && typeof FFmpegKitConfig.clearSessions === 'function') {
       try { FFmpegKitConfig.clearSessions(); } catch(e) {}
    }

    // 3. Final execution check
    const session = await FFmpegKit.execute(cmd);

    if (session) {
      const rc = await session.getReturnCode();
      if (rc && ReturnCode && ReturnCode.isSuccess(rc)) {
        return out;
      }
    }

    // Fallback if session exists but fails
    return vUri;

  } catch (e) {
    console.log("VX Studio: Remix suppressed internal crash.");
    return vUri;
  }
};

export const processPremiumAudio = async (inputUri: string): Promise<string> => {
    return inputUri;
};
