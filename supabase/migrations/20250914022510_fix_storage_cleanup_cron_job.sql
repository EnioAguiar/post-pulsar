-- Schedule the corrected job to run daily at 3:00 AM.
-- We use a new name ('storage_cleanup_daily_v2') to avoid conflicts with the old, broken job.
-- The old job will continue to fail, but this new one will succeed.
-- You can manually delete the old job from the Supabase UI (in Database > Cron Jobs) to stop the error notifications.

-- IMPORTANT: The Supabase anon key is used here for authorization. For better security,
-- you should protect the Edge Function and use the service_role key instead.
SELECT cron.schedule(
  'storage_cleanup_daily_v2',
  '0 3 * * *', -- Every day at 3:00 AM
  $$
    select net.http_post(
      url:='https://wvfooigeytvdcfnzzrrg.supabase.co/functions/v1/storage-cleanup',
      headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYT4CUs"}'::jsonb
    );
  $$
);