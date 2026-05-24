import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  LiveKitRoom,
  ParticipantTile,
  TrackRefContext,
  useTracks,
  useParticipants,
  ControlBar,
  RoomAudioRenderer,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { Video, X, Minimize2, Maximize2, GripVertical, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getLivekitToken } from "@/lib/livekit.functions";

type Props = {
  roomCode: string;
  displayName?: string;
  role: "candidato" | "ator" | "espectador";
  /**
   * Lista de identidades (userId) permitidas no grid de vídeo.
   * Quando informada, apenas os participantes cujo identity esteja
   * nesta lista (mais o próprio usuário) serão exibidos.
   */
  allowedIdentities?: (string | null | undefined)[];
  /** Se true, abre o painel automaticamente ao montar. */
  autoOpen?: boolean;
  /** Callback com as identidades atualmente presentes na call (inclui local). */
  onIdentitiesChange?: (identities: string[]) => void;
  /**
   * Sempre que mudar (ex.: novo candidato avaliado, status da estação),
   * o componente solicita um novo token ao servidor para atualizar
   * permissões de publicação (microfone/câmera) do usuário local.
   */
  permissionsKey?: string;
};

/**
 * Painel flutuante de videoconferência LiveKit usado dentro da sala da estação.
 * - Compacto e arrastável
 * - Ao minimizar, a chamada continua ativa (apenas o vídeo é ocultado)
 */
