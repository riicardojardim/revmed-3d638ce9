import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getActiveProvider } from "./provider-settings.server";

/**
 * Regras de áudio/vídeo dentro da sala da estação:
 * - Ator (host_id) → sempre pode falar/abrir vídeo.
 * - Candidato avaliado (evaluated_candidate_id) → pode falar/abrir vídeo
 *   enquanto a estação não estiver encerrada.
 * - Espectadores → só ouvem/assistem. Só ganham permissão de falar
 *   quando a estação está com status = "finished".
 */
function computeCanPublish(room: {
  host_id: string;
  evaluated_candidate_id: string | null;
  status: string;
}, userId: string): boolean {
  if (room.status === "finished") return true;
  if (room.host_id === userId) return true;
  if (room.evaluated_candidate_id && room.evaluated_candidate_id === userId) return true;
  return false;
}

/**
 * Emite um token LiveKit para a sala da estação.
 * Permissões de publicação são derivadas do banco (host + candidato avaliado).
 */
export const getLivekitToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        roomCode: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
        displayName: z.string().min(1).max(80).optional(),
        role: z.enum(["candidato", "ator", "espectador"]).default("candidato"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Busca config do provedor ativo em live_video (fallback para env vars)
    const provider = await getActiveProvider("live_video");
    const url = provider?.api_url ?? process.env.LIVEKIT_URL;
    const apiKey = provider?.api_key ?? process.env.LIVEKIT_API_KEY;
    const apiSecret = provider?.api_secret ?? process.env.LIVEKIT_API_SECRET;
    if (!url || !apiKey || !apiSecret) {
      throw new Error("LiveKit não está configurado. Vá em Admin > Provedores e ative o LiveKit com API Key, API Secret e URL.");
    }

    const { data: room, error: roomErr } = await context.supabase
      .from("training_rooms")
      .select("host_id, evaluated_candidate_id, status")
      .eq("code", data.roomCode)
      .maybeSingle();
    if (roomErr || !room) throw new Error("Sala não encontrada");

    const canPublish = computeCanPublish(
      {
        host_id: room.host_id as string,
        evaluated_candidate_id: (room.evaluated_candidate_id as string | null) ?? null,
        status: (room.status as string) ?? "waiting",
      },
      context.userId,
    );

    const roomName = `estacao-${data.roomCode}`;
    const at = new AccessToken(apiKey, apiSecret, {
      identity: context.userId,
      name: data.displayName ?? "Participante",
      ttl: 60 * 60, // 1h
      metadata: JSON.stringify({ role: data.role }),
    });
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    return { token, url, roomName, canPublish };
  });

/**
 * Sincroniza permissões dos participantes já conectados ao LiveKit com o estado
 * atual da sala no banco (após selecionar candidato, iniciar/encerrar estação).
 * Apenas o host (ator) pode disparar.
 */
export const syncLivekitPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        roomCode: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const provider = await getActiveProvider("live_video");
    const url = provider?.api_url ?? process.env.LIVEKIT_URL;
    const apiKey = provider?.api_key ?? process.env.LIVEKIT_API_KEY;
    const apiSecret = provider?.api_secret ?? process.env.LIVEKIT_API_SECRET;
    if (!url || !apiKey || !apiSecret) {
      throw new Error("LiveKit não está configurado. Vá em Admin > Provedores e ative o LiveKit com API Key, API Secret e URL.");
    }

    const { data: room, error: roomErr } = await context.supabase
      .from("training_rooms")
      .select("host_id, evaluated_candidate_id, status")
      .eq("code", data.roomCode)
      .maybeSingle();
    if (roomErr || !room) throw new Error("Sala não encontrada");
    if ((room.host_id as string) !== context.userId) {
      throw new Error("Apenas o ator pode sincronizar permissões da sala");
    }

    const roomState = {
      host_id: room.host_id as string,
      evaluated_candidate_id: (room.evaluated_candidate_id as string | null) ?? null,
      status: (room.status as string) ?? "waiting",
    };

    const svc = new RoomServiceClient(url, apiKey, apiSecret);
    const roomName = `estacao-${data.roomCode}`;

    let participants;
    try {
      participants = await svc.listParticipants(roomName);
    } catch {
      return { updated: 0 };
    }

    let updated = 0;
    for (const p of participants) {
      const canPublish = computeCanPublish(roomState, p.identity);
      try {
        await svc.updateParticipant(roomName, p.identity, undefined, {
          canPublish,
          canSubscribe: true,
          canPublishData: true,
          canPublishSources: [],
          hidden: false,
          recorder: false,
          canUpdateMetadata: false,
          canSubscribeMetrics: false,
        });
        if (!canPublish) {
          for (const t of p.tracks ?? []) {
            try {
              await svc.mutePublishedTrack(roomName, p.identity, t.sid, true);
            } catch {
              /* ignore individual track mute failures */
            }
          }
        }
        updated++;
      } catch {
        /* ignore individual participant failures */
      }
    }

    return { updated };
  });