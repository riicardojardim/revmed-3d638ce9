CREATE OR REPLACE FUNCTION public.username_exists(_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE username = NULLIF(trim(_username), '')::citext
  );
$$;

GRANT EXECUTE ON FUNCTION public.username_exists(text) TO anon, authenticated;