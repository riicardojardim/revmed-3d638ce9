import { useState } from "react";
import { VideoCall } from "./VideoCall";
import { Minimize2, Maximize2, Video, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { roomCode: string; displayName: string };

export function FloatingVideoCall({ roomCode, displayName }: Props) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setMinimized(false); }}
        className="fixed bottom-24 right-3 z-30 flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-elegant hover:opacity-90"
        style={{ marginBottom: "max(env(safe-area-inset-bottom), 0px)" }}
        aria-label="Abrir vídeo da sala"
      >
        <Video className="h-3.5 w-3.5" />
        Vídeo
      </button>
    );
  }

  // Mantém o VideoCall SEMPRE montado para não desconectar ao minimizar.
  // No estado minimizado mostramos só um pill com áudio rodando em segundo plano.
  return (
    <div
      className={cn(
        "fixed right-3 z-30 overflow-hidden rounded-xl border border-border bg-background shadow-elegant transition-all",
        minimized ? "bottom-24 h-11 w-44" : "bottom-24 h-72 w-72 sm:h-80 sm:w-80",
      )}
      style={{ marginBottom: "max(env(safe-area-inset-bottom), 0px)" }}
    >
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-2.5 py-1 text-[11px]">
        <span className="flex items-center gap-1.5 font-medium">
          {minimized ? <Mic className="h-3 w-3 text-mint" /> : <Video className="h-3 w-3" />}
          {minimized ? "Em chamada" : "Vídeo da sala"}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setMinimized((v) => !v)}
            className="rounded p-1 hover:bg-muted"
            aria-label={minimized ? "Expandir" : "Minimizar"}
            title={minimized ? "Expandir" : "Minimizar (mantém áudio)"}
          >
            {minimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </button>
          <button
            onClick={() => { setOpen(false); setMinimized(false); }}
            className="rounded px-1.5 text-sm leading-none hover:bg-muted"
            aria-label="Encerrar chamada"
            title="Encerrar chamada"
          >
            ×
          </button>
        </div>
      </div>
      {/* Sempre montado — apenas escondido visualmente quando minimizado.
          Mantém conexão LiveKit + áudio ativo. */}
      <div className={cn("h-[calc(100%-26px)] w-full", minimized && "hidden")}>
        <VideoCall
          roomCode={roomCode}
          displayName={displayName}
          className="h-full w-full"
        />
      </div>
      {minimized && (
        <div className="hidden">
          <VideoCall
            roomCode={roomCode}
            displayName={displayName}
            className="h-0 w-0"
          />
        </div>
      )}
    </div>
  );
}
