import * as LocalAuthentication from 'expo-local-authentication';

/**
 * VOEXI BIOMETRIC & PASSKEY AUTHENTICATION SERVICE
 * Supports Fingerprint, Face ID, and Passkey hardware authenticators.
 */
export const BiometricService = {
  /**
   * Check if device supports Biometrics / Passkeys (Touch ID, Face ID, Screen Lock)
   */
  async checkHardwareSupport(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (e) {
      return false;
    }
  },

  /**
   * Get supported biometric types (Fingerprint, Face ID, Iris)
   */
  async getSupportedBiometrics(): Promise<string[]> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const result: string[] = [];
      types.forEach(t => {
        if (t === LocalAuthentication.AuthenticationType.FINGERPRINT) result.push('Fingerprint');
        if (t === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) result.push('Face ID');
        if (t === LocalAuthentication.AuthenticationType.IRIS) result.push('Iris');
      });
      return result.length > 0 ? result : ['Passkey / PIN'];
    } catch (e) {
      return ['Passkey / PIN'];
    }
  },

  /**
   * Authenticate user with Passkey / Biometrics (Fingerprint / Face ID)
   */
  async authenticatePasskey(reason = 'Authenticate to authorize VOEXI security action'): Promise<boolean> {
    try {
      const isAvailable = await this.checkHardwareSupport();
      if (!isAvailable) {
        return true;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'Use Security Password / PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false
      });

      return result.success;
    } catch (e: any) {
      console.warn('[BIOMETRIC_ERROR]', e.message);
      return false;
    }
  }
};
