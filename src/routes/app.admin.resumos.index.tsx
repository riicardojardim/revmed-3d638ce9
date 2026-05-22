import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Search,
  FileText,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/admin/resumos/")({
  component: AdminResumosPage,
});

const SPECIALTIES = [
  "Clínica Médica",
  "Cirurgia",
  "Pediatria",
  "Ginecologia e Obstetrícia",
  "Medicina de Família e Comunidade",
  "Preventiva",
];

type Summary = {
  id: string;
  title: string;
  specialty: string;
  topic: string | null;
  difficulty: string;
  published: boolean;
  cover_image_url: string | null;
  created_at: string;
};

function AdminResumosPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [creating, setCreating] = useState(false);
  const [items, setItems] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [spec, setSpec] = useState("all");
  const [status, setStatus] = useState("all");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("summaries")
      .select(
        "id, title, specialty, topic, difficulty, published, cover_image_url, created_at",
      )
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Summary[]);
    setLoading(false);
  }

  async function createNew() {
    if (!user) return toast.error("Faça login novamente.");
    setCreating(true);
    const { data, error } = await supabase
      .from("summaries")
      .insert({
        created_by: user.id,
        title: "Novo resumo sem título",
        specialty: "Clínica Médica",
        content_md: "",
        published: false,
      })
      .select("id")
      .single();
    setCreating(false);
    if (error || !data)
      return toast.error("Erro ao criar resumo", { description: error?.message });
    toast.success("Resumo criado — preencha aba por aba");
    nav({ to: "/app/admin/resumos/$id", params: { id: data.id } });
  }

  useEffect(() => {
    void load();
  }, []);

  async function togglePublish(s: Summary) {
    const { error } = await supabase
      .from("summaries")
      .update({ published: !s.published })
      .eq("id", s.id);
    if (error) return toast.error("Falha ao atualizar", { description: error.message });
    toast.success(s.published ? "Resumo despublicado" : "Resumo publicado");
    void load();
  }
  async function remove(s: Summary) {
    if (!confirm(`Excluir o resumo "${s.title}"?`)) return;
    const { error } = await supabase.from("summaries").delete().eq("id", s.id);
    if (error) return toast.error("Falha ao excluir", { description: error.message });
    toast.success("Resumo excluído");
    void load();
  }

  const filtered = useMemo(() => {
    return items.filter((d) => {
      if (q && !d.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (spec !== "all" && d.specialty !== spec) return false;
      if (status === "published" && !d.published) return false;
      if (status === "draft" && d.published) return false;
      return true;
    });
  }, [items, q, spec, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Resumos clínicos</h2>
          <p className="text-sm text-muted-foreground">
            Crie, edite e publique resumos manualmente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="hero" onClick={createNew} disabled={creating}>
            <Plus className="h-4 w-4" /> {creating ? "Criando..." : "Novo resumo"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar pelo título..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={spec} onValueChange={setSpec}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as áreas</SelectItem>
            {SPECIALTIES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="published">Publicados</SelectItem>
            <SelectItem value="draft">Rascunhos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <FileText className="mx-auto h-10 w-10 text-mint" />
          <h3 className="mt-3 font-display text-lg font-semibold">Nenhum resumo ainda</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Clique em “Novo resumo” para começar.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <div className="flex-1 min-w-[200px]">
                <div className="flex flex-wrap items-center gap-2">
                  <SpecialtyBadge specialty={s.specialty} />
                  {s.published ? (
                    <Badge className="bg-success/15 text-success hover:bg-success/15">
                      Publicado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-warning/30 text-warning">
                      Rascunho
                    </Badge>
                  )}
                </div>
                <div className="mt-1 font-display text-lg font-semibold">{s.title}</div>
                {s.topic && <div className="text-xs text-muted-foreground">{s.topic}</div>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/app/admin/resumos/$id" params={{ id: s.id }}>
                  <Button variant="outline" size="sm">
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => togglePublish(s)}>
                  {s.published ? (
                    <>
                      <EyeOff className="h-4 w-4" /> Despublicar
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" /> Publicar
                    </>
                  )}
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