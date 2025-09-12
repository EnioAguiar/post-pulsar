CREATE OR REPLACE FUNCTION public.charge_pulse_and_save_post(
  p_user_id uuid,
  p_source_url text,
  p_language text,
  p_content jsonb
)
RETURNS bigint -- Returns the ID of the new post
AS $$
DECLARE
  post_count int;
  post_limit int := 20; -- Define o limite de posts
  new_post_id bigint;
BEGIN
  -- Conta os posts existentes do usuário
  SELECT count(*)
  INTO post_count
  FROM public.generated_posts
  WHERE user_id = p_user_id;

  -- Verifica se o limite foi atingido
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.charge_pulse_and_save_post(uuid, text, text, jsonb)
IS 'Atomically charges one pulse, checks post history limit, and saves the generated post (as JSON), returning the new post ID.';
