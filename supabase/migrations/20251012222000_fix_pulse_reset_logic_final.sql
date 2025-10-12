CREATE OR REPLACE FUNCTION public.reset_pulses_monthly()
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.profiles
  SET
    monthly_pulses_remaining = 
      CASE
        WHEN plan_type = 'classic' THEN 210
        WHEN plan_type = 'pro' THEN 500
        ELSE 70 -- Free plan default
      END;
$$;
