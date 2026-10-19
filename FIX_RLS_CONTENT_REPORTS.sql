-- VOEXI RLS FIX: CONTENT REPORTS
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Enable RLS
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- 2. Clean up existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON public.content_reports;
DROP POLICY IF EXISTS "Enable select for admins" ON public.content_reports;
DROP POLICY IF EXISTS "Anyone can report" ON public.content_reports;
DROP POLICY IF EXISTS "Admins can see all" ON public.content_reports;
DROP POLICY IF EXISTS "Users can submit reports" ON public.content_reports;
DROP POLICY IF EXISTS "Admins can view reports" ON public.content_reports;
DROP POLICY IF EXISTS "Users can see own reports" ON public.content_reports;

-- 3. Policy: Authenticated users can INSERT their own reports
-- Requirement: reporter_id must equal auth.uid()
CREATE POLICY "Users can insert own reports"
ON public.content_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

-- 4. Policy: Users can SELECT only their own reports
CREATE POLICY "Users can view own reports"
ON public.content_reports
FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

-- 5. Policy: Moderators/Admins can view ALL reports
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

-- 6. Refresh schema cache
NOTIFY pgrst, 'reload schema';
