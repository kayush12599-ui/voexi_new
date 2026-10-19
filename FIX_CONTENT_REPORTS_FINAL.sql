-- VOEXI FINAL CLOUD REPORTING SETUP
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Table structure verification (Ensure all columns are correct)
CREATE TABLE IF NOT EXISTS public.content_reports (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Security Protocol (RLS)
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Clean existing policies to prevent "Policy already exists" errors
DROP POLICY IF EXISTS "Users can insert own reports" ON public.content_reports;
DROP POLICY IF EXISTS "Users can view own reports" ON public.content_reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.content_reports;
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON public.content_reports;

-- REQUIREMENT: reporter_id MUST match auth.uid()
-- This is the strict policy that matches the application logic
CREATE POLICY "Users can insert own reports"
ON public.content_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

-- REQUIREMENT: Users can see only their own history
CREATE POLICY "Users can view own reports"
ON public.content_reports
FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

-- REQUIREMENT: Admins/Moderators see everything
CREATE POLICY "Admins can view all reports"
ON public.content_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'moderator')
  )
);

-- 3. Cache Synchronization
NOTIFY pgrst, 'reload schema';
