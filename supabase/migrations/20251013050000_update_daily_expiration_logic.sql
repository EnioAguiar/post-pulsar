-- Recria a função de expiração diária com a lógica completa de downgrade.
-- Agora, além de mudar o tipo do plano para 'free', ela também reseta o saldo de pulsos para 70.
-- A cláusula SECURITY DEFINER garante que a função tenha permissão para executar, mesmo quando chamada pelo pg_cron.
CREATE OR REPLACE FUNCTION public.expire_paid_plans_daily()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
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
