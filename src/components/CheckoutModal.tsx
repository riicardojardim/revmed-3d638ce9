import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Crown, Repeat, Users, CreditCard, QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatWhatsapp, normalizeWhatsapp, isValidWhatsapp } from "@/lib/whatsapp";

export type CheckoutPlanSlug = "completo" | "mensal" | "ator";

const PLAN_META: Record<CheckoutPlanSlug, { name: string; price: string; period: string; icon: typeof Crown }> = {
  completo: { name: "Completo", price: "R$ 497", period: "até a prova", icon: Crown },
  mensal: { name: "Completo Mensal", price: "R$ 197", period: "por mês", icon: Repeat },
  ator: { name: "Ator", price: "R$ 97", period: "até a prova", icon: Users },
};

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

type PaymentMethod = "pix" | "card";

interface Props {
  plan: CheckoutPlanSlug | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CheckoutModal({ plan, open, onOpenChange }: Props) {
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
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [submitting, setSubmitting] = useState(false);

  if (!plan) return null;
  const meta = PLAN_META[plan];
  const Icon = meta.icon;

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) return;

    if (!form.first_name.trim() || !form.last_name.trim()) return toast.error("Informe nome e sobrenome.");
    if (!/^[a-zA-Z0-9_.]{3,20}$/.test(form.username))
      return toast.error("Nick inválido", { description: "3 a 20 caracteres (letras, números, . ou _)." });
    const wppDigits = normalizeWhatsapp(form.whatsapp);
    if (!wppDigits || !isValidWhatsapp(wppDigits)) return toast.error("WhatsApp inválido.");
    if (!isValidCPF(form.cpf)) return toast.error("CPF inválido.");
    if (!form.birth_date) return toast.error("Informe a data de nascimento.");
    const birth = new Date(form.birth_date);
    const age = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (isNaN(birth.getTime()) || age < 16 || age > 100) return toast.error("Data de nascimento inválida.");
    if (form.password.length < 6) return toast.error("Senha precisa ter pelo menos 6 caracteres.");
    if (form.password !== form.confirm) return toast.error("As senhas não conferem.");

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
          payment_method: method,
        },
      },
    });

    if (error) {
      setSubmitting(false);
      return toast.error("Erro ao criar conta", { description: error.message });
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
          selected_plan: plan,
        },
        { onConflict: "id" },
      );
    }

    setSubmitting(false);
    toast.success("Conta criada!", {
      description: `Plano ${meta.name} • ${method === "pix" ? "Pix" : "Cartão"}. Em breve liberaremos o checkout.`,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Finalizar assinatura</DialogTitle>
          <DialogDescription>Crie sua conta e escolha como pagar. Acesso liberado após confirmação.</DialogDescription>
        </DialogHeader>

        {/* Plan summary */}
        <div className="flex items-center justify-between rounded-2xl border border-mint/30 bg-mint/5 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Icon className="h-5 w-5 text-mint" />
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Plano</div>
              <div className="font-display text-base font-bold">{meta.name}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-lg font-extrabold text-primary">{meta.price}</div>
            <div className="text-[11px] text-muted-foreground">{meta.period}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="cm_first">Nome</Label>
            <Input id="cm_first" value={form.first_name} onChange={(e) => update("first_name", e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="cm_last">Sobrenome</Label>
            <Input id="cm_last" value={form.last_name} onChange={(e) => update("last_name", e.target.value)} required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="cm_user">Nick (como vai aparecer)</Label>
            <Input
              id="cm_user"
              value={form.username}
              onChange={(e) => update("username", e.target.value.toLowerCase().replace(/\s/g, ""))}
              placeholder="ex: dra.ana"
              maxLength={20}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="cm_email">E-mail</Label>
            <Input id="cm_email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="cm_wpp">WhatsApp</Label>
            <Input
              id="cm_wpp"
              type="tel"
              inputMode="numeric"
              placeholder="(11) 99999-9999"
              maxLength={16}
              value={form.whatsapp}
              onChange={(e) => update("whatsapp", formatWhatsapp(e.target.value))}
              required
            />
          </div>
          <div>
            <Label htmlFor="cm_birth">Data de nascimento</Label>
            <Input
              id="cm_birth"
              type="date"
              value={form.birth_date}
              onChange={(e) => update("birth_date", e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="cm_cpf">CPF</Label>
            <Input
              id="cm_cpf"
              inputMode="numeric"
              placeholder="000.000.000-00"
              maxLength={14}
              value={form.cpf}
              onChange={(e) => update("cpf", formatCPF(e.target.value))}
              required
            />
          </div>
          <div>
            <Label htmlFor="cm_pwd">Senha</Label>
            <Input id="cm_pwd" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} minLength={6} required />
          </div>
          <div>
            <Label htmlFor="cm_pwd2">Confirmar senha</Label>
            <Input id="cm_pwd2" type="password" value={form.confirm} onChange={(e) => update("confirm", e.target.value)} minLength={6} required />
          </div>

          {/* Payment method */}
          <div className="sm:col-span-2">
            <Label className="mb-2 block">Forma de pagamento</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod("pix")}
                className={`flex items-center gap-2 rounded-xl border-2 p-3 text-left transition-all ${
                  method === "pix" ? "border-mint bg-mint/10" : "border-border hover:border-mint/40"
                }`}
              >
                <QrCode className="h-5 w-5 text-mint" />
                <div>
                  <div className="text-sm font-bold">Pix</div>
                  <div className="text-[11px] text-muted-foreground">Aprovação na hora</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMethod("card")}
                className={`flex items-center gap-2 rounded-xl border-2 p-3 text-left transition-all ${
                  method === "card" ? "border-mint bg-mint/10" : "border-border hover:border-mint/40"
                }`}
              >
                <CreditCard className="h-5 w-5 text-mint" />
                <div>
                  <div className="text-sm font-bold">Cartão de crédito</div>
                  <div className="text-[11px] text-muted-foreground">Até 12x</div>
                </div>
              </button>
            </div>
          </div>

          <div className="sm:col-span-2 space-y-2 pt-2">
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Processando..." : (
                <>
                  Finalizar e pagar com {method === "pix" ? "Pix" : "cartão"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-mint" />
              7 dias de garantia incondicional · 100% do valor de volta
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
