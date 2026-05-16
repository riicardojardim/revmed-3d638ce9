
// ============================================================
// Live preview — mirrors the actual Avaliado / Ator / Avaliador panels
// ============================================================
type PreviewMode = "candidato" | "ator" | "avaliador";

function StationLivePreview({ station, items }: { station: Station; items: Item[] }) {
  const [mode, setMode] = useState<PreviewMode>("candidato");
  const meta = getSpecialtyMeta(station.specialty);
  const totalPts = items.reduce((s, i) => s + Number(i.points || 0), 0);

  const tabs: { id: PreviewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "candidato", label: "Avaliado (candidato)", icon: User },
    { id: "ator",      label: "Ator / Paciente",      icon: Stethoscope },
    { id: "avaliador", label: "Avaliador (banca)",    icon: ClipboardCheck },
  ];

  const p = station.patient_profile ?? {};
  const hasProfile = Object.values(p).some((v) => typeof v === "string" && v.trim().length > 0);
  const patientFormatted = hasProfile ? formatPatientProfile(p as never) : "";

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="inline-flex rounded-xl border border-border bg-background/40 p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = mode === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                active ? "bg-mint/15 text-mint shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Frame mimicking the real panel layout */}
      <div className="rounded-2xl border border-border bg-background/60 p-4 md:p-6">
        {/* Header bar (same shape used in sala views) */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn("inline-flex h-7 items-center rounded-md px-2 text-xs font-bold", meta.badge)}>
              {meta.code}
            </span>
            <h3 className="truncate font-display text-lg font-bold text-foreground md:text-xl">
              {station.title || "(sem título)"}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-mint/15 px-2.5 py-1 font-medium text-mint">
              {mode === "candidato" ? "Candidato" : mode === "ator" ? "Ator/Paciente" : "Avaliador"}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{station.specialty}</span>
          </div>
        </div>

        {mode === "candidato" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <PRBlock icon={MessageSquare} title="Cenário de atuação">
                <ScriptText text={station.clinical_case || "—"} />
              </PRBlock>

              <PRBlock icon={ListChecks} title="Tarefas da estação">
                <ScriptText text={station.candidate_task || "—"} />
              </PRBlock>

              <PRBlock
                icon={Inbox}
                title="Materiais recebidos"
                right={<Badge variant="outline">0</Badge>}
              >
                <p className="text-sm text-muted-foreground">
                  Os impressos cadastrados serão entregues pelo avaliador durante a estação.
                </p>
                {(station.deliverable_materials ?? []).length > 0 && (
                  <div className="mt-3 space-y-2 opacity-70">
                    {(station.deliverable_materials ?? []).map((m, i) => (
                      <div key={i} className="rounded-lg border border-dashed border-border p-2 text-xs">
                        <span className="font-semibold">{m.name || `Impresso ${i + 1}`}</span>
                        {m.type && <span className="ml-2 text-muted-foreground">· {m.type}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </PRBlock>

              <PRBlock icon={StickyNote} title="Anotações">
                <Textarea rows={3} placeholder="O candidato anota aqui durante a estação…" disabled />
              </PRBlock>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Tempo
                </div>
                <div className="mt-2 font-mono text-3xl font-bold">10:00</div>
                <div className="text-xs text-muted-foreground">Definido pelo ator/banca na sala.</div>
              </div>
            </div>
          </div>
        )}

        {mode === "ator" && (
          <div className="space-y-4">
            <PRBlock icon={User} title="Perfil do paciente / informações para o ator">
              {hasProfile ? (
                <ScriptText text={patientFormatted} />
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum perfil de paciente preenchido.</p>
              )}
            </PRBlock>

            {station.patient_script && (
              <PRBlock icon={MessageSquare} title="Roteiro de atuação (fala do paciente)">
                <ScriptText text={station.patient_script} />
              </PRBlock>
            )}

            <PRBlock icon={MessageSquare} title="Cenário clínico (contexto)">
              <ScriptText text={station.clinical_case || "—"} />
            </PRBlock>

            <PRBlock
              icon={Inbox}
              title="Impressos para entregar"
              right={<Badge variant="outline">{(station.deliverable_materials ?? []).length}</Badge>}
            >
              {(station.deliverable_materials ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum impresso cadastrado.</p>
              ) : (
                <div className="space-y-3">
                  {(station.deliverable_materials ?? []).map((m, i) => (
                    <div key={i} className="rounded-xl border border-mint/30 bg-mint/5 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <FileText className="h-4 w-4 text-mint" /> {m.name || `Impresso ${i + 1}`}
                        {m.type && <Badge variant="outline" className="ml-auto">{m.type}</Badge>}
                      </div>
                      {m.description && (
                        <div className="mt-2 text-xs text-muted-foreground">Gatilho: {m.description}</div>
                      )}
                      {m.content && (
                        <pre className="mt-2 whitespace-pre-wrap rounded bg-background/60 p-2 text-xs">{m.content}</pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </PRBlock>
          </div>
        )}

        {mode === "avaliador" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <PRBlock icon={MessageSquare} title="Caso clínico">
                <ScriptText text={station.clinical_case || "—"} />
              </PRBlock>
              <PRBlock icon={ListChecks} title="Tarefas do candidato">
                <ScriptText text={station.candidate_task || "—"} />
              </PRBlock>
              {(station.expected_conduct || station.common_mistakes || station.evaluator_notes) && (
                <PRBlock icon={BookOpen} title="Notas pedagógicas">
                  {station.expected_conduct && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                      <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                        <Target className="h-3.5 w-3.5" /> Conduta esperada
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-sm">{station.expected_conduct}</div>
                    </div>
                  )}
                  {station.common_mistakes && (
                    <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                      <div className="flex items-center gap-1 text-xs font-semibold text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5" /> Erros comuns
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-sm">{station.common_mistakes}</div>
                    </div>
                  )}
                  {station.evaluator_notes && (
                    <div className="mt-2 rounded-lg border border-border bg-background/40 p-3">
                      <div className="text-xs font-semibold text-muted-foreground">Observações para a banca</div>
                      <div className="mt-1 whitespace-pre-wrap text-sm">{station.evaluator_notes}</div>
                    </div>
                  )}
                </PRBlock>
              )}
            </div>

            <div className="space-y-4">
              <PRBlock
                icon={ClipboardCheck}
                title={`Checklist PEP (${items.length} · ${totalPts.toFixed(2)} pts)`}
              >
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
                ) : (
                  <div className="space-y-3">
                    {items.map((it, idx) => (
                      <div key={it.id} className="rounded-lg border border-border bg-background/40 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-semibold">{idx + 1}. {it.category}</div>
                          <Badge className="bg-mint/15 text-mint hover:bg-mint/15">{Number(it.points).toFixed(2)} pts</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{it.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(it.levels ?? defaultLevels(Number(it.points) || 1)).map((lv, li) => {
                            const tone =
                              /inadequado/i.test(lv.label) && !/parcial/i.test(lv.label)
                                ? "border-rose-500/40 text-rose-400"
                                : /parcial/i.test(lv.label)
                                ? "border-amber-500/40 text-amber-400"
                                : "border-emerald-500/40 text-emerald-400";
                            return (
                              <span key={li} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]", tone)}>
                                {lv.label} · {Number(lv.points).toFixed(2)}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </PRBlock>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
