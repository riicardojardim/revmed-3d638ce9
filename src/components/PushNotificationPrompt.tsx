import { useState, useEffect } from "react";
import { Bell, X, Check, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { motion, AnimatePresence } from "framer-motion";

const PROMPT_KEY = "revmed:push-prompt-dismissed";

export function PushNotificationPrompt() {
  const { isSubscribed, permission, subscribe, loading } = usePushNotifications();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Só mostramos se:
    // 1. Não está inscrito
    // 2. A permissão não foi negada anteriormente pelo navegador
    // 3. O usuário não fechou este prompt específico recentemente
    const isDismissed = localStorage.getItem(PROMPT_KEY);
    
    if (!isSubscribed && permission === 'default' && !isDismissed) {
      // Pequeno delay para não aparecer instantaneamente após o login
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSubscribed, permission]);

  const handleDismiss = () => {
    localStorage.setItem(PROMPT_KEY, "true");
    setShowPrompt(false);
  };

  const handleSubscribe = async () => {
    await subscribe();
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-6 left-4 right-4 z-[100] mx-auto max-w-[400px] sm:left-auto sm:right-6"
        >
          <div className="overflow-hidden rounded-2xl border border-mint/30 bg-card p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint/10 text-mint">
                <Bell className="h-5 w-5 animate-bounce" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-display text-sm font-bold text-foreground">
                  Fique por dentro das novidades!
                </h4>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Ative as notificações para receber novos checklists, alertas de editais e lembretes de estudo.
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="mt-5 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={handleDismiss}
              >
                Agora não
              </Button>
              <Button
                variant="hero"
                size="sm"
                className="flex-1 text-xs"
                onClick={handleSubscribe}
                disabled={loading}
              >
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Ativar agora
              </Button>
            </div>
            
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/60">
              <Smartphone className="h-3 w-3" />
              <span>Funciona melhor no app (PWA)</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
