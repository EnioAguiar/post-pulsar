-- Migration to consolidate multiple permissive RLS policies on newsletter_subscribers.

BEGIN;

-- 1. Consolidate SELECT policies for 'authenticated' role.
-- Problem: Two permissive policies existed, one of which ("viewable by everyone" with USING(true)) exposed all subscriber data.
-- Fix: Drop both and create a single, secure policy that allows users to see only their own subscription.

DROP POLICY IF EXISTS "Public subscriber info is viewable by everyone." ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Users can view their own subscription." ON public.newsletter_subscribers;

-- Re-create the correct policy to be certain it's the only one.
CREATE POLICY "Users can view their own subscription."
ON public.newsletter_subscribers
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));


-- 2. Consolidate INSERT policies.
-- Problem: Two permissive policies existed for the INSERT action for the 'authenticated' role.
-- Fix: Drop both and create a single policy that allows anonymous signups (user_id is NULL)
-- and allows authenticated users to sign up for themselves (user_id matches their auth.uid).

DROP POLICY IF EXISTS "Anyone can sign up for the newsletter." ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Users can insert their own subscription." ON public.newsletter_subscribers;

-- Re-create a single, consolidated policy.
CREATE POLICY "Allow public and user subscriptions"
ON public.newsletter_subscribers
FOR INSERT
TO public -- This applies to 'anon' and 'authenticated' roles
WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));


-- 3. Ensure UPDATE and DELETE policies from previous migrations are correct and optimized.
-- These were likely correct already, but we re-affirm them here for completeness and to use the optimized `(SELECT auth.uid())` pattern.

DROP POLICY IF EXISTS "Users can update their own subscription." ON public.newsletter_subscribers;
CREATE POLICY "Users can update their own subscription."
ON public.newsletter_subscribers FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own subscription." ON public.newsletter_subscribers;
CREATE POLICY "Users can delete their own subscription."
ON public.newsletter_subscribers FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));


COMMIT;
