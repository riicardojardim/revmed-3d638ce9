import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Copy, Users, Play, ArrowRight, Crown, Stethoscope, UserRound, ClipboardCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/use-subscription";

export const Route = createFileRoute("/app/sala/$code/")({
  component: RoomPage,
});

type Room = {
  id: string; code: string; host_id: string; station_id: string;
  station_title: string; status: string; mode: string; started_at: string | null;
};
type Participant = { id: string; user_id: string; role: string; joined_at: string };

const ROLE_CARDS = [
  {
    role: "candidato",
    requires: "candidato" as const,
    title: "Sou candidato",
    desc: "Vou treinar a estação. Vejo o caso clínico, a tarefa e o cronômetro.",
    icon: Stethoscope,
    accent: "from-mint/20 to-medical/10",
  },
  {
    role: "paciente",
    requires: "ator" as const,
    title: "Sou paciente / ator",
    desc: "Vou interpretar o paciente seguindo o roteiro entregue pela banca.",
    icon: UserRound,
    accent: "from-rose-200/30 to-amber-100/20",
  },
  {
    role: "avaliador",
    requires: "ator" as const,
    title: "Sou médico avaliador",
    desc: "Vou corrigir o candidato pelo checklist, pontuar e dar feedback.",
    icon: ClipboardCheck,
    accent: "from-indigo-200/30 to-mint/10",
  },
] as const;

