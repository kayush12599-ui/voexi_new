-- 1. Create or Update Signal Audits Table
CREATE TABLE IF NOT EXISTS public.signal_audits (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    initiator_id UUID REFERENCES public.profiles(id),
    target_user_id UUID REFERENCES public.profiles(id),
    signal_type TEXT, -- 'video', 'comment', 'profile', 'chat', 'image'
    signal_id TEXT,
    signal_title TEXT,
    signal_url TEXT,
    anomaly_category TEXT,
    neural_log TEXT,
    evidence_fingerprint TEXT,
    neural_confidence FLOAT DEFAULT 0.0,
    risk_level TEXT DEFAULT 'low',
    spectrum_priority INTEGER DEFAULT 1,
    audit_status TEXT DEFAULT 'detecting', -- 'detecting', 'resolved', 'dismissed'
    audited_by UUID REFERENCES public.profiles(id),
    audited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS (if not already enabled)
ALTER TABLE public.signal_audits ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert audits" ON public.signal_audits;
DROP POLICY IF EXISTS "Users see their audits" ON public.signal_audits;
DROP POLICY IF EXISTS "Admins manage all audits" ON public.signal_audits;

-- 4. Create proper policies
CREATE POLICY "Users can insert audits"
ON public.signal_audits FOR INSERT
WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Users see their audits"
ON public.signal_audits FOR SELECT
USING (auth.uid() = initiator_id);

CREATE POLICY "Admins manage all audits"
ON public.signal_audits FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 5. Sync emails to profiles (Crucial for MailService)
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;
