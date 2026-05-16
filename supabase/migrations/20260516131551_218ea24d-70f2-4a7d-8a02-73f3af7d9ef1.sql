
-- Custom stations authored by professors
CREATE TABLE public.custom_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  specialty TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'Intermediário',
  duration_minutes INTEGER NOT NULL DEFAULT 10,
  clinical_case TEXT NOT NULL,
  candidate_task TEXT NOT NULL,
  patient_info TEXT,
  support_materials TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.custom_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view published stations"
  ON public.custom_stations FOR SELECT
  TO authenticated
  USING (published = true OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Professors and admins create stations"
  ON public.custom_stations FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (public.has_role(auth.uid(), 'professor') OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Owners and admins update stations"
  ON public.custom_stations FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners and admins delete stations"
  ON public.custom_stations FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX custom_stations_created_by_idx ON public.custom_stations (created_by, created_at DESC);

-- Checklist items for custom stations
CREATE TABLE public.station_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.custom_stations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.station_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View checklist of accessible stations"
  ON public.station_checklist_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.custom_stations s
    WHERE s.id = station_id
      AND (s.published = true OR s.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Owners manage checklist items"
  ON public.station_checklist_items FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.custom_stations s
    WHERE s.id = station_id
      AND (s.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.custom_stations s
    WHERE s.id = station_id
      AND (s.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE INDEX station_checklist_items_station_idx
  ON public.station_checklist_items (station_id, order_index);

-- Add professor review fields to attempts
ALTER TABLE public.attempts
  ADD COLUMN professor_feedback TEXT,
  ADD COLUMN professor_score NUMERIC(4,2),
  ADD COLUMN reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN reviewed_at TIMESTAMPTZ;

CREATE POLICY "Teachers and admins update attempts for review"
  ON public.attempts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'professor') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'professor') OR public.has_role(auth.uid(), 'admin'));

-- updated_at helper for custom_stations
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER custom_stations_touch_updated_at
  BEFORE UPDATE ON public.custom_stations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
