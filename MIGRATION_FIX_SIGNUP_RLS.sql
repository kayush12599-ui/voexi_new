-- ==========================================
-- VOEXI HIGH-SECURITY IDENTITY SYSTEM (high Level)
-- ==========================================

-- 1. High-Integrity VX ID Generator
-- Generates 12 digits using ISO 7064 (MOD 97-10) checksum logic
-- This is the same security standard used by International Banks (IBAN).
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
    -- A. Generate 10 random digits (the base identity)
    random_part := '';
    FOR i IN 1..10 LOOP
      random_part := random_part || floor(random() * 10)::TEXT;
    END LOOP;

    -- B. Calculate ISO 7064 MOD 97-10 Checksum
    -- Standard: (random_part * 100) % 97
    -- We want (98 - (Result % 97)) to get the 2-digit check digit
    checksum_val := (random_part::BIGINT * 100) % 97;
    checksum_val := 98 - checksum_val;
    IF checksum_val > 97 THEN checksum_val := checksum_val - 97; END IF;

    checksum_str := lpad(checksum_val::TEXT, 2, '0');
    final_id := random_part || checksum_str;

    -- C. Collision Check
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE vx_id_number = final_id) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN final_id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 2. Prevent VX-ID Modification (Immutability)
-- Once assigned, even the user cannot change their ID.
CREATE OR REPLACE FUNCTION public.protect_vx_id()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.vx_id_number IS NOT NULL AND NEW.vx_id_number <> OLD.vx_id_number THEN
    NEW.vx_id_number := OLD.vx_id_number; -- Force reset to original
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_protect_vx_id ON public.profiles;
CREATE TRIGGER tr_protect_vx_id
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_vx_id();

-- 3. Enhanced Setup Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS trigger AS $$
DECLARE
  new_vx_id TEXT;
  v_username TEXT;
  v_channel_name TEXT;
  v_mobile TEXT;
BEGIN
  new_vx_id := public.generate_vx_id();

  -- Generate a "Cool" fallback username if missing
  -- Prefixes: vx_agent, spectre, neural, vortex, pioneer
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    (ARRAY['vx_agent_', 'spectre_', 'neural_', 'vortex_', 'pioneer_'])[floor(random() * 5 + 1)] || substring(md5(random()::text) from 1 for 4)
  );
  v_channel_name := COALESCE(
    NEW.raw_user_meta_data->>'channel_name',
    'VOEXI Station'
  );
  v_mobile := COALESCE(NEW.raw_user_meta_data->>'mobile', '');

  -- Create Profile (SECURITY DEFINER bypasses RLS)
  INSERT INTO public.profiles (
    id, email, username, channel_name, mobile, vx_id_number, role, updated_at
  )
  VALUES (
    NEW.id, NEW.email, v_username, v_channel_name, v_mobile, new_vx_id, 'user', NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    vx_id_number = COALESCE(profiles.vx_id_number, EXCLUDED.vx_id_number);

  -- Create Wallet
  INSERT INTO public.wallets (user_id, balance, updated_at)
  VALUES (NEW.id, 0, NOW())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-bind Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_setup();

-- 5. RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 6. Ensure Unique Index
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_vx_id ON public.profiles(vx_id_number);
