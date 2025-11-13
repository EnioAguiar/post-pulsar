-- Adiciona o schema 'pgmq' ao search_path do role 'authenticator'
-- Isso permite que a API do Supabase (PostgREST) encontre as funções da extensão pgmq.
ALTER ROLE authenticator SET search_path = public, extensions, pgmq;

-- Também é uma boa prática garantir que o role postgres tenha o mesmo search_path
ALTER ROLE postgres SET search_path = public, extensions, pgmq;
