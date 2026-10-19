-- 🛡️ VOEXI SPECTRUM COMMAND: ULTIMATE DATABASE SYNC
-- This ensures all photos and high-level details are visible to Admin.

-- 1. Ensure Profiles has all visual & identity data
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. Ensure Applications table is robust
ALTER TABLE public.station_applications
ADD COLUMN IF NOT EXISTS selfie_url TEXT;

-- 3. FIX RELATIONSHIPS (The Join Fix)
-- This allows the app to fetch EVERYTHING in one hit
ALTER TABLE public.station_applications DROP CONSTRAINT IF EXISTS station_applications_user_id_fkey;
ALTER TABLE public.station_applications
  ADD CONSTRAINT station_applications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. PERMISSIONS (Bypass RLS for Admin UI)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 5. REFRESH EVERYTHING
NOTIFY pgrst, 'reload schema';
