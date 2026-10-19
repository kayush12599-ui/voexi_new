-- ==========================================
-- VOEXI ADMIN IDENTITY SETUP (ULTIMATE)
-- Includes Identity Generator + Admin Assignment
-- ==========================================

-- 1. Create Generator Function (Safe & Idempotent)
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
    -- Generate 10 random digits
    random_part := '';
    FOR i IN 1..10 LOOP
      random_part := random_part || floor(random() * 10)::TEXT;
    END LOOP;

    -- ISO 7064 MOD 97-10 Checksum logic (Aadhaar/IBAN standard)
    checksum_val := (random_part::BIGINT * 100) % 97;
    checksum_val := 98 - checksum_val;
    IF checksum_val > 97 THEN checksum_val := checksum_val - 97; END IF;

    checksum_str := lpad(checksum_val::TEXT, 2, '0');
    final_id := random_part || checksum_str;

    -- Collision Check
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE vx_id_number = final_id) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN final_id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 2. Setup Admin Identity & Roles
-- This will generate a high-security ID for your specific email
UPDATE public.profiles
SET
  vx_id_number = public.generate_vx_id(),
  role = 'admin',
  verification_status = 'verified'
WHERE email = 'teamvoexi@gmail.com';

-- 3. Verify the changes
SELECT id, email, username, vx_id_number, role, verification_status
FROM public.profiles
WHERE email = 'teamvoexi@gmail.com';
