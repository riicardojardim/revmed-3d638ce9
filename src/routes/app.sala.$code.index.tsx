import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Users,
  Play,
  ArrowRight,
  Crown,
  Stethoscope,
  UserRound,
  ClipboardCheck,
  Lock,
  CheckCircle2,
  Circle,
  Link as LinkIcon,
  ShieldCheck,
  Clock,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/use-subscription";
import { StationIntroOverlay, INTRO_DURATION_MS, type IntroRole } from "@/components/room/StationIntroOverlay";
import { serverNow, getServerOffset } from "@/lib/serverClock";

export const Route = createFileRoute("/app/sala/$code/")({
  component: RoomPage,
});

type Room = {
  id: string;
  code: string;
  host_id: string;
  station_id: string;
  station_title: string;
  status: string;
  mode: string;
  started_at: string | null;
  starting_at: string | null;
  duration_minutes: number | null;
};
type Participant = {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  is_ready: boolean;
};

const ROLE_CARDS = [
  {
    role: "candidato",
    requires: "candidato" as const,
    title: "Sou candidato",
    desc: "Vou treinar a estação. Vejo o caso clínico, a tarefa e o cronômetro.",
    icon: Stethoscope,
  },
  {
    role: "paciente",
    requires: "ator" as const,
    title: "Sou paciente / ator",
    desc: "Vou interpretar o paciente seguindo o roteiro entregue pela banca.",
    icon: UserRound,
  },
  {
    role: "avaliador",
    requires: "ator" as const,
    title: "Sou médico avaliador",
    desc: "Vou corrigir o candidato pelo checklist, pontuar e dar feedback.",
    icon: ClipboardCheck,
  },
] as const;

