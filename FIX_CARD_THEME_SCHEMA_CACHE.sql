-- 🚀 VOEXI IDENTITY STUDIO ALL-COLUMNS SCHEMA FIX
-- Run this in Supabase SQL Editor to fix missing custom_label / card_theme / neural_status columns

-- 1. Add all Identity Studio columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS card_theme TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS custom_label TEXT,
ADD COLUMN IF NOT EXISTS neural_status TEXT DEFAULT 'PSYCH-LINK ACTIVE',
ADD COLUMN IF NOT EXISTS card_studio_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS card_unlocked_themes TEXT[] DEFAULT ARRAY['default']::text[];

-- 2. Update default values for existing null rows
UPDATE public.profiles
SET card_theme = 'default'
WHERE card_theme IS NULL OR card_theme = '';

UPDATE public.profiles
SET neural_status = 'PSYCH-LINK ACTIVE'
WHERE neural_status IS NULL OR neural_status = '';

-- 3. Grant table permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;

-- 4. RELOAD SUPABASE POSTGREST SCHEMA CACHE (Crucial for PostgREST schema cache update)
NOTIFY pgrst, 'reload schema';
