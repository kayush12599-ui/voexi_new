import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SERVER_IP, AVATAR_SERVER_PORT } from '../../constants/config';
import { AvatarAsset, EquippedState } from '../../avatar/lib/AvatarAssetRegistry';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    console.warn("WebView native module not found:", e);
  }
}

export interface Avatar3DEngineProps {
  modelUrl?: string;
  gender?: 'male' | 'female';
  topColor?: string;
  bottomColor?: string;
  debugMode?: boolean;
  onEngineReady?: () => void;
  onModelLoaded?: () => void;
  onProgress?: (percent: number) => void;
  onError?: (error: string) => void;
}

export interface Avatar3DEngineRef {
  setGender: (gender: 'male' | 'female', modelUrl?: string) => void;
  setOutfitColor: (topColor?: string, bottomColor?: string) => void;
  setHair: (hairStyle: string, hairColor?: string) => void;
  setShirt: (shirtStyle: string, shirtColor?: string) => void;
  setPant: (pantStyle: string, pantColor?: string) => void;
  setGear: (gearStyle: string, gearColor?: string) => void;
  setShoe: (shoeStyle: string, shoeColor?: string) => void;
  setSock: (sockStyle: string, sockColor?: string) => void;
  playTalking: () => void;
  playIdle: () => void;
  playDance: () => void;
  playFlex: () => void;
  playWave: () => void;
  playPowerUp: () => void;
  loadCustomModel: (modelUrl: string, itemName?: string, price?: number, genderTarget?: string) => void;
  loadCustomEmote: (emoteUrl: string, itemName?: string, price?: number, genderTarget?: string) => void;
  equipAsset: (asset: AvatarAsset) => void;
  equipState: (state: EquippedState) => void;
  playEmote: (emoteAsset: AvatarAsset) => void;
  stopEmote: () => void;
  setDebugMode: (enabled: boolean) => void;
}

