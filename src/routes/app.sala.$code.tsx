import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Copy, Users, Play, ArrowRight, Crown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/sala/$code")({
  component: RoomPage,
});

type Room = {
  id: string; code: string; host_id: string; station_id: string;
  station_title: string; status: string; started_at: string | null;
};
type Participant = {
  id: string; user_id: string; role: string; joined_at: string;
};

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
        (profs ?? []).forEach((pr: { id: string; full_name: string | null }) => { map[pr.id] = pr.full_name ?? "Anônimo"; });
        setNames(map);
      }
    }
  }

  // Auto-join + realtime
  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [code]);

  useEffect(() => {
    if (!room || !user) return;
    // Auto-join if not yet a participant and not host
    if (room.host_id !== user.id && !parts.find((p) => p.user_id === user.id)) {
      supabase.from("training_room_participants").insert({
        room_id: room.id, user_id: user.id, role: "candidato",
      }).then(() => load());
    }
    const ch = supabase
      .channel(`room-${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "training_room_participants", filter: `room_id=eq.${room.id}` }, load)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "training_rooms", filter: `id=eq.${room.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [room?.id, user?.id]);

  async function setRole(role: string) {
    if (!room || !user) return;
    const { error } = await supabase.from("training_room_participants")
      .update({ role }).eq("room_id", room.id).eq("user_id", user.id);
    if (error) toast.error(error.message);
  }
  async function start() {
    if (!room) return;
    await supabase.from("training_rooms").update({ status: "running", started_at: new Date().toISOString() }).eq("id", room.id);
    nav({ to: "/app/simulacao/$id", params: { id: room.station_id } });
  }
  function copyCode() {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado");
  }

  if (!room) return <div className="text-sm text-muted-foreground">Sala não encontrada ou carregando...</div>;
  const isHost = user?.id === room.host_id;
  const me = parts.find((p) => p.user_id === user?.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/app/treinar" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
      <div className="rounded-3xl border border-border bg-gradient-hero p-6 text-white shadow-elegant">
        <div className="text-xs uppercase tracking-wider text-white/60">Sala de treino</div>
        <h1 className="mt-1 font-display text-2xl font-bold">{room.station_title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="rounded-xl bg-white/10 px-4 py-3 font-mono text-xl font-bold tracking-widest">{room.code}</div>
          <Button variant="outline" size="sm" onClick={copyCode} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            <Copy className="mr-1 h-4 w-4" /> Copiar código
          </Button>
        </div>
        <p className="mt-3 text-sm text-white/70">Compartilhe o código com seu colega para que ele entre.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium"><Users className="h-4 w-4 text-mint" /> Participantes</div>
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

        {me && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Meu papel:</span>
            {(["candidato", "avaliador", "observador"] as const).map((r) => (
              <Button key={r} size="sm" variant={me.role === r ? "secondary" : "outline"} onClick={() => setRole(r)}>
                {r}
              </Button>
            ))}
          </div>
        )}
      </div>

      {isHost ? (
        <Button variant="hero" className="w-full" onClick={start}>
          <Play className="mr-1 h-4 w-4" /> Iniciar estação
        </Button>
      ) : room.status === "running" ? (
        <Link to="/app/simulacao/$id" params={{ id: room.station_id }} className="block">
          <Button variant="hero" className="w-full">
            Entrar na estação <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
          Aguardando o organizador iniciar...
        </div>
      )}
    </div>
  );
}
