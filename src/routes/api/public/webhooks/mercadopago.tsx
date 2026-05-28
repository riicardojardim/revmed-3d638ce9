import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHmac, timingSafeEqual } from "crypto";
import { sendPaymentApprovedEmail } from "@/lib/email/send-payment-approved.server";
import { syncUserProfile } from "@/lib/mercadopago.shared";


const MP_API = "https://api.mercadopago.com";

function verifySignature(request: Request, dataId: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true; // não bloqueia se não houver segredo configurado
  const xSignature = request.headers.get("x-signature") || "";
  const xRequestId = request.headers.get("x-request-id") || "";
  if (!xSignature || !xRequestId) return false;

  // x-signature: "ts=...,v1=..."
  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function activateSubscription(userId: string, planSlug: string) {
  const { data: plan } = await supabaseAdmin
    .from("plans")
    .select("id")
    .eq("slug", planSlug)
    .maybeSingle();
  if (!plan) return;
  const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  await supabaseAdmin
    .from("user_subscriptions")
    .upsert(
      { user_id: userId, plan_id: plan.id, status: "active", current_period_end: periodEnd },
      { onConflict: "user_id" },
    );
}

export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        let payload: any;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const type = payload?.type || payload?.action || "";
        const dataId = payload?.data?.id ? String(payload.data.id) : "";
        if (!dataId) return Response.json({ received: true, skipped: "no_id" });

        if (!verifySignature(request, dataId)) {
          console.warn("[mp-webhook] invalid signature");
          return new Response("invalid signature", { status: 401 });
        }

        // Só processa eventos de payment
        if (!type.includes("payment")) {
          return Response.json({ received: true, skipped: "not_payment" });
        }

        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (!accessToken) {
          console.error("[mp-webhook] missing access token");
          return new Response("server misconfigured", { status: 500 });
        }

        const mpRes = await fetch(`${MP_API}/v1/payments/${dataId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!mpRes.ok) {
          console.error("[mp-webhook] fetch payment failed", mpRes.status);
          return new Response("fetch failed", { status: 502 });
        }
        const mp = await mpRes.json();

        const meta = mp?.metadata || {};
        const ext = (mp?.external_reference || "") as string;
        const [extUserId, extPlanSlug] = ext.includes(":") ? ext.split(":") : ["", ""];
        const userId = (meta.user_id || extUserId) as string;
        const planSlug = (meta.plan_slug || extPlanSlug) as string;

        await supabaseAdmin
          .from("payments")
          .update({
            status: mp.status,
            mp_status_detail: mp.status_detail ?? null,
            paid_at: mp.status === "approved" ? new Date().toISOString() : null,
            raw_response: mp,
          })
          .eq("mp_payment_id", String(mp.id));

        // Sincroniza o perfil IMEDIATAMENTE, independente do status do pagamento
        // Assim o admin já vê o nome correto na aba de "Tentativas de Pagamento"
        if (userId && meta.signup_data) {
          await syncUserProfile(userId, meta.signup_data);
        }

        if (mp.status === "approved" && userId && planSlug) {
          await activateSubscription(userId, planSlug);
          try {


            const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
            const email = u?.user?.email;
            if (email) {
              const { data: profile } = await supabaseAdmin
                .from("profiles").select("first_name,title").eq("id", userId).maybeSingle();
              const name = profile?.first_name
                ? `${profile.title ? profile.title + " " : ""}${profile.first_name}`.trim()
                : undefined;
              const amount = typeof mp.transaction_amount === "number"
                ? `R$ ${mp.transaction_amount.toFixed(2).replace(".", ",")}`
                : undefined;
              const planName = planSlug === "completo" ? "Plano Plataforma" : "Plano Ator";
              const paymentMethod = mp.payment_method_id === "pix" ? "pix" : "credit_card";
              const last4 = mp.card?.last_four_digits || undefined;
              const installments = mp.installments || undefined;
              const installmentAmount = mp.transaction_details?.installment_amount
                ? `R$ ${mp.transaction_details.installment_amount.toFixed(2).replace(".", ",")}`
                : undefined;

              await sendPaymentApprovedEmail({
                recipientEmail: email, 
                name, 
                planName, 
                amount,
                installmentAmount,
                paymentMethod,
                last4,
                installments,
                idempotencyKey: `payment-approved-${mp.id}`,
              });
            }
          } catch (e) {
            console.error("[mp-webhook] email send failed", e);
          }
        }

        return Response.json({ received: true, processed: true, status: mp.status });
      },
    },
  },
});