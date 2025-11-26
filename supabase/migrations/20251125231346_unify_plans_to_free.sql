-- 1. Unifica todos os usuários existentes para o plano 'free' e remove datas de expiração.
UPDATE public.profiles
SET 
  plan_type = 'free',
  plan_expires_at = NULL;

-- 2. Recria a função handle_new_user para um modelo simplificado, sem trial.
--    Todos os novos usuários agora entram diretamente no plano 'free' com 70 pulsos.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, referral_code, plan_type, monthly_pulses_remaining)
  VALUES (new.id, left(replace(gen_random_uuid()::text, '-', ''), 8), 'free', 70);
  
  RETURN new;
END;
$$;

-- 3. Remove o cron job que tratava da expiração de planos.
SELECT cron.unschedule('daily-plan-expiration');

-- 4. Remove a função de expiração de planos que não é mais necessária.
DROP FUNCTION IF EXISTS public.expire_paid_plans_daily();

-- 5. Remove a tabela de histórico de trials que não é mais necessária.
DROP TABLE IF EXISTS public.trial_history;
