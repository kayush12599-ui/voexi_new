-- ====================================================================
-- 🚀 VOEXI MASTER SUPABASE DATABASE SCHEMA (CLEAN & COMPLETE)
-- Copy and run this script in Supabase SQL Editor (https://supabase.com)
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. PROFILES TABLE (User Accounts, Channels, Verification & Presence)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  channel_name TEXT,
  avatar_url TEXT,
  custom_logo_url TEXT,
  logo_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'moderator', 'superadmin')),
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified')),
  vx_id_number TEXT UNIQUE,
  registration_number TEXT,
  xp INT DEFAULT 0,
  level INT DEFAULT 1,
  card_theme TEXT DEFAULT 'default',
  category TEXT,
  channel_category TEXT,
  gender TEXT,
  country TEXT,
  state TEXT,
  district TEXT,
  neural_status TEXT DEFAULT 'PSYCH-LINK ACTIVE',
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  is_online BOOLEAN DEFAULT false,
  last_maintenance_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );


-- --------------------------------------------------------------------
-- 2. POSTS TABLE (Reels, Videos, Photos, Writing Letters & Sounds)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  post_type TEXT DEFAULT 'Video', -- 'Reels', 'Video', 'Photo', 'Letter', 'Sound', 'Story', 'Live'
  media_type TEXT DEFAULT 'video', -- 'video', 'image', 'audio', 'text'
  media_url TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  audio_title TEXT,
  audio_author TEXT,
  is_reel BOOLEAN DEFAULT false,
  is_remix BOOLEAN DEFAULT false,
  is_neural BOOLEAN DEFAULT false,
  collab_status TEXT DEFAULT 'none',
  category TEXT DEFAULT 'FOR YOU',
  views_count INT DEFAULT 0,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  shares_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public posts viewable by everyone"
  ON public.posts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all posts"
  ON public.posts FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );


-- --------------------------------------------------------------------
-- 3. LIVE BROADCASTS TABLE (Realtime Live Streams)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  stream_key TEXT UNIQUE NOT NULL,
  format TEXT DEFAULT '9:16', -- '9:16' or '16:9'
  status TEXT DEFAULT 'preparing' CHECK (status IN ('preparing', 'live', 'ended')),
  hls_url TEXT,
  viewer_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

ALTER TABLE public.live_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Live broadcasts viewable by everyone"
  ON public.live_broadcasts FOR SELECT USING (true);

CREATE POLICY "Users can manage their live broadcasts"
  ON public.live_broadcasts FOR ALL USING (auth.uid() = user_id);


-- --------------------------------------------------------------------
-- 4. MESSAGES TABLE (Realtime Direct & Group Chat)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text', -- 'text', 'image', 'video', 'voice', 'poll', 'gift'
  is_read BOOLEAN DEFAULT false,
  is_view_once BOOLEAN DEFAULT false,
  deleted_for UUID[] DEFAULT ARRAY[]::UUID[],
  reactions JSONB DEFAULT '{}'::jsonb,
  parent_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages sent to or by them"
  ON public.messages FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id OR group_id IS NOT NULL
  );

CREATE POLICY "Users can insert messages"
  ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their messages"
  ON public.messages FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can delete their messages"
  ON public.messages FOR DELETE USING (auth.uid() = sender_id);


-- --------------------------------------------------------------------
-- 5. GROUPS & CLUSTERS TABLE (Community Chat Rooms)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  features TEXT[] DEFAULT ARRAY['polls', 'ai_bot', 'voice', 'media', 'gifts', 'sounds', 'view_once', 'reactions'],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view for groups" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Group creators can manage groups" ON public.groups FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Public view for group members" ON public.group_members FOR SELECT USING (true);
CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);


-- --------------------------------------------------------------------
-- 6. CONTENT REPORTS & MODERATION TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON public.content_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can manage all reports"
  ON public.content_reports FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'moderator'))
  );


-- --------------------------------------------------------------------
-- 7. REALTIME PUBLICATION ENABLEMENT
-- --------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_broadcasts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

console.log("🎉 VOEXI Master Supabase Schema Created Successfully!");
