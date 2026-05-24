-- Re-add the broad SELECT policy so social features (friends list, community, search) keep working
CREATE POLICY "Authenticated can view public profile fields"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- But revoke direct column access to PII from regular roles.
-- Owners still read their own PII via the SECURITY DEFINER RPC get_my_profile().
-- Admins continue to see everything via the "Admins view all profiles" policy because
-- column privileges apply to direct table access; admin tooling uses server functions
-- with the service role key (supabaseAdmin), which bypasses these grants.
REVOKE SELECT (cpf, whatsapp, birth_date) ON public.profiles FROM authenticated, anon;