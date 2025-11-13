-- Adiciona um comentário trivial a uma tabela existente para forçar a recarga do cache do schema do PostgREST.
COMMENT ON TABLE public.profiles IS 'Tabela de perfis de usuário. Comentário adicionado para forçar a recarga do schema do PostgREST.';
