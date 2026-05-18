import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type PlanSlug = "free" | "completo" | "completo_mensal" | "ator";

export interface ActivePlan {
  slug: PlanSlug;
  name: string;
  status: string;
  current_period_end: string | null;
  allows_candidato: boolean;
  allows_ator: boolean;
  expired: boolean;
}

export function useSubscription() {
  const { user, roles } = useAuth();
  const [plan, setPlan] = useState<ActivePlan | null>(null);
  const [loading, setLoading] = useState(true);

  const isPrivileged = roles.includes("admin") || roles.includes("professor");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user || isPrivileged) {
        if (!cancelled) {
          setPlan(null);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("user_subscriptions")
        .select("status, current_period_end, plans:plan_id ( slug, name, allows_candidato, allows_ator )")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!data || !data.plans) {
        setPlan(null);
      } else {
        const p = data.plans as { slug: string; name: string; allows_candidato: boolean; allows_ator: boolean };
        const expired = data.current_period_end
          ? new Date(data.current_period_end).getTime() < Date.now()
          : false;
        setPlan({
          slug: p.slug as PlanSlug,
          name: p.name,
          status: data.status,
          current_period_end: data.current_period_end,
          allows_candidato: p.allows_candidato,
          allows_ator: p.allows_ator,
          expired,
        });
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id, isPrivileged]);

  const canBeCandidato = isPrivileged || (!!plan && !plan.expired && plan.allows_candidato);
  const canBeAtor = isPrivileged || (!!plan && !plan.expired && plan.allows_ator);
  const hasAccess = isPrivileged || (!!plan && !plan.expired);
  // "Completo-like": full-access plans (one-off or monthly). Used by gates and UI.
  const isCompletoLike =
    isPrivileged ||
    (!!plan && !plan.expired && (plan.slug === "completo" || plan.slug === "completo_mensal"));
  const isAtorOnly = !!plan && !plan.expired && plan.slug === "ator";

  let daysLeft: number | null = null;
  if (plan?.current_period_end) {
    const ms = new Date(plan.current_period_end).getTime() - Date.now();
    daysLeft = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  return { plan, loading, canBeCandidato, canBeAtor, hasAccess, isPrivileged, isCompletoLike, isAtorOnly, daysLeft };
}
