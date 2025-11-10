-- Description: Modifies the new user creation function to implement a 7-day free trial.
-- When a new user signs up, they are automatically placed on the 'pro' plan,
-- and their plan expiration is set for 7 days in the future.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, referral_code, plan_type, plan_expires_at)
  VALUES (new.id, left(replace(gen_random_uuid()::text, '-', ''), 8), 'pro', now() + interval '7 days');
  RETURN new;
END;
$$;
