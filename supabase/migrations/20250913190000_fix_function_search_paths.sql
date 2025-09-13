-- 1. Fix search_path for check_prompt_limit
-- This function is a trigger to enforce a limit on the number of custom prompts a user can create.
-- Setting a fixed search_path and using SECURITY DEFINER makes it secure and ensures it bypasses any potential RLS on the prompts table for the count.
CREATE OR REPLACE FUNCTION public.check_prompt_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $FUNCTION$
BEGIN
  IF (SELECT count(*) FROM public.user_prompts WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'User has reached the prompt limit of 5.';
  END IF;
  RETURN NEW;
END;
$FUNCTION$;

-- 2. Fix search_path for charge_pulse_and_save_post
-- This function handles the core logic of charging a user and saving their generated post.
-- It already uses SECURITY DEFINER. Adding a fixed search_path prevents any potential for search path hijacking.
CREATE OR REPLACE FUNCTION public.charge_pulse_and_save_post(
  p_user_id uuid,
  p_source_url text,
  p_language text,
  p_content jsonb
)
RETURNS bigint -- Returns the ID of the new post
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  post_count int;
  post_limit int := 20; -- Defines the post limit
  new_post_id bigint;
BEGIN
  -- Count existing user posts
  SELECT count(*)
  INTO post_count
  FROM public.generated_posts
  WHERE user_id = p_user_id;

  -- Check if the limit has been reached
  IF post_count >= post_limit THEN
    RAISE EXCEPTION 'HISTORY_LIMIT_REACHED: Post history limit of % has been reached. Please delete old posts to save new ones.', post_limit;
  END IF;

  -- Decrement the user's pulse count
  UPDATE public.profiles
  SET monthly_pulses_remaining = monthly_pulses_remaining - 1
  WHERE id = p_user_id;

  -- Insert the new post and get its ID
  INSERT INTO public.generated_posts (user_id, source_url, language, content)
  VALUES (p_user_id, p_source_url, p_language, p_content)
  RETURNING id INTO new_post_id;

  -- Return the new post's ID
  RETURN new_post_id;
END;
$$;

-- 3. Fix search_path for reset_monthly_pulses
-- This function is run by a cron job to reset user pulses monthly.
-- Setting SECURITY DEFINER and a fixed search_path ensures it runs with correct permissions and in a secure context.
CREATE OR REPLACE FUNCTION public.reset_monthly_pulses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET monthly_pulses_remaining = CASE
    -- Remove single quotes that may exist in the value before comparison
    WHEN replace(plan_type::text, '''', '') = 'free' THEN 20
    WHEN replace(plan_type::text, '''', '') = 'classic' THEN 100
    WHEN replace(plan_type::text, '''', '') = 'pro' THEN 250
    ELSE monthly_pulses_remaining -- Do not change if the plan is unknown
  END;
END;
$$;
