import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Users, Stethoscope, ClipboardCheck, Clock, Theater } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";

export function AtorDashboard() {
  const { profile, user } = useAuth();
  const { daysLeft } = useSubscription();
  const name = (profile?.full_name || user?.email || "Ator").split(" ")[0];

  const stats = [
    { icon: ClipboardCheck, label: "Correções feitas", value: "—" },
    { icon: Users, label: "Candidatos avaliados", value: "—" },
    { icon: Stethoscope, label: "Especialidades", value: "Todas" },
    { icon: Clock, label: "Validade do plano", value: daysLeft != null ? `${daysLeft} dias` : "Ativo" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-center gap-2">
        <Badge className="border-mint/40 bg-mint/15 text-mint">
          <Theater className="mr-1 h-3 w-3" /> Plano Ator / Avaliador
        </Badge>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Bem-vindo, ator</p>
        <h1 className="font-display text-2xl font-bold md:text-3xl">
          Olá, {name}. Pronto para conduzir uma estação?
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Como ator você entra em salas de treino, interpreta o paciente padronizado
          e aplica o checklist avaliando o PEP para gerar a nota do candidato em tempo real.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <s.icon className="h-4 w-4 text-mint" />
              {s.label}
            </div>
            <div className="mt-2 font-display text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Entry hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-hero p-6 text-white shadow-elegant md:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-mint/30 blur-3xl" />
        <Badge className="border-mint/40 bg-mint/15 text-mint hover:bg-mint/15">
          <Sparkles className="mr-1 h-3 w-3" /> Banca avaliadora
        </Badge>
        <h2 className="mt-4 font-display text-2xl font-bold md:text-3xl">
          Entre em uma sala de treino
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-white/80">
          Use o código fornecido pelo candidato (ou pelo professor) para acessar a sala como
          ator/avaliador. Você terá acesso ao roteiro do paciente, impressos e ao checklist PEP completo.
        </p>
        <Link to="/app/treinar" className="mt-6 inline-block">
          <Button variant="hero" size="lg">
            Acessar salas <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-semibold">Como funciona seu papel</h3>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint/15 text-xs font-bold text-mint">1</span>
              Escolha a <strong className="text-foreground">estação</strong> que você quer conduzir.
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint/15 text-xs font-bold text-mint">2</span>
              Um <strong className="text-foreground">código da sala</strong> é gerado automaticamente — o mesmo código serve para o candidato entrar e para você entrar como <strong className="text-foreground">Ator/Avaliador</strong>.
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint/15 text-xs font-bold text-mint">3</span>
              Ajuste o <strong className="text-foreground">tempo do cronômetro</strong> se precisar e clique em <strong className="text-foreground">Iniciar</strong>.
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint/15 text-xs font-bold text-mint">4</span>
              Durante a estação, você vê todas as <strong className="text-foreground">falas do paciente</strong> e libera os <strong className="text-foreground">impressos</strong> conforme o candidato solicita.
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint/15 text-xs font-bold text-mint">5</span>
              Ao <strong className="text-foreground">encerrar</strong>, o <strong className="text-foreground">PEP</strong> é desbloqueado para você avaliar — e fica visível para o candidato acompanhar a correção em tempo real.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-semibold">Boas práticas do ator</h3>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>• Mantenha-se fiel ao roteiro: revele informações somente quando perguntado.</li>
            <li>• Use a tri-avaliação: Adequado (1.0), Parcial (0.5), Inadequado (0).</li>
            <li>• Comente itens-chave para enriquecer o feedback final.</li>
            <li>• Respeite o tempo da estação — o cronômetro é sincronizado com o candidato.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
