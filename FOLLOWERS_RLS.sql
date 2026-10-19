-- VIBROXE FOLLOWERS RLS FIX
-- Run this in Supabase SQL Editor

-- 1. Enable RLS on followers table
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Users can see who follows whom (SELECT)
-- Usually follow data is public in social apps
CREATE POLICY "Anyone can view followers"
ON followers
FOR SELECT
USING (true);

-- 3. Policy: Authenticated users can follow others (INSERT)
-- Constraint: follower_id must match the user's own ID
CREATE POLICY "Users can follow creators"
ON followers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id);

-- 4. Policy: Authenticated users can unfollow (DELETE)
-- Constraint: Users can only delete their own follow records
CREATE POLICY "Users can unfollow creators"
ON followers
FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);

-- 5. Extra: Fix profiles update if you are updating subscriber count from client
-- IMPORTANT: It's better to use a Trigger or RPC to update counts.
-- But if you keep the current client-side logic, you need this:
CREATE POLICY "System can update profile counts"
ON profiles
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
-- WARNING: The above policy for 'profiles' is very permissive.
-- Better to use a database trigger for subscriber counts. (See below)

-- RECOMMENDED: Database trigger for automatic subscriber count updates
-- This removes the need for client-side .update() calls and permissive RLS.

/*
CREATE OR REPLACE FUNCTION handle_follower_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE profiles SET subscribers_count = subscribers_count + 1 WHERE id = NEW.creator_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE profiles SET subscribers_count = GREATEST(0, subscribers_count - 1) WHERE id = OLD.creator_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_on_follower_change ON followers;
CREATE TRIGGER tr_on_follower_change
AFTER INSERT OR DELETE ON followers
FOR EACH ROW EXECUTE FUNCTION handle_follower_change();
*/
