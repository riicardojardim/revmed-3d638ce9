import { motion } from "framer-motion";
import { Quote, Instagram } from "lucide-react";
import depoAlexandre from "@/assets/depoimento-alexandre.webp";
import depoRenaldo from "@/assets/depoimento-renaldo.webp";
import depoMarilice from "@/assets/depoimento-marilice.webp";
import depoMaressa from "@/assets/depoimento-maressa.webp";
import depoAndressa from "@/assets/depoimento-andressa.webp";
import depoCristhian from "@/assets/depoimento-cristhian.webp";
import depoAndre from "@/assets/depoimento-andre.webp";
import depoNicolas from "@/assets/depoimento-nicolas.webp";

const ITEMS = [
  { src: depoAlexandre, name: "Dr. Alexandre Severino Siqueira" },
  { src: depoRenaldo, name: "Dr. Renaldo Caron" },
  { src: depoMarilice, name: "Dra. Marilice Winckler" },
  { src: depoMaressa, name: "Dra. Maressa" },
  { src: depoAndressa, name: "Dra. Andressa Letielly" },
  { src: depoCristhian, name: "Dr. Cristhian Herran Giacomozzi" },
  { src: depoAndre, name: "Dr. André Teixeira Siqueira" },
  { src: depoNicolas, name: "Dr. Nicolas Henrique" },
];

const ROW_A = ITEMS.filter((_, i) => i % 2 === 0);
const ROW_B = ITEMS.filter((_, i) => i % 2 === 1);

function MarqueeRow({
  items,
  reverse = false,
  duration = 40,
}: {
  items: typeof ITEMS;
  reverse?: boolean;
  duration?: number;
}) {
  const loop = [...items, ...items];
  return (
    <div
      className="group/marquee relative overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
      }}
    >
      <div
        className="flex w-max gap-3 sm:gap-6"
        style={{
          animation: `marquee-x ${duration}s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {loop.map((d, i) => (
          <figure
            key={`${d.name}-${i}`}
            className="group relative shrink-0 w-[68vw] sm:w-[340px] lg:w-[380px]"
          >
            <div className="relative overflow-hidden rounded-xl border border-border/70 bg-card/40 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.03] transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_30px_80px_-20px_color-mix(in_oklab,var(--primary)_30%,transparent)] sm:rounded-2xl">
              <img
                src={d.src}
                alt={`Depoimento de ${d.name} — aprovado no Revalida INEP 25.1`}
                loading={i < 4 ? "eager" : "lazy"}
                decoding="async"
                width={720}
                height={900}
                className="block w-full transition-transform duration-700 group-hover:scale-[1.02]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 60%, color-mix(in oklab, var(--primary) 18%, transparent) 100%)",
                }}
              />
            </div>
          </figure>
        ))}
      </div>
    </div>
  );
}

export function Depoimentos() {
  return (
    <section id="depoimentos" className="relative py-16 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px]"
        style={{
          background:
            "radial-gradient(60% 80% at 50% 0%, color-mix(in oklab, var(--primary) 18%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            <Quote className="h-3.5 w-3.5" /> Revalida INEP 25.1
          </p>
          <h2 className="mt-3 font-display text-[1.85rem] font-black leading-[1.05] tracking-[-0.03em] md:mt-4 md:text-6xl">
            Quem passou pela
            <br className="hidden md:block" /> <span className="text-primary">REVMED, conta como foi</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground md:mt-5 md:text-lg">
            Depoimentos reais de médicos aprovados na última edição do Revalida.
            Sem atores. Sem roteiro.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 space-y-3 sm:space-y-6 md:mt-14"
        >
          <MarqueeRow items={ROW_A} duration={45} />
          <MarqueeRow items={ROW_B} duration={55} reverse />
        </motion.div>

        <div className="mt-8 flex flex-col items-center gap-4 md:mt-12">
          <a
            href="https://instagram.com/revmedmentoria"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/60 hover:text-primary sm:px-5 sm:py-2.5 sm:text-sm"
          >
            <Instagram className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Ver mais aprovações em @revmedmentoria
          </a>
        </div>
      </div>
    </section>
  );
}