import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Eye, EyeOff, Plus, Trash2, ChevronUp, ChevronDown, Copy,
  CheckCircle2, FileText, ClipboardList, User, FlaskConical, BookCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/admin/estacoes/$id")({
  component: StationWizard,
});

// -------- Types --------
interface PatientProfile {
  name?: string; age?: string; sex?: string; profession?: string;
  chiefComplaint?: string; hpi?: string; personalHistory?: string;
  medications?: string; allergies?: string; familyHistory?: string;
  habits?: string; symptoms?: string; vitals?: string; previousExams?: string;
  spontaneous?: string; onlyIfAsked?: string; doNotReveal?: string;
  emotionalTone?: string; actingTips?: string;
}

interface DeliverableMaterial {
  id: string;
  name: string;
  type: string;
  description?: string;
  content: string;
  autoDeliver?: boolean;
}

interface BiblioRef { label: string; url?: string }

interface Station {
  id: string;
  title: string;
  specialty: string;
  difficulty: string;
  duration_minutes: number;
  clinical_case: string;
  candidate_task: string;
  patient_info: string | null;
  support_materials: string | null;
  patient_script: string | null;
  evaluator_notes: string | null;
  competencies: string[];
  scoring_criteria: string | null;
  post_materials: string | null;
  educational_goal: string | null;
  expected_conduct: string | null;
  common_mistakes: string | null;
  bibliographic_references: BiblioRef[];
  deliverable_materials: DeliverableMaterial[];
  patient_profile: PatientProfile;
  published: boolean;
}

interface ChecklistLevel { label: string; points: number; description?: string }
interface Item {
  id: string;
  description: string;
  category: string;
  points: number;
  helper_text: string | null;
  order_index: number;
  levels: ChecklistLevel[];
}

const SPECIALTIES = [
  "Clínica Médica", "Pediatria", "Ginecologia e Obstetrícia",
  "Cirurgia", "Medicina da Família", "Urgência e Emergência",
];
const CATEGORIES = ["Anamnese", "Exame físico", "Diagnóstico", "Conduta", "Comunicação", "Procedimento"];
const MATERIAL_TYPES = ["Impresso", "Exame laboratorial", "Exame de imagem", "ECG", "Outro"];

function defaultLevels(maxPts: number): ChecklistLevel[] {
  const m = Number.isFinite(maxPts) ? maxPts : 1;
  return [
    { label: "Adequado", points: m, description: "" },
    { label: "Parcialmente adequado", points: Math.round((m / 2) * 100) / 100, description: "" },
    { label: "Inadequado", points: 0, description: "" },
  ];
}

const STEPS = [
  { key: "basics",     label: "Informações", icon: ClipboardList },
  { key: "case",       label: "Caso clínico", icon: User },
  { key: "materials",  label: "Impressos",   icon: FileText },
  { key: "checklist",  label: "Checklist PEP", icon: CheckCircle2 },
  { key: "review",     label: "Revisão & publicar", icon: BookCheck },
] as const;
type StepKey = typeof STEPS[number]["key"];

