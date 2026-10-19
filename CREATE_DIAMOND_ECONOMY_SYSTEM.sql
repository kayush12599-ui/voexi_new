-- ====================================================================
-- VOEXI REAL-TIME FLASH TOP-UP DROPS & DIAMOND ECONOMY MASTER SCRIPT
-- RUN THIS SCRIPT IN YOUR SUPABASE SQL EDITOR
-- ====================================================================

-- 1. ADD DIAMOND BALANCE COLUMN TO PROFILES TABLE
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS diamond_balance INTEGER DEFAULT 0;

-- 2. CREATE DIAMOND PACKAGES & FLASH DROPS TABLE
CREATE TABLE IF NOT EXISTS public.diamond_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    price_inr NUMERIC(10, 2) NOT NULL,
    diamond_amount INTEGER NOT NULL DEFAULT 0, -- Base Gems
    bonus_diamonds INTEGER DEFAULT 0,           -- Bonus Gems
    badge_tag VARCHAR(255) DEFAULT NULL,        -- e.g. '🔥 95% OFF (LIMITED EVENT)'
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ DEFAULT NULL,        -- Event Expiry (NULL = Permanent)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE DIAMOND TRANSACTIONS LEDGER TABLE
CREATE TABLE IF NOT EXISTS public.diamond_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,                   -- Positive for grants/buys, Negative for revokes
    transaction_type VARCHAR(50) NOT NULL,     -- 'PACKAGE_PURCHASE', 'ADMIN_GRANT', 'ADMIN_REVOKE', 'TASK_CLAIM'
    description TEXT,                          -- e.g. 'Purchased 🔥 VOEXI Flash Top-Up Reward Drop for ₹69'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE DIAMOND TASK WALL OFFERS TABLE
CREATE TABLE IF NOT EXISTS public.diamond_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    reward_diamonds INTEGER NOT NULL DEFAULT 10,
    cooldown_hours INTEGER DEFAULT 24,
    icon VARCHAR(100) DEFAULT 'gift',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.diamond_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diamond_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diamond_offers ENABLE ROW LEVEL SECURITY;

