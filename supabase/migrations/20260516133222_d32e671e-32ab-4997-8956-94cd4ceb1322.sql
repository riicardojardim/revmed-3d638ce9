
-- Patient profile and deliverable materials on custom_stations
ALTER TABLE public.custom_stations
  ADD COLUMN IF NOT EXISTS patient_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deliverable_materials jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS educational_goal text,
  ADD COLUMN IF NOT EXISTS expected_conduct text,
  ADD COLUMN IF NOT EXISTS common_mistakes text;

-- Realtime deliveries from actor -> candidate inside a room
CREATE TABLE IF NOT EXISTS public.room_material_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  material_id text NOT NULL,
  material_name text NOT NULL,
  material_type text,
  material_description text,
  material_content text,
  delivered_by uuid NOT NULL,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, material_id)
);

ALTER TABLE public.room_material_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view deliveries"
  ON public.room_material_deliveries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Participants insert deliveries"
  ON public.room_material_deliveries FOR INSERT TO authenticated
  WITH CHECK (delivered_by = auth.uid());

CREATE POLICY "Deliverer or host deletes"
  ON public.room_material_deliveries FOR DELETE TO authenticated
  USING (
    delivered_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.training_rooms r
      WHERE r.id = room_id
        AND (r.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

ALTER TABLE public.room_material_deliveries REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_material_deliveries;
