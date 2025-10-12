CREATE OR REPLACE FUNCTION public.add_pulses_to_user(user_id_input uuid, pulses_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET monthly_pulses_remaining = COALESCE(monthly_pulses_remaining, 0) + pulses_to_add
  WHERE id = user_id_input;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_pulses_to_user(uuid, integer) TO service_role;
