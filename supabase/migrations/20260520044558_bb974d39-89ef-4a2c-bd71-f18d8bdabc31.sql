ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS whatsapp_banner_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_banner_label text DEFAULT 'Grupo Premium 2026.1 · WhatsApp (Grupo 6)',
  ADD COLUMN IF NOT EXISTS whatsapp_banner_url text DEFAULT 'https://chat.whatsapp.com/';