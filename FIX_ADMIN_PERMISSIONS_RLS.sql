-- 🚀 VOEXI SQL MIGRATION: FIX ADMIN PERMISSIONS & PREVENT CROSS-USER BLEED

-- 1. Ensure role column exists on profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 2. Allow Admins to UPDATE any profile
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (
  auth.uid() = id OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'superadmin')
  )
);

-- 3. Allow Admins to DELETE profiles
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
CREATE POLICY "Admins can delete any profile"
ON public.profiles FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'superadmin')
  )
);

-- 4. Allow Admins to manage all posts
DROP POLICY IF EXISTS "Admins can manage all posts" ON public.posts;
CREATE POLICY "Admins can manage all posts"
ON public.posts FOR ALL
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'superadmin')
  )
);

-- 5. Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.posts TO authenticated;

-- 6. Reload Supabase Schema Cache
NOTIFY pgrst, 'reload schema';
