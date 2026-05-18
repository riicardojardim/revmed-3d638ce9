ALTER TABLE public.training_rooms
  ADD COLUMN IF NOT EXISTS simulado_id uuid,
  ADD COLUMN IF NOT EXISTS simulado_name text,
  ADD COLUMN IF NOT EXISTS simulado_index integer,
  ADD COLUMN IF NOT EXISTS simulado_total integer;

ALTER TABLE public.attempts
  ADD COLUMN IF NOT EXISTS simulado_id uuid,
  ADD COLUMN IF NOT EXISTS simulado_name text,
  ADD COLUMN IF NOT EXISTS simulado_station_index integer,
  ADD COLUMN IF NOT EXISTS simulado_total_stations integer;

CREATE INDEX IF NOT EXISTS idx_attempts_simulado_id ON public.attempts(simulado_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_simulado ON public.attempts(user_id, simulado_id);