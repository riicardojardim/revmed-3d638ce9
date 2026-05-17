import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  MessageCircle,
  Sparkles,
  Trophy,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { AtorDashboard } from "@/components/AtorDashboard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Estação Revalida" }] }),
});

type AttemptRow = {
  id: string;
  specialty: string | null;
  station_title: string | null;
  score: number;
  created_at: string;
};

const SPECIALTIES: { key: string; label: string; color: string }[] = [
  { key: "Cirurgia", label: "Cirurgia", color: "text-violet-400" },
  { key: "Clínica Médica", label: "Clínica", color: "text-sky-400" },
  { key: "Ginecologia e Obstetrícia", label: "GO", color: "text-pink-400" },
  { key: "Pediatria", label: "Pediatria", color: "text-emerald-400" },
  { key: "Medicina Preventiva", label: "Preventiva", color: "text-amber-400" },
  { key: "Saúde Mental", label: "INEP 2020/2025.1", color: "text-rose-400" },
];

const CATEGORIES = ["Anamnese", "E. Físico", "Lab", "Imagem", "Dx", "Conduta"];

function Dashboard() {
  const { user, profile } = useAuth();
  const { plan, isPrivileged, loading: subLoading } = useSubscription();
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [ranking, setRanking] = useState<{ name: string; score: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const isAtorPlan = plan?.slug === "ator" && !plan.expired;
  const isCompleto = isPrivileged || (!!plan && !plan.expired && plan.slug === "completo");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      supabase
        .from("attempts")
        .select("id, specialty, station_title, score, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("attempts")
        .select("user_id, score")
        .order("score", { ascending: false })
        .limit(200),
    ]).then(async ([attemptsRes, rankRes]) => {
      setAttempts((attemptsRes.data ?? []) as AttemptRow[]);
      const byUser = new Map<string, { sum: number; n: number }>();
      ((rankRes.data ?? []) as { user_id: string; score: number }[]).forEach((r) => {
        const cur = byUser.get(r.user_id) ?? { sum: 0, n: 0 };
        cur.sum += Number(r.score) || 0;
        cur.n += 1;
        byUser.set(r.user_id, cur);
      });
      const top = Array.from(byUser.entries())
        .map(([id, v]) => ({ id, score: v.sum / v.n }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      if (top.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", top.map((t) => t.id));
        const nameById = new Map((profs ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "—"]));
        setRanking(top.map((t) => ({ name: nameById.get(t.id) ?? "—", score: Number(t.score.toFixed(2)) })));
      } else {
        setRanking([]);
      }
      setLoading(false);
    });
  }, [user]);

  const stats = useMemo(() => {
    const bySpec = new Map<string, { sum: number; n: number }>();
    attempts.forEach((a) => {
      const k = a.specialty ?? "Outras";
      const cur = bySpec.get(k) ?? { sum: 0, n: 0 };
      cur.sum += Number(a.score) || 0;
      cur.n += 1;
      bySpec.set(k, cur);
    });
    const total = attempts.length;
    const avg = total ? attempts.reduce((s, a) => s + Number(a.score), 0) / total : 0;
    return { bySpec, total, avg };
  }, [attempts]);

  // Last 7 days ritmo
  const last7 = useMemo(() => {
    const days: { day: string; count: number; avg: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const inDay = attempts.filter((a) => {
        const t = new Date(a.created_at).getTime();
        return t >= d.getTime() && t < next.getTime();
      });
      const avg = inDay.length ? inDay.reduce((s, a) => s + Number(a.score), 0) / inDay.length : 0;
      days.push({ day: String(d.getDate()).padStart(2, "0"), count: inDay.length, avg: Number(avg.toFixed(2)) });
    }
    return days;
  }, [attempts]);

  const categoryRadar = useMemo(
    () => CATEGORIES.map((c) => ({ category: c, value: 0 })),
    [],
  );

  const displayName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "estudante";

  if (subLoading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }
  if (isAtorPlan) return <AtorDashboard />;
  if (!isCompleto) {
    // free user — keep simple welcome
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Bem-vindo(a)</p>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Olá, {displayName}!</h1>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <Sparkles className="mx-auto h-8 w-8 text-mint" />
          <h2 className="mt-3 font-display text-xl font-bold">Desbloqueie o plano Completo</h2>
          <p className="mt-2 text-sm text-muted-foreground">Acesso a 690+ checklists, 570+ resumos, 400+ flashcards, cronograma e mais.</p>
          <Link to="/app/perfil" className="mt-5 inline-block">
            <Button variant="hero">Ver planos</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      {/* Magazine cover hero */}
      <header className="grid grid-cols-12 gap-6 border-b hairline pb-10">
        <div className="col-span-12 lg:col-span-8">
          <div className="text-eyebrow flex items-center gap-2">
            <span className="h-px w-8 bg-mint" />
            Edição diária · Revalida 2026.1
          </div>
          <h1 className="mt-4 font-editorial text-[44px] leading-[0.92] tracking-[-0.03em] md:text-[68px]">
            <span className="italic font-light text-muted-foreground">Bem-vindo,</span>{" "}
            <span className="font-medium">Dr(a). {displayName}.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Constância vence talento. Vamos manter sua média{" "}
            <span className="text-foreground font-medium">sempre acima da nota de corte</span> com
            treinamento dirigido e feedback inteligente.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link to="/app/estacoes"><Button variant="hero" size="sm">Treinar agora</Button></Link>
            <Link to="/app/flashcards"><Button variant="outline" size="sm">Flashcards do dia</Button></Link>
          </div>
        </div>

        {/* Giant numeral — média */}
        <div className="col-span-12 lg:col-span-4">
          <div className="card-premium relative h-full overflow-hidden p-6">
            <div aria-hidden className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-mint/10 blur-2xl" />
            <div className="relative">
              <div className="text-eyebrow-serif">Sua média geral</div>
              <div className="mt-2 flex items-end gap-2">
                <span className="editorial-number text-[140px] text-foreground">
                  {stats.avg.toFixed(1).split(".")[0]}
                </span>
                <span className="editorial-number text-5xl text-mint pb-3">
                  .{stats.avg.toFixed(1).split(".")[1] ?? "0"}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t hairline pt-3 text-xs text-muted-foreground">
                <span>{stats.total} estações treinadas</span>
                <span className="font-mono text-mint">↗</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Specialty roll */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-eyebrow">Por especialidade</div>
            <h2 className="mt-1 font-editorial text-2xl italic font-light">Onde você está pisando firme</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {SPECIALTIES.map((s) => {
            const d = stats.bySpec.get(s.key);
            const avg = d ? d.sum / d.n : 0;
            return (
              <div key={s.key} className="card-premium hover:card-premium-hover p-4">
                <div className={`text-eyebrow text-[10px] ${s.color}`}>{s.label}</div>
                <div className="mt-3 editorial-number text-3xl">{avg.toFixed(1)}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{d?.n ?? 0} est.</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Ritmo + motivação */}
      <section className="grid gap-5 lg:grid-cols-3">
        <RitmoCard title="Ritmo de Treinamento" value={String(last7.reduce((s, d) => s + d.count, 0))} data={last7} dataKey="count" />
        <RitmoCard title="Ritmo de Notas" value={`${stats.avg ? Math.round((stats.avg / 10) * 100) : 0}%`} data={last7} dataKey="avg" />

        <div className="card-premium relative overflow-hidden p-6">
          <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-mint/10 via-transparent to-transparent" />
          <div className="relative">
            <div className="text-eyebrow-serif">Editorial</div>
            <p className="mt-3 font-editorial text-xl italic leading-snug">
              "A aprovação é construída com{" "}
              <span className="not-italic font-medium text-mint">constância</span>,
              não com perfeição."
            </p>
            <div className="mt-4 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Estação Revalida
            </div>
          </div>
        </div>
      </section>

      {/* Radar + ranking */}
      <section className="grid gap-5 lg:grid-cols-12">
        <div className="card-premium p-6 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-eyebrow">Diagnóstico</div>
              <h3 className="mt-1 font-editorial text-2xl italic font-light">Desempenho por categorias</h3>
            </div>
            <TrendingUp className="h-5 w-5 text-mint" strokeWidth={1.7} />
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={categoryRadar}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Radar
                  dataKey="value"
                  stroke="hsl(var(--mint, 160 80% 50%))"
                  fill="hsl(var(--mint, 160 80% 50%))"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-premium p-6 lg:col-span-5">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-mint" strokeWidth={1.7} />
            <div>
              <div className="text-eyebrow">Liderança</div>
              <h3 className="mt-1 font-editorial text-2xl italic font-light">Top 5</h3>
            </div>
          </div>
          <ol className="mt-5 divide-y hairline border-y hairline">
            {loading ? (
              <li className="py-6 text-center text-sm text-muted-foreground">Carregando...</li>
            ) : ranking.length === 0 ? (
              <li className="py-6 text-center text-sm text-muted-foreground">Sem dados ainda.</li>
            ) : ranking.map((r, i) => (
              <li key={i} className="flex items-center gap-4 py-3">
                <span className="font-editorial text-2xl text-mint/70 tabular-nums w-8">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-sm font-medium truncate">{r.name}</span>
                <span className="font-editorial text-lg">{r.score}</span>
                {i === 0 && <span className="text-[9px] uppercase tracking-[0.18em] text-amber-500 font-semibold">Ouro</span>}
                {i === 1 && <span className="text-[9px] uppercase tracking-[0.18em] text-slate-400 font-semibold">Prata</span>}
                {i === 2 && <span className="text-[9px] uppercase tracking-[0.18em] text-orange-500 font-semibold">Bronze</span>}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <a
        href="https://wa.me/5500000000000"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-24 right-6 z-40 hidden h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-elegant transition-transform hover:scale-110 lg:flex"
        aria-label="Suporte WhatsApp"
      >
        <MessageCircle className="h-5 w-5" />
      </a>
    </div>
  );
}

function RitmoCard({
  title,
  value,
  data,
  dataKey,
}: {
  title: string;
  value: string;
  suffix?: string;
  data: { day: string; count: number; avg: number }[];
  dataKey: "count" | "avg";
}) {
  return (
    <div className="card-premium hover:card-premium-hover p-6">
      <div className="flex items-center justify-between">
        <div className="text-eyebrow">{title}</div>
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">7d</span>
      </div>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="editorial-number text-5xl">{value}</span>
        <span className="text-xs text-mint">Méd: {data.length ? (data.reduce((s, d) => s + d[dataKey], 0) / data.length).toFixed(1) : 0}</span>
      </div>
      <div className="mt-3 h-14">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Bar dataKey={dataKey} fill="hsl(var(--mint, 160 80% 50%))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
