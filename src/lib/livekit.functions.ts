import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AccessToken } from "livekit-server-sdk";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Emite um token LiveKit para a sala da estação.
 * - O `roomName` é derivado do código da sala (sempre `estacao-<code>`)
 * - O participante recebe o `userId` autenticado como identidade
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
    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!url || !apiKey || !apiSecret) {
      throw new Error("LiveKit não está configurado");
    }

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
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    return { token, url, roomName };
  });