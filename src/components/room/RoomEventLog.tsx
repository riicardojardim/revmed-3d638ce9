import { useEffect, useState } from "react";
import { fetchRoomEvents, subscribeRoomEvents, type RoomEvent } from "@/lib/roomEvents";
import { UserCheck, PhoneCall, Play, Square, History } from "lucide-react";
import { cn } from "@/lib/utils";

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return iso;
  }
}

function describe(e: RoomEvent): { icon: React.ReactNode; label: string; tone: string } {
  const p = (e.payload ?? {}) as Record<string, unknown>;
  const name = typeof p.name === "string" && p.name ? p.name : "";
  switch (e.type) {
    case "candidate_selected":
      return {
        icon: <UserCheck className="size-3.5" />,
        label: name ? `Candidato avaliado selecionado: ${name}` : "Candidato avaliado selecionado",
        tone: "text-medical bg-medical/10 border-medical/20",
      };
    case "actor_joined_call":
      return {
        icon: <PhoneCall className="size-3.5" />,
        label: "Ator entrou na chamada",
        tone: "text-mint bg-mint/10 border-mint/30",
      };
    case "candidate_joined_call":
      return {
        icon: <PhoneCall className="size-3.5" />,
        label: name ? `Candidato entrou na chamada: ${name}` : "Candidato entrou na chamada",
        tone: "text-mint bg-mint/10 border-mint/30",
      };
    case "station_started":
      return {
        icon: <Play className="size-3.5" />,
        label: "Estação iniciada",
        tone: "text-amber-700 bg-amber-100 border-amber-200",
      };
    case "station_finished":
      return {
        icon: <Square className="size-3.5" />,
        label: "Estação encerrada",
        tone: "text-rose-700 bg-rose-100 border-rose-200",
      };
    default:
      return { icon: <History className="size-3.5" />, label: e.type, tone: "text-muted-foreground bg-muted border-border" };
  }
}

export function RoomEventLog({ roomId, className }: { roomId: string | null | undefined; className?: string }) {
  const [events, setEvents] = useState<RoomEvent[]>([]);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    void fetchRoomEvents(roomId).then((rows) => {
      if (!cancelled) setEvents(rows);
    });
    const unsubscribe = subscribeRoomEvents(roomId, (evt) => {
      setEvents((prev) => (prev.some((e) => e.id === evt.id) ? prev : [...prev, evt]));
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [roomId]);

  return (
    <div className={cn("rounded-2xl border border-border bg-white p-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <History className="size-4 text-medical" />
        <h3 className="font-display text-sm font-semibold text-medical">Histórico da estação</h3>
      </div>
      {events.length === 0 ? (
        <p className="text-xs text-medical/60">Nenhum evento registrado ainda.</p>
      ) : (
        <ol className="space-y-2">
          {events.map((e) => {
            const d = describe(e);
            return (
              <li key={e.id} className="flex items-start gap-2 text-xs">
                <span className={cn("inline-flex items-center justify-center size-6 rounded-full border shrink-0", d.tone)}>
                  {d.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-medical/90 leading-tight">{d.label}</div>
                  <div className="text-medical/50 tabular-nums">{formatTime(e.created_at)}</div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}