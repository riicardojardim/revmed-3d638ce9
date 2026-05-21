
DO $$
DECLARE
  v_user_id uuid := 'd3e0a3a3-de70-4000-8000-000000000001';
  v_plan_completo uuid;
  v_sid uuid;
  v_idx int := 0;
  v_scores numeric[] := ARRAY[9.2, 8.5, 9.7, 7.8, 8.9, 9.5, 8.1, 9.0, 7.5, 8.8, 9.3, 8.4];
BEGIN
  SELECT id INTO v_plan_completo FROM public.plans WHERE slug = 'completo' LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated', 'authenticated',
      'demo@estacaorevalida.com',
      crypt('DemoRevalida2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Dra. Demo Revalida"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'demo@estacaorevalida.com', 'email_verified', true),
      'email', v_user_id::text, now(), now(), now()
    );
  END IF;

  INSERT INTO public.profiles (id, full_name, first_name, last_name, whatsapp, exam_year, title, gender, username)
  VALUES (v_user_id, 'Dra. Demo Revalida', 'Demo', 'Revalida', '11999990000', '2026', 'Dra.', 'feminino', 'demo')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, title = EXCLUDED.title;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'aluno')
  ON CONFLICT DO NOTHING;

  IF v_plan_completo IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (user_id, plan_id, status, current_period_end)
    VALUES (v_user_id, v_plan_completo, 'active', now() + interval '365 days')
    ON CONFLICT (user_id) DO UPDATE SET plan_id = EXCLUDED.plan_id, status = 'active', current_period_end = EXCLUDED.current_period_end;
  END IF;

  DELETE FROM public.attempts WHERE user_id = v_user_id;

  FOR v_sid IN SELECT id FROM public.custom_stations WHERE published = true ORDER BY created_at LIMIT 12 LOOP
    v_idx := v_idx + 1;
    INSERT INTO public.attempts (
      user_id, station_id, station_title, specialty, score, earned, total_points,
      used_seconds, checked_items, status, created_at
    )
    SELECT
      v_user_id, s.id::text, s.title, s.specialty,
      v_scores[((v_idx - 1) % array_length(v_scores,1)) + 1],
      (v_scores[((v_idx - 1) % array_length(v_scores,1)) + 1] * 10)::int,
      100,
      540 + (v_idx * 17) % 180,
      '{}'::text[],
      'concluida',
      now() - (v_idx || ' days')::interval
    FROM public.custom_stations s WHERE s.id = v_sid;
  END LOOP;

  INSERT INTO public.flashcard_reviews (user_id, card_id, ease, interval_days, reviews_count, last_quality, total_time_seconds, last_time_seconds, next_review_at, updated_at)
  SELECT v_user_id, fc.id, 2.6, 7, 3, 5, 45, 12, now() + interval '3 days', now()
  FROM public.flashcards fc WHERE fc.published = true
  ORDER BY fc.created_at LIMIT 20
  ON CONFLICT DO NOTHING;
END $$;
