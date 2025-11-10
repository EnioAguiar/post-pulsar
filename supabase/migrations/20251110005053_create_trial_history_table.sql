CREATE TABLE public.trial_history (
    email TEXT PRIMARY KEY,
    country TEXT,
    trial_started_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.trial_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for authenticated users" ON public.trial_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert access for authenticated users" ON public.trial_history FOR INSERT TO authenticated WITH CHECK (true);
