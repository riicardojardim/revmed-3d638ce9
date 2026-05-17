import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Brain, Eye, EyeOff, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";

export const Route = createFileRoute("/app/admin/flashcards/")({
  component: AdminFlashcardsPage,
});

type Deck = {
  id: string;
  title: string;
  specialty: string;
  topic: string | null;
  cover_image_url: string | null;
  published: boolean;
  created_at: string;
  card_count?: number;
};

const SPECIALTIES = [
  "Clínica Médica",
  "Cirurgia",
  "Pediatria",
  "Ginecologia e Obstetrícia",
  "Preventiva",
  "Medicina da Família",
  "Urgência e Emergência",
];

function AdminFlashcardsPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const [spec, setSpec] = useState("all");
  const [status, setStatus] = useState("all");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("flashcard_decks")
      .select("id, title, specialty, topic, cover_image_url, published, created_at")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Deck[];
    const ids = list.map((d) => d.id);
    const counts = new Map<string, number>();
    if (ids.length) {
      const { data: fcs } = await supabase.from("flashcards").select("deck_id").in("deck_id", ids);
      (fcs ?? []).forEach((f) => {
        const k = f.deck_id as string;
        if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
      });
    }
    setDecks(list.map((d) => ({ ...d, card_count: counts.get(d.id) ?? 0 })));
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function createNew() {
    if (!user) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("flashcard_decks")
      .insert({ created_by: user.id, title: "Novo deck sem título", specialty: "Clínica Médica", published: false })
      .select("id")
      .single();
    setCreating(false);
    if (error || !data) return toast.error("Erro ao criar", { description: error?.message });
    nav({ to: "/app/admin/flashcards/$id", params: { id: data.id } });
  }

  async function togglePublish(d: Deck) {
    const { error } = await supabase.from("flashcard_decks").update({ published: !d.published }).eq("id", d.id);
    if (error) return toast.error("Falha ao atualizar", { description: error.message });
    toast.success(d.published ? "Deck despublicado" : "Deck publicado");
    void load();
  }

  async function remove(d: Deck) {
    if (!confirm(`Excluir o deck "${d.title}" e todos os seus cards?`)) return;
    const { error } = await supabase.from("flashcard_decks").delete().eq("id", d.id);
    if (error) return toast.error("Falha ao excluir", { description: error.message });
    toast.success("Deck excluído");
    void load();
  }

  const filtered = useMemo(() => {
    return decks.filter((d) => {
      if (q && !d.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (spec !== "all" && d.specialty !== spec) return false;
      if (status === "published" && !d.published) return false;
      if (status === "draft" && d.published) return false;
      return true;
    });
  }, [decks, q, spec, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Decks de Flashcards</h2>
          <p className="text-sm text-muted-foreground">Crie decks no estilo Pense Revalida com capa, perguntas e respostas.</p>
        </div>
        <Button variant="hero" onClick={createNew} disabled={creating}>
          <Plus className="h-4 w-4" /> {creating ? "Criando..." : "Novo Deck"}
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
            <SelectItem value="all">Todas as Áreas</SelectItem>
            {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
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
          <Brain className="mx-auto h-10 w-10 text-mint" />
          <h3 className="mt-3 font-display text-lg font-semibold">Nenhum deck ainda</h3>
          <p className="mt-1 text-sm text-muted-foreground">Crie seu primeiro deck de flashcards.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((d) => {
            const meta = getSpecialtyMeta(d.specialty);
            return (
              <div key={d.id} className={`relative flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border bg-card p-4 shadow-card ${meta.card}`}>
                <div className={`absolute inset-y-0 left-0 w-1 ${meta.solid}`} aria-hidden />
                {d.cover_image_url ? (
                  <img src={d.cover_image_url} alt="" className="h-16 w-16 rounded-xl object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-muted/40 flex items-center justify-center">
                    <Brain className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-[200px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <SpecialtyBadge specialty={d.specialty} />
                    <Badge variant="outline">{d.card_count} cards</Badge>
                    {d.published ? (
                      <Badge className="bg-success/15 text-success hover:bg-success/15">Publicado</Badge>
                    ) : (
                      <Badge variant="outline" className="border-warning/30 text-warning">Rascunho</Badge>
                    )}
                  </div>
                  <div className="mt-1 font-display text-lg font-semibold">{d.title}</div>
                  {d.topic && <div className="text-xs text-muted-foreground">{d.topic}</div>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to="/app/admin/flashcards/$id" params={{ id: d.id }}>
                    <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /> Editar</Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => togglePublish(d)}>
                    {d.published ? <><EyeOff className="h-4 w-4" /> Despublicar</> : <><Eye className="h-4 w-4" /> Publicar</>}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => remove(d)} title="Excluir">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
