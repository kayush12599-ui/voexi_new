-- ==========================================
-- VOEXI ADMIN IDENTITY SETUP
-- Run this in Supabase SQL Editor to assign a high-security ID to the admin.
-- ==========================================

-- 1. Generate and assign High-Security VX-ID
UPDATE public.profiles
SET vx_id_number = public.generate_vx_id()
WHERE email = 'teamvoexi@gmail.com';

-- 2. Verify Result
SELECT email, username, vx_id_number
FROM public.profiles
WHERE email = 'teamvoexi@gmail.com';

-- 3. Ensure Admin Role is set correctly
UPDATE public.profiles
SET role = 'admin', verification_status = 'verified'
WHERE email = 'teamvoexi@gmail.com';
