
DO $$
DECLARE
  v_emails text[] := ARRAY['drfernandojardim@gmail.com','ricardojardim17@gmail.com'];
  v_email text;
  v_uid uuid;
  v_password text := 'Estacaorevalida2026*';
BEGIN
  FOREACH v_email IN ARRAY v_emails LOOP
    SELECT id INTO v_uid FROM auth.users WHERE email = v_email;

    IF v_uid IS NULL THEN
      v_uid := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_uid, 'authenticated', 'authenticated', v_email,
        crypt(v_password, gen_salt('bf')),
        now(),
        jsonb_build_object('provider','email','providers',ARRAY['email']),
        jsonb_build_object('full_name', split_part(v_email,'@',1)),
        now(), now(), '', '', '', ''
      );

      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      VALUES (gen_random_uuid(), v_uid,
        jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
        'email', v_uid::text, now(), now(), now());
    ELSE
      UPDATE auth.users
        SET encrypted_password = crypt(v_password, gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            updated_at = now()
        WHERE id = v_uid;
    END IF;

    INSERT INTO public.profiles (id, full_name)
    VALUES (v_uid, split_part(v_email,'@',1))
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'professor'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;
