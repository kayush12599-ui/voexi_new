const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 1. Extensions for Skia, 3D Assets, and Modules
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs', 'svg'];
config.resolver.assetExts = [...config.resolver.assetExts, 'glb', 'gltf', 'png', 'jpg', 'ttf'];

// 2. Extra Node Modules Mapping
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'scheduler': path.resolve(__dirname, 'node_modules/scheduler'),
  'react-native-worklets': path.resolve(__dirname, 'node_modules/react-native-worklets-core'),
};

module.exports = config;
