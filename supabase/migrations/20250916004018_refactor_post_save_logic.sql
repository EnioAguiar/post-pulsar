-- Step 1: Drop the old function that combines charging and saving.
DROP FUNCTION IF EXISTS public.charge_pulse_and_save_post(uuid, text, text, jsonb);

-- Step 2: Create a new function that ONLY charges a pulse for content generation.
CREATE OR REPLACE FUNCTION public.charge_pulse_for_generation(
  p_user_id uuid,
  p_pulse_cost int DEFAULT 1
)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET monthly_pulses_remaining = monthly_pulses_remaining - p_pulse_cost
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.charge_pulse_for_generation(uuid, int)
IS 'Charges a specified number of pulses from the user for an action, like content generation.';

-- Step 3: Create the function to save a post to history, to be called upon publication.
CREATE OR REPLACE FUNCTION public.save_post_to_history(
  p_user_id uuid,
  p_source_url text,
  p_language text,
  p_content jsonb,
  p_media_urls text[]
)
RETURNS bigint -- Returns the ID of the new or existing post
AS $$
DECLARE
  post_count int;
  post_limit int := 20;
  new_post_id bigint;
BEGIN
  -- Check if a post with the exact same content already exists to prevent duplicates
  SELECT id INTO new_post_id
  FROM public.generated_posts
  WHERE user_id = p_user_id AND source_url = p_source_url AND content = p_content
  LIMIT 1;

  -- If it already exists, just return its ID
  IF FOUND THEN
    RETURN new_post_id;
  END IF;

  -- If it does not exist, check the history limit
  SELECT count(*)
  INTO post_count
  FROM public.generated_posts
  WHERE user_id = p_user_id;

  -- If limit is reached, delete the oldest post
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

  -- Insert the new post and get its ID
  INSERT INTO public.generated_posts (user_id, source_url, language, content, media_urls)
  VALUES (p_user_id, p_source_url, p_language, p_content, p_media_urls)
  RETURNING id INTO new_post_id;

  RETURN new_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.save_post_to_history(uuid, text, text, jsonb, text[])
IS 'Saves a generated post to the history upon successful publication, managing the history limit.';
