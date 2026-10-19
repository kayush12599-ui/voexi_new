-- 🚀 VOEXI ALL-IN-ONE MASTER MIGRATION SCRIPT
-- Execute this script once in Supabase SQL Editor for 100% database sync.

-- 1. Ensure profiles table has all required demographic & category columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Entertainment',
ADD COLUMN IF NOT EXISTS channel_category TEXT DEFAULT 'Entertainment',
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Male',
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India',
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 2. Drop existing RLS Policies to prevent 42710 "Policy Already Exists" error
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- 3. Create Clean RLS Policies for Profiles
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (
  auth.uid() = id OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'superadmin')
  )
);

-- 4. Ensure generate_vx_id function uses ISO 7064 Checksum for 12-digit Aadhaar-grade IDs
CREATE OR REPLACE FUNCTION public.generate_vx_id()
RETURNS TEXT AS $$
DECLARE
  random_part TEXT;
  checksum_val BIGINT;
  checksum_str TEXT;
  final_id TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    random_part := '';
    FOR i IN 1..10 LOOP
      random_part := random_part || floor(random() * 10)::TEXT;
    END LOOP;

    checksum_val := (random_part::BIGINT * 100) % 97;
    checksum_val := 98 - checksum_val;
    IF checksum_val > 97 THEN checksum_val := checksum_val - 97; END IF;

    checksum_str := lpad(checksum_val::TEXT, 2, '0');
    final_id := random_part || checksum_str;

    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE vx_id_number = final_id) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN final_id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 5. Assign permanent 12-digit VX-ID to any user profile currently missing one or having placeholder
UPDATE public.profiles
SET vx_id_number = public.generate_vx_id()
WHERE vx_id_number IS NULL OR vx_id_number = '' OR vx_id_number = 'VX-9082 1120' OR vx_id_number = 'VX-0000 0000';

-- 6. Permanent Lock Trigger Function
CREATE OR REPLACE FUNCTION public.lock_vx_id_permanently()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.vx_id_number IS NOT NULL AND OLD.vx_id_number <> '' AND NEW.vx_id_number <> OLD.vx_id_number THEN
    RAISE EXCEPTION 'SECURITY SHIELD ERROR: VX-ID (%) is PERMANENTLY LOCKED and CANNOT be modified by anyone.', OLD.vx_id_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Attach Permanent Lock Trigger
DROP TRIGGER IF EXISTS tr_lock_vx_id_permanently ON public.profiles;
CREATE TRIGGER tr_lock_vx_id_permanently
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.lock_vx_id_permanently();

-- 8. Grant Table Permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;

-- 9. Reload Supabase Schema Cache
NOTIFY pgrst, 'reload schema';
