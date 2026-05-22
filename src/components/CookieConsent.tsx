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
    <div className="fixed inset-x-2 bottom-2 z-[60] mx-auto max-w-3xl rounded-xl border border-border bg-card/95 px-3 py-2.5 shadow-2xl backdrop-blur sm:inset-x-4 sm:bottom-4 sm:px-4 sm:py-3">
      <div className="flex flex-row items-center gap-3">
        <Cookie className="hidden h-4 w-4 shrink-0 text-mint sm:block" />
        <p className="flex-1 text-[11px] leading-snug text-foreground/85 sm:text-xs">
          Usamos cookies essenciais e, com seu consentimento, cookies analíticos para melhorar sua
          experiência. Saiba mais na{" "}
          <Link to="/privacidade" className="font-medium text-mint underline">
            Política de Privacidade
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-[11px] sm:h-8 sm:px-3 sm:text-xs"
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
            className="h-7 px-2.5 text-[11px] sm:h-8 sm:px-3 sm:text-xs"
            onClick={() => {
              setConsent("accepted");
              setOpen(false);
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