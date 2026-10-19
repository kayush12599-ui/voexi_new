-- VOEXI FOLLOWERS/SUBSCRIBERS SYSTEM FIX
-- Run this in Supabase SQL Editor

-- 1. CREATE FOLLOWERS TABLE
CREATE TABLE IF NOT EXISTS public.followers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, creator_id)
);

-- 2. ENABLE RLS
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES
DROP POLICY IF EXISTS "Anyone can view subscriber counts" ON public.followers;
CREATE POLICY "Anyone can view subscriber counts" ON public.followers
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can subscribe" ON public.followers;
CREATE POLICY "Users can subscribe" ON public.followers
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unsubscribe" ON public.followers;
CREATE POLICY "Users can unsubscribe" ON public.followers
    FOR DELETE USING (auth.uid() = follower_id);

-- 4. ADD HELPER COLUMN TO PROFILES (Optional but good for performance)
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscribers_count INTEGER DEFAULT 0;
