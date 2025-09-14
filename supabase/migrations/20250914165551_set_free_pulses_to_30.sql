-- 1. Update the default value for new user profiles to 30
ALTER TABLE public.profiles
ALTER COLUMN monthly_pulses_remaining SET DEFAULT 30;

-- 2. Update the monthly reset function to also use 30 for the free plan
CREATE OR REPLACE FUNCTION public.reset_monthly_pulses()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET monthly_pulses_remaining = CASE
    -- Remove single quotes that might exist in the value before comparison
    WHEN replace(plan_type::text, '''', '') = 'free' THEN 30
    WHEN replace(plan_type::text, '''', '') = 'classic' THEN 100
    WHEN replace(plan_type::text, '''', '') = 'pro' THEN 250
    ELSE monthly_pulses_remaining -- Do not change if the plan is unknown
  END;
END;
$$ LANGUAGE plpgsql;
