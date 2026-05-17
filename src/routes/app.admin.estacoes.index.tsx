import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, BookOpen, Eye, EyeOff, Pencil, Trash2, Copy, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/admin/estacoes/")({
  component: AdminStationsPage,
});

interface Station {
  id: string;
  title: string;
  specialty: string;
  difficulty: string;
  duration_minutes: number;
  published: boolean;
  created_at: string;
  created_by: string;
  checklist_count?: number;
}

const SPECIALTIES = [
  "Clínica Médica",
  "Pediatria",
  "Ginecologia e Obstetrícia",
  "Cirurgia",
  "Medicina da Família",
  "Urgência e Emergência",
];

function AdminStationsPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const [spec, setSpec] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("custom_stations")
      .select("id, title, specialty, difficulty, duration_minutes, published, created_at, created_by")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Station[];
    const ids = list.map((s) => s.id);
    const countsByStation = new Map<string, number>();
    if (ids.length) {
      const { data: checklistItems } = await supabase
        .from("station_checklist_items")
        .select("station_id")
        .in("station_id", ids);
      (checklistItems ?? []).forEach((item) => {
        const stationId = item.station_id as string;
        countsByStation.set(stationId, (countsByStation.get(stationId) ?? 0) + 1);
      });
    }
    setStations(list.map((s) => ({ ...s, checklist_count: countsByStation.get(s.id) ?? 0 })));
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function togglePublish(s: Station) {
    const { error } = await supabase
      .from("custom_stations")
      .update({ published: !s.published })
      .eq("id", s.id);
    if (error) return toast.error("Falha ao atualizar", { description: error.message });
    toast.success(s.published ? "Estação despublicada" : "Estação publicada para assinantes");
    void load();
  }

  async function remove(s: Station) {
    if (!confirm(`Excluir a estação "${s.title}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("custom_stations").delete().eq("id", s.id);
    if (error) return toast.error("Falha ao excluir", { description: error.message });
    toast.success("Estação excluída");
    void load();
  }

  async function duplicate(s: Station) {
    if (!user) return;
    const { data: full } = await supabase.from("custom_stations").select("*").eq("id", s.id).maybeSingle();
    if (!full) return toast.error("Não foi possível duplicar");
    const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = full as Record<string, unknown>;
    const insertPayload = { ...rest, created_by: user.id, title: `${s.title} (cópia)`, published: false } as never;
    const { data: created, error } = await supabase
      .from("custom_stations")
      .insert(insertPayload)
      .select("id")
      .single();
    if (error || !created) return toast.error("Falha ao duplicar", { description: error?.message });
    const { data: items } = await supabase
      .from("station_checklist_items")
      .select("description, category, points, helper_text, order_index, levels")
      .eq("station_id", s.id);
    if (items && items.length) {
      await supabase.from("station_checklist_items").insert(
        items.map((it) => ({ ...it, station_id: created.id })),
      );
    }
    toast.success("Estação duplicada");
    void load();
  }

  async function createNew() {
    if (!user) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("custom_stations")
      .insert({
        created_by: user.id,
        title: "Nova estação sem título",
        specialty: "Clínica Médica",
        difficulty: "Intermediário",
        duration_minutes: 10,
        clinical_case: "",
        candidate_task: "",
        published: false,
      })
      .select("id")
      .single();
    setCreating(false);
    if (error || !data) return toast.error("Erro ao criar", { description: error?.message });
    nav({ to: "/app/admin/estacoes/$id", params: { id: data.id } });
  }

  const filtered = useMemo(() => {
    return stations.filter((s) => {
      if (q && !s.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (spec !== "all" && s.specialty !== spec) return false;
      if (status === "published" && !s.published) return false;
      if (status === "draft" && s.published) return false;
      return true;
    });
  }, [stations, q, spec, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Estações da plataforma</h2>
          <p className="text-sm text-muted-foreground">Crie, edite e publique estações para todos os assinantes.</p>
        </div>
        <Button variant="hero" onClick={createNew} disabled={creating}>
          <Plus className="h-4 w-4" /> {creating ? "Criando..." : "Nova estação"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar pelo título..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={spec} onValueChange={setSpec}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as especialidades</SelectItem>
            {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="published">Publicadas</SelectItem>
            <SelectItem value="draft">Rascunhos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-mint" />
          <h3 className="mt-3 font-display text-lg font-semibold">Nenhuma estação encontrada</h3>
          <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou crie uma nova estação.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex-1 min-w-[200px]">
                <div className="flex flex-wrap items-center gap-2">
                  <SpecialtyBadge specialty={s.specialty} />
                  <Badge variant="outline">{s.checklist_count} itens</Badge>
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
              <div className="flex flex-wrap gap-2">
                <Link to="/app/admin/estacoes/$id" params={{ id: s.id }}>
                  <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /> Editar</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => togglePublish(s)}>
                  {s.published ? <><EyeOff className="h-4 w-4" /> Despublicar</> : <><Eye className="h-4 w-4" /> Publicar</>}
                </Button>
                <Button variant="outline" size="sm" onClick={() => duplicate(s)} title="Duplicar">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove(s)} title="Excluir">
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
