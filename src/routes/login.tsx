import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Entrar — Estação Revalida" }] }),
});

function LoginPage() {
  const { user, loading } = useAuth();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
    ]);
  }

  async function resolveDestination(uid: string): Promise<string> {
    try {
      const rolesPromise = supabase.from("user_roles").select("role").eq("user_id", uid);
      const timeout = new Promise<{ data: null }>((resolve) =>
        setTimeout(() => resolve({ data: null }), 1500),
      );
      const result = (await Promise.race([rolesPromise, timeout])) as { data: { role: string }[] | null };
      return result.data?.some((r) => r.role === "admin") ? "/app/admin" : "/app";
    } catch {
      return "/app";
    }
  }

  function goTo(to: string) {
    // Hard navigation evita corridas com o estado do AuthProvider/loader.
    sessionStorage.setItem("auth:welcome", "1");
    window.location.assign(to);
  }

  useEffect(() => {
    if (!loading && user && !submitting) {
      resolveDestination(user.id).then(goTo);
    }
  }, [user, loading, submitting]);

  async function submitLogin() {
    if (submitting) return;
    const normalizedEmail = (emailRef.current?.value || email).trim();
    const currentPassword = passwordRef.current?.value || password;
    if (!normalizedEmail || !currentPassword) {
      toast.error("Preencha e-mail e senha para entrar.");
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email: normalizedEmail, password: currentPassword }),
        10000,
      );
      if (error) {
        setSubmitting(false);
        toast.error("Não foi possível entrar", { description: error.message });
        return;
      }

      const uid = data.user?.id;
      const destination = uid ? await resolveDestination(uid) : "/app";
      goTo(destination);
    } catch {
      setSubmitting(false);
      toast.error("Não foi possível entrar", { description: "Tente novamente em alguns segundos." });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitLogin();
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/app",
    });
    if (result.error) toast.error("Erro no Google", { description: String(result.error) });
  }

  return (
    <div className="min-h-screen bg-gradient-card" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="container mx-auto flex min-h-screen max-w-md flex-col px-4 pb-8 pt-6 sm:pt-8">
        <Logo />
        <div className="mt-16 rounded-3xl border border-border bg-card p-8 shadow-elegant">
          <h1 className="font-display text-2xl font-bold">Entrar na sua conta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Continue de onde parou e siga evoluindo.
          </p>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="mt-6 w-full"
            onClick={handleGoogle}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
            Continuar com Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input ref={emailRef} id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" required />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input ref={passwordRef} id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="button" variant="hero" size="lg" className="w-full" disabled={submitting} onClick={submitLogin}>
              {submitting ? "Entrando..." : (<>Entrar <ArrowRight className="h-4 w-4" /></>)}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link to="/cadastro" className="font-semibold text-medical hover:underline">Criar conta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
