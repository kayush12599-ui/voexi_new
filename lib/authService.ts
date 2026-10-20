import { supabase } from './supabase';
import { Alert } from 'react-native';

export const AuthService = {
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
      const randomPart = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
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

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        email: email,
        channel_name: metadata?.channel_name || metadata?.channelName || profile?.channel_name || 'VOEXI Station',
        username: metadata?.username || profile?.username || `agent_${vxId.slice(-4)}`,
        mobile: metadata?.mobile || profile?.mobile || '',
        vx_id_number: vxId,
        role: profile?.role || 'user',
        xp: profile?.xp || 0,
        level: profile?.level || 1,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      if (profileError) throw profileError;

      const { error: walletError } = await supabase.from('wallets').upsert({
        user_id: userId,
        balance: 0,
        total_earned_coins: 0,
        total_withdrawn_coins: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (walletError) throw walletError;

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
