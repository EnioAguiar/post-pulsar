-- Substitui a função existente por uma nova que também gera um código de indicação para novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, referral_code)
  VALUES (new.id, left(replace(gen_random_uuid()::text, '-', ''), 8)); -- Gera um código de 8 caracteres aleatório
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário para registrar a mudança
COMMENT ON FUNCTION public.handle_new_user() IS 'Cria um perfil para um novo usuário e gera um código de indicação único.';
