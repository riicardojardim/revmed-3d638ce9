import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookPlus, ClipboardList, ClipboardEdit, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/professor/")({
  component: ProfessorDashboard,
});

function ProfessorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ stations: 0, published: 0, pending: 0, reviewed: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [all, pub, pending, reviewed] = await Promise.all([
        supabase.from("custom_stations").select("id", { count: "exact", head: true }).eq("created_by", user.id),
        supabase.from("custom_stations").select("id", { count: "exact", head: true }).eq("created_by", user.id).eq("published", true),
        supabase.from("attempts").select("id", { count: "exact", head: true }).is("reviewed_at", null),
        supabase.from("attempts").select("id", { count: "exact", head: true }).eq("reviewed_by", user.id),
      ]);
      setStats({
        stations: all.count ?? 0,
        published: pub.count ?? 0,
        pending: pending.count ?? 0,
        reviewed: reviewed.count ?? 0,
      });
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat icon={BookPlus} label="Checklists criados" value={stats.stations} />
        <Stat icon={ClipboardList} label="Publicados" value={stats.published} accent />
        <Stat icon={Users} label="Aguardando correção" value={stats.pending} />
        <Stat icon={ClipboardEdit} label="Corrigidas por você" value={stats.reviewed} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Action
          to="/app/professor/estacoes"
          title="Criar novo checklist"
          desc="Monte um caso clínico com checklist avaliativo personalizado."
          cta="Abrir editor"
        />
        <Action
          to="/app/professor/correcoes"
          title="Corrigir tentativas"
          desc="Dê feedback estruturado para as tentativas dos seus alunos."
          cta="Ver fila"
        />
      </div>
    </div>
  );
}

function Stat({
  icon: Icon, label, value, accent,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-4 w-4 text-mint" /> {label}
      </div>
      <div className={`mt-2 font-display text-3xl font-bold ${accent ? "text-medical" : ""}`}>{value}</div>
    </div>
  );
}

function Action({ to, title, desc, cta }: { to: string; title: string; desc: string; cta: string }) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
      <div className="font-display text-xl font-bold">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      <Link to={to} className="mt-4 inline-block">
        <Button variant="hero">{cta}</Button>
      </Link>
    </div>
  );
}
