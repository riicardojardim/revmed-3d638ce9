ALTER TABLE public.custom_stations
  ADD COLUMN IF NOT EXISTS patient_script TEXT,
  ADD COLUMN IF NOT EXISTS evaluator_notes TEXT,
  ADD COLUMN IF NOT EXISTS competencies TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS scoring_criteria TEXT,
  ADD COLUMN IF NOT EXISTS post_materials TEXT;

ALTER TABLE public.training_rooms
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'dupla';

CREATE TABLE IF NOT EXISTS public.room_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.training_rooms(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL,
  candidate_id UUID,
  station_id TEXT NOT NULL,
  checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  item_comments JSONB NOT NULL DEFAULT '{}'::jsonb,
  final_feedback TEXT,
  final_score NUMERIC,
  status TEXT NOT NULL DEFAULT 'em_andamento',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, evaluator_id)
);
ALTER TABLE public.room_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Evaluator manages own evaluation"
ON public.room_evaluations FOR ALL TO authenticated
USING (
  evaluator_id = auth.uid()
  OR candidate_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.training_rooms r WHERE r.id = room_id AND (r.host_id = auth.uid() OR has_role(auth.uid(),'admin')))
)
WITH CHECK (evaluator_id = auth.uid());

CREATE TRIGGER trg_room_evaluations_updated_at
BEFORE UPDATE ON public.room_evaluations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_evaluations;
