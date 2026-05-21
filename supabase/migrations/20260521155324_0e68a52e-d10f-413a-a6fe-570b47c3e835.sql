INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE u.email = 'anoar_jezini@hotmail.com'
ON CONFLICT (user_id, role) DO NOTHING;