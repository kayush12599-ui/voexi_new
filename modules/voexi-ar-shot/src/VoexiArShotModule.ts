import { requireNativeModule } from 'expo-modules-core';

// This call loads the native module object from the JSI.
let module: any = null;
try {
  module = requireNativeModule('VoexiArShot');
} catch (e) {
  console.log("VoexiArShot native module not found, using JS fallback.");
}

export default module;
