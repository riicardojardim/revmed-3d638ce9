ALTER TABLE public.summaries
  ADD COLUMN IF NOT EXISTS station_id uuid;

CREATE INDEX IF NOT EXISTS idx_summaries_station_id
  ON public.summaries (station_id);
