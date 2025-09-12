CREATE OR REPLACE FUNCTION public.reset_monthly_pulses()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET monthly_pulses_remaining = CASE
    -- Remove aspas simples que possam existir no valor antes de comparar
    WHEN replace(plan_type::text, '''', '') = 'free' THEN 20
    WHEN replace(plan_type::text, '''', '') = 'classic' THEN 100
    WHEN replace(plan_type::text, '''', '') = 'pro' THEN 250
    ELSE monthly_pulses_remaining -- Não altera se o plano for desconhecido
  END;
END;
$$ LANGUAGE plpgsql;
