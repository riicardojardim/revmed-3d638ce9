import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, Eye, EyeOff, Trash2, Star, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/admin/resumos/$id")({
  component: AdminResumoEdit,
});

const SPECIALTIES = [
  "Clínica Médica", "Cirurgia", "Pediatria", "Ginecologia e Obstetrícia",
  "Medicina de Família e Comunidade", "Preventiva",
];


type SummaryRow = {
  id: string; title: string; specialty: string; topic: string | null;
  difficulty: string; read_time_minutes: number; published: boolean; high_yield: boolean;
  cover_image_url: string | null; definition: string | null; clinical_picture: string | null;
  diagnosis: string | null; conduct: string | null; key_points: string | null; pitfalls: string | null;
  content_md: string | null;
};

function AdminResumoEdit() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [row, setRow] = useState<SummaryRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("summaries").select("*").eq("id", id).maybeSingle();
    setRow((data as SummaryRow | null) ?? null);
    setLoading(false);
  }
  useEffect(() => { void load(); }, [id]);

  function update<K extends keyof SummaryRow>(key: K, value: SummaryRow[K]) {
    setRow((r) => (r ? { ...r, [key]: value } : r));
  }

  async function save() {
    if (!row) return;
    setSaving(true);
    const { error } = await supabase.from("summaries").update({
      title: row.title, specialty: row.specialty, topic: row.topic || null,
      difficulty: row.difficulty, read_time_minutes: row.read_time_minutes,
      high_yield: row.high_yield, cover_image_url: row.cover_image_url || null,
      definition: row.definition, clinical_picture: row.clinical_picture,
      diagnosis: row.diagnosis, conduct: row.conduct,
      key_points: row.key_points, pitfalls: row.pitfalls, content_md: row.content_md ?? "",
    }).eq("id", row.id);
    setSaving(false);
    if (error) return toast.error("Falha ao salvar", { description: error.message });
    toast.success("Resumo salvo");
  }

  async function togglePublish() {
    if (!row) return;
    const { error } = await supabase.from("summaries").update({ published: !row.published }).eq("id", row.id);
    if (error) return toast.error("Falha", { description: error.message });
    update("published", !row.published);
    toast.success(row.published ? "Despublicado" : "Publicado");
  }

  async function remove() {
    if (!row) return;
    if (!confirm(`Excluir o resumo "${row.title}"?`)) return;
    const { error } = await supabase.from("summaries").delete().eq("id", row.id);
    if (error) return toast.error("Falha", { description: error.message });
    toast.success("Excluído");
    nav({ to: "/app/admin/resumos" });
  }

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  if (!row) return (
    <div className="space-y-3">
      <Link to="/app/admin/resumos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <div className="text-sm">Resumo não encontrado.</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/app/admin/resumos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {row.published
            ? <Badge className="bg-success/15 text-success hover:bg-success/15">Publicado</Badge>
            : <Badge variant="outline" className="border-warning/30 text-warning">Rascunho</Badge>}
          <Link to="/app/resumos/$id" params={{ id: row.id }}>
            <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /> Pré-visualizar</Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => update("high_yield", !row.high_yield)}>
            <Star className={`h-4 w-4 ${row.high_yield ? "fill-amber-400 text-amber-500" : ""}`} /> Alta incidência
          </Button>
          <Button variant="outline" size="sm" onClick={togglePublish}>
            {row.published ? <><EyeOff className="h-4 w-4" /> Despublicar</> : <><Eye className="h-4 w-4" /> Publicar</>}
          </Button>
          <Button variant="hero" size="sm" onClick={save} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button variant="outline" size="sm" onClick={remove} title="Excluir">
            <Trash2 className="h-4 w-4 text-rose-500" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="space-y-1">
              <Label>Título</Label>
              <Input value={row.title} onChange={(e) => update("title", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tópico</Label>
                <Input value={row.topic ?? ""} onChange={(e) => update("topic", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>URL da capa</Label>
                <Input value={row.cover_image_url ?? ""} onChange={(e) => update("cover_image_url", e.target.value)} placeholder="https://..." />
              </div>
            </div>
          </div>

          {([
            ["definition", "Definição", 4],
            ["clinical_picture", "Quadro clínico", 5],
            ["diagnosis", "Diagnóstico", 6],
            ["conduct", "Conduta", 7],
            ["key_points", "Pontos-chave da prova", 5],
            ["pitfalls", "Armadilhas e erros comuns", 5],
            ["content_md", "Notas / Referências (markdown)", 8],
          ] as Array<[keyof SummaryRow, string, number]>).map(([key, label, rows]) => (
            <div key={key} className="rounded-2xl border border-border bg-card p-5 space-y-2">
              <Label>{label}</Label>
              <Textarea
                rows={rows}
                value={(row[key] as string | null) ?? ""}
                onChange={(e) => update(key, e.target.value as SummaryRow[typeof key])}
              />
            </div>
          ))}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 h-fit">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-display font-bold">Metadados</h3>
            <div className="space-y-1">
              <Label>Especialidade</Label>
              <Select value={row.specialty} onValueChange={(v) => update("specialty", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>


            <div className="space-y-1">
              <Label>Tempo de leitura (min)</Label>
              <Input
                type="number" min={1} max={60}
                value={row.read_time_minutes}
                onChange={(e) => update("read_time_minutes", Number(e.target.value) || 5)}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
