CREATE OR REPLACE FUNCTION public.charge_pulse_and_save_post(
  p_user_id uuid,
  p_source_url text,
  p_language text,
  p_content text
)
RETURNS bigint -- Returns the ID of the new post
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.charge_pulse_and_save_post(uuid, text, text, text)
IS '''Atomically charges one pulse from the user and saves the generated post, returning the new post ID.''';