export const Avatar3DEngine = forwardRef<Avatar3DEngineRef, Avatar3DEngineProps>(({
  modelUrl = '',
  gender = 'male',
  topColor,
  bottomColor,
  debugMode = false,
  onEngineReady,
  onModelLoaded,
  onProgress,
  onError
}, ref) => {
  const webViewRef = useRef<any>(null);
  const iframeRef = useRef<any>(null);

  const sendCommand = (cmd: object) => {
    if (!cmd) return;
    const jsonStr = JSON.stringify(cmd);
    if (Platform.OS === 'web') {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(jsonStr, '*');
      }
    } else if (webViewRef.current) {
      webViewRef.current.postMessage(jsonStr);
    }
  };

  useImperativeHandle(ref, () => ({
    setGender: (newGender: 'male' | 'female', newModelUrl?: string) => {
      sendCommand({
        type: 'setGender',
        gender: newGender,
        modelUrl: newModelUrl || modelUrl
      });
    },
    setOutfitColor: (top?: string, bottom?: string) => {
      sendCommand({
        type: 'setOutfitColor',
        topColor: top || topColor,
        bottomColor: bottom || bottomColor
      });
    },
    setHair: (hairStyle: string, hairColor?: string) => {
      sendCommand({
        type: 'setHair',
        hairStyle,
        hairColor
      });
    },
    setShirt: (shirtStyle: string, shirtColor?: string) => {
      sendCommand({
        type: 'setShirt',
        shirtStyle,
        shirtColor
      });
    },
    setPant: (pantStyle: string, pantColor?: string) => {
      sendCommand({
        type: 'setPant',
        pantStyle,
        pantColor
      });
    },
    setGear: (gearStyle: string, gearColor?: string) => {
      sendCommand({
        type: 'setGear',
        gearStyle,
        gearColor
      });
    },
    setShoe: (shoeStyle: string, shoeColor?: string) => {
      sendCommand({
        type: 'setShoe',
        shoeStyle,
        shoeColor
      });
    },
    setSock: (sockStyle: string, sockColor?: string) => {
      sendCommand({
        type: 'setSock',
        sockStyle,
        sockColor
      });
    },
    playTalking: () => {
      sendCommand({ type: 'playTalking' });
    },
    playIdle: () => {
      sendCommand({ type: 'playIdle' });
    },
    playDance: () => {
      sendCommand({ type: 'playDance' });
    },
    playFlex: () => {
      sendCommand({ type: 'playFlex' });
    },
    playWave: () => {
      sendCommand({ type: 'playWave' });
    },
    playPowerUp: () => {
      sendCommand({ type: 'playPowerUp' });
    },
    loadCustomModel: (url: string, itemName?: string, price?: number, genderTarget?: string) => {
      sendCommand({ type: 'loadCustomModel', modelUrl: url, name: itemName, price, gender: genderTarget });
    },
    loadCustomEmote: (url: string, itemName?: string, price?: number, genderTarget?: string) => {
      sendCommand({ type: 'setEmoteFile', emoteUrl: url, name: itemName, price, gender: genderTarget });
    },

    equipAsset: (asset: AvatarAsset) => {
      sendCommand({
        type: 'equipAsset',
        asset
      });
    },
    equipState: (state: EquippedState) => {
      sendCommand({
        type: 'equipState',
        state
      });
    },
    playEmote: (emoteAsset: AvatarAsset) => {
      sendCommand({
        type: 'playEmoteAsset',
        asset: emoteAsset
      });
    },
    stopEmote: () => {
      sendCommand({ type: 'playIdle' });
    },
    setDebugMode: (enabled: boolean) => {
      sendCommand({ type: 'setDebugMode', enabled });
    }
  }));

  const initialStageUrl = useRef(
    `http://${SERVER_IP}:${AVATAR_SERVER_PORT}/avatar/web/stage.html?model=${encodeURIComponent(modelUrl)}&gender=${gender.toLowerCase()}&debug=${debugMode ? '1' : '0'}`
  ).current;

  useEffect(() => {
    if (gender || modelUrl) {
      sendCommand({
        type: 'setGender',
        gender: gender.toLowerCase(),
        modelUrl: modelUrl
      });
    }
  }, [gender, modelUrl]);

  useEffect(() => {
    if (topColor || bottomColor) {
      sendCommand({
        type: 'setOutfitColor',
        topColor,
        bottomColor
      });
    }
  }, [topColor, bottomColor]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleWebMessage = (event: MessageEvent) => {
        try {
          const rawData = event.data;
          if (!rawData || typeof rawData !== 'string') return;

          const data = JSON.parse(rawData);
          if (!data || !data.type) return;

          switch (data.type) {
            case 'ENGINE_READY':
              onEngineReady?.();
              break;
            case 'MODEL_LOADED':
              onModelLoaded?.();
              break;
            case 'PROGRESS':
              onProgress?.(data.percent || 0);
              break;
            case 'ERROR':
              onError?.(data.error || 'Unknown 3D Engine Error');
              break;
          }
        } catch (err) {}
      };

      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, []);

  const handleMessage = (event: any) => {
    try {
      const rawData = event?.nativeEvent?.data;
      if (!rawData || typeof rawData !== 'string') return;

      const data = JSON.parse(rawData);
      if (!data || !data.type) return;

      switch (data.type) {
        case 'ENGINE_READY':
          onEngineReady?.();
          break;
        case 'MODEL_LOADED':
          onModelLoaded?.();
          break;
        case 'PROGRESS':
          onProgress?.(data.percent || 0);
          break;
        case 'ERROR':
          onError?.(data.error || 'Unknown 3D Engine Error');
          break;
        case 'DIAGNOSTICS':
          if (__DEV__ || debugMode) {
            console.log('[VOEXI Avatar Diagnostics]', data.payload);
          }
          break;
      }
    } catch (err) {}
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          ref={iframeRef}
          src={initialStageUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: 'transparent'
          }}
          allow="autoplay; fullscreen"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {WebView ? (
        <WebView
          ref={webViewRef}
          source={{ uri: initialStageUrl }}
          style={styles.webview}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          androidLayerType="hardware"
          renderToHardwareTextureAndroid={true}
          androidHardwareAccelerationDisabled={false}
          cacheEnabled={true}
          incognito={false}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          onMessage={handleMessage}
          onError={(syntheticEvent: any) => {
            const { nativeEvent } = syntheticEvent;
            onError?.(`WebView Load Failed: ${nativeEvent.description}`);
          }}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030308',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
