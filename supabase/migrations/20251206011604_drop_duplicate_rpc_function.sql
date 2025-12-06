-- This migration resolves a function overloading conflict by explicitly dropping the
-- old version of the function that incorrectly used a UUID parameter.

DROP FUNCTION IF EXISTS public.append_provider_post_id(uuid, text, text);
