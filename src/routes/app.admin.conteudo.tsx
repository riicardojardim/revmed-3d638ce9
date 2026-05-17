import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, FileText, Eye, EyeOff, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";

export const Route = createFileRoute("/app/admin/conteudo")({
  component: AdminContent,
});

interface Flashcard { id: string; front: string; specialty: string; published: boolean; created_at: string }
interface Summary { id: string; title: string; specialty: string; published: boolean; created_at: string }

function AdminContent() {
  const [tab, setTab] = useState("flashcards");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: fc }, { data: sm }] = await Promise.all([
      supabase.from("flashcards").select("id, front, specialty, published, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("summaries").select("id, title, specialty, published, created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    setFlashcards((fc ?? []) as Flashcard[]);
    setSummaries((sm ?? []) as Summary[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function togglePub(table: "flashcards" | "summaries", id: string, published: boolean) {
    const { error } = await supabase.from(table).update({ published: !published } as never).eq("id", id);
    if (error) return toast.error("Falha", { description: error.message });
    toast.success(published ? "Despublicado" : "Publicado");
    void load();
  }
  async function remove(table: "flashcards" | "summaries", id: string) {
    if (!confirm("Excluir este item?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error("Falha", { description: error.message });
    toast.success("Excluído");
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Conteúdo extra</h2>
          <p className="text-sm text-muted-foreground">Modere flashcards, resumos e visualize feedbacks dos usuários.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/professor/flashcards"><Button variant="outline" size="sm"><ExternalLink className="h-4 w-4" /> Criar flashcard</Button></Link>
          <Link to="/app/professor/resumos"><Button variant="outline" size="sm"><ExternalLink className="h-4 w-4" /> Criar resumo</Button></Link>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="flashcards"><BookOpen className="h-4 w-4" /> Flashcards ({flashcards.length})</TabsTrigger>
          <TabsTrigger value="summaries"><FileText className="h-4 w-4" /> Resumos ({summaries.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="flashcards" className="mt-4">
          {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : flashcards.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhum flashcard ainda.</p>
          ) : (
            <div className="grid gap-2">
              {flashcards.map((f) => (
                <div key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <SpecialtyBadge specialty={f.specialty} />
                      {f.published ? <Badge className="bg-success/15 text-success hover:bg-success/15">Publicado</Badge> : <Badge variant="outline" className="border-warning/30 text-warning">Rascunho</Badge>}
                    </div>
                    <div className="mt-1 truncate text-sm">{f.front}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => togglePub("flashcards", f.id, f.published)}>
                    {f.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => remove("flashcards", f.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="summaries" className="mt-4">
          {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : summaries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhum resumo ainda.</p>
          ) : (
            <div className="grid gap-2">
              {summaries.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-medical/30 text-medical">{s.specialty}</Badge>
                      {s.published ? <Badge className="bg-success/15 text-success hover:bg-success/15">Publicado</Badge> : <Badge variant="outline" className="border-warning/30 text-warning">Rascunho</Badge>}
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold">{s.title}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => togglePub("summaries", s.id, s.published)}>
                    {s.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => remove("summaries", s.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
