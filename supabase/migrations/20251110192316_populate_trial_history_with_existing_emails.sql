INSERT INTO trial_history (email, trial_started_at)
SELECT email, created_at
FROM auth.users
ON CONFLICT (email) DO NOTHING;