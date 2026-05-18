import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

const Input = z.object({
  roomCode: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  displayName: z.string().min(1).max(80),
});

function readEnv() {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) {
    throw new Error("LiveKit não configurado.");
  }
  return { url, apiKey, apiSecret };
}

export const getLivekitToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { url, apiKey, apiSecret } = readEnv();
    const userId = context.userId;

    // Descobre o papel do usuário na sala
    const { data: room } = await supabaseAdmin
      .from("training_rooms")
      .select("host_id, evaluated_candidate_id")
      .eq("code", data.roomCode)
      .maybeSingle();

    const isHost = !!room && room.host_id === userId;
    const isEvaluated = !!room && room.evaluated_candidate_id === userId;
    const canPublishAudioVideo = isHost || isEvaluated;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: data.displayName,
      ttl: 60 * 60 * 4,
    });
    at.addGrant({
      room: `sala-${data.roomCode}`,
      roomJoin: true,
      canSubscribe: true,
      canPublish: canPublishAudioVideo,
      canPublishData: true,
      // Ator (host) tem permissão de admin pra mutar/remover participantes
      roomAdmin: isHost,
    });

    const token = await at.toJwt();
    return {
      url,
      token,
      role: isHost ? "host" : isEvaluated ? "evaluated" : "spectator",
    };
  });

const MuteInput = z.object({
  roomCode: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  targetIdentity: z.string().min(1).max(128),
  muted: z.boolean(),
});

export const muteParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MuteInput.parse(input))
  .handler(async ({ data, context }) => {
    const { url, apiKey, apiSecret } = readEnv();

    // Apenas o host pode mutar
    const { data: room } = await supabaseAdmin
      .from("training_rooms")
      .select("host_id")
      .eq("code", data.roomCode)
      .maybeSingle();
    if (!room || room.host_id !== context.userId) {
      throw new Error("Apenas o ator pode controlar microfones.");
    }

    // RoomServiceClient precisa de HTTP(S), não wss
    const httpUrl = url.replace(/^ws/, "http");
    const svc = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    const roomName = `sala-${data.roomCode}`;

    const participant = await svc.getParticipant(roomName, data.targetIdentity);
    const audioTracks = (participant.tracks ?? []).filter((t) => t.type === 0); // AUDIO=0
    for (const t of audioTracks) {
      await svc.mutePublishedTrack(roomName, data.targetIdentity, t.sid, data.muted);
    }
    return { ok: true };
  });
