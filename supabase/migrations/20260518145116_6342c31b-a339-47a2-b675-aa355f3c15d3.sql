DROP FUNCTION IF EXISTS public.search_users_for_invite(text);

CREATE FUNCTION public.search_users_for_invite(_q text)
RETURNS TABLE(id uuid, full_name text, username text, avatar_url text, email text, allows_candidato boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_q text := lower(trim(coalesce(_q, '')));
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF length(v_q) < 2 THEN RETURN; END IF;

  RETURN QUERY
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
    ) AS allows_candidato
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.id <> v_me
    AND (
      lower(coalesce(p.full_name, '')) LIKE '%' || v_q || '%'
      OR lower(coalesce(p.username::text, '')) LIKE '%' || v_q || '%'
      OR lower(coalesce(u.email::text, '')) LIKE '%' || v_q || '%'
    )
  ORDER BY p.full_name NULLS LAST
  LIMIT 20;
END $$;

CREATE OR REPLACE FUNCTION public.send_room_invite(_to_user uuid, _room_id uuid, _station_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_invite_id uuid;
  v_from_name text;
  v_room_code text;
  v_specialty text;
  v_allows_candidato boolean;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _to_user IS NULL OR _to_user = v_me THEN RAISE EXCEPTION 'invalid target'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.training_rooms WHERE id = _room_id AND host_id = v_me
  ) THEN
    RAISE EXCEPTION 'room not owned by you';
  END IF;

  SELECT COALESCE(
    (
      SELECT pl.allows_candidato
      FROM public.user_subscriptions us
      JOIN public.plans pl ON pl.id = us.plan_id
      WHERE us.user_id = _to_user
        AND (us.current_period_end IS NULL OR us.current_period_end > now())
      ORDER BY us.current_period_end DESC NULLS LAST
      LIMIT 1
    ),
    true
  ) INTO v_allows_candidato;

  IF v_allows_candidato IS FALSE THEN
    RAISE EXCEPTION 'recipient plan does not allow candidato';
  END IF;

  INSERT INTO public.room_invites (room_id, from_user, to_user, station_id)
    VALUES (_room_id, v_me, _to_user, _station_id)
    RETURNING id INTO v_invite_id;

  SELECT COALESCE(full_name, username::text, 'Alguém') INTO v_from_name
    FROM public.profiles WHERE id = v_me;
  SELECT code INTO v_room_code FROM public.training_rooms WHERE id = _room_id;
  SELECT specialty INTO v_specialty FROM public.custom_stations WHERE id = _station_id;

  INSERT INTO public.notifications (user_id, type, payload)
    VALUES (_to_user, 'room_invite_received',
      jsonb_build_object(
        'invite_id', v_invite_id,
        'room_id', _room_id,
        'room_code', v_room_code,
        'from_user', v_me,
        'from_name', v_from_name,
        'specialty', v_specialty
      ));

  RETURN v_invite_id;
END $$;