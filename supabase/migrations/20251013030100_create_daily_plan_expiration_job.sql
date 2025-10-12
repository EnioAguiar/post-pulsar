-- Cria a nova função que será executada diariamente para expirar planos.
CREATE OR REPLACE FUNCTION public.expire_paid_plans_daily()
RETURNS void
LANGUAGE sql
AS $$
  -- Encontra usuários com planos 'classic' ou 'pro' cuja data de expiração já passou
  -- e rebaixa seu plano para 'free'.
  UPDATE public.profiles
  SET
    plan_type = 'free'
  WHERE
    plan_expires_at IS NOT NULL
    AND plan_expires_at < NOW()
    AND (plan_type = 'classic' OR plan_type = 'pro');
$$;

-- Agenda um novo Cron Job DIÁRIO para executar a função de expiração.
-- O 'daily-plan-expiration' rodará todo dia à meia-noite.
SELECT cron.schedule(
  'daily-plan-expiration',
  '0 0 * * *',
  'SELECT public.expire_paid_plans_daily()'
);
