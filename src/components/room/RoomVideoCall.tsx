import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  LiveKitRoom,
  ParticipantTile,
  TrackRefContext,
  useTracks,
  ControlBar,
  RoomAudioRenderer,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { Video, X, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getLivekitToken } from "@/lib/livekit.functions";

type Props = {
  roomCode: string;
  displayName?: string;
  role: "candidato" | "ator" | "espectador";
  /** Posicionamento do painel. */
  position?: "bottom-right" | "bottom-left";
};

/**
 * Painel flutuante de videoconferência LiveKit usado dentro da sala da estação.
 * O usuário começa com o painel fechado e abre clicando no botão "Vídeo".
 */
export function RoomVideoCall({ roomCode, displayName, role, position = "bottom-right" }: Props) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [conn, setConn] = useState<{ token: string; url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const issueToken = useServerFn(getLivekitToken);

  useEffect(() => {
    if (!open || conn || loading) return;
    setLoading(true);
    setError(null);
    issueToken({ data: { roomCode, displayName, role } })
      .then((r) => setConn({ token: r.token, url: r.url }))
      .catch((e) => setError(e?.message ?? "Falha ao conectar"))
      .finally(() => setLoading(false));
  }, [open, conn, loading, issueToken, roomCode, displayName, role]);

  const posClass = position === "bottom-left" ? "left-4" : "right-4";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-4 z-50 inline-flex items-center gap-2 rounded-full border border-mint/40 bg-night/90 px-4 py-2 text-sm font-semibold text-white shadow-elegant backdrop-blur transition hover:bg-night",
          posClass,
        )}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
        </span>
        <Video className="h-4 w-4" /> Iniciar vídeo
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-mint/30 bg-night/95 text-white shadow-elegant backdrop-blur",
        posClass,
        minimized ? "h-12 w-64" : "h-[420px] w-[360px] sm:w-[420px]",
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-xs">
        <span className="inline-flex items-center gap-2 font-semibold uppercase tracking-wider text-mint">
          <Video className="h-3.5 w-3.5" /> Vídeo da estação
        </span>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-white/80 hover:bg-white/10" onClick={() => setMinimized((m) => !m)} aria-label={minimized ? "Expandir" : "Minimizar"}>
            {minimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-white/80 hover:bg-white/10" onClick={() => { setOpen(false); setConn(null); }} aria-label="Encerrar">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>
      {!minimized && (
        <div className="flex min-h-0 flex-1 flex-col">
          {loading && <div className="flex flex-1 items-center justify-center text-xs text-white/70">Conectando…</div>}
          {error && <div className="flex flex-1 items-center justify-center px-4 text-center text-xs text-red-300">{error}</div>}
          {conn && (
            <LiveKitRoom
              token={conn.token}
              serverUrl={conn.url}
              connect
              video
              audio
              data-lk-theme="default"
              className="flex min-h-0 flex-1 flex-col"
              onDisconnected={() => { setOpen(false); setConn(null); }}
            >
              <div className="min-h-0 flex-1 overflow-hidden bg-black/60">
                <VideoGrid />
              </div>
              <RoomAudioRenderer />
              <ControlBar variation="minimal" controls={{ microphone: true, camera: true, screenShare: false, leave: true }} />
            </LiveKitRoom>
          )}
        </div>
      )}
    </div>
  );
}

function VideoGrid() {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
  ]);
  const refs = useMemo(() => tracks.slice(0, 4), [tracks]);
  if (refs.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-white/60">Aguardando outro participante…</div>;
  }
  return (
    <div className={cn("grid h-full w-full gap-1 p-1", refs.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
      {refs.map((tr) => (
        <TrackRefContext.Provider key={tr.participant.identity + tr.publication?.trackSid} value={tr}>
          <ParticipantTile className="!h-full !w-full overflow-hidden rounded-lg" />
        </TrackRefContext.Provider>
      ))}
    </div>
  );
}