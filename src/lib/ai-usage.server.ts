import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AiUsageKind =
  | "checklist"
  | "flashcards"
  | "summary"
  | "summary_batch"
  | "station"
  | "transcript"
  | "title"
  | "grammar";

// Preço estimado em USD por 1.000.000 de tokens (input / output).
// Fonte: tabela pública dos fornecedores (Google / OpenAI), Maio/2025.
// Mantém um fallback genérico para modelos não mapeados.
const PRICING: Record<string, { input: number; output: number }> = {
  "google/gemini-2.5-flash": { input: 0.30, output: 2.50 },
  "google/gemini-2.5-flash-lite": { input: 0.10, output: 0.40 },
  "google/gemini-2.5-pro": { input: 1.25, output: 10.0 },
  "google/gemini-3-flash-preview": { input: 0.30, output: 2.50 },
  "google/gemini-3.1-flash-lite-preview": { input: 0.10, output: 0.40 },
  "google/gemini-3.5-flash": { input: 0.30, output: 2.50 },
  "google/gemini-3.1-pro-preview": { input: 1.25, output: 10.0 },
  "openai/gpt-5": { input: 1.25, output: 10.0 },
  "openai/gpt-5-mini": { input: 0.25, output: 2.0 },
  "openai/gpt-5-nano": { input: 0.05, output: 0.40 },
};
const FALLBACK_PRICE = { input: 1.0, output: 5.0 };

export function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const p = PRICING[model] ?? FALLBACK_PRICE;
  const cost = (promptTokens / 1_000_000) * p.input + (completionTokens / 1_000_000) * p.output;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export type GatewayUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export async function logAiUsage(args: {
  kind: AiUsageKind;
  model: string;
  userId: string | null;
  usage?: GatewayUsage | null;
  status?: "success" | "error";
  errorMessage?: string | null;
  stationId?: string | null;
  durationMs?: number | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const prompt = args.usage?.prompt_tokens ?? 0;
    const completion = args.usage?.completion_tokens ?? 0;
    const total = args.usage?.total_tokens ?? prompt + completion;
    const cost = estimateCostUsd(args.model, prompt, completion);
    await supabaseAdmin.from("ai_usage_log").insert({
      kind: args.kind,
      model: args.model,
      user_id: args.userId,
      prompt_tokens: prompt,
      completion_tokens: completion,
      total_tokens: total,
      estimated_cost_usd: cost,
      status: args.status ?? "success",
      error_message: args.errorMessage ?? null,
      station_id: args.stationId ?? null,
      duration_ms: args.durationMs ?? null,
      metadata: (args.metadata ?? {}) as never,
    });
  } catch (e) {
    // Telemetria nunca deve quebrar o fluxo principal.
    console.error("[ai-usage] failed to log usage:", e);
  }
}
