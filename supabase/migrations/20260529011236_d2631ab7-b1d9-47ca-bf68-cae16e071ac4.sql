-- Unschedulling old jobs if they exist (just in case they were created with wrong URL)
SELECT cron.unschedule('check-inactive-users');
SELECT cron.unschedule('daily-motivation-push');

-- Re-schedule with correct URLs
-- 1. Check for inactive users at 10:00 AM daily
SELECT cron.schedule(
  'check-inactive-users',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fvlzmyqioojykoxoboce.supabase.co/functions/v1/automated-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{"type": "inactivity_check"}'::jsonb
  );
  $$
);

-- 2. Daily morning motivation at 08:00 AM daily
SELECT cron.schedule(
  'daily-motivation-push',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fvlzmyqioojykoxoboce.supabase.co/functions/v1/automated-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{"type": "daily_motivation"}'::jsonb
  );
  $$
);
