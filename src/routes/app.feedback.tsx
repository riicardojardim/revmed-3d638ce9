import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/feedback")({
  component: Feedback,
  head: () => ({ meta: [{ title: "Feedback — REVMED" }] }),
});

function Feedback() {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  async function handleSend() {
    if (!text.trim()) return toast.error("Escreva algo primeiro.");
    if (!user) return toast.error("Faça login para enviar feedback.");
    setSending(true);
    const { error } = await supabase.from("user_feedback").insert({
      user_id: user.id,
      message: text.trim(),
      page: typeof window !== "undefined" ? window.location.pathname : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    setSending(false);
    if (error) {
      toast.error("Não foi possível enviar. Tente novamente.");
      return;
    }
    toast.success("Feedback enviado! Obrigado.");
    setText("");
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/5 px-3 py-1 text-xs font-medium text-medical">
          <MessageSquare className="h-3.5 w-3.5" /> Sua opinião importa
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold md:text-3xl">Feedback</h1>
        <p className="text-sm text-muted-foreground">Conte o que podemos melhorar.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Escreva seu feedback..."
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-mint"
        />
        <Button variant="hero" className="mt-4" onClick={handleSend} disabled={sending}>
          <Send className="h-4 w-4" /> {sending ? "Enviando..." : "Enviar"}
        </Button>
      </div>
    </div>
  );
}
