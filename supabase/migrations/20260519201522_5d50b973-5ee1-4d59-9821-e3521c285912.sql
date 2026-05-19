ALTER TABLE public.summaries
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'Intermediário',
  ADD COLUMN IF NOT EXISTS high_yield boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS definition text,
  ADD COLUMN IF NOT EXISTS clinical_picture text,
  ADD COLUMN IF NOT EXISTS diagnosis text,
  ADD COLUMN IF NOT EXISTS conduct text,
  ADD COLUMN IF NOT EXISTS key_points text,
  ADD COLUMN IF NOT EXISTS pitfalls text,
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;