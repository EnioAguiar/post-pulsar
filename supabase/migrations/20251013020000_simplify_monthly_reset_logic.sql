-- Recria a função `reset_pulses_monthly` com a lógica final e simplificada.
-- A função não faz mais o 'downgrade' de planos. Em vez disso, ela simplesmente
-- define o saldo de pulsos para 70 para qualquer usuário que não tenha um plano pago ativo.
CREATE OR REPLACE FUNCTION public.reset_pulses_monthly()
RETURNS void
LANGUAGE sql
AS $$
  -- Encontra todos os usuários que nunca tiveram um plano (plan_expires_at IS NULL)
  -- ou cujo plano já expirou (plan_expires_at < NOW()) e define seus pulsos para 70.
  UPDATE public.profiles
  SET
    monthly_pulses_remaining = 70
  WHERE
    plan_expires_at IS NULL OR plan_expires_at < NOW();
$$;
