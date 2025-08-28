-- Create the function to reset monthly pulses
CREATE OR REPLACE FUNCTION public.reset_monthly_pulses()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET monthly_pulses_remaining = CASE
    WHEN plan_type = '''free''' THEN 5
    WHEN plan_type = '''basic''' THEN 50
    WHEN plan_type = '''pro''' THEN -1 -- Represents unlimited
    ELSE monthly_pulses_remaining -- Do not change if plan is unknown
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a comment for clarity
COMMENT ON FUNCTION public.reset_monthly_pulses() IS '''Resets the pulse counters for all users based on their subscription plan. Intended to be run monthly by a cron job.''';
