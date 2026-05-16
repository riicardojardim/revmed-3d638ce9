// Mock data for demo. TODO: replace with Supabase backend.
export type Specialty =
  | "Clínica Médica"
  | "Pediatria"
  | "Ginecologia e Obstetrícia"
  | "Cirurgia"
  | "Medicina da Família"
  | "Urgência e Emergência";

export type Difficulty = "Fácil" | "Médio" | "Difícil";

export interface ChecklistLevel {
  label: string;        // "Adequado" | "Parcialmente adequado" | "Inadequado"
  points: number;       // value awarded for this level
  description?: string; // descriptive criterion (e.g. "Realiza as duas ações.")
}

export interface ChecklistItem {
  id: string;
  category: "Anamnese" | "Exame físico" | "Diagnóstico" | "Conduta" | "Comunicação";
  description: string;
  points: number;            // max value (used for totals)
  levels?: ChecklistLevel[]; // optional: graded scoring (Adequado/Parcial/Inadequado)
  helperText?: string;       // optional grey hint under item
}

export interface PatientProfile {
  name?: string;
  age?: string;
  sex?: string;
  profession?: string;
  chiefComplaint?: string;
  hpi?: string;
  personalHistory?: string;
  medications?: string;
  allergies?: string;
  familyHistory?: string;
  habits?: string;
  symptoms?: string;
  vitals?: string;
  previousExams?: string;
  spontaneous?: string;
  onlyIfAsked?: string;
  doNotReveal?: string;
  emotionalTone?: string;
  actingTips?: string;
}

export interface DeliverableMaterial {
  id: string;
  name: string;
  type: string;
  description?: string;
  content: string;
  autoDeliver?: boolean;
}

export interface Station {
  id: string;
  slug: string;
  title: string;
  specialty: Specialty;
  difficulty: Difficulty;
  durationMinutes: number;
  tag?: "Nova" | "Popular" | "Recomendada";
  clinicalCase: string;
  candidateTask: string;
  patientInfo: string;
  supportMaterials: string;
  checklist: ChecklistItem[];
  patientProfile?: PatientProfile;
  deliverableMaterials?: DeliverableMaterial[];
  educationalGoal?: string;
  expectedConduct?: string;
  commonMistakes?: string;
  references?: { label: string; url?: string }[];
}

const cl = (items: Omit<ChecklistItem, "id">[]): ChecklistItem[] =>
  items.map((it, i) => ({ ...it, id: `c${i}` }));

