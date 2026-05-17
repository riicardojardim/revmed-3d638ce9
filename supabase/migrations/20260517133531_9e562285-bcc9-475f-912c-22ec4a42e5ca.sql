
ALTER TABLE public.training_rooms
  ADD COLUMN IF NOT EXISTS actor_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS candidate_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS starting_at timestamptz;

ALTER TABLE public.training_room_participants
  ADD COLUMN IF NOT EXISTS is_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.training_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.training_room_participants REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.training_rooms;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.training_room_participants;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
