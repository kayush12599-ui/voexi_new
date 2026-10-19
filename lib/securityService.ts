import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BiometricService } from './biometricService';
import { Alert } from 'react-native';

export const SecurityService = {
  /**
   * Log high-security event to Supabase audit trail
   */
  async logSecurityEvent(userId: string, eventType: string, details: Record<string, any>) {
    try {
      const payload = {
        user_id: userId,
        event_type: eventType,
        details: JSON.stringify({
          ...details,
          timestamp: new Date().toISOString(),
          client: 'VOEXI Mobile App'
        }),
        created_at: new Date().toISOString()
      };

      await supabase.from('security_logs').insert(payload);
    } catch (e: any) {
      console.warn('[SECURITY LOG WARN]', e.message);
    }
  },

  /**
   * Rate Limiting Guard: Prevents Brute-Force Attacks on OTP / Passwords
   * Returns true if request is ALLOWED, false if BLOCKED due to rate limit.
   */
  async checkRateLimit(actionKey: string, maxAttempts = 5, cooldownSeconds = 60): Promise<{ allowed: boolean; remainingSeconds?: number }> {
    try {
      const storageKey = `@rate_limit_${actionKey}`;
      const rawData = await AsyncStorage.getItem(storageKey);
      const now = Date.now();

      if (rawData) {
        const { attempts, firstAttemptTime, cooldownUntil } = JSON.parse(rawData);

        // Check active cooldown
        if (cooldownUntil && now < cooldownUntil) {
          const remainingSeconds = Math.ceil((cooldownUntil - now) / 1000);
          return { allowed: false, remainingSeconds };
        }

        // Reset if window elapsed
        if (now - firstAttemptTime > cooldownSeconds * 1000) {
          await AsyncStorage.setItem(storageKey, JSON.stringify({ attempts: 1, firstAttemptTime: now, cooldownUntil: 0 }));
          return { allowed: true };
        }

        // Increment attempts
        if (attempts >= maxAttempts) {
          const newCooldown = now + cooldownSeconds * 1000;
          await AsyncStorage.setItem(storageKey, JSON.stringify({ attempts: attempts + 1, firstAttemptTime, cooldownUntil: newCooldown }));
          return { allowed: false, remainingSeconds: cooldownSeconds };
        }

        await AsyncStorage.setItem(storageKey, JSON.stringify({ attempts: attempts + 1, firstAttemptTime, cooldownUntil: 0 }));
        return { allowed: true };
      }

      await AsyncStorage.setItem(storageKey, JSON.stringify({ attempts: 1, firstAttemptTime: now, cooldownUntil: 0 }));
      return { allowed: true };
    } catch (e) {
      return { allowed: true };
    }
  },

  /**
   * Enforce Biometric / Passkey Challenge before executing sensitive operations
   */
  async requireBiometricChallenge(reason: string): Promise<boolean> {
    try {
      const isVerified = await BiometricService.authenticatePasskey(reason);
      if (!isVerified) {
        Alert.alert('Security Authorization Cancelled', 'Passkey / Biometric authorization is required.');
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Verify Account Integrity (Self-Healing Security Audit)
   */
  async verifyAccountIntegrity(userId: string): Promise<{ valid: boolean; isDeleted?: boolean; role?: string }> {
    try {
      const { data: prof, error } = await supabase
        .from('profiles')
        .select('id, is_deleted, role, is_monetized, vx_id_number')
        .eq('id', userId)
        .maybeSingle();

      if (error || !prof) return { valid: false };
      if (prof.is_deleted) return { valid: false, isDeleted: true };

      return { valid: true, role: prof.role || 'user' };
    } catch (e) {
      return { valid: false };
    }
  }
};
