ALTER TABLE public.flashcard_reviews 
  ADD COLUMN IF NOT EXISTS last_time_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_time_seconds integer NOT NULL DEFAULT 0;