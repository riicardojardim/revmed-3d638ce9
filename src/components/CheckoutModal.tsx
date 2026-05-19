import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Crown, Repeat, Users, CreditCard, QrCode, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatWhatsapp, normalizeWhatsapp, isValidWhatsapp } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

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

/**
 * Sheet-style content para mobile + dialog centralizado a partir de sm.
 * Substitui o DialogContent padrão para conseguir o comportamento responsivo
 * sem mexer no shadcn/Dialog global.
 */
function SheetContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          // mobile: modal centralizado com margens (não cola nas bordas)
          "fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-1.5rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-background shadow-2xl outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
          // sm+: dialog maior centralizado
          "sm:max-h-[92vh] sm:w-full sm:max-w-2xl",
          className,
        )}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/70 text-foreground/80 transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring sm:right-4 sm:top-4 sm:h-9 sm:w-9"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
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
    if (!/^[a-z0-9_.]{3,20}$/.test(form.username))
      return toast.error("Usuário inválido", { description: "3 a 20 caracteres: letras minúsculas, números, . ou _ (sem espaços)." });
    if (/^[._]|[._]$|[._]{2,}/.test(form.username))
      return toast.error("Usuário inválido", { description: "Não pode começar/terminar com . ou _, nem repetir esses símbolos." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return toast.error("E-mail inválido.");
    const wppDigits = normalizeWhatsapp(form.whatsapp);
    if (!wppDigits || !isValidWhatsapp(wppDigits)) return toast.error("Telefone inválido.", { description: "Use DDD + número, ex: (11) 99999-9999." });
    if (!isValidCPF(form.cpf)) return toast.error("CPF inválido.");
    if (!form.birth_date) return toast.error("Informe a data de nascimento.");
    const birth = new Date(form.birth_date);
    const age = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (isNaN(birth.getTime()) || age < 16 || age > 100) return toast.error("Data de nascimento inválida.");
    if (form.password.length < 6) return toast.error("Senha precisa ter pelo menos 6 caracteres.");
    if (form.password !== form.confirm) return toast.error("As senhas não conferem.");

    setSubmitting(true);

    // Checa disponibilidade do nome de usuário
    const { data: taken, error: checkErr } = await supabase.rpc("username_exists", { _username: form.username.trim() });
    if (checkErr) {
      setSubmitting(false);
      return toast.error("Erro ao validar usuário", { description: checkErr.message });
    }
    if (taken === true) {
      setSubmitting(false);
      return toast.error("Usuário já está em uso", { description: "Escolha outro nome de usuário." });
    }

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

  const inputCls =
    "h-11 rounded-xl text-[16px]"; // 16px evita zoom no iOS

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {/* Header fixo */}
        <div className="shrink-0 border-b border-border/60 px-4 pb-3 pt-3 sm:px-6 sm:pt-5">
          <DialogPrimitive.Title className="font-display text-lg font-bold sm:text-xl">
            Finalizar assinatura
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Crie sua conta e escolha como pagar. Acesso liberado após a confirmação.
          </DialogPrimitive.Description>

          {/* Plan summary */}
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-mint/30 bg-gradient-to-br from-mint/10 to-mint-soft/40 px-3.5 py-2.5 sm:px-4 sm:py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint/20">
                <Icon className="h-4.5 w-4.5 text-primary" />
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Plano</div>
                <div className="truncate font-display text-sm font-bold sm:text-base">{meta.name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-lg font-extrabold leading-none text-primary sm:text-xl">
                {meta.price}
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground sm:text-[11px]">{meta.period}</div>
            </div>
          </div>
        </div>

        {/* Form scrollável */}
        <form
          id="checkout-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="cm_first" className="mb-1.5 block text-xs">Nome</Label>
              <Input id="cm_first" autoComplete="given-name" className={inputCls} value={form.first_name} onChange={(e) => update("first_name", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="cm_last" className="mb-1.5 block text-xs">Sobrenome</Label>
              <Input id="cm_last" autoComplete="family-name" className={inputCls} value={form.last_name} onChange={(e) => update("last_name", e.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="cm_user" className="mb-1.5 block text-xs">Nick (como vai aparecer)</Label>
              <Input
                id="cm_user"
                autoComplete="username"
                className={inputCls}
                value={form.username}
                onChange={(e) => update("username", e.target.value.toLowerCase().replace(/\s/g, ""))}
                placeholder="ex: dra.ana"
                maxLength={20}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="cm_email" className="mb-1.5 block text-xs">E-mail</Label>
              <Input id="cm_email" type="email" inputMode="email" autoComplete="email" className={inputCls} value={form.email} onChange={(e) => update("email", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="cm_wpp" className="mb-1.5 block text-xs">WhatsApp</Label>
              <Input
                id="cm_wpp"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                className={inputCls}
                placeholder="(11) 99999-9999"
                maxLength={16}
                value={form.whatsapp}
                onChange={(e) => update("whatsapp", formatWhatsapp(e.target.value))}
                required
              />
            </div>
            <div>
              <Label htmlFor="cm_birth" className="mb-1.5 block text-xs">Data de nascimento</Label>
              <Input
                id="cm_birth"
                type="date"
                autoComplete="bday"
                className={inputCls}
                value={form.birth_date}
                onChange={(e) => update("birth_date", e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="cm_cpf" className="mb-1.5 block text-xs">CPF</Label>
              <Input
                id="cm_cpf"
                inputMode="numeric"
                className={inputCls}
                placeholder="000.000.000-00"
                maxLength={14}
                value={form.cpf}
                onChange={(e) => update("cpf", formatCPF(e.target.value))}
                required
              />
            </div>
            <div>
              <Label htmlFor="cm_pwd" className="mb-1.5 block text-xs">Senha</Label>
              <Input id="cm_pwd" type="password" autoComplete="new-password" className={inputCls} value={form.password} onChange={(e) => update("password", e.target.value)} minLength={6} required />
            </div>
            <div>
              <Label htmlFor="cm_pwd2" className="mb-1.5 block text-xs">Confirmar senha</Label>
              <Input id="cm_pwd2" type="password" autoComplete="new-password" className={inputCls} value={form.confirm} onChange={(e) => update("confirm", e.target.value)} minLength={6} required />
            </div>

            {/* Payment method */}
            <div className="sm:col-span-2">
              <Label className="mb-2 block text-xs">Forma de pagamento</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod("pix")}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border-2 p-3 text-left transition-all min-h-12",
                    method === "pix" ? "border-mint bg-mint/10 shadow-sm" : "border-border hover:border-mint/40",
                  )}
                >
                  <QrCode className={cn("h-5 w-5", method === "pix" ? "text-mint" : "text-muted-foreground")} />
                  <div>
                    <div className="text-sm font-bold leading-tight">Pix</div>
                    <div className="text-[11px] text-muted-foreground">Aprovação na hora</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("card")}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border-2 p-3 text-left transition-all min-h-12",
                    method === "card" ? "border-mint bg-mint/10 shadow-sm" : "border-border hover:border-mint/40",
                  )}
                >
                  <CreditCard className={cn("h-5 w-5", method === "card" ? "text-mint" : "text-muted-foreground")} />
                  <div>
                    <div className="text-sm font-bold leading-tight">Cartão</div>
                    <div className="text-[11px] text-muted-foreground">Até 12x</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Footer sticky com CTA */}
        <div
          className="shrink-0 border-t border-border/60 bg-background/95 px-4 pb-4 pt-3 backdrop-blur-md sm:px-6"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
        >
          <Button
            type="submit"
            form="checkout-form"
            size="lg"
            className="h-12 w-full rounded-xl bg-mint text-sm font-bold text-night shadow-glow hover:bg-mint/90"
            disabled={submitting}
          >
            {submitting ? (
              "Processando..."
            ) : (
              <>
                Finalizar e pagar com {method === "pix" ? "Pix" : "cartão"}
                <ArrowRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-mint" />
            7 dias de garantia · 100% do valor de volta
          </p>
        </div>
      </SheetContent>
    </Dialog>
  );
}
