import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Eye, EyeOff, Stethoscope, HeartPulse, Activity, Pill } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);

  function formatIdentifier(raw: string): string {
    const v = raw.trim();
    if (!v) return "";
    // E-mail ou usuário (tem @ ou letras) — sem máscara
    if (/[@a-zA-Z]/.test(v)) return raw;
    // Só dígitos → assume CPF e aplica máscara
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (!d) return raw;
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  function handleIdentifierChange(value: string) {
    setEmail(formatIdentifier(value));
  }



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

  async function resolveLoginEmail(identifier: string): Promise<string | null> {
    const id = identifier.trim();
    if (!id) return null;
    if (id.includes("@")) return id.toLowerCase();
    try {
      const { data, error } = await supabase.rpc("lookup_login_email", { _identifier: id });
      if (error) return null;
      return (data as string | null) ?? null;
    } catch {
      return null;
    }
  }

  async function submitLogin() {
    if (submitting) return;
    const rawIdentifier = (emailRef.current?.value || email).trim();
    const currentPassword = passwordRef.current?.value || password;
    if (!rawIdentifier || !currentPassword) {
      toast.error("Preencha e-mail/usuário e senha para entrar.");
      return;
    }

    try {
      setSubmitting(true);
      const loginEmail = await resolveLoginEmail(rawIdentifier);
      if (!loginEmail) {
        setSubmitting(false);
        toast.error("Conta não encontrada", { description: "Verifique seu e-mail, usuário, CPF ou telefone." });
        return;
      }
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email: loginEmail, password: currentPassword }),
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

  async function handleForgotPassword() {
    const raw = (emailRef.current?.value || email).trim();
    if (!raw) {
      toast.error("Informe seu e-mail, usuário, CPF ou telefone", { description: "Preencha o primeiro campo para receber o link de redefinição." });
      emailRef.current?.focus();
      return;
    }
    const targetEmail = await resolveLoginEmail(raw);
    if (!targetEmail) {
      toast.error("Conta não encontrada", { description: "Não localizamos uma conta com esse identificador." });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error("Não foi possível enviar o e-mail", { description: error.message });
      return;
    }
    toast.success("E-mail enviado", { description: "Confira sua caixa de entrada para redefinir a senha." });
  }

  async function handleApple() {
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin + "/app",
    });
    if (result.error) toast.error("Erro no Apple", { description: String(result.error) });
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-gradient-card"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Animated medical background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-mint/20 blur-3xl animate-pulse-slow" />
        <div className="absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-medical/20 blur-3xl animate-pulse-slow [animation-delay:1.5s]" />
        <div className="absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-mint/15 blur-3xl animate-pulse-slow [animation-delay:3s]" />

        {/* ECG line */}
        <svg
          className="absolute left-0 right-0 top-1/2 h-24 w-full -translate-y-1/2 opacity-[0.12]"
          viewBox="0 0 1200 100"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0 50 L200 50 L230 50 L245 20 L260 80 L275 35 L290 50 L500 50 L530 50 L545 15 L560 85 L575 30 L590 50 L800 50 L830 50 L845 25 L860 75 L875 40 L890 50 L1200 50"
            stroke="currentColor"
            strokeWidth="2"
            className="text-mint animate-ecg"
            strokeDasharray="1400"
            strokeDashoffset="1400"
          />
        </svg>

        {/* Floating medical icons */}
        <div className="absolute left-[8%] top-[12%] text-mint/25 animate-float">
          <Stethoscope className="h-7 w-7" strokeWidth={1.5} />
        </div>
        <div className="absolute right-[12%] top-[20%] text-medical/30 animate-float [animation-delay:1s]">
          <HeartPulse className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <div className="absolute left-[18%] bottom-[18%] text-mint/25 animate-float [animation-delay:2s]">
          <Activity className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <div className="absolute right-[10%] bottom-[12%] text-medical/25 animate-float [animation-delay:0.5s]">
          <Pill className="h-7 w-7" strokeWidth={1.5} />
        </div>
      </div>

      <div className="container relative mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-4 py-6">
        <div className="mb-4 flex justify-center">
          <Logo className="h-12 w-auto select-none md:h-14" />
        </div>

        <div className="w-full rounded-2xl border border-border/80 bg-card/95 p-6 shadow-elegant backdrop-blur-xl">
          <h1 className="font-display text-xl font-bold">Entrar na sua conta</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Continue de onde parou e siga evoluindo.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={handleGoogle}>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
              </svg>
              Google
            </Button>
            <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={handleApple}>
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Apple
            </Button>
          </div>

          <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">E-mail, usuário, CPF ou telefone</Label>
              <Input ref={emailRef} id="email" type="text" inputMode="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={email} onChange={(e) => handleIdentifierChange(e.target.value)} required className="h-9 !text-xs placeholder:text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">Senha</Label>
              <div className="relative">
                <Input ref={passwordRef} id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-9 pr-9 !text-xs placeholder:text-xs" />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
              >
                Esqueceu sua senha?
              </button>
            </div>
            <Button type="button" variant="hero" size="default" className="w-full text-sm" disabled={submitting} onClick={submitLogin}>
              {submitting ? "Entrando..." : (<>Entrar <ArrowRight className="h-4 w-4" /></>)}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link to="/" hash="planos" className="font-semibold text-medical hover:underline">Criar conta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

