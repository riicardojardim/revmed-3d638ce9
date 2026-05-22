import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

const COOKIE_KEY = "revmed-cookie-consent";
const ONE_YEAR = 60 * 60 * 24 * 365;

function getConsent(): "accepted" | "declined" | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE_KEY}=`));
  if (!match) return null;
  const value = match.split("=")[1];
  return value === "accepted" || value === "declined" ? value : null;
}

function setConsent(value: "accepted" | "declined") {
  document.cookie = `${COOKIE_KEY}=${value}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
}

export function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      if (!getConsent()) setOpen(true);
    }, 800);
    return () => clearTimeout(id);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur md:inset-x-4 md:bottom-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Cookie className="hidden h-6 w-6 shrink-0 text-mint md:block" />
        <p className="flex-1 text-sm leading-relaxed text-foreground/90">
          Usamos cookies essenciais para o funcionamento da plataforma e, com seu consentimento,
          cookies analíticos para melhorar sua experiência. Saiba mais na{" "}
          <Link to="/privacidade" className="font-medium text-mint underline">
            Política de Privacidade
          </Link>
          .
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setConsent("declined");
              setOpen(false);
            }}
          >
            Recusar
          </Button>
          <Button
            variant="hero"
            size="sm"
            onClick={() => {
              setConsent("accepted");
              setOpen(false);
              // Recarrega para injetar pixels imediatamente
              if (typeof window !== "undefined") window.location.reload();
            }}
          >
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  );
}