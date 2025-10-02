
CREATE OR REPLACE FUNCTION public.reset_monthly_pulses()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET monthly_pulses_remaining = monthly_pulses_remaining + CASE
    -- Remove single quotes that might exist in the value before comparison
    WHEN replace(plan_type::text, '''', '') = 'free' THEN 70
    WHEN replace(plan_type::text, '''', '') = 'classic' THEN 210
    WHEN replace(plan_type::text, '''', '') = 'pro' THEN 500
    ELSE 0 -- Do not add any pulses if the plan is unknown
  END;
END;
$$ LANGUAGE plpgsql;
