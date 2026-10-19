-- VOEXI MASTER DATABASE MIGRATION
-- This script prepares the database for reporting, verification, and high-level card customization.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES TABLE ENHANCEMENTS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_label TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS neural_status TEXT DEFAULT 'PSYCH-LINK ACTIVE';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';

-- Sync emails from Auth to Profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 3. CONTENT REPORTS TABLE (Main Reporting System)
CREATE TABLE IF NOT EXISTS public.content_reports (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. SIGNAL AUDITS TABLE (Fallback & AI Analysis Table)
CREATE TABLE IF NOT EXISTS public.signal_audits (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    initiator_id UUID REFERENCES public.profiles(id),
    target_user_id UUID REFERENCES public.profiles(id),
    signal_type TEXT,
    signal_id TEXT,
    signal_title TEXT,
    signal_url TEXT,
    anomaly_category TEXT,
    neural_log TEXT,
    evidence_fingerprint TEXT,
    neural_confidence FLOAT DEFAULT 0.0,
    risk_level TEXT DEFAULT 'low',
    spectrum_priority INTEGER DEFAULT 1,
    audit_status TEXT DEFAULT 'detecting',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. STATION APPLICATIONS TABLE (Verification System)
CREATE TABLE IF NOT EXISTS public.station_applications (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    selfie_url TEXT,
    status TEXT DEFAULT 'pending',
    station_details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. SECURITY (RLS) POLICIES

-- Enable RLS on all relevant tables
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_applications ENABLE ROW LEVEL SECURITY;

-- CONTENT_REPORTS POLICIES
DROP POLICY IF EXISTS "Users can insert own reports" ON public.content_reports;
CREATE POLICY "Users can insert own reports" ON public.content_reports
FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admins manage all reports" ON public.content_reports;
CREATE POLICY "Admins manage all reports" ON public.content_reports
FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- SIGNAL_AUDITS POLICIES
DROP POLICY IF EXISTS "Users can insert audits" ON public.signal_audits;
CREATE POLICY "Users can insert audits" ON public.signal_audits
FOR INSERT TO authenticated WITH CHECK (auth.uid() = initiator_id);

DROP POLICY IF EXISTS "Admins manage all audits" ON public.signal_audits;
CREATE POLICY "Admins manage all audits" ON public.signal_audits
FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- 7. SET ADMIN ROLE (Change this to your actual admin email)
UPDATE public.profiles
SET role = 'admin', verification_status = 'verified'
WHERE email = 'teamvoexi@gmail.com';

-- 8. REFRESH CACHE
NOTIFY pgrst, 'reload schema';
