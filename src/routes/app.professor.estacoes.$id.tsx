import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Plus, Save, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const Route = createFileRoute("/app/professor/estacoes/$id")({
  component: StationEditor,
});

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
  published: boolean;
}

interface Item {
  id: string;
  description: string;
  category: string;
  points: number;
  order_index: number;
}

const itemSchema = z.object({
  description: z.string().trim().min(3).max(300),
  category: z.string().trim().min(2).max(40),
  points: z.number().int().min(1).max(20),
});

function StationEditor() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [station, setStation] = useState<Station | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState({ description: "", category: "Anamnese", points: 1 });

  async function load() {
    const [{ data: s }, { data: it }] = await Promise.all([
      supabase.from("custom_stations").select("*").eq("id", id).maybeSingle(),
      supabase.from("station_checklist_items").select("*").eq("station_id", id).order("order_index"),
    ]);
    setStation((s as Station) ?? null);
    setItems((it ?? []) as Item[]);
  }

  useEffect(() => { void load(); }, [id]);

  async function saveStation() {
    if (!station) return;
    setSaving(true);
    const { error } = await supabase
      .from("custom_stations")
      .update({
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
      })
      .eq("id", id);
    setSaving(false);
    if (error) return toast.error("Erro ao salvar", { description: error.message });
    toast.success("Alterações salvas");
  }

  async function togglePublish() {
    if (!station) return;
    const { error } = await supabase
      .from("custom_stations")
      .update({ published: !station.published })
      .eq("id", id);
    if (error) return toast.error("Falha", { description: error.message });
    toast.success(station.published ? "Despublicada" : "Publicada");
    void load();
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const parsed = itemSchema.safeParse(newItem);
    if (!parsed.success) return toast.error("Dados inválidos", { description: parsed.error.issues[0]?.message });
    const { error } = await supabase.from("station_checklist_items").insert({
      station_id: id,
      ...parsed.data,
      order_index: items.length,
    });
    if (error) return toast.error("Erro", { description: error.message });
    setNewItem({ description: "", category: parsed.data.category, points: 1 });
    void load();
  }

  async function removeItem(itemId: string) {
    const { error } = await supabase.from("station_checklist_items").delete().eq("id", itemId);
    if (error) return toast.error("Erro", { description: error.message });
    void load();
  }

  if (!station) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  function up<K extends keyof Station>(k: K, v: Station[K]) {
    setStation((s) => (s ? { ...s, [k]: v } : s));
  }

  const totalPts = items.reduce((s, i) => s + i.points, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/app/professor/estacoes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={togglePublish}>
            {station.published ? <><EyeOff className="h-4 w-4" /> Despublicar</> : <><Eye className="h-4 w-4" /> Publicar</>}
          </Button>
          <Button variant="hero" onClick={saveStation} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
        <div>
          <Label>Título</Label>
          <Input value={station.title} onChange={(e) => up("title", e.target.value)} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Especialidade</Label>
            <Input value={station.specialty} onChange={(e) => up("specialty", e.target.value)} />
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
            <Input type="number" min={3} max={30} value={station.duration_minutes} onChange={(e) => up("duration_minutes", Number(e.target.value))} />
          </div>
        </div>
        <div>
          <Label>Caso clínico</Label>
          <Textarea rows={5} value={station.clinical_case} onChange={(e) => up("clinical_case", e.target.value)} />
        </div>
        <div>
          <Label>Tarefa do candidato</Label>
          <Textarea rows={3} value={station.candidate_task} onChange={(e) => up("candidate_task", e.target.value)} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Dados do paciente</Label>
            <Textarea rows={3} value={station.patient_info ?? ""} onChange={(e) => up("patient_info", e.target.value)} />
          </div>
          <div>
            <Label>Materiais disponíveis</Label>
            <Textarea rows={3} value={station.support_materials ?? ""} onChange={(e) => up("support_materials", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Checklist avaliativo</h3>
          <Badge variant="outline">{items.length} itens · {totalPts} pts</Badge>
        </div>

        <form className="mt-4 grid gap-2 md:grid-cols-[1fr,160px,90px,auto]" onSubmit={addItem}>
          <Input placeholder="Descrição do item" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} required />
          <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Anamnese", "Exame físico", "Diagnóstico", "Conduta", "Comunicação", "Procedimento"].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="number" min={1} max={20} value={newItem.points} onChange={(e) => setNewItem({ ...newItem, points: Number(e.target.value) })} />
          <Button type="submit" variant="hero"><Plus className="h-4 w-4" /></Button>
        </form>

        <div className="mt-4 divide-y divide-border">
          {items.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum item ainda. Adicione critérios para avaliação.
            </p>
          )}
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-3 py-3">
              <div className="flex-1">
                <div className="text-sm">{i.description}</div>
                <div className="mt-1 text-xs text-muted-foreground">{i.category} · {i.points} pts</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeItem(i.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
