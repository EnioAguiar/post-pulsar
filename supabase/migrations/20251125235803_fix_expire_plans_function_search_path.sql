-- Harden the public.expire_paid_plans_daily function by setting a fixed search_path.
-- This function is called by a cron job and needs a stable, secure execution context.
CREATE OR REPLACE FUNCTION public.expire_paid_plans_daily()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  -- Finds users with 'classic' or 'pro' plans whose expiration date has passed,
  -- downgrades their plan to 'free', and resets their pulses to the free plan default.
  UPDATE public.profiles
  SET
    plan_type = 'free',
    plan_expires_at = NULL,
    monthly_pulses_remaining = 70
  WHERE
    plan_expires_at IS NOT NULL
    AND plan_expires_at < NOW()
    AND (plan_type = 'classic' OR plan_type = 'pro');
$$;

COMMENT ON FUNCTION public.expire_paid_plans_daily() IS 'Downgrades expired paid plans to the free tier and resets their pulses. (Fixed search_path)';
