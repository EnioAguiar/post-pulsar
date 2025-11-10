-- Description: Updates the new user creation function to grant 500 pulses for the trial period.
-- This corrects the previous implementation which did not set the pulse amount.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, referral_code, plan_type, plan_expires_at, monthly_pulses_remaining)
  VALUES (new.id, left(replace(gen_random_uuid()::text, '-', ''), 8), 'pro', now() + interval '7 days', 500);
  RETURN new;
END;
$$;
