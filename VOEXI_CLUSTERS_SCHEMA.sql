-- 🚀 VOEXI NEURAL CLUSTERS (GROUP CHAT SYSTEM) - CLEAN & OPTIMIZED SCHEMA
-- Run this in Supabase SQL Editor once to set up Clusters & Messaging tables.

-- 1. Cleanup old triggers & tables if needed
DROP TRIGGER IF EXISTS trigger_add_leader ON groups;
DROP TRIGGER IF EXISTS after_group_create ON groups;
DROP TRIGGER IF EXISTS trigger_after_group_insert ON groups;
DROP FUNCTION IF EXISTS add_leader_to_members();
DROP FUNCTION IF EXISTS add_group_creator_to_members();
DROP FUNCTION IF EXISTS handle_new_group_creator();

-- 2. Create Groups/Clusters Table
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    leader_vx TEXT,
    avatar_url TEXT,
    description TEXT,
    email TEXT,
    category TEXT DEFAULT 'Technology',
    password TEXT, -- For Private Clusters
    type TEXT DEFAULT 'public' CHECK (type IN ('public', 'private', 'friends')),
    tier TEXT DEFAULT 'silver' CHECK (tier IN ('silver', 'gold', 'diamond')),
    features TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Group Members Table
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'admin', 'member')),
    tier TEXT DEFAULT 'silver' CHECK (tier IN ('silver', 'gold', 'diamond')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- 4. Enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to prevent 42710 error
DROP POLICY IF EXISTS "groups_select_policy" ON groups;
DROP POLICY IF EXISTS "groups_insert_policy" ON groups;
DROP POLICY IF EXISTS "groups_update_policy" ON groups;
DROP POLICY IF EXISTS "groups_delete_policy" ON groups;

DROP POLICY IF EXISTS "members_select_policy" ON group_members;
DROP POLICY IF EXISTS "members_insert_policy" ON group_members;
DROP POLICY IF EXISTS "members_update_policy" ON group_members;

-- 6. Policies for Groups
CREATE POLICY "groups_select_policy" ON groups
    FOR SELECT USING (
        type != 'private'
        OR created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND user_id = auth.uid())
    );

CREATE POLICY "groups_insert_policy" ON groups
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "groups_update_policy" ON groups
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "groups_delete_policy" ON groups
    FOR DELETE USING (auth.uid() = created_by);

-- 7. Policies for Group Members
CREATE POLICY "members_select_policy" ON group_members
    FOR SELECT USING (true);

CREATE POLICY "members_insert_policy" ON group_members
    FOR INSERT WITH CHECK (true);

CREATE POLICY "members_update_policy" ON group_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_id = group_members.group_id
            AND user_id = auth.uid()
            AND role IN ('leader', 'admin')
        )
    );

-- 8. Trigger to automatically add creator as 'leader'
CREATE OR REPLACE FUNCTION handle_new_group_creator()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO group_members (group_id, user_id, role, tier)
    VALUES (NEW.id, NEW.created_by, 'leader', 'diamond')
    ON CONFLICT (group_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_after_group_insert
AFTER INSERT ON groups
FOR EACH ROW EXECUTE FUNCTION handle_new_group_creator();

-- 9. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'voice', 'gift', 'video_note', 'call_audio', 'call_video', 'call_screen')),
    is_read BOOLEAN DEFAULT false,
    is_view_once BOOLEAN DEFAULT false,
    parent_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
DROP POLICY IF EXISTS "messages_update_policy" ON messages;

CREATE POLICY "messages_select_policy" ON messages
    FOR SELECT USING (
        auth.uid() = sender_id
        OR auth.uid() = receiver_id
        OR (group_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = messages.group_id
            AND group_members.user_id = auth.uid()
        ))
    );

CREATE POLICY "messages_insert_policy" ON messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages_update_policy" ON messages
    FOR UPDATE USING (
        auth.uid() = receiver_id
        OR (group_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = messages.group_id
            AND group_members.user_id = auth.uid()
        ))
    );

-- 10. Table & Schema Permissions
GRANT ALL ON groups TO authenticated;
GRANT ALL ON group_members TO authenticated;
GRANT ALL ON messages TO authenticated;

-- 11. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
