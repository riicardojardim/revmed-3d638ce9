
-- Storage bucket for station printed materials (impressos) images
INSERT INTO storage.buckets (id, name, public)
VALUES ('station-materials', 'station-materials', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone authenticated can read (bucket is public, but explicit policy for clarity)
CREATE POLICY "Public read station-materials"
ON storage.objects FOR SELECT
USING (bucket_id = 'station-materials');

-- Professors and admins can upload
CREATE POLICY "Professors/admins upload station-materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'station-materials'
  AND (public.has_role(auth.uid(), 'professor') OR public.has_role(auth.uid(), 'admin'))
);

-- Uploader, professors and admins can update/delete their files
CREATE POLICY "Professors/admins update station-materials"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'station-materials'
  AND (public.has_role(auth.uid(), 'professor') OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Professors/admins delete station-materials"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'station-materials'
  AND (public.has_role(auth.uid(), 'professor') OR public.has_role(auth.uid(), 'admin'))
);

-- Persist delivered image url for materials handed to candidate
ALTER TABLE public.room_material_deliveries
ADD COLUMN IF NOT EXISTS material_image_url text;
