UPDATE profiles
SET
    plan_type = 'pro',
    plan_expires_at = NOW() + INTERVAL '7 days',
    monthly_pulses_remaining = 500 -- Assuming 'pro' plan gives 500 pulses
WHERE
    plan_type IS DISTINCT FROM 'pro'; -- Only update if not already 'pro'
