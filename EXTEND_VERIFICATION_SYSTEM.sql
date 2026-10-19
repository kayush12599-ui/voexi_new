-- Extend verification_requests table to support international users and more details
ALTER TABLE public.verification_requests ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.verification_requests ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.verification_requests ADD COLUMN IF NOT EXISTS id_document_type TEXT; -- 'aadhar', 'pan', 'passport', 'national_id', 'driving_license'
ALTER TABLE public.verification_requests ADD COLUMN IF NOT EXISTS id_document_url TEXT; -- private Supabase Storage path
ALTER TABLE public.verification_requests ADD COLUMN IF NOT EXISTS channel_category TEXT;
ALTER TABLE public.verification_requests ADD COLUMN IF NOT EXISTS content_declaration BOOLEAN DEFAULT FALSE;
ALTER TABLE public.verification_requests ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.verification_requests ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.verification_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Ensure storage bucket 'id_documents' exists (Private)
-- Note: This usually needs to be done via Supabase Dashboard for full bucket config,
-- but we define the RLS policies here.

-- RLS for verification_requests (Safety Check)
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own requests
DROP POLICY IF EXISTS "Users can view own verification" ON public.verification_requests;
CREATE POLICY "Users can view own verification" ON public.verification_requests
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Policy: Users can insert their own requests
DROP POLICY IF EXISTS "Users can insert own verification" ON public.verification_requests;
CREATE POLICY "Users can insert own verification" ON public.verification_requests
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Storage Policies for 'id_documents' bucket
-- These assume the bucket 'id_documents' is already created in the dashboard as PRIVATE.
-- If you haven't created it, go to Storage -> New Bucket -> name: 'id_documents', Public: No.

-- Policy: Allow users to upload to their own folder
-- Path format: user_id/filename.ext
CREATE POLICY "Users can upload ID documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'id_documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy: Allow users to view their own uploaded documents
CREATE POLICY "Users can view own ID documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'id_documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy: Allow admins to view ALL ID documents
CREATE POLICY "Admins can view all ID documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'id_documents' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
