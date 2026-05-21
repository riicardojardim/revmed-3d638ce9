
DO $$
DECLARE
  v_user_id uuid := 'd3e0a3a3-de70-4000-8000-000000000001';
  v_attempt RECORD;
  v_room_id uuid;
  v_code text;
  v_checks jsonb;
  v_comments jsonb;
  v_item RECORD;
  v_max_pts numeric;
  v_choice numeric;
  v_total numeric;
  v_max_total numeric;
  v_status text;
  v_i int := 0;
  v_comments_pool text[] := ARRAY[
    'Excelente abordagem — empatia e clareza muito acima da média.',
    'Conduta correta, mas pode explorar melhor a anamnese inicial.',
    'Diagnóstico bem fundamentado. Atenção à dose do medicamento.',
    'Boa comunicação. Reforçar orientação de retorno.',
    'Faltou solicitar o exame complementar essencial.',
    'Ótima sequência de raciocínio clínico.',
    'Conduta adequada conforme protocolo do Ministério da Saúde.'
  ];
  v_final_feedbacks text[] := ARRAY[
    'Desempenho consistente. Continue assim — a estação ficou bem encaminhada do início ao fim.',
    'Muito boa estação. Reforce a explicação do plano terapêutico ao paciente.',
    'Aprovado com folga. Pontos fortes: empatia, raciocínio clínico e plano de cuidados.',
    'Estação concluída no tempo. Atenção apenas ao detalhamento da prescrição.',
    'Excelente performance — pronto para a prova.'
  ];
BEGIN
  -- Limpa rooms/evals antigos do demo
  DELETE FROM public.room_evaluations WHERE evaluator_id = v_user_id OR candidate_id = v_user_id;
  DELETE FROM public.training_rooms WHERE host_id = v_user_id;

  -- Atualiza attempts com anotações e cria room/evaluation para cada
  FOR v_attempt IN SELECT * FROM public.attempts WHERE user_id = v_user_id ORDER BY created_at LOOP
    v_i := v_i + 1;
    v_code := 'DEMO' || lpad(v_i::text, 3, '0');

    INSERT INTO public.training_rooms (code, host_id, station_id, station_title, status, mode, duration_minutes, started_at, finished_at, evaluated_candidate_id)
    VALUES (v_code, v_user_id, v_attempt.station_id, v_attempt.station_title, 'finished', 'solo', 10,
            v_attempt.created_at, v_attempt.created_at + interval '10 minutes', v_user_id)
    RETURNING id INTO v_room_id;

    -- Constrói checks e comentários a partir dos itens reais do checklist
    v_checks := '{}'::jsonb;
    v_comments := '{}'::jsonb;
    v_total := 0;
    v_max_total := 0;

    FOR v_item IN
      SELECT id, points, COALESCE(levels, '[]'::jsonb) AS levels
      FROM public.station_checklist_items
      WHERE station_id = v_attempt.station_id::uuid
      ORDER BY order_index
    LOOP
      -- Determina max points: maior valor entre levels.points (se houver) ou points do item
      SELECT COALESCE(MAX((lvl->>'points')::numeric), v_item.points)
        INTO v_max_pts
      FROM jsonb_array_elements(CASE WHEN jsonb_array_length(v_item.levels) > 0 THEN v_item.levels ELSE '[]'::jsonb END) lvl;

      IF v_max_pts IS NULL OR v_max_pts = 0 THEN v_max_pts := v_item.points; END IF;
      IF v_max_pts IS NULL THEN v_max_pts := 1; END IF;

      -- 70% adequado (max), 20% parcial (metade), 10% inadequado (0)
      v_choice := CASE
        WHEN (random() < 0.70) THEN v_max_pts
        WHEN (random() < 0.66) THEN round(v_max_pts/2.0, 2)
        ELSE 0
      END;

      v_checks := v_checks || jsonb_build_object(v_item.id::text, v_choice);

      IF random() < 0.45 THEN
        v_comments := v_comments || jsonb_build_object(
          v_item.id::text,
          v_comments_pool[1 + (floor(random() * array_length(v_comments_pool,1)))::int]
        );
      END IF;

      v_total := v_total + v_choice;
      v_max_total := v_max_total + v_max_pts;
    END LOOP;

    -- Nota final (0-10)
    IF v_max_total > 0 THEN
      v_choice := round((v_total / v_max_total) * 10, 2);
    ELSE
      v_choice := v_attempt.score;
    END IF;

    v_status := CASE WHEN v_choice >= 6 THEN 'aprovado' WHEN v_choice >= 5 THEN 'repeticao' ELSE 'reprovado' END;

    INSERT INTO public.room_evaluations (
      room_id, evaluator_id, candidate_id, station_id,
      checks, item_comments, final_feedback, final_score, status,
      submitted_at, preview_for_candidate
    ) VALUES (
      v_room_id, v_user_id, v_user_id, v_attempt.station_id,
      v_checks, v_comments,
      v_final_feedbacks[1 + (floor(random() * array_length(v_final_feedbacks,1)))::int],
      v_choice, v_status,
      v_attempt.created_at + interval '11 minutes', true
    );

    -- Atualiza attempt para apontar para a sala e ter notas/feedback
    UPDATE public.attempts
       SET room_id = v_room_id,
           reviewed_at = v_attempt.created_at + interval '12 minutes',
           reviewed_by = v_user_id,
           professor_score = v_choice,
           professor_feedback = v_final_feedbacks[1 + (floor(random() * array_length(v_final_feedbacks,1)))::int],
           notes = CASE WHEN v_i % 2 = 0
                        THEN 'Pontos a revisar: dose de antibiótico e critérios de internação. Revisar resumo da especialidade.'
                        ELSE NULL END
     WHERE id = v_attempt.id;
  END LOOP;
END $$;
