import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, CreditCard, QrCode, Crown, Drama, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatWhatsapp, normalizeWhatsapp, isValidWhatsapp } from "@/lib/whatsapp";
import { formatCPF, isValidCPF } from "@/lib/cpf";
import { useNavigate, Link } from "@tanstack/react-router";

export type PlanSlug = "ator" | "completo";

export type SignupModalPlan = {
  slug: PlanSlug;
  name: string;
  price: string;
  cadence?: string;
};

function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length < 3) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export function SignupPaymentModal({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: SignupModalPlan | null;
}) {
  const nav = useNavigate();
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
  const [payment, setPayment] = useState<"pix" | "cartao">("pix");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [submitting, setSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (open) {
      setPayment("pix");
      setAcceptedTerms(false);
    }
  }, [open]);

  if (!plan) return null;
  const PlanIcon = plan.slug === "completo" ? Crown : Drama;

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) return;

    if (!acceptedTerms) {
      toast.error("Aceite os Termos de Uso e a Política de Privacidade para continuar.");
      return;
    }

    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("Informe nome e sobrenome."); return;
    }
    if (!/^[a-z0-9_.]{3,20}$/.test(form.username)) {
      toast.error("Nick inválido", { description: "Use 3 a 20 caracteres (letras, números, . ou _)." }); return;
    }
    if (/^[._]|[._]$|[._]{2,}/.test(form.username)) {
      toast.error("Nick inválido", { description: "Não pode começar/terminar com . ou _, nem ter dois seguidos." }); return;
    }
    const wppDigits = normalizeWhatsapp(form.whatsapp);
    if (!wppDigits || !isValidWhatsapp(wppDigits)) {
      toast.error("WhatsApp inválido. Use (XX) 9XXXX-XXXX."); return;
    }
    if (!isValidCPF(form.cpf)) { toast.error("CPF inválido."); return; }
    if (!form.birth_date) { toast.error("Informe a data de nascimento."); return; }
    const birth = new Date(form.birth_date);
    const age = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (isNaN(birth.getTime()) || age < 16 || age > 100) { toast.error("Data de nascimento inválida."); return; }
    if (form.password.length < 6) { toast.error("A senha precisa ter pelo menos 6 caracteres."); return; }
    if (form.password !== form.confirm) { toast.error("As senhas não conferem."); return; }

    if (payment === "cartao") {
      const num = card.number.replace(/\s/g, "");
      if (num.length < 13) { toast.error("Número do cartão inválido."); return; }
      if (!card.name.trim()) { toast.error("Informe o nome impresso no cartão."); return; }
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) { toast.error("Validade inválida (MM/AA)."); return; }
      if (!/^\d{3,4}$/.test(card.cvv)) { toast.error("CVV inválido."); return; }
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
          selected_plan: plan.slug,
          payment_method: payment,
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
          selected_plan: plan.slug,
        },
        { onConflict: "id" },
      );
    }

    setSubmitting(false);
    toast.success("Conta criada!", {
      description:
        payment === "pix"
          ? `Plano ${plan.name}. Em instantes geramos seu Pix.`
          : `Plano ${plan.name}. Confirmaremos a cobrança no cartão em instantes.`,
    });
    onOpenChange(false);
    nav({ to: "/app" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto p-0 sm:w-full">
        <div className="border-b border-border bg-gradient-to-br from-primary/10 via-card to-card px-5 py-5 sm:px-7 sm:py-6">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
                <PlanIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Plano selecionado
                </div>
                <DialogTitle className="font-display text-lg font-black tracking-tight sm:text-xl">
                  {plan.name} · {plan.price}
                  {plan.cadence ? <span className="ml-1.5 text-xs font-medium text-muted-foreground">{plan.cadence}</span> : null}
                </DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
              Preencha seus dados e escolha como pagar. Você é redirecionado para a plataforma após confirmar.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Seus dados</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="m_first">Nome</Label>
                  <Input id="m_first" value={form.first_name} onChange={(e) => update("first_name", e.target.value)} required autoComplete="given-name" />
                </div>
                <div>
                  <Label htmlFor="m_last">Sobrenome</Label>
                  <Input id="m_last" value={form.last_name} onChange={(e) => update("last_name", e.target.value)} required autoComplete="family-name" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="m_user">Nick (como vai aparecer)</Label>
                  <Input id="m_user" value={form.username} onChange={(e) => update("username", e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))} placeholder="ex: dra.ana" required maxLength={20} autoComplete="username" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="m_email">E-mail</Label>
                  <Input id="m_email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="m_wpp">WhatsApp</Label>
                  <Input id="m_wpp" type="tel" inputMode="numeric" autoComplete="tel" placeholder="(11) 99999-9999" maxLength={16} value={form.whatsapp} onChange={(e) => update("whatsapp", formatWhatsapp(e.target.value))} required />
                </div>
                <div>
                  <Label htmlFor="m_birth">Nascimento</Label>
                  <Input id="m_birth" type="date" value={form.birth_date} onChange={(e) => update("birth_date", e.target.value)} required max={new Date().toISOString().slice(0, 10)} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="m_cpf">CPF</Label>
                  <Input id="m_cpf" inputMode="numeric" placeholder="000.000.000-00" maxLength={14} value={form.cpf} onChange={(e) => update("cpf", formatCPF(e.target.value))} required />
                </div>
                <div>
                  <Label htmlFor="m_pwd">Senha</Label>
                  <Input id="m_pwd" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={6} autoComplete="new-password" />
                </div>
                <div>
                  <Label htmlFor="m_cpwd">Confirmar senha</Label>
                  <Input id="m_cpwd" type="password" value={form.confirm} onChange={(e) => update("confirm", e.target.value)} required minLength={6} autoComplete="new-password" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Forma de pagamento</h3>
              <Tabs value={payment} onValueChange={(v) => setPayment(v as "pix" | "cartao")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="pix" className="gap-2"><QrCode className="h-4 w-4" />Pix</TabsTrigger>
                  <TabsTrigger value="cartao" className="gap-2"><CreditCard className="h-4 w-4" />Cartão</TabsTrigger>
                </TabsList>
                <TabsContent value="pix" className="mt-4">
                  <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <div>
                        <p className="font-semibold text-foreground">Pagamento instantâneo via Pix</p>
                        <p className="mt-1 text-xs sm:text-sm">
                          Após confirmar, geramos um QR Code Pix de <span className="font-semibold text-foreground">{plan.price}</span>. A liberação do acesso é automática assim que o pagamento for compensado.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="cartao" className="mt-4 space-y-3">
                  <div>
                    <Label htmlFor="m_card_num">Número do cartão</Label>
                    <Input id="m_card_num" inputMode="numeric" placeholder="0000 0000 0000 0000" value={card.number} onChange={(e) => setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))} autoComplete="cc-number" />
                  </div>
                  <div>
                    <Label htmlFor="m_card_name">Nome impresso no cartão</Label>
                    <Input id="m_card_name" value={card.name} onChange={(e) => setCard((c) => ({ ...c, name: e.target.value.toUpperCase() }))} placeholder="COMO ESTÁ NO CARTÃO" autoComplete="cc-name" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="m_card_exp">Validade</Label>
                      <Input id="m_card_exp" inputMode="numeric" placeholder="MM/AA" maxLength={5} value={card.expiry} onChange={(e) => setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }))} autoComplete="cc-exp" />
                    </div>
                    <div>
                      <Label htmlFor="m_card_cvv">CVV</Label>
                      <Input id="m_card_cvv" inputMode="numeric" placeholder="123" maxLength={4} value={card.cvv} onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, "") }))} autoComplete="cc-csc" />
                    </div>
                  </div>
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Lock className="h-3 w-3" /> Seus dados são processados em ambiente seguro.
                  </p>
                </TabsContent>
              </Tabs>
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Processando..." : (
                <>Criar conta e pagar {plan.price} <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Ao continuar você concorda com os Termos e a Política de Privacidade.
            </p>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}