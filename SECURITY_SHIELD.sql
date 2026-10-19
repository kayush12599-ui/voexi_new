-- ==========================================
-- VOEXI PRODUCTION SECURITY SHIELD (STABLE)
-- ==========================================

-- 1. Enable RLS on all core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_videos ENABLE ROW LEVEL SECURITY;

-- 2. Profiles Policies
-- Everyone can read profiles
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT USING (true);

-- Only user can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3. Posts Policies
-- Everyone can view public posts
CREATE POLICY "Public posts are viewable by everyone"
ON public.posts FOR SELECT USING (visibility = 'public');

-- Only creator can insert/update/delete their posts
CREATE POLICY "Creators can manage own posts"
ON public.posts FOR ALL USING (auth.uid() = user_id);

-- 4. Comments Policies
CREATE POLICY "Comments are viewable by everyone"
ON public.comments FOR SELECT USING (true);

CREATE POLICY "Logged in users can post comments"
ON public.comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete own comments"
ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- 5. Saved Videos (Private)
CREATE POLICY "Users can only see their own collection"
ON public.saved_videos FOR ALL USING (auth.uid() = user_id);

-- 6. Notifications (Private)
CREATE POLICY "Users can only see their own notifications"
ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can update notification status"
ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 7. Block Anonymous Deletions (Global)
REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM anon;
