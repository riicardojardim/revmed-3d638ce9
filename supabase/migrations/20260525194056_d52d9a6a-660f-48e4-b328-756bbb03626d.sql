
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdf-pages', 'pdf-pages', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload pdf-pages"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pdf-pages' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read pdf-pages"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pdf-pages' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pdf-pages"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'pdf-pages' AND public.has_role(auth.uid(), 'admin'));
