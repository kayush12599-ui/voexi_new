-- ====================================================================
-- VOEXI ULTRA HIGH-SECURITY: STRICT UNIQUE EMAIL & USERNAME CONSTRAINTS
-- ====================================================================

-- 1. Ensure email column exists on profiles
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Clean up any duplicate email entries in public.profiles
-- (Keeps the latest updated profile for each registered email)
DELETE FROM public.profiles p1
WHERE p1.email IS NOT NULL
  AND p1.email != ''
  AND EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE LOWER(p2.email) = LOWER(p1.email)
      AND p2.id != p1.id
      AND (p2.updated_at > p1.updated_at OR (p2.updated_at = p1.updated_at AND p2.id > p1.id))
);

-- 3. Create Case-Insensitive Unique Index on LOWER(email)
DROP INDEX IF EXISTS idx_profiles_email_lower;
CREATE UNIQUE INDEX idx_profiles_email_lower
ON public.profiles (LOWER(email))
WHERE email IS NOT NULL AND email != '';

-- 4. Create Unique Index on LOWER(username)
DROP INDEX IF EXISTS idx_profiles_username_lower;
CREATE UNIQUE INDEX idx_profiles_username_lower
ON public.profiles (LOWER(username))
WHERE username IS NOT NULL AND username != '';

-- 5. Add UNIQUE constraint to profiles(email)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Constraint already exists or unique index enforces it.';
END $$;

-- 6. Grant Permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;

-- 7. Verify Unique Index
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'profiles' AND indexname LIKE '%email%';
