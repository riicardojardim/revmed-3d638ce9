import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Eye, EyeOff, Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/professor/resumos")({
  component: ProfessorSummaries,
});

type Summary = {
  id: string;
  title: string;
  specialty: string;
  topic: string | null;
  content_md: string | null;
  read_time_minutes: number;
  published: boolean;
  high_yield: boolean;
  difficulty: string;
  definition: string | null;
  clinical_picture: string | null;
  diagnosis: string | null;
  conduct: string | null;
  key_points: string | null;
  pitfalls: string | null;
  cover_image_url: string | null;
};

const SPECIALTIES = ["Clínica Médica", "Cirurgia", "Pediatria", "Ginecologia e Obstetrícia", "Medicina da Família"];
const DIFFICULTIES = ["Básico", "Intermediário", "Avançado"];

const empty = {
  title: "",
  specialty: "Clínica Médica",
  topic: "",
  read_time_minutes: 5,
  difficulty: "Intermediário",
  high_yield: false,
  published: false,
  cover_image_url: "",
  definition: "",
  clinical_picture: "",
  diagnosis: "",
  conduct: "",
  key_points: "",
  pitfalls: "",
  content_md: "",
};

function ProfessorSummaries() {
  const { user } = useAuth();
  const [items, setItems] = useState<Summary[]>([]);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase.from("summaries").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Summary[]);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!user) return;
    if (!form.title.trim()) return toast.error("Informe o título.");
    if (!form.definition.trim() && !form.content_md.trim()) {
      return toast.error("Preencha pelo menos a Definição ou as Notas adicionais.");
    }
    setSaving(true);
    const payload = {
      ...form,
      topic: form.topic || null,
      cover_image_url: form.cover_image_url || null,
      created_by: user.id,
    };
    const { error } = await supabase.from("summaries").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    setForm(empty);
    toast.success("Resumo criado");
    load();
  }
  async function togglePublish(s: Summary) {
    const { error } = await supabase.from("summaries").update({ published: !s.published }).eq("id", s.id);
    if (error) return toast.error(error.message);
    load();
  }
  async function toggleHighYield(s: Summary) {
    const { error } = await supabase.from("summaries").update({ high_yield: !s.high_yield }).eq("id", s.id);
    if (error) return toast.error(error.message);
    load();
  }
  async function remove(id: string) {
    if (!confirm("Excluir resumo?")) return;
    const { error } = await supabase.from("summaries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
  const labelCls = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold">Meus resumos</h2>
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum resumo ainda.</p>}
        {items.map((s) => (
          <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">
                  {s.specialty}{s.topic ? ` · ${s.topic}` : ""} · {s.read_time_minutes} min
                  {s.high_yield && <span className="ml-2 font-semibold text-amber-600">· Alta incidência</span>}
                </div>
                <div className="mt-1 font-medium">{s.title}</div>
                <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {s.definition || s.content_md}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" onClick={() => toggleHighYield(s)} title="Alta incidência">
                  <Star className={`h-4 w-4 ${s.high_yield ? "fill-amber-400 text-amber-500" : ""}`} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => togglePublish(s)}>
                  {s.published ? <Eye className="h-4 w-4 text-mint" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <aside className="rounded-2xl border border-border bg-card p-4 space-y-3 lg:sticky lg:top-20 h-fit max-h-[calc(100vh-6rem)] overflow-y-auto">
        <h3 className="font-display font-bold">Novo resumo</h3>

        <div className="space-y-1">
          <label className={labelCls}>Título</label>
          <input className={inputCls} placeholder="Ex.: Pneumonia adquirida na comunidade"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className={labelCls}>Especialidade</label>
            <select className={inputCls} value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}>
              {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Dificuldade</label>
            <select className={inputCls} value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
              {DIFFICULTIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className={labelCls}>Tópico (opcional)</label>
            <input className={inputCls} value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Tempo (min)</label>
            <input type="number" min={1} className={inputCls} value={form.read_time_minutes}
              onChange={(e) => setForm({ ...form, read_time_minutes: Number(e.target.value) })} />
          </div>
        </div>

        <div className="space-y-1">
          <label className={labelCls}>URL da capa (opcional)</label>
          <input className={inputCls} placeholder="https://..." value={form.cover_image_url}
            onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} />
        </div>

        <div className="space-y-1">
          <label className={labelCls}>Definição</label>
          <textarea rows={3} className={inputCls}
            placeholder="O que é, epidemiologia rápida..."
            value={form.definition} onChange={(e) => setForm({ ...form, definition: e.target.value })} />
        </div>

        <div className="space-y-1">
          <label className={labelCls}>Quadro clínico</label>
          <textarea rows={3} className={inputCls}
            placeholder="Sinais e sintomas principais..."
            value={form.clinical_picture} onChange={(e) => setForm({ ...form, clinical_picture: e.target.value })} />
        </div>

        <div className="space-y-1">
          <label className={labelCls}>Diagnóstico</label>
          <textarea rows={3} className={inputCls}
            placeholder="Critérios, exames, diferenciais..."
            value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
        </div>

        <div className="space-y-1">
          <label className={labelCls}>Conduta</label>
          <textarea rows={4} className={inputCls}
            placeholder="Tratamento, doses, fluxograma..."
            value={form.conduct} onChange={(e) => setForm({ ...form, conduct: e.target.value })} />
        </div>

        <div className="space-y-1">
          <label className={labelCls}>Pontos-chave da prova</label>
          <textarea rows={3} className={inputCls}
            placeholder="O que mais cai, mnemônicos, números importantes..."
            value={form.key_points} onChange={(e) => setForm({ ...form, key_points: e.target.value })} />
        </div>

        <div className="space-y-1">
          <label className={labelCls}>Armadilhas / erros comuns</label>
          <textarea rows={3} className={inputCls}
            placeholder="Pegadinhas frequentes..."
            value={form.pitfalls} onChange={(e) => setForm({ ...form, pitfalls: e.target.value })} />
        </div>

        <div className="space-y-1">
          <label className={labelCls}>Notas adicionais (Markdown opcional)</label>
          <textarea rows={4} className={inputCls}
            value={form.content_md} onChange={(e) => setForm({ ...form, content_md: e.target.value })} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.high_yield}
            onChange={(e) => setForm({ ...form, high_yield: e.target.checked })} />
          Marcar como alta incidência
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })} />
          Publicar imediatamente
        </label>

        <Button variant="hero" className="w-full" disabled={saving} onClick={create}>
          <Plus className="mr-1 h-4 w-4" /> Criar resumo
        </Button>
      </aside>
    </div>
  );
}
