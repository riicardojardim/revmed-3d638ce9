import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/professor/resumos")({
  component: ProfessorSummaries,
});

type Summary = {
  id: string; title: string; specialty: string; topic: string | null;
  content_md: string; read_time_minutes: number; published: boolean;
};

const empty = { title: "", specialty: "Clínica Médica", topic: "", content_md: "", read_time_minutes: 5, published: false };

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
    if (!form.title.trim() || !form.content_md.trim()) return toast.error("Preencha título e conteúdo.");
    setSaving(true);
    const { error } = await supabase.from("summaries").insert({ ...form, created_by: user.id });
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
  async function remove(id: string) {
    if (!confirm("Excluir resumo?")) return;
    const { error } = await supabase.from("summaries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold">Meus resumos</h2>
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum resumo ainda.</p>}
        {items.map((s) => (
          <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{s.specialty}{s.topic ? ` · ${s.topic}` : ""} · {s.read_time_minutes} min</div>
                <div className="mt-1 font-medium">{s.title}</div>
                <div className="mt-1 text-sm text-muted-foreground line-clamp-2">{s.content_md}</div>
              </div>
              <div className="flex shrink-0 gap-1">
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
      <aside className="rounded-2xl border border-border bg-card p-4 space-y-3 lg:sticky lg:top-20 h-fit">
        <h3 className="font-display font-bold">Novo resumo</h3>
        <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Título"
          value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Especialidade"
          value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
        <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Tópico (opcional)"
          value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
        <input type="number" min={1} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={form.read_time_minutes}
          onChange={(e) => setForm({ ...form, read_time_minutes: Number(e.target.value) })} />
        <textarea rows={8} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Conteúdo em Markdown"
          value={form.content_md} onChange={(e) => setForm({ ...form, content_md: e.target.value })} />
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
