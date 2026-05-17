
-- 1. Flashcard decks table
CREATE TABLE public.flashcard_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  title text NOT NULL,
  specialty text NOT NULL,
  topic text,
  description text,
  cover_image_url text,
  published boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View published decks or own"
ON public.flashcard_decks FOR SELECT TO authenticated
USING (published = true OR created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professors/admins create decks"
ON public.flashcard_decks FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND (has_role(auth.uid(), 'professor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Owners/admins update decks"
ON public.flashcard_decks FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners/admins delete decks"
ON public.flashcard_decks FOR DELETE TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_flashcard_decks_updated_at
BEFORE UPDATE ON public.flashcard_decks
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Add deck_id + position to flashcards
ALTER TABLE public.flashcards
  ADD COLUMN deck_id uuid REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
  ADD COLUMN position int NOT NULL DEFAULT 0;

CREATE INDEX idx_flashcards_deck_id ON public.flashcards(deck_id);

-- 3. Storage bucket for deck covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('flashcard-covers', 'flashcard-covers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Flashcard covers public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'flashcard-covers');

CREATE POLICY "Professors/admins upload flashcard covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'flashcard-covers'
  AND (has_role(auth.uid(), 'professor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Professors/admins update flashcard covers"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'flashcard-covers'
  AND (has_role(auth.uid(), 'professor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Professors/admins delete flashcard covers"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'flashcard-covers'
  AND (has_role(auth.uid(), 'professor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);
