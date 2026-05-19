-- Tabela singleton de configurações do site
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name text NOT NULL DEFAULT 'Estação Revalida',
  tagline text,
  logo_url text,
  favicon_url text,
  colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  fb_pixel_id text,
  tiktok_pixel_id text,
  ga4_id text,
  gtm_id text,
  meta_capi_token text,
  custom_head_html text,
  custom_body_html text,
  terms_md text,
  privacy_md text,
  contact_email text,
  is_singleton boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_singleton_unique UNIQUE (is_singleton)
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read settings"
ON public.site_settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins manage settings"
ON public.site_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Linha inicial
INSERT INTO public.site_settings (site_name, tagline)
VALUES ('Estação Revalida', 'Plataforma de treinamento para o Revalida')
ON CONFLICT DO NOTHING;

-- Bucket público para assets do site
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas do bucket
CREATE POLICY "Public read site-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');

CREATE POLICY "Admins upload site-assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update site-assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete site-assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::app_role));