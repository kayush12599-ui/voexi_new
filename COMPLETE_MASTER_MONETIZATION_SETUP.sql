-- ====================================================================
-- VOEXI COMPLETE MASTER MONETIZATION & SECURITY SETUP (ALL-IN-ONE)
-- ====================================================================

-- 1. ADD ALL MONETIZATION & CREATOR COLUMNS TO PROFILES TABLE
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS total_earnings numeric DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS vx_coins numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS security_pin text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_monetized boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS monetization_status text DEFAULT 'unlocked_checking',
ADD COLUMN IF NOT EXISTS creator_full_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS creator_dob text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS creator_phone text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS creator_address text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS creator_city text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS creator_state text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS creator_pincode text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS creator_govt_id text DEFAULT NULL;

-- 2. ENFORCE DEFAULT VALUES TO STRICT ZERO (0.00)
ALTER TABLE IF EXISTS public.profiles
ALTER COLUMN total_earnings SET DEFAULT 0.00,
ALTER COLUMN vx_coins SET DEFAULT 0,
ALTER COLUMN is_monetized SET DEFAULT false;

-- 3. CLEAN UP ANY OLD TESTING VALUES TO EXACTLY ZERO
UPDATE public.profiles
SET total_earnings = 0.00
WHERE total_earnings IS NULL OR total_earnings = 2450 OR total_earnings = 2700;

UPDATE public.profiles
SET vx_coins = 0
WHERE vx_coins IS NULL OR vx_coins = 2450 OR vx_coins = 2700;

-- 4. CREATE HIGH-SECURITY PAYOUT REQUESTS AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 100),
  payout_method text NOT NULL CHECK (payout_method IN ('upi', 'paytm', 'bank')),
  payout_account text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  security_pin_verified boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. ENABLE ROW LEVEL SECURITY (RLS) ON PAYOUT REQUESTS
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own payout requests" ON public.payout_requests;
CREATE POLICY "Users can view their own payout requests"
ON public.payout_requests
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own payout requests" ON public.payout_requests;
CREATE POLICY "Users can create their own payout requests"
ON public.payout_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view and manage all payout requests" ON public.payout_requests;
CREATE POLICY "Admins can view and manage all payout requests"
ON public.payout_requests
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 6. CREATE INDEXES FOR FAST LOOKUPS
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON public.payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);

-- 7. VERIFY ALL COLUMNS ARE ACTIVE
SELECT id, username, total_earnings, vx_coins, is_monetized, creator_full_name FROM public.profiles LIMIT 5;