function RoomPage() {
  const { code } = Route.useParams();
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [parts, setParts] = useState<Participant[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(false);

  async function load() {
    const { data: r } = await supabase
      .from("training_rooms")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    setRoom(r as Room | null);
    if (r) {
      const { data: p } = await supabase
        .from("training_room_participants")
        .select("*")
        .eq("room_id", r.id);
      setParts((p ?? []) as Participant[]);
      const ids = Array.from(
        new Set([(r as Room).host_id, ...(p ?? []).map((x: { user_id: string }) => x.user_id)]),
      );
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids);
        const map: Record<string, string> = {};
        (profs ?? []).forEach((pr: { id: string; full_name: string | null }) => {
          map[pr.id] = pr.full_name ?? "Anônimo";
        });
        setNames(map);
      }
      // tenta buscar especialidade da estação custom (station_id pode ser uuid)
      try {
        const { data: st } = await supabase
          .from("custom_stations")
          .select("specialty")
          .eq("id", (r as Room).station_id)
          .maybeSingle();
        if (st?.specialty) setSpecialty(st.specialty);
      } catch {
        /* ignore */
      }
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [code]);

  useEffect(() => {
    if (!room) return;
    const ch = supabase
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "training_room_participants",
          filter: `room_id=eq.${room.id}`,
        },
        load,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "training_rooms", filter: `id=eq.${room.id}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line
  }, [room?.id]);

  // Quando a sala vira "starting", dispara o overlay nos dois lados
  useEffect(() => {
    if (!room || !user) return;
    const me = parts.find((p) => p.user_id === user.id);
    if (room.status === "starting" && me) {
      setShowIntro(true);
    }
    // Quem chega depois (running/in_progress) pula a animação e vai direto ao papel
    if (room.status === "running" && me && !showIntro) {
      redirectByRole(me.role);
    }
    // eslint-disable-next-line
  }, [room?.status, parts, user?.id]);

  function redirectByRole(role: string) {
    if (role === "paciente" || role === "avaliador") {
      nav({ to: "/app/sala/$code/paciente", params: { code }, replace: true });
    } else if (role === "candidato") {
      nav({ to: "/app/sala/$code/candidato", params: { code }, replace: true });
    }
  }

  const sub = useSubscription();
  const isHost = user?.id === room?.host_id;
  const me = parts.find((p) => p.user_id === user?.id);

  function canPick(requires: "candidato" | "ator") {
    return requires === "candidato" ? sub.canBeCandidato : sub.canBeAtor;
  }

  async function pickRole(role: string, requires: "candidato" | "ator") {
    if (!room || !user) return;
    if (!canPick(requires)) {
      toast.error(
        requires === "candidato"
          ? "Seu plano não permite entrar como candidato."
          : "Seu plano não permite atuar como ator/avaliador.",
      );
      return;
    }
    const existing = parts.find((p) => p.user_id === user.id);
    if (existing) {
      const { error } = await supabase
        .from("training_room_participants")
        .update({ role, is_ready: false })
        .eq("id", existing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("training_room_participants")
        .insert({
          room_id: room.id,
          user_id: user.id,
          role,
          display_name: profile?.full_name ?? null,
        });
      if (error) return toast.error(error.message);
    }
    load();
  }

  async function toggleReady() {
    if (!me) return;
    await supabase
      .from("training_room_participants")
      .update({ is_ready: !me.is_ready })
      .eq("id", me.id);
  }

  async function startStation() {
    if (!room || !user || !isHost) return;
    if (!parts.some((p) => p.role === "candidato")) {
      return toast.error("Nenhum candidato na sala ainda.");
    }
    // Sincroniza o offset com o servidor e projeta started_at para o EXATO momento
    // em que a animação termina nos dois lados. Assim o cronômetro começa em "Estação iniciada".
    await getServerOffset(true);
    const startsAtIso = new Date(serverNow() + INTRO_DURATION_MS).toISOString();
    const { error } = await supabase
      .from("training_rooms")
      .update({
        status: "starting",
        starting_at: new Date(serverNow()).toISOString(),
        started_at: startsAtIso,
      })
      .eq("id", room.id);
    if (error) toast.error(error.message);
  }

  async function cancelRoom() {
    if (!room || !isHost) return;
    if (!confirm("Cancelar e fechar esta sala?")) return;
    await supabase.from("training_rooms").delete().eq("id", room.id);
    nav({ to: "/app/treinar" });
  }

  async function onIntroComplete() {
    if (!room || !user) return;
    // started_at já foi setado no startStation (projetado para este instante).
    // Só o host promove status -> running (idempotente via .eq('status','starting')).
    if (isHost && room.status === "starting") {
      await supabase
        .from("training_rooms")
        .update({ status: "running" })
        .eq("id", room.id)
        .eq("status", "starting");
    }
    const myRole = parts.find((p) => p.user_id === user.id)?.role;
    if (myRole) redirectByRole(myRole);
  }

  function copyCode() {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado");
  }

  function copyLink() {
    const url = `${window.location.origin}/app/entrar/${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  }

  const introRole: IntroRole = useMemo(() => {
    if (me?.role === "paciente") return "paciente";
    if (me?.role === "avaliador") return "avaliador";
    return "candidato";
  }, [me?.role]);

  const allReady = parts.length >= 2 && parts.every((p) => p.is_ready);
  const hasCandidate = parts.some((p) => p.role === "candidato");
  const hasActor = parts.some((p) => p.role === "paciente" || p.role === "avaliador");

  if (!room)
    return <div className="text-sm text-muted-foreground">Sala não encontrada ou carregando...</div>;

  return (
    <>
      {showIntro && user && (
        <StationIntroOverlay
          role={introRole}
          stationTitle={room.station_title}
          specialty={specialty}
          displayName={profile?.full_name ?? "Participante"}
          onComplete={onIntroComplete}
        />
      )}

      <div className="mx-auto max-w-5xl space-y-6">
        <Link to="/app/treinar" className="text-sm text-muted-foreground hover:text-foreground">
          ← Voltar
        </Link>

        {/* Header institucional */}
        <div className="relative overflow-hidden rounded-3xl border border-mint/20 bg-gradient-hero p-6 text-white shadow-elegant md:p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "linear-gradient(hsl(160 60% 60%) 1px, transparent 1px), linear-gradient(90deg, hsl(160 60% 60%) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-mint">
              <ShieldCheck className="h-3 w-3" /> Entrada da Estação
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold md:text-3xl">
              {room.station_title}
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Você está prestes a iniciar uma simulação prática no modelo Revalida.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-white/70">
              {specialty && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-mint" /> {specialty}
                </span>
              )}
              {room.duration_minutes && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> {room.duration_minutes} min
                </span>
              )}
              <span>Modo {room.mode}</span>
            </div>
          </div>
        </div>

        {/* Convite */}
        <div className="grid gap-4 md:grid-cols-[1fr,auto]">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Código da sala
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-mint/30 bg-mint/5 px-4 py-2 font-mono text-2xl font-bold tracking-[0.3em] text-foreground">
                {room.code}
              </div>
              <Button variant="outline" size="sm" onClick={copyCode}>
                <Copy className="mr-1 h-4 w-4" /> Copiar código
              </Button>
              <Button variant="outline" size="sm" onClick={copyLink}>
                <LinkIcon className="mr-1 h-4 w-4" /> Copiar link
              </Button>
            </div>
          </div>
        </div>

        {/* Aviso */}
        <div className="rounded-xl border border-mint/30 bg-mint/5 px-4 py-3 text-xs text-medical">
          Quando a estação começar, cada participante verá apenas as informações correspondentes ao
          seu papel.
        </div>

        {/* Papéis */}
        <div>
          <h2 className="font-display text-lg font-bold">Escolha seu papel</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {ROLE_CARDS.map((c) => {
              const isMe = me?.role === c.role;
              const count = parts.filter((p) => p.role === c.role).length;
              const locked = !canPick(c.requires);
              return (
                <button
                  key={c.role}
                  onClick={() => pickRole(c.role, c.requires)}
                  disabled={locked}
                  className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all ${
                    locked ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5"
                  } ${
                    isMe
                      ? "border-mint bg-mint/5 shadow-elegant"
                      : "border-border bg-card hover:border-mint/40"
                  }`}
                >
                  <c.icon className="h-7 w-7 text-mint" />
                  <div className="mt-4 font-display text-lg font-bold">{c.title}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{c.desc}</div>
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{count} na sala</span>
                    {locked ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                        <Lock className="h-3 w-3" /> Bloqueado
                      </span>
                    ) : isMe ? (
                      <span className="rounded-full bg-mint px-2 py-0.5 font-medium text-night">
                        Selecionado
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Participantes */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-mint" /> Participantes conectados
            </div>
            <div className="text-xs text-muted-foreground">
              {hasCandidate ? "✓ Candidato" : "Aguardando candidato"} ·{" "}
              {hasActor ? "✓ Ator" : "Aguardando ator"}
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            <li className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <span className="inline-flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" /> {names[room.host_id] ?? "Host"}
              </span>
              <span className="text-xs text-muted-foreground">organizador</span>
            </li>
            {parts.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="inline-flex items-center gap-2">
                  {p.is_ready ? (
                    <CheckCircle2 className="h-4 w-4 text-mint" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  {names[p.user_id] ?? p.user_id.slice(0, 8)}
                </span>
                <span className="text-xs capitalize text-muted-foreground">
                  {p.role} · {p.is_ready ? "pronto" : "aguardando"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-2">
          {me && (
            <Button
              variant={me.is_ready ? "outline" : "default"}
              onClick={toggleReady}
              className="flex-1 md:flex-none"
            >
              {me.is_ready ? (
                <>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Pronto
                </>
              ) : (
                "Estou pronto"
              )}
            </Button>
          )}

          {isHost ? (
            <>
              <Button
                variant="hero"
                className="flex-1"
                onClick={startStation}
                disabled={!hasCandidate || room.status === "starting"}
              >
                <Play className="mr-1 h-4 w-4" />
                {room.status === "starting" ? "Iniciando..." : "Iniciar estação"}
                {allReady && <span className="ml-2 text-xs opacity-80">(todos prontos)</span>}
              </Button>
              <Button variant="outline" onClick={cancelRoom}>
                <X className="mr-1 h-4 w-4" /> Cancelar sala
              </Button>
            </>
          ) : me ? (
            <div className="flex-1 rounded-xl border border-dashed border-border bg-card p-3 text-center text-sm text-muted-foreground">
              <ArrowRight className="mr-1 inline h-4 w-4" /> Aguardando o organizador iniciar...
            </div>
          ) : (
            <div className="flex-1 rounded-xl border border-dashed border-border bg-card p-3 text-center text-sm text-muted-foreground">
              Escolha um papel para entrar.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
