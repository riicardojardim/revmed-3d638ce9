UPDATE auth.users SET email = 'anoar_jezini@hotmail.com', raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('email','anoar_jezini@hotmail.com'), email_confirmed_at = COALESCE(email_confirmed_at, now()), updated_at = now() WHERE id = '342727f5-3327-4383-8182-6aa33bf9558f';

UPDATE auth.identities SET identity_data = COALESCE(identity_data, '{}'::jsonb) || jsonb_build_object('email','anoar_jezini@hotmail.com'), updated_at = now() WHERE user_id = '342727f5-3327-4383-8182-6aa33bf9558f';

INSERT INTO public.user_roles (user_id, role) VALUES ('342727f5-3327-4383-8182-6aa33bf9558f', 'admin') ON CONFLICT (user_id, role) DO NOTHING;