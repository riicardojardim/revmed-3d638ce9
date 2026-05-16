import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

export const Route = createFileRoute("/app/admin/planos")({
  component: AdminPlans,
});

type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  active: boolean;
  features: unknown;
};

function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("plans").select("*").order("price_cents");
    setPlans((data ?? []) as Plan[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(p: Plan) {
    const { error } = await supabase.from("plans").update({
      name: p.name,
      description: p.description,
      price_cents: p.price_cents,
      active: p.active,
    }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Plano atualizado");
    load();
  }

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {plans.map((p) => (
        <div key={p.id} className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <CreditCard className="h-5 w-5 text-mint" />
            <span className="text-xs text-muted-foreground">{p.slug}</span>
          </div>
          <input
            value={p.name}
            onChange={(e) => setPlans((cur) => cur.map((x) => x.id === p.id ? { ...x, name: e.target.value } : x))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-display text-lg font-bold"
          />
          <textarea
            value={p.description ?? ""}
            onChange={(e) => setPlans((cur) => cur.map((x) => x.id === p.id ? { ...x, description: e.target.value } : x))}
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <label className="block text-xs text-muted-foreground">Preço (centavos)
            <input
              type="number" value={p.price_cents}
              onChange={(e) => setPlans((cur) => cur.map((x) => x.id === p.id ? { ...x, price_cents: Number(e.target.value) } : x))}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={p.active}
              onChange={(e) => setPlans((cur) => cur.map((x) => x.id === p.id ? { ...x, active: e.target.checked } : x))} />
            Ativo
          </label>
          <Button variant="hero" className="w-full" onClick={() => save(p)}>Salvar</Button>
        </div>
      ))}
    </div>
  );
}
