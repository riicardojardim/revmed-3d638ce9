-- Schema additions
ALTER TABLE public.station_checklist_items
  ADD COLUMN IF NOT EXISTS helper_text TEXT,
  ADD COLUMN IF NOT EXISTS levels JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.custom_stations
  ADD COLUMN IF NOT EXISTS bibliographic_references JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Clear existing data
DELETE FROM public.station_checklist_items;
DELETE FROM public.custom_stations;

-- Seed: PCR / AESP
WITH new_station AS (
  INSERT INTO public.custom_stations (
    created_by, title, specialty, difficulty, duration_minutes,
    clinical_case, candidate_task, patient_info, support_materials,
    patient_script, evaluator_notes, competencies, scoring_criteria,
    expected_conduct, common_mistakes, educational_goal,
    bibliographic_references, published
  ) VALUES (
    '57896dfa-f5e9-4c21-8106-6c716b87e47b',
    'Parada Cardiorrespiratória — AESP',
    'Urgência e Emergência',
    'Difícil',
    10,
    'Paciente de 62 anos, internado por pneumonia, encontrado não responsivo no leito. Monitor mostra ritmo organizado sem pulso palpável.',
    'Conduza o atendimento da PCR conforme o protocolo ACLS (AESP). Olhe para a câmera e verbalize cinco causas reversíveis para o quadro do paciente.',
    'Paciente sem pulso, sem respiração espontânea. Monitor: ritmo sinusal organizado sem pulso (AESP).',
    'Monitor cardíaco, desfibrilador, prancha rígida, AMBU, acesso IV/IO disponível, equipe de enfermagem treinada presente.',
    'Paciente inconsciente, sem responder a estímulos. Ator deve permanecer não responsivo durante toda a estação.',
    'Avalie o uso do protocolo ACLS para AESP, a verbalização correta da técnica de RCP de alta qualidade e a citação das causas reversíveis (Hs e Ts).',
    ARRAY['Conduta','Comunicação']::text[],
    'Pontuação total: 10,0. Cada item possui níveis específicos (Adequado / Parcialmente adequado / Inadequado).',
    'Reconhecer PCR, iniciar RCP imediata, identificar AESP, administrar adrenalina 1 mg IV/IO a cada 3-5 min, manter ciclos de 2 min e investigar Hs e Ts.',
    'Demorar para iniciar compressões; esquecer de checar pulso/respiração; interromper compressões por tempo excessivo; não citar causas reversíveis.',
    'Treinar o algoritmo de ACLS para ritmos não chocáveis (AESP/assistolia) com foco em RCP de qualidade e diagnóstico diferencial das causas reversíveis.',
    '[
      {"label":"Diretriz AHA 2020 — Highlights (Drive)","url":"https://drive.google.com/file/d/1VdtALFZTTRNrnxiejFab6RzG7lE-pnXC/view?usp=drivesdk"},
      {"label":"AHA 2020 ECC Guidelines Highlights (PT)","url":"https://cpr.heart.org/-/media/cpr-files/cpr-guidelines-files/highlights/hghlghts_2020eccguidelines_portuguese.pdf"},
      {"label":"Diretrizes de Ressuscitação Cardiopulmonar e de Emergência Cardiovascular (AHA 2020) - Highlights em Português","url":"https://cpr.heart.org/-/media/cpr-files/cpr-guidelines-files/highlights/hghlghts_2020eccguidelines_portuguese.pdf"},
      {"label":"Protocolo de Suporte Avançado de Vida em Cardiologia (SBC/AMIB)","url":"https://www.amib.org.br"}
    ]'::jsonb,
    true
  ) RETURNING id
)
INSERT INTO public.station_checklist_items (station_id, description, category, points, order_index, helper_text, levels)
SELECT id, d.description, d.category, d.points, d.idx, d.helper, d.levels::jsonb FROM new_station, (VALUES
  (1, 'Apresentação: (1) Identifica-se; e (2) Cumprimenta enfermeiro auxiliar.',
      'Comunicação', 0.2,
      NULL,
      '[{"label":"Inadequado","points":0},{"label":"Adequado","points":0.2}]'),
  (2, 'Verifica responsividade do paciente: (1) Chama o paciente em voz alta; e (2) Realiza estímulo tátil.',
      'Exame físico', 1.0,
      NULL,
      '[{"label":"Inadequado","points":0},{"label":"Parcialmente adequado","points":0.5},{"label":"Adequado","points":1.0}]'),
  (3, 'Verifica pulso e respiração do paciente: (1) Verifica pulso; e (2) Verifica respiração.',
      'Exame físico', 1.0,
      NULL,
      '[{"label":"Inadequado","points":0},{"label":"Adequado","points":1.0}]'),
  (4, 'Solicita: (1) Ajuda da equipe treinada; e (2) Preparação do desfibrilador.',
      'Conduta', 1.1,
      NULL,
      '[{"label":"Inadequado","points":0},{"label":"Parcialmente adequado","points":0.5},{"label":"Adequado","points":1.1}]'),
  (5, 'Explica corretamente a técnica de massagem cardíaca: (1) Posicionamento da prancha de reanimação (rígida) sob o tórax do paciente; (2) Mãos sobrepostas e dedos entrelaçados; (3) Membros superiores esticados; (4) Base da mão sobre o esterno; (5) Compressão de ao menos 5 cm; (6) Frequência de 100 a 120 compressões por minuto; (7) Permite o retorno completo do tórax em cada compressão; (8) Interrupções mínimas das compressões.',
      'Conduta', 1.5,
      'O paciente deve estar em decúbito dorsal horizontal (deitado de barriga para cima), sobre uma superfície rígida e plana. Em um hospital, isso geralmente significa que a prancha de reanimação (prancha rígida) deve ser colocada sob o paciente na cama hospitalar. Essa prancha é fundamental para que as compressões não sejam absorvidas pelo colchão.',
      '[{"label":"Inadequado","points":0},{"label":"Parcialmente adequado","points":0.75},{"label":"Adequado","points":1.5}]'),
  (6, 'Explica corretamente a técnica de ventilação com ambu: (1) Posição da cabeça em leve extensão (posição olfativa) ou manter via aérea pérvia; (2) Máscara bem posicionada no rosto da vítima; (3) Técnica em C e E dos dedos; (4) Realizar 2 ventilações a cada 30 compressões; (5) Evitar ventilações excessivas (volume 500-600 mL, visível expansão torácica).',
      'Conduta', 1.5,
      'Via aérea: hiperextensão cabeça (sniffing) ou jaw-thrust se trauma. Ambu: selo máscara com C-E, ventilação lenta (1s), volume tidal 6-7 mL/kg (~500-600 mL), evitar hiperventilação (causa hipercapnia). Razão 30:2 sem IA avançado; confirme expansão torácica.',
      '[{"label":"Inadequado","points":0},{"label":"Parcialmente adequado","points":0.75},{"label":"Adequado","points":1.5}]'),
  (7, 'Interpreta o ritmo do impresso como Atividade Elétrica Sem Pulso (AESP).',
      'Diagnóstico', 1.1,
      'AESP (PEA): atividade elétrica organizada sem pulso palpável. Ritmos: sinusal/assistolia com QRS sem perfusão.',
      '[{"label":"Inadequado","points":0},{"label":"Adequado","points":1.1}]'),
  (8, 'Após identificação do ritmo (AESP), indica: (1) Retorno/contínua das compressões torácicas; (2) Acesso intravenoso (IV) ou intraósseo (IO); (3) Adrenalina/Epinefrina 1 mg IV/IO a cada 3-5 min.',
      'Conduta', 1.5,
      'AESP: RCP ininterrupta (minimizar pausas), epinefrina 1 mg IV/IO ciclo 1 (repetir 3-5 min), via IV periférica/IO proximal. Alternativa: IO se IV difícil. Ciclos: ritmo a cada 2 min, choque se FV/TV.',
      '[{"label":"Inadequado","points":0},{"label":"Parcialmente adequado","points":0.75},{"label":"Adequado","points":1.5}]'),
  (9, 'Responde a dúvida do chefe de plantão, informando possíveis causas reversíveis (Hs e Ts): (1) Hipovolemia; (2) Hipóxia; (3) Hidrogênio (acidose); (4) Hipoglicemia; (5) Hipocalemia/hipercalemia; (6) Hipotermia; (7) Tensão pneumotórax; (8) Tamponamento cardíaco; (9) Toxinas; (10) Trombose pulmonar; (11) Trombose coronariana (IAM).',
      'Diagnóstico', 1.1,
      'Hs e Ts (ACLS): 4Hs (Hipovolemia, Hipóxia, Hidrogênio/acidose, Hipoglicemia/Hipo/hiperK/Hipotermia) + 5Ts. Prova: Verbalize mnemônico ''Hs e Ts'' + liste; priorize reversíveis no paciente (ex.: hipoglicemia em diabética).',
      '[{"label":"Inadequado","points":0},{"label":"Parcialmente adequado","points":0.5},{"label":"Adequado","points":1.1}]')
) AS d(idx, description, category, points, helper, levels);