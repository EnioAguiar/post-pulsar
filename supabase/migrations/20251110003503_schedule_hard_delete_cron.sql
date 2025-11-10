-- Create a cron job to run the hard-delete-users Edge Function daily
SELECT cron.schedule(
    'hard-delete-users-daily', -- unique name of the cron job
    '0 0 * * *',               -- every day at midnight (UTC)
    $$
    SELECT net.http_post(
        'http://localhost:54321/functions/v1/hard-delete-users', -- Local Supabase functions endpoint
        '{}',                                                    -- empty JSON body
        ARRAY[
            json_build_object('Content-Type', 'application/json'),
            json_build_object('Authorization', 'Bearer ' || 'YOUR_SUPABASE_SERVICE_ROLE_KEY') -- IMPORTANT: Replace with your actual Supabase Service Role Key
        ]
    );
    $$
);
