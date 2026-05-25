
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.provider_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('payment','live_video','video_upload')),
  provider_key text NOT NULL,
  provider_label text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  api_key text,
  api_url text,
  webhook_secret text,
  webhook_url text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, provider_key)
);

ALTER TABLE public.provider_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage provider settings" ON public.provider_settings;
CREATE POLICY "Admins manage provider settings"
  ON public.provider_settings
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_provider_settings_updated_at ON public.provider_settings;
CREATE TRIGGER update_provider_settings_updated_at
  BEFORE UPDATE ON public.provider_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS provider_settings_one_active_per_category
  ON public.provider_settings (category)
  WHERE is_active = true;

INSERT INTO public.provider_settings (category, provider_key, provider_label) VALUES
  ('payment','mercado_pago','Mercado Pago'),
  ('payment','hotmart','Hotmart'),
  ('payment','stripe','Stripe'),
  ('live_video','livekit','LiveKit'),
  ('live_video','boonstream','Boonstream'),
  ('video_upload','bunny','Bunny.net'),
  ('video_upload','cloudflare_stream','Cloudflare Stream'),
  ('video_upload','mux','Mux')
ON CONFLICT (category, provider_key) DO NOTHING;
