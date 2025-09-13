-- This migration optimizes Row Level Security (RLS) policies for performance
-- by wrapping auth.uid() calls in a scalar subquery (SELECT auth.uid()).
-- This ensures the function is evaluated once per query, not once per row.

-- 1. Optimize policies for public.user_prompts table
ALTER POLICY "Users can view their own prompts" ON public.user_prompts USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can insert their own prompts" ON public.user_prompts WITH CHECK ((SELECT auth.uid()) = user_id);
-- The original update policy was missing a WITH CHECK clause, which is added here for correctness.
ALTER POLICY "Users can update their own prompts" ON public.user_prompts USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can delete their own prompts" ON public.user_prompts USING ((SELECT auth.uid()) = user_id);

-- 2. Optimize policies for public.generated_posts table
-- The SELECT and INSERT policies were already optimized in a previous migration.
-- This only fixes the DELETE policy.
ALTER POLICY "Users can delete their own posts" ON public.generated_posts USING ((SELECT auth.uid()) = user_id);