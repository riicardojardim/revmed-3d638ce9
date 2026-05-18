CREATE OR REPLACE FUNCTION public.respond_room_invite(_invite_id uuid, _accept boolean)
RETURNS TABLE(room_code text, room_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_inv public.room_invites%ROWTYPE;
  v_to_name text;
  v_code text;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_inv FROM public.room_invites WHERE id = _invite_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'invite not found'; END IF;
  IF v_inv.to_user <> v_me THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_inv.status <> 'pending' THEN RAISE EXCEPTION 'invite not pending'; END IF;

  UPDATE public.room_invites
    SET status = CASE WHEN _accept THEN 'accepted' ELSE 'declined' END,
        responded_at = now()
    WHERE id = _invite_id;

  SELECT COALESCE(full_name, username::text, 'Alguém') INTO v_to_name
    FROM public.profiles WHERE id = v_me;
  SELECT code INTO v_code FROM public.training_rooms WHERE id = v_inv.room_id;

  INSERT INTO public.notifications (user_id, type, payload)
    VALUES (
      v_inv.from_user,
      CASE WHEN _accept THEN 'room_invite_accepted' ELSE 'room_invite_declined' END,
      jsonb_build_object(
        'invite_id', v_inv.id,
        'room_id', v_inv.room_id,
        'room_code', v_code,
        'from_user', v_me,
        'from_name', v_to_name
      )
    );

  RETURN QUERY SELECT v_code, v_inv.room_id;
END $$;