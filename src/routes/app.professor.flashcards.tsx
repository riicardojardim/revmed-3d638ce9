import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/professor/flashcards")({
  component: ProfessorFlashcards,
});

type Card = {
  id: string; specialty: string; topic: string | null; deck: string | null;
  front: string; back: string; published: boolean;
};

const empty = { specialty: "Clínica Médica", topic: "", deck: "", front: "", back: "", published: false };

function ProfessorFlashcards() {
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase.from("flashcards").select("*").order("created_at", { ascending: false });
    setCards((data ?? []) as Card[]);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!user) return;
    if (!form.front.trim() || !form.back.trim()) return toast.error("Preencha frente e verso.");
    setSaving(true);
    const { error } = await supabase.from("flashcards").insert({ ...form, created_by: user.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    setForm(empty);
    toast.success("Flashcard criado");
    load();
  }
  async function togglePublish(c: Card) {
    const { error } = await supabase.from("flashcards").update({ published: !c.published }).eq("id", c.id);
    if (error) return toast.error(error.message);
    load();
  }
  async function remove(id: string) {
    if (!confirm("Excluir flashcard?")) return;
    const { error } = await supabase.from("flashcards").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold">Meus flashcards</h2>
        {cards.length === 0 && <p className="text-sm text-muted-foreground">Nenhum flashcard ainda.</p>}
        {cards.map((c) => (
          <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-muted-foreground">{c.specialty}{c.topic ? ` · ${c.topic}` : ""}</div>
                <div className="mt-1 font-medium">{c.front}</div>
                <div className="mt-1 text-sm text-muted-foreground">{c.back}</div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" onClick={() => togglePublish(c)} title={c.published ? "Despublicar" : "Publicar"}>
                  {c.published ? <Eye className="h-4 w-4 text-mint" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(c.id)}>
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <aside className="rounded-2xl border border-border bg-card p-4 space-y-3 lg:sticky lg:top-20 h-fit">
        <h3 className="font-display font-bold">Novo flashcard</h3>
        <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Especialidade"
          value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
        <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Tópico (opcional)"
          value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
        <textarea rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Frente / pergunta"
          value={form.front} onChange={(e) => setForm({ ...form, front: e.target.value })} />
        <textarea rows={4} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Verso / resposta"
          value={form.back} onChange={(e) => setForm({ ...form, back: e.target.value })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
          Publicar imediatamente
        </label>
        <Button variant="hero" className="w-full" disabled={saving} onClick={create}>
          <Plus className="mr-1 h-4 w-4" /> Criar
        </Button>
      </aside>
    </div>
  );
}
