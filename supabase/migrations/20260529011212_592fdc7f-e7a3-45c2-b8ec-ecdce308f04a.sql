-- Function to get inactive users for push notifications
CREATE OR REPLACE FUNCTION public.get_inactive_users_for_push()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM public.profiles p
  JOIN public.push_subscriptions ps ON p.id = ps.user_id
  LEFT JOIN (
    -- Get last participation for each user
    SELECT user_id, MAX(joined_at) as last_activity
    FROM public.training_room_participants
    GROUP BY user_id
  ) activity ON p.id = activity.user_id
  WHERE 
    -- User hasn't participated in a room for more than 48 hours
    (activity.last_activity IS NULL OR activity.last_activity < now() - interval '48 hours')
    AND 
    -- Avoid spamming: haven't received an automated push in the last 24 hours
    NOT EXISTS (
      SELECT 1 FROM public.notifications n 
      WHERE n.user_id = p.id 
      AND n.type = 'automated_push' 
      AND n.created_at > now() - interval '24 hours'
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_inactive_users_for_push() TO service_role;

-- Schedule the automated notifications via pg_cron
-- 1. Daily check for inactive users at 10:00 AM
SELECT cron.schedule(
  'check-inactive-users',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM public.site_settings WHERE key = 'edge_function_url' LIMIT 1) || '/automated-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{"type": "inactivity_check"}'::jsonb
  );
  $$
);

-- 2. Daily morning motivation at 08:00 AM
SELECT cron.schedule(
  'daily-motivation-push',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM public.site_settings WHERE key = 'edge_function_url' LIMIT 1) || '/automated-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{"type": "daily_motivation"}'::jsonb
  );
  $$
);
