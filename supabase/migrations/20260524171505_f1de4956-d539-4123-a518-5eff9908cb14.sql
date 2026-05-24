
CREATE TABLE public.room_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null,
  type text not null,
  actor_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

CREATE INDEX idx_room_events_room_created ON public.room_events(room_id, created_at);

ALTER TABLE public.room_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view room events"
  ON public.room_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert own room events"
  ON public.room_events FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE POLICY "Author or admin deletes room events"
  ON public.room_events FOR DELETE TO authenticated
  USING (actor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_events;
ALTER TABLE public.room_events REPLICA IDENTITY FULL;
