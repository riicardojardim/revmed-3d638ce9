import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useState } from "react";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Crown, Repeat, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { formatWhatsapp, normalizeWhatsapp, isValidWhatsapp } from "@/lib/whatsapp";

const planSchema = z.object({
  plano: z.enum(["completo", "mensal", "ator"]).optional(),
});

export const Route = createFileRoute("/cadastro")({
  validateSearch: (s) => planSchema.parse(s),
  component: SignupPage,
  head: () => ({ meta: [{ title: "Criar conta — REVMED" }] }),
});

type PlanSlug = "completo" | "mensal" | "ator";

const PLAN_META: Record<PlanSlug, { name: string; icon: typeof Crown }> = {
  completo: { name: "Completo", icon: Crown },
  mensal: { name: "Completo Mensal", icon: Repeat },
  ator: { name: "Ator", icon: Users },
};

/* ---------------- Helpers ---------------- */
function formatCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function isValidCPF(cpf: string) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(d[i]) * (10 - i);
  let r = (s * 10) % 11;
  if (r === 10) r = 0;
  if (r !== parseInt(d[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(d[i]) * (11 - i);
  r = (s * 10) % 11;
  if (r === 10) r = 0;
  return r === parseInt(d[10]);
}

function SignupPage() {
  const nav = useNavigate();
  const { plano } = Route.useSearch();
  const { user, loading } = useAuth();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    whatsapp: "",
    cpf: "",
    birth_date: "",
    password: "",
    confirm: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Sem plano selecionado → manda escolher na home
  useEffect(() => {
    if (!plano) {
      window.location.href = "/#planos";
    }
  }, [plano]);

  useEffect(() => {
    if (!loading && user) nav({ to: "/app" });
  }, [user, loading, nav]);

  if (!plano) return null;
  const meta = PLAN_META[plano as PlanSlug];
  const Icon = meta.icon;

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("Informe nome e sobrenome.");
      return;
    }
    if (!/^[a-z0-9_.]{3,20}$/.test(form.username)) {
      toast.error("Nick inválido", { description: "Use 3 a 20 caracteres (letras minúsculas, números, . ou _)." });
      return;
    }
    if (/^[._]|[._]$|[._]{2,}/.test(form.username)) {
      toast.error("Nick inválido", { description: "Não pode começar/terminar com . ou _, nem ter dois seguidos." });
      return;
    }
    const wppDigits = normalizeWhatsapp(form.whatsapp);
    if (!wppDigits || !isValidWhatsapp(wppDigits)) {
      toast.error("WhatsApp inválido. Use o formato (XX) 9XXXX-XXXX.");
      return;
    }
    if (!isValidCPF(form.cpf)) {
      toast.error("CPF inválido.");
      return;
    }
    if (!form.birth_date) {
      toast.error("Informe a data de nascimento.");
      return;
    }
    const birth = new Date(form.birth_date);
    const age = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (isNaN(birth.getTime()) || age < 16 || age > 100) {
      toast.error("Data de nascimento inválida.");
      return;
    }
    if (form.password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (form.password !== form.confirm) {
      toast.error("As senhas não conferem.");
      return;
    }

    setSubmitting(true);
    const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`;
    const cpfDigits = form.cpf.replace(/\D/g, "");

    const { data: signupData, error } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          full_name: fullName,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          username: form.username.trim(),
          whatsapp: wppDigits,
          cpf: cpfDigits,
          birth_date: form.birth_date,
          selected_plan: plano,
        },
      },
    });

    if (error) {
      setSubmitting(false);
      toast.error("Erro ao criar conta", { description: error.message });
      return;
    }

    const uid = signupData.user?.id;
    if (uid) {
      await supabase.from("profiles").upsert(
        {
          id: uid,
          full_name: fullName,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          username: form.username.trim(),
          whatsapp: wppDigits,
          cpf: cpfDigits,
          birth_date: form.birth_date,
          selected_plan: plano,
        },
        { onConflict: "id" },
      );
    }

    setSubmitting(false);
    toast.success("Conta criada!", {
      description: `Plano ${meta.name} selecionado. Em breve liberaremos o checkout.`,
    });
    nav({ to: "/app" });
  }

  async function handleGoogle() {
    try {
      localStorage.setItem("er_selected_plan", plano!);
    } catch {}
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/app",
    });
    if (result.error) toast.error("Erro no Google", { description: String(result.error) });
  }

  async function handleApple() {
    try {
      localStorage.setItem("er_selected_plan", plano!);
    } catch {}
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin + "/app",
    });
    if (result.error) toast.error("Erro no Apple", { description: String(result.error) });
  }

  return (
    <div className="min-h-screen bg-gradient-card">
      <div className="container mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6 sm:py-8">
        <Logo />

        <div className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-elegant sm:mt-8 sm:p-8">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-mint/30 bg-mint/5 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Icon className="h-5 w-5 text-mint" />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Plano selecionado
                </div>
                <div className="font-display text-base font-bold">{meta.name}</div>
              </div>
            </div>
            <Link to="/" hash="planos" className="text-xs font-medium text-medical hover:underline">
              Trocar
            </Link>
          </div>

          <h1 className="mt-6 font-display text-xl font-bold sm:text-2xl">Crie sua conta</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Depois de criar a conta você vai para o pagamento.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" size="lg" className="w-full" onClick={handleGoogle}>
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              Google
            </Button>
            <Button type="button" variant="outline" size="lg" className="w-full" onClick={handleApple}>
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Apple
            </Button>
          </div>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
          </div>

          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="first_name">Nome</Label>
              <Input id="first_name" value={form.first_name} onChange={(e) => update("first_name", e.target.value)} required autoComplete="given-name" />
            </div>
            <div>
              <Label htmlFor="last_name">Sobrenome</Label>
              <Input id="last_name" value={form.last_name} onChange={(e) => update("last_name", e.target.value)} required autoComplete="family-name" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="username">Nick (como vai aparecer)</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => update("username", e.target.value.toLowerCase().replace(/\s/g, ""))}
                placeholder="ex: dra.ana"
                required
                autoComplete="username"
                maxLength={20}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="wpp">WhatsApp</Label>
              <Input
                id="wpp"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="(11) 99999-9999"
                maxLength={16}
                value={form.whatsapp}
                onChange={(e) => update("whatsapp", formatWhatsapp(e.target.value))}
                required
              />
            </div>
            <div>
              <Label htmlFor="birth">Data de nascimento</Label>
              <Input
                id="birth"
                type="date"
                value={form.birth_date}
                onChange={(e) => update("birth_date", e.target.value)}
                required
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                inputMode="numeric"
                placeholder="000.000.000-00"
                maxLength={14}
                value={form.cpf}
                onChange={(e) => update("cpf", formatCPF(e.target.value))}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={6} autoComplete="new-password" />
            </div>
            <div>
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input id="confirm" type="password" value={form.confirm} onChange={(e) => update("confirm", e.target.value)} required minLength={6} autoComplete="new-password" />
            </div>

            <div className="sm:col-span-2">
              <Button variant="hero" size="lg" className="w-full" disabled={submitting}>
                {submitting ? "Criando conta..." : (<>Criar conta e ir para pagamento <ArrowRight className="h-4 w-4" /></>)}
              </Button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Ao criar a conta você concorda com os Termos e a Política de Privacidade.
              </p>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="font-semibold text-medical hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
