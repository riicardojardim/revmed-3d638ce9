import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X, Sparkles } from "lucide-react";
import notif1 from "@/assets/notif-1.jpg";
import notif2 from "@/assets/notif-2.jpg";
import notif3 from "@/assets/notif-3.jpg";
import notif4 from "@/assets/notif-4.jpg";
import notif5 from "@/assets/notif-5.jpg";
import notif6 from "@/assets/notif-6.jpg";
import notif7 from "@/assets/notif-7.jpg";
import notif8 from "@/assets/notif-8.jpg";

export const NOTIFICATION_AVATAR_SOURCES = [
  notif1,
  notif2,
  notif3,
  notif4,
  notif5,
  notif6,
  notif7,
  notif8,
];

type Notif = {
  id: number;
  name: string;
  action: string;
  time: string;
  avatar: string;
};

const POOL: Omit<Notif, "id" | "time">[] = [
  { name: "Dra. Marina S.", action: "garantiu vaga na turma 2026.1", avatar: notif1 },
  { name: "Dr. Rafael M.", action: "começou o plano Plataforma", avatar: notif2 },
  { name: "Dra. Camila R.", action: "fez uma simulação cronometrada", avatar: notif3 },
  { name: "Dr. Henrique T.", action: "garantiu vaga na turma 2026.1", avatar: notif4 },
  { name: "Dra. Letícia P.", action: "completou um checklist INEP", avatar: notif5 },
  { name: "Dr. André V.", action: "agendou conversa com a equipe", avatar: notif6 },
  { name: "Dra. Beatriz F.", action: "começou o plano Plataforma", avatar: notif7 },
  { name: "Dr. Lucas D.", action: "garantiu vaga na turma 2026.1", avatar: notif8 },
  { name: "Dra. Júlia A.", action: "fez uma estação de pediatria", avatar: notif3 },
  { name: "Dr. Eduardo L.", action: "completou 50 flashcards hoje", avatar: notif2 },
];

const TIMES = ["agora há pouco", "há 2 min", "há 5 min", "há 8 min", "há 12 min", "há 18 min"];

export function FakeNotifications() {
  const [current, setCurrent] = useState<Notif | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [avatarsReady, setAvatarsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const warmupAvatars = async () => {
      await Promise.all(
        NOTIFICATION_AVATAR_SOURCES.map(
          (src) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.loading = "eager";
              img.decoding = "sync";
              img.fetchPriority = "high";
              img.src = src;

              const finish = () => resolve();

              if (img.complete) {
                if (typeof img.decode === "function") {
                  img.decode().then(finish).catch(finish);
                } else {
                  finish();
                }
                return;
              }

              img.onload = () => {
                if (typeof img.decode === "function") {
                  img.decode().then(finish).catch(finish);
                } else {
                  finish();
                }
              };

              img.onerror = finish;
            }),
        ),
      );

      if (!cancelled) {
        setAvatarsReady(true);
      }
    };

    warmupAvatars();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (dismissed || !avatarsReady) return;
    let i = 0;
    let timeout: ReturnType<typeof setTimeout>;

    const show = () => {
      const base = POOL[i % POOL.length];
      setCurrent({
        ...base,
        id: Date.now(),
        time: TIMES[Math.floor(Math.random() * TIMES.length)],
      });
      i++;
      // hide after 5s, next after 10s
      timeout = setTimeout(() => {
        setCurrent(null);
        timeout = setTimeout(show, 7000);
      }, 5500);
    };

    // first one after 6s
    timeout = setTimeout(show, 6000);
    return () => clearTimeout(timeout);
  }, [avatarsReady, dismissed]);

  if (dismissed) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 left-4 z-40 md:bottom-6 md:left-6">
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex w-[19rem] items-start gap-3 rounded-2xl border border-border/80 bg-background/95 p-3.5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          >
            <div className="relative h-11 w-11 shrink-0">
              <img
                src={current.avatar}
                alt=""
                loading="eager"
                decoding="sync"
                fetchPriority="high"
                width={44}
                height={44}
                className="h-11 w-11 rounded-full object-cover ring-2 ring-background"
              />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-2 ring-background">
                <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {current.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {current.action}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/80">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-mint" />
                {current.time}
              </p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              aria-label="Fechar notificações"
              className="-mr-1 -mt-1 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function WhatsAppFloat() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.a
          initial={{ opacity: 0, scale: 0.6, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ type: "spring", stiffness: 240, damping: 18 }}
          href="https://wa.me/5521987860985?text=Ol%C3%A1!%20Quero%20saber%20mais%20sobre%20a%20mentoria%20REVMED."
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar no WhatsApp"
          className="group fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_15px_40px_-10px_rgba(37,211,102,0.6)] transition-transform hover:scale-110 md:bottom-6 md:right-6"
        >
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/40" />
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
            <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.555-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.692 5.522l-.999 3.648 3.796-.869zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
          </svg>
        </motion.a>
      )}
    </AnimatePresence>
  );
}

export function UrgencyBanner() {
  const [closed, setClosed] = useState(false);
  if (closed) return null;
  return (
    <div className="relative z-50 bg-gradient-to-r from-primary via-[#e85d1c] to-primary text-primary-foreground pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-3 py-1 pl-[max(env(safe-area-inset-left),0.75rem)] pr-[max(env(safe-area-inset-right),0.75rem)] text-center text-[0.7rem] font-semibold md:gap-3 md:px-8 md:py-2 md:text-sm">
        <Sparkles className="h-3.5 w-3.5 shrink-0 animate-pulse" />
        <span className="truncate whitespace-nowrap">
          <span className="font-bold">Treine agora</span> na{" "}
          <span className="font-bold underline underline-offset-2">plataforma mais completa</span> do Revalida
        </span>
        <button
          onClick={() => setClosed(true)}
          aria-label="Fechar"
          className="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/10 md:h-9 md:w-9"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}