export const STATIONS: Station[] = [
  {
    id: "1",
    slug: "dor-toracica-emergencia",
    title: "Dor torácica na emergência",
    specialty: "Urgência e Emergência",
    difficulty: "Difícil",
    durationMinutes: 10,
    tag: "Popular",
    clinicalCase:
      "Homem, 58 anos, chega à emergência com dor torácica retroesternal opressiva iniciada há 40 minutos, com irradiação para braço esquerdo, sudorese e náuseas. Hipertenso, tabagista.",
    candidateTask:
      "Realize anamnese dirigida, solicite os exames iniciais pertinentes e proponha conduta imediata em até 10 minutos.",
    patientInfo: "PA 160x100 mmHg · FC 102 bpm · SpO₂ 95% · afebril.",
    supportMaterials: "ECG disponível mediante solicitação · acesso a kit de emergência.",
    educationalGoal: "Avaliar abordagem inicial de síndrome coronariana aguda em emergência.",
    expectedConduct: "MOVE, ECG em 10 min, AAS 200–300 mg, dor controlada, ativação do protocolo de SCA.",
    commonMistakes: "Demora para solicitar ECG, esquecer AAS, não estratificar risco antes da alta.",
    patientProfile: {
      name: "Sr. João Almeida",
      age: "58 anos",
      sex: "Masculino",
      profession: "Motorista de aplicativo",
      chiefComplaint: "Dor forte no peito há cerca de 40 minutos.",
      hpi: "Dor em aperto começou em repouso, irradia para o braço esquerdo, acompanhada de sudorese e enjoo. Não melhorou com repouso.",
      personalHistory: "Hipertensão há 10 anos. Nega diabetes.",
      medications: "Losartana 50 mg, uso irregular.",
      allergies: "Nega.",
      familyHistory: "Pai falleceu de infarto aos 60 anos.",
      habits: "Tabagista 20 maços-ano, sedentário, etilismo social.",
      symptoms: "Dor 8/10, sudorese fria, leve falta de ar.",
      vitals: "PA 160x100 · FC 102 · SpO₂ 95%.",
      spontaneous: "Diga que a dor é forte e que está com medo. Leve a mão ao peito.",
      onlyIfAsked: "Revele tabagismo, irregularidade do remédio e história familiar APENAS se perguntado diretamente.",
      doNotReveal: "Não diga o diagnóstico. Não cite 'infarto' a menos que o candidato pergunte se você já teve.",
      emotionalTone: "Ansioso, com medo, fala curta entre suspiros.",
      actingTips: "Coloque a mão no peito ao falar. Aceite oxigênio e medicações sem resistir.",
    },
    deliverableMaterials: [
      {
        id: "m1",
        name: "ECG de 12 derivações",
        type: "Exame de imagem",
        description: "Entregue após o candidato solicitar ECG.",
        content: "ECG: ritmo sinusal, FC 102. Supradesnivelamento do segmento ST de 2 mm em DII, DIII e aVF. Compatível com IAM de parede inferior.",
      },
      {
        id: "m2",
        name: "Troponina e marcadores",
        type: "Exame laboratorial",
        description: "Entregue após solicitação de marcadores.",
        content: "Troponina I: 1,8 ng/mL (referência <0,04). CK-MB elevada.",
      },
      {
        id: "m3",
        name: "Folha de sinais vitais",
        type: "Impresso clínico",
        description: "Pode ser entregue ao longo da estação.",
        content: "PA 160x100 → 150x95 após nitrato. FC 102 → 96. SpO₂ 95% em ar ambiente.",
        autoDeliver: true,
      },
    ],
    checklist: cl([
      { category: "Anamnese", description: "Caracteriza dor (início, qualidade, irradiação, fatores de melhora/piora)", points: 2 },
      { category: "Anamnese", description: "Investiga fatores de risco cardiovasculares", points: 1 },
      { category: "Exame físico", description: "Verifica sinais vitais e ausculta cardiopulmonar", points: 2 },
      { category: "Diagnóstico", description: "Solicita ECG de 12 derivações em até 10 min", points: 3 },
      { category: "Diagnóstico", description: "Solicita troponina e demais marcadores", points: 2 },
      { category: "Conduta", description: "Administra AAS 200–300 mg VO", points: 2 },
      { category: "Conduta", description: "Considera nitrato, morfina e oxigenoterapia se indicados", points: 2 },
      { category: "Conduta", description: "Aciona protocolo de dor torácica e reperfusão se SCA", points: 3 },
      { category: "Comunicação", description: "Explica suspeita diagnóstica e plano ao paciente", points: 1 },
    ]),
  },
  {
    id: "2",
    slug: "pre-natal-baixo-risco",
    title: "Pré-natal de baixo risco",
    specialty: "Ginecologia e Obstetrícia",
    difficulty: "Médio",
    durationMinutes: 10,
    tag: "Recomendada",
    clinicalCase:
      "Gestante de 28 anos, IG 12 semanas pela DUM, primigesta, comparece à UBS para primeira consulta de pré-natal.",
    candidateTask: "Conduza a primeira consulta de pré-natal, solicitando os exames iniciais.",
    patientInfo: "Sem comorbidades. Vacinação atualizada exceto dTpa.",
    supportMaterials: "Caderneta da gestante.",
    educationalGoal: "Avaliar abordagem da 1ª consulta de pré-natal de baixo risco.",
    patientProfile: {
      name: "Sra. Marina Costa",
      age: "28 anos",
      sex: "Feminino",
      profession: "Professora",
      chiefComplaint: "Quero começar o pré-natal.",
      hpi: "DUM há 12 semanas, gestação planejada.",
      personalHistory: "Sem comorbidades.",
      emotionalTone: "Calma, animada, faz perguntas sobre dieta e exercícios.",
      spontaneous: "Conte que é a primeira gestação e que está animada.",
      onlyIfAsked: "Vacinação atrasada para dTpa apenas se perguntado.",
    },
    deliverableMaterials: [
      {
        id: "m1",
        name: "Caderneta da gestante",
        type: "Impresso clínico",
        content: "Caderneta em branco, sem registros. Última menstruação anotada.",
        autoDeliver: true,
      },
    ],
    checklist: cl([
      { category: "Anamnese", description: "Calcula IG e DPP", points: 2 },
      { category: "Anamnese", description: "Investiga antecedentes obstétricos e familiares", points: 1 },
      { category: "Exame físico", description: "Aferição de PA, peso e cálculo de IMC", points: 1 },
      { category: "Diagnóstico", description: "Solicita exames laboratoriais de 1º trimestre", points: 3 },
      { category: "Conduta", description: "Prescreve ácido fólico e sulfato ferroso conforme protocolo", points: 2 },
      { category: "Conduta", description: "Orienta vacinação (dTpa, hepatite B, influenza)", points: 2 },
      { category: "Comunicação", description: "Orienta sinais de alarme da gestação", points: 2 },
    ]),
  },
  {
    id: "3",
    slug: "febre-em-crianca",
    title: "Febre em criança",
    specialty: "Pediatria",
    difficulty: "Médio",
    durationMinutes: 10,
    tag: "Nova",
    clinicalCase: "Mãe traz criança de 2 anos com febre de 38,9°C há 48h, irritada, com diminuição do apetite.",
    candidateTask: "Realize avaliação clínica e oriente a mãe.",
    patientInfo: "Calendário vacinal em dia. Sem comorbidades.",
    supportMaterials: "Termômetro e otoscópio disponíveis.",
    patientProfile: {
      name: "Mãe da criança (Sra. Ana)",
      age: "Criança 2 anos",
      sex: "Feminino (criança)",
      chiefComplaint: "Minha filha está com febre alta há 2 dias.",
      emotionalTone: "Preocupada, ansiosa.",
      spontaneous: "Diga que a criança está irritada e comendo pouco.",
      onlyIfAsked: "Não houve vômito, diarreia nem tosse — só fale se perguntado.",
    },
    deliverableMaterials: [
      {
        id: "m1",
        name: "Caderneta da criança",
        type: "Impresso clínico",
        content: "Vacinação em dia. Peso 12,5 kg.",
        autoDeliver: true,
      },
    ],
    checklist: cl([
      { category: "Anamnese", description: "Caracteriza febre e sintomas associados", points: 2 },
      { category: "Exame físico", description: "Pesquisa sinais de gravidade e foco infeccioso", points: 3 },
      { category: "Diagnóstico", description: "Hipóteses diagnósticas pertinentes à idade", points: 2 },
      { category: "Conduta", description: "Antitérmico em dose correta por peso", points: 2 },
      { category: "Comunicação", description: "Orienta sinais de alarme para retorno", points: 2 },
    ]),
  },
  {
    id: "4",
    slug: "hipertensao-descompensada",
    title: "Hipertensão descompensada",
    specialty: "Clínica Médica",
    difficulty: "Médio",
    durationMinutes: 10,
    clinicalCase: "Paciente de 62 anos, hipertenso, com PA 200x120 mmHg em consulta de rotina, assintomático.",
    candidateTask: "Avalie, classifique e conduza o caso.",
    patientInfo: "Uso irregular de losartana.",
    supportMaterials: "—",
    checklist: cl([
      { category: "Anamnese", description: "Investiga adesão e fatores desencadeantes", points: 2 },
      { category: "Exame físico", description: "Procura sinais de lesão de órgão-alvo", points: 2 },
      { category: "Diagnóstico", description: "Diferencia urgência de emergência hipertensiva", points: 3 },
      { category: "Conduta", description: "Plano terapêutico adequado e acompanhamento", points: 3 },
    ]),
  },
  {
    id: "5",
    slug: "dor-abdominal-aguda",
    title: "Dor abdominal aguda",
    specialty: "Cirurgia",
    difficulty: "Difícil",
    durationMinutes: 10,
    clinicalCase: "Homem, 35 anos, dor em FID há 12 horas, anorexia e febre baixa.",
    candidateTask: "Conduza a avaliação inicial e proponha conduta.",
    patientInfo: "T 37,8°C · FC 96 bpm.",
    supportMaterials: "Acesso a exames laboratoriais e imagem.",
    checklist: cl([
      { category: "Anamnese", description: "Caracteriza dor (Blumberg, migração)", points: 2 },
      { category: "Exame físico", description: "Examina abdome com manobras específicas", points: 3 },
      { category: "Diagnóstico", description: "Solicita exames apropriados", points: 2 },
      { category: "Conduta", description: "Aciona avaliação cirúrgica", points: 3 },
    ]),
  },
  {
    id: "7",
    slug: "pcr-aesp-suporte-avancado",
    title: "PCR em AESP — Suporte Avançado de Vida",
    specialty: "Urgência e Emergência",
    difficulty: "Difícil",
    durationMinutes: 10,
    tag: "Nova",
    clinicalCase:
      "Paciente em parada cardiorrespiratória no setor de emergência. Monitor mostra atividade elétrica sem pulso (AESP).",
    candidateTask:
      "Conduza o atendimento da PCR seguindo o protocolo ACLS: avaliação inicial, RCP de alta qualidade, identificação do ritmo e tratamento das causas reversíveis.",
    patientInfo: "Paciente inconsciente, sem pulso central palpável. Monitor: AESP.",
    supportMaterials: "Carro de parada, desfibrilador, ambu, prancha rígida, equipe treinada.",
    checklist: cl([
      {
        category: "Comunicação",
        description:
          "1. Apresentação:\n(1) Identifica-se; e\n(2) Cumprimenta enfermeiro auxiliar.",
        points: 0.2,
        levels: [
          { label: "Inadequado: Não realiza.", points: 0 },
          { label: "Adequado: Realiza as duas ações.", points: 0.2 },
        ],
      },
      {
        category: "Exame físico",
        description:
          "2. Verifica responsividade do paciente:\n(1) Chama o paciente em voz alta; e\n(2) Realiza estímulo tátil.",
        points: 1.0,
        levels: [
          { label: "Inadequado: Não verbaliza nenhuma ação.", points: 0 },
          { label: "Parcialmente adequado: Verbaliza apenas uma ação.", points: 0.5 },
          { label: "Adequado: Verbaliza as duas ações.", points: 1.0 },
        ],
      },
      {
        category: "Exame físico",
        description:
          "3. Verifica pulso e respiração do paciente:\n(1) Verifica pulso; e\n(2) Verifica respiração.",
        points: 1.0,
        levels: [
          { label: "Inadequado: Realiza uma ou nenhuma ação.", points: 0 },
          { label: "Adequado: Realiza as duas ações.", points: 1.0 },
        ],
      },
      {
        category: "Conduta",
        description:
          "4. Solicita:\n(1) Ajuda da equipe treinada; e\n(2) Preparação do desfibrilador.",
        points: 1.1,
        levels: [
          { label: "Inadequado: Não verbaliza nenhuma ação.", points: 0 },
          { label: "Parcialmente adequado: Verbaliza apenas uma ação.", points: 0.5 },
          { label: "Adequado: Verbaliza duas ações.", points: 1.1 },
        ],
      },
      {
        category: "Conduta",
        description:
          "5. Explica corretamente a técnica de massagem cardíaca:\n(1) Posicionamento da prancha de reanimação (rígida) sob o tórax do paciente;\n(2) Mãos sobrepostas e dedos entrelaçados;\n(3) Membros superiores esticados;\n(4) Base da mão sobre o esterno;\n(5) Compressão de ao menos 5 cm;\n(6) Frequência de 100 a 120 compressões por minuto;\n(7) Permite o retorno completo do tórax em cada compressão;\n(8) Interrupções mínimas das compressões.",
        points: 1.5,
        helperText:
          "O paciente deve estar em decúbito dorsal horizontal (deitado de barriga para cima), sobre uma superfície rígida e plana. Em um hospital, isso geralmente significa que a prancha de reanimação (prancha rígida) deve ser colocada sob o paciente na cama hospitalar. Essa prancha é fundamental para que as compressões não sejam absorvidas pelo colchão.",
        levels: [
          { label: "Inadequado: Verbaliza duas ou menos ações.", points: 0 },
          { label: "Parcialmente adequado: Verbaliza de três a cinco ações.", points: 0.75 },
          { label: "Adequado: Verbaliza de seis a oito ações.", points: 1.5 },
        ],
      },
      {
        category: "Conduta",
        description:
          "6. Explica corretamente a técnica de ventilação com ambu:\n(1) Posição da cabeça em leve extensão (posição olfativa) ou manter via aérea pérvia;\n(2) Máscara bem posicionada no rosto da vítima;\n(3) Técnica em C e E dos dedos;\n(4) Realizar 2 ventilações a cada 30 compressões;\n(5) Evitar ventilações excessivas (volume 500-600 mL, visível expansão torácica).",
        points: 1.5,
        helperText:
          "Via aérea: hiperextensão cabeça (sniffing) ou jaw-thrust se trauma. Ambu: selo máscara com C-E, ventilação lenta (1s), volume tidal 6-7 mL/kg (~500-600 mL), evitar hiperventilação (causa hipercapnia). Razão 30:2 sem IA avançado; confirme expansão torácica.",
        levels: [
          { label: "Inadequado: Verbaliza duas ou menos ações.", points: 0 },
          { label: "Parcialmente adequado: Verbaliza três ações.", points: 0.75 },
          { label: "Adequado: Verbaliza quatro a cinco ações.", points: 1.5 },
        ],
      },
      {
        category: "Diagnóstico",
        description:
          "7. Interpreta o ritmo do impresso como Atividade Elétrica Sem Pulso (AESP).",
        points: 1.1,
        helperText:
          "AESP (PEA): atividade elétrica organizada sem pulso palpável. Ritmos: sinusal/assistolia com QRS sem perfusão.",
        levels: [
          { label: "Inadequado: Não interpreta ou erra.", points: 0 },
          { label: "Adequado: Interpreta corretamente.", points: 1.1 },
        ],
      },
      {
        category: "Conduta",
        description:
          "8. Após identificação do ritmo (AESP), indica:\n(1) Retorno/continua das compressões torácicas;\n(2) Acesso intravenoso (IV) ou intraósseo (IO);\n(3) Adrenalina/Epinefrina 1 mg IV/IO a cada 3-5 min.",
        points: 1.5,
        helperText:
          "AESP: RCP ininterrupta (minimizar pausas), epinefrina 1 mg IV/IO ciclo 1 (repetir 3-5 min), via IV periférica/IO proximal. Alternativa: IO se IV difícil. Ciclos: ritmo a cada 2 min, choque se FV/TV.",
        levels: [
          { label: "Inadequado: Indica uma ou nenhuma ação.", points: 0 },
          { label: "Parcialmente adequado: Indica duas ações.", points: 0.75 },
          { label: "Adequado: Indica três ações.", points: 1.5 },
        ],
      },
      {
        category: "Diagnóstico",
        description:
          "9. Responde a dúvida do chefe de plantão, informando possíveis causas reversíveis (Hs e Ts):\n(1) Hipovolemia;\n(2) Hipóxia;\n(3) Hidrogênio (acidose);\n(4) Hipoglicemia;\n(5) Hipocalemia/hipercalemia;\n(6) Hipotermia;\n(7) Tensão pneumotórax;\n(8) Tamponamento cardíaco;\n(9) Toxinas;\n(10) Trombose pulmonar;\n(11) Trombose coronariana (IAM).",
        points: 1.1,
        helperText:
          "Hs e Ts (ACLS): 4Hs (Hipovolemia, Hipóxia, Hidrogênio/acidose, Hipoglicemia/Hipo/hiperK/Hipotermia) + 5Ts. Prova: Verbalize mnemônico 'Hs e Ts' + liste; priorize reversíveis no paciente (ex.: hipoglicemia em diabética).",
        levels: [
          { label: "Inadequado: Verbaliza uma ou menos.", points: 0 },
          { label: "Parcialmente adequado: Verbaliza duas ou três causas.", points: 0.5 },
          { label: "Adequado: Verbaliza quatro ou mais causas.", points: 1.1 },
        ],
      },
    ]),
    references: [
      {
        label: "Diretrizes de Ressuscitação Cardiopulmonar e de Emergência Cardiovascular (AHA 2020) - Highlights em Português",
        url: "https://cpr.heart.org/-/media/cpr-files/cpr-guidelines-files/highlights/hghlghts_2020eccguidelines_portuguese.pdf",
      },
      {
        label: "Protocolo de Suporte Avançado de Vida em Cardiologia (SBC/AMIB)",
        url: "https://departamentos.cardiol.br/sbc-deic/wp-content/uploads/2021/01/Protocolo-SAVC-SBC-AMIB-2020.pdf",
      },
      {
        label: "Material complementar (Google Drive)",
        url: "https://drive.google.com/file/d/1VdtALFZTTRNrnxiejFab6RzG7lE-pnXC/view?usp=drivesdk",
      },
    ],
  },
  {
    id: "8",
    slug: "acidente-por-aranha",
    title: "Acidente Por Aranha",
    specialty: "Clínica Médica",
    difficulty: "Difícil",
    durationMinutes: 10,
    tag: "Nova",
    clinicalCase:
      "Nível de atenção: Unidade de atenção terciária à saúde.\nTipo de atendimento: Urgência e Emergência.\n\nA unidade apresenta a seguinte infraestrutura:\n- Consultórios de atenção médica;\n- Enfermaria;\n- Laboratório de análises clínicas;\n- Serviço de radiologia convencional e tomografia computadorizada;\n- Centro cirúrgico.\n\nDescrição do caso:\nVocê é médico(a) plantonista em um pronto-socorro de um hospital de terceiro nível e recebe para atendimento um homem que refere ter sido picado por uma aranha enquanto limpava o quintal da sua casa.",
    candidateTask:
      "Nos 10 min. minutos de duração da estação, você deverá executar as seguintes tarefas:\n\n- Realizar anamnese direcionada à queixa principal do paciente;\n- Solicitar e interpretar o exame físico;\n- Identificar e verbalizar corretamente o gênero da aranha mostrada pelo paciente;\n- Solicitar exames complementares, se necessário;\n- Propor conduta terapêutica adequada;\n- Realizar orientações sobre prevenção de acidentes por animais peçonhentos.",
    patientInfo: "Miguel, 40 anos, mecânico. PA 170x100 mmHg · FC 115 bpm · SpO₂ 99% · T 36,3°C · FR 16 ipm.",
    supportMaterials: "Impressos disponíveis: Exame físico, Laboratório, Imagem da aranha.",
    patientProfile: {
      name: "Miguel",
      age: "40 anos",
      sex: "Masculino",
      profession: "Mecânico",
      chiefComplaint: "Estava limpando o quintal da minha casa e uma aranha me picou.",
      hpi: "Tempo de evolução: Já tem umas duas horas.\nLocal: Foi na mão direita.\nDor: Sim, começou logo depois da picada.\nIntensidade: Muito forte (8/10).\nIrradiação: Não.\nTipo de dor: Queimação.",
      symptoms:
        "Vômitos: Vomitei umas 6 vezes já, não paro de vomitar.\nAlterações visuais: Minha visão está embaçada.\nExcesso de salivação/sialorreia: Sim, estou até babando.\nOutros sintomas: Nega.\nPriapismo: Sim.\nAstenia: Dr., eu me sinto muito fraco.",
      personalHistory: "Doenças: Não tenho nenhuma doença.\nCartão de vacina: Atualizado.",
      medications: "Não uso nenhuma medicação.",
      allergies: "Que eu saiba, não.",
      habits:
        "Álcool: Cerveja de vez em quando.\nCigarro: Não fumo.\nDrogas: Não uso nenhuma droga.\nAlteração na urina: Minha urina está normal, eu acho.",
      onlyIfAsked: "Se perguntado por limpeza ou antissepsia do local: responder que não.",
    },
    deliverableMaterials: [
      {
        id: "m1",
        name: "Impresso 1 ( Exame físico )",
        type: "Exame físico",
        description: "Entregue após solicitação do exame físico.",
        content:
          "Sinais vitais:\n- Pressão arterial: 170 x 100 mmHg\n- Frequência cardíaca: 115 batimentos por minuto\n- Saturação de O2: 99% em AA\n- Temperatura axilar: 36,3°C\n- Frequência respiratória: 16 incursões por minuto\n\nEstado geral:\nPaciente se encontra agitado e em mau estado geral. Afebril, acianótico, pálido, sudorese profusa, anictérico, hidratado, alerta, orientado no tempo e espaço.\n\nNeurológico:\nSem alterações.\n\nExame da mão:\nSe constatam sinais discretos de inflamação e 2 pontos de inoculação.",
      },
      {
        id: "m2",
        name: "Impresso 2 ( Laboratório )",
        type: "Exame laboratorial",
        description: "Entregue após solicitação de exames laboratoriais.",
        content:
          "Hemácias: 4,5 milhões/mm3 (Valor de referência: 4,3 a 5,8 milhões/mm3)\nHemoglobina: 15 g/dl (Valor de referência: 14 a 18 mg/dl)\nHematócrito: 45% (Valor de referência: 39-52%)\nVCM: 85 fL (Valor de referência: 80 a 100 fL)\nHCM: 30 pg (Valor de referência: 26-33 pg)\nCHCM: 30 g/dl (Valor de referência: 30-34 g/dl)\nRDW CV: 12% (Valor de referência: 11-14%)\n\nPlaquetas: 175.000 mm/3 (150.000-400.000 mm/3)\n\nPCR: 40mg/dL (menor ou igual a 8mg/dL)\n\nLeucócitos: 5.240/mm3 (Valor de referência: 4.000-10.000/mm3)\nNeutrófilos: 65% (Valor de referência: 40-70%)\nBastões: 3% (Valor de referência: 0-5%)\nLinfócitos: 25% (Valor de referência: 20-50%)\nBasófilos: 1% (Valor de referência: 0-2%)\nEosinófilos: 2% (Valor de referência: 0-6%)\nMonócitos: 4% (Valor de referência: 4-8%)\n\nGlicemia sérica: 95 mg/dl\n\nCreatinina: 0,8 mg/dL (Valor de referência: 0,7-1,1 mg/dL)\nUreia: 19 mg/dl (Valor de referência: < 40 mg/dl)\n\nSódio: 140 mEq/l (Valor de referência: 135-145 mEq/l)\nK: 4 mEq/l (Valor de referência: 3,5-5 mEq/l)",
      },
      {
        id: "m3",
        name: "Impresso 3 ( Imagem da aranha )",
        type: "Imagem",
        description: "Entregue após solicitação da identificação do animal.",
        content: "Imagem da aranha responsável pelo acidente — gênero Phoneutria (aranha-armadeira).",
      },
    ],
    checklist: cl([
      {
        category: "Comunicação",
        description: "1. Apresentação:\n(1) Identifica-se;\n(2) Cumprimenta o paciente simulado.",
        points: 0.25,
        levels: [
          { label: "Inadequado: Realiza apenas uma ação ou não realiza nenhuma ação.", points: 0 },
          { label: "Adequado: Realiza as duas ações.", points: 0.25 },
        ],
      },
      {
        category: "Anamnese",
        description:
          "2. Realiza anamnese direcionada perguntando por:\n(1) Tempo de evolução;\n(2) Dor no local da picada;\n(3) Salivação excessiva ou sialorreia;\n(4) Vômitos;\n(5) Priapismo;\n(6) Sudorese;\n(7) Limpeza da região afetada;",
        points: 1.5,
        levels: [
          { label: "Inadequado: Pergunta por dois ou menos itens.", points: 0 },
          { label: "Parcialmente adequado: Pergunta de três a cinco itens.", points: 0.75 },
          { label: "Adequado: Pergunta seis ou sete itens.", points: 1.5 },
        ],
      },
      {
        category: "Anamnese",
        description:
          "3. Investiga os antecedentes pessoais:\n(1) Doenças;\n(2) Uso de medicamentos;\n(3) Alergias;\n(4) Álcool;\n(5) Drogas ilícitas;\n(6) Estado vacinal.",
        points: 0.5,
        levels: [
          { label: "Inadequado: Investiga dois ou menos itens.", points: 0 },
          { label: "Parcialmente adequado: Investiga três ou quatro itens.", points: 0.25 },
          { label: "Adequado: Investiga cinco ou seis itens.", points: 0.5 },
        ],
      },
      {
        category: "Exame físico",
        description: "4. Solicita o exame físico.",
        points: 0.5,
        levels: [
          { label: "Inadequado: Não solicita.", points: 0 },
          { label: "Adequado: Solicita.", points: 0.5 },
        ],
      },
      {
        category: "Diagnóstico",
        description:
          "5. Solicita os exames laboratoriais:\n(1) Hemograma;\n(2) PCR e/ou VHS;\n(3) Gasometria arterial;\n(4) Ureia e/ou creatinina;\n(5) Urina I ou EAS;\n(6) Sódio e potássio.",
        points: 1.0,
        levels: [
          { label: "Inadequado: Solicita dois ou menos itens.", points: 0 },
          { label: "Parcialmente adequado: Solicita três ou quatro itens.", points: 0.5 },
          { label: "Adequado: Solicita de cinco a seis itens.", points: 1.0 },
        ],
      },
      {
        category: "Diagnóstico",
        description: "6. Identifica corretamente a aranha mostrada na foto:",
        points: 1.75,
        levels: [
          { label: "Inadequado: Não identifica.", points: 0 },
          { label: "Adequado: Identifica o gênero Phoneutria ou aranha armadeira.", points: 1.75 },
        ],
      },
      {
        category: "Diagnóstico",
        description: "7. Realiza o diagnóstico de acidente grave por Phoneutria ou aranha-armadeira.",
        points: 2.0,
        helperText:
          "Classificação grave por Phoneutria: priapismo, sialorreia intensa, vômitos, visão embaçada, sudorese, taquicardia, astenia. Sinais sistêmicos graves indicam risco de choque/hipotensão; monitorar e tratar suporte inicial (VB, O2 se necessário). Ref: Manual Fiocruz/MS(2).",
        levels: [
          { label: "Inadequado: Não realiza o diagnóstico.", points: 0 },
          { label: "Parcialmente adequado: Realiza o diagnóstico, mas não classifica como grave.", points: 1.0 },
          { label: "Adequado: Realiza o diagnóstico (acidente por Phoneutria/aranha-armadeira) e classifica como grave.", points: 2.0 },
        ],
      },
      {
        category: "Conduta",
        description:
          "8. Realiza a conduta terapêutica adequada:\n(1) Indica soro antirrácnico, 5 a 10 ampolas (validar se citar soro antirrácnico e número de ampolas);\n(2) Indica analgesia endovenosa;\n(3) Limpeza e/ou antissepsia da região afetada;\n(4) Solicita internação em unidade de cuidados intensivos.",
        points: 1.5,
        helperText:
          "Soro antirrácnico (SAR ant Phoneutria): grave = 5-10 ampolas IV diluído, infusão lenta (monitorar reação/anafilaxia com teste prévio se possível). Analgesia: opioide IV (morfina/fentanil). Suporte: VB 2 acessos, monitorização contínua. Alternativa: sem infiltração local (risco disseminação). Ref: Fiocruz/MS(2).",
        levels: [
          { label: "Inadequado: Não indica corretamente o item 1 ou não realiza nenhuma ação.", points: 0 },
          { label: "Parcialmente adequado: Realiza de uma a três ações (obrigatoriamente inclui item 1).", points: 0.75 },
          { label: "Adequado: Realiza as quatro ações.", points: 1.5 },
        ],
      },
      {
        category: "Comunicação",
        description:
          "9. Orienta sobre prevenção de acidentes com animais peçonhentos:\n(1) Manter jardins e quintais limpos;\n(2) Usar luvas ou botas;\n(3) Verificar roupas e sapatos antes de usá-los;\n(4) Combater a proliferação de insetos;\n(5) Evitar folhagens densas.",
        points: 0.5,
        levels: [
          { label: "Inadequado: Orienta dois ou menos itens.", points: 0 },
          { label: "Adequado: Orienta ao menos três itens.", points: 0.5 },
        ],
      },
      {
        category: "Conduta",
        description: "10. Realiza a notificação de acidente por animais peçonhentos ao SINAN.",
        points: 0.5,
        levels: [
          { label: "Inadequado: Não realiza.", points: 0 },
          { label: "Adequado: Realiza.", points: 0.5 },
        ],
      },
    ]),
    references: [
      {
        label: "Ofício Circular nº 02/2014 - Acidentes ofídicos (Ministério da Saúde)",
        url: "https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/animais-peconhentos/acidentes-ofidicos/publicacoes/oficio-circular-no-02-2014-cgdt-devit-svs-ms/view",
      },
      {
        label: "Manual de Diagnóstico e Tratamento de Acidentes por Animais Peçonhentos (ICICT/Fiocruz)",
        url: "https://www.icict.fiocruz.br/sites/www.icict.fiocruz.br/files/Manual-de-Diagnostico-e-Tratamento-de-Acidentes-por-Animais-Pe--onhentos.pdf",
      },
    ],
  },
  {
    id: "6",
    slug: "aconselhamento-diabetes",
    title: "Aconselhamento sobre diabetes",
    specialty: "Medicina da Família",
    difficulty: "Fácil",
    durationMinutes: 5,
    clinicalCase: "Paciente recém-diagnosticado com DM2 retorna para receber resultado e orientações.",
    candidateTask: "Faça aconselhamento e plano de cuidados compartilhado.",
    patientInfo: "HbA1c 8,2%.",
    supportMaterials: "—",
    checklist: cl([
      { category: "Comunicação", description: "Acolhe e usa linguagem clara", points: 3 },
      { category: "Conduta", description: "Discute mudanças de estilo de vida", points: 3 },
      { category: "Conduta", description: "Pactua metas com o paciente", points: 2 },
      { category: "Comunicação", description: "Verifica entendimento (teach-back)", points: 2 },
    ]),
  },
];

export const SPECIALTIES: Specialty[] = [
  "Clínica Médica",
  "Pediatria",
  "Ginecologia e Obstetrícia",
  "Cirurgia",
  "Medicina da Família",
  "Urgência e Emergência",
];

export interface Attempt {
  id: string;
  stationId: string;
  date: string;
  score: number;
  status: "Concluída" | "Em revisão" | "Corrigida";
}

export const RECENT_ATTEMPTS: Attempt[] = [
  { id: "a1", stationId: "1", date: "Hoje", score: 8.2, status: "Concluída" },
  { id: "a2", stationId: "3", date: "Ontem", score: 7.5, status: "Corrigida" },
  { id: "a3", stationId: "4", date: "2 dias", score: 6.4, status: "Em revisão" },
  { id: "a4", stationId: "2", date: "4 dias", score: 9.1, status: "Concluída" },
];

export const COMPETENCIES = [
  { name: "Anamnese", value: 82 },
  { name: "Exame físico", value: 68 },
  { name: "Diagnóstico", value: 74 },
  { name: "Conduta", value: 61 },
  { name: "Comunicação", value: 88 },
  { name: "Segurança do paciente", value: 70 },
  { name: "Organização do atendimento", value: 76 },
];
