-- Altera a função `reset_pulses_monthly` para sua responsabilidade final e simples.
-- A única tarefa desta função, chamada pelo Cron Job MENSAL, é dar a 'mesada' de 70 pulsos para todos os usuários do plano 'free'.
CREATE OR REPLACE FUNCTION public.reset_pulses_monthly()
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.profiles
  SET
    monthly_pulses_remaining = 70
  WHERE
    plan_type = 'free';
$$;
