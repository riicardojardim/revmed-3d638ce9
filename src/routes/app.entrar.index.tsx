import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DoorOpen, Search, KeyRound, Sparkles, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Reveal } from "@/components/ui/reveal";

export const Route = createFileRoute("/app/entrar/")({
  component: EntrarCodigo,
  head: () => ({ meta: [{ title: "Entrar em uma estação — REVMED" }] }),
});

function EntrarCodigo() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const ready = code.trim().length >= 4;

  function submit() {
    const c = code.trim();
    if (!c) return toast.error("Digite um código.");
    nav({ to: "/app/entrar/$code", params: { code: c } });
  }

  return (
    <div className="relative mx-auto max-w-2xl space-y-8 py-4">
      {/* Hero */}
      <Reveal>
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center"
          >
            {/* halo pulsante */}
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full bg-mint/25 blur-2xl"
              animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-mint/40"
              animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
            />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-mint/40 bg-gradient-to-br from-mint/30 to-medical/20 shadow-elegant backdrop-blur-sm">
              <DoorOpen className="h-7 w-7 text-mint" />
            </div>
          </motion.div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-mint">
            <Sparkles className="h-3 w-3" /> Acesso rápido
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight md:text-4xl">
            Entrar em uma <span className="bg-gradient-to-r from-emerald-700 to-teal-700 dark:from-mint dark:to-medical bg-clip-text text-transparent">estação</span>
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground md:text-base">
            Digite ou cole o código compartilhado pelo seu mentor ou colega de treino.
          </p>
        </div>
      </Reveal>

      {/* Card de código */}
      <Reveal delay={0.12} y={24}>
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-6 shadow-elegant backdrop-blur-xl md:p-8">
          {/* glow gradient borda */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(600px circle at 0% 0%, color-mix(in oklab, var(--mint) 18%, transparent), transparent 40%), radial-gradient(500px circle at 100% 100%, color-mix(in oklab, var(--medical) 14%, transparent), transparent 45%)",
            }}
          />
          {/* scan line animado */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-mint to-transparent"
            animate={{ y: [0, 300, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative">
            <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <KeyRound className="h-3.5 w-3.5 text-mint" />
              Código da estação
            </label>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <ScanLine className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="EX: A1B2C3"
                  maxLength={12}
                  autoFocus
                  className="w-full rounded-2xl border border-border/80 bg-background/60 py-4 pl-11 pr-4 text-center font-mono text-lg font-bold uppercase tracking-[0.4em] outline-none ring-mint/30 transition-all placeholder:tracking-[0.4em] placeholder:text-muted-foreground/40 focus:border-mint focus:bg-background focus:ring-4 sm:text-xl"
                />
                {ready && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    <span className="flex h-2.5 w-2.5 rounded-full bg-mint shadow-[0_0_12px_var(--mint)]" />
                  </motion.div>
                )}
              </div>

              <Button
                variant="hero"
                onClick={submit}
                className="group relative h-[60px] overflow-hidden px-6 sm:w-auto"
              >
                <Search className="h-4 w-4 transition-transform group-hover:scale-110" />
                Entrar
              </Button>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Dica: o código tem entre 4 e 8 caracteres, somente letras e números.
            </p>
          </div>
        </div>
      </Reveal>

      {/* Dicas */}
      <Reveal delay={0.24}>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: KeyRound, title: "Código único", desc: "Cada estação tem um código gerado pelo mentor." },
            { icon: DoorOpen, title: "Acesso direto", desc: "Sem cadastro extra — entre e treine na hora." },
            { icon: Sparkles, title: "Resultado salvo", desc: "Seu desempenho fica registrado no histórico." },
          ].map((tip, i) => (
            <motion.div
              key={tip.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm transition-colors hover:border-mint/40"
            >
              <tip.icon className="h-4 w-4 text-mint" />
              <div className="mt-2 text-sm font-semibold">{tip.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{tip.desc}</div>
            </motion.div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
