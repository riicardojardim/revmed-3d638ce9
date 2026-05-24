import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado: apenas administradores.");
}

// Roles que NÃO devem ser contabilizadas como "pagantes" nas métricas
// (são contas internas: admin, professor, mentor). Apenas alunos com plano
// pago de fato contam para MRR / receita / total de pagantes.
const INTERNAL_ROLES = ["admin", "professor", "mentor"] as const;

async function getInternalUserIds(): Promise<Set<string>> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role")
    .in("role", [...INTERNAL_ROLES]);
  return new Set((data ?? []).map((r) => r.user_id));
}

const USERNAME_RE = /^[a-z0-9._]{3,20}$/;
const CPF_RE = /^\d{11}$/;
const WHATSAPP_RE = /^\d{11}$/;

// ───────────── Listagem completa de usuários (junta auth.users + profiles + roles + assinatura) ─────────────
export const listUsersAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string; limit?: number; page?: number }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const limit = Math.min(data.limit ?? 100, 500);
    const page = Math.max(data.page ?? 1, 1);

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: limit,
    });
    if (authErr) throw new Error(authErr.message);

    const ids = authData.users.map((u) => u.id);
    if (ids.length === 0) return { users: [], total: ("total" in authData ? (authData.total ?? 0) : 0) };

    const [{ data: profiles }, { data: roles }, { data: subs }, { data: plans }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, avatar_url, whatsapp, exam_year").in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin.from("user_subscriptions").select("user_id, plan_id, status, current_period_end").in("user_id", ids),
      supabaseAdmin.from("plans").select("id, name, slug, price_cents"),
    ]);

    const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const rmap = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const arr = rmap.get(r.user_id) ?? [];
      arr.push(r.role);
      rmap.set(r.user_id, arr);
    });
    const planMap = new Map((plans ?? []).map((p) => [p.id, p]));
    const smap = new Map((subs ?? []).map((s) => [s.user_id, s]));

    const q = (data.search ?? "").trim().toLowerCase();
    const users = authData.users
      .map((u) => {
        const profile = pmap.get(u.id);
        const sub = smap.get(u.id);
        const plan = sub ? planMap.get(sub.plan_id) : null;
        return {
          id: u.id,
          email: u.email ?? "",
          full_name: profile?.full_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          whatsapp: profile?.whatsapp ?? null,
          exam_year: profile?.exam_year ?? null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          email_confirmed_at: u.email_confirmed_at,
          roles: rmap.get(u.id) ?? [],
          subscription: sub
            ? {
                plan_id: sub.plan_id,
                plan_name: plan?.name ?? "—",
                plan_slug: plan?.slug ?? "",
                plan_price_cents: plan?.price_cents ?? 0,
                status: sub.status,
                current_period_end: sub.current_period_end,
              }
            : null,
        };
      })
      .filter((u) => {
        if (!q) return true;
        return (
          u.email.toLowerCase().includes(q) ||
          (u.full_name ?? "").toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q)
        );
      });

    return { users, total: ("total" in authData ? (authData.total ?? users.length) : users.length) };
  });

