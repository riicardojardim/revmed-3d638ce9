import { useEffect, useRef, useState } from "react";
import { VideoCall } from "./VideoCall";
import { Minimize2, Maximize2, Video, Mic, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { roomCode: string; displayName: string };

type Pos = { x: number; y: number };

const STORAGE_KEY = "floating-videocall:pos";

function loadPos(): Pos | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.x === "number" && typeof p?.y === "number") return p;
  } catch {
    /* ignore */
  }
  return null;
}

export function FloatingVideoCall({ roomCode, displayName }: Props) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dx: number; dy: number; pointerId: number } | null>(null);

  useEffect(() => {
    setPos(loadPos());
  }, []);

  // Mantém o painel dentro da viewport ao redimensionar
  useEffect(() => {
    function clamp() {
      const el = panelRef.current;
      if (!el || !pos) return;
      const r = el.getBoundingClientRect();
      const maxX = window.innerWidth - r.width - 4;
      const maxY = window.innerHeight - r.height - 4;
      const next = {
        x: Math.min(Math.max(4, pos.x), Math.max(4, maxX)),
        y: Math.min(Math.max(4, pos.y), Math.max(4, maxY)),
      };
      if (next.x !== pos.x || next.y !== pos.y) setPos(next);
    }
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, [pos]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = panelRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    dragRef.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, pointerId: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const el = panelRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const x = Math.min(Math.max(4, e.clientX - d.dx), window.innerWidth - w - 4);
    const y = Math.min(Math.max(4, e.clientY - d.dy), window.innerHeight - h - 4);
    setPos({ x, y });
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (pos) localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setMinimized(false); }}
        className="fixed bottom-24 right-3 z-[100] flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-elegant hover:opacity-90 sm:bottom-24"
        style={{ marginBottom: "max(env(safe-area-inset-bottom), 0px)", right: "max(env(safe-area-inset-right), 0.75rem)" }}
        aria-label="Abrir vídeo da sala"
      >
        <Video className="h-3.5 w-3.5" />
        Vídeo
      </button>
    );
  }

  // Posição: usa drag salvo, senão canto inferior direito
  const positioned = pos
    ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
    : { right: 12, bottom: 112 };

  return (
    <div
      ref={panelRef}
      className={cn(
        "fixed z-[100] overflow-hidden rounded-xl border border-border bg-background shadow-elegant",
        minimized ? "h-10 w-40" : "h-52 w-52 sm:h-60 sm:w-60",
      )}
      style={{
        ...positioned,
        marginBottom: pos ? undefined : "max(env(safe-area-inset-bottom), 0px)",
        touchAction: "none",
      }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="flex cursor-grab items-center justify-between border-b border-border bg-muted/30 px-2 py-1 text-[11px] active:cursor-grabbing select-none"
      >
        <span className="flex items-center gap-1.5 font-medium">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
          {minimized ? <Mic className="h-3 w-3 text-mint" /> : <Video className="h-3 w-3" />}
          {minimized ? "Call" : "Vídeo"}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setMinimized((v) => !v)}
            className="rounded p-1 hover:bg-muted"
            aria-label={minimized ? "Expandir" : "Minimizar"}
            title={minimized ? "Expandir" : "Minimizar (mantém áudio)"}
          >
            {minimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => { setOpen(false); setMinimized(false); }}
            className="rounded px-1.5 text-sm leading-none hover:bg-muted"
            aria-label="Encerrar chamada"
            title="Encerrar chamada"
          >
            ×
          </button>
        </div>
      </div>
      {/* Sempre montado — alternamos só a visibilidade para manter a conexão. */}
      <div
        className="h-[calc(100%-26px)] w-full"
        style={minimized ? { visibility: "hidden", position: "absolute", inset: "26px 0 0 0", pointerEvents: "none" } : undefined}
      >
        <VideoCall
          roomCode={roomCode}
          displayName={displayName}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
