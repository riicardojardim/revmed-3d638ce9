-- Ensure realtime delivers row payloads correctly
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.training_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.training_room_participants REPLICA IDENTITY FULL;
ALTER TABLE public.room_evaluations REPLICA IDENTITY FULL;
ALTER TABLE public.room_material_deliveries REPLICA IDENTITY FULL;
ALTER TABLE public.room_invites REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication (idempotent)
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.training_rooms; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.training_room_participants; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.room_evaluations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.room_material_deliveries; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.room_invites; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;