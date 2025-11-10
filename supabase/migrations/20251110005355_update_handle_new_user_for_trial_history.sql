-- Description: Updates the new user creation function to check trial_history before granting a trial.
-- If the user's email already exists in trial_history, they start on the 'free' plan.
-- Otherwise, they get a 7-day 'pro' plan trial and their email is recorded.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_country TEXT;
  has_had_trial BOOLEAN;
BEGIN
  -- Extract country from metadata, default to NULL if not present
  user_country := new.raw_user_meta_data ->> 'country';

  -- Check if the email already exists in the trial_history table
  SELECT EXISTS(SELECT 1 FROM public.trial_history WHERE email = new.email) INTO has_had_trial;

  IF has_had_trial THEN
    -- User has had a trial before, start them on the free plan
    INSERT INTO public.profiles (id, referral_code, plan_type, monthly_pulses_remaining)
    VALUES (new.id, left(replace(gen_random_uuid()::text, '-', ''), 8), 'free', 70);
  ELSE
    -- This is a new user, grant the trial and record it
    INSERT INTO public.trial_history (email, country)
    VALUES (new.email, user_country);

    INSERT INTO public.profiles (id, referral_code, plan_type, plan_expires_at, monthly_pulses_remaining)
    VALUES (new.id, left(replace(gen_random_uuid()::text, '-', ''), 8), 'pro', now() + interval '7 days', 500);
  END IF;

  RETURN new;
END;
$$;