export function RoomVideoCall({ roomCode, displayName, role, allowedIdentities, autoOpen, onIdentitiesChange, permissionsKey }: Props) {
  const [open, setOpen] = useState(!!autoOpen);
  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);
  const [minimized, setMinimized] = useState(false);
  const [conn, setConn] = useState<{ token: string; url: string; canPublish: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const issueToken = useServerFn(getLivekitToken);

  // Quando a chave de permissões mudar, força refresh do token (reconnect com
  // novas grants). É o gatilho para promover o candidato selecionado
  // (passa a publicar) ou rebaixar o anterior (vira espectador).
  useEffect(() => {
    if (!open || !permissionsKey) return;
    setConn(null);
  }, [permissionsKey, open]);

  // Posição flutuante (px a partir do canto superior esquerdo da viewport).
  const PANEL_W = 240;
  const PANEL_H_OPEN = 240;
  const PANEL_H_MIN = 44;
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  // Posição inicial: canto inferior ESQUERDO, com margem
  // (o painel de Amigos vive no canto inferior direito).
  useEffect(() => {
    if (pos || typeof window === "undefined") return;
    const margin = 16;
    setPos({
      x: Math.max(margin, window.innerWidth - PANEL_W - 80 - margin),
      y: Math.max(margin, window.innerHeight - PANEL_H_OPEN - margin),
    });
  }, [pos]);

  // Mantém o painel dentro da viewport quando a janela é redimensionada.
  useEffect(() => {
    function onResize() {
      setPos((p) => {
        if (!p || typeof window === "undefined") return p;
        const h = minimized ? PANEL_H_MIN : PANEL_H_OPEN;
        return {
          x: Math.min(Math.max(8, p.x), window.innerWidth - PANEL_W - 8),
          y: Math.min(Math.max(8, p.y), window.innerHeight - h - 8),
        };
      });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [minimized]);

  function onDragStart(e: React.PointerEvent<HTMLDivElement>) {
    if (!pos) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  }
  function onDragMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const h = minimized ? PANEL_H_MIN : PANEL_H_OPEN;
    const x = Math.min(Math.max(8, e.clientX - dragRef.current.dx), window.innerWidth - PANEL_W - 8);
    const y = Math.min(Math.max(8, e.clientY - dragRef.current.dy), window.innerHeight - h - 8);
    setPos({ x, y });
  }
  function onDragEnd() { dragRef.current = null; }

  useEffect(() => {
    if (!open || conn || loading) return;
    setLoading(true);
    setError(null);
    issueToken({ data: { roomCode, displayName, role } })
      .then((r) => setConn({ token: r.token, url: r.url, canPublish: !!r.canPublish }))
      .catch((e) => setError(e?.message ?? "Falha ao conectar"))
      .finally(() => setLoading(false));
  }, [open, conn, loading, issueToken, roomCode, displayName, role]);

  const allowSet = useMemo(() => {
    if (!allowedIdentities) return null;
    const s = new Set(allowedIdentities.filter((v): v is string => !!v));
    return s.size > 0 ? s : null;
  }, [allowedIdentities]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-[76px] z-[60] inline-flex items-center gap-2 rounded-full border border-mint/40 bg-night/90 px-4 py-2 text-sm font-semibold text-white shadow-elegant backdrop-blur transition hover:bg-night"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
        </span>
        <Video className="h-4 w-4" /> Call
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        left: pos?.x ?? 16,
        top: pos?.y ?? 16,
        width: PANEL_W,
        height: minimized ? PANEL_H_MIN : PANEL_H_OPEN,
        zIndex: 60,
      }}
      className="flex flex-col overflow-hidden rounded-xl border border-mint/30 bg-night/95 text-white shadow-elegant backdrop-blur"
    >
      <header
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        className="flex cursor-grab items-center justify-between gap-2 border-b border-white/10 px-2 py-1.5 text-[11px] active:cursor-grabbing select-none touch-none"
      >
        <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-mint">
          <GripVertical className="h-3 w-3 opacity-60" />
          {minimized ? (
            <span className="relative inline-flex items-center">
              <span className="absolute -left-1 -top-1 inline-flex h-4 w-4 animate-ping rounded-full bg-mint/50" />
              <Mic className="relative h-3 w-3 text-mint" />
            </span>
          ) : (
            <Video className="h-3 w-3" />
          )}
          {minimized ? "Ao vivo" : "Call"}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-white/80 hover:bg-white/10"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setMinimized((m) => !m)}
            aria-label={minimized ? "Expandir" : "Minimizar"}
          >
            {minimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-white/80 hover:bg-white/10"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => { setOpen(false); setConn(null); setMinimized(false); }}
            aria-label="Encerrar"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        {loading && <div className="flex flex-1 items-center justify-center text-[11px] text-white/70">Conectando…</div>}
        {error && <div className="flex flex-1 items-center justify-center px-3 text-center text-[11px] text-red-300">{error}</div>}
        {conn && (
          <LiveKitRoom
            token={conn.token}
            serverUrl={conn.url}
            connect
            video={conn.canPublish}
            audio={conn.canPublish}
            data-lk-theme="default"
            className="flex min-h-0 flex-1 flex-col"
            onDisconnected={() => { setOpen(false); setConn(null); setMinimized(false); }}
          >
            {/* Mantém o LiveKitRoom montado quando minimizado — apenas oculta o vídeo. */}
            <div className={cn("min-h-0 flex-1 overflow-hidden bg-black/60", minimized && "hidden")}>
              <VideoGrid allowSet={allowSet} />
            </div>
            <RoomAudioRenderer />
            {onIdentitiesChange && <PresenceReporter onChange={onIdentitiesChange} />}
            {!minimized && (
              conn.canPublish ? (
                <ControlBar variation="minimal" controls={{ microphone: true, camera: true, screenShare: false, leave: true }} />
              ) : (
                <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-night/80 px-2 py-1.5 text-[10px] text-white/70">
                  <span className="inline-flex items-center gap-1 truncate">
                    <Mic className="h-3 w-3 opacity-60" /> Modo espectador — só ouve
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] text-white/80 hover:bg-white/10"
                    onClick={() => { setOpen(false); setConn(null); setMinimized(false); }}
                  >
                    Sair
                  </Button>
                </div>
              )
            )}
          </LiveKitRoom>
        )}
      </div>
    </div>
  );
}

function PresenceReporter({ onChange }: { onChange: (ids: string[]) => void }) {
  const participants = useParticipants();
  useEffect(() => {
    const ids = participants.map((p) => p.identity).filter(Boolean);
    onChange(ids);
  }, [participants, onChange]);
  return null;
}

function VideoGrid({ allowSet }: { allowSet: Set<string> | null }) {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
  ]);
  const refs = useMemo(() => {
    const filtered = allowSet
      ? tracks.filter((t) => t.participant?.isLocal || allowSet.has(t.participant?.identity))
      : tracks;
    return filtered.slice(0, 2);
  }, [tracks, allowSet]);
  if (refs.length === 0) {
    return <div className="flex h-full items-center justify-center text-[11px] text-white/60">Aguardando…</div>;
  }
  return (
    <div className={cn("grid h-full w-full gap-1 p-1", refs.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
      {refs.map((tr) => (
        <TrackRefContext.Provider key={tr.participant.identity + tr.publication?.trackSid} value={tr}>
          <ParticipantTile className="!h-full !w-full overflow-hidden rounded-md" />
        </TrackRefContext.Provider>
      ))}
    </div>
  );
}