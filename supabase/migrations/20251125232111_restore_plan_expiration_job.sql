-- Restaura a função que é executada diariamente para expirar planos pagos.
CREATE OR REPLACE FUNCTION public.expire_paid_plans_daily()
RETURNS void
LANGUAGE sql
AS $$
  -- Encontra usuários com planos 'classic' ou 'pro' cuja data de expiração já passou
  -- e rebaixa seu plano para 'free'.
  UPDATE public.profiles
  SET
    plan_type = 'free',
    plan_expires_at = NULL -- Limpa a data de expiração após o downgrade
  WHERE
    plan_expires_at IS NOT NULL
    AND plan_expires_at < NOW()
    AND (plan_type = 'classic' OR plan_type = 'pro');
$$;

-- Re-agenda o Cron Job DIÁRIO para executar a função de expiração,
-- apenas se ele não existir, para garantir a idempotência da migração.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-plan-expiration') THEN
    PERFORM cron.schedule(
      'daily-plan-expiration',
      '0 0 * * *',
      'SELECT public.expire_paid_plans_daily()'
    );
  END IF;
END;
$$;