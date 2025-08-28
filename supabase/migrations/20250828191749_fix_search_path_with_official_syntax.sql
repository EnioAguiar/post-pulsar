-- Applying official Supabase fix for search_path security warnings

-- 1. Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$;

-- 2. Fix reset_monthly_pulses function
CREATE OR REPLACE FUNCTION public.reset_monthly_pulses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.profiles
  SET monthly_pulses_remaining = CASE
    WHEN plan_type = 'free' THEN 5
    WHEN plan_type = 'basic' THEN 50
    WHEN plan_type = 'pro' THEN -1 -- Represents unlimited
    ELSE monthly_pulses_remaining -- Do not change if plan is unknown
  END;
END;
$$;

-- 3. Fix charge_pulse_and_save_post function
CREATE OR REPLACE FUNCTION public.charge_pulse_and_save_post(
  p_user_id uuid,
  p_source_url text,
  p_language text,
  p_content text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_post_id bigint;
BEGIN
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

-- 4. Fix charge_for_publication function
CREATE OR REPLACE FUNCTION public.charge_for_publication(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_remaining_pulses int;
BEGIN
  -- Select the current pulse count in a locked row to prevent race conditions
  SELECT monthly_pulses_remaining INTO v_remaining_pulses
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Check if the user has enough pulses
  IF v_remaining_pulses <= 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_PULSES' USING HINT = 'User does not have enough pulses for this action.';
  END IF;

  -- Decrement the pulse count
  UPDATE public.profiles
  SET monthly_pulses_remaining = v_remaining_pulses - 1
  WHERE id = p_user_id;

  -- Return the new pulse count
  RETURN v_remaining_pulses - 1;
END;
$$;
