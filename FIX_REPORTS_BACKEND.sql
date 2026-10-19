-- VOEXI VIDEO REPORT SYSTEM BACKEND SETUP
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Ensure Signal Audits Table exists with all required fields
CREATE TABLE IF NOT EXISTS public.signal_audits (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    initiator_id UUID REFERENCES public.profiles(id),
    target_user_id UUID REFERENCES public.profiles(id),
    signal_type TEXT NOT NULL, -- 'video', 'image', 'comment', etc.
    signal_id UUID NOT NULL, -- The ID of the reported video
    signal_title TEXT, -- Storing title for quick reference in emails
    signal_url TEXT, -- Storing URL for quick access
    anomaly_category TEXT NOT NULL, -- The Reason
    neural_log TEXT, -- The User Description
    evidence_fingerprint TEXT, -- Screenshot URL
    neural_confidence FLOAT DEFAULT 0.0,
    risk_level TEXT DEFAULT 'low',
    spectrum_priority INTEGER DEFAULT 1,
    audit_status TEXT DEFAULT 'detecting', -- 'detecting', 'resolved', 'dismissed'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add email column to profiles if missing for notifications
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Enable RLS and set policies
ALTER TABLE public.signal_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert audits" ON public.signal_audits;
CREATE POLICY "Anyone can insert audits" ON public.signal_audits FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own audits" ON public.signal_audits;
CREATE POLICY "Users can view own audits" ON public.signal_audits FOR SELECT USING (auth.uid() = initiator_id);

DROP POLICY IF EXISTS "Admins can do everything" ON public.signal_audits;
CREATE POLICY "Admins can do everything" ON public.signal_audits FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
