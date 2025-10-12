-- Recria a função `reset_pulses_monthly` com uma lógica mais inteligente.
-- Esta função agora é responsável por duas tarefas: expirar planos e resetar pulsos de usuários gratuitos.
CREATE OR REPLACE FUNCTION public.reset_pulses_monthly()
RETURNS void
LANGUAGE sql
AS $$
  -- Passo 1: Reverte para o plano 'free' os usuários cujo plano pago expirou.
  -- Ele busca por usuários com plano 'classic' ou 'pro' cuja data de expiração já passou.
  UPDATE public.profiles
  SET
    plan_type = 'free'
  WHERE
    plan_expires_at IS NOT NULL
    AND plan_expires_at < NOW()
    AND (plan_type = 'classic' OR plan_type = 'pro');

  -- Passo 2: Define o saldo de pulsos para 70 para TODOS os usuários que estão no plano 'free'.
  -- Isso inclui tanto os usuários que sempre foram gratuitos quanto aqueles que acabaram de ter o plano expirado no Passo 1.
  UPDATE public.profiles
  SET
    monthly_pulses_remaining = 70
  WHERE
    plan_type = 'free';
$$;