-- 6. CONFIGURE RLS POLICIES
-- Packages Policies
DROP POLICY IF EXISTS "Anyone can view active diamond packages" ON public.diamond_packages;
CREATE POLICY "Anyone can view active diamond packages"
ON public.diamond_packages FOR SELECT
USING (is_active = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can manage packages" ON public.diamond_packages;
CREATE POLICY "Admins can manage packages"
ON public.diamond_packages FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Transactions Policies
DROP POLICY IF EXISTS "Users can view their own diamond transactions" ON public.diamond_transactions;
CREATE POLICY "Users can view their own diamond transactions"
ON public.diamond_transactions FOR SELECT
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.diamond_transactions;
CREATE POLICY "Users can insert their own transactions"
ON public.diamond_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Offers Policies
DROP POLICY IF EXISTS "Anyone can view active offers" ON public.diamond_offers;
CREATE POLICY "Anyone can view active offers"
ON public.diamond_offers FOR SELECT
USING (is_active = true);

-- 7. ATOMIC RPC FUNCTION: PROCESS DIAMOND PACKAGE PURCHASE
CREATE OR REPLACE FUNCTION process_diamond_purchase(
    p_user_id UUID,
    p_package_id UUID,
    p_payment_ref TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_pkg RECORD;
    v_total_gems INTEGER;
    v_new_balance INTEGER;
    v_tx_id UUID;
BEGIN
    -- Fetch package details
    SELECT * INTO v_pkg FROM public.diamond_packages WHERE id = p_package_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Selected package is invalid or inactive');
    END IF;

    -- Check expiry if set
    IF v_pkg.expires_at IS NOT NULL AND v_pkg.expires_at < NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'This Flash Drop event has expired');
    END IF;

    v_total_gems := v_pkg.diamond_amount + COALESCE(v_pkg.bonus_diamonds, 0);

    -- Update Profile Balance
    UPDATE public.profiles
    SET diamond_balance = COALESCE(diamond_balance, 0) + v_total_gems
    WHERE id = p_user_id
    RETURNING diamond_balance INTO v_new_balance;

    -- Insert Transaction Record
    INSERT INTO public.diamond_transactions (
        user_id,
        amount,
        transaction_type,
        description
    ) VALUES (
        p_user_id,
        v_total_gems,
        'PACKAGE_PURCHASE',
        'Purchased ' || v_pkg.title || ' (' || v_total_gems || ' 💎) for ₹' || v_pkg.price_inr
    ) RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'gems_added', v_total_gems,
        'transaction_id', v_tx_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. ATOMIC RPC FUNCTION: ADMIN GRANT / REVOKE DIAMONDS
CREATE OR REPLACE FUNCTION admin_grant_revoke_diamonds(
    p_target_user_id UUID,
    p_delta_amount INTEGER,
    p_reason_note TEXT DEFAULT 'Top-Up Drop Admin Reward Grant'
) RETURNS JSONB AS $$
DECLARE
    v_new_balance INTEGER;
    v_tx_id UUID;
    v_tx_type VARCHAR(50);
BEGIN
    IF p_delta_amount >= 0 THEN
        v_tx_type := 'ADMIN_GRANT';
    ELSE
        v_tx_type := 'ADMIN_REVOKE';
    END IF;

    -- Update Profile Balance
    UPDATE public.profiles
    SET diamond_balance = GREATEST(0, COALESCE(diamond_balance, 0) + p_delta_amount)
    WHERE id = p_target_user_id
    RETURNING diamond_balance INTO v_new_balance;

    -- Insert Transaction
    INSERT INTO public.diamond_transactions (
        user_id,
        amount,
        transaction_type,
        description
    ) VALUES (
        p_target_user_id,
        p_delta_amount,
        v_tx_type,
        COALESCE(p_reason_note, 'Top-Up Drop Admin Reward Grant')
    ) RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'delta', p_delta_amount,
        'transaction_id', v_tx_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. PRE-POPULATE INITIAL STORE PACKAGES & FLASH DROPS
INSERT INTO public.diamond_packages (title, price_inr, diamond_amount, bonus_diamonds, badge_tag, is_active, expires_at)
VALUES
  ('🔥 VOEXI Flash Top-Up Reward Drop', 69.00, 800, 200, '🔥 95% OFF (LIMITED EVENT)', true, NOW() + INTERVAL '24 hours'),
  ('Pocket Gems', 19.00, 50, 0, NULL, true, NULL),
  ('⚡ VOEXI Yantra', 49.00, 300, 50, '⚡ POPULAR YANTRA DROP', true, NULL),
  ('Starter Pack', 99.00, 100, 10, '● LIVE', true, NULL),
  ('Gamer Vault', 249.00, 250, 30, '● LIVE', true, NULL),
  ('Pro Vault', 499.00, 500, 75, '● LIVE', true, NULL),
  ('Master Chest', 1999.00, 2000, 400, '🔥 BEST VALUE', true, NULL),
  ('VIP Supreme', 8999.00, 10000, 2500, '👑 VIP EXCLUSIVE', true, NULL)
ON CONFLICT DO NOTHING;

-- 10. PRE-POPULATE INITIAL TASK OFFERS
INSERT INTO public.diamond_offers (title, reward_diamonds, cooldown_hours, icon, is_active)
VALUES
  ('Daily Neural Check-In', 20, 24, 'calendar', true),
  ('Watch Reward Video Ad', 15, 1, 'play-circle', true),
  ('Share Station Post', 25, 12, 'share-social', true)
ON CONFLICT DO NOTHING;

-- 11. INDEXES FOR HIGH-SPEED LOOKUPS
CREATE INDEX IF NOT EXISTS idx_diamond_packages_active ON public.diamond_packages(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_diamond_tx_user_id ON public.diamond_transactions(user_id, created_at DESC);

-- VERIFICATION SELECT
SELECT id, title, price_inr, diamond_amount, bonus_diamonds, badge_tag, expires_at FROM public.diamond_packages WHERE is_active = true;
