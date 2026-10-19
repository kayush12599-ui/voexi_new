-- 1. Purani insert policy hatao
DROP POLICY IF EXISTS "groups_insert_policy" ON groups;

-- 2. Nayi optimized policy
CREATE POLICY "groups_insert_policy" ON groups FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Select policy cleanup
DROP POLICY IF EXISTS "groups_select_policy" ON groups;
CREATE POLICY "groups_select_policy" ON groups FOR SELECT
USING (
    type != 'private' OR
    created_by = auth.uid() OR
    id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);
