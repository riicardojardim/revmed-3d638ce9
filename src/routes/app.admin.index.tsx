import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, BookOpen, ClipboardList, Layers, CheckCircle2, FileText,
  AlertCircle, Stethoscope, Play, TrendingUp, DollarSign, UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IntroOverlay, type IntroRole } from "@/components/room/IntroOverlay";
import { useSiteSettings, refreshSiteSettings } from "@/hooks/use-site-settings";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

export const Route = createFileRoute("/app/admin/")({
  component: AdminOverview,
});

const CHART_COLORS = ["hsl(var(--mint))", "hsl(var(--medical))", "hsl(var(--primary))", "#f59e0b", "#ef4444", "#8b5cf6"];

interface PlanBucket { plan: string; count: number; price_cents: number }
interface TopStation { station_id: string; station_title: string; count: number }
interface DailyPoint { date: string; label: string; value: number }

function AdminOverview() {
  const [testRole, setTestRole] = useState<IntroRole | null>(null);
  const { settings } = useSiteSettings();
  const [variant, setVariant] = useState<"classic" | "door" | "corridor" | "xray" | "stamp" | "elevator">("classic");
  const [savingVariant, setSavingVariant] = useState(false);
  useEffect(() => {
    if (settings?.intro_animation_variant) setVariant(settings.intro_animation_variant);
  }, [settings?.intro_animation_variant]);
  async function saveVariant() {
    if (!settings?.id) return;
    setSavingVariant(true);
    const { error } = await supabase
      .from("site_settings")
      .update({ intro_animation_variant: variant })
      .eq("id", settings.id);
    setSavingVariant(false);
    if (error) return toast.error("Erro ao salvar", { description: error.message });
    await refreshSiteSettings();
    const label = variant === "door" ? "Médico abrindo a porta"
      : variant === "corridor" ? "Corredor do hospital"
      : variant === "xray" ? "Raio-X revelando"
      : variant === "stamp" ? "Carimbo AUTORIZADO"
      : variant === "elevator" ? "Elevador hospitalar"
      : "Crachá + Prontuário";
    toast.success("Animação salva", { description: label });
  }
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0, attempts: 0, attempts7: 0, attempts30: 0,
    stationsPublished: 0, stationsDraft: 0, flashcards: 0, summaries: 0,
    pendingReviews: 0, activeSubs: 0, freeUsers: 0, mrrCents: 0,
  });
  const [planBuckets, setPlanBuckets] = useState<PlanBucket[]>([]);
  const [topStations, setTopStations] = useState<TopStation[]>([]);
  const [signupSeries, setSignupSeries] = useState<DailyPoint[]>([]);
  const [attemptSeries, setAttemptSeries] = useState<DailyPoint[]>([]);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
      const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();

      const [u, aAll, a7, a30, sPub, sDraft, fc, sum, pend, subs, plans, recentAttempts, profiles30, attempts30list] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("attempts").select("id", { count: "exact", head: true }),
        supabase.from("attempts").select("id", { count: "exact", head: true }).gte("created_at", d7),
        supabase.from("attempts").select("id", { count: "exact", head: true }).gte("created_at", d30),
        supabase.from("custom_stations").select("id", { count: "exact", head: true }).eq("published", true),
        supabase.from("custom_stations").select("id", { count: "exact", head: true }).eq("published", false),
        supabase.from("flashcard_decks").select("id", { count: "exact", head: true }),
        supabase.from("summaries").select("id", { count: "exact", head: true }),
        supabase.from("attempts").select("id", { count: "exact", head: true }).eq("status", "aguardando_correcao"),
        supabase.from("user_subscriptions").select("plan_id, status").eq("status", "active"),
        supabase.from("plans").select("id, name, slug, price_cents"),
        supabase.from("attempts").select("station_id, station_title").gte("created_at", d30).limit(2000),
        supabase.from("profiles").select("created_at").gte("created_at", d30).limit(5000),
        supabase.from("attempts").select("created_at").gte("created_at", d30).limit(5000),
      ]);

      // Plan buckets + MRR
      const planMap = new Map<string, { name: string; slug: string; price_cents: number }>();
      (plans.data ?? []).forEach((p: any) => planMap.set(p.id, p));
      const buckets = new Map<string, { count: number; price_cents: number }>();
      let mrr = 0;
      let freeCount = 0;
      (subs.data ?? []).forEach((s: any) => {
        const plan = planMap.get(s.plan_id);
        const name = plan?.name ?? "Sem plano";
        const price = plan?.price_cents ?? 0;
        if (plan?.slug === "free" || price === 0) freeCount += 1;
        else mrr += price;
        const prev = buckets.get(name) ?? { count: 0, price_cents: price };
        buckets.set(name, { count: prev.count + 1, price_cents: price });
      });

      setPlanBuckets(
        Array.from(buckets, ([plan, v]) => ({ plan, count: v.count, price_cents: v.price_cents }))
          .sort((a, b) => b.count - a.count),
      );

      // Top stations
      const tops = new Map<string, { title: string; count: number }>();
      (recentAttempts.data ?? []).forEach((a: any) => {
        const key = a.station_id as string;
        const prev = tops.get(key);
        tops.set(key, { title: a.station_title ?? key, count: (prev?.count ?? 0) + 1 });
      });
      setTopStations(
        Array.from(tops, ([station_id, v]) => ({ station_id, station_title: v.title, count: v.count }))
          .sort((a, b) => b.count - a.count).slice(0, 5),
      );

      // Daily series
      const buildSeries = (rows: { created_at: string }[]) => {
        const map = new Map<string, number>();
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 86400000);
          const key = d.toISOString().slice(0, 10);
          map.set(key, 0);
        }
        rows.forEach((r) => {
          const key = r.created_at.slice(0, 10);
          if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
        });
        return Array.from(map, ([date, value]) => ({
          date, value,
          label: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        }));
      };
      setSignupSeries(buildSeries((profiles30.data ?? []) as any));
      setAttemptSeries(buildSeries((attempts30list.data ?? []) as any));

      const totalUsers = u.count ?? 0;
      const activeSubs = (subs.data ?? []).length;
      setStats({
        users: totalUsers,
        attempts: aAll.count ?? 0,
        attempts7: a7.count ?? 0,
        attempts30: a30.count ?? 0,
        stationsPublished: sPub.count ?? 0,
        stationsDraft: sDraft.count ?? 0,
        flashcards: fc.count ?? 0,
        summaries: sum.count ?? 0,
        pendingReviews: pend.count ?? 0,
        activeSubs,
        freeUsers: Math.max(totalUsers - (activeSubs - freeCount), 0),
        mrrCents: mrr,
      });

      setLoading(false);
    })();
  }, []);

  const paidVsFree = useMemo(() => {
    const paid = stats.activeSubs - planBuckets.filter((p) => p.price_cents === 0).reduce((s, p) => s + p.count, 0);
    return [
      { name: "Pagantes", value: Math.max(paid, 0) },
      { name: "Free/Trial", value: Math.max(stats.users - paid, 0) },
    ];
  }, [stats, planBuckets]);

  const fmtBRL = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const cards = [
    { label: "Usuários totais", value: stats.users, icon: Users, color: "text-medical" },
    { label: "Assinantes ativos", value: stats.activeSubs, icon: UserPlus, color: "text-mint" },
    { label: "MRR estimado", value: fmtBRL(stats.mrrCents), icon: DollarSign, color: "text-success", isText: true },
    { label: "Tentativas — 30 dias", value: stats.attempts30, icon: TrendingUp, color: "text-mint" },
    { label: "Checklists publicados", value: stats.stationsPublished, icon: CheckCircle2, color: "text-success" },
    { label: "Checklists rascunho", value: stats.stationsDraft, icon: Layers, color: "text-warning" },
    { label: "Decks de Flashcards", value: stats.flashcards, icon: BookOpen, color: "text-mint" },
    { label: "Resumos", value: stats.summaries, icon: FileText, color: "text-mint" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-mint/30 bg-mint/5 p-5 space-y-4">
        <div>
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Play className="h-4 w-4 text-mint" /> Animação de entrada da estação
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Escolha qual animação ator e candidato veem ao iniciar uma estação. O preview usa a opção selecionada abaixo.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Animação ativa</label>
            <Select value={variant} onValueChange={(v) => setVariant(v as "classic" | "door" | "corridor" | "xray" | "stamp")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Crachá + Prontuário (clássica)</SelectItem>
                <SelectItem value="door">Médico abrindo a porta</SelectItem>
                <SelectItem value="corridor">Corredor do hospital (1ª pessoa)</SelectItem>
                <SelectItem value="xray">Raio-X revelando</SelectItem>
                <SelectItem value="stamp">Carimbo "AUTORIZADO"</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={saveVariant} disabled={savingVariant || variant === (settings?.intro_animation_variant ?? "classic")}>
            {savingVariant ? "Salvando..." : "Salvar"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-1 border-t border-mint/20">
          <span className="text-xs text-muted-foreground self-center mr-1">Pré-visualizar:</span>
          <Button size="sm" variant="outline" onClick={() => setTestRole("candidato")}>
            <Play className="h-3.5 w-3.5" /> Ver como Candidato
          </Button>
          <Button size="sm" variant="outline" onClick={() => setTestRole("paciente")}>
            <Play className="h-3.5 w-3.5" /> Ver como Ator
          </Button>
        </div>
      </div>

      {testRole && (
        <IntroOverlay
          variant={variant}
          role={testRole}
          stationTitle="Estação de Teste — Dor Torácica Aguda"
          specialty="Clínica Médica"
          displayName="Dr. Teste"
          onComplete={() => setTestRole(null)}
        />
      )}

      <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <c.icon className={`h-5 w-5 ${c.color}`} />
            <div className="mt-3 text-2xl font-bold font-display">{loading ? "—" : c.value}</div>
            <div className="text-sm text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>

      {stats.pendingReviews > 0 && (
        <Link to="/app/professor/correcoes" className="block">
          <div className="flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning/5 p-5">
            <AlertCircle className="h-6 w-6 text-warning" />
            <div className="flex-1">
              <div className="font-semibold">{stats.pendingReviews} tentativa(s) aguardando correção</div>
              <div className="text-xs text-muted-foreground">Clique para abrir a fila de correções.</div>
            </div>
          </div>
        </Link>
      )}

      {/* Charts row 1: signups + attempts */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="font-display font-semibold mb-2">Novos cadastros (30 dias)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signupSeries}>
                <defs>
                  <linearGradient id="gSign" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--mint))" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="hsl(var(--mint))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--mint))" fill="url(#gSign)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="font-display font-semibold mb-2">Tentativas por dia (30 dias)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attemptSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--medical))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts row 2: plan distribution + paid vs free */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="font-display font-semibold mb-2">Distribuição de assinantes por plano</h3>
          {planBuckets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum assinante ativo ainda.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="plan" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {planBuckets.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="font-display font-semibold mb-2">Pagantes vs Free</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paidVsFree} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  <Cell fill="hsl(var(--mint))" />
                  <Cell fill="hsl(var(--muted))" />
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top stations */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-mint" /> Top 5 checklists (30 dias)
        </h3>
        {loading ? (
          <p className="mt-3 text-sm text-muted-foreground">Carregando...</p>
        ) : topStations.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Sem tentativas registradas no período.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {topStations.map((s, i) => (
              <li key={s.station_id} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2">
                <span className="text-sm">
                  <span className="mr-2 font-mono text-xs text-muted-foreground">#{i + 1}</span>
                  {s.station_title}
                </span>
                <Badge variant="outline">{s.count}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-mint" /> Pagamentos
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Gerencie assinaturas, veja receita e atribua planos manualmente.</p>
        </div>
        <Link to="/app/admin/pagamentos">
          <Button>Abrir Pagamentos</Button>
        </Link>
      </div>
    </div>
  );
}
