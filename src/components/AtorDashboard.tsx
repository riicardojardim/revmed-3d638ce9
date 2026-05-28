import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Theater } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";

export function AtorDashboard() {
  const { profile, user } = useAuth();
  const name = (profile?.full_name || user?.email || "Ator").split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <header className="space-y-3">
        <Badge className="border-mint/40 bg-mint/15 text-mint hover:bg-mint/15">
          <Theater className="mr-1 h-3 w-3" /> Plano Ator
        </Badge>
        <p className="text-sm text-muted-foreground">Bem-vindo, ator</p>
        <h1 className="font-display text-2xl font-bold leading-tight md:text-3xl">
          Olá, {name}. Pronto para conduzir uma estação?
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Como ator você escolhe a estação, recebe um código de sala automático, interpreta o
          paciente padronizado, libera os impressos quando solicitados e, ao encerrar, desbloqueia
          o PEP para avaliar o candidato em tempo real.
        </p>
      </header>

      {/* Entry hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-hero p-6 text-white shadow-elegant md:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-mint/30 blur-3xl" />
        <div className="relative space-y-4">
          <Badge className="border-mint/40 bg-mint/15 text-mint hover:bg-mint/15">
            <Sparkles className="mr-1 h-3 w-3" /> Banca
          </Badge>
          <h2 className="font-display text-2xl font-bold leading-tight md:text-3xl">
            Escolha uma estação e abra sua sala
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-white/80">
            Ao selecionar a estação, o sistema gera automaticamente um <strong>código de sala</strong>.
            Esse mesmo código é usado pelo candidato para entrar — e por você, como Ator.
          </p>
          <Link to="/app/checklists" className="inline-block">
            <Button variant="hero" size="lg">
              Escolher estação <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Como funciona */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-semibold">Como funciona seu papel</h3>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            {[
              <>Escolha a <strong className="text-foreground">estação</strong> que você quer conduzir.</>,
              <>O <strong className="text-foreground">código da sala</strong> é gerado automaticamente — o mesmo código que o candidato usa para entrar.</>,
              <>Ajuste o <strong className="text-foreground">tempo do cronômetro</strong> se precisar e clique em <strong className="text-foreground">Iniciar</strong>.</>,
              <>Durante a estação, você acompanha todas as <strong className="text-foreground">falas do paciente</strong>, já tem o <strong className="text-foreground">PEP disponível</strong> para ir marcando, e libera os <strong className="text-foreground">impressos bloqueados</strong> conforme o candidato solicita.</>,
              <>Ao <strong className="text-foreground">encerrar</strong>, o <strong className="text-foreground">PEP é desbloqueado para o candidato</strong> — antes do fim ele não vê nada do checklist, só ao terminar para analisarem juntos em tempo real.</>,
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint/15 text-xs font-bold text-mint">
                  {i + 1}
                </span>
                <span className="flex-1">{text}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-semibold">Boas práticas do ator</h3>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" />
              <span>Mantenha-se fiel ao roteiro: revele informações somente quando perguntado.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" />
              <span>Use a tri-avaliação: Adequado, Parcialmente adequado, Inadequado.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" />
              <span>Só libere o impresso quando o candidato pedir — é parte da avaliação.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" />
              <span>Respeite o tempo da estação — o cronômetro é sincronizado com o candidato.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
