import { CheckCircle2, Loader2, Crown, Drama } from "lucide-react";

export type PlanSlug = "ator" | "completo";

export type SignupModalPlan = {
  slug: PlanSlug;
  name: string;
  price: string;
  priceCents: number;
  cadence?: string;
};

export function SignupPaymentModal({
  open: originalOpen,
  onOpenChange,
  plan: originalPlan,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: SignupModalPlan | null;
}) {
  const plan: SignupModalPlan = originalPlan || {
    slug: "completo",
    name: "Plano Completo",
    price: "R$ 897",
    priceCents: 89700
  };

  const PlanIcon = plan.slug === "completo" ? Crown : Drama;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="bg-background rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-border">
        <div className="border-b border-border bg-gradient-to-br from-primary/10 via-card to-card px-5 py-5 sm:px-7 sm:py-6">
          <div className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
                <PlanIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Plano selecionado
                </div>
                <div className="font-display text-lg font-black tracking-tight sm:text-xl text-foreground">
                  {plan.name} · {plan.price}
                  {plan.cadence ? <span className="ml-1.5 text-xs font-medium text-muted-foreground">{plan.cadence}</span> : null}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Pagamento confirmado!
            </p>
          </div>
        </div>

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
              Enviamos um e-mail de confirmação para <span className="font-semibold text-foreground">exemplo@email.com</span>.
            </p>
          </div>
          <div className="relative flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-xs font-semibold text-mint">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Redirecionando para o painel…
          </div>
        </div>
        <button onClick={() => onOpenChange(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">X</button>
      </div>
    </div>
  );
}
