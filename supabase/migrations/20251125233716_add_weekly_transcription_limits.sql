-- 1. Adiciona a coluna para rastrear as transcrições semanais restantes.
ALTER TABLE public.profiles
ADD COLUMN weekly_transcriptions_remaining SMALLINT DEFAULT 2 NOT NULL;

COMMENT ON COLUMN public.profiles.weekly_transcriptions_remaining IS 'Número de transcrições de áudio/vídeo restantes para o usuário na semana.';

-- 2. Cria a função que reseta a contagem de transcrições com base no plano do usuário.
CREATE OR REPLACE FUNCTION public.reset_weekly_transcriptions()
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.profiles
  SET weekly_transcriptions_remaining =
    CASE
      WHEN plan_type = 'pro' THEN 10
      WHEN plan_type = 'classic' THEN 5
      ELSE 2 -- 'free' e qualquer outro caso
    END;
$$;

COMMENT ON FUNCTION public.reset_weekly_transcriptions() IS 'Reseta a contagem de transcrições semanais para todos os usuários com base em seu plano atual.';

-- 3. Cria a função RPC para decrementar a contagem de transcrição de um usuário.
CREATE OR REPLACE FUNCTION public.decrement_transcription_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.profiles
  SET weekly_transcriptions_remaining = weekly_transcriptions_remaining - 1
  WHERE id = p_user_id AND weekly_transcriptions_remaining > 0;
END;
$$;

COMMENT ON FUNCTION public.decrement_transcription_count(uuid) IS 'Decrementa a contagem de transcrições restantes para um usuário específico.';

-- 4. Agenda um novo Cron Job SEMANAL para resetar as contagens.
--    O job rodará toda segunda-feira à meia-noite.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-transcription-reset') THEN
    PERFORM cron.schedule(
      'weekly-transcription-reset',
      '0 0 * * 1', -- À meia-noite de toda segunda-feira
      'SELECT public.reset_weekly_transcriptions()'
    );
  END IF;
END;
$$;
