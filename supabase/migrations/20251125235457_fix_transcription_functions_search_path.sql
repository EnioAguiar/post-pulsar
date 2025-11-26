-- Fixes the search_path for the public.reset_weekly_transcriptions function.
-- This is called by a cron job and needs a stable, secure execution context.
CREATE OR REPLACE FUNCTION public.reset_weekly_transcriptions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  UPDATE public.profiles
  SET weekly_transcriptions_remaining =
    CASE
      WHEN plan_type = 'pro' THEN 10
      WHEN plan_type = 'classic' THEN 5
      ELSE 2 -- 'free' and any other case
    END;
$$;

COMMENT ON FUNCTION public.reset_weekly_transcriptions() IS 'Resets the weekly transcription count for all users based on their current plan. (Fixed search_path)';

-- Fixes the search_path for the public.decrement_transcription_count function.
-- This is called by a service_role and needs a stable, secure execution context.
CREATE OR REPLACE FUNCTION public.decrement_transcription_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.profiles
  SET weekly_transcriptions_remaining = weekly_transcriptions_remaining - 1
  WHERE id = p_user_id AND weekly_transcriptions_remaining > 0;
END;
$$;

COMMENT ON FUNCTION public.decrement_transcription_count(uuid) IS 'Decrements the remaining transcription count for a specific user. (Fixed search_path)';
