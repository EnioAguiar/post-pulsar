-- Optimize RLS policies for oauth_state table by using a sub-select for auth.uid()

-- 1. Optimize INSERT policy
DROP POLICY IF EXISTS "Allow authenticated users to insert their own state" ON public.oauth_state;
CREATE POLICY "Allow authenticated users to insert their own state"
ON public.oauth_state
FOR INSERT TO authenticated
WITH CHECK (((SELECT auth.uid())) = user_id);

-- 2. Optimize SELECT policy
DROP POLICY IF EXISTS "Allow authenticated users to read their own state" ON public.oauth_state;
CREATE POLICY "Allow authenticated users to read their own state"
ON public.oauth_state
FOR SELECT TO authenticated
USING (((SELECT auth.uid())) = user_id);

-- 3. Optimize DELETE policy
DROP POLICY IF EXISTS "Allow authenticated users to delete their own state" ON public.oauth_state;
CREATE POLICY "Allow authenticated users to delete their own state"
ON public.oauth_state
FOR DELETE TO authenticated
USING (((SELECT auth.uid())) = user_id);