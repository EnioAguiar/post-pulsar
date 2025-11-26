-- Corrige a função que expira planos pagos para também resetar os pulsos do usuário.
CREATE OR REPLACE FUNCTION public.expire_paid_plans_daily()
RETURNS void
LANGUAGE sql
AS $$
  -- Encontra usuários com planos 'classic' ou 'pro' cuja data de expiração já passou,
  -- rebaixa seu plano para 'free' e reseta seus pulsos para o padrão do plano gratuito.
  UPDATE public.profiles
  SET
    plan_type = 'free',
    plan_expires_at = NULL,
    monthly_pulses_remaining = 70 -- CORREÇÃO: Reseta os pulsos para 70.
  WHERE
    plan_expires_at IS NOT NULL
    AND plan_expires_at < NOW()
    AND (plan_type = 'classic' OR plan_type = 'pro');
$$;