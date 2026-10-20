const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 1. Extensions for Skia, 3D Assets, and Modules
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs', 'svg'];
config.resolver.assetExts = [...config.resolver.assetExts, 'glb', 'gltf', 'png', 'jpg', 'ttf'];

const stubPath = path.resolve(__dirname, 'mocks/native-stub.js');

const nativeOnlyModules = new Set([
  'react-native-google-mobile-ads',
  'react-native-vision-camera',
  'react-native-deepar',
  'react-native-nodemediaclient',
  'ffmpeg-kit-react-native',
  'expo-speech-recognition',
  'react-native-nitro-modules',
  'react-native-nitro-image'
]);

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && nativeOnlyModules.has(moduleName)) {
    return {
      type: 'sourceFile',
      filePath: stubPath,
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// 2. Extra Node Modules Mapping
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react': path.resolve(__dirname, 'node_modules/react'),
  'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
  'scheduler': path.resolve(__dirname, 'node_modules/scheduler'),
  'react-native-worklets': path.resolve(__dirname, 'node_modules/react-native-worklets-core'),
};

module.exports = config;
