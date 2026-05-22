-- =========================================================
-- 1) PROFILES: bloquear leitura de CPF, WhatsApp e data de nascimento
--    por outros usuários autenticados (column-level grants)
-- =========================================================

REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id, full_name, username, avatar_url,
  first_name, last_name, title, gender,
  exam_year, selected_plan,
  created_at, updated_at
) ON public.profiles TO anon, authenticated;

-- Função segura para o próprio usuário ler seus campos sensíveis
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE(
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  first_name text,
  last_name text,
  title text,
  gender text,
  exam_year text,
  selected_plan text,
  cpf text,
  whatsapp text,
  birth_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.full_name, p.username::text, p.avatar_url,
    p.first_name, p.last_name, p.title, p.gender,
    p.exam_year, p.selected_plan,
    p.cpf, p.whatsapp, p.birth_date
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- =========================================================
-- 2) SITE_SETTINGS: esconder meta_capi_token de usuários comuns
-- =========================================================

REVOKE SELECT ON public.site_settings FROM anon, authenticated;

GRANT SELECT (
  id, site_name, tagline, logo_url, favicon_url, colors,
  fb_pixel_id, tiktok_pixel_id, ga4_id, gtm_id,
  custom_head_html, custom_body_html,
  terms_md, privacy_md, contact_email,
  intro_animation_variant,
  whatsapp_banner_enabled, whatsapp_banner_label, whatsapp_banner_url,
  urgency_banner_text,
  is_singleton, created_at, updated_at
) ON public.site_settings TO anon, authenticated;
-- meta_capi_token continua acessível apenas para admins via policy "Admins manage settings"