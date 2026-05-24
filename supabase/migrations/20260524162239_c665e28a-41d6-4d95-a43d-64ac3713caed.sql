-- ============================================
-- C2: Restrict profile PII (CPF, whatsapp, birth_date) from other users
-- ============================================

-- Drop the overly-permissive policy that lets any authenticated user see all columns
DROP POLICY IF EXISTS "Authenticated can view public profile fields" ON public.profiles;

-- Owner-only and admin-only SELECTs remain via existing policies:
--   "Profiles are viewable by owner" (auth.uid() = id)
--   "Admins view all profiles" (has_role(admin))

-- Public-safe view for social/listing use cases (no PII)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT
  id,
  full_name,
  username,
  avatar_url,
  title,
  gender,
  first_name,
  last_name
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- ============================================
-- I10: Hide marketing/tracking secrets in site_settings from regular users
-- ============================================

DROP POLICY IF EXISTS "Authenticated can read settings" ON public.site_settings;

-- Public-safe view exposing only non-sensitive branding/content fields
CREATE OR REPLACE VIEW public.site_settings_public
WITH (security_invoker = on) AS
SELECT
  id,
  site_name,
  tagline,
  logo_url,
  favicon_url,
  colors,
  intro_animation_variant,
  urgency_banner_text,
  whatsapp_banner_enabled,
  whatsapp_banner_url,
  whatsapp_banner_label,
  terms_md,
  privacy_md,
  contact_email,
  is_singleton,
  created_at,
  updated_at
FROM public.site_settings;

GRANT SELECT ON public.site_settings_public TO authenticated, anon;

-- Admins keep full access through the existing "Admins manage settings" ALL policy.