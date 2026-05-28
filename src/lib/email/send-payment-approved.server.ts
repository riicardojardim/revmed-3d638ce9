import { render } from "@react-email/components";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { template as paymentApproved } from "@/lib/email-templates/payment-approved";

const SITE_NAME = "REVMED";
const SENDER_DOMAIN = "notify.revmed.app.br";
const FROM_DOMAIN = "revmed.app.br";

function genToken() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function sendPaymentApprovedEmail(args: {
  recipientEmail: string;
  name?: string;
  planName?: string;
  amount?: string;
  idempotencyKey: string;
}) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("[payment-approved-email] missing env");
    return;
  }
  const supabase = createClient(supabaseUrl, serviceKey);
  const email = args.recipientEmail.toLowerCase();

  const { data: suppressed } = await supabase
    .from("suppressed_emails").select("email").eq("email", email).maybeSingle();
  if (suppressed) return;

  // Ensure unsubscribe token
  let token = genToken();
  const { data: existing } = await supabase
    .from("email_unsubscribe_tokens").select("token,used_at").eq("email", email).maybeSingle();
  if (existing?.token && !existing.used_at) {
    token = existing.token;
  } else if (!existing) {
    await supabase.from("email_unsubscribe_tokens").upsert({ email, token }, { onConflict: "email" });
    const { data: re } = await supabase
      .from("email_unsubscribe_tokens").select("token").eq("email", email).maybeSingle();
    if (re?.token) token = re.token;
  }

  const element = React.createElement(paymentApproved.component, {
    name: args.name, planName: args.planName, amount: args.amount,
  });
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject = typeof paymentApproved.subject === "function"
    ? (paymentApproved.subject as (d: Record<string, any>) => string)({})
    : paymentApproved.subject;
  const messageId = crypto.randomUUID();

  await supabase.from("email_send_log").insert({
    message_id: messageId, template_name: "payment-approved",
    recipient_email: email, status: "pending",
  });

  const { error } = await supabase.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: email,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject, html, text,
      purpose: "transactional",
      label: "payment-approved",
      idempotency_key: args.idempotencyKey,
      unsubscribe_token: token,
      queued_at: new Date().toISOString(),
    },
  });
  if (error) console.error("[payment-approved-email] enqueue failed", error);
}