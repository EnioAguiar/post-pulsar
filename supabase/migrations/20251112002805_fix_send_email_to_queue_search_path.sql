-- Recria a função send_email_to_queue com um search_path seguro e imutável
-- para resolver o aviso de segurança "Function Search Path Mutable".
CREATE OR REPLACE FUNCTION public.send_email_to_queue(message JSONB)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pgmq' -- Secure the search path
AS $$
DECLARE
    msg_id BIGINT;
BEGIN
    -- O schema não precisa ser especificado pois 'pgmq' está no search_path
    SELECT send('email_queue', message) INTO msg_id;
    RETURN msg_id;
END;
$$;

-- As permissões não precisam ser reaplicadas com CREATE OR REPLACE FUNCTION
-- se a "assinatura" da função (nome e tipos de argumento) não mudar.