function StationWizard() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [station, setStation] = useState<Station | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<StepKey>("basics");

  async function load() {
    const [{ data: s }, { data: it }] = await Promise.all([
      supabase.from("custom_stations").select("*").eq("id", id).maybeSingle(),
      supabase.from("station_checklist_items").select("*").eq("station_id", id).order("order_index"),
    ]);
    if (!s) {
      toast.error("Estação não encontrada");
      nav({ to: "/app/admin/estacoes" });
      return;
    }
    const raw = s as Record<string, unknown>;
    setStation({
      ...(raw as unknown as Station),
      competencies: (raw.competencies as string[]) ?? [],
      bibliographic_references: (raw.bibliographic_references as BiblioRef[]) ?? [],
      deliverable_materials: (raw.deliverable_materials as DeliverableMaterial[]) ?? [],
      patient_profile: (raw.patient_profile as PatientProfile) ?? {},
    });
    setItems(((it as unknown as Item[]) ?? []).map((i) => ({
      ...i,
      levels: Array.isArray(i.levels) && i.levels.length ? i.levels : defaultLevels(Number(i.points) || 1),
    })));
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  function up<K extends keyof Station>(k: K, v: Station[K]) {
    setStation((s) => (s ? { ...s, [k]: v } : s));
  }

  async function saveStation(opts: { silent?: boolean } = {}) {
    if (!station) return;
    setSaving(true);
    const payload = {
      title: station.title,
      specialty: station.specialty,
      difficulty: station.difficulty,
      duration_minutes: station.duration_minutes,
      clinical_case: station.clinical_case,
      candidate_task: station.candidate_task,
      patient_info: station.patient_info,
      support_materials: station.support_materials,
      patient_script: station.patient_script,
      evaluator_notes: station.evaluator_notes,
      competencies: station.competencies,
      scoring_criteria: station.scoring_criteria,
      post_materials: station.post_materials,
      educational_goal: station.educational_goal,
      expected_conduct: station.expected_conduct,
      common_mistakes: station.common_mistakes,
      bibliographic_references: station.bibliographic_references,
      deliverable_materials: station.deliverable_materials,
      patient_profile: station.patient_profile,
    } as never;
    const { error } = await supabase.from("custom_stations").update(payload).eq("id", id);
    setSaving(false);
    if (error) return toast.error("Erro ao salvar", { description: error.message });
    if (!opts.silent) toast.success("Alterações salvas");
  }

  async function togglePublish() {
    if (!station) return;
    await saveStation({ silent: true });
    const { error } = await supabase
      .from("custom_stations")
      .update({ published: !station.published })
      .eq("id", id);
    if (error) return toast.error("Falha", { description: error.message });
    toast.success(station.published ? "Estação despublicada" : "Estação publicada para assinantes");
    void load();
  }

  if (!station) return <div className="text-sm text-muted-foreground">Carregando estação...</div>;

  const totalPts = items.reduce((s, i) => s + Number(i.points || 0), 0);
  const stepIdx = STEPS.findIndex((s) => s.key === step);

  async function goStep(next: StepKey) {
    await saveStation({ silent: true });
    setStep(next);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/app/admin/estacoes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para a lista
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={togglePublish}>
            {station.published ? <><EyeOff className="h-4 w-4" /> Despublicar</> : <><Eye className="h-4 w-4" /> Publicar</>}
          </Button>
          <Button variant="hero" onClick={() => saveStation()} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Stepper */}
      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="grid gap-1 sm:grid-cols-5">
          {STEPS.map((s, i) => {
            const active = s.key === step;
            const done = i < stepIdx;
            return (
              <button
                key={s.key}
                onClick={() => goStep(s.key)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                  active ? "bg-mint/15 text-foreground font-semibold" : done ? "text-mint hover:bg-muted" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <span className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold",
                  active ? "border-mint bg-mint/20 text-mint" : done ? "border-mint bg-mint text-background" : "border-border",
                )}>{i + 1}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          {items.length} itens · <span className="font-semibold text-foreground">{totalPts.toFixed(2)} pts</span> totais
        </div>
        <Badge variant="outline">
          {station.published ? "Publicada" : "Rascunho"}
        </Badge>
      </div>

      {/* Step content */}
      {step === "basics" && <StepBasics station={station} up={up} />}
      {step === "case" && <StepCase station={station} up={up} />}
      {step === "materials" && (
        <StepMaterials
          materials={station.deliverable_materials}
          onChange={(m) => up("deliverable_materials", m)}
        />
      )}
      {step === "checklist" && (
        <StepChecklist stationId={id} items={items} reload={load} />
      )}
      {step === "review" && <StepReview station={station} items={items} up={up} togglePublish={togglePublish} />}

      {/* Footer nav */}
      <div className="flex justify-between gap-2 border-t border-border pt-4">
        <Button
          variant="outline"
          onClick={() => goStep(STEPS[Math.max(0, stepIdx - 1)].key)}
          disabled={stepIdx === 0}
        >
          ← Voltar
        </Button>
        <Button
          variant="hero"
          onClick={() => goStep(STEPS[Math.min(STEPS.length - 1, stepIdx + 1)].key)}
          disabled={stepIdx === STEPS.length - 1}
        >
          Próximo passo →
        </Button>
      </div>
    </div>
  );
}

// ============= STEPS =============

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function StepBasics({ station, up }: { station: Station; up: <K extends keyof Station>(k: K, v: Station[K]) => void }) {
  return (
    <Section title="Informações básicas" hint="Como a estação aparece para o assinante.">
      <div>
        <Label>Título</Label>
        <Input value={station.title} onChange={(e) => up("title", e.target.value)} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <Label>Especialidade</Label>
          <Select value={station.specialty} onValueChange={(v) => up("specialty", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Dificuldade</Label>
          <Select value={station.difficulty} onValueChange={(v) => up("difficulty", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Fácil">Fácil</SelectItem>
              <SelectItem value="Intermediário">Intermediário</SelectItem>
              <SelectItem value="Avançado">Avançado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Duração (min)</Label>
          <Input type="number" min={3} max={30} value={station.duration_minutes}
            onChange={(e) => up("duration_minutes", Number(e.target.value))} />
        </div>
      </div>
      <div>
        <Label>Objetivo educacional</Label>
        <Textarea rows={3} value={station.educational_goal ?? ""} onChange={(e) => up("educational_goal", e.target.value)}
          placeholder="O que o candidato deve aprender ao terminar esta estação?" />
      </div>
      <div>
        <Label>Competências avaliadas (separadas por vírgula)</Label>
        <Input value={(station.competencies ?? []).join(", ")}
          onChange={(e) => up("competencies", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
      </div>
    </Section>
  );
}

function StepCase({ station, up }: { station: Station; up: <K extends keyof Station>(k: K, v: Station[K]) => void }) {
  const p = station.patient_profile ?? {};
  function setP<K extends keyof PatientProfile>(k: K, v: PatientProfile[K]) {
    up("patient_profile", { ...p, [k]: v });
  }
  return (
    <>
      <Section title="Caso clínico apresentado">
        <div>
          <Label>Caso clínico (mostrado ao candidato no início)</Label>
          <Textarea rows={5} value={station.clinical_case} onChange={(e) => up("clinical_case", e.target.value)} />
        </div>
        <div>
          <Label>Tarefa do candidato</Label>
          <Textarea rows={3} value={station.candidate_task} onChange={(e) => up("candidate_task", e.target.value)} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Dados rápidos do paciente</Label>
            <Textarea rows={3} value={station.patient_info ?? ""} onChange={(e) => up("patient_info", e.target.value)} />
          </div>
          <div>
            <Label>Materiais disponíveis durante a estação</Label>
            <Textarea rows={3} value={station.support_materials ?? ""} onChange={(e) => up("support_materials", e.target.value)} />
          </div>
        </div>
      </Section>

      <Section title="Perfil completo do paciente / ator"
        hint="Usado pelo participante que atua como paciente nas estações em dupla.">
        <div className="grid gap-3 md:grid-cols-4">
          <div><Label>Nome</Label><Input value={p.name ?? ""} onChange={(e) => setP("name", e.target.value)} /></div>
          <div><Label>Idade</Label><Input value={p.age ?? ""} onChange={(e) => setP("age", e.target.value)} /></div>
          <div><Label>Sexo</Label><Input value={p.sex ?? ""} onChange={(e) => setP("sex", e.target.value)} /></div>
          <div><Label>Profissão</Label><Input value={p.profession ?? ""} onChange={(e) => setP("profession", e.target.value)} /></div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Queixa principal</Label><Textarea rows={2} value={p.chiefComplaint ?? ""} onChange={(e) => setP("chiefComplaint", e.target.value)} /></div>
          <div><Label>HMA (história da doença atual)</Label><Textarea rows={2} value={p.hpi ?? ""} onChange={(e) => setP("hpi", e.target.value)} /></div>
          <div><Label>Antecedentes pessoais</Label><Textarea rows={2} value={p.personalHistory ?? ""} onChange={(e) => setP("personalHistory", e.target.value)} /></div>
          <div><Label>Medicações em uso</Label><Textarea rows={2} value={p.medications ?? ""} onChange={(e) => setP("medications", e.target.value)} /></div>
          <div><Label>Alergias</Label><Textarea rows={2} value={p.allergies ?? ""} onChange={(e) => setP("allergies", e.target.value)} /></div>
          <div><Label>Antecedentes familiares</Label><Textarea rows={2} value={p.familyHistory ?? ""} onChange={(e) => setP("familyHistory", e.target.value)} /></div>
          <div><Label>Hábitos</Label><Textarea rows={2} value={p.habits ?? ""} onChange={(e) => setP("habits", e.target.value)} /></div>
          <div><Label>Sintomas associados</Label><Textarea rows={2} value={p.symptoms ?? ""} onChange={(e) => setP("symptoms", e.target.value)} /></div>
          <div><Label>Sinais vitais</Label><Textarea rows={2} value={p.vitals ?? ""} onChange={(e) => setP("vitals", e.target.value)} /></div>
          <div><Label>Exames prévios</Label><Textarea rows={2} value={p.previousExams ?? ""} onChange={(e) => setP("previousExams", e.target.value)} /></div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div><Label>O paciente fala espontaneamente</Label><Textarea rows={3} value={p.spontaneous ?? ""} onChange={(e) => setP("spontaneous", e.target.value)} /></div>
          <div><Label>Só revela se perguntado</Label><Textarea rows={3} value={p.onlyIfAsked ?? ""} onChange={(e) => setP("onlyIfAsked", e.target.value)} /></div>
          <div><Label>Não revelar</Label><Textarea rows={3} value={p.doNotReveal ?? ""} onChange={(e) => setP("doNotReveal", e.target.value)} /></div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Tom emocional</Label><Input value={p.emotionalTone ?? ""} onChange={(e) => setP("emotionalTone", e.target.value)} /></div>
          <div><Label>Dicas de atuação</Label><Input value={p.actingTips ?? ""} onChange={(e) => setP("actingTips", e.target.value)} /></div>
        </div>
      </Section>
    </>
  );
}

function StepMaterials({ materials, onChange }: { materials: DeliverableMaterial[]; onChange: (m: DeliverableMaterial[]) => void }) {
  function add() {
    const next = [...materials, {
      id: `imp${materials.length + 1}`,
      name: "",
      type: "Impresso",
      description: "",
      content: "",
      autoDeliver: false,
    }];
    onChange(next);
  }
  function update(i: number, patch: Partial<DeliverableMaterial>) {
    const next = materials.map((m, idx) => idx === i ? { ...m, ...patch } : m);
    onChange(next);
  }
  function remove(i: number) {
    onChange(materials.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= materials.length) return;
    const next = [...materials];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <Section title="Impressos e materiais entregáveis" hint="Materiais que o avaliador libera quando o candidato solicita ou cumpre um gatilho.">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={add}><Plus className="h-4 w-4" /> Adicionar impresso</Button>
      </div>
      {materials.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum impresso ainda. Adicione exames, ECGs, imagens ou respostas do paciente.
        </p>
      ) : (
        <div className="space-y-3">
          {materials.map((m, i) => (
            <div key={i} className="rounded-xl border border-border bg-background/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-mint/30 text-mint">Impresso {i + 1}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0}><ChevronUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => move(i, 1)} disabled={i === materials.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-[2fr,1fr]">
                <div>
                  <Label>Nome (curto, ex: "Pulso e respiração")</Label>
                  <Input value={m.name} onChange={(e) => update(i, { name: e.target.value })} />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={m.type} onValueChange={(v) => update(i, { type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MATERIAL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Quando liberar (gatilho)</Label>
                <Input value={m.description ?? ""} onChange={(e) => update(i, { description: e.target.value })}
                  placeholder="Ex: Liberar se perguntado sobre pulso e respiração." />
              </div>
              <div>
                <Label>Conteúdo entregue</Label>
                <Textarea rows={4} value={m.content} onChange={(e) => update(i, { content: e.target.value })}
                  placeholder="Texto/resultado que será mostrado ao candidato." />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!m.autoDeliver} onCheckedChange={(v) => update(i, { autoDeliver: v })} />
                <span className="text-sm text-muted-foreground">Entregar automaticamente no início</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function StepChecklist({ stationId, items, reload }: { stationId: string; items: Item[]; reload: () => Promise<void> }) {
  const [draft, setDraft] = useState({ description: "", category: "Anamnese", points: 1 });

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.description.trim()) return toast.error("Descrição obrigatória");
    const pts = Number(draft.points) || 1;
    const payload = {
      station_id: stationId,
      description: draft.description.trim(),
      category: draft.category,
      points: pts,
      order_index: items.length,
      levels: defaultLevels(pts),
    } as never;
    const { error } = await supabase.from("station_checklist_items").insert(payload);
    if (error) return toast.error("Erro", { description: error.message });
    setDraft({ description: "", category: draft.category, points: pts });
    await reload();
  }

  async function patchItem(item: Item, patch: Partial<Item>) {
    const next: Partial<Item> = { ...patch };
    if (patch.points !== undefined && (!Array.isArray(item.levels) || !item.levels.length)) {
      next.levels = defaultLevels(Number(patch.points) || 1);
    }
    const { error } = await supabase
      .from("station_checklist_items")
      .update(next as never)
      .eq("id", item.id);
    if (error) return toast.error("Erro ao salvar item", { description: error.message });
    await reload();
  }

  async function patchLevel(item: Item, levelIdx: number, patch: Partial<ChecklistLevel>) {
    const levels = item.levels.map((l, i) => i === levelIdx ? { ...l, ...patch } : l);
    const { error } = await supabase
      .from("station_checklist_items")
      .update({ levels } as never)
      .eq("id", item.id);
    if (error) return toast.error("Erro", { description: error.message });
    await reload();
  }

  async function remove(item: Item) {
    if (!confirm("Excluir este item?")) return;
    const { error } = await supabase.from("station_checklist_items").delete().eq("id", item.id);
    if (error) return toast.error("Erro", { description: error.message });
    await reload();
  }

  async function duplicate(item: Item) {
    const payload = {
      station_id: stationId,
      description: item.description + " (cópia)",
      category: item.category,
      points: item.points,
      helper_text: item.helper_text,
      order_index: items.length,
      levels: item.levels,
    } as never;
    const { error } = await supabase.from("station_checklist_items").insert(payload);
    if (error) return toast.error("Erro", { description: error.message });
    await reload();
  }

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const a = items[i], b = items[j];
    await Promise.all([
      supabase.from("station_checklist_items").update({ order_index: b.order_index } as never).eq("id", a.id),
      supabase.from("station_checklist_items").update({ order_index: a.order_index } as never).eq("id", b.id),
    ]);
    await reload();
  }

  const totalPts = items.reduce((s, i) => s + Number(i.points || 0), 0);

  return (
    <Section title="Checklist PEP graduado" hint="Cada item tem 3 níveis: Adequado / Parcialmente adequado / Inadequado.">
      <form onSubmit={addItem} className="grid gap-2 rounded-xl border border-border bg-background/40 p-3 md:grid-cols-[1fr,180px,90px,auto]">
        <Input placeholder="Descrição do item (ex: 'Apresentação')" value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="number" step="0.1" min={0.1} max={20} value={draft.points}
          onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })} />
        <Button type="submit" variant="hero"><Plus className="h-4 w-4" /> Adicionar</Button>
      </form>

      <div className="text-xs text-muted-foreground">
        {items.length} itens · {totalPts.toFixed(2)} pts totais
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum item de checklist ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={item.id} className="rounded-xl border border-border bg-background/40 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-mono text-muted-foreground">#{i + 1}</span>
                  <Badge variant="outline">{item.category}</Badge>
                  <Badge className="bg-mint/15 text-mint hover:bg-mint/15">{Number(item.points).toFixed(2)} pts</Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0}><ChevronUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => move(i, 1)} disabled={i === items.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => duplicate(item)}><Copy className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(item)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[2fr,140px,140px]">
                <div>
                  <Label>Descrição</Label>
                  <Textarea rows={2} defaultValue={item.description}
                    onBlur={(e) => e.target.value !== item.description && patchItem(item, { description: e.target.value })} />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={item.category} onValueChange={(v) => patchItem(item, { category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pontos máximos</Label>
                  <Input type="number" step="0.1" min={0} max={20} defaultValue={item.points}
                    onBlur={(e) => Number(e.target.value) !== Number(item.points) && patchItem(item, { points: Number(e.target.value) })} />
                </div>
              </div>

              <div>
                <Label>Texto auxiliar (opcional, exibido em cinza abaixo do item)</Label>
                <Input defaultValue={item.helper_text ?? ""}
                  onBlur={(e) => (e.target.value || null) !== item.helper_text && patchItem(item, { helper_text: e.target.value || null })} />
              </div>

              <div className="rounded-lg border border-border bg-card p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Níveis de avaliação</div>
                <div className="space-y-2">
                  {(item.levels ?? defaultLevels(Number(item.points) || 1)).map((lv, lvIdx) => (
                    <div key={lvIdx} className="grid gap-2 md:grid-cols-[160px,80px,1fr]">
                      <Input defaultValue={lv.label}
                        onBlur={(e) => e.target.value !== lv.label && patchLevel(item, lvIdx, { label: e.target.value })} />
                      <Input type="number" step="0.05" min={0} defaultValue={lv.points}
                        onBlur={(e) => Number(e.target.value) !== lv.points && patchLevel(item, lvIdx, { points: Number(e.target.value) })} />
                      <Input placeholder="Descrição do critério" defaultValue={lv.description ?? ""}
                        onBlur={(e) => (e.target.value || "") !== (lv.description ?? "") && patchLevel(item, lvIdx, { description: e.target.value })} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function StepReview({
  station, items, up, togglePublish,
}: {
  station: Station; items: Item[];
  up: <K extends keyof Station>(k: K, v: Station[K]) => void;
  togglePublish: () => unknown;
}) {
  const totalPts = items.reduce((s, i) => s + Number(i.points || 0), 0);
  const grouped = useMemo(() => {
    const m: Record<string, Item[]> = {};
    items.forEach((i) => { (m[i.category] ??= []).push(i); });
    return m;
  }, [items]);

  function addRef() {
    up("bibliographic_references", [...(station.bibliographic_references ?? []), { label: "", url: "" }]);
  }
  function updateRef(i: number, patch: Partial<BiblioRef>) {
    const next = (station.bibliographic_references ?? []).map((r, idx) => idx === i ? { ...r, ...patch } : r);
    up("bibliographic_references", next);
  }
  function removeRef(i: number) {
    up("bibliographic_references", (station.bibliographic_references ?? []).filter((_, idx) => idx !== i));
  }

  return (
    <>
      <Section title="Notas pedagógicas (visíveis no feedback)">
        <div>
          <Label>Conduta esperada</Label>
          <Textarea rows={4} value={station.expected_conduct ?? ""} onChange={(e) => up("expected_conduct", e.target.value)} />
        </div>
        <div>
          <Label>Erros comuns</Label>
          <Textarea rows={3} value={station.common_mistakes ?? ""} onChange={(e) => up("common_mistakes", e.target.value)} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Observações para o avaliador / banca</Label>
            <Textarea rows={3} value={station.evaluator_notes ?? ""} onChange={(e) => up("evaluator_notes", e.target.value)} />
          </div>
          <div>
            <Label>Material de apoio pós-estação</Label>
            <Textarea rows={3} value={station.post_materials ?? ""} onChange={(e) => up("post_materials", e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Critérios de pontuação (resumo textual)</Label>
          <Textarea rows={3} value={station.scoring_criteria ?? ""} onChange={(e) => up("scoring_criteria", e.target.value)} />
        </div>
      </Section>

      <Section title="Referências bibliográficas">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={addRef}><Plus className="h-4 w-4" /> Adicionar referência</Button>
        </div>
        <div className="space-y-2">
          {(station.bibliographic_references ?? []).map((r, i) => (
            <div key={i} className="grid gap-2 md:grid-cols-[2fr,2fr,auto]">
              <Input placeholder="Título / citação" value={r.label} onChange={(e) => updateRef(i, { label: e.target.value })} />
              <Input placeholder="URL (opcional)" value={r.url ?? ""} onChange={(e) => updateRef(i, { url: e.target.value })} />
              <Button variant="ghost" size="icon" onClick={() => removeRef(i)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Pré-visualização rápida">
        <div className="text-sm">
          <div className="font-display text-xl font-bold">{station.title || "(sem título)"}</div>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge variant="outline" className="border-medical/30 text-medical">{station.specialty}</Badge>
            <Badge variant="outline">{station.difficulty}</Badge>
            <Badge variant="outline">{station.duration_minutes} min</Badge>
            <Badge variant="outline">{items.length} itens · {totalPts.toFixed(2)} pts</Badge>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{station.clinical_case}</p>
          <div className="mt-4">
            <div className="font-semibold">Impressos ({station.deliverable_materials?.length ?? 0})</div>
            <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
              {(station.deliverable_materials ?? []).map((m, i) => (
                <li key={i}>Impresso {i + 1} — {m.name || "(sem nome)"}</li>
              ))}
            </ul>
          </div>
          <div className="mt-4 space-y-2">
            {Object.entries(grouped).map(([cat, list]) => (
              <div key={cat}>
                <div className="font-semibold">{cat}</div>
                <ul className="list-disc pl-5 text-xs text-muted-foreground">
                  {list.map((i) => <li key={i.id}>{i.description} · {Number(i.points).toFixed(2)} pts</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Publicar para os assinantes" hint="Estações publicadas aparecem para todos os usuários ativos.">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/40 p-4">
          <div>
            <div className="font-semibold">{station.published ? "Esta estação está PUBLICADA" : "Esta estação está em RASCUNHO"}</div>
            <div className="text-xs text-muted-foreground">
              {station.published ? "Visível para todos os assinantes." : "Apenas você e os admins enxergam."}
            </div>
          </div>
          <Button variant={station.published ? "outline" : "hero"} onClick={togglePublish}>
            {station.published ? <><EyeOff className="h-4 w-4" /> Despublicar</> : <><Eye className="h-4 w-4" /> Publicar agora</>}
          </Button>
        </div>
      </Section>
    </>
  );
}
