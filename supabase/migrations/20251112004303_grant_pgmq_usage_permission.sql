-- Concede permissão de uso no schema pgmq para os roles relevantes da API,
-- permitindo que eles "vejam" e acessem os objetos dentro do schema.
GRANT USAGE ON SCHEMA pgmq TO authenticator, authenticated, service_role;

-- Concede permissão para executar todas as funções no schema pgmq para os roles relevantes.
-- Isso é necessário para que o RPC possa chamar pgmq_read, pgmq_send, etc.
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO authenticator, authenticated, service_role;
