-- VOEXI COMPLETE REPORT & MODERATION SYSTEM

-- 1. Schema Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Moderation Tables
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('video', 'comment', 'profile', 'chat')),
    content_id UUID NOT NULL, -- ID of the reported video, comment, etc.
    reason TEXT NOT NULL CHECK (reason IN (
        'Spam', 'Harassment or Bullying', 'Hate Speech', 'Violence',
        'Adult Content', 'Child Safety', 'Copyright', 'Fake Information',
        'Scam or Fraud', 'Other'
    )),
    description TEXT,
    screenshot_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'rejected')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    ai_confidence FLOAT DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS moderation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
    admin_id UUID REFERENCES profiles(id),
    target_user_id UUID REFERENCES profiles(id),
    content_type TEXT,
    content_id UUID,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'Warn User', 'Remove Content', 'Restore Content',
        'Suspend Account', 'Permanently Ban', 'Reject Report'
    )),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES profiles(id),
    reason TEXT NOT NULL,
    report_id UUID REFERENCES reports(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS appeals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    report_id UUID REFERENCES reports(id),
    action_id UUID REFERENCES moderation_actions(id),
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Update Profiles for Moderation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS strikes INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- 4. RLS Configuration
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;

-- Reports Policies
CREATE POLICY "Users can create reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view their own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Admins can view all reports" ON reports FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update reports" ON reports FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Moderation Actions Policies
CREATE POLICY "Admins can manage actions" ON moderation_actions FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Warnings Policies
CREATE POLICY "Users can view their own warnings" ON warnings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage warnings" ON warnings FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Appeals Policies
CREATE POLICY "Users can manage their own appeals" ON appeals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all appeals" ON appeals FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 5. Helper function for rate-limiting reports (simple version)
CREATE OR REPLACE FUNCTION check_report_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (
        SELECT COUNT(*) FROM reports
        WHERE reporter_id = NEW.reporter_id
        AND created_at > NOW() - INTERVAL '1 hour'
    ) > 5 THEN
        RAISE EXCEPTION 'Rate limit exceeded. Please wait before reporting again.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_check_report_limit
BEFORE INSERT ON reports
FOR EACH ROW EXECUTE FUNCTION check_report_limit();

-- 6. Helper for incrementing strikes
CREATE OR REPLACE FUNCTION increment_strikes(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE profiles
    SET strikes = strikes + 1
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
