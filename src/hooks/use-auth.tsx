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
    const keys = Object.keys(localStorage);
    for (const k of keys) {
      if (k.startsWith("sb-") || k.includes("auth-token")) {
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

async function enforcePlanAccess(userId: string) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;

  if (!path.startsWith("/app") || path.startsWith("/app/admin")) return;

  try {
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

  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const cached = typeof window !== "undefined" ? readAuthCache() : null;
  const hasPersisted = hasPersistedSupabaseSession();
  const isLoggedOutUrl = typeof window !== "undefined" && window.location.search.includes("logged_out=true");
  
  const seedUser = cached?.user && hasPersisted && !isLoggedOutUrl
    ? ({ id: cached.user.id, email: cached.user.email ?? undefined } as unknown as User)
    : null;

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(seedUser);
  const [profile, setProfile] = useState<Profile | null>(seedUser ? cached?.profile ?? null : null);
  const [roles, setRoles] = useState<AppRole[]>(seedUser ? cached?.roles ?? [] : []);
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
    // Se detectarmos o parâmetro de logout, forçamos uma limpeza total preventiva
    if (typeof window !== "undefined" && window.location.search.includes("logged_out=true")) {
      const keys = Object.keys(localStorage);
      keys.forEach(k => {
        if (k.startsWith("sb-") || k.includes("auth-token") || k.startsWith("er_")) {
          localStorage.removeItem(k);
        }
      });
      sessionStorage.clear();
      // Limpa a URL
      const url = new URL(window.location.href);
      url.searchParams.delete("logged_out");
      window.history.replaceState({}, document.title, url.toString());
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      if (s?.user) {
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

  useEffect(() => {
    if (!user) return;
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

  const signOut = async () => {
    try {
      // 1. Primeiro limpamos o cache local para que a UI responda imediatamente
      writeAuthCache(null);
      
      if (typeof window !== "undefined") {
        // 2. Limpeza profunda de TODOS os tokens do Supabase e cache da aplicação
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith("sb-") || key.startsWith("er_") || key === AUTH_CACHE_KEY) {
            localStorage.removeItem(key);
          }
        }
        sessionStorage.clear();
      }

      // 3. Invalidamos a sessão globalmente no servidor do Supabase
      await supabase.auth.signOut({ scope: 'global' });
      
      if (typeof window !== "undefined") {
        // 4. Redirecionamento forçado (replace) para limpar o histórico e estado do navegador
        window.location.replace("/login?logged_out=true");
      }
    } catch (error) {
      console.error("Erro crítico no logout:", error);
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace("/");
      }
    }
  };

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
