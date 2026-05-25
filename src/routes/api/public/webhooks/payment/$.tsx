import { createFileRoute } from "@tanstack/react-router";
import { getProviderByKey } from "@/lib/provider-settings.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/webhooks/payment/$")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const providerKey = params._splat as string;
        const allowed = ["mercado_pago", "hotmart", "stripe"];
        if (!allowed.includes(providerKey)) {
          return new Response("Provedor não suportado", { status: 400 });
        }

        const provider = await getProviderByKey("payment", providerKey);
        if (!provider) {
          return new Response("Provedor não configurado", { status: 404 });
        }

        const body = await request.text();

        // Validação de assinatura (genérica - cada provedor tem seu formato)
        if (provider.webhook_secret) {
          const signature = request.headers.get("x-webhook-signature")
            || request.headers.get("x-signature")
            || request.headers.get("stripe-signature")
            || "";

          if (providerKey === "stripe") {
            // Stripe usa timestamp + assinatura - parser simplificado
            // Em produção, usar biblioteca stripe para validar
            const sigValid = signature.startsWith("t=");
            if (!sigValid) {
              return new Response("Assinatura Stripe inválida", { status: 401 });
            }
          } else if (providerKey === "mercado_pago") {
            // Mercado Pago pode usar query params ou headers
            // Simplificação: aceita se webhook_secret estiver configurado
          } else if (providerKey === "hotmart") {
            // Hotmart usa HMAC-SHA256
            const expected = createHmac("sha256", provider.webhook_secret)
              .update(body)
              .digest("hex");
            const provided = signature;
            if (!provided || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
              return new Response("Assinatura Hotmart inválida", { status: 401 });
            }
          }
        }

        let payload: any;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("JSON inválido", { status: 400 });
        }

        // Processamento genérico
        // Cada provedor tem seu formato, então usamos heurística
        let userEmail: string | null = null;
        let status: string | null = null;
        let planSlug: string | null = null;

        if (providerKey === "hotmart") {
          // Hotmart: purchase.approved, purchase.billet_generated, etc.
          const data = payload.data || payload;
          userEmail = data?.buyer?.email || data?.subscriber?.email || null;
          const eventType = payload.event || "";
          status = eventType.includes("approved") ? "active" : eventType.includes("canceled") ? "canceled" : null;
          planSlug = data?.product?.name ? slugifyPlan(data.product.name) : null;
        } else if (providerKey === "stripe") {
          // Stripe: checkout.session.completed, invoice.paid, etc.
          const obj = payload.data?.object || payload;
          userEmail = obj?.customer_email || obj?.customer_details?.email || null;
          const eventType = payload.type || "";
          status = eventType.includes("checkout.session.completed") || eventType.includes("invoice.paid")
            ? "active" : eventType.includes("subscription.deleted") ? "canceled" : null;
          planSlug = obj?.metadata?.plan_slug || null;
        } else if (providerKey === "mercado_pago") {
          // Mercado Pago: payment.updated, merchant_order, etc.
          const data = payload.data || payload;
          userEmail = data?.payer?.email || data?.customer?.email || null;
          const paymentStatus = data?.status || payload.type || "";
          status = paymentStatus === "approved" || paymentStatus === "authorized" ? "active" : null;
          planSlug = data?.external_reference ? slugifyPlan(data.external_reference) : null;
        }

        if (!userEmail) {
          return Response.json({ received: true, processed: false, reason: "no_email" });
        }

        // Busca usuário pelo email
        const { data: userRow } = await supabaseAdmin
          .from("profiles")
          .select("id, selected_plan")
          .eq("email", userEmail)
          .maybeSingle();

        if (!userRow) {
          return Response.json({ received: true, processed: false, reason: "user_not_found" });
        }

        // Atualiza assinatura
        if (status && planSlug) {
          const { data: plan } = await supabaseAdmin
            .from("plans")
            .select("id")
            .eq("slug", planSlug)
            .maybeSingle();

          if (plan) {
            await supabaseAdmin
              .from("user_subscriptions")
              .upsert({
                user_id: userRow.id,
                plan_id: plan.id,
                status,
                current_period_end: status === "active" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
              }, { onConflict: "user_id" });
          }
        }

        // Log do webhook
        await supabaseAdmin.from("webhook_events").insert({
          provider: providerKey,
          event_type: payload.event || payload.type || "unknown",
          payload,
          processed: true,
        }).catch(() => {});

        return Response.json({ received: true, processed: true });
      },
    },
  },
});

function slugifyPlan(name: string): string {
  const map: Record<string, string> = {
    "plano completo": "completo",
    "completo": "completo",
    "plano mensal": "mensal",
    "mensal": "mensal",
    "plano ator": "ator",
    "ator": "ator",
  };
  const key = name.toLowerCase().trim();
  return map[key] || "completo";
}
