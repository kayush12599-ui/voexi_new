-- ====================================================================
-- VOEXI MONETIZATION APPLICATION & CREATOR VERIFICATION COLUMNS
-- ====================================================================

-- 1. Add Monetization Verification Columns to Profiles Table
ALTER TABLE IF EXISTS public.profiles
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

-- 2. VERIFY PROFILES COLUMNS
SELECT id, username, is_monetized, creator_full_name, creator_dob FROM public.profiles LIMIT 5;
