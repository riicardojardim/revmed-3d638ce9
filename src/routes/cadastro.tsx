import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft, Check, Crown, Repeat, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { formatWhatsapp, normalizeWhatsapp, isValidWhatsapp } from "@/lib/whatsapp";

export const Route = createFileRoute("/cadastro")({
  component: SignupPage,
  head: () => ({ meta: [{ title: "Criar conta — Estação Revalida" }] }),
});

type PlanSlug = "completo" | "mensal" | "ator";

const PLANS: {
  slug: PlanSlug;
  name: string;
  price: string;
  period: string;
  badge?: string;
  desc: string;
  icon: typeof Crown;
  highlight?: boolean;
  features: string[];
}[] = [
  {
    slug: "completo",
    name: "Completo",
    price: "R$ 497",
    period: "/até a prova",
    badge: "Mais escolhido",
    desc: "Plataforma completa, pagamento único até a prova.",
    icon: Crown,
    highlight: true,
    features: [
      "Treine como candidato e como ator",
      "+120 estações clínicas",
      "Flashcards, resumos e cronograma",
      "Vídeo-chamada integrada",
    ],
  },
  {
    slug: "mensal",
    name: "Completo Mensal",
    price: "R$ 347",
    period: "/mês",
    badge: "Recorrente",
    desc: "Mesmo acesso do Completo, cobrado mês a mês.",
    icon: Repeat,
    features: [
      "Acesso a tudo enquanto ativo",
      "+600 checklists e flashcards",
      "Cancele quando quiser",
    ],
  },
  {
    slug: "ator",
    name: "Ator",
    price: "R$ 97",
    period: "/até a prova",
    badge: "Iniciante",
    desc: "Atue como paciente em salas e avalie candidatos.",
    icon: Users,
    features: [
      "Atuação como paciente ator",
      "Banco de roteiros do paciente",
      "Impressos e materiais liberados",
    ],
  },
];

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
  const { user, loading } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [plan, setPlan] = useState<PlanSlug>("completo");
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

  useEffect(() => {
    if (!loading && user) nav({ to: "/app" });
  }, [user, loading, nav]);

  const selectedPlan = useMemo(() => PLANS.find((p) => p.slug === plan)!, [plan]);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validações
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("Informe nome e sobrenome.");
      return;
    }
    if (!/^[a-zA-Z0-9_.]{3,20}$/.test(form.username)) {
      toast.error("Nick inválido", { description: "Use 3 a 20 caracteres (letras, números, . ou _)." });
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
          selected_plan: plan,
        },
      },
    });

    if (error) {
      setSubmitting(false);
      toast.error("Erro ao criar conta", { description: error.message });
      return;
    }

    // Garante que os dados extras fiquem em profiles (caso o trigger não cubra todos os campos)
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
          selected_plan: plan,
        },
        { onConflict: "id" },
      );
    }

    setSubmitting(false);
    toast.success("Conta criada!", {
      description: `Plano ${selectedPlan.name} selecionado. Em breve liberaremos o checkout.`,
    });
    nav({ to: "/app" });
  }

  async function handleGoogle() {
    // Salva o plano escolhido pra recuperar depois do redirect do Google
    try {
      localStorage.setItem("er_selected_plan", plan);
    } catch {}
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/app",
    });
    if (result.error) toast.error("Erro no Google", { description: String(result.error) });
  }

  return (
    <div className="min-h-screen bg-gradient-card">
      <div className="container mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8">
        <Logo />

        {/* Stepper */}
        <div className="mt-8 flex items-center justify-center gap-3 text-xs">
          <StepDot n={1} label="Escolher plano" active={step === 1} done={step === 2} />
          <div className="h-px w-8 bg-border" />
          <StepDot n={2} label="Seus dados" active={step === 2} />
        </div>

        {step === 1 && (
          <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Escolha seu plano</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Você pode mudar depois. Pagamento é processado via Hotmart.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {PLANS.map((p) => {
                const Icon = p.icon;
                const selected = plan === p.slug;
                return (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => setPlan(p.slug)}
                    className={`group relative flex flex-col rounded-2xl border-2 p-5 text-left transition-all ${
                      selected
                        ? "border-mint bg-mint/5 shadow-md"
                        : "border-border bg-background hover:border-mint/40"
                    }`}
                  >
                    {p.badge && (
                      <span
                        className={`absolute -top-2 right-4 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          p.highlight ? "bg-mint text-white" : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {p.badge}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${selected ? "text-mint" : "text-muted-foreground"}`} />
                      <span className="font-display text-lg font-bold">{p.name}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="font-display text-2xl font-bold">{p.price}</span>
                      <span className="text-xs text-muted-foreground">{p.period}</span>
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-xs">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-mint" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <div
                      className={`mt-4 flex items-center justify-center rounded-lg border py-2 text-xs font-medium transition-colors ${
                        selected ? "border-mint bg-mint text-white" : "border-border text-muted-foreground"
                      }`}
                    >
                      {selected ? "Selecionado" : "Selecionar"}
                    </div>
                  </button>
                );
              })}
            </div>

            <Button variant="hero" size="lg" className="mt-6 w-full" onClick={() => setStep(2)}>
              Continuar com {selectedPlan.name} <ArrowRight className="h-4 w-4" />
            </Button>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link to="/login" className="font-semibold text-medical hover:underline">
                Entrar
              </Link>
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" /> Trocar plano
            </button>

            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-bold">Crie sua conta</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Plano selecionado: <strong>{selectedPlan.name}</strong> · {selectedPlan.price}
                  <span className="text-muted-foreground">{selectedPlan.period}</span>
                </p>
              </div>
            </div>

            <Button type="button" variant="outline" size="lg" className="mt-6 w-full" onClick={handleGoogle}>
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              Cadastrar com Google
            </Button>

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
        )}
      </div>
    </div>
  );
}

function StepDot({ n, label, active, done }: { n: number; label: string; active?: boolean; done?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
          done ? "bg-mint text-white" : active ? "border-2 border-mint text-mint" : "border border-border text-muted-foreground"
        }`}
      >
        {done ? <Check className="h-3 w-3" /> : n}
      </span>
      <span className={active || done ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
