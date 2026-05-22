-- 1) Direct messages table for 1-to-1 chat
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX idx_dm_pair_created ON public.direct_messages (
  LEAST(from_user, to_user),
  GREATEST(from_user, to_user),
  created_at DESC
);
CREATE INDEX idx_dm_to_unread ON public.direct_messages (to_user) WHERE read_at IS NULL;

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view their messages"
ON public.direct_messages FOR SELECT TO authenticated
USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "Users send their own messages"
ON public.direct_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = from_user AND from_user <> to_user);

CREATE POLICY "Recipient marks as read"
ON public.direct_messages FOR UPDATE TO authenticated
USING (auth.uid() = to_user)
WITH CHECK (auth.uid() = to_user);

CREATE POLICY "Sender deletes own message"
ON public.direct_messages FOR DELETE TO authenticated
USING (auth.uid() = from_user);

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;

-- 2) RPC: list users who have shared a training_room with me
CREATE OR REPLACE FUNCTION public.list_station_buddies()
RETURNS TABLE (
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  shared_rooms integer,
  last_shared_at timestamptz,
  is_friend boolean,
  request_status text,
  request_id uuid,
  request_from uuid,
  unread_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  RETURN QUERY
  WITH my_rooms AS (
    SELECT DISTINCT room_id FROM public.training_room_participants WHERE user_id = v_me
  ),
  buddies AS (
    SELECT trp.user_id,
           COUNT(DISTINCT trp.room_id)::int AS shared_rooms,
           MAX(trp.joined_at) AS last_shared_at
    FROM public.training_room_participants trp
    JOIN my_rooms mr ON mr.room_id = trp.room_id
    WHERE trp.user_id <> v_me
    GROUP BY trp.user_id
  )
  SELECT
    p.id,
    p.full_name,
    p.username::text,
    p.avatar_url,
    b.shared_rooms,
    b.last_shared_at,
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE (f.user_a = LEAST(v_me, p.id) AND f.user_b = GREATEST(v_me, p.id))
    ) AS is_friend,
    (SELECT fr.status FROM public.friend_requests fr
       WHERE ((fr.from_user = v_me AND fr.to_user = p.id)
           OR (fr.from_user = p.id AND fr.to_user = v_me))
       ORDER BY fr.created_at DESC LIMIT 1) AS request_status,
    (SELECT fr.id FROM public.friend_requests fr
       WHERE ((fr.from_user = v_me AND fr.to_user = p.id)
           OR (fr.from_user = p.id AND fr.to_user = v_me))
       ORDER BY fr.created_at DESC LIMIT 1) AS request_id,
    (SELECT fr.from_user FROM public.friend_requests fr
       WHERE ((fr.from_user = v_me AND fr.to_user = p.id)
           OR (fr.from_user = p.id AND fr.to_user = v_me))
       ORDER BY fr.created_at DESC LIMIT 1) AS request_from,
    (SELECT COUNT(*)::int FROM public.direct_messages dm
       WHERE dm.from_user = p.id AND dm.to_user = v_me AND dm.read_at IS NULL) AS unread_count
  FROM buddies b
  JOIN public.profiles p ON p.id = b.user_id
  ORDER BY b.last_shared_at DESC;
END $$;

-- 3) RPC: list accepted friends with unread counts and last shared
CREATE OR REPLACE FUNCTION public.list_my_friends()
RETURNS TABLE (
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  friended_at timestamptz,
  unread_count integer,
  last_message_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.username::text,
    p.avatar_url,
    f.created_at AS friended_at,
    (SELECT COUNT(*)::int FROM public.direct_messages dm
       WHERE dm.from_user = p.id AND dm.to_user = v_me AND dm.read_at IS NULL) AS unread_count,
    (SELECT MAX(dm.created_at) FROM public.direct_messages dm
       WHERE (dm.from_user = v_me AND dm.to_user = p.id)
          OR (dm.from_user = p.id AND dm.to_user = v_me)) AS last_message_at
  FROM public.friendships f
  JOIN public.profiles p ON p.id = CASE WHEN f.user_a = v_me THEN f.user_b ELSE f.user_a END
  WHERE f.user_a = v_me OR f.user_b = v_me
  ORDER BY COALESCE(
    (SELECT MAX(dm.created_at) FROM public.direct_messages dm
       WHERE (dm.from_user = v_me AND dm.to_user = p.id)
          OR (dm.from_user = p.id AND dm.to_user = v_me)),
    f.created_at
  ) DESC;
END $$;

-- 4) RPC: list pending friend requests received
CREATE OR REPLACE FUNCTION public.list_pending_friend_requests()
RETURNS TABLE (
  request_id uuid,
  from_user uuid,
  full_name text,
  username text,
  avatar_url text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  RETURN QUERY
  SELECT fr.id, fr.from_user, p.full_name, p.username::text, p.avatar_url, fr.created_at
  FROM public.friend_requests fr
  JOIN public.profiles p ON p.id = fr.from_user
  WHERE fr.to_user = v_me AND fr.status = 'pending'
  ORDER BY fr.created_at DESC;
END $$;