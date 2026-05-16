// Mock data for demo. TODO: replace with Supabase backend.
export type Specialty =
  | "Clínica Médica"
  | "Pediatria"
  | "Ginecologia e Obstetrícia"
  | "Cirurgia"
  | "Medicina da Família"
  | "Urgência e Emergência";

export type Difficulty = "Fácil" | "Médio" | "Difícil";

export interface ChecklistItem {
  id: string;
  category: "Anamnese" | "Exame físico" | "Diagnóstico" | "Conduta" | "Comunicação";
  description: string;
  points: number;
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
