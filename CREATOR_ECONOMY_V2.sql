-- VIBROXE CREATOR ECONOMY V2 (Play Store & India Compliant)
-- Run this in your Supabase SQL Editor

-- 1. GIFTS TABLE
CREATE TABLE IF NOT EXISTS gifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    coins INTEGER NOT NULL CHECK (coins > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PAYOUT ACCOUNTS (Enhanced for India)
CREATE TABLE IF NOT EXISTS payout_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    payout_type TEXT CHECK (payout_type IN ('upi', 'bank')),
    upi_id TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    bank_ifsc TEXT,
    is_verified BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SECURITY POLICIES
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see gifts they sent or received" ON gifts
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can manage own payout accounts" ON payout_accounts
FOR ALL USING (auth.uid() = user_id);

-- 4. FUNCTION: send_gift (Atomic & Secure)
CREATE OR REPLACE FUNCTION send_gift(
    target_post_id UUID,
    receiver_uid UUID,
    amount INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    sender_uid UUID := auth.uid();
    sender_balance INTEGER;
BEGIN
    -- Check sender balance
    SELECT balance INTO sender_balance FROM wallets WHERE user_id = sender_uid;

    IF sender_balance < amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Deduct from sender
    UPDATE wallets SET balance = balance - amount WHERE user_id = sender_uid;

    -- Add to receiver (Creator)
    INSERT INTO wallets (user_id, balance, total_earned_coins)
    VALUES (receiver_uid, amount, amount)
    ON CONFLICT (user_id) DO UPDATE
    SET balance = wallets.balance + amount,
        total_earned_coins = wallets.total_earned_coins + amount;

    -- Log transaction
    INSERT INTO coin_transactions (user_id, coins, type, description)
    VALUES (sender_uid, -amount, 'gift_sent', 'Gift sent to creator');

    INSERT INTO coin_transactions (user_id, coins, type, description)
    VALUES (receiver_uid, amount, 'gift_received', 'Gift received from fan');

    -- Record gift
    INSERT INTO gifts (sender_id, receiver_id, post_id, coins)
    VALUES (sender_uid, receiver_uid, target_post_id, amount);

    -- Trigger Notification (Assuming notifications table exists)
    INSERT INTO notifications (user_id, type, content, data)
    VALUES (receiver_uid, 'gift', 'You received a gift of ' || amount || ' VX Coins!', jsonb_build_object('sender_id', sender_uid, 'coins', amount));

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