// ───────────── Criar usuário manualmente ─────────────
export const createUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
      first_name: z.string().trim().min(1).max(60),
      last_name: z.string().trim().min(1).max(60),
      username: z.string().trim().toLowerCase().regex(USERNAME_RE, "Nome de usuário deve ter 3–20 caracteres (letras minúsculas, números, ponto ou underline)."),
      title: z.enum(["Dr.", "Dra."]),
      whatsapp: z.string().regex(WHATSAPP_RE, "WhatsApp deve ter 11 dígitos."),
      cpf: z.string().regex(CPF_RE, "CPF deve ter 11 dígitos."),
      birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento inválida."),
      role: z.enum(["aluno", "professor", "admin", "mentor"]).default("aluno"),
      plan_id: z.string().uuid().optional(),
      plan_days: z.number().int().min(0).max(3650).default(30),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const full_name = `${data.first_name} ${data.last_name}`.trim();

    // Checa unicidade do username e CPF ANTES de criar o usuário
    const { data: existsUser } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", data.username)
      .maybeSingle();
    if (existsUser) throw new Error(`Já existe um usuário com o nome "${data.username}". Escolha outro.`);

    const { data: existsCpf } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("cpf", data.cpf)
      .maybeSingle();
    if (existsCpf) throw new Error("Já existe um usuário com esse CPF.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (error) throw new Error(error.message);

    // Garante profile com todos os campos preenchidos (upsert — pode ainda
    // não existir caso não haja trigger handle_new_user)
    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: created.user.id,
          username: data.username,
          full_name,
          first_name: data.first_name,
          last_name: data.last_name,
          title: data.title,
          whatsapp: data.whatsapp,
          cpf: data.cpf,
          birth_date: data.birth_date,
        },
        { onConflict: "id" },
      );
    if (upErr) {
      if (upErr.code === "23505") {
        throw new Error(`Conflito de cadastro (username ou CPF já em uso).`);
      }
      throw new Error(upErr.message);
    }

    if (data.role !== "aluno") {
      await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });
    }

    // Plano escolhido manualmente pelo admin (opcional)
    if (data.plan_id) {
      const period_end =
        data.plan_days > 0
          ? new Date(Date.now() + data.plan_days * 86400_000).toISOString()
          : null;
      await supabaseAdmin.from("user_subscriptions").upsert(
        {
          user_id: created.user.id,
          plan_id: data.plan_id,
          status: "active",
          current_period_end: period_end,
        },
        { onConflict: "user_id" },
      );
    }

    // Mentor: libera acesso completo sem cobrar — atribui plano pago mais caro
    // sem data de expiração. Mesmo assim, métricas o ignoram (INTERNAL_ROLES).
    if (data.role === "mentor" && !data.plan_id) {
      const { data: topPlan } = await supabaseAdmin
        .from("plans")
        .select("id")
        .eq("active", true)
        .gt("price_cents", 0)
        .order("price_cents", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (topPlan) {
        await supabaseAdmin
          .from("user_subscriptions")
          .upsert(
            {
              user_id: created.user.id,
              plan_id: topPlan.id,
              status: "active",
              current_period_end: null,
            },
            { onConflict: "user_id" },
          );
      }
    }
    return { id: created.user.id };
  });

// ───────────── Mudar e-mail ─────────────
export const updateUserEmailAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ user_id: z.string().uuid(), email: z.string().email() }).parse)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { email: data.email });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ───────────── Resetar senha ─────────────
export const resetPasswordAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ user_id: z.string().uuid(), password: z.string().min(8) }).parse)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ───────────── Enviar link de recuperação ─────────────
export const sendPasswordResetLinkAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ email: z.string().email() }).parse)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ───────────── Mudar role (substitui todas) ─────────────
export const setUserRoleAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ user_id: z.string().uuid(), role: z.enum(["aluno", "professor", "admin", "mentor"]) }).parse)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    if (data.role !== "aluno") {
      await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    }
    return { ok: true };
  });

// ───────────── Atribuir plano (com duração em dias) ─────────────
export const assignPlanAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      user_id: z.string().uuid(),
      plan_id: z.string().uuid(),
      days: z.number().int().min(0).max(3650),
      status: z.enum(["active", "trialing", "canceled"]).default("active"),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const period_end = data.days > 0 ? new Date(Date.now() + data.days * 86400_000).toISOString() : null;
    const { error } = await supabaseAdmin
      .from("user_subscriptions")
      .upsert(
        {
          user_id: data.user_id,
          plan_id: data.plan_id,
          status: data.status,
          current_period_end: period_end,
        },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ───────────── Adicionar ou remover dias do plano atual ─────────────
export const adjustSubscriptionDaysAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ user_id: z.string().uuid(), days: z.number().int() }).parse)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: sub, error: e1 } = await supabaseAdmin
      .from("user_subscriptions")
      .select("current_period_end")
      .eq("user_id", data.user_id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!sub) throw new Error("Usuário não possui assinatura.");
    const base = sub.current_period_end ? new Date(sub.current_period_end) : new Date();
    const next = new Date(base.getTime() + data.days * 86400_000);
    const { error } = await supabaseAdmin
      .from("user_subscriptions")
      .update({ current_period_end: next.toISOString() })
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { current_period_end: next.toISOString() };
  });

