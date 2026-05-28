import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AppRole = "aluno" | "professor" | "admin";

export interface Profile {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  exam_year: string | null;
  avatar_url: string | null;
  title: string | null;
  gender: string | null;
  username: string | null;
  first_name?: string | null;
  last_name?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), ms)),
  ]);
}

const AUTH_CACHE_KEY = "er_auth_cache_v1";

type AuthCache = {
  user: { id: string; email: string | null } | null;
  profile: Profile | null;
  roles: AppRole[];
};

function readAuthCache(): AuthCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthCache;
  } catch {
    return null;
  }
}

function writeAuthCache(cache: AuthCache | null) {
  if (typeof window === "undefined") return;
  try {
    if (!cache || !cache.user) {
      localStorage.removeItem(AUTH_CACHE_KEY);
    } else {
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cache));
    }
  } catch {}
}

function hasPersistedSupabaseSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const v = localStorage.getItem(k);
        if (v && v.length > 10) return true;
      }
    }
  } catch {}
  return false;
}

const DEVICE_KEY = "er_device_id";
function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = (crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

async function claimActiveSession(userId: string) {
  const device_id = getDeviceId();
  try {
    // Admin pode ficar logado em vários lugares — não reivindica a sessão única.
    const { data: rolesRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (rolesRows ?? []).some((r) => r.role === "admin");
    if (isAdmin) return;
    await supabase
      .from("user_active_session")
      .upsert({ user_id: userId, device_id, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  } catch {}
}

const ACCESS_BLOCK_NOTICE_KEY = "er_access_block_notice";

/**
 * Confere se o usuário tem acesso pago (plano não expirado).
 * Admin/Professor passam livre. Sem plano ativo → sign out + redirect /#planos.
 */
async function enforcePlanAccess(userId: string) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;

  // Só aplica a verificação de plano se o usuário estiver tentando acessar a área restrita (/app).
  // Se estiver na landing page ou outras páginas públicas, ele pode estar logado (ex: durante checkout).
  if (!path.startsWith("/app") || path.startsWith("/app/admin")) return;

  try {
    // Privilegiados (admin/professor) sempre têm acesso.

    const { data: rs } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = ((rs ?? []) as { role: AppRole }[]).map((r) => r.role);
    if (roles.includes("admin") || roles.includes("professor")) return;

    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("status, current_period_end, plans:plan_id ( slug )")
      .eq("user_id", userId)
      .maybeSingle();

    const plan = sub?.plans as { slug: string } | null | undefined;
    const expired = sub?.current_period_end
      ? new Date(sub.current_period_end).getTime() < Date.now()
      : false;
    const hasAccess = !!sub && !!plan && plan.slug !== "free" && !expired;

    if (hasAccess) return;

    if (typeof window !== "undefined") {
      window.location.href = "/#planos";
    }

  } catch {
    // Em caso de falha de rede, não derruba a sessão.
  }
}



export function AuthProvider({ children }: { children: ReactNode }) {
  // Seed sincronamente a partir do cache local para evitar o "flicker" de
  // mostrar Login antes do estado autenticado ser carregado.
  const cached = typeof window !== "undefined" ? readAuthCache() : null;
  const hasPersisted = hasPersistedSupabaseSession();
  const seedUser = cached?.user && hasPersisted
    ? ({ id: cached.user.id, email: cached.user.email ?? undefined } as unknown as User)
    : null;

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(seedUser);
  const [profile, setProfile] = useState<Profile | null>(seedUser ? cached?.profile ?? null : null);
  const [roles, setRoles] = useState<AppRole[]>(seedUser ? cached?.roles ?? [] : []);
  // Se há sessão persistida e cache, considera "não loading" para a UI já
  // renderizar o avatar imediatamente.
  const [loading, setLoading] = useState(!seedUser);

  async function loadExtras(uid: string) {
    try {
      const result = await withTimeout(Promise.all([
        supabase.rpc("get_my_profile").maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]), 2000);
      if (!result) return;
      const [{ data: prof }, { data: rs }] = result;
      const nextProfile = (prof as Profile | null) ?? null;
      const nextRoles = ((rs ?? []) as { role: AppRole }[]).map((r) => r.role);
      setProfile(nextProfile);
      setRoles(nextRoles);
      // Atualiza cache para próximo carregamento
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          writeAuthCache({
            user: { id: data.user.id, email: data.user.email ?? null },
            profile: nextProfile,
            roles: nextRoles,
          });
        }
      } catch {}
    } catch {
      setProfile(null);
      setRoles([]);
    }
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      // Libera a UI imediatamente assim que sabemos o estado de auth.
      setLoading(false);
      if (s?.user) {
        // Carrega profile/roles em background — não bloqueia render.
        setTimeout(() => { void loadExtras(s.user.id); }, 0);
        if (event === "SIGNED_IN") {
          setTimeout(() => { void claimActiveSession(s.user.id); }, 0);
          setTimeout(() => { void enforcePlanAccess(s.user.id); }, 0);
        }
      } else {
        setProfile(null);
        setRoles([]);
        writeAuthCache(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      if (s?.user) {
        // Background: não trava o render do app.
        void loadExtras(s.user.id);
        void claimActiveSession(s.user.id);
        void enforcePlanAccess(s.user.id);
      } else {
        writeAuthCache(null);
      }
    }).catch(() => {
      setSession(null);
      setUser(null);
      setProfile(null);
      setRoles([]);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);


  // Single-session enforcement: listen for active-session changes
  useEffect(() => {
    if (!user) return;
    // Admin não é deslogado ao logar em outro dispositivo.
    if (roles.includes("admin")) return;
    const myDevice = getDeviceId();
    const channel = supabase
      .channel(`active-session-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_active_session", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as { device_id?: string } | null;
          if (row?.device_id && row.device_id !== myDevice) {
            try {
              toast.error("Sessão encerrada", {
                description: "Você fez login em outro dispositivo.",
                duration: 6000,
              });
            } catch {}
            // Pequeno delay para o toast aparecer antes do redirect.
            void supabase.auth.signOut().finally(() => {
              window.setTimeout(() => {
                window.location.href = "/login?reason=other-device";
              }, 800);
            });
          }
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, roles]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function refresh() {
    if (user) await loadExtras(user.id);
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, loading, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
