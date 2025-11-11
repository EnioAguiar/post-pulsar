-- 1. Idempotently unschedule the old cron job if it exists.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hard-delete-users-daily') THEN
        PERFORM cron.unschedule('hard-delete-users-daily');
    END IF;
END;
$$;

-- 2. Schedule the new cron job with the corrected net.http_post syntax.
-- Note: The placeholder YOUR_SUPABASE_SERVICE_ROLE_KEY must be replaced with the actual key in your environment.
SELECT cron.schedule(
    'hard-delete-users-daily', -- unique name of the cron job
    '0 0 * * *',               -- every day at midnight (UTC)
    $$
    SELECT net.http_post(
        url:='https://rsfbqvqxabeplqmgbzen.supabase.co/functions/v1/hard-delete-users',
        body:='{}'::jsonb,
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || 'YOUR_SUPABASE_SERVICE_ROLE_KEY'
        )
    );
    $$
);