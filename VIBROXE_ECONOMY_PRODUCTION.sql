-- ==========================================
-- VIBROXE CREATOR ECONOMY - PRODUCTION SCHEMA (v2.5)
-- COMPLIANCE: Google Play Policies & Indian IT/Tax Rules
-- ==========================================

-- 1. EXTENDED PROFILES (Compliance & Badges)
ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'unverified' CHECK (kyc_status IN ('unverified', 'pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS pan_number_hashed TEXT, -- Indian Tax Compliance
ADD COLUMN IF NOT EXISTS is_creator BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS community_power_score INTEGER DEFAULT 0;

-- 2. KYC VERIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS kyc_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    document_type TEXT, -- 'pan', 'aadhar', 'voter_id'
    document_url TEXT, -- Secure storage link
    status TEXT DEFAULT 'pending',
    admin_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ENHANCED WALLETS (Ledger Integrity)
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    balance INTEGER DEFAULT 0, -- VX Coins
    total_earned_coins INTEGER DEFAULT 0,
    total_withdrawn_coins INTEGER DEFAULT 0,
    locked_balance INTEGER DEFAULT 0, -- For pending audits
    last_transaction_id UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ATOMIC TRANSACTION LEDGER (Anti-Fraud)
CREATE TABLE IF NOT EXISTS coin_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'reward', 'gift_sent', 'gift_received', 'processing', 'reversal'
    source_id TEXT, -- post_id or stream_id
    ref_id TEXT UNIQUE, -- Idempotency key to prevent double-spending
    metadata JSONB, -- IP, Device ID for fraud tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. CREATOR ANALYTICS SNAPSHOTS (For Momentum & Pulse)
CREATE TABLE IF NOT EXISTS creator_analytics_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    followers_count INTEGER,
    views_count INTEGER,
    likes_count INTEGER,
    coins_earned INTEGER,
    momentum_score INTEGER,
    snapshot_date DATE DEFAULT CURRENT_DATE,
    UNIQUE(user_id, snapshot_date)
);

-- 6. SECURITY & AUDIT LOGS
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    event_type TEXT, -- 'large_withdrawal', 'multiple_accounts', 'bot_behavior'
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    details JSONB,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. REWARD PROCESSING QUEUE
CREATE TABLE IF NOT EXISTS reward_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    coins_amount INTEGER NOT NULL,
    inr_value NUMERIC(12,2),
    payout_method_id UUID REFERENCES payout_accounts(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'auditing', 'approved', 'paid', 'rejected')),
    tds_deducted NUMERIC(12,2) DEFAULT 0.00,
    admin_id UUID REFERENCES profiles(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. SECURITY DEFINER FUNCTION: process_reward_claim
-- This ensures that only the system can move money, never the client directly.
CREATE OR REPLACE FUNCTION process_reward_claim(
    p_user_id UUID,
    p_coins INTEGER,
    p_ref_id TEXT,
    p_metadata JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    v_daily_limit INTEGER := 100; -- Configurable
    v_daily_sum INTEGER;
BEGIN
    -- 1. Anti-Bot: Check frequency of rewards
    SELECT COALESCE(SUM(amount), 0) INTO v_daily_sum
    FROM coin_transactions
    WHERE user_id = p_user_id
    AND type = 'reward'
    AND created_at >= CURRENT_DATE;

    IF v_daily_sum + p_coins > v_daily_limit THEN
        INSERT INTO security_audit_logs (user_id, event_type, severity, details)
        VALUES (p_user_id, 'daily_limit_exceeded', 'low', jsonb_build_object('attempted', p_coins, 'current', v_daily_sum));
        RETURN FALSE;
    END IF;

    -- 2. Atomic Update
    INSERT INTO coin_transactions (user_id, amount, type, ref_id, metadata)
    VALUES (p_user_id, p_coins, 'reward', p_ref_id, p_metadata);

    UPDATE wallets
    SET balance = balance + p_coins,
        total_earned_coins = total_earned_coins + p_coins,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. ROW LEVEL SECURITY (RLS)
ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own KYC" ON kyc_verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins see all audit logs" ON security_audit_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
