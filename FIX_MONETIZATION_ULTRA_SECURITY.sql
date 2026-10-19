-- =======================================================
-- VOEXI ULTRA HIGH SECURITY MONETIZATION & PAYOUT SCHEMA
-- =======================================================

-- 1. Add security_pin column to profiles table
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS security_pin text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_earnings numeric DEFAULT 2450.00,
ADD COLUMN IF NOT EXISTS vx_coins numeric DEFAULT 2450;

-- 2. Create payout_requests Table for High-Security Cashout Audit
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

-- 3. ENABLE ROW LEVEL SECURITY (RLS) ON PAYOUT_REQUESTS
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICY: Creators can ONLY SELECT their own payout requests
DROP POLICY IF EXISTS "Users can view their own payout requests" ON public.payout_requests;
CREATE POLICY "Users can view their own payout requests"
ON public.payout_requests
FOR SELECT
USING (auth.uid() = user_id);

-- 5. RLS POLICY: Creators can ONLY INSERT payout requests for themselves
DROP POLICY IF EXISTS "Users can create their own payout requests" ON public.payout_requests;
CREATE POLICY "Users can create their own payout requests"
ON public.payout_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 6. RLS POLICY: Admin Console users can view and process all payout requests
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

-- 7. CREATE INDEXES FOR ULTRA-FAST & SECURE AUDIT LOOKUPS
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON public.payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);
