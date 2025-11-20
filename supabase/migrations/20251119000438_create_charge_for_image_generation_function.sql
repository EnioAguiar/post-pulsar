CREATE OR REPLACE FUNCTION public.charge_for_image_generation(p_user_id uuid)
RETURNS integer -- Returns the new remaining pulse count
AS $$
DECLARE
  v_remaining_pulses int;
BEGIN
  -- Select the current pulse count in a locked row to prevent race conditions
  SELECT monthly_pulses_remaining INTO v_remaining_pulses
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Check if the user has enough pulses (image generation costs 1 pulse)
  IF v_remaining_pulses <= 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_PULSES' USING HINT = 'User does not have enough pulses for image generation.';
  END IF;

  -- Decrement the pulse count by 1 for image generation
  UPDATE public.profiles
  SET monthly_pulses_remaining = v_remaining_pulses - 1
  WHERE id = p_user_id;

  -- Return the new pulse count
  RETURN v_remaining_pulses - 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.charge_for_image_generation(uuid)
IS '''Charges one pulse for image generation. Raises an exception if pulses are insufficient. Returns the new pulse count.''';
