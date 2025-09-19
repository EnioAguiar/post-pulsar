-- Drop the old function signature to avoid conflicts
DROP FUNCTION IF EXISTS public.save_post_to_history(uuid, text, text, jsonb, text[]);

-- Recreate the function to use media_map
CREATE OR REPLACE FUNCTION public.save_post_to_history(
  p_user_id uuid,
  p_source_url text,
  p_language text,
  p_content jsonb,
  p_media_map jsonb -- Changed from p_media_urls text[]
)
RETURNS bigint -- Returns the ID of the new or existing post
AS $$
DECLARE
  post_count int;
  post_limit int := 20;
  existing_post_id bigint;
BEGIN
  -- Try to find a post based on source_url and content, as it's the most stable identifier.
  -- We will UPDATE this post's media_map instead of creating a new one.
  SELECT id INTO existing_post_id
  FROM public.generated_posts
  WHERE user_id = p_user_id AND source_url = p_source_url AND content = p_content
  LIMIT 1;

  IF FOUND THEN
    -- Post exists, update its media map by merging the new map.
    -- The || operator for JSONB merges objects, overwriting keys in the first operand.
    UPDATE public.generated_posts
    SET media_map = media_map || p_media_map
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

    -- Insert the new post
    INSERT INTO public.generated_posts (user_id, source_url, language, content, media_map)
    VALUES (p_user_id, p_source_url, p_language, p_content, p_media_map)
    RETURNING id INTO existing_post_id;

    RETURN existing_post_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.save_post_to_history(uuid, text, text, jsonb, jsonb)
IS 'Saves (or updates) a generated post to the history, using a JSONB media_map to associate media with networks.';
