import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, CreditCard, QrCode, Crown, Drama, Lock, Copy, CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatWhatsapp, normalizeWhatsapp, isValidWhatsapp } from "@/lib/whatsapp";
import { formatCPF, isValidCPF } from "@/lib/cpf";
import { useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createPixPayment, createCardPayment, getPaymentStatus, getMpPublicKey } from "@/lib/mercadopago.functions";
import { createCardToken, getPaymentMethodFromBin } from "@/lib/mercadopago-client";

function translateError(msg: string): string {
  if (msg.includes("Password is known to be weak")) return "Esta senha é muito fraca e fácil de adivinhar. Por favor, escolha uma senha mais forte.";
  if (msg.includes("User already registered")) return "Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.";
  if (msg.includes("Collector user without key enabled")) return "A chave Pix não está configurada na sua conta do Mercado Pago. Por favor, acesse o painel do Mercado Pago, vá em 'Configurações' > 'Chaves Pix' e registre uma chave para poder receber pagamentos via Pix.";
  if (msg.includes("Email already in use")) return "Este e-mail já está em uso. Tente fazer login para continuar.";

  if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  return msg;
}

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
  const callCreatePix = useServerFn(createPixPayment);
  const callCreateCard = useServerFn(createCardPayment);
  const callGetStatus = useServerFn(getPaymentStatus);
  const callGetPublicKey = useServerFn(getMpPublicKey);

  const [form, setForm] = useState({
    title: "",
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
  const [installments, setInstallments] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [step, setStep] = useState<"form" | "pix" | "processing" | "success">("form");
  const [pixData, setPixData] = useState<{
    paymentId: string;
    qrCode: string;
    qrCodeBase64: string;
    ticketUrl: string | null;
    amountCents: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  useEffect(() => {
    if (open) {
      setPayment("pix");
      setAcceptedTerms(false);
      setStep("form");
      setPixData(null);
      setCopied(false);
      setShowPassword(false);
      setShowConfirmPassword(false);

      setInstallments(1);
    }
  }, [open]);

  // Poll status do PIX a cada 4s enquanto estiver na tela PIX
  useEffect(() => {
    if (step !== "pix" || !pixData) return;
    let stop = false;
    const tick = async () => {
      try {
        const { status } = await callGetStatus({ data: { paymentId: pixData.paymentId } });
        if (status === "approved") {
          if (!stop) {
            setStep("success");
            toast.success("Pagamento confirmado!", { description: "Seu acesso foi liberado." });
            setTimeout(() => {
              onOpenChange(false);
              nav({ to: "/app" });
            }, 1800);
          }
        }
      } catch (e) {
        // silencioso
      }
    };
    const id = setInterval(tick, 4000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [step, pixData, callGetStatus, nav, onOpenChange]);

  if (!plan) return null;
  const PlanIcon = plan.slug === "completo" ? Crown : Drama;
  const planAmountCents = plan.slug === "completo" ? 59700 : 14700;
  const installmentOptions = Array.from({ length: 10 }, (_, i) => {
    const n = i + 1;
    const value = planAmountCents / 100 / n;
    return { n, label: `${n}x de R$ ${value.toFixed(2).replace(".", ",")} sem juros` };
  });

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

    if (!form.title) {
      toast.error("Selecione como quer ser chamado(a): Dr. ou Dra.");
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
    
    // Garantir que não há sessão antiga interferindo (especialmente se um usuário foi deletado recentemente)
    await supabase.auth.signOut();

    const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`;

    const cpfDigits = form.cpf.replace(/\D/g, "");

    let signupResponse = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          full_name: fullName,
          title: form.title,
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

    // Se o usuário já existir, tentamos fazer login com a mesma senha.
    // Isso permite que o usuário retome um pagamento interrompido.
    if (signupResponse.error?.message.includes("already registered") || signupResponse.error?.message.includes("already in use")) {
      signupResponse = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      
      // Se der erro no login (senha errada), avisamos que o e-mail já está em uso
      if (signupResponse.error) {
        setSubmitting(false);
        toast.error("Este e-mail já possui uma conta", { 
          description: "Por favor, use a senha correta ou recupere sua senha para continuar com este e-mail." 
        });
        return;
      }
    } else if (signupResponse.error) {
      setSubmitting(false);
      toast.error("Erro no cadastro", { description: translateError(signupResponse.error.message) });
      return;
    }


    const signupData = signupResponse.data;


    const uid = signupData.user?.id;
    // Não criamos o profile aqui no front-end mais.
    // O profile e a assinatura serão criados pelo backend APÓS aprovação do pagamento.

    const signupDetails = {
      title: form.title,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      username: form.username.trim(),
      whatsapp: wppDigits,
      cpf: cpfDigits,
      birth_date: form.birth_date,
      selected_plan: plan.slug,
    };


    const payerInput = {
      email: form.email.trim().toLowerCase(),
      firstName: form.first_name.trim(),
      lastName: form.last_name.trim(),
      cpf: cpfDigits,
    };

    try {
      if (payment === "pix") {
        const res = await callCreatePix({ data: { planSlug: plan.slug, payer: payerInput, signupData: signupDetails } });
        if (!res.qrCode || !res.qrCodeBase64) {
          throw new Error("Mercado Pago não retornou QR Code.");
        }
        setPixData({
          paymentId: res.paymentId,
          qrCode: res.qrCode,
          qrCodeBase64: res.qrCodeBase64,
          ticketUrl: res.ticketUrl ?? null,
          amountCents: res.amountCents,
        });
        setStep("pix");
      } else {
        setStep("processing");
        const { publicKey } = await callGetPublicKey({});
        const bin = card.number.replace(/\D/g, "").slice(0, 6);
        const pm = await getPaymentMethodFromBin(publicKey, bin);
        if (!pm) throw new Error("Cartão não reconhecido pelo Mercado Pago.");
        const [expMonth, expYear] = card.expiry.split("/");
        const token = await createCardToken(publicKey, {
          cardNumber: card.number,
          cardholderName: card.name,
          expMonth,
          expYear,
          securityCode: card.cvv,
          docNumber: cpfDigits,
        });
        const result = await callCreateCard({
          data: {
            planSlug: plan.slug,
            token,
            installments,
            paymentMethodId: pm.id,
            issuerId: pm.issuer_id,
            payer: payerInput,
            signupData: signupDetails,
          },
        });

        if (result.status === "approved") {
          setStep("success");
          toast.success("Pagamento aprovado!");
          setTimeout(() => {
            onOpenChange(false);
            nav({ to: "/app" });
          }, 1800);
        } else if (result.status === "in_process" || result.status === "pending") {
          toast.info("Pagamento em análise", {
            description: "Você receberá uma confirmação por e-mail em instantes.",
          });
          onOpenChange(false);
          nav({ to: "/app" });
        } else {
          throw new Error(
            result.statusDetail === "cc_rejected_insufficient_amount"
              ? "Cartão sem saldo."
              : result.statusDetail === "cc_rejected_bad_filled_security_code"
              ? "CVV incorreto."
              : result.statusDetail === "cc_rejected_bad_filled_date"
              ? "Data de validade incorreta."
              : result.statusDetail === "cc_rejected_call_for_authorize"
              ? "Autorize a compra com seu banco e tente novamente."
              : "Pagamento recusado. Tente outro cartão.",
          );
        }
      }
    } catch (err: any) {
      console.error("[checkout]", err);
      toast.error("Falha no pagamento", { description: translateError(err?.message || "Tente novamente.") });
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyPix() {
    if (!pixData) return;
    try {
      await navigator.clipboard.writeText(pixData.qrCode);
      setCopied(true);
      toast.success("Código Pix copiado!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar. Selecione e copie manualmente.");
    }
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
              {step === "form"
                ? "Preencha seus dados e escolha como pagar. Você é redirecionado para a plataforma após confirmar."
                : step === "pix"
                ? "Escaneie o QR Code com o app do seu banco ou copie o código abaixo. Confirmação automática."
                : step === "processing"
                ? "Estamos validando seu cartão com segurança junto ao Mercado Pago…"
                : "Pagamento confirmado!"}
            </DialogDescription>
          </DialogHeader>
        </div>

        {step === "pix" && pixData ? (
          <div className="px-5 py-5 sm:px-7 sm:py-6 space-y-5">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-2xl border border-border bg-white p-4">
                <img
                  src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                  alt="QR Code Pix"
                  className="h-56 w-56"
                />
              </div>
              <div className="text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Valor</div>
                <div className="font-display text-2xl font-black tracking-tight">
                  R$ {(pixData.amountCents / 100).toFixed(2).replace(".", ",")}
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Pix copia e cola
              </Label>
              <div className="flex gap-2">
                <Input readOnly value={pixData.qrCode} className="font-mono text-xs" />
                <Button type="button" variant="outline" onClick={copyPix} className="shrink-0">
                  {copied ? <CheckCircle2 className="h-4 w-4 text-mint" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Aguardando confirmação do pagamento…
            </div>

            {pixData.ticketUrl ? (
              <a
                href={pixData.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Abrir comprovante no Mercado Pago
              </a>
            ) : null}
          </div>
        ) : step === "processing" ? (
          <div className="flex flex-col items-center gap-4 px-5 py-12 sm:px-7">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Validando cartão com segurança…</p>
          </div>
        ) : step === "success" ? (
          <div className="relative flex flex-col items-center gap-5 overflow-hidden px-5 py-14 text-center sm:px-7">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-mint/10 via-transparent to-primary/10" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-mint/15 ring-4 ring-mint/30">
              <div className="absolute inset-0 animate-ping rounded-full bg-mint/20" />
              <CheckCircle2 className="relative h-14 w-14 text-mint" strokeWidth={2.5} />
            </div>
            <div className="relative space-y-2">
              <h2 className="font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                Pagamento aprovado! 🎉
              </h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                Seu acesso à REVMED foi liberado.
              </p>
              <p className="text-xs text-muted-foreground">
                Enviamos um e-mail de confirmação para <span className="font-semibold text-foreground">{form.email}</span>.
              </p>
            </div>
            <div className="relative flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-xs font-semibold text-mint">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Redirecionando para o painel…
            </div>
          </div>
        ) : (
        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Seus dados</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Como quer ser chamado(a)</Label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {(["Dr.", "Dra."] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => update("title", t)}
                        className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                          form.title === t
                            ? "border-primary bg-primary/15 text-primary ring-2 ring-primary/40"
                            : "border-border bg-card text-foreground hover:border-primary/50"
                        }`}
                        aria-pressed={form.title === t}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
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
                  <div className="relative">
                    <Input
                      id="m_pwd"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="m_cpwd">Confirmar senha</Label>
                  <div className="relative">
                    <Input
                      id="m_cpwd"
                      type={showConfirmPassword ? "text" : "password"}
                      value={form.confirm}
                      onChange={(e) => update("confirm", e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
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
                  <div>
                    <Label htmlFor="m_card_inst">Parcelamento</Label>
                    <select
                      id="m_card_inst"
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      {installmentOptions.map((opt) => (
                        <option key={opt.n} value={opt.n}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-[11px] text-mint">
                      ✨ Em até 10x sem juros no cartão.
                    </p>
                  </div>
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Lock className="h-3 w-3" /> Seus dados são processados em ambiente seguro.
                  </p>
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-3">
              <Checkbox
                id="m_terms"
                checked={acceptedTerms}
                onCheckedChange={(v) => setAcceptedTerms(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="m_terms" className="text-xs font-normal leading-relaxed text-muted-foreground">
                Li e concordo com os{" "}
                <Link to="/termos" target="_blank" rel="noopener noreferrer" className="font-medium text-mint underline-offset-2 hover:underline">
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link to="/privacidade" target="_blank" rel="noopener noreferrer" className="font-medium text-mint underline-offset-2 hover:underline">
                  Política de Privacidade
                </Link>{" "}
                da REVMED.
              </Label>
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting || !acceptedTerms}>
              {submitting ? "Processando..." : (
                <>Criar conta e pagar {plan.price} <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}