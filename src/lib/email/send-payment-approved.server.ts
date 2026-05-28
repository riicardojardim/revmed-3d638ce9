import { render } from "@react-email/components";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { sendLovableEmail } from "@lovable.dev/email-js";
import { template as paymentApproved } from "@/lib/email-templates/payment-approved";

const SENDER_DOMAIN = "notify.revmed.app.br";
const FROM = `REVMED <noreply@${SENDER_DOMAIN}>`;

interface SendPaymentApprovedArgs {
  recipientEmail: string;
  name?: string;
  planName?: string;
  amount?: string;
  idempotencyKey: string;
}

/**
 * Server-only helper. Enqueues a payment-approved email via the project's
 * email queue (suppression-aware) using the service role.
 */
export async function sendPaymentApprovedEmail(args: SendPaymentApprovedArgs) {
  const apiKey = process.env.LOVABLE_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apiKey || !supabaseUrl || !serviceKey) {
    console.error("[payment-approved-email] missing env");
    return;
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const email = args.recipientEmail.toLowerCase();

  // Skip suppressed addresses
  const { data: suppressed } = await supabase
    .from("suppressed_emails")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (suppressed) return;

  const element = React.createElement(paymentApproved.component, {
    name: args.name,
    planName: args.planName,
    amount: args.amount,
  });
  const html = await render(element);
  const text = await render(element, { plainText: true });

  try {
    await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      message: {
        idempotency_key: args.idempotencyKey,
        template_name: "payment-approved",
        recipient_email: email,
        from: FROM,
        subject: typeof paymentApproved.subject === "function"
          ? paymentApproved.subject({})
          : paymentApproved.subject,
        html,
        text,
        sender_domain: SENDER_DOMAIN,
      },
    });
  } catch (err) {
    // Fallback: send directly via Lovable Email SDK if the queue RPC is not available yet.
    console.warn("[payment-approved-email] enqueue failed, sending directly", err);
    try {
      await sendLovableEmail({
        apiKey,
        from: FROM,
        to: email,
        subject: typeof paymentApproved.subject === "function"
          ? paymentApproved.subject({})
          : paymentApproved.subject,
        html,
        text,
      });
    } catch (e) {
      console.error("[payment-approved-email] direct send failed", e);
    }
  }
}