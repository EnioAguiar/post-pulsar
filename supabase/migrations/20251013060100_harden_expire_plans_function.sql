-- Corrige o alerta do linter para a função de expiração diária.
-- Adiciona 'SET search_path = public' para garantir que a função sempre opere no schema correto,
-- eliminando riscos de segurança e comportamento inesperado.
CREATE OR REPLACE FUNCTION public.expire_paid_plans_daily()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET
    plan_type = 'free',
    monthly_pulses_remaining = 70
  WHERE
    plan_expires_at IS NOT NULL
    AND plan_expires_at < NOW()
    AND (plan_type = 'classic' OR plan_type = 'pro');
$$;
