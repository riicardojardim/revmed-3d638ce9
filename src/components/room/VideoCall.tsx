import { useCallback, useEffect, useState } from "react";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  ControlBar,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
  useLocalParticipant,
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
  if (isMuted) {
    // O LiveKit não permite "remote unmute" — só o próprio participante pode se desmutar.
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toast.info("O participante precisa se desmutar (regra de privacidade do LiveKit).");
        }}
        className="absolute right-2 top-2 z-10 rounded-md bg-black/60 p-1.5 text-white/60 backdrop-blur hover:bg-black/80"
        title="Mutado — o participante precisa se desmutar"
      >
        <MicOff className="h-3.5 w-3.5" />
      </button>
    );
  }
  return (
    <button
      onClick={async (e) => {
        e.stopPropagation();
        setPending(true);
        try {
          await mute({ data: { roomCode, targetIdentity, muted: true } });
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Falha ao mutar");
        } finally {
          setPending(false);
        }
      }}
      disabled={pending}
      className="absolute right-2 top-2 z-10 rounded-md bg-black/60 p-1.5 text-white backdrop-blur hover:bg-black/80 disabled:opacity-50"
      title="Mutar participante"
    >
      <Mic className="h-3.5 w-3.5" />
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
  // ID do candidato avaliado AGORA — atualiza em tempo real quando o ator
  // troca de candidato, sem precisar reconectar a chamada.
  const [currentEvaluatedId, setCurrentEvaluatedId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setError(null);
    setCreds(null);
    fetchToken({ data: { roomCode, displayName } })
      .then((r) => { setCreds(r); setCurrentEvaluatedId(r.evaluatedId); })
      .catch((e: Error) => setError(e.message ?? "Falha ao conectar à sala"));
  }, [roomCode, displayName, fetchToken]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setCreds(null);
    fetchToken({ data: { roomCode, displayName } })
      .then((r) => { if (!cancelled) { setCreds(r); setCurrentEvaluatedId(r.evaluatedId); } })
      .catch((e: Error) => { if (!cancelled) setError(e.message ?? "Falha ao conectar à sala"); });
    return () => { cancelled = true; };
  }, [roomCode, displayName, fetchToken]);

  // Captura identity do usuário logado (para distinguir tiles "eu" vs outros)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSelfIdentity(data.user?.id ?? null));
  }, []);

  // Assina mudanças em training_rooms.evaluated_candidate_id em tempo real.
  // Quando o ator troca o candidato avaliado, o vídeo da pessoa selecionada
  // entra em cena automaticamente sem reconectar a sala LiveKit.
  useEffect(() => {
    const channel = supabase
      .channel(`room-evaluated-${roomCode}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "training_rooms", filter: `code=eq.${roomCode}` },
        (payload) => {
          const next = (payload.new as { evaluated_candidate_id: string | null } | null)?.evaluated_candidate_id ?? null;
          setCurrentEvaluatedId(next);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
      : creds.role === "evaluated" ? "Você é o candidato avaliado — sua câmera aparecerá em tela."
      : "Você entrará como espectador (somente áudio). Mic começa desligado; você pode se desmutar quando quiser.";
    return (
      <div className={className}>
        <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/20 p-4 text-center">
          <Video className="h-8 w-8 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{roleMsg}</p>
          <button
            onClick={() => setConnect(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {creds.role === "spectator" ? "Entrar com microfone" : "Entrar com câmera e microfone"}
          </button>
        </div>
      </div>
    );
  }

  const isHost = creds.role === "host";
  const isSpectator = creds.role === "spectator";
  // Espectadores entram só com áudio (sem câmera). Ator e candidato avaliado
  // publicam câmera + microfone automaticamente.
  const autoVideo = !isSpectator;
  const autoAudio = isHost || creds.role === "evaluated";

  // Apenas 2 vídeos podem aparecer na tela: o ator (host) e o candidato avaliado da vez.
  // O ID do avaliado vem do estado reativo — quando o ator troca de candidato,
  // o novo vídeo entra automaticamente no lugar.
  const allowed = new Set<string>();
  if (creds.hostId) allowed.add(creds.hostId);
  if (currentEvaluatedId) allowed.add(currentEvaluatedId);

  return (
    <div className={className}>
      <LiveKitRoom
        serverUrl={creds.url}
        token={creds.token}
        connect
        video={autoVideo}
        audio={autoAudio}
        data-lk-theme="default"
        style={{ height: "100%", borderRadius: "0.5rem", overflow: "hidden", display: "flex", flexDirection: "column" }}
      >
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <Stage
            isHost={isHost}
            roomCode={roomCode}
            selfIdentity={selfIdentity ?? ""}
            allowedIdentities={allowed}
          />
        </div>
        <RoomAudioRenderer />
        <div style={{ flexShrink: 0 }}>
          <ControlBar
            variation="minimal"
            controls={{
              leave: false,
              screenShare: isHost,
              microphone: true,
              // Espectadores não publicam vídeo — só ator/candidato têm câmera.
              camera: !isSpectator,
            }}
          />
        </div>
      </LiveKitRoom>
    </div>
  );
}

