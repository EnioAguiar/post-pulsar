-- Passo 1: Garante que qualquer versão antiga da função seja completamente removida.
DROP FUNCTION IF EXISTS public.reset_pulses_monthly();

-- Passo 2: Recria a função do zero com a lógica correta e inteligente.
CREATE OR REPLACE FUNCTION public.reset_pulses_monthly()
RETURNS void
LANGUAGE sql
AS $$
  -- Primeiro, reverte para o plano 'free' os usuários cujo plano pago expirou.
  UPDATE public.profiles
  SET
    plan_type = 'free'
  WHERE
    plan_expires_at IS NOT NULL
    AND plan_expires_at < NOW()
    AND (plan_type = 'classic' OR plan_type = 'pro');

  -- Depois, define o saldo de pulsos para 70 para TODOS os usuários que estão no plano 'free'.
  UPDATE public.profiles
  SET
    monthly_pulses_remaining = 70
  WHERE
    plan_type = 'free';
$$;
