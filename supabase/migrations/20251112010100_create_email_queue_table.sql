
-- Cria a tabela da fila de e-mails
CREATE TABLE public.email_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email_type text NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'pending' NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    sent_at timestamptz,
    retries integer DEFAULT 0 NOT NULL,
    last_attempt timestamptz
);

-- Habilita a segurança em nível de linha
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Allow service_role to manage email_queue"
ON public.email_queue FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Allow authenticated users to insert their own tasks"
ON public.email_queue FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Comentários para documentação
COMMENT ON TABLE public.email_queue IS 'Queue for sending emails asynchronously.';
COMMENT ON COLUMN public.email_queue.email_type IS 'Type of email (e.g., newsletter_confirmation, password_reset).';
COMMENT ON COLUMN public.email_queue.payload IS 'JSON payload containing email data (to, subject, body, etc.).';
COMMENT ON COLUMN public.email_queue.status IS 'Current status of the email (pending, sent, failed).';
COMMENT ON COLUMN public.email_queue.retries IS 'Number of times the email sending has been retried.';
COMMENT ON COLUMN public.email_queue.last_attempt IS 'Timestamp of the last sending attempt.';
