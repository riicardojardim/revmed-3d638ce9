
ALTER VIEW public.site_settings_public SET (security_invoker = true);
-- Allow anonymous + authenticated to read the public view
GRANT SELECT ON public.site_settings_public TO anon, authenticated;
-- The view reads from site_settings which is RLS-protected to admins only.
-- We need a permissive SELECT for the singleton public row used by the landing page.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'site_settings'
      AND policyname = 'Public can read settings via view'
  ) THEN
    CREATE POLICY "Public can read settings via view"
      ON public.site_settings
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;
