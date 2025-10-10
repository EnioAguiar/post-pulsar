-- Corrigido por: https://github.com/orgs/supabase/discussions/23901

-- 1. Corrige a função handle_new_user para ter um search_path fixo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, referral_code)
  VALUES (new.id, left(replace(gen_random_uuid()::text, '-', ''), 8));
  RETURN new;
END;
$$;

-- 2. Remove as políticas de SELECT ineficientes e duplicadas da tabela referrals
DROP POLICY IF EXISTS "Usuários podem ver suas próprias indicações (como quem indicou)" ON public.referrals;
DROP POLICY IF EXISTS "Usuários podem ver se foram indicados por alguém" ON public.referrals;

-- 3. Cria uma política de SELECT única, consolidada e performática
CREATE POLICY "Usuários podem ver suas indicações relevantes"
ON public.referrals
FOR SELECT
TO authenticated
USING (
  (referrer_id = (SELECT auth.uid())) OR (referred_id = (SELECT auth.uid()))
);

-- 4. Garante que as políticas de INSERT/UPDATE/DELETE estão corretas e idempotentes
DROP POLICY IF EXISTS "Nenhuma inserção direta" ON public.referrals;
DROP POLICY IF EXISTS "Nenhuma atualização direta" ON public.referrals;
DROP POLICY IF EXISTS "Nenhuma deleção direta" ON public.referrals;

CREATE POLICY "Nenhuma inserção direta" ON public.referrals FOR INSERT WITH CHECK (false);
CREATE POLICY "Nenhuma atualização direta" ON public.referrals FOR UPDATE USING (false);
CREATE POLICY "Nenhuma deleção direta" ON public.referrals FOR DELETE USING (false);
