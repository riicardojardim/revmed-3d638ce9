ALTER TABLE public.flashcard_decks
  ADD COLUMN IF NOT EXISTS station_id uuid REFERENCES public.custom_stations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_flashcard_decks_station_id
  ON public.flashcard_decks(station_id);