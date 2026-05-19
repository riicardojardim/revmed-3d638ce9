import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Flame,
  
  Sparkles,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { SpecialtyMedals, NOTA_DE_CORTE, NOTA_DE_CORTE_EDICAO } from "@/components/SpecialtyMedals";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
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

const SPECIALTIES: { key: string; label: string; color: string; aliases?: string[] }[] = [
  { key: "Clínica Médica", label: "Clínica", color: "text-blue-400" },
  { key: "Cirurgia", label: "Cirurgia", color: "text-violet-400" },
  { key: "Pediatria", label: "Pediatria", color: "text-amber-400" },
  { key: "Ginecologia e Obstetrícia", label: "GO", color: "text-pink-400" },
  {
    key: "Medicina de Família e Comunidade",
    label: "MFC",
    color: "text-emerald-400",
    aliases: ["Preventiva", "Medicina Preventiva", "Saúde Coletiva"],
  },
];

const CATEGORIES = ["Anamnese", "E. Físico", "Lab", "Imagem", "Dx", "Conduta"];

function Dashboard() {
  const { user, profile } = useAuth();
  const { plan, isPrivileged, isCompletoLike, isAtorOnly, loading: subLoading } = useSubscription();
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [ranking, setRanking] = useState<{ name: string; score: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const isAtorPlan = isAtorOnly;
  const isCompleto = isCompletoLike;

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

  const specialtyRadar = useMemo(() => {
    return SPECIALTIES.map((s) => {
      const keys = [s.key, ...(s.aliases ?? [])];
      let sum = 0;
      let n = 0;
      keys.forEach((k) => {
        const cur = stats.bySpec.get(k);
        if (cur) {
          sum += cur.sum;
          n += cur.n;
        }
      });
      const avg = n ? sum / n : 0;
      return { category: s.label, value: Number(avg.toFixed(2)) };
    });
  }, [stats.bySpec]);

  const displayName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "estudante";
  const titlePrefix = profile?.title && profile.title !== "Sem título" ? `${profile.title} ` : "";
  const greetingName = `${titlePrefix}${displayName}`;

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
    <div className="mx-auto max-w-7xl space-y-6">


      {/* Top row: welcome + stats */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-mint/5 p-6 shadow-card">
          <h2 className="font-display text-xl font-bold md:text-2xl">
            <span className="text-mint">{profile?.title && profile.title !== "Sem título" ? greetingName : `Olá, ${displayName}`}</span>{" "}
            <span className="text-foreground">sua média geral está em </span>
            <span className="text-mint">{stats.avg.toFixed(1)}</span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Com nossos treinamentos vamos trabalhar para manter sua média sempre acima da última nota de corte do Revalida.
          </p>
          <div className="mt-5">
            <SpecialtyMedals stats={stats.bySpec} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-mint" />
            <h3 className="font-display font-bold">Minhas Estatísticas Gerais</h3>
          </div>
          <div className="mt-2 flex items-baseline justify-between border-b border-border pb-3 text-xs text-muted-foreground">
            <span>Tempo de treinamento: {Math.round(stats.total * 10)} min</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-b border-border pb-3">
            <div className="font-display text-4xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Estações</div>
          </div>
          <ul className="mt-3 space-y-2.5 text-sm">
            {SPECIALTIES.map((s) => {
              const keys = [s.key, ...(s.aliases ?? [])];
              let sum = 0;
              let n = 0;
              keys.forEach((k) => {
                const d = stats.bySpec.get(k);
                if (d) { sum += d.sum; n += d.n; }
              });
              const avg = n ? sum / n : 0;
              return (
                <li key={s.key} className="space-y-0.5">
                  <div className={`font-semibold ${s.color}`}>{s.label}</div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Média: {avg.toFixed(1)}</span>
                    <span>Est.: {n}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Middle row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-mint" />
            <h3 className="font-display font-bold">Podemos melhorar</h3>
            <span className="ml-1 rounded-md bg-mint/20 px-1.5 py-0.5 text-xs font-bold text-medical">0</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Dar uma atenção especial.</p>
          <div className="mt-4 rounded-xl border border-dashed border-border bg-background/50 p-4 text-center text-sm text-muted-foreground">
            Nenhum tema na zona de risco.
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-mint" />
            <h3 className="font-display font-bold">Desempenho por especialidades</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Estude com mais foco.</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={specialtyRadar}>
                <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
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
          <div className="mt-2 flex justify-center gap-6 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-mint" /> Checklists</span>
          </div>
        </div>
      </div>

      {/* Ritmo row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <RitmoCard title="Ritmo de Treinamento" value={String(last7.reduce((s, d) => s + d.count, 0))} suffix="" data={last7} dataKey="count" />
        <RitmoCard title="Ritmo de Notas" value={`${stats.avg ? Math.round((stats.avg / 10) * 100) : 0}%`} suffix="%" data={last7} dataKey="avg" />

        <DailyMotivationCard userId={user?.id ?? "anon"} />
      </div>

      {/* Ranking row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-mint" />
            <h3 className="font-display font-bold">Ranking - Top 5</h3>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2 text-right">Pontos</th>
                  <th className="px-3 py-2 text-right">Troféu</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">Carregando...</td></tr>
                ) : ranking.length === 0 ? (
                  <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">Sem dados.</td></tr>
                ) : ranking.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{i + 1}º {r.name}</td>
                    <td className="px-3 py-2 text-right font-display font-bold">{r.score}</td>
                    <td className="px-3 py-2 text-right">
                      {i === 0 && <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400">OURO</span>}
                      {i === 1 && <span className="rounded-md bg-slate-400/20 px-2 py-0.5 text-xs font-bold text-slate-300">PRATA</span>}
                      {i === 2 && <span className="rounded-md bg-orange-500/20 px-2 py-0.5 text-xs font-bold text-orange-400">BRONZE</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-mint" />
            <h3 className="font-display font-bold">Desempenho Geral por Mês</h3>
          </div>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7}>
                <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="avg" fill="hsl(var(--mint, 160 80% 50%))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

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
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-mint">{title}</h3>
        <span className="text-xs text-muted-foreground">Últimos 7 dias</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-4xl font-bold">{value}</span>
        <span className="text-xs text-emerald-400">Média: {data.length ? (data.reduce((s, d) => s + d[dataKey], 0) / data.length).toFixed(1) : 0}</span>
      </div>
      <div className="mt-2 h-16">
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

const MOTIVATIONS: { title: string; sub: string }[] = [
  { title: "“Tudo posso naquele que me fortalece.”", sub: "Filipenses 4:13" },
  { title: "“O Senhor é o meu pastor, nada me faltará.”", sub: "Salmos 23:1" },
  { title: "“Posso todas as coisas em Cristo que me fortalece.”", sub: "Filipenses 4:13" },
  { title: "“Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.”", sub: "Salmos 37:5" },
  { title: "“Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus.”", sub: "Isaías 41:10" },
  { title: "“Os que esperam no Senhor renovarão as suas forças.”", sub: "Isaías 40:31" },
  { title: "“Buscai primeiro o Reino de Deus e a sua justiça, e tudo o mais vos será acrescentado.”", sub: "Mateus 6:33" },
  { title: "“Bem-aventurados os que choram, porque serão consolados.”", sub: "Mateus 5:4" },
  { title: "“Aquietai-vos e sabei que eu sou Deus.”", sub: "Salmos 46:10" },
  { title: "“O Senhor é a minha luz e a minha salvação; a quem temerei?”", sub: "Salmos 27:1" },
  { title: "“Lança o teu cuidado sobre o Senhor, e ele te susterá.”", sub: "Salmos 55:22" },
  { title: "“Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.”", sub: "Provérbios 3:5" },
  { title: "“Sede fortes e corajosos; não temais.”", sub: "Deuteronômio 31:6" },
  { title: "“Tudo tem o seu tempo determinado.”", sub: "Eclesiastes 3:1" },
  { title: "“A alegria do Senhor é a vossa força.”", sub: "Neemias 8:10" },
  { title: "“O amor é paciente, o amor é bondoso.”", sub: "1 Coríntios 13:4" },
  { title: "“Mas os que esperam no Senhor renovarão as forças, subirão com asas como águias.”", sub: "Isaías 40:31" },
  { title: "“Deus é o nosso refúgio e fortaleza, socorro bem presente nas tribulações.”", sub: "Salmos 46:1" },
  { title: "“Não andeis ansiosos por coisa alguma.”", sub: "Filipenses 4:6" },
  { title: "“E conhecereis a verdade, e a verdade vos libertará.”", sub: "João 8:32" },
  { title: "“Pedi, e dar-se-vos-á; buscai, e encontrareis.”", sub: "Mateus 7:7" },
  { title: "“O Senhor pelejará por vós, e vós vos calareis.”", sub: "Êxodo 14:14" },
  { title: "“Eu sou o caminho, a verdade e a vida.”", sub: "João 14:6" },
  { title: "“Tudo coopera para o bem daqueles que amam a Deus.”", sub: "Romanos 8:28" },
  { title: "“Sê forte e corajoso; o Senhor, teu Deus, é contigo por onde quer que andares.”", sub: "Josué 1:9" },
  { title: "“Lâmpada para os meus pés é a tua palavra, e luz para o meu caminho.”", sub: "Salmos 119:105" },
  { title: "“Onde está o teu tesouro, aí estará também o teu coração.”", sub: "Mateus 6:21" },
  { title: "“Bem-aventurado o homem que confia no Senhor.”", sub: "Jeremias 17:7" },
  { title: "“Se Deus é por nós, quem será contra nós?”", sub: "Romanos 8:31" },
  { title: "“A paz vos deixo, a minha paz vos dou.”", sub: "João 14:27" },
  { title: "“Examinai tudo. Retende o bem.”", sub: "1 Tessalonicenses 5:21" },
];

function pickDailyIndex(seed: string, len: number) {
  // Hash (FNV-1a) com base no userId + data local (yyyy-mm-dd)
  const today = new Date();
  const day = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const str = `${seed}|${day}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h % len;
}

function DailyMotivationCard({ userId }: { userId: string }) {
  const m = useMemo(() => MOTIVATIONS[pickDailyIndex(userId, MOTIVATIONS.length)], [userId]);
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-mint/10 via-card to-card p-5 shadow-card">
      <h3 className="font-display font-bold text-mint">Versículo do dia</h3>
      <p className="mt-3 text-sm font-medium text-foreground">{m.title}</p>
      <p className="mt-2 text-xs text-muted-foreground">{m.sub}</p>
    </div>
  );
}
