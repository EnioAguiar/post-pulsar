-- Create an RPC function to send messages to the email_queue
CREATE OR REPLACE FUNCTION public.send_email_to_queue(message JSONB)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER -- Important for security, allows function to run with definer's privileges
AS $$
DECLARE
    msg_id BIGINT;
BEGIN
    SELECT pgmq.send('email_queue', message) INTO msg_id;
    RETURN msg_id;
END;
$$;

-- Grant execute permissions to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.send_email_to_queue(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_email_to_queue(JSONB) TO service_role;
