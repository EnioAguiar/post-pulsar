-- Remove o Cron Job antigo usando a função da própria extensão pg_cron.
-- Usar a função em vez de um DELETE direto é mais seguro e lida melhor com permissões.
SELECT cron.unschedule('monthly-pulse-reset');

-- Agenda o novo Cron Job com o mesmo nome, garantindo que ele chame a função correta.
SELECT cron.schedule(
  'monthly-pulse-reset',
  '0 0 1 * *',
  'SELECT public.reset_pulses_monthly()'
);