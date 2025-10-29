-- Remove o Cron Job antigo usando a função da própria extensão pg_cron.
-- Usar a função em vez de um DELETE direto é mais seguro e lida melhor com permissões.
DO $$
BEGIN
  -- Tenta remover o job. Se não existir, a exceção é capturada e ignorada.
  PERFORM cron.unschedule('monthly-pulse-reset');
EXCEPTION
  WHEN others THEN
    -- Ignora o erro se o job não existir
END;
$$;

-- Agenda o novo Cron Job com o mesmo nome, garantindo que ele chame a função correta.
SELECT cron.schedule(
  'monthly-pulse-reset',
  '0 0 1 * *',
  'SELECT public.reset_pulses_monthly()'
);