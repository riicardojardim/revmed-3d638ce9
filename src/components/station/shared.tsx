// Shared station-view helpers (mirror of the ones used in the sala/paciente page).
// Kept here so other pages (e.g. simulado) can use the same look & feel
// without depending on the giant paciente route file.
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { LoadedStation } from "@/lib/stationLoader";

/** Marca-texto persistente: selecionar destaca; clicar/selecionar de novo na mesma área remove. */
export function Highlightable({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ranges, setRanges] = useState<Array<[number, number]>>([]);

  function getOffsetIn(root: HTMLElement, node: Node, offset: number): number {
    let total = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n = walker.nextNode();
    while (n) {
      if (n === node) return total + offset;
      total += (n as Text).length;
      n = walker.nextNode();
    }
    if (node.nodeType !== 3) {
      const w2 = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      total = 0;
      let m = w2.nextNode();
      while (m) {
        const pos = node.compareDocumentPosition(m);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) break;
        total += (m as Text).length;
        m = w2.nextNode();
      }
    }
    return total;
  }

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll(".user-highlight").forEach((el) => {
      const parent = el.parentNode!;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    });
    root.normalize();
    for (const [start, end] of ranges) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const pieces: Array<{ node: Text; s: number; e: number }> = [];
      let pos = 0;
      let n = walker.nextNode() as Text | null;
      while (n) {
        const len = n.length;
        const s = Math.max(start, pos);
        const e = Math.min(end, pos + len);
        if (s < e) pieces.push({ node: n, s: s - pos, e: e - pos });
        pos += len;
        if (pos >= end) break;
        n = walker.nextNode() as Text | null;
      }
      for (let i = pieces.length - 1; i >= 0; i--) {
        const { node, s, e } = pieces[i];
        let target = node;
        if (s > 0) target = target.splitText(s);
        if (e - s < target.length) target.splitText(e - s);
        const span = document.createElement("span");
        span.className = "user-highlight";
        target.parentNode!.insertBefore(span, target);
        span.appendChild(target);
      }
    }
  }, [ranges]);

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const root = ref.current;
    if (!root || !root.contains(range.commonAncestorContainer)) return;
    const a = getOffsetIn(root, range.startContainer, range.startOffset);
    const b = getOffsetIn(root, range.endContainer, range.endOffset);
    const [s, e] = a < b ? [a, b] : [b, a];
    if (s === e) return;
    setRanges((prev) => {
      const overlapping = prev.filter(([x, y]) => !(y <= s || x >= e));
      if (overlapping.length > 0) return prev.filter((r) => !overlapping.includes(r));
      return [...prev, [s, e] as [number, number]];
    });
    sel.removeAllRanges();
  };

  const handleClick = (e: React.MouseEvent) => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    const target = e.target as HTMLElement;
    const hl = target.closest(".user-highlight") as HTMLElement | null;
    const root = ref.current;
    if (!hl || !root || !root.contains(hl)) return;
    const start = getOffsetIn(root, hl.firstChild ?? hl, 0);
    const end = start + (hl.textContent?.length ?? 0);
    setRanges((prev) => prev.filter(([x, y]) => !(x < end && y > start)));
  };

  return (
    <div ref={ref} className="highlightable" onMouseUp={handleMouseUp} onClick={handleClick}>
      {children}
    </div>
  );
}

export function formatPepHeading(index: number, category: string | null | undefined, description: string): string {
  const cleanCategory = (category ?? "").replace(/^\s*\d+\s*[.)\-–—]\s*/, "").trim();
  if (cleanCategory) {
    const needsPunctuation = !/[:.;!?]$/.test(cleanCategory);
    const punctuation = needsPunctuation ? (/\(\d+\)\s*/.test(description) ? ":" : ".") : "";
    return `${index + 1}. ${cleanCategory}${punctuation}`;
  }
  return `${index + 1}. ${(description ?? "").replace(/^\s*\d+\s*[.)\-–—]\s*/, "").trim()}`;
}

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

export function levelTone(pointsOrIndex: number, maxOrTotal: number): { idle: string; active: string } {
  // Color by score magnitude: highest = green, zero/lowest = red, middle = amber.
  // Accepts either (points, maxPoints) or legacy (index, totalLevels) — both work
  // because in legacy calls index 0 had the lowest "rank" and last index the highest.
  const base = "text-muted-foreground hover:text-foreground";
  const ratio = maxOrTotal > 0 ? pointsOrIndex / maxOrTotal : 0;
  if (ratio <= 0) return { idle: base, active: "bg-rose-500/85 text-white shadow-sm ring-1 ring-rose-400/60" };
  if (ratio >= 1) return { idle: base, active: "bg-emerald-500/85 text-white shadow-sm ring-1 ring-emerald-400/60" };
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

export function ScriptText({ text, className, strikeable, prefix, struck, toggle }: { text: unknown; className?: string; strikeable?: boolean; prefix?: string; struck?: Set<string>; toggle?: (id: string) => void }) {
  const safe = typeof text === "string" ? text : text == null ? "" : String(text);

  const Bold = ({ id, children }: { id: string; children: React.ReactNode }) => {
    if (!strikeable || !struck || !toggle) {
      return <strong className="font-semibold text-foreground">{children}</strong>;
    }
    const isStruck = struck.has(id);
    return (
      <strong
        onClick={(e) => { e.stopPropagation(); toggle(id); }}
        className={cn(
          "font-semibold text-foreground cursor-pointer rounded px-0.5 transition-colors select-none",
          isStruck ? "line-through opacity-50 hover:opacity-70" : "hover:bg-amber-500/20"
        )}
      >
        {children}
      </strong>
    );
  };

  // Render inline markdown: **bold** segments become <strong>; surrounding text is kept.
  const renderInline = (s: string, keyPrefix: string): React.ReactNode[] => {
    const out: React.ReactNode[] = [];
    const re = /\*\*([^*]+)\*\*/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) out.push(<span key={`${keyPrefix}-t${i}`}>{s.slice(last, m.index)}</span>);
      out.push(<Bold key={`${keyPrefix}-b${i}`} id={`${prefix ?? "st"}-${keyPrefix}-b${i}`}>{m[1]}</Bold>);
      last = m.index + m[0].length;
      i++;
    }
    if (last < s.length) out.push(<span key={`${keyPrefix}-t${i}`}>{s.slice(last)}</span>);
    return out;
  };
  const renderLine = (ln: string, key: string) => {
    // If the line already contains explicit **bold** markdown, trust it.
    if (ln.includes("**")) return <span>{renderInline(ln, key)}</span>;
    const idx = ln.indexOf(":");
    if (idx < 0) return <span>{ln}</span>;
    const before = ln.slice(0, idx + 1);
    const after = ln.slice(idx + 1);
    const m = before.match(/^(\s*[-•—–]\s*)(.*)$/);
    const marker = m ? m[1] : "";
    const boldText = m ? m[2] : before;
    return (
      <span>
        {marker}
        <Bold id={`${prefix ?? "st"}-${key}-h`}>{boldText}</Bold>
        {after}
      </span>
    );
  };
  const lines = safe.split("\n");
  return (
    <div className={cn("min-w-0 whitespace-pre-wrap break-words leading-relaxed", className)}>
      {lines.map((ln, i) => {
        if (ln.trim() === "") return <div key={i} className="h-4" aria-hidden />;
        return <div key={i}>{renderLine(ln, `l${i}`)}</div>;
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
