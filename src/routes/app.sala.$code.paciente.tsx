import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { loadStation, type LoadedStation } from "@/lib/stationLoader";
import {
  ArrowLeft, Theater, AlertTriangle, UserRound, Send, Check, PackageCheck,
  CheckCircle2, XCircle, RotateCw, ClipboardCheck, Pill, FileText, Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/sala/$code/paciente")({
  component: ActorView,
  head: () => ({ meta: [{ title: "Roteiro do Ator — Estação Revalida" }] }),
});

type Room = { id: string; code: string; station_id: string; station_title: string };
type Delivery = { id: string; material_id: string; material_name: string };
type Tab = "roteiro" | "paciente" | "materiais" | "checklist" | "finalizar";

const TABS: { k: Tab; l: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { k: "roteiro", l: "Roteiro", icon: Theater },
  { k: "paciente", l: "Paciente", icon: UserRound },
  { k: "materiais", l: "Materiais", icon: Inbox },
  { k: "checklist", l: "Checklist", icon: ClipboardCheck },
  { k: "finalizar", l: "Finalizar", icon: Send },
];

function ActorView() {
  const { code } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [station, setStation] = useState<LoadedStation | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState<"em_andamento" | "aprovado" | "reprovado" | "repetir">("em_andamento");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("roteiro");

  useEffect(() => {
    (async () => {
      const { data: r } = await supabase.from("training_rooms")
        .select("id, code, station_id, station_title").eq("code", code).maybeSingle();
      if (!r) return;
      setRoom(r as Room);
      setStation(await loadStation((r as Room).station_id));

      const { data: parts } = await supabase.from("training_room_participants")
        .select("user_id, role").eq("room_id", (r as Room).id);
      const cand = (parts ?? []).find((p: { role: string }) => p.role === "candidato");
      setCandidateId(cand?.user_id ?? null);

      const { data: dels } = await supabase.from("room_material_deliveries")
        .select("id, material_id, material_name").eq("room_id", (r as Room).id);
      setDeliveries((dels ?? []) as Delivery[]);

      if (user) {
        const { data: ev } = await supabase.from("room_evaluations")
          .select("*").eq("room_id", (r as Room).id).eq("evaluator_id", user.id).maybeSingle();
        if (ev) {
          setChecks((ev.checks ?? {}) as Record<string, boolean>);
          setComments((ev.item_comments ?? {}) as Record<string, string>);
          setFeedback(ev.final_feedback ?? "");
          setStatus(ev.status as typeof status);
        }
      }
    })();
  }, [code, user?.id]);

  useEffect(() => {
    if (!room) return;
    const ch = supabase
      .channel(`actor-${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_material_deliveries", filter: `room_id=eq.${room.id}` }, async () => {
        const { data: dels } = await supabase.from("room_material_deliveries")
          .select("id, material_id, material_name").eq("room_id", room.id);
        setDeliveries((dels ?? []) as Delivery[]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [room?.id]);

  const totals = useMemo(() => {
    if (!station) return { total: 0, earned: 0 };
    const total = station.checklist.reduce((s, i) => s + i.points, 0);
    const earned = station.checklist.reduce((s, i) => s + (checks[i.id] ? i.points : 0), 0);
    return { total, earned };
  }, [station, checks]);
  const score = totals.total > 0 ? (totals.earned / totals.total) * 10 : 0;

  async function deliver(materialId: string) {
    if (!room || !user || !station) return;
    const m = station.deliverableMaterials?.find((x) => x.id === materialId);
    if (!m) return;
    const { error } = await supabase.from("room_material_deliveries").insert({
      room_id: room.id,
      material_id: m.id,
      material_name: m.name,
      material_type: m.type,
      material_description: m.description ?? null,
      material_content: m.content,
      delivered_by: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success(`Entregue: ${m.name}`);
  }

  async function save(submit = false) {
    if (!room || !user) return;
    setSaving(true);
    const payload = {
      room_id: room.id,
      evaluator_id: user.id,
      candidate_id: candidateId,
      station_id: room.station_id,
      checks,
      item_comments: comments,
      final_feedback: feedback,
      final_score: Number(score.toFixed(2)),
      status: submit ? status : "em_andamento",
      submitted_at: submit ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from("room_evaluations")
      .upsert(payload, { onConflict: "room_id,evaluator_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(submit ? "Correção enviada" : "Rascunho salvo");
    if (submit) nav({ to: "/app/sala/$code", params: { code } });
  }

  if (!station || !room) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  const delivered = new Set(deliveries.map((d) => d.material_id));
  const materials = station.deliverableMaterials ?? [];
  const p = station.patientProfile;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link to="/app/sala/$code" params={{ code }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar à sala
      </Link>

      <div className="rounded-3xl border border-rose-200/40 bg-gradient-to-br from-rose-50/60 to-amber-50/40 p-6 dark:from-rose-900/10 dark:to-amber-900/10">
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-300/40 bg-rose-100/40 px-3 py-1 text-xs font-medium text-rose-700 dark:text-rose-300">
          <Theater className="h-3.5 w-3.5" /> Roteiro do Ator / Avaliador
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold md:text-3xl">{room.station_title ?? station.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Você conduz o paciente, entrega materiais e pontua o candidato. O candidato não vê esta tela.
        </p>
      </div>

      {/* Mobile tabs */}
      <div className="-mx-1 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 lg:hidden no-scrollbar">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium",
              tab === t.k ? "bg-mint/10 text-foreground" : "text-muted-foreground",
            )}>
            <t.icon className="h-4 w-4" /> {t.l}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* Roteiro */}
          <section className={cn(tab !== "roteiro" && "hidden lg:block")}>
            <div className="rounded-2xl border border-amber-200/60 bg-amber-50/60 p-4 text-sm text-amber-900 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-200">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" /> Regras de interpretação
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                <li>Responda apenas o que for perguntado pelo candidato.</li>
                <li>Não revele espontaneamente informações sensíveis.</li>
                <li>Mantenha o comportamento descrito (ansiedade, dor, calma...).</li>
                <li>Não corrija o candidato durante a estação.</li>
              </ul>
            </div>
            <Section className="mt-4" title="Caso clínico (contexto)">
              <p className="leading-relaxed">{station.clinicalCase}</p>
            </Section>
            <Section title="Roteiro detalhado" highlight>
              <p className="whitespace-pre-wrap leading-relaxed">{station.patientScript}</p>
            </Section>
            {p?.spontaneous && (
              <Section title="O que falar espontaneamente">
                <p className="whitespace-pre-wrap">{p.spontaneous}</p>
              </Section>
            )}
            {p?.onlyIfAsked && (
              <Section title="Revelar APENAS se perguntado">
                <p className="whitespace-pre-wrap">{p.onlyIfAsked}</p>
              </Section>
            )}
            {p?.doNotReveal && (
              <Section title="Nunca revelar">
                <p className="whitespace-pre-wrap text-rose-700 dark:text-rose-400">{p.doNotReveal}</p>
              </Section>
            )}
            {(p?.emotionalTone || p?.actingTips) && (
              <Section title="Tom emocional e atuação">
                {p?.emotionalTone && <p><span className="font-medium">Tom:</span> {p.emotionalTone}</p>}
                {p?.actingTips && <p className="mt-1"><span className="font-medium">Dicas:</span> {p.actingTips}</p>}
              </Section>
            )}
          </section>

          {/* Paciente */}
          <section className={cn(tab !== "paciente" && "hidden lg:block")}>
            <Section title="Dados do paciente fictício">
              {p ? (
                <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  {patientFields(p).map(([label, value]) => value && (
                    <div key={label} className="rounded-lg bg-muted/40 px-3 py-2">
                      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
                      <dd className="mt-0.5 text-sm">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">Perfil do paciente não cadastrado. Use o roteiro detalhado.</p>
              )}
            </Section>
            {p?.vitals && (
              <Section title="Sinais vitais">
                <p>{p.vitals}</p>
              </Section>
            )}
            {p?.previousExams && (
              <Section title="Exames prévios">
                <p className="whitespace-pre-wrap">{p.previousExams}</p>
              </Section>
            )}
          </section>

          {/* Materiais */}
          <section className={cn(tab !== "materiais" && "hidden lg:block")}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Materiais para entregar ao candidato</h2>
              <Badge variant="outline">{deliveries.length}/{materials.length} entregues</Badge>
            </div>
            {materials.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
                Esta estação não possui materiais cadastrados.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {materials.map((m) => {
                  const isDelivered = delivered.has(m.id);
                  return (
                    <div key={m.id} className={cn(
                      "rounded-2xl border p-4 transition-all",
                      isDelivered ? "border-mint/50 bg-mint/5" : "border-border bg-card hover:border-mint/40",
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-semibold">
                            <FileText className="h-4 w-4 text-mint" /> {m.name}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{m.type}</div>
                          {m.description && <div className="mt-2 text-xs text-muted-foreground">{m.description}</div>}
                        </div>
                        {m.autoDeliver && <Badge variant="outline" className="shrink-0 text-[10px]">Auto</Badge>}
                      </div>
                      {m.content && (
                        <div className="mt-3 max-h-32 overflow-auto rounded-lg bg-background/60 p-2 text-xs">{m.content}</div>
                      )}
                      <Button size="sm" variant={isDelivered ? "outline" : "hero"} className="mt-3 w-full"
                        disabled={isDelivered} onClick={() => deliver(m.id)}>
                        {isDelivered ? <><PackageCheck className="mr-1 h-4 w-4" /> Entregue</> : <><Send className="mr-1 h-4 w-4" /> Entregar ao candidato</>}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Checklist */}
          <section className={cn(tab !== "checklist" && "hidden lg:block")}>
            <h2 className="mb-3 font-display text-lg font-bold">Checklist de avaliação</h2>
            <div className="space-y-2">
              {station.checklist.map((it) => (
                <div key={it.id} className={cn("rounded-2xl border p-4", checks[it.id] ? "border-mint/50 bg-mint/5" : "border-border bg-card")}>
                  <div className="flex items-start gap-3">
                    <Checkbox checked={!!checks[it.id]}
                      onCheckedChange={(v) => setChecks((c) => ({ ...c, [it.id]: v === true }))}
                      className="mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm">{it.description}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{it.category}</Badge>
                        <span>{it.points} pts</span>
                        <span className={cn("inline-flex items-center gap-0.5 ml-auto", checks[it.id] ? "text-emerald-600" : "text-muted-foreground")}>
                          {checks[it.id] ? <Check className="h-3 w-3" /> : null}
                          {checks[it.id] ? "Realizou" : "Não realizou"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Textarea value={comments[it.id] ?? ""}
                    onChange={(e) => setComments((c) => ({ ...c, [it.id]: e.target.value }))}
                    placeholder="Comentário para este item (opcional)" rows={2} className="mt-3" />
                </div>
              ))}
            </div>
          </section>

          {/* Finalizar */}
          <section className={cn(tab !== "finalizar" && "hidden lg:block")}>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comentário final ao candidato</div>
              <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={5}
                placeholder="Pontos fortes, pontos a melhorar, recomendação..." className="mt-2" />
              <div className="mt-4 flex flex-wrap gap-2">
                {([
                  { v: "aprovado", l: "Aprovar", icon: CheckCircle2, cls: "border-emerald-300 text-emerald-700" },
                  { v: "reprovado", l: "Reprovar", icon: XCircle, cls: "border-rose-300 text-rose-700" },
                  { v: "repetir", l: "Pedir repetição", icon: RotateCw, cls: "border-amber-300 text-amber-700" },
                ] as const).map((b) => (
                  <Button key={b.v} variant={status === b.v ? "secondary" : "outline"}
                    className={status === b.v ? "" : b.cls} onClick={() => setStatus(b.v)}>
                    <b.icon className="mr-1 h-4 w-4" /> {b.l}
                  </Button>
                ))}
              </div>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => save(false)} disabled={saving} className="flex-1">
                  Salvar rascunho
                </Button>
                <Button variant="hero" onClick={() => save(true)} disabled={saving || status === "em_andamento"} className="flex-1">
                  <Send className="mr-1 h-4 w-4" /> Finalizar avaliação
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar: scoring */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-3xl border bg-gradient-hero p-6 text-white shadow-elegant">
            <div className="text-xs font-medium uppercase tracking-wider text-mint">Pontuação ao vivo</div>
            <div className="mt-2 font-display text-5xl font-bold tabular-nums">{score.toFixed(1)}</div>
            <div className="mt-1 text-sm text-white/70">{totals.earned} / {totals.total} pts</div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-gradient-mint transition-all" style={{ width: `${totals.total ? (totals.earned / totals.total) * 100 : 0}%` }} />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <Stat label="Itens" value={station.checklist.length} />
              <Stat label="Marcados" value={Object.values(checks).filter(Boolean).length} />
              <Stat label="Materiais" value={`${deliveries.length}/${materials.length}`} />
            </div>

            {station.evaluatorNotes && (
              <div className="mt-5 rounded-xl border border-white/15 bg-white/5 p-3 text-xs text-white/80">
                <div className="font-medium text-mint">Observações para a banca</div>
                <div className="mt-1 whitespace-pre-wrap">{station.evaluatorNotes}</div>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-3 text-[11px] text-muted-foreground">
            <Pill className="mr-1 inline h-3 w-3 text-mint" />
            Esta tela é exclusiva do ator/avaliador. O candidato vê apenas a tela dele.
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children, highlight, className }: { title: string; children: React.ReactNode; highlight?: boolean; className?: string }) {
  return (
    <section className={cn("rounded-2xl border p-5", highlight ? "border-mint/40 bg-mint/5" : "border-border bg-card", className)}>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="mt-2 text-sm md:text-base">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-2">
      <div className="text-[10px] uppercase tracking-wider text-white/60">{label}</div>
      <div className="mt-0.5 font-display text-lg font-bold">{value}</div>
    </div>
  );
}

function patientFields(p: NonNullable<LoadedStation["patientProfile"]>): [string, string | undefined][] {
  return [
    ["Nome", p.name],
    ["Idade", p.age],
    ["Sexo", p.sex],
    ["Profissão", p.profession],
    ["Queixa principal", p.chiefComplaint],
    ["História da doença atual", p.hpi],
    ["Antecedentes pessoais", p.personalHistory],
    ["Medicamentos em uso", p.medications],
    ["Alergias", p.allergies],
    ["História familiar", p.familyHistory],
    ["Hábitos de vida", p.habits],
    ["Sinais e sintomas", p.symptoms],
  ];
}
