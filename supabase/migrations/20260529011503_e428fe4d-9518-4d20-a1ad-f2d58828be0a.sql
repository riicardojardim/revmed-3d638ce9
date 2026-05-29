-- Reschedule with more varied times
SELECT cron.unschedule('check-inactive-users');
SELECT cron.unschedule('daily-motivation-push');

-- 1. Check for inactive users at 11:15 AM (varied time)
SELECT cron.schedule(
  'check-inactive-users',
  '15 11 * * *',
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

-- 2. Daily morning motivation at 08:30 AM (varied time)
SELECT cron.schedule(
  'daily-motivation-push',
  '30 8 * * *',
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
