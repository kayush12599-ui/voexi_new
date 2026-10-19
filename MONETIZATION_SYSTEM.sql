-- VIBROXE MONETIZATION & COIN ECONOMY v2
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. WALLETS TABLE (Centralized Balance)
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    balance INTEGER DEFAULT 0, -- Available VX Coins
    total_earned_coins INTEGER DEFAULT 0,
    total_withdrawn_coins INTEGER DEFAULT 0,
    pending_coins INTEGER DEFAULT 0, -- Coins under review
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. COIN TRANSACTIONS (Audit Log)
CREATE TABLE IF NOT EXISTS coin_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    coins INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'reward', 'gift', 'withdrawal', 'payout'
    description TEXT,
    ref_id TEXT UNIQUE, -- Prevents duplicate rewards (e.g., 'login_2023_10_27')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. WITHDRAWAL REQUESTS (Creator Payouts)
CREATE TABLE IF NOT EXISTS withdraw_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    coins_amount INTEGER NOT NULL,
    estimated_cash NUMERIC(10, 2), -- Conversion to INR
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'paid'
    payout_method TEXT, -- 'upi', 'bank'
    payout_details JSONB,
    admin_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. MONETIZATION SETTINGS (Global Config)
CREATE TABLE IF NOT EXISTS monetization_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    daily_login_reward INTEGER DEFAULT 5,
    upload_reward INTEGER DEFAULT 10,
    watch_reward_per_10min INTEGER DEFAULT 2,
    max_daily_reward_limit INTEGER DEFAULT 50,
    min_withdrawal_coins INTEGER DEFAULT 9999, -- ~₹50
    coin_to_inr_rate NUMERIC(10, 4) DEFAULT 0.005, -- 1 Coin = ₹0.005
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ENABLE RLS
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdraw_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_settings ENABLE ROW LEVEL SECURITY;

-- 6. POLICIES
CREATE POLICY "Users can view own wallet" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own transactions" ON coin_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own withdrawals" ON withdraw_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view settings" ON monetization_settings FOR SELECT USING (true);

-- 7. FUNCTION: Reward User Coins (Securely handled on server)
CREATE OR REPLACE FUNCTION reward_user_coins(
    user_id UUID,
    amount_to_add INTEGER,
    ref_id TEXT,
    description TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    daily_total INTEGER;
    max_limit INTEGER;
BEGIN
    -- Get daily limit
    SELECT max_daily_reward_limit INTO max_limit FROM monetization_settings WHERE id = 1;

    -- Check daily limit for user (rewards type only)
    SELECT COALESCE(SUM(coins), 0) INTO daily_total
    FROM coin_transactions
    WHERE coin_transactions.user_id = reward_user_coins.user_id
      AND type = 'reward'
      AND created_at >= CURRENT_DATE;

    IF daily_total + amount_to_add > max_limit THEN
        RETURN FALSE; -- Limit exceeded
    END IF;

    -- Insert Transaction (UNIQUE ref_id will prevent duplicates)
    INSERT INTO coin_transactions (user_id, coins, type, description, ref_id)
    VALUES (reward_user_coins.user_id, amount_to_add, 'reward', description, ref_id);

    -- Update Wallet
    INSERT INTO wallets (user_id, balance, total_earned_coins)
    VALUES (reward_user_coins.user_id, amount_to_add, amount_to_add)
    ON CONFLICT (user_id) DO UPDATE
    SET balance = wallets.balance + amount_to_add,
        total_earned_coins = wallets.total_earned_coins + amount_to_add,
        updated_at = NOW();

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE; -- Handles unique constraint violation or errors
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
