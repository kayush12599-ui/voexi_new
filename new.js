const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 1. Enable Package Exports (Required for many React 19 / Modern packages)
config.resolver.unstable_enablePackageExports = true;

// 2. Extensions for Three.js and 3D Assets
config.resolver.sourceExts = [...new Set([...config.resolver.sourceExts, 'cjs', 'mjs'])];
config.resolver.assetExts = [...new Set([...config.resolver.assetExts, 'glb', 'gltf', 'png', 'jpg'])];

// 3. Direct Resolver for core dependencies
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'scheduler': path.resolve(__dirname, 'node_modules/scheduler'),
};

// 3. Forced search paths
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

module.exports = config;