// ───────────── Cancelar assinatura ─────────────
export const cancelSubscriptionAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ user_id: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("user_subscriptions")
      .update({ status: "canceled" })
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ───────────── Deletar usuário ─────────────
export const deleteUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ user_id: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ───────────── Estatísticas para o dashboard admin ─────────────

// Retorna os user_ids de contas internas (admin / professor / mentor),
// que devem ser excluídos de qualquer métrica financeira/usuários do dashboard.
export const listInternalUserIdsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const ids = await getInternalUserIds();
    return { ids: Array.from(ids) };
  });

export const getAdminDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const now = Date.now();
    const d7 = new Date(now - 7 * 86400_000).toISOString();
    const d30 = new Date(now - 30 * 86400_000).toISOString();

    const [users, subs, plans, internalIds] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 }),
      supabaseAdmin.from("user_subscriptions").select("plan_id, status, current_period_end, created_at, user_id"),
      supabaseAdmin.from("plans").select("id, name, slug, price_cents"),
      getInternalUserIds(),
    ]);

    const planMap = new Map((plans.data ?? []).map((p) => [p.id, p]));
    // Ignora contas internas (admin / professor / mentor) em TODAS as métricas
    const subsArr = (subs.data ?? []).filter((s) => !internalIds.has(s.user_id));

    const activePaid = subsArr.filter(
      (s) =>
        s.status === "active" &&
        (planMap.get(s.plan_id)?.price_cents ?? 0) > 0 &&
        (!s.current_period_end || new Date(s.current_period_end).getTime() > now),
    );
    const mrr_cents = activePaid.reduce((acc, s) => acc + (planMap.get(s.plan_id)?.price_cents ?? 0), 0);

    // por plano
    const byPlan = new Map<string, { name: string; count: number; revenue_cents: number }>();
    activePaid.forEach((s) => {
      const p = planMap.get(s.plan_id);
      const k = s.plan_id;
      const cur = byPlan.get(k) ?? { name: p?.name ?? "—", count: 0, revenue_cents: 0 };
      cur.count += 1;
      cur.revenue_cents += p?.price_cents ?? 0;
      byPlan.set(k, cur);
    });

    // status (active/trialing/canceled/free)
    const statusCount = { active: 0, trialing: 0, canceled: 0, free: 0 };
    subsArr.forEach((s) => {
      const price = planMap.get(s.plan_id)?.price_cents ?? 0;
      if (s.status === "canceled") statusCount.canceled++;
      else if (price === 0) statusCount.free++;
      else if (s.status === "trialing") statusCount.trialing++;
      else statusCount.active++;
    });

    // novos por dia (30 dias)
    const daily = new Map<string, number>();
    subsArr.forEach((s) => {
      if (!s.created_at) return;
      const day = s.created_at.slice(0, 10);
      if (s.created_at < d30) return;
      daily.set(day, (daily.get(day) ?? 0) + 1);
    });
    const dailySeries = Array.from(daily.entries())
      .sort()
      .map(([day, count]) => ({ day, count }));

    const total_users_raw = ("total" in users.data ? (users.data.total ?? 0) : 0);
    return {
      total_users: Math.max(total_users_raw - internalIds.size, 0),
      new_subs_7d: subsArr.filter((s) => s.created_at && s.created_at >= d7).length,
      new_subs_30d: subsArr.filter((s) => s.created_at && s.created_at >= d30).length,
      paying_users: activePaid.length,
      mrr_cents,
      by_plan: Array.from(byPlan.values()),
      status_count: statusCount,
      daily_series: dailySeries,
      internal_users: internalIds.size,
    };
  });
