-- Corrige o alerta do linter para a função de reset mensal.
-- Adiciona 'SET search_path = public' para garantir que a função sempre opere no schema correto,
-- eliminando riscos de segurança e comportamento inesperado.
CREATE OR REPLACE FUNCTION public.reset_pulses_monthly()
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE public.profiles
  SET
    monthly_pulses_remaining = 70
  WHERE
    plan_type = 'free';
$$;
