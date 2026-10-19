-- 1. Create Verification Request Table
CREATE TABLE IF NOT EXISTS public.verification_requests (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    selfie_url TEXT,
    channel_name TEXT,
    owner_name TEXT,
    mobile TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add verification fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration_number TEXT;

-- 3. RLS Policies
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own verification" ON public.verification_requests
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all verifications" ON public.verification_requests
FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- 4. Trigger to notify Admin (Console Log)
CREATE OR REPLACE FUNCTION public.notify_verification_request()
RETURNS trigger AS $$
BEGIN
  -- This will be caught by your vnc_server.py/MailService logic
  RAISE NOTICE 'VERIFICATION_REQUEST:%', NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_notify_verification
  AFTER INSERT ON public.verification_requests
  FOR EACH ROW EXECUTE PROCEDURE public.notify_verification_request();
