-- VOEXI NEURAL MODERATION SYSTEM (YOUTUBE-STYLE)

-- 1. Update Profiles to track Guidelines Acceptance and Account Status
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS guidelines_accepted BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'warned', 'suspended', 'banned'));

-- 2. Update Posts to track Moderation Status
ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'removed'));
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_moderation_score FLOAT DEFAULT 1.0; -- 1.0 = safe, 0.0 = violation

-- 3. Create Moderation Reports Table
CREATE TABLE IF NOT EXISTS moderation_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN ('Spam', 'Harassment', 'Violence', 'Copyright', 'Adult Content', 'Hate Speech', 'Other')),
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Admin Actions Log
CREATE TABLE IF NOT EXISTS moderation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES profiles(id),
    target_user_id UUID REFERENCES profiles(id),
    target_post_id UUID REFERENCES posts(id),
    action_type TEXT NOT NULL CHECK (action_type IN ('Approve', 'Remove Video', 'Warn User', 'Suspend Account', 'Reject Report')),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;

-- 6. Policies
-- Users can insert reports
CREATE POLICY "users_can_report" ON moderation_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Only admins can see reports and actions
CREATE POLICY "admins_view_reports" ON moderation_reports
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "admins_view_actions" ON moderation_actions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "admins_modify_reports" ON moderation_reports
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 7. Notification Trigger (Supabase Trigger for Admin Email - Logic only, needs Supabase Cloud Config)
-- Teamvoexi@gmail.com is the configured admin email.
