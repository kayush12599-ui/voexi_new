-- =======================================================
-- FIX GROUPS & GROUP_MEMBERS RLS POLICIES FOR GLOBAL SEARCH
-- =======================================================

-- 1. Enable RLS on groups table
ALTER TABLE IF EXISTS public.groups ENABLE ROW LEVEL SECURITY;

-- 2. Allow all authenticated users to SEARCH and VIEW all groups
DROP POLICY IF EXISTS "Public groups are viewable by everyone" ON public.groups;
CREATE POLICY "Public groups are viewable by everyone"
ON public.groups
FOR SELECT
USING (true);

-- 3. Allow authenticated users to CREATE groups
DROP POLICY IF EXISTS "Anyone can insert groups" ON public.groups;
CREATE POLICY "Anyone can insert groups"
ON public.groups
FOR INSERT
WITH CHECK (true);

-- 4. Allow authenticated users to UPDATE their created groups
DROP POLICY IF EXISTS "Leaders can update their groups" ON public.groups;
CREATE POLICY "Leaders can update their groups"
ON public.groups
FOR UPDATE
USING (auth.uid() = created_by);

-- 5. Enable RLS on group_members table
ALTER TABLE IF EXISTS public.group_members ENABLE ROW LEVEL SECURITY;

-- 6. Allow all authenticated users to VIEW group memberships
DROP POLICY IF EXISTS "Public group members are viewable by everyone" ON public.group_members;
CREATE POLICY "Public group members are viewable by everyone"
ON public.group_members
FOR SELECT
USING (true);

-- 7. Allow authenticated users to JOIN groups
DROP POLICY IF EXISTS "Anyone can join groups" ON public.group_members;
CREATE POLICY "Anyone can join groups"
ON public.group_members
FOR INSERT
WITH CHECK (true);

-- 8. Allow group members to update their membership
DROP POLICY IF EXISTS "Members can update their membership" ON public.group_members;
CREATE POLICY "Members can update their membership"
ON public.group_members
FOR UPDATE
USING (auth.uid() = user_id);
