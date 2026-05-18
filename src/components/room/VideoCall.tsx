import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  ControlBar,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { useServerFn } from "@tanstack/react-start";
import { getLivekitToken } from "@/lib/livekit.functions";
import { Loader2, Video } from "lucide-react";

function Stage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  return (
    <GridLayout tracks={tracks} style={{ height: "100%" }}>
      <ParticipantTile />
    </GridLayout>
  );
}

type Props = {
  roomCode: string;
  displayName: string;
  className?: string;
};

export function VideoCall({ roomCode, displayName, className }: Props) {
  const fetchToken = useServerFn(getLivekitToken);
  const [creds, setCreds] = useState<{ url: string; token: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connect, setConnect] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setCreds(null);
    fetchToken({ data: { roomCode, displayName } })
      .then((r) => { if (!cancelled) setCreds(r); })
      .catch((e: Error) => { if (!cancelled) setError(e.message ?? "Falha ao conectar à sala"); });
    return () => { cancelled = true; };
  }, [roomCode, displayName, fetchToken]);

  if (error) {
    return (
      <div className={className}>
        <div className="flex h-full items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!creds) {
    return (
      <div className={className}>
        <div className="flex h-full items-center justify-center rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Preparando vídeo…
        </div>
      </div>
    );
  }

  if (!connect) {
    return (
      <div className={className}>
        <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/20 p-4 text-center">
          <Video className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Áudio e vídeo prontos para conectar.</p>
          <button
            onClick={() => setConnect(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Entrar com câmera e microfone
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <LiveKitRoom
        serverUrl={creds.url}
        token={creds.token}
        connect
        video
        audio
        data-lk-theme="default"
        style={{ height: "100%", borderRadius: "0.5rem", overflow: "hidden" }}
      >
        <Stage />
        <RoomAudioRenderer />
        <ControlBar variation="minimal" controls={{ leave: false, screenShare: true }} />
      </LiveKitRoom>
    </div>
  );
}
