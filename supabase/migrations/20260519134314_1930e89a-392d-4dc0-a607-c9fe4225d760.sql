CREATE OR REPLACE FUNCTION public.lookup_login_email(_identifier text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id text := trim(coalesce(_identifier, ''));
  v_digits text;
  v_email text;
BEGIN
  IF length(v_id) = 0 THEN RETURN NULL; END IF;

  -- If already looks like an email, return as-is
  IF position('@' in v_id) > 0 THEN
    RETURN lower(v_id);
  END IF;

  -- Try username match (case-insensitive via citext)
  SELECT u.email::text INTO v_email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.username = v_id::citext
  LIMIT 1;
  IF v_email IS NOT NULL THEN RETURN v_email; END IF;

  -- Strip non-digits for CPF / phone matching
  v_digits := regexp_replace(v_id, '[^0-9]', '', 'g');
  IF length(v_digits) = 0 THEN RETURN NULL; END IF;

  -- CPF match (11 digits)
  IF length(v_digits) = 11 THEN
    SELECT u.email::text INTO v_email
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE regexp_replace(coalesce(p.cpf, ''), '[^0-9]', '', 'g') = v_digits
    LIMIT 1;
    IF v_email IS NOT NULL THEN RETURN v_email; END IF;
  END IF;

  -- Phone / WhatsApp match (last 10 or 11 digits)
  SELECT u.email::text INTO v_email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE right(regexp_replace(coalesce(p.whatsapp, ''), '[^0-9]', '', 'g'), 10) = right(v_digits, 10)
    AND length(regexp_replace(coalesce(p.whatsapp, ''), '[^0-9]', '', 'g')) >= 10
  LIMIT 1;

  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_login_email(text) TO anon, authenticated;