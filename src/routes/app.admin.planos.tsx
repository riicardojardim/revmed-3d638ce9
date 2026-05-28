import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreditCard, Plus, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/app/admin/planos")({
  component: AdminPlans,
});

type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tagline: string | null;
  price_cents: number;
  old_price_cents: number | null;
  discount_tag: string | null;
  cta_text: string | null;
  highlight: boolean;
  accent_color: string | null;
  active: boolean;
  trial_days: number;
  allows_candidato: boolean;
  allows_ator: boolean;
  features: string[];
};


function emptyPlan(): Omit<Plan, "id"> {
  return {
    slug: "",
    name: "",
    description: "",
    price_cents: 0,
    active: true,
    trial_days: 0,
    allows_candidato: true,
    allows_ator: true,
    features: [],
  };
}

function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("plans").select("*").order("price_cents");
    const mapped = (data ?? []).map((p) => ({
      ...p,
      features: Array.isArray(p.features) ? (p.features as string[]) : [],
    })) as Plan[];
    setPlans(mapped);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function save(p: Plan) {
    const { error } = await supabase.from("plans").update({
      name: p.name, description: p.description, price_cents: p.price_cents,
      active: p.active, trial_days: p.trial_days,
      allows_candidato: p.allows_candidato, allows_ator: p.allows_ator,
      features: p.features,
    }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Plano atualizado");
    void load();
  }

  async function remove(p: Plan) {
    if (!confirm(`Excluir plano "${p.name}"? Não funciona se houver assinaturas ligadas.`)) return;
    const { error } = await supabase.from("plans").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Plano excluído");
    void load();
  }

  async function create(p: Omit<Plan, "id">) {
    const { error } = await supabase.from("plans").insert(p);
    if (error) return toast.error(error.message);
    toast.success("Plano criado");
    setOpenNew(false);
    void load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Cadastre os planos vendidos na plataforma.</p>
        <Button variant="hero" onClick={() => setOpenNew(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo plano
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p}
              onChange={(np) => setPlans((cur) => cur.map((x) => x.id === p.id ? np : x))}
              onSave={() => save(plans.find((x) => x.id === p.id)!)}
              onDelete={() => remove(p)}
            />
          ))}
        </div>
      )}

      <NewPlanDialog open={openNew} onOpenChange={setOpenNew} onCreate={create} />
    </div>
  );
}

function PlanCard({ plan, onChange, onSave, onDelete }: {
  plan: Plan; onChange: (p: Plan) => void; onSave: () => void; onDelete: () => void;
}) {
  const [featInput, setFeatInput] = useState("");
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-mint" />
          <span className="text-xs text-muted-foreground">{plan.slug}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
      <input value={plan.name} onChange={(e) => onChange({ ...plan, name: e.target.value })}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 font-display text-lg font-bold" />
      <textarea value={plan.description ?? ""} onChange={(e) => onChange({ ...plan, description: e.target.value })}
        rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Descrição..." />
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-muted-foreground">Preço (R$)
          <input type="number" step="0.01" value={(plan.price_cents / 100).toFixed(2)}
            onChange={(e) => onChange({ ...plan, price_cents: Math.round(Number(e.target.value) * 100) })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
        </label>
        <label className="block text-xs text-muted-foreground">Trial (dias)
          <input type="number" value={plan.trial_days}
            onChange={(e) => onChange({ ...plan, trial_days: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
        </label>
      </div>
      <div className="space-y-1.5 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={plan.active}
          onChange={(e) => onChange({ ...plan, active: e.target.checked })} /> Ativo</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={plan.allows_candidato}
          onChange={(e) => onChange({ ...plan, allows_candidato: e.target.checked })} /> Permite atuar como candidato</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={plan.allows_ator}
          onChange={(e) => onChange({ ...plan, allows_ator: e.target.checked })} /> Permite atuar como ator</label>
      </div>
      <div>
        <div className="mb-1 text-xs font-semibold text-muted-foreground">Features</div>
        <ul className="space-y-1">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1 text-xs">
              <span>{f}</span>
              <button onClick={() => onChange({ ...plan, features: plan.features.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-destructive">×</button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-2">
          <input value={featInput} onChange={(e) => setFeatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && featInput.trim()) {
                onChange({ ...plan, features: [...plan.features, featInput.trim()] });
                setFeatInput("");
              }
            }}
            placeholder="Adicionar feature..."
            className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs" />
          <Button size="sm" variant="outline" onClick={() => {
            if (!featInput.trim()) return;
            onChange({ ...plan, features: [...plan.features, featInput.trim()] });
            setFeatInput("");
          }}>+</Button>
        </div>
      </div>
      <Button variant="hero" className="w-full" onClick={onSave}>Salvar</Button>
    </div>
  );
}

function NewPlanDialog({ open, onOpenChange, onCreate }: {
  open: boolean; onOpenChange: (v: boolean) => void; onCreate: (p: Omit<Plan, "id">) => void;
}) {
  const [draft, setDraft] = useState(emptyPlan());
  useEffect(() => { if (open) setDraft(emptyPlan()); }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo plano</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <label className="block text-sm">Slug (único, sem espaços)
            <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
          </label>
          <label className="block text-sm">Nome
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
          </label>
          <label className="block text-sm">Descrição
            <textarea value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={2} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm">Preço (R$)
              <input type="number" step="0.01" value={(draft.price_cents / 100).toFixed(2)}
                onChange={(e) => setDraft({ ...draft, price_cents: Math.round(Number(e.target.value) * 100) })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
            </label>
            <label className="block text-sm">Trial (dias)
              <input type="number" value={draft.trial_days}
                onChange={(e) => setDraft({ ...draft, trial_days: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="hero" onClick={() => onCreate(draft)} disabled={!draft.slug || !draft.name}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
