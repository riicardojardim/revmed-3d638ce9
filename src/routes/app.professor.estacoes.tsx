import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, BookOpen, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";

export const Route = createFileRoute("/app/professor/estacoes")({
  component: StationsPage,
});

interface Station {
  id: string;
  title: string;
  specialty: string;
  difficulty: string;
  duration_minutes: number;
  published: boolean;
  created_at: string;
}

const stationSchema = z.object({
  title: z.string().trim().min(3, "Mínimo 3 caracteres").max(140),
  specialty: z.string().trim().min(2).max(60),
  difficulty: z.enum(["Fácil", "Intermediário", "Avançado"]),
  duration_minutes: z.number().int().min(3).max(30),
  clinical_case: z.string().trim().min(20, "Descreva o caso").max(4000),
  candidate_task: z.string().trim().min(10).max(2000),
  patient_info: z.string().trim().max(2000).optional().or(z.literal("")),
  support_materials: z.string().trim().max(2000).optional().or(z.literal("")),
});

function StationsPage() {
  const { user } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("custom_stations")
      .select("id, title, specialty, difficulty, duration_minutes, published, created_at")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    setStations((data ?? []) as Station[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [user]);

  async function togglePublish(s: Station) {
    const { error } = await supabase
      .from("custom_stations")
      .update({ published: !s.published })
      .eq("id", s.id);
    if (error) return toast.error("Falha ao atualizar", { description: error.message });
    toast.success(s.published ? "Estação despublicada" : "Estação publicada");
    void load();
  }

  async function remove(s: Station) {
    if (!confirm(`Excluir a estação "${s.title}"?`)) return;
    const { error } = await supabase.from("custom_stations").delete().eq("id", s.id);
    if (error) return toast.error("Falha ao excluir", { description: error.message });
    toast.success("Estação excluída");
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Minhas estações</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="h-4 w-4" /> Nova estação
            </Button>
          </DialogTrigger>
          <NewStationDialog onCreated={() => { setOpen(false); void load(); }} />
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : stations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-mint" />
          <h3 className="mt-3 font-display text-lg font-semibold">Você ainda não criou estações</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Comece criando seu primeiro caso clínico com checklist.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {stations.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex-1 min-w-[200px]">
                <div className="flex flex-wrap items-center gap-2">
                  <SpecialtyBadge specialty={s.specialty} />
                  <Badge variant="outline">{s.difficulty}</Badge>
                  <Badge variant="outline">{s.duration_minutes} min</Badge>
                  {s.published ? (
                    <Badge className="bg-success/15 text-success hover:bg-success/15">Publicada</Badge>
                  ) : (
                    <Badge variant="outline" className="border-warning/30 text-warning">Rascunho</Badge>
                  )}
                </div>
                <div className="mt-2 font-display text-lg font-semibold">{s.title}</div>
                <div className="text-xs text-muted-foreground">
                  Criada em {new Date(s.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <div className="flex gap-2">
                <Link to="/app/professor/estacoes/$id" params={{ id: s.id }}>
                  <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /> Editar</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => togglePublish(s)}>
                  {s.published ? <><EyeOff className="h-4 w-4" /> Despublicar</> : <><Eye className="h-4 w-4" /> Publicar</>}
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove(s)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewStationDialog({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: "",
    specialty: "Clínica Médica",
    difficulty: "Intermediário",
    duration_minutes: 10,
    clinical_case: "",
    candidate_task: "",
    patient_info: "",
    support_materials: "",
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = stationSchema.safeParse(form);
    if (!parsed.success) {
      return toast.error("Dados inválidos", { description: parsed.error.issues[0]?.message });
    }
    setSaving(true);
    const { error } = await supabase.from("custom_stations").insert({
      created_by: user.id,
      ...parsed.data,
      patient_info: parsed.data.patient_info || null,
      support_materials: parsed.data.support_materials || null,
    });
    setSaving(false);
    if (error) return toast.error("Erro ao criar", { description: error.message });
    toast.success("Estação criada", { description: "Adicione itens ao checklist em seguida." });
    onCreated();
  }

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Nova estação clínica</DialogTitle>
      </DialogHeader>
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <Label htmlFor="title">Título</Label>
          <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} required />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label htmlFor="specialty">Especialidade</Label>
            <Input id="specialty" value={form.specialty} onChange={(e) => set("specialty", e.target.value)} required />
          </div>
          <div>
            <Label>Dificuldade</Label>
            <Select value={form.difficulty} onValueChange={(v) => set("difficulty", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Fácil">Fácil</SelectItem>
                <SelectItem value="Intermediário">Intermediário</SelectItem>
                <SelectItem value="Avançado">Avançado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="dur">Duração (min)</Label>
            <Input id="dur" type="number" min={3} max={30} value={form.duration_minutes} onChange={(e) => set("duration_minutes", Number(e.target.value))} required />
          </div>
        </div>
        <div>
          <Label htmlFor="case">Caso clínico</Label>
          <Textarea id="case" rows={5} value={form.clinical_case} onChange={(e) => set("clinical_case", e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="task">Tarefa do candidato</Label>
          <Textarea id="task" rows={3} value={form.candidate_task} onChange={(e) => set("candidate_task", e.target.value)} required />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="pat">Dados do paciente</Label>
            <Textarea id="pat" rows={3} value={form.patient_info} onChange={(e) => set("patient_info", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="mat">Materiais disponíveis</Label>
            <Textarea id="mat" rows={3} value={form.support_materials} onChange={(e) => set("support_materials", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" variant="hero" disabled={saving}>
            {saving ? "Criando..." : "Criar estação"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
