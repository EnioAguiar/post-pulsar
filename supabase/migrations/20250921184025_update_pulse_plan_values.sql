-- 1. Update the default value for new user profiles to 70
ALTER TABLE public.profiles
ALTER COLUMN monthly_pulses_remaining SET DEFAULT 70;

-- 2. Update the monthly reset function to use the new pulse values
CREATE OR REPLACE FUNCTION public.reset_monthly_pulses()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET monthly_pulses_remaining = CASE
    -- Remove single quotes that might exist in the value before comparison
    WHEN replace(plan_type::text, '''', '') = 'free' THEN 70
    WHEN replace(plan_type::text, '''', '') = 'classic' THEN 210
    WHEN replace(plan_type::text, '''', '') = 'pro' THEN 500
    ELSE monthly_pulses_remaining -- Do not change if the plan is unknown
  END;
END;
$$ LANGUAGE plpgsql;

-- 3. Immediately apply the new pulse counts to existing users
-- This ensures that current users benefit from the new, more generous plans right away.
UPDATE public.profiles
SET monthly_pulses_remaining = CASE
    WHEN replace(plan_type::text, '''', '') = 'free' THEN 70
    WHEN replace(plan_type::text, '''', '') = 'classic' THEN 210
    WHEN replace(plan_type::text, '''', '') = 'pro' THEN 500
    ELSE monthly_pulses_remaining
END;
