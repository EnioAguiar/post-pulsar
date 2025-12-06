-- This migration forces a recreation of the save_post_to_history function
-- to resolve persistent schema cache issues in PostgREST (PGRST202 error).

-- Drop the function with its latest known signature
DROP FUNCTION IF EXISTS public.save_post_to_history(uuid, text, text, jsonb, jsonb, text);

-- Recreate the function with the correct and most up-to-date definition
CREATE OR REPLACE FUNCTION public.save_post_to_history(
  p_user_id uuid,
  p_source_url text,
  p_language text,
  p_content jsonb,
  p_media_map jsonb,
  p_generated_image_url text
)
RETURNS bigint
AS $$
DECLARE
  post_count int;
  post_limit int := 20;
  existing_post_id bigint;
BEGIN
  -- Try to find a post based on source_url and content
  SELECT id INTO existing_post_id
  FROM public.generated_posts
  WHERE user_id = p_user_id AND source_url = p_source_url AND content = p_content
  LIMIT 1;

  IF FOUND THEN
    -- Post exists, update its media map and generated image url
    UPDATE public.generated_posts
    SET 
      media_map = media_map || p_media_map,
      generated_image_url = COALESCE(p_generated_image_url, generated_image_url)
    WHERE id = existing_post_id;
    RETURN existing_post_id;
  ELSE
    -- Post does not exist, create a new one.
    -- First, check history limit.
    SELECT count(*)
    INTO post_count
    FROM public.generated_posts
    WHERE user_id = p_user_id;

    IF post_count >= post_limit THEN
      DELETE FROM public.generated_posts
      WHERE id = (
        SELECT id
        FROM public.generated_posts
        WHERE user_id = p_user_id
        ORDER BY created_at ASC
        LIMIT 1
      );
    END IF;

    -- Insert the new post with the generated image url
    INSERT INTO public.generated_posts (user_id, source_url, language, content, media_map, generated_image_url)
    VALUES (p_user_id, p_source_url, p_language, p_content, p_media_map, p_generated_image_url)
    RETURNING id INTO existing_post_id;

    RETURN existing_post_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.save_post_to_history(uuid, text, text, jsonb, jsonb, text)
IS 'Saves (or updates) a generated post to the history, including a JSONB media_map and the URL of the generated quote image.';
