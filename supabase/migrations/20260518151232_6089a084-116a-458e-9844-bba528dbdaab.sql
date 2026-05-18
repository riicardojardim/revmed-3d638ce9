CREATE OR REPLACE FUNCTION public.recent_invited_users(_limit int DEFAULT 8)
RETURNS TABLE(id uuid, full_name text, username text, avatar_url text, email text, allows_candidato boolean, last_invited_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  RETURN QUERY
  WITH recent AS (
    SELECT ri.to_user, MAX(ri.created_at) AS last_invited_at
    FROM public.room_invites ri
    WHERE ri.from_user = v_me
    GROUP BY ri.to_user
    ORDER BY MAX(ri.created_at) DESC
    LIMIT GREATEST(_limit, 1)
  )
  SELECT
    p.id,
    p.full_name,
    p.username::text,
    p.avatar_url,
    u.email::text,
    COALESCE(
      (
        SELECT pl.allows_candidato
        FROM public.user_subscriptions us
        JOIN public.plans pl ON pl.id = us.plan_id
        WHERE us.user_id = p.id
          AND (us.current_period_end IS NULL OR us.current_period_end > now())
        ORDER BY us.current_period_end DESC NULLS LAST
        LIMIT 1
      ),
      true
    ) AS allows_candidato,
    r.last_invited_at
  FROM recent r
  JOIN public.profiles p ON p.id = r.to_user
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY r.last_invited_at DESC;
END $$;