function RoomPage() {
  const { code } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [parts, setParts] = useState<Participant[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  async function load() {
    const { data: r } = await supabase.from("training_rooms").select("*").eq("code", code).maybeSingle();
    setRoom(r as Room | null);
    if (r) {
      const { data: p } = await supabase.from("training_room_participants").select("*").eq("room_id", r.id);
      setParts((p ?? []) as Participant[]);
      const ids = Array.from(new Set([(r as Room).host_id, ...(p ?? []).map((x: { user_id: string }) => x.user_id)]));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        const map: Record<string, string> = {};
        (profs ?? []).forEach((pr: { id: string; full_name: string | null }) => {
          map[pr.id] = pr.full_name ?? "Anônimo";
        });
        setNames(map);
      }
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [code]);

  useEffect(() => {
    if (!room) return;
    const ch = supabase
      .channel(`room-${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "training_room_participants", filter: `room_id=eq.${room.id}` }, load)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "training_rooms", filter: `id=eq.${room.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [room?.id]);

  const sub = useSubscription();

  function canPick(requires: "candidato" | "ator") {
    return requires === "candidato" ? sub.canBeCandidato : sub.canBeAtor;
  }

  async function pickRole(role: string, requires: "candidato" | "ator") {
    if (!room || !user) return;
    if (!canPick(requires)) {
      toast.error(
        requires === "candidato"
          ? "Seu plano não permite entrar como candidato. Faça upgrade para o plano Completo."
          : "Seu plano não permite atuar como ator/avaliador."
      );
      return;
    }
    const existing = parts.find((p) => p.user_id === user.id);
    if (existing) {
      const { error } = await supabase.from("training_room_participants").update({ role }).eq("id", existing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("training_room_participants").insert({ room_id: room.id, user_id: user.id, role });
      if (error) return toast.error(error.message);
    }
    toast.success("Você entrou como " + role);
    load();
  }

  async function startAndGo() {
    if (!room || !user) return;
    if (room.status !== "running") {
      await supabase.from("training_rooms").update({ status: "running", started_at: new Date().toISOString() }).eq("id", room.id);
    }
    const me = parts.find((p) => p.user_id === user.id);
    if (!me) return toast.error("Escolha seu papel antes de iniciar.");
    if (me.role === "paciente" || me.role === "avaliador") nav({ to: "/app/sala/$code/banca", params: { code } });
    else nav({ to: "/app/sala/$code/candidato", params: { code } });
  }

  function copyCode() {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado");
  }

  if (!room) return <div className="text-sm text-muted-foreground">Sala não encontrada ou carregando...</div>;
  const isHost = user?.id === room.host_id;
  const me = parts.find((p) => p.user_id === user?.id);
  const roleCount = (r: string) => parts.filter((p) => p.role === r).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/app/treinar" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
      <div className="rounded-3xl border border-border bg-gradient-hero p-6 text-white shadow-elegant">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-white/60">
          <span>Sala · Modo {room.mode}</span>
          <span className="inline-block h-1 w-1 rounded-full bg-white/40" />
          <span>{room.status === "running" ? "Em andamento" : "Aguardando"}</span>
        </div>
        <h1 className="mt-1 font-display text-2xl font-bold">{room.station_title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="rounded-xl bg-white/10 px-4 py-3 font-mono text-xl font-bold tracking-widest">{room.code}</div>
          <Button variant="outline" size="sm" onClick={copyCode} className="border-white/20 bg-white/10 text-white hover:bg-white/20">
            <Copy className="mr-1 h-4 w-4" /> Copiar código
          </Button>
        </div>
      </div>

      {sub.plan && !sub.isPrivileged && (
        <div className={`rounded-2xl border p-4 text-sm ${sub.plan.expired ? "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/30" : "border-mint/40 bg-mint/5"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-semibold">Plano {sub.plan.name}</span>
              {sub.plan.slug === "free" && sub.daysLeft !== null && !sub.plan.expired && (
                <span className="ml-2 text-xs">· {sub.daysLeft} {sub.daysLeft === 1 ? "dia restante" : "dias restantes"} do teste</span>
              )}
              {sub.plan.expired && <span className="ml-2 text-xs">· expirado</span>}
            </div>
            {(sub.plan.slug === "free" || sub.plan.expired) && (
              <Link to="/" className="text-xs font-semibold text-medical hover:underline">Ver planos →</Link>
            )}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-display text-lg font-bold">Escolha seu papel</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Você verá apenas o conteúdo do seu papel — assim a simulação fica realista.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {ROLE_CARDS.map((c) => {
            const isMe = me?.role === c.role;
            const count = roleCount(c.role);
            const locked = !canPick(c.requires);
            return (
              <button key={c.role} onClick={() => pickRole(c.role, c.requires)}
                disabled={locked}
                className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all ${
                  locked ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5"
                } ${
                  isMe ? "border-mint bg-mint/5 shadow-elegant" : "border-border bg-card hover:border-mint/40 hover:shadow-card"
                }`}>
                <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${c.accent} opacity-60`} />
                <c.icon className="h-7 w-7 text-mint" />
                <div className="mt-4 font-display text-lg font-bold">{c.title}</div>
                <div className="mt-2 text-sm text-muted-foreground">{c.desc}</div>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{count} na sala</span>
                  {locked ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                      <Lock className="h-3 w-3" /> Bloqueado pelo plano
                    </span>
                  ) : isMe ? (
                    <span className="rounded-full bg-mint px-2 py-0.5 font-medium text-night">Selecionado</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4 text-mint" /> Participantes
        </div>
        <ul className="mt-3 space-y-2">
          <li className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <span className="inline-flex items-center gap-2"><Crown className="h-4 w-4 text-amber-500" /> {names[room.host_id] ?? "Host"}</span>
            <span className="text-xs text-muted-foreground">organizador</span>
          </li>
          {parts.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span>{names[p.user_id] ?? p.user_id.slice(0, 8)}</span>
              <span className="text-xs text-muted-foreground">{p.role}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        {isHost ? (
          <Button variant="hero" className="flex-1" onClick={startAndGo}>
            <Play className="mr-1 h-4 w-4" /> {room.status === "running" ? "Entrar na estação" : "Iniciar estação"}
          </Button>
        ) : me ? (
          room.status === "running" ? (
            <Button variant="hero" className="flex-1" onClick={startAndGo}>
              Entrar como {me.role} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <div className="flex-1 rounded-xl border border-dashed border-border bg-card p-4 text-center text-sm text-muted-foreground">
              Aguardando o organizador iniciar...
            </div>
          )
        ) : (
          <div className="flex-1 rounded-xl border border-dashed border-border bg-card p-4 text-center text-sm text-muted-foreground">
            Escolha um papel para entrar.
          </div>
        )}
      </div>
    </div>
  );
}
