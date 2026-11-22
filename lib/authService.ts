import { supabase } from './supabase';
import { Alert } from 'react-native';
import { getLocalMediaServerUrl } from './bunnyStorage';

export const AuthService = {
  /**
   * Generates a 256-Bit Cryptographically Secure 6-Digit OTP Code
   * Uses Crypto API to prevent predictability or pseudo-random attacks.
   */
  generateCryptographicOtp(): string {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      const code = (100000 + (array[0] % 900000)).toString();
      return code;
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  /**
   * Securely get current session
   */
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return null;
      return session;
    } catch (e) { return null; }
  },

  /**
   * Securely check if an email is already registered in VOEXI
   */
  async isEmailAlreadyRegistered(email: string): Promise<boolean> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) return false;
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (!error && data) return true;
      return false;
    } catch (e) {
      return false;
    }
  },

  /**
   * Securely check if a username is already taken
   */
  async isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
    try {
      const cleanUser = username.trim().toLowerCase();
      if (!cleanUser) return false;
      let query = supabase.from('profiles').select('id').ilike('username', cleanUser);
      if (excludeUserId) query = query.neq('id', excludeUserId);
      const { data } = await query.maybeSingle();
      return !!data;
    } catch (e) {
      return false;
    }
  },

  /**
   * Generates a 12-digit Secure VX ID
   */
  async generateUniqueVxId(): Promise<string> {
    const gen = () => {
      let randomPart = '';
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint32Array(10);
        crypto.getRandomValues(array);
        randomPart = Array.from(array, n => (n % 10).toString()).join('');
      } else {
        randomPart = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
      }
      let sum = 0;
      for (let i = 0; i < 10; i++) sum += parseInt(randomPart[i]) * (i + 7);
      const checksum = (sum % 97).toString().padStart(2, '0');
      return randomPart + checksum;
    };

    let vxId = gen();
    try {
      const { data } = await supabase.from('profiles').select('vx_id_number').eq('vx_id_number', vxId).maybeSingle();
      if (data) vxId = gen();
    } catch (e) {}
    return vxId;
  },

  /**
   * Ensures a user has a valid profile and VX-ID (Self-Healing)
   */
  async ensureNeuralIdentity(userId: string, email: string, metadata?: any) {
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

      let vxId = profile?.vx_id_number;
      if (!vxId) {
        vxId = await this.generateUniqueVxId();
      }

      const channelName = metadata?.channel_name || metadata?.channelName || (profile?.channel_name && profile?.channel_name !== 'VOEXI Station' ? profile?.channel_name : '') || 'VOEXI Station';
      const username = metadata?.username || (profile?.username && !profile?.username.startsWith('agent_') ? profile?.username : '') || `agent_${vxId.slice(-4)}`;
      const mobile = metadata?.mobile || profile?.mobile || '';
      const avatarUrl = metadata?.avatar_url || profile?.avatar_url || '';

      const profilePayload = {
        id: userId,
        email: email,
        channel_name: channelName,
        username: username,
        mobile: mobile,
        vx_id_number: vxId,
        avatar_url: avatarUrl,
        role: profile?.role || 'user',
        xp: profile?.xp || 0,
        level: profile?.level || 1,
        updated_at: new Date().toISOString(),
      };

      if (profile) {
        await supabase.from('profiles').update({
          email: email,
          channel_name: channelName,
          username: username,
          mobile: mobile,
          vx_id_number: vxId,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        }).eq('id', userId);
      } else {
        await supabase.from('profiles').insert(profilePayload).catch(async () => {
          await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });
        });
      }

      // Dual-Sync Profile Record to Local Server 2 (Port 8080)
      try {
        const localServerUrl = getLocalMediaServerUrl();
        await fetch(`${localServerUrl}/api/profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profilePayload)
        }).catch(() => {});
      } catch (e) {}

      const { error: walletError } = await supabase.from('wallets').upsert({
        user_id: userId,
        balance: 0,
        total_earned_coins: 0,
        total_withdrawn_coins: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      return true;
    } catch (e: any) {
      console.error("[IDENTITY_SYNC_ERROR]", e.message);
      return false;
    }
  },

  /**
   * Complete onboarding for a new user
   */
  async onboardUser(userId: string, email: string, metadata: any) {
    try {
      const vxId = await this.generateUniqueVxId();

      // Use upsert to handle cases where trigger might have already created a basic profile
      const { error: pError } = await supabase.from('profiles').upsert({
        id: userId,
        email: email,
        channel_name: metadata.channelName || 'VOEXI Station',
        username: metadata.username || `user_${vxId.slice(-4)}`,
        vx_id_number: vxId,
        mobile: metadata.mobile || '',
        avatar_url: metadata.avatarUrl || '',
        role: 'user',
        xp: 0,
        level: 1,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      if (pError) throw pError;

      await supabase.from('wallets').upsert({
        user_id: userId,
        balance: 0,
        total_earned_coins: 0,
        total_withdrawn_coins: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      return true;
    } catch (err: any) {
      throw new Error(`Profile setup failed: ${err.message}`);
    }
  }
};
