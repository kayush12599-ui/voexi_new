-- 🛡️ AGENT COMPREHENSIVE LOG: DATABASE SYNC
-- Run this in Supabase SQL Editor to unlock the full details modal

-- 1. Ensure all columns exist in station_applications
ALTER TABLE public.station_applications ADD COLUMN IF NOT EXISTS station_details JSONB;
ALTER TABLE public.station_applications ADD COLUMN IF NOT EXISTS selfie_url TEXT;

-- 2. RESET FOREIGN KEY (Required for the App's "!" Join)
-- We remove old ones and set a strict name that the app uses
ALTER TABLE public.station_applications DROP CONSTRAINT IF EXISTS station_applications_user_id_fkey;
ALTER TABLE public.station_applications
  ADD CONSTRAINT station_applications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Ensure profiles has all identity fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vx_id_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration_number TEXT;

-- 4. Unblock Data for Admin UI
GRANT ALL ON public.station_applications TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

NOTIFY pgrst, 'reload schema';
