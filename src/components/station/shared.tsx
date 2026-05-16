// Shared station-view helpers (mirror of the ones used in the sala/paciente page).
// Kept here so other pages (e.g. simulado) can use the same look & feel
// without depending on the giant paciente route file.
import React from "react";
import { cn } from "@/lib/utils";
import type { LoadedStation } from "@/lib/stationLoader";

export function parseSubItems(description: string): { lead: string; subs: string[] } {
  const numbered = description.match(/\(\d+\)\s*[^()]+/g);
  if (numbered && numbered.length >= 2) {
    const firstIdx = description.indexOf(numbered[0]);
    const lead = description.slice(0, firstIdx).trim().replace(/[:;]\s*$/, "") || description.split(/[(:]/)[0].trim();
    return { lead, subs: numbered.map((s) => s.trim().replace(/[;.]$/, "")) };
  }
  const paren = description.match(/^(.*?)\(([^()]+,[^()]+)\)\s*$/);
  if (paren) {
    const subs = paren[2].split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    if (subs.length >= 2) return { lead: paren[1].trim(), subs };
  }
  const parts = description.split(";").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return { lead: parts[0], subs: parts.slice(1) };
  return { lead: description, subs: [] };
}

export function levelTone(index: number, total: number): { idle: string; active: string } {
  const base = "text-muted-foreground hover:text-foreground";
  if (index === 0) return { idle: base, active: "bg-rose-500/85 text-white shadow-sm ring-1 ring-rose-400/60" };
  if (index === total - 1) return { idle: base, active: "bg-emerald-500/85 text-white shadow-sm ring-1 ring-emerald-400/60" };
  return { idle: base, active: "bg-amber-500/85 text-white shadow-sm ring-1 ring-amber-400/60" };
}

export function PRBlock({
  icon: Icon, title, right, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <header className="flex items-center justify-between gap-3 bg-gradient-hero px-4 py-3 text-sm font-medium text-white shadow-elegant">
        <span className="inline-flex items-center gap-2">
          <Icon className="h-4 w-4 text-mint" /> {title}
        </span>
        {right}
      </header>
      <div className="p-5 text-sm">{children}</div>
    </section>
  );
}

export function SubBlock({ label, children }: { label: string; tone?: "rose"; children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg border border-border bg-background/40 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm">{children}</div>
    </div>
  );
}

export function ScriptText({ text, className }: { text: unknown; className?: string }) {
  const safe = typeof text === "string" ? text : text == null ? "" : String(text);
  const isAllCapsCue = (line: string) => {
    const t = line.trim().replace(/[:：]+$/, "");
    if (t.length < 3) return false;
    const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, "");
    if (letters.length < 3) return false;
    return letters === letters.toUpperCase();
  };
  const KEYWORD_RE = /(\*\*[^*]+\*\*|manejo da emergência[^.;\n]*|protocolo[^.;\n]*|questionamentos|seguindo protocolo[^.;\n]*|Nível de atenção:|Tipo de atendimento:|DESCRIÇÃO DO CASO:)/gi;
  const Bold = ({ children }: { children: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  );
  const renderInline = (line: string) => {
    const parts = line.split(KEYWORD_RE).filter((p) => p !== undefined);
    return (
      <span>
        {parts.map((p, i) => {
          if (!p) return null;
          if (p.startsWith("**") && p.endsWith("**")) return <Bold key={i}>{p.slice(2, -2)}</Bold>;
          if (KEYWORD_RE.test(p)) { KEYWORD_RE.lastIndex = 0; return <Bold key={i}>{p}</Bold>; }
          return <span key={i}>{p}</span>;
        })}
      </span>
    );
  };
  const lines = safe.split("\n");
  const firstNonEmptyIdx = lines.findIndex((l) => l.trim().length > 0);
  return (
    <div className={cn("whitespace-pre-wrap leading-relaxed", className)}>
      {lines.map((ln, i) => {
        if (ln.trim() === "") return <div key={i} className="h-4" aria-hidden />;
        const isIntro = i === firstNonEmptyIdx && !ln.trim().startsWith("-") && !isAllCapsCue(ln);
        if (isAllCapsCue(ln) || isIntro) {
          const prevBlank = i > 0 && lines[i - 1].trim() === "";
          return <div key={i} className={cn(prevBlank && "mt-2")}><Bold>{ln}</Bold></div>;
        }
        return <div key={i}>{renderInline(ln)}</div>;
      })}
    </div>
  );
}

export function formatPatientProfile(p: NonNullable<LoadedStation["patientProfile"]>): string {
  const out: string[] = [];
  const boldLabelLines = (raw?: string): string[] => {
    if (!raw) return [];
    return raw.split("\n").map((ln) => {
      const t = ln.trim();
      if (!t) return "";
      const m = t.match(/^([^:]{1,60}):\s*(.*)$/);
      if (m) return `- **${m[1].trim()}:** ${m[2].trim()}`;
      return `- ${t}`;
    }).filter(Boolean);
  };
  const dadosParts: string[] = [];
  if (p.name) dadosParts.push(p.name);
  if (p.age) dadosParts.push(`${p.age} de idade`);
  if (p.profession) dadosParts.push(String(p.profession).toLowerCase());
  if (dadosParts.length) { out.push("DADOS PESSOAIS:"); out.push(`- ${dadosParts.join(", ")}.`); out.push(""); }
  if (p.chiefComplaint) { out.push("MOTIVO DE CONSULTA:"); out.push(`- ${p.chiefComplaint}`); out.push(""); }
  if (p.hpi) { out.push("CARACTERÍSTICAS DO ACIDENTE:"); out.push(...boldLabelLines(p.hpi)); out.push(""); }
  if (p.symptoms) { out.push("SINTOMAS ASSOCIADOS:"); out.push(...boldLabelLines(p.symptoms)); out.push(""); }
  if (p.onlyIfAsked) {
    out.push("SE PERGUNTADO POR LIMPEZA OU ANTISSEPSIA DO LOCAL:");
    out.push(`- ${p.onlyIfAsked.replace(/^Se perguntado[^:]*:\s*/i, "")}`); out.push("");
  }
  const antecedentes: string[] = [];
  if (p.personalHistory) antecedentes.push(...boldLabelLines(p.personalHistory));
  if (p.medications) antecedentes.push(`- **Medicamentos:** ${p.medications}`);
  if (p.allergies) antecedentes.push(`- **Alergias:** ${p.allergies}`);
  if (p.familyHistory) antecedentes.push(`- **História familiar:** ${p.familyHistory}`);
  if (antecedentes.length) { out.push("ANTECEDENTES PESSOAIS:"); out.push(...antecedentes); out.push(""); }
  if (p.habits) { out.push("HÁBITOS:"); out.push(...boldLabelLines(p.habits)); out.push(""); }
  return out.join("\n").trimEnd();
}
