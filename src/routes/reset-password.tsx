import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Redefinir senha — REVMED" }] }),
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase processes the recovery token from the URL hash automatically.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Senha muito curta", { description: "Use ao menos 6 caracteres." });
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error("Não foi possível atualizar", { description: error.message });
      return;
    }
    toast.success("Senha atualizada!", { description: "Você já está conectado." });
    window.location.assign("/app");
  }

  return (
    <div className="min-h-screen bg-gradient-card">
      <div className="container mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-4 py-6">
        <div className="mb-4 flex justify-center">
          <Logo className="h-12 w-auto select-none md:h-14" />
        </div>
        <div className="w-full rounded-2xl border border-border/80 bg-card/95 p-6 shadow-elegant backdrop-blur-xl">
          <h1 className="font-display text-xl font-bold">Redefinir senha</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {ready ? "Defina sua nova senha abaixo." : "Validando link de redefinição..."}
          </p>

          <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">Nova senha</Label>
              <div className="relative">
                <Input id="password" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-9 pr-9 !text-xs" />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={show ? "Ocultar" : "Mostrar"} tabIndex={-1}>
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-xs font-medium">Confirmar senha</Label>
              <Input id="confirm" type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} className="h-9 !text-xs" />
            </div>
            <Button type="submit" variant="hero" size="default" className="w-full text-sm" disabled={submitting || !ready}>
              {submitting ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
