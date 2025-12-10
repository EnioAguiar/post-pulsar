-- Mitigate "role mutable search_path" security vulnerability

-- 1. Fix for append_provider_post_id
-- The function signature (parameters) needs to be specified for ALTER FUNCTION
ALTER FUNCTION public.append_provider_post_id(post_id_in bigint, provider_in text, provider_post_id_in text)
SET search_path = public, extensions;

-- 2. Fix for append_publication_target
-- The function signature (parameters) needs to be specified for ALTER FUNCTION
ALTER FUNCTION public.append_publication_target(post_id_in bigint, provider_in text, target_id_in text)
SET search_path = public, extensions;

-- 3. Fix for save_post_to_history (6-parameter version)
-- The function signature (parameters) needs to be specified for ALTER FUNCTION
ALTER FUNCTION public.save_post_to_history(uuid, text, text, jsonb, jsonb, text)
SET search_path = public, extensions;

-- 4. Fix for save_post_to_history (5-parameter version - the overload)
-- The function signature (parameters) needs to be specified for ALTER FUNCTION
ALTER FUNCTION public.save_post_to_history(uuid, text, text, jsonb, jsonb)
SET search_path = public, extensions;
