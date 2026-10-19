-- ==========================================
-- VOEXI SIGNUP RLS & AUTO-PROFILE MIGRATION
-- ==========================================

-- 1. VX ID Generator (Idempotent & Collision Resistant)
CREATE OR REPLACE FUNCTION public.generate_vx_id()
RETURNS TEXT AS $$
DECLARE
  random_part TEXT;
  sum_val INTEGER;
  checksum TEXT;
  i INTEGER;
  final_id TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    random_part := '';
    sum_val := 0;
    FOR i IN 1..10 LOOP
      random_part := random_part || floor(random() * 10)::TEXT;
    END LOOP;

    FOR i IN 0..9 LOOP
      sum_val := sum_val + (substring(random_part from i+1 for 1)::INTEGER * (i + 7));
    END LOOP;

    checksum := lpad((sum_val % 97)::TEXT, 2, '0');
    final_id := random_part || checksum;

    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE vx_id_number = final_id) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN final_id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 2. Auth Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS trigger AS $$
DECLARE
  new_vx_id TEXT;
  v_username TEXT;
  v_channel_name TEXT;
  v_mobile TEXT;
BEGIN
  -- Generate unique identity
  new_vx_id := public.generate_vx_id();

  -- Extract metadata from signUp options.data or OAuth provider
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'preferred_username',
    'user_' || substring(new_vx_id from 9 for 4)
  );
  v_channel_name := COALESCE(
    NEW.raw_user_meta_data->>'channel_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    'VOEXI Station'
  );
  v_mobile := COALESCE(NEW.raw_user_meta_data->>'mobile', '');

  -- 1. Create Profile (Atomic & Secure)
  -- Uses SECURITY DEFINER to bypass RLS for this system-initiated operation
  INSERT INTO public.profiles (
    id,
    email,
    username,
    channel_name,
    mobile,
    vx_id_number,
    avatar_url,
    role,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_username,
    v_channel_name,
    v_mobile,
    new_vx_id,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    'user',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(profiles.username, EXCLUDED.username),
    channel_name = COALESCE(profiles.channel_name, EXCLUDED.channel_name),
    mobile = COALESCE(profiles.mobile, EXCLUDED.mobile),
    vx_id_number = COALESCE(profiles.vx_id_number, EXCLUDED.vx_id_number);

  -- 2. Create Wallet (Atomic)
  INSERT INTO public.wallets (user_id, balance, total_earned_coins, total_withdrawn_coins, updated_at)
  VALUES (NEW.id, 0, 0, 0, NOW())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_setup();

-- 4. Secure RLS Policies for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 5. Wallet RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
