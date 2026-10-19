-- VIBROXE GLOBAL FOLLOW SYSTEM MIGRATION
-- Run this in your Supabase SQL Editor

-- 1. Create the new followers table
CREATE TABLE IF NOT EXISTS followers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, creator_id)
);

-- 2. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_creator ON followers(creator_id);

-- 3. Ensure profiles table has subscribers_count column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='subscribers_count') THEN
        ALTER TABLE profiles ADD COLUMN subscribers_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 4. (Optional) Migrate existing data from old follows table
-- Uncomment the lines below if you want to keep existing follows
/*
INSERT INTO followers (follower_id, creator_id, created_at)
SELECT follower_id, following_id, created_at FROM follows
ON CONFLICT DO NOTHING;
*/

-- 5. RPC functions for atomic increments (Optional, used in lib/social.ts if available)
-- These are safer than client-side increments
/*
CREATE OR REPLACE FUNCTION increment_follower_count(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET subscribers_count = subscribers_count + 1 WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_follower_count(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET subscribers_count = GREATEST(0, subscribers_count - 1) WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;
*/
