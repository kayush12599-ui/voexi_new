import { supabase } from './supabase';

export interface WalletData {
  balance: number; // Direct Cash Balance in ₹ INR
  total_earned: number; // Total ₹ INR Earned
  total_withdrawn: number; // Total ₹ INR Withdrawn
  today_earnings: number; // Today's ₹ INR Earnings
}

/**
 * VOEXI SECURITY LAYER
 * Centralized wallet logic with server-side validation
 */
export const WalletService = {
  /**
   * Log suspicious activities for admin review
   */
  async logSecurityEvent(userId: string, event: string, details: any) {
    try {
      await supabase.from('security_logs').insert({
        user_id: userId,
        event_type: event,
        details: JSON.stringify(details),
        created_at: new Date().toISOString()
      });
    } catch (e) {}
  },

  /**
   * Fetch complete wallet status including today's earnings
   */
  async getWalletData(userId: string): Promise<WalletData> {
    // Verify session before fetching sensitive balance
    const { data, error: sessionError } = await supabase.auth.getSession();
    const session = data?.session;
    if (sessionError || !session || session.user.id !== userId) {
      throw new Error('Unauthorized wallet access');
    }

    const today = new Date().toISOString().split('T')[0];

    const [walletRes, todayRes, profileRes] = await Promise.all([
      supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('channel_revenue').select('amount').eq('user_id', userId).gte('created_at', today),
      supabase.from('profiles').select('channel_balance').eq('id', userId).single()
    ]);

    const rawWallet = walletRes.data || {};
    const profileBalance = Number(profileRes.data?.channel_balance || 0);
    const walletBalance = Number(rawWallet.balance || 0);
    const currentBalance = Math.max(profileBalance, walletBalance);

    const todayEarnings = todayRes.data?.reduce((sum, tx) => sum + Number(tx.amount || 0), 0) || 0;

    return {
      balance: Number(currentBalance.toFixed(2)),
      total_earned: Number((rawWallet.total_earned || currentBalance).toFixed(2)),
      total_withdrawn: Number((rawWallet.total_withdrawn || 0).toFixed(2)),
      today_earnings: Number(todayEarnings.toFixed(2))
    };
  },

  /**
   * Create a withdrawal request directly in ₹ INR
   */
  async processWithdrawal(userId: string, amount: number, payoutId: string) {
    const { data: sessionRes, error: sessionError } = await supabase.auth.getSession();
    const session = sessionRes?.session;
    if (sessionError || !session || session.user.id !== userId) throw new Error('Auth failure');

    if (amount < 50) throw new Error('Minimum withdrawal is ₹50 INR');

    // RPC or direct insert into withdraw_requests / payout_requests
    const { data: withdrawalRes, error } = await supabase.from('withdraw_requests').insert({
      user_id: userId,
      amount: amount,
      payout_account_id: payoutId,
      status: 'pending'
    }).select().single();

    if (error) {
      await this.logSecurityEvent(userId, 'withdrawal_error', { error: error.message, amount });
      throw error;
    }

    return withdrawalRes;
  },

  /**
   * Fetch transaction history
   */
  async getTransactions(userId: string) {
    try {
      const { data, error } = await supabase
        .from('diamond_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !data) return [];
      return data;
    } catch (e) {
      return [];
    }
  },

  /**
   * Payout Account Management
   */
  async getPayoutAccounts(userId: string) {
    const { data: sessionRes, error: sessionError } = await supabase.auth.getSession();
    const session = sessionRes?.session;
    if (sessionError || !session || session.user.id !== userId) {
      throw new Error('Unauthorized');
    }

    const { data: accounts, error } = await supabase
      .from('payout_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return accounts || [];
  },

  async getPayoutAccountById(accountId: string) {
    const { data: sessionRes, error: sessionError } = await supabase.auth.getSession();
    const session = sessionRes?.session;
    if (sessionError || !session) throw new Error('Auth required');

    const { data: account, error } = await supabase
      .from('payout_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (error) throw error;

    // Security check: Only owner can view details
    if (account.user_id !== session.user.id) {
      throw new Error('Access denied to sensitive payout details');
    }

    return account;
  },

  async savePayoutAccount(userId: string, accountData: any) {
    const { id, ...rest } = accountData;

    // Filter to only include columns that exist in the database
    const validData: any = {};
    const allowedColumns = ['upi_id', 'bank_account_number', 'bank_ifsc', 'payout_type', 'user_id', 'updated_at'];

    Object.keys(rest).forEach(key => {
      if (allowedColumns.includes(key)) {
        validData[key] = rest[key];
      }
    });

    if (id) {
      const { error } = await supabase
        .from('payout_accounts')
        .update({ ...validData, updated_at: new Date() })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('payout_accounts')
        .insert({ ...validData, user_id: userId });
      if (error) throw error;
    }
    return true;
  },

  async deletePayoutAccount(userId: string, accountId: string) {
    const { error } = await supabase
      .from('payout_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', userId);
    if (error) throw error;
    return true;
  },

  /**
   * Fetch withdrawal requests status
   */
  async getWithdrawalRequests(userId: string) {
    const { data, error } = await supabase
      .from('withdraw_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * DIAMOND ECONOMY SERVICE METHODS
   */
  async getDiamondPackages() {
    try {
      const { data, error } = await supabase
        .from('diamond_packages')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error || !data || data.length === 0) {
        return [
          { id: 'p_hyper_69', title: '🔥 Hyper Ultra Vault', price_inr: 69, diamond_amount: 580, bonus_diamonds: 120, badge_tag: '🔥 95% OFF (UNMISSABLE)', display_order: 1 },
          { id: 'p1', title: 'Starter Gem Spark', price_inr: 29, diamond_amount: 180, bonus_diamonds: 20, badge_tag: 'STARTER', display_order: 2 },
          { id: 'p2', title: 'Pro Crown Stack', price_inr: 149, diamond_amount: 1500, bonus_diamonds: 300, badge_tag: 'POPULAR', display_order: 3 },
          { id: 'p3', title: 'Master Royal Vault', price_inr: 299, diamond_amount: 3500, bonus_diamonds: 1000, badge_tag: 'VIP CROWN', display_order: 4 }
        ];
      }
      return data;
    } catch (e) {
      return [
        { id: 'p_hyper_69', title: '🔥 Hyper Ultra Vault', price_inr: 69, diamond_amount: 580, bonus_diamonds: 120, badge_tag: '🔥 95% OFF (UNMISSABLE)', display_order: 1 },
        { id: 'p1', title: 'Starter Gem Spark', price_inr: 29, diamond_amount: 180, bonus_diamonds: 20, badge_tag: 'STARTER', display_order: 2 },
        { id: 'p2', title: 'Pro Crown Stack', price_inr: 149, diamond_amount: 1500, bonus_diamonds: 300, badge_tag: 'POPULAR', display_order: 3 },
        { id: 'p3', title: 'Master Royal Vault', price_inr: 299, diamond_amount: 3500, bonus_diamonds: 1000, badge_tag: 'VIP CROWN', display_order: 4 }
      ];
    }
  },

  async getDiamondOffers() {
    try {
      const { data, error } = await supabase
        .from('diamond_offers')
        .select('*')
        .eq('is_active', true)
        .order('reward_diamonds', { ascending: true });

      if (error || !data || data.length === 0) {
        return [
          { id: 'o1', title: 'Daily Diamond Reward 💎', description: 'Claim your daily free diamond bonus!', reward_diamonds: 10, offer_type: 'daily_streak', cooldown_hours: 24, icon_name: 'calendar' },
          { id: 'o3', title: 'Share 3 Reels 🚀', description: 'Share 3 reels with your friends today', reward_diamonds: 15, offer_type: 'share_reel', cooldown_hours: 24, icon_name: 'share-social' },
          { id: 'o4', title: 'Complete VIP Profile 👤', description: 'Add bio, avatar & custom links', reward_diamonds: 50, offer_type: 'profile_completion', cooldown_hours: 0, icon_name: 'checkmark-circle' }
        ];
      }
      return data.filter((o: any) => o.offer_type !== 'watch_ad');
    } catch (e) {
      return [
        { id: 'o1', title: 'Daily Diamond Reward 💎', description: 'Claim your daily free diamond bonus!', reward_diamonds: 10, offer_type: 'daily_streak', cooldown_hours: 24, icon_name: 'calendar' },
        { id: 'o3', title: 'Share 3 Reels 🚀', description: 'Share 3 reels with your friends today', reward_diamonds: 15, offer_type: 'share_reel', cooldown_hours: 24, icon_name: 'share-social' },
        { id: 'o4', title: 'Complete VIP Profile 👤', description: 'Add bio, avatar & custom links', reward_diamonds: 50, offer_type: 'profile_completion', cooldown_hours: 0, icon_name: 'checkmark-circle' }
      ];
    }
  },

  async claimDiamondOffer(userId: string, offerId: string) {
    try {
      const { data, error } = await supabase.rpc('claim_diamond_offer', {
        p_user_id: userId,
        p_offer_id: offerId
      });

      if (error) {
        return { success: false, message: error.message || 'Failed to claim offer' };
      }
      return data;
    } catch (e: any) {
      return { success: false, message: e.message || 'Network error claiming offer' };
    }
  },

  async spendDiamonds(userId: string, amount: number, purpose: string, refId?: string) {
    try {
      const { data, error } = await supabase.rpc('spend_diamonds', {
        p_user_id: userId,
        p_amount: amount,
        p_purpose: purpose,
        p_ref_id: refId || null
      });

      if (error) {
        return { success: false, message: error.message || 'Failed to spend diamonds' };
      }
      return data;
    } catch (e: any) {
      return { success: false, message: e.message || 'Error processing diamond transaction' };
    }
  },

  async getDiamondTransactions(userId: string) {
    try {
      const { data, error } = await supabase
        .from('diamond_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) return [];
      return data || [];
    } catch (e) {
      return [];
    }
  }
};
