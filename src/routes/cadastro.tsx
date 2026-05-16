import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/cadastro")({
  component: SignupPage,
  head: () => ({ meta: [{ title: "Criar conta — Estação Revalida" }] }),
});

function SignupPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [role, setRole] = useState<"aluno" | "professor">("aluno");
  const [form, setForm] = useState({ name: "", email: "", password: "", whatsapp: "", year: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/app" });
  }, [user, loading, nav]);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          full_name: form.name,
          whatsapp: form.whatsapp,
          exam_year: form.year,
          role,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao criar conta", { description: error.message });
      return;
    }
    toast.success("Conta criada!", { description: "Você já pode começar a treinar." });
    nav({ to: "/app" });
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/app",
    });
    if (result.error) toast.error("Erro no Google", { description: String(result.error) });
  }

  return (
    <div className="min-h-screen bg-gradient-card">
      <div className="container mx-auto flex min-h-screen max-w-md flex-col px-4 py-8">
        <Logo />
        <div className="mt-12 rounded-3xl border border-border bg-card p-8 shadow-elegant">
          <h1 className="font-display text-2xl font-bold">Crie sua conta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Comece a treinar com método em menos de 1 minuto.
          </p>

          <Button type="button" variant="outline" size="lg" className="mt-6 w-full" onClick={handleGoogle}>
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
            Cadastrar com Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={6} />
            </div>
            <div>
              <Label>Perfil</Label>
              <RadioGroup value={role} onValueChange={(v) => setRole(v as "aluno" | "professor")} className="mt-2 grid grid-cols-2 gap-3">
                {[
                  { v: "aluno", l: "Aluno", d: "Quero treinar" },
                  { v: "professor", l: "Professor", d: "Quero ensinar" },
                ].map((o) => (
                  <label
                    key={o.v}
                    className={`flex cursor-pointer flex-col rounded-xl border p-3 transition-all ${
                      role === o.v ? "border-mint bg-mint/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value={o.v} id={o.v} />
                      <span className="font-medium">{o.l}</span>
                    </div>
                    <span className="mt-1 pl-6 text-xs text-muted-foreground">{o.d}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="wpp">WhatsApp</Label>
                <Input id="wpp" placeholder="opcional" value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="year">Ano da prova</Label>
                <Input id="year" placeholder="opcional" value={form.year} onChange={(e) => update("year", e.target.value)} />
              </div>
            </div>
            <Button variant="hero" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Criando..." : (<>Criar conta <ArrowRight className="h-4 w-4" /></>)}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="font-semibold text-medical hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
