-- 1. Optimize RLS policies for 'profiles' table

-- Policy for SELECT
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = id);

-- Policy for UPDATE
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

-- 2. Optimize RLS policies for 'generated_posts' table

-- Policy for SELECT
DROP POLICY IF EXISTS "Users can view their own generated posts" ON public.generated_posts;
CREATE POLICY "Users can view their own generated posts"
ON public.generated_posts
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Policy for INSERT
DROP POLICY IF EXISTS "Users can insert their own generated posts" ON public.generated_posts;
CREATE POLICY "Users can insert their own generated posts"
ON public.generated_posts
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

-- 3. Add index to the foreign key on 'generated_posts'
CREATE INDEX IF NOT EXISTS idx_generated_posts_user_id ON public.generated_posts(user_id);
