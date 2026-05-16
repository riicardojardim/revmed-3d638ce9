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
