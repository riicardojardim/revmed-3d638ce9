CREATE OR REPLACE FUNCTION public.send_room_invite(_to_user uuid, _room_id uuid, _station_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_invite_id uuid;
  v_from_name text;
  v_room_code text;
  v_specialty text;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _to_user IS NULL OR _to_user = v_me THEN RAISE EXCEPTION 'invalid target'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM training_rooms WHERE id = _room_id AND host_id = v_me
  ) THEN
    RAISE EXCEPTION 'room not owned by you';
  END IF;

  INSERT INTO room_invites (room_id, from_user, to_user, station_id)
    VALUES (_room_id, v_me, _to_user, _station_id)
    RETURNING id INTO v_invite_id;

  SELECT COALESCE(full_name, username::text, 'Alguém') INTO v_from_name
    FROM profiles WHERE id = v_me;
  SELECT code INTO v_room_code FROM training_rooms WHERE id = _room_id;
  SELECT specialty INTO v_specialty FROM custom_stations WHERE id = _station_id;

  INSERT INTO notifications (user_id, type, payload)
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

CREATE OR REPLACE FUNCTION public.search_users_for_invite(_q text)
RETURNS TABLE (id uuid, full_name text, username text, avatar_url text, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_q text := lower(trim(coalesce(_q, '')));
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF length(v_q) < 2 THEN RETURN; END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.username::text, p.avatar_url, u.email::text
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

GRANT EXECUTE ON FUNCTION public.search_users_for_invite(text) TO authenticated;