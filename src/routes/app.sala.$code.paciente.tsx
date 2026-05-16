import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadStation, type LoadedStation } from "@/lib/stationLoader";
import { UserRound, AlertTriangle, ArrowLeft, Theater } from "lucide-react";

export const Route = createFileRoute("/app/sala/$code/paciente")({
  component: PatientView,
  head: () => ({ meta: [{ title: "Roteiro do paciente — Estação Revalida" }] }),
});

function PatientView() {
  const { code } = Route.useParams();
  const [station, setStation] = useState<LoadedStation | null>(null);
  const [stationTitle, setStationTitle] = useState("");

  useEffect(() => {
    (async () => {
      const { data: room } = await supabase.from("training_rooms")
        .select("station_id, station_title").eq("code", code).maybeSingle();
      if (room) {
        setStationTitle(room.station_title);
        setStation(await loadStation(room.station_id));
      }
    })();
  }, [code]);

  if (!station) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/app/sala/$code" params={{ code }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar à sala
      </Link>

      <div className="rounded-3xl border border-rose-200/40 bg-gradient-to-br from-rose-50/60 to-amber-50/40 p-6 dark:from-rose-900/10 dark:to-amber-900/10">
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-300/40 bg-rose-100/40 px-3 py-1 text-xs font-medium text-rose-700 dark:text-rose-300">
          <Theater className="h-3.5 w-3.5" /> Roteiro do paciente / ator
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold md:text-3xl">{stationTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Você é o paciente nesta estação. Não veja o checklist — apenas siga o roteiro.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200/60 bg-amber-50/60 p-4 text-sm text-amber-900 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-200">
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4" /> Regras de interpretação
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Responda apenas o que for perguntado pelo candidato.</li>
          <li>Não revele espontaneamente informações sensíveis.</li>
          <li>Mantenha o comportamento descrito (ansiedade, dor, calma...).</li>
          <li>Não corrija o candidato durante a estação.</li>
        </ul>
      </div>

      <Section title="Caso clínico (contexto)">
        <p className="leading-relaxed">{station.clinicalCase}</p>
      </Section>

      <Section title="Sinais simulados">
        <p>{station.patientInfo || "—"}</p>
      </Section>

      <Section title="Roteiro detalhado do paciente" highlight>
        <p className="whitespace-pre-wrap leading-relaxed">{station.patientScript}</p>
      </Section>

      <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-xs text-muted-foreground">
        <UserRound className="mr-1 inline h-3.5 w-3.5 text-mint" />
        Esta tela é exclusiva do paciente/ator. O candidato e o avaliador não veem este conteúdo.
      </div>
    </div>
  );
}

function Section({ title, children, highlight }: { title: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <section className={`rounded-2xl border p-5 ${highlight ? "border-mint/40 bg-mint/5" : "border-border bg-card"}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="mt-2 text-sm md:text-base">{children}</div>
    </section>
  );
}
