import { NativeModulesProxy } from 'expo-modules-core';
import VoexiArShotModule from './src/VoexiArShotModule';
import VoexiArShotView from './src/VoexiArShotView';

// 🛡️ SAFE WRAPPER: Avoid crash if native module is missing (Expo Go)
const isNativeAvailable = !!VoexiArShotModule;

export async function initializeAR() {
  if (!isNativeAvailable) {
    console.warn("VOEXI AR: Native engine not found. Running in Simulation Mode.");
    return { status: 'simulated' };
  }
  return await VoexiArShotModule.initializeAR();
}

export async function getAvailableEffects() {
  if (!isNativeAvailable) {
    // Return sample effects for UI testing in Expo Go
    return [
      { id: 'VOEXI_CAT_001', name: 'Space Cat', category: 'FACE', thumb: null },
      { id: 'VOEXI_NEON_001', name: 'Cyber Glow', category: 'VOEXI_ORIGINAL', thumb: null }
    ];
  }
  return await VoexiArShotModule.getAvailableEffects();
}

export async function loadEffect(effectId: string) {
  if (!isNativeAvailable) return;
  return await VoexiArShotModule.loadEffect(effectId);
}

export async function clearEffect() {
  if (!isNativeAvailable) return;
  return await VoexiArShotModule.clearEffect();
}

export { VoexiArShotView };
