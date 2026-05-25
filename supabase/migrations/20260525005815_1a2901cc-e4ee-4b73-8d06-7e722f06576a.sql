
-- Add tunable institutional fields to site_settings
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS exam_edition text DEFAULT 'Revalida 2025/2',
  ADD COLUMN IF NOT EXISTS nota_de_corte numeric(6,3) DEFAULT 62.174,
  ADD COLUMN IF NOT EXISTS contact_phone_primary text DEFAULT '+5521987860985',
  ADD COLUMN IF NOT EXISTS contact_phone_primary_label text DEFAULT '(21) 98786-0985 — Suporte REVMED',
  ADD COLUMN IF NOT EXISTS contact_phone_secondary text DEFAULT '+5521983786198',
  ADD COLUMN IF NOT EXISTS contact_phone_secondary_label text DEFAULT '(21) 98378-6198 — Dr. Anoar Jezini',
  ADD COLUMN IF NOT EXISTS instagram_url text DEFAULT 'https://instagram.com/revmedmentoria',
  ADD COLUMN IF NOT EXISTS instagram_handle text DEFAULT '@revmedmentoria',
  ADD COLUMN IF NOT EXISTS cnpj text DEFAULT 'CNPJ 48.442.973/0001-07',
  ADD COLUMN IF NOT EXISTS footer_description text DEFAULT 'A plataforma de prática do candidato Revalida INEP — sala ao vivo com vídeo, checklist 3 níveis, flashcards inteligentes, resumos, comunidade e gamificação num só lugar.';

-- Recreate the public view to expose the new fields to the client
DROP VIEW IF EXISTS public.site_settings_public;
CREATE VIEW public.site_settings_public AS
SELECT
  id, site_name, tagline, logo_url, favicon_url, colors,
  intro_animation_variant, urgency_banner_text,
  whatsapp_banner_enabled, whatsapp_banner_url, whatsapp_banner_label,
  terms_md, privacy_md, contact_email,
  exam_edition, nota_de_corte,
  contact_phone_primary, contact_phone_primary_label,
  contact_phone_secondary, contact_phone_secondary_label,
  instagram_url, instagram_handle, cnpj, footer_description,
  is_singleton, created_at, updated_at
FROM public.site_settings;

GRANT SELECT ON public.site_settings_public TO anon, authenticated;
