-- Migration to optimize RLS policies and consolidate duplicates for performance.

BEGIN;

-- I. Optimize policies for public.newsletter_subscribers
-- Problem: Direct calls to auth.uid() are evaluated per-row, causing performance issues.
-- Fix: Wrap auth.uid() in a scalar subquery (SELECT auth.uid()) to ensure it's evaluated once per statement.

-- 1.1. Drop existing policies to ensure a clean state
DROP POLICY IF EXISTS "Users can view their own subscription." ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Users can insert their own subscription." ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Users can update their own subscription." ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Users can delete their own subscription." ON public.newsletter_subscribers;

-- 1.2. Recreate optimized policies
-- Assuming 'user_id' is the column linking to auth.users.id
CREATE POLICY "Users can view their own subscription."
ON public.newsletter_subscribers
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own subscription."
ON public.newsletter_subscribers
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own subscription."
ON public.newsletter_subscribers
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own subscription."
ON public.newsletter_subscribers
FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- 1.3. Add index for performance
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_user_id ON public.newsletter_subscribers(user_id);


-- II. Optimize and consolidate policies for public.email_queue
-- Problem 1: Direct calls to auth.role() are evaluated per-row.
-- Problem 2: Multiple permissive policies existed for INSERT, causing overhead.
-- Fix 1: Wrap auth.role() in a scalar subquery.
-- Fix 2: Drop the overlapping/redundant policies and create a single, correctly scoped policy per action.
-- The 'service_role' policy is redundant as service_role bypasses RLS by default.
-- Note: The email_queue table does not have a user_id or created_by column, so policies are based on roles, not row ownership.

-- 2.1. Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to insert their own tasks" ON public.email_queue;
DROP POLICY IF EXISTS "Allow service_role to manage email_queue" ON public.email_queue;
-- Also drop other potential policies to ensure a clean slate
DROP POLICY IF EXISTS "Users can manage their own email queue" ON public.email_queue;
DROP POLICY IF EXISTS "Users can view their own email queue" ON public.email_queue;
DROP POLICY IF EXISTS "Users can update their own email queue" ON public.email_queue;
DROP POLICY IF EXISTS "Users can delete their own email queue" ON public.email_queue;
DROP POLICY IF EXISTS "Users can insert their own email queue tasks" ON public.email_queue;
DROP POLICY IF EXISTS "Users can update their own email queue tasks" ON public.email_queue;
DROP POLICY IF EXISTS "Users can delete their own email queue tasks" ON public.email_queue;


-- 2.2. Recreate optimized and consolidated policies
-- For INSERT: Allow authenticated users to add to the queue.
CREATE POLICY "Allow authenticated users to insert into email queue"
ON public.email_queue
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- For SELECT, UPDATE, DELETE: No specific policies for 'authenticated' users,
-- as there's no row ownership and it's a system queue.
-- The 'service_role' bypasses RLS and can manage the queue.

-- 2.3. No index needed for 'created_by' as it does not exist.

-- III. Enable RLS on tables if not already enabled (as a safeguard)
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

COMMIT;
