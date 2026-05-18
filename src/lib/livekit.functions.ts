import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AccessToken } from "livekit-server-sdk";

const Input = z.object({
  roomCode: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  displayName: z.string().min(1).max(80),
});

export const getLivekitToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!url || !apiKey || !apiSecret) {
      throw new Error("LiveKit não configurado.");
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: context.userId,
      name: data.displayName,
      ttl: 60 * 60 * 4, // 4h
    });
    at.addGrant({
      room: `sala-${data.roomCode}`,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    return { url, token };
  });
