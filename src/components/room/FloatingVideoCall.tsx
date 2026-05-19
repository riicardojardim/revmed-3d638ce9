import { useState } from "react";
import { VideoCall } from "./VideoCall";
import { Minimize2, Maximize2, Video } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { roomCode: string; displayName: string };

export function FloatingVideoCall({ roomCode, displayName }: Props) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setMinimized(false); }}
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg hover:opacity-90 md:bottom-4"
        aria-label="Abrir vídeo da sala"
      >
        <Video className="h-4 w-4" />
        Vídeo da sala
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-50 overflow-hidden rounded-xl border border-border bg-background shadow-2xl transition-all",
        minimized
          ? "bottom-4 right-4 h-14 w-64"
          : "bottom-4 right-4 h-[420px] w-[640px] max-w-[calc(100vw-2rem)]",
      )}
    >
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-1.5 text-xs">
        <span className="font-medium">Vídeo da sala</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized((v) => !v)}
            className="rounded p-1 hover:bg-muted"
            aria-label={minimized ? "Expandir" : "Minimizar"}
          >
            {minimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded px-1.5 text-base leading-none hover:bg-muted"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
      </div>
      {!minimized && (
        <VideoCall
          roomCode={roomCode}
          displayName={displayName}
          className="h-[calc(100%-32px)] w-full"
        />
      )}
    </div>
  );
}
