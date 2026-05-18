ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS room_id uuid;
CREATE INDEX IF NOT EXISTS idx_attempts_room_id ON public.attempts(room_id);