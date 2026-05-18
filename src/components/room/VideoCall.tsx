import { useCallback, useEffect, useState } from "react";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  ControlBar,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
  TrackRefContext,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { useServerFn } from "@tanstack/react-start";
import { getLivekitToken, muteParticipant } from "@/lib/livekit.functions";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Video, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

function HostMuteButton({ roomCode, targetIdentity, isMuted }: { roomCode: string; targetIdentity: string; isMuted: boolean }) {
  const mute = useServerFn(muteParticipant);
  const [pending, setPending] = useState(false);
  return (
    <button
      onClick={async (e) => {
        e.stopPropagation();
        setPending(true);
        try {
          await mute({ data: { roomCode, targetIdentity, muted: !isMuted } });
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Falha ao mutar");
        } finally {
          setPending(false);
        }
      }}
      disabled={pending}
      className="absolute right-2 top-2 z-10 rounded-md bg-black/60 p-1.5 text-white backdrop-blur hover:bg-black/80 disabled:opacity-50"
      title={isMuted ? "Desmutar (ator)" : "Mutar (ator)"}
    >
      {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
    </button>
  );
}

function Stage({ isHost, roomCode, selfIdentity, allowedIdentities }: { isHost: boolean; roomCode: string; selfIdentity: string; allowedIdentities: Set<string> | null }) {
  const allTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  // Espectadores só veem participantes permitidos (ator + candidato avaliado)
  const tracks = allowedIdentities
    ? allTracks.filter((t) => t.participant && allowedIdentities.has(t.participant.identity))
    : allTracks;
  const participants = useParticipants();
  return (
    <GridLayout tracks={tracks} style={{ height: "100%" }}>
      <TrackRefContext.Consumer>
        {(trackRef) => {
          const identity = trackRef?.participant?.identity;
          const isSelf = identity === selfIdentity;
          const p = participants.find((pp) => pp.identity === identity);
          const audioPub = p ? [...p.audioTrackPublications.values()][0] : undefined;
          const audioMuted = audioPub?.isMuted ?? true;
          return (
            <div className="relative h-full w-full">
              <ParticipantTile />
              {isHost && identity && !isSelf && (
                <HostMuteButton roomCode={roomCode} targetIdentity={identity} isMuted={audioMuted} />
              )}
            </div>
          );
        }}
      </TrackRefContext.Consumer>
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
  const [creds, setCreds] = useState<{ url: string; token: string; role: string; hostId: string | null; evaluatedId: string | null } | null>(null);
  const [selfIdentity, setSelfIdentity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connect, setConnect] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => {
    setError(null);
    setCreds(null);
    fetchToken({ data: { roomCode, displayName } })
      .then((r) => setCreds(r))
      .catch((e: Error) => setError(e.message ?? "Falha ao conectar à sala"));
  }, [roomCode, displayName, fetchToken]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setCreds(null);
    fetchToken({ data: { roomCode, displayName } })
      .then((r) => { if (!cancelled) setCreds(r); })
      .catch((e: Error) => { if (!cancelled) setError(e.message ?? "Falha ao conectar à sala"); });
    return () => { cancelled = true; };
  }, [roomCode, displayName, fetchToken, reloadKey]);

  // Captura identity do usuário logado (para distinguir tiles "eu" vs outros)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSelfIdentity(data.user?.id ?? null));
  }, []);

  // Re-emite token quando o ator troca o candidato avaliado (mudança em training_rooms)
  useEffect(() => {
    const ch = supabase
      .channel(`lk-room-perms-${roomCode}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "training_rooms", filter: `code=eq.${roomCode}` },
        (payload) => {
          const oldRow = payload.old as { evaluated_candidate_id?: string | null };
          const newRow = payload.new as { evaluated_candidate_id?: string | null };
          if (oldRow.evaluated_candidate_id !== newRow.evaluated_candidate_id) {
            setReloadKey((k) => k + 1);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomCode]);

  if (error) {
    return (
      <div className={className}>
        <div className="flex h-full items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
          <button onClick={refresh} className="ml-3 underline">Tentar de novo</button>
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
    const roleMsg =
      creds.role === "host" ? "Você é o ator (controle total)."
      : creds.role === "evaluated" ? "Você é o candidato avaliado — pode falar."
      : "Você participará apenas como ouvinte/espectador (mic desativado pelo ator).";
    return (
      <div className={className}>
        <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/20 p-4 text-center">
          <Video className="h-8 w-8 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{roleMsg}</p>
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

  const isHost = creds.role === "host";
  const canPublish = creds.role === "host" || creds.role === "evaluated";

  return (
    <div className={className}>
      <LiveKitRoom
        key={reloadKey}
        serverUrl={creds.url}
        token={creds.token}
        connect
        video={canPublish}
        audio={canPublish}
        data-lk-theme="default"
        style={{ height: "100%", borderRadius: "0.5rem", overflow: "hidden" }}
      >
        <Stage
          isHost={isHost}
          roomCode={roomCode}
          selfIdentity={selfIdentity ?? ""}
          allowedIdentities={
            creds.role === "spectator"
              ? new Set([creds.hostId, creds.evaluatedId].filter((v): v is string => !!v))
              : null
          }
        />
        <RoomAudioRenderer />
        <ControlBar variation="minimal" controls={{ leave: false, screenShare: isHost, microphone: canPublish, camera: canPublish }} />
      </LiveKitRoom>
    </div>
  );
}
