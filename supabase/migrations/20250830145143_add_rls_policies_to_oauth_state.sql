-- Policies for oauth_state table

-- 1. Allow authenticated users to insert their own state
CREATE POLICY "Allow authenticated users to insert their own state" 
ON public.oauth_state
FOR INSERT TO authenticated
WITH CHECK ((auth.uid()) = user_id);

-- 2. Allow authenticated users to read their own state
CREATE POLICY "Allow authenticated users to read their own state"
ON public.oauth_state
FOR SELECT TO authenticated
USING ((auth.uid()) = user_id);

-- 3. Allow authenticated users to delete their own state
CREATE POLICY "Allow authenticated users to delete their own state"
ON public.oauth_state
FOR DELETE TO authenticated
USING ((auth.uid()) = user_id);
