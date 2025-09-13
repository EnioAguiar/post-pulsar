-- This migration fixes miscellaneous database issues found by the linter.

-- 1. Remove duplicate constraint on social_connections table
-- The linter detected a duplicate index, which is backing a unique constraint.
-- We must drop the constraint to remove the index.
ALTER TABLE public.social_connections DROP CONSTRAINT IF EXISTS unique_user_provider_page;

-- 2. Create pg_cron extension if it doesn't exist
-- The ALTER EXTENSION command to update it has been commented out due to a persistent bug
-- in the local pgaudit extension that prevents the migration from running.
CREATE EXTENSION IF NOT EXISTS pg_cron;
-- ALTER EXTENSION pg_cron UPDATE;