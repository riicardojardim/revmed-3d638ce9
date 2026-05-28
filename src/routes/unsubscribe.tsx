import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export const Route = createFileRoute("/unsubscribe")({
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "valid" | "already" | "invalid" | "submitting" | "done" | "error">("loading");

  useEffect(() => {
    const t = new URL(window.location.href).searchParams.get("token");
    setToken(t);
    if (!t) { setState("invalid"); return; }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) setState("valid");
        else if (d.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, []);

  async function confirm() {
    if (!token) return;
    setState("submitting");
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = await r.json();
      if (d.success || d.reason === "already_unsubscribed") setState("done");
      else setState("error");
    } catch {
      setState("error");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
        {state === "loading" || state === "submitting" ? (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Processando…</p>
          </>
        ) : state === "valid" ? (
          <>
            <h1 className="font-display text-2xl font-black tracking-tight">Cancelar inscrição</h1>
            <p className="mt-3 text-sm text-muted-foreground">Você não receberá mais e-mails da REVMED neste endereço.</p>
            <Button onClick={confirm} className="mt-6 w-full" size="lg">Confirmar cancelamento</Button>
          </>
        ) : state === "done" || state === "already" ? (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-mint" />
            <h1 className="mt-4 font-display text-2xl font-black">Inscrição cancelada</h1>
            <p className="mt-2 text-sm text-muted-foreground">Você não receberá mais e-mails neste endereço.</p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 font-display text-2xl font-black">Link inválido</h1>
            <p className="mt-2 text-sm text-muted-foreground">Este link de cancelamento é inválido ou expirou.</p>
          </>
        )}
      </div>
    </main>
  );
}