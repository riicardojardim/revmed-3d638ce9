import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadExtras(uid: string) {
    try {
      const result = await withTimeout(Promise.all([
        supabase.from("profiles").select("id, full_name, whatsapp, exam_year, avatar_url, title, gender, username").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]), 2000);
      if (!result) return;
      const [{ data: prof }, { data: rs }] = result;
      setProfile((prof as Profile | null) ?? null);
      setRoles(((rs ?? []) as { role: AppRole }[]).map((r) => r.role));
    } catch {
      setProfile(null);
      setRoles([]);
    }
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => {
          void loadExtras(s.user.id).finally(() => setLoading(false));
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) await loadExtras(s.user.id);
      setLoading(false);
    }).catch(() => {
      setSession(null);
      setUser(null);
      setProfile(null);
      setRoles([]);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

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
