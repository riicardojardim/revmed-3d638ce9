import { useEffect, useRef, useState } from "react";
import { Download, X, Share, MoreVertical, Plus, Monitor, Smartphone, Tablet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const DISMISS_KEY = "pwa:install-banner-dismissed-v2";
const SNOOZE_DAYS = 3;

type Platform = "ios" | "android" | "desktop";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function PWAInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; id: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < SNOOZE_DAYS * 24 * 60 * 60 * 1000) return;

    setPlatform(detectPlatform());
    setVisible(true);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setVisible(false);
      setOpen(false);
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // ignore drags starting on buttons (let clicks work)
    if ((e.target as HTMLElement).closest("button")) return;
    dragStartRef.current = { x: e.clientX, id: e.pointerId };
    setDragging(true);
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current || dragStartRef.current.id !== e.pointerId) return;
    setDragX(e.clientX - dragStartRef.current.x);
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    dragStartRef.current = null;
    setDragging(false);
    if (Math.abs(dx) > 100) {
      dismiss();
    } else {
      setDragX(0);
    }
  };

  const handleInstallClick = async () => {
    if (deferred) {
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") {
          setVisible(false);
          localStorage.setItem(DISMISS_KEY, String(Date.now()));
        }
        setDeferred(null);
        return;
      } catch {
        // fall through to manual instructions
      }
    }
    setOpen(true);
  };

  if (!visible) return null;

  return (
    <>
      <div
        className="fixed left-1/2 top-3 z-50 w-[min(96vw,720px)] -translate-x-1/2 rounded-full border border-mint/40 bg-background/95 px-3 py-1.5 shadow-elegant backdrop-blur-xl"
        role="dialog"
        aria-label="Instalar aplicativo"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm leading-none">📲</span>
          <p className="flex-1 truncate whitespace-nowrap text-[11px] font-medium text-foreground sm:text-xs">
            Faça o download do nosso aplicativo para uma experiência ainda melhor!
          </p>
          <button
            onClick={handleInstallClick}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-mint px-3 py-1 text-[11px] font-semibold text-background hover:bg-mint/90"
          >
            <Download className="h-3 w-3" />
            Download
          </button>
          <button
            onClick={dismiss}
            className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Instalar o aplicativo</DialogTitle>
            <DialogDescription>
              Tenha acesso rápido, notificações e uma experiência em tela cheia, como um app nativo.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue={platform} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ios" className="gap-1.5">
                <Smartphone className="h-3.5 w-3.5" /> iPhone/iPad
              </TabsTrigger>
              <TabsTrigger value="android" className="gap-1.5">
                <Tablet className="h-3.5 w-3.5" /> Android
              </TabsTrigger>
              <TabsTrigger value="desktop" className="gap-1.5">
                <Monitor className="h-3.5 w-3.5" /> Computador
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ios" className="space-y-3 pt-3 text-sm">
              <p className="text-muted-foreground">No Safari (iOS/iPadOS):</p>
              <ol className="space-y-2 pl-1">
                <Step n={1}>
                  Toque no ícone <Share className="inline h-4 w-4 align-text-bottom text-mint" /> <strong>Compartilhar</strong> na barra inferior do Safari.
                </Step>
                <Step n={2}>
                  Role e toque em <strong>"Adicionar à Tela de Início"</strong> <Plus className="inline h-4 w-4 align-text-bottom text-mint" />.
                </Step>
                <Step n={3}>
                  Confirme em <strong>"Adicionar"</strong>. Pronto — o ícone aparece na sua tela inicial.
                </Step>
              </ol>
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Importante: no iPhone/iPad só funciona pelo <strong>Safari</strong> (não pelo Chrome).
              </p>
            </TabsContent>

            <TabsContent value="android" className="space-y-3 pt-3 text-sm">
              <p className="text-muted-foreground">No Chrome para Android:</p>
              <ol className="space-y-2 pl-1">
                <Step n={1}>
                  Toque no menu <MoreVertical className="inline h-4 w-4 align-text-bottom text-mint" /> <strong>(3 pontinhos)</strong> no canto superior direito.
                </Step>
                <Step n={2}>
                  Escolha <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                </Step>
                <Step n={3}>
                  Confirme em <strong>"Instalar"</strong>. O app aparece na sua gaveta de apps.
                </Step>
              </ol>
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Dica: se aparecer o banner de instalação automático, é só tocar em <strong>Instalar</strong>.
              </p>
            </TabsContent>

            <TabsContent value="desktop" className="space-y-3 pt-3 text-sm">
              <p className="text-muted-foreground">No Chrome, Edge ou Brave (Windows, Mac e Linux):</p>
              <ol className="space-y-2 pl-1">
                <Step n={1}>
                  Procure o ícone <Download className="inline h-4 w-4 align-text-bottom text-mint" /> <strong>de instalação</strong> no canto direito da barra de endereço.
                </Step>
                <Step n={2}>
                  Ou abra o menu <MoreVertical className="inline h-4 w-4 align-text-bottom text-mint" /> e escolha <strong>"Instalar Estação Revalida"</strong>.
                </Step>
                <Step n={3}>
                  Clique em <strong>"Instalar"</strong>. O app abre em uma janela própria, sem abas do navegador.
                </Step>
              </ol>
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                No <strong>Safari (Mac)</strong>: menu <strong>Arquivo → Adicionar ao Dock</strong>.
              </p>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint/15 text-[11px] font-bold text-mint">
        {n}
      </span>
      <span className="flex-1 leading-relaxed">{children}</span>
    </li>
  );
}
