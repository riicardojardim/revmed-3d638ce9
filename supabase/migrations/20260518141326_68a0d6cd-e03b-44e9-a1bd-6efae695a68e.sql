
-- 1) Username em profiles (case-insensitive, único)
CREATE EXTENSION IF NOT EXISTS citext;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username citext;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_format'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_format
      CHECK (username IS NULL OR username ~ '^[a-z0-9._]{3,20}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
  ON public.profiles (username) WHERE username IS NOT NULL;

-- Permite que qualquer usuário autenticado descubra perfis para amizade/convites
DROP POLICY IF EXISTS "Authenticated can view public profile fields" ON public.profiles;
CREATE POLICY "Authenticated can view public profile fields"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 2) Amizades (par ordenado para unicidade)
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b),
  CHECK (user_a < user_b)
);

CREATE INDEX IF NOT EXISTS friendships_user_a_idx ON public.friendships (user_a);
CREATE INDEX IF NOT EXISTS friendships_user_b_idx ON public.friendships (user_b);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view their friendships" ON public.friendships;
CREATE POLICY "Users view their friendships"
  ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

DROP POLICY IF EXISTS "Users delete their friendships" ON public.friendships;
CREATE POLICY "Users delete their friendships"
  ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Inserção feita pela função aceitar_amizade (security definer abaixo).

-- 3) Solicitações de amizade
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CHECK (from_user <> to_user),
  UNIQUE (from_user, to_user)
);

CREATE INDEX IF NOT EXISTS friend_requests_to_user_idx ON public.friend_requests (to_user, status);
CREATE INDEX IF NOT EXISTS friend_requests_from_user_idx ON public.friend_requests (from_user, status);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see requests they sent or received" ON public.friend_requests;
CREATE POLICY "Users see requests they sent or received"
  ON public.friend_requests FOR SELECT TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user);

DROP POLICY IF EXISTS "Users send their own requests" ON public.friend_requests;
CREATE POLICY "Users send their own requests"
  ON public.friend_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user);

DROP POLICY IF EXISTS "Users update requests they participate in" ON public.friend_requests;
CREATE POLICY "Users update requests they participate in"
  ON public.friend_requests FOR UPDATE TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user)
  WITH CHECK (auth.uid() = from_user OR auth.uid() = to_user);

DROP POLICY IF EXISTS "Users delete their requests" ON public.friend_requests;
CREATE POLICY "Users delete their requests"
  ON public.friend_requests FOR DELETE TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user);

-- 4) Convites para sala de treino
CREATE TABLE IF NOT EXISTS public.room_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.training_rooms(id) ON DELETE CASCADE,
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  station_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','cancelled','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CHECK (from_user <> to_user)
);

CREATE INDEX IF NOT EXISTS room_invites_to_user_idx ON public.room_invites (to_user, status);
CREATE INDEX IF NOT EXISTS room_invites_from_user_idx ON public.room_invites (from_user, status);
CREATE INDEX IF NOT EXISTS room_invites_room_idx ON public.room_invites (room_id);

ALTER TABLE public.room_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants see invites" ON public.room_invites;
CREATE POLICY "Participants see invites"
  ON public.room_invites FOR SELECT TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user);

DROP POLICY IF EXISTS "Sender creates invites" ON public.room_invites;
CREATE POLICY "Sender creates invites"
  ON public.room_invites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user);

DROP POLICY IF EXISTS "Participants update invite status" ON public.room_invites;
CREATE POLICY "Participants update invite status"
  ON public.room_invites FOR UPDATE TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user)
  WITH CHECK (auth.uid() = from_user OR auth.uid() = to_user);

DROP POLICY IF EXISTS "Participants delete invites" ON public.room_invites;
CREATE POLICY "Participants delete invites"
  ON public.room_invites FOR DELETE TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user);

-- 5) Notificações in-app
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see their notifications" ON public.notifications;
CREATE POLICY "Users see their notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update their notifications" ON public.notifications;
CREATE POLICY "Users update their notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete their notifications" ON public.notifications;
CREATE POLICY "Users delete their notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- inserts feitos via funções security definer abaixo (sem policy de INSERT pública)

-- 6) RPC: enviar pedido de amizade + notificação
CREATE OR REPLACE FUNCTION public.send_friend_request(_to_user uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_request_id uuid;
  v_from_name text;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _to_user IS NULL OR _to_user = v_me THEN RAISE EXCEPTION 'invalid target'; END IF;

  v_a := LEAST(v_me, _to_user);
  v_b := GREATEST(v_me, _to_user);
  IF EXISTS (SELECT 1 FROM friendships WHERE user_a = v_a AND user_b = v_b) THEN
    RAISE EXCEPTION 'already friends';
  END IF;

  -- Reaproveita request existente
  SELECT id INTO v_request_id FROM friend_requests
    WHERE from_user = v_me AND to_user = _to_user;
  IF v_request_id IS NOT NULL THEN
    UPDATE friend_requests
      SET status = 'pending', responded_at = NULL, created_at = now()
      WHERE id = v_request_id;
  ELSE
    INSERT INTO friend_requests (from_user, to_user)
      VALUES (v_me, _to_user)
      RETURNING id INTO v_request_id;
  END IF;

  SELECT COALESCE(full_name, username::text, 'Alguém') INTO v_from_name
    FROM profiles WHERE id = v_me;

  INSERT INTO notifications (user_id, type, payload)
    VALUES (_to_user, 'friend_request_received',
      jsonb_build_object('request_id', v_request_id, 'from_user', v_me, 'from_name', v_from_name));

  RETURN v_request_id;
END $$;

-- 7) RPC: aceitar pedido
CREATE OR REPLACE FUNCTION public.accept_friend_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_req friend_requests%ROWTYPE;
  v_a uuid; v_b uuid;
  v_to_name text;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_req FROM friend_requests WHERE id = _request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF v_req.to_user <> v_me THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'request not pending'; END IF;

  v_a := LEAST(v_req.from_user, v_req.to_user);
  v_b := GREATEST(v_req.from_user, v_req.to_user);
  INSERT INTO friendships (user_a, user_b) VALUES (v_a, v_b)
    ON CONFLICT DO NOTHING;

  UPDATE friend_requests
    SET status = 'accepted', responded_at = now()
    WHERE id = _request_id;

  SELECT COALESCE(full_name, username::text, 'Alguém') INTO v_to_name
    FROM profiles WHERE id = v_me;

  INSERT INTO notifications (user_id, type, payload)
    VALUES (v_req.from_user, 'friend_request_accepted',
      jsonb_build_object('user_id', v_me, 'name', v_to_name));
END $$;

-- 8) RPC: enviar convite pra sala (host cria sala separadamente e chama esta função)
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
  v_a uuid; v_b uuid;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _to_user IS NULL OR _to_user = v_me THEN RAISE EXCEPTION 'invalid target'; END IF;

  v_a := LEAST(v_me, _to_user);
  v_b := GREATEST(v_me, _to_user);
  IF NOT EXISTS (SELECT 1 FROM friendships WHERE user_a = v_a AND user_b = v_b) THEN
    RAISE EXCEPTION 'not friends';
  END IF;

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

-- 9) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_invites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
