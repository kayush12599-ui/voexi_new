-- VOEXI CONTENT REPORT SYSTEM
-- RUN THIS IN SUPABASE SQL EDITOR TO CREATE THE NEW TABLE

-- 1. Create the content_reports table
CREATE TABLE IF NOT EXISTS public.content_reports (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Anyone authenticated can submit a report
CREATE POLICY "Users can submit reports" ON public.content_reports
FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Only admins can see all reports
CREATE POLICY "Admins can view reports" ON public.content_reports
FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Users can see their own reports
CREATE POLICY "Users can see own reports" ON public.content_reports
FOR SELECT USING (auth.uid() = reporter_id);
