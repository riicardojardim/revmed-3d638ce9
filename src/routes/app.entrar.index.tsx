import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Activity, ScanLine, Radio, Stethoscope, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/entrar/")({
  component: EntrarCodigo,
  head: () => ({ meta: [{ title: "Bipar estação — REVMED" }] }),
});

function EntrarCodigo() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const ready = code.trim().length >= 4;

  function submit() {
    const c = code.trim();
    if (!c) return toast.error("Bipe um código para abrir a sala.");
    nav({ to: "/app/entrar/$code", params: { code: c } });
  }

  return (
    <div className="relative mx-auto max-w-3xl py-2">
      {/* MONITOR DE UTI */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[28px] border border-mint/30 bg-[#070d0c] p-1 shadow-[0_30px_120px_-20px_rgba(16,185,129,0.35)]"
      >
        {/* moldura interna */}
        <div className="relative rounded-[22px] border border-mint/15 bg-gradient-to-b from-[#0a1614] to-[#050908] p-6 md:p-10">
          {/* grid bg */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(var(--mint) 1px, transparent 1px), linear-gradient(90deg, var(--mint) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          {/* scan */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-mint/10 to-transparent"
            animate={{ y: ["-10%", "110%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          />

          {/* topo: status bar */}
          <div className="relative flex items-center justify-between border-b border-mint/15 pb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-mint/80">
            <div className="flex items-center gap-2">
              <motion.span
                className="h-2 w-2 rounded-full bg-mint shadow-[0_0_10px_var(--mint)]"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <span>SALA · ONLINE</span>
            </div>
            <div className="hidden items-center gap-4 sm:flex">
              <span className="flex items-center gap-1.5"><Radio className="h-3 w-3" /> CH-06</span>
              <span className="flex items-center gap-1.5"><Stethoscope className="h-3 w-3" /> REVMED</span>
            </div>
          </div>

          {/* título */}
          <div className="relative mt-6 text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-mint/70">
              // protocolo de acesso
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold leading-[1.05] text-white md:text-5xl">
              Bipar <span className="bg-gradient-to-r from-mint to-medical bg-clip-text text-transparent">estação</span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-mint/60">
              Insira o código do mentor para abrir a sala e iniciar o atendimento.
            </p>
          </div>

          {/* ECG */}
          <div className="relative mt-6 h-14 overflow-hidden rounded-xl border border-mint/15 bg-black/40">
            <svg viewBox="0 0 600 60" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
              <motion.path
                d="M0,30 L80,30 L95,30 L105,10 L115,50 L125,20 L135,30 L220,30 L235,30 L245,5 L255,55 L265,30 L360,30 L375,30 L385,12 L395,48 L405,30 L500,30 L515,30 L525,8 L535,52 L545,30 L600,30"
                fill="none"
                stroke="var(--mint)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
              />
            </svg>
            <div className="absolute right-3 top-2 font-mono text-[10px] text-mint/70">
              ECG · 72 BPM
            </div>
          </div>

          {/* DISPLAY DO CÓDIGO */}
          <div className="relative mt-6">
            <label className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-mint/70">
              <span className="flex items-center gap-2"><ScanLine className="h-3 w-3" /> código da sala</span>
              <span>{code.length}/12</span>
            </label>

            <div className="relative mt-3 rounded-2xl border border-mint/30 bg-black/60 p-1">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="— — — — — —"
                maxLength={12}
                autoFocus
                className="w-full rounded-xl bg-transparent py-6 text-center font-mono text-3xl font-bold uppercase tracking-[0.5em] text-mint caret-mint outline-none placeholder:text-mint/20 sm:text-4xl"
                style={{ textShadow: "0 0 24px color-mix(in oklab, var(--mint) 60%, transparent)" }}
              />
              {ready && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-mint"
                >
                  <Activity className="h-3 w-3" /> ok
                </motion.div>
              )}
            </div>

            <Button
              variant="hero"
              onClick={submit}
              disabled={!ready}
              className="group mt-4 h-14 w-full overflow-hidden text-base font-bold uppercase tracking-[0.2em] disabled:opacity-40"
            >
              <ScanLine className="h-5 w-5 transition-transform group-hover:scale-110" />
              Bipar e abrir sala
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>

            <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-mint/50">
              4 a 8 caracteres · letras + números · gerado pelo mentor
            </p>
          </div>
        </div>
      </motion.div>

      {/* rodapé telemetria */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-4 grid grid-cols-3 gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
      >
        {[
          { k: "código", v: "criptografado" },
          { k: "latência", v: "< 80 ms" },
          { k: "registro", v: "histórico auto" },
        ].map((t) => (
          <div key={t.k} className="rounded-lg border border-border/50 bg-card/40 px-3 py-2 text-center backdrop-blur-sm">
            <div className="text-mint/70">{t.k}</div>
            <div className="mt-0.5 text-foreground/70 normal-case tracking-normal">{t.v}</div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
