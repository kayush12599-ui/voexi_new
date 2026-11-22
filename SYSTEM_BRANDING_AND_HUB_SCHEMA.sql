-- ====================================================================
-- VOEXI SYSTEM BRANDING & MASTER CONTENT HUB SCANNING LOCATIONS TABLE
-- RUN THIS SCRIPT IN YOUR SUPABASE SQL EDITOR
-- ====================================================================

-- 1. CREATE SYSTEM BRANDING & SCANNING LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.system_branding_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL DEFAULT 'about_voexi_info',
    header_label TEXT NOT NULL DEFAULT 'ELITE CORE LOG',
    app_name TEXT NOT NULL DEFAULT 'VOEXI',
    status_badge TEXT NOT NULL DEFAULT 'PRIVATE BETA • NEURAL LINK ACTIVE',
    about_title TEXT NOT NULL DEFAULT 'ABOUT VOEXI',
    about_desc TEXT NOT NULL DEFAULT 'VOEXI is a next-generation AI-powered social platform designed for creators, communities, and meaningful digital experiences. Built with innovation, privacy, and performance at its core, VOEXI offers a fresh social experience focused on creativity, intelligent features, and authentic connections.',
    version TEXT NOT NULL DEFAULT '1.0.0',
    status TEXT NOT NULL DEFAULT 'COMING SOON',
    developer TEXT NOT NULL DEFAULT 'VOEXI TEAM',
    origin TEXT NOT NULL DEFAULT 'CORE PROTOCOL',
    footer_thankyou TEXT NOT NULL DEFAULT 'Thank you for being part of VOEXI. Together we''re building the future of social connection.',
    copyright TEXT NOT NULL DEFAULT '© 2026 VOEXI. ALL RIGHTS RESERVED.',
    scanning_locations JSONB DEFAULT '["D:\\vibroxe_media_storage", "C:\\vibroxe_new\\media_server_storage", "C:\\vibroxe_new\\assets\\images", "D:\\"]'::jsonb,
    extra_metadata JSONB DEFAULT '{}'::jsonb,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.system_branding_config ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES FOR PUBLIC READ & ADMIN WRITE ACCESS
DROP POLICY IF EXISTS "Public read access for system branding" ON public.system_branding_config;
CREATE POLICY "Public read access for system branding"
    ON public.system_branding_config
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admin write access for system branding" ON public.system_branding_config;
CREATE POLICY "Admin write access for system branding"
    ON public.system_branding_config
    FOR ALL
    USING (auth.uid() IS NOT NULL);

-- 4. INSERT OR UPDATE DEFAULT SYSTEM BRANDING ROW
INSERT INTO public.system_branding_config (
    config_key,
    header_label,
    app_name,
    status_badge,
    about_title,
    about_desc,
    version,
    status,
    developer,
    origin,
    footer_thankyou,
    copyright,
    scanning_locations
) VALUES (
    'about_voexi_info',
    'ELITE CORE LOG',
    'VOEXI',
    'PRIVATE BETA • NEURAL LINK ACTIVE',
    'ABOUT VOEXI',
    'VOEXI is a next-generation AI-powered social platform designed for creators, communities, and meaningful digital experiences. Built with innovation, privacy, and performance at its core, VOEXI offers a fresh social experience focused on creativity, intelligent features, and authentic connections.',
    '1.0.0',
    'COMING SOON',
    'VOEXI TEAM',
    'CORE PROTOCOL',
    'Thank you for being part of VOEXI. Together we''re building the future of social connection.',
    '© 2026 VOEXI. ALL RIGHTS RESERVED.',
    '["D:\\vibroxe_media_storage", "C:\\vibroxe_new\\media_server_storage", "C:\\vibroxe_new\\assets\\images", "D:\\"]'::jsonb
)
ON CONFLICT (config_key) DO UPDATE SET
    header_label = EXCLUDED.header_label,
    app_name = EXCLUDED.app_name,
    status_badge = EXCLUDED.status_badge,
    about_title = EXCLUDED.about_title,
    about_desc = EXCLUDED.about_desc,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    developer = EXCLUDED.developer,
    origin = EXCLUDED.origin,
    footer_thankyou = EXCLUDED.footer_thankyou,
    copyright = EXCLUDED.copyright,
    scanning_locations = EXCLUDED.scanning_locations,
    updated_at = NOW();
