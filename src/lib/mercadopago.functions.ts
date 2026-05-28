import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendPaymentApprovedEmail } from "@/lib/email/send-payment-approved.server";
import { syncUserProfile, getPlanMeta } from "./mercadopago.shared";


export const getMpPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env.MERCADOPAGO_PUBLIC_KEY;
  if (!key) throw new Error("MERCADOPAGO_PUBLIC_KEY não configurada");
  return { publicKey: key };
});

async function getPlanMeta(slug: string) {
  const { data: plan } = await supabaseAdmin
    .from("plans")
    .select("id, name, price_cents")
    .eq("slug", slug)
    .maybeSingle();
  if (!plan) throw new Error(`Plano ${slug} não encontrado`);
  return { cents: plan.price_cents, name: plan.name };
}


const MP_API = "https://api.mercadopago.com";

function getAccessToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
  return token;
}

async function mpFetch(path: string, init: RequestInit & { idempotencyKey?: string } = {}) {
  const { idempotencyKey, headers, ...rest } = init;
  const res = await fetch(`${MP_API}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
      ...(headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[mercadopago] error", res.status, json);
    const message = (json as any)?.message || `Mercado Pago retornou ${res.status}`;
    throw new Error(message);
  }
  return json as any;
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

async function notifyPaymentApproved(userId: string, planSlug: string, paymentId: string) {
  try {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = u?.user?.email;
    if (!email) return;
    const { data: profile } = await supabaseAdmin
      .from("profiles").select("first_name,title").eq("id", userId).maybeSingle();
    const planMeta = await getPlanMeta(planSlug);
    const name = profile?.first_name
      ? `${profile.title ? profile.title + " " : ""}${profile.first_name}`.trim()
      : undefined;
    await sendPaymentApprovedEmail({
      recipientEmail: email,
      name,
      planName: planMeta?.name,
      amount: planMeta ? `R$ ${(planMeta.cents / 100).toFixed(2).replace(".", ",")}` : undefined,
      idempotencyKey: `payment-approved-${paymentId}`,
    });
  } catch (e) {
    console.error("[notifyPaymentApproved] failed", e);
  }
}


const payerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  cpf: z.string().regex(/^\d{11}$/),
});

const signupDataSchema = z.object({
  title: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  whatsapp: z.string().optional(),
  cpf: z.string().optional(),
  birth_date: z.string().optional(),
  selected_plan: z.string().optional(),
});

export const createPixPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        planSlug: z.enum(["ator", "completo"]),
        payer: payerSchema,
        signupData: signupDataSchema.optional(),
      })
      .parse(input),
  )

  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const plan = await getPlanMeta(data.planSlug);


    const idempotencyKey = `pix-${userId}-${data.planSlug}-${Date.now()}`;
    const body = {
      transaction_amount: plan.cents / 100,
      installments: 1,

      description: `REVMED · ${plan.name}`,
      payment_method_id: "pix",
      external_reference: `${userId}:${data.planSlug}`,
      notification_url: "https://revmed.app.br/api/public/webhooks/mercadopago",
      payer: {
        email: data.payer.email,
        first_name: data.payer.firstName,
        last_name: data.payer.lastName,
        identification: { type: "CPF", number: data.payer.cpf },
      },
      metadata: { user_id: userId, plan_slug: data.planSlug, signup_data: data.signupData },

    };

    const mp = await mpFetch("/v1/payments", {
      method: "POST",
      idempotencyKey,
      body: JSON.stringify(body),
    });

    const qr = mp?.point_of_interaction?.transaction_data;
    
    // Sincroniza o perfil imediatamente na criação do Pix
    if (data.signupData) {
      await syncUserProfile(userId, data.signupData);
    }

    const { data: row, error } = await supabaseAdmin

      .from("payments")
      .insert({
        user_id: userId,
        plan_slug: data.planSlug,
        amount_cents: plan.cents,
        method: "pix",
        status: mp.status ?? "pending",
        mp_payment_id: String(mp.id),
        mp_qr_code: qr?.qr_code ?? null,
        mp_qr_code_base64: qr?.qr_code_base64 ?? null,
        mp_ticket_url: qr?.ticket_url ?? null,
        mp_status_detail: mp.status_detail ?? null,
        raw_response: mp,
      })
      .select()
      .single();

    if (error) {
      console.error("[mercadopago] insert payment error", error);
      throw new Error("Falha ao registrar pagamento.");
    }

    return {
      paymentId: row.id,
      mpPaymentId: row.mp_payment_id,
      qrCode: row.mp_qr_code,
      qrCodeBase64: row.mp_qr_code_base64,
      ticketUrl: row.mp_ticket_url,
      amountCents: row.amount_cents,
      status: row.status,
    };
  });

export const createCardPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        planSlug: z.enum(["ator", "completo"]),
        token: z.string().min(10),
        installments: z.number().int().min(1).max(12),
        paymentMethodId: z.string().min(1).max(50),
        issuerId: z.string().optional(),
        payer: payerSchema,
        signupData: signupDataSchema.optional(),
      })
      .parse(input),
  )

  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const plan = await getPlanMeta(data.planSlug);


    const idempotencyKey = `card-${userId}-${data.planSlug}-${Date.now()}`;
    const body: Record<string, unknown> = {
      transaction_amount: plan.cents / 100,
      binary_mode: true,

      token: data.token,
      description: `REVMED · ${plan.name}`,
      installments: data.installments,
      payment_method_id: data.paymentMethodId,
      external_reference: `${userId}:${data.planSlug}`,
      notification_url: "https://revmed.app.br/api/public/webhooks/mercadopago",
      payer: {
        email: data.payer.email,
        first_name: data.payer.firstName,
        last_name: data.payer.lastName,
        identification: { type: "CPF", number: data.payer.cpf },
      },
      metadata: { user_id: userId, plan_slug: data.planSlug, signup_data: data.signupData },
    };
    if (data.issuerId) body.issuer_id = data.issuerId;

    const mp = await mpFetch("/v1/payments", {
      method: "POST",
      idempotencyKey,
      body: JSON.stringify(body),
    });

    // Sincroniza o perfil imediatamente na criação do pagamento via cartão
    if (data.signupData) {
      await syncUserProfile(userId, data.signupData);
    }

    const { data: row, error } = await supabaseAdmin

      .from("payments")
      .insert({
        user_id: userId,
        plan_slug: data.planSlug,
        amount_cents: plan.cents,
        method: "card",
        status: mp.status ?? "pending",
        mp_payment_id: String(mp.id),
        mp_status_detail: mp.status_detail ?? null,
        raw_response: mp,
        paid_at: mp.status === "approved" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error("[mercadopago] insert card payment error", error);
      throw new Error("Falha ao registrar pagamento.");
    }

    if (mp.status === "approved") {
      await activateSubscription(userId, data.planSlug);
      await syncUserProfile(userId, data.signupData);
      await notifyPaymentApproved(userId, data.planSlug, String(mp.id));

    }

    return {
      paymentId: row.id,
      status: mp.status as string,
      statusDetail: (mp.status_detail as string) ?? null,
    };
  });

export const getPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ paymentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: row } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("id", data.paymentId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) throw new Error("Pagamento não encontrado");

    // If already approved, no need to re-fetch from MP
    if (row.status === "approved") {
      return { status: row.status as string };
    }

    // Re-fetch from MP to get latest status
    if (row.mp_payment_id) {
      try {
        const mp = await mpFetch(`/v1/payments/${row.mp_payment_id}`, { method: "GET" });
        if (mp.status && mp.status !== row.status) {
          await supabaseAdmin
            .from("payments")
            .update({
              status: mp.status,
              mp_status_detail: mp.status_detail ?? null,
              paid_at: mp.status === "approved" ? new Date().toISOString() : row.paid_at,
              raw_response: mp,
            })
            .eq("id", row.id);
          if (mp.status === "approved") {
            const signupData = mp.metadata?.signup_data || (row.raw_response as any)?.metadata?.signup_data;
            if (signupData) await syncUserProfile(userId, signupData);
            await activateSubscription(userId, row.plan_slug);

            await notifyPaymentApproved(userId, row.plan_slug, String(row.mp_payment_id));
          }

          return { status: mp.status as string };
        }
      } catch (e) {
        console.error("[mercadopago] poll error", e);
      }
    }

    return { status: row.status as string };
  });