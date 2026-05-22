
-- Tabela de vídeo aulas
CREATE TABLE public.video_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  specialty TEXT NOT NULL,
  topic TEXT,
  description TEXT,
  video_url TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  cover_image_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View published lessons or own"
  ON public.video_lessons FOR SELECT TO authenticated
  USING (published = true OR created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professors/admins create lessons"
  ON public.video_lessons FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (has_role(auth.uid(), 'professor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Owners/admins update lessons"
  ON public.video_lessons FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners/admins delete lessons"
  ON public.video_lessons FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER tg_video_lessons_updated
  BEFORE UPDATE ON public.video_lessons
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Bucket para uploads de vídeo (privado; URL assinada será gerada no client)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-videos', 'lesson-videos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated read lesson videos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lesson-videos');

CREATE POLICY "Teachers upload lesson videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lesson-videos'
    AND (has_role(auth.uid(), 'professor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Teachers update lesson videos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'lesson-videos'
    AND (has_role(auth.uid(), 'professor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Teachers delete lesson videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'lesson-videos'
    AND (has_role(auth.uid(), 'professor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );
