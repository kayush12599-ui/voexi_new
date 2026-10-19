-- ====================================================================
-- FIX FOLLOWERS TABLE RLS POLICIES & UNIQUE CONSTRAINTS
-- ====================================================================

-- 1. Create followers Table if not exists
CREATE TABLE IF NOT EXISTS public.followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT followers_unique_follower_creator UNIQUE (follower_id, creator_id)
);

-- 2. Add Unique Constraint if table already existed without it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'followers_unique_follower_creator'
    ) THEN
        ALTER TABLE public.followers ADD CONSTRAINT followers_unique_follower_creator UNIQUE (follower_id, creator_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 3. Enable RLS on followers Table
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- 4. DROP OLD POLICIES TO AVOID CONFLICTS
DROP POLICY IF EXISTS "Followers view policy" ON public.followers;
DROP POLICY IF EXISTS "Followers insert policy" ON public.followers;
DROP POLICY IF EXISTS "Followers delete policy" ON public.followers;
DROP POLICY IF EXISTS "Anyone can view followers" ON public.followers;
DROP POLICY IF EXISTS "Users can follow creators" ON public.followers;
DROP POLICY IF EXISTS "Users can unfollow creators" ON public.followers;

-- 5. CREATE CLEAN RLS POLICIES FOR FOLLOWERS
-- Anyone can view followers/subscribers
CREATE POLICY "Anyone can view followers"
ON public.followers
FOR SELECT
USING (true);

-- Authenticated users can follow when follower_id is their own auth.uid()
CREATE POLICY "Users can follow creators"
ON public.followers
FOR INSERT
WITH CHECK (auth.uid() = follower_id);

-- Authenticated users can unfollow when follower_id is their own auth.uid()
CREATE POLICY "Users can unfollow creators"
ON public.followers
FOR DELETE
USING (auth.uid() = follower_id);

-- 6. VERIFY
SELECT COUNT(*) FROM public.followers;
