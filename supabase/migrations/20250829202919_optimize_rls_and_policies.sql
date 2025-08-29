-- 1. Optimize RLS policies for social_connections table

-- SELECT policy
DROP POLICY IF EXISTS "Users can view their own connections" ON public.social_connections;
CREATE POLICY "Users can view their own connections" ON public.social_connections
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- INSERT policy
DROP POLICY IF EXISTS "Users can insert their own connections" ON public.social_connections;
CREATE POLICY "Users can insert their own connections" ON public.social_connections
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

-- UPDATE policy
DROP POLICY IF EXISTS "Users can update their own connections" ON public.social_connections;
CREATE POLICY "Users can update their own connections" ON public.social_connections
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- DELETE policy
DROP POLICY IF EXISTS "Users can delete their own connections" ON public.social_connections;
CREATE POLICY "Users can delete their own connections" ON public.social_connections
FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);


-- 2. Drop unused index from generated_posts table
DROP INDEX IF EXISTS public.idx_generated_posts_user_id;
