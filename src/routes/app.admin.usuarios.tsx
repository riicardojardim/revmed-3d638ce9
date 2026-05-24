import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Loader2, MoreHorizontal, Plus, Shield, UserPlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatWhatsapp, normalizeWhatsapp, isValidWhatsapp } from "@/lib/whatsapp";
import {
  listUsersAdmin,
  createUserAdmin,
  updateUserEmailAdmin,
  resetPasswordAdmin,
  sendPasswordResetLinkAdmin,
  setUserRoleAdmin,
  assignPlanAdmin,
  adjustSubscriptionDaysAdmin,
  cancelSubscriptionAdmin,
  deleteUserAdmin,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/app/admin/usuarios")({
  component: AdminUsers,
});

type ApiUser = Awaited<ReturnType<typeof listUsersAdmin>>["users"][number];
type Plan = { id: string; name: string; slug: string; price_cents: number };

function AdminUsers() {
  const list = useServerFn(listUsersAdmin);
  const createFn = useServerFn(createUserAdmin);
  const setEmail = useServerFn(updateUserEmailAdmin);
  const setPass = useServerFn(resetPasswordAdmin);
  const sendLink = useServerFn(sendPasswordResetLinkAdmin);
  const setRole = useServerFn(setUserRoleAdmin);
  const assignPlan = useServerFn(assignPlanAdmin);
  const adjustDays = useServerFn(adjustSubscriptionDaysAdmin);
  const cancelSub = useServerFn(cancelSubscriptionAdmin);
  const delUser = useServerFn(deleteUserAdmin);

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [createDefaultRole, setCreateDefaultRole] = useState<"aluno" | "professor" | "admin" | "mentor">("aluno");
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await list({ data: { search } });
      setUsers(r.users);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setLoading(false);
  }
  async function loadPlans() {
    const { data } = await supabase.from("plans").select("id, name, slug, price_cents").eq("active", true).order("price_cents");
    setPlans((data ?? []) as Plan[]);
  }
  useEffect(() => {
    void load();
    void loadPlans();
  }, []);

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        !q ||
        u.email.toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q) ||
        u.id.includes(q),
    );
  }, [users, search]);

  async function run<T>(id: string, p: Promise<T>, ok: string) {
    setActing(id);
    try {
      await p;
      toast.success(ok);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setActing(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Buscar por e-mail, nome ou id..."
          className="w-full max-w-sm rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-mint"
        />
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
        </Button>
        <div className="ml-auto">
          <div className="flex gap-2">
            <Button
              variant="hero"
              onClick={() => {
                setCreateDefaultRole("aluno");
                setOpenCreate(true);
              }}
            >
              <UserPlus className="mr-2 h-4 w-4" /> Novo usuário
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Permissão</th>
              <th className="px-4 py-3">Criado em</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => {
              const role = u.roles.includes("admin")
                ? "admin"
                : u.roles.includes("professor")
                ? "professor"
                : u.roles.includes("mentor")
                ? "mentor"
                : "aluno";
              const end = u.subscription?.current_period_end ? new Date(u.subscription.current_period_end) : null;
              const expired = end && end.getTime() < Date.now();
              return (
                <tr key={u.id} className="border-t border-border align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.full_name ?? "(sem nome)"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {u.subscription ? (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold">{u.subscription.plan_name}</div>
                        <Badge variant={expired ? "destructive" : u.subscription.status === "canceled" ? "outline" : "default"} className="text-[10px]">
                          {expired ? "Expirado" : u.subscription.status}
                        </Badge>
                        {end && (
                          <div className="text-[10px] text-muted-foreground">até {end.toLocaleDateString("pt-BR")}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={role === "admin" ? "destructive" : role === "professor" ? "default" : role === "mentor" ? "secondary" : "outline"}
                      className={`text-[10px] ${role === "mentor" ? "bg-mint/15 text-mint hover:bg-mint/15" : ""}`}
                    >
                      {role === "admin" && <Shield className="mr-1 h-3 w-3" />}
                      {role === "mentor" && <Sparkles className="mr-1 h-3 w-3" />}
                      {role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <UserActions
                      user={u}
                      plans={plans}
                      acting={acting === u.id}
                      onEditEmail={async (email) => run(u.id, setEmail({ data: { user_id: u.id, email } }), "E-mail atualizado")}
                      onSetPassword={async (password) => run(u.id, setPass({ data: { user_id: u.id, password } }), "Senha redefinida")}
                      onSendLink={async () => run(u.id, sendLink({ data: { email: u.email } }), "Link enviado")}
                      onSetRole={async (r) => run(u.id, setRole({ data: { user_id: u.id, role: r } }), "Permissão atualizada")}
                      onAssignPlan={async (plan_id, days) => run(u.id, assignPlan({ data: { user_id: u.id, plan_id, days, status: "active" } }), "Plano atribuído")}
                      onAdjustDays={async (days) => run(u.id, adjustDays({ data: { user_id: u.id, days } }), `${days > 0 ? "+" : ""}${days} dias aplicados`)}
                      onCancel={async () => run(u.id, cancelSub({ data: { user_id: u.id } }), "Assinatura cancelada")}
                      onDelete={async () => {
                        if (!confirm(`Excluir ${u.email}? Esta ação é permanente.`)) return;
                        run(u.id, delUser({ data: { user_id: u.id } }), "Usuário excluído");
                      }}
                    />
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && !loading && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <CreateUserDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        defaultRole={createDefaultRole}
        plans={plans}
        onCreate={async (payload) => {
          try {
            await createFn({ data: payload });
            toast.success("Usuário criado");
            setOpenCreate(false);
            await load();
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />
    </div>
  );
}

function UserActions(props: {
  user: ApiUser;
  plans: Plan[];
  acting: boolean;
  onEditEmail: (email: string) => void;
  onSetPassword: (password: string) => void;
  onSendLink: () => void;
  onSetRole: (role: "aluno" | "professor" | "admin" | "mentor") => void;
  onAssignPlan: (plan_id: string, days: number) => void;
  onAdjustDays: (days: number) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [planDialog, setPlanDialog] = useState(false);
  const [emailDialog, setEmailDialog] = useState(false);
  const [passDialog, setPassDialog] = useState(false);
  const [daysDialog, setDaysDialog] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={props.acting}>
            {props.acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Plano</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setPlanDialog(true)}>Atribuir plano</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDaysDialog(true)}>+ / − dias</DropdownMenuItem>
          {props.user.subscription && (
            <DropdownMenuItem onSelect={props.onCancel} className="text-destructive">Cancelar assinatura</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Conta</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setEmailDialog(true)}>Mudar e-mail</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPassDialog(true)}>Definir senha</DropdownMenuItem>
          <DropdownMenuItem onSelect={props.onSendLink}>Enviar link de recuperação</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Permissão</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => props.onSetRole("aluno")}>Tornar aluno</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => props.onSetRole("professor")}>Tornar professor</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => props.onSetRole("mentor")}>Tornar mentor</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => props.onSetRole("admin")}>Tornar admin</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={props.onDelete} className="text-destructive">Excluir usuário</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PromptDialog
        open={emailDialog} onOpenChange={setEmailDialog}
        title="Mudar e-mail" label="Novo e-mail" defaultValue={props.user.email} type="email"
        onConfirm={(v) => { props.onEditEmail(v); setEmailDialog(false); }}
      />
      <PromptDialog
        open={passDialog} onOpenChange={setPassDialog}
        title="Definir nova senha" label="Senha (mín. 8 caracteres)" type="password"
        onConfirm={(v) => { if (v.length < 8) return toast.error("Mínimo 8 caracteres"); props.onSetPassword(v); setPassDialog(false); }}
      />
      <DaysDialog open={daysDialog} onOpenChange={setDaysDialog} onConfirm={(d) => { props.onAdjustDays(d); setDaysDialog(false); }} />
      <AssignPlanDialog
        open={planDialog} onOpenChange={setPlanDialog} plans={props.plans}
        onConfirm={(plan_id, days) => { props.onAssignPlan(plan_id, days); setPlanDialog(false); }}
      />
    </>
  );
}

function PromptDialog({ open, onOpenChange, title, label, defaultValue = "", type = "text", onConfirm }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; label: string; defaultValue?: string; type?: string;
  onConfirm: (v: string) => void;
}) {
  const [val, setVal] = useState(defaultValue);
  useEffect(() => { if (open) setVal(defaultValue); }, [open, defaultValue]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <label className="text-sm">{label}
          <input type={type} value={val} onChange={(e) => setVal(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="hero" onClick={() => onConfirm(val)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DaysDialog({ open, onOpenChange, onConfirm }: { open: boolean; onOpenChange: (v: boolean) => void; onConfirm: (d: number) => void }) {
  const [days, setDays] = useState(30);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar / remover dias</DialogTitle>
          <DialogDescription>Use número negativo para remover.</DialogDescription>
        </DialogHeader>
        <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-lg font-display" />
        <div className="flex flex-wrap gap-2 text-xs">
          {[7, 15, 30, 90, 180, 365].map((n) => (
            <button key={n} onClick={() => setDays(n)} className="rounded-full border border-border px-2 py-1 hover:bg-muted">+{n}d</button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="hero" onClick={() => onConfirm(days)}>Aplicar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignPlanDialog({ open, onOpenChange, plans, onConfirm }: {
  open: boolean; onOpenChange: (v: boolean) => void; plans: Plan[];
  onConfirm: (plan_id: string, days: number) => void;
}) {
  const [pid, setPid] = useState("");
  const [days, setDays] = useState(30);
  useEffect(() => { if (open && plans.length > 0 && !pid) setPid(plans[0].id); }, [open, plans, pid]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Atribuir plano</DialogTitle></DialogHeader>
        <label className="text-sm">Plano
          <select value={pid} onChange={(e) => setPid(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2">
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name} ({(p.price_cents / 100).toFixed(2)})</option>)}
          </select>
        </label>
        <label className="text-sm">Duração (dias). 0 = sem expiração.
          <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="hero" onClick={() => onConfirm(pid, days)} disabled={!pid}>Atribuir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function isValidCPF(cpf: string) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(d[i]) * (10 - i);
  let r = (s * 10) % 11;
  if (r === 10) r = 0;
  if (r !== parseInt(d[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(d[i]) * (11 - i);
  r = (s * 10) % 11;
  if (r === 10) r = 0;
  return r === parseInt(d[10]);
}

type CreatePayload = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  username: string;
  title: "Dr." | "Dra.";
  whatsapp: string;
  cpf: string;
  birth_date: string;
  role: "aluno" | "professor" | "admin" | "mentor";
  plan_id?: string;
  plan_days: number;
};

function CreateUserDialog({ open, onOpenChange, onCreate, defaultRole = "aluno", plans }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onCreate: (p: CreatePayload) => void;
  defaultRole?: "aluno" | "professor" | "admin" | "mentor";
  plans: Plan[];
}) {
  const initial = {
    title: "Dr." as "Dr." | "Dra.",
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    whatsapp: "",
    birth_date: "",
    cpf: "",
    password: "",
  };
  const [f, setF] = useState(initial);
  const [role, setRole] = useState<"aluno" | "professor" | "admin" | "mentor">(defaultRole);
  const [planId, setPlanId] = useState<string>("");
  const [planDays, setPlanDays] = useState<number>(30);

  useEffect(() => {
    if (open) {
      setRole(defaultRole);
      setF(initial);
      setPlanId("");
      setPlanDays(30);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultRole]);

  const usernameValid = /^[a-z0-9._]{3,20}$/.test(f.username) && !/^[._]|[._]$|[._]{2,}/.test(f.username);
  const cpfDigits = f.cpf.replace(/\D/g, "");
  const cpfValid = isValidCPF(f.cpf);
  const wppDigits = normalizeWhatsapp(f.whatsapp);
  const wppValid = isValidWhatsapp(wppDigits);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email);
  const birthValid = (() => {
    if (!f.birth_date) return false;
    const b = new Date(f.birth_date);
    if (isNaN(b.getTime())) return false;
    const age = (Date.now() - b.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return age >= 16 && age <= 100;
  })();

  const allValid =
    f.first_name.trim().length > 0 &&
    f.last_name.trim().length > 0 &&
    usernameValid &&
    emailValid &&
    wppValid &&
    birthValid &&
    cpfValid &&
    f.password.length >= 8 &&
    !!planId;

  function submit() {
    if (!allValid) return;
    onCreate({
      email: f.email.trim().toLowerCase(),
      password: f.password,
      first_name: f.first_name.trim(),
      last_name: f.last_name.trim(),
      username: f.username.trim(),
      title: f.title,
      whatsapp: wppDigits,
      cpf: cpfDigits,
      birth_date: f.birth_date,
      role,
      plan_id: planId,
      plan_days: planDays,
    });
  }

  const inputCls = "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-mint";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{role === "mentor" ? "Novo mentor" : "Novo usuário"}</DialogTitle>
          <DialogDescription>
            Criado já confirmado, com plano e validade definidos por você.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Título */}
          <div>
            <div className="text-sm font-medium">Como prefere ser chamado(a)?</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["Dr.", "Dra."] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setF((s) => ({ ...s, title: t }))}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
                    f.title === t ? "border-mint bg-mint/10 text-mint" : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">Nome <span className="text-destructive">*</span>
              <input value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} className={inputCls} required />
            </label>
            <label className="block text-sm">Sobrenome <span className="text-destructive">*</span>
              <input value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} className={inputCls} required />
            </label>
          </div>

          <label className="block text-sm">Usuário (como vai aparecer) <span className="text-destructive">*</span>
            <input
              value={f.username}
              onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 20) })}
              placeholder="ex: dra.ana"
              className={inputCls}
              required
            />
            <span className={`mt-1 block text-[11px] ${f.username && !usernameValid ? "text-destructive" : "text-muted-foreground"}`}>
              Sem espaços. Letras minúsculas, números, . ou _
            </span>
          </label>

          <label className="block text-sm">E-mail <span className="text-destructive">*</span>
            <input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={inputCls} required />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">WhatsApp <span className="text-destructive">*</span>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="(11) 99999-9999"
                maxLength={16}
                value={f.whatsapp}
                onChange={(e) => setF({ ...f, whatsapp: formatWhatsapp(e.target.value) })}
                className={inputCls}
                required
              />
            </label>
            <label className="block text-sm">Data de nascimento <span className="text-destructive">*</span>
              <input
                type="date"
                value={f.birth_date}
                onChange={(e) => setF({ ...f, birth_date: e.target.value })}
                max={new Date().toISOString().slice(0, 10)}
                className={inputCls}
                required
              />
            </label>
          </div>

          <label className="block text-sm">CPF <span className="text-destructive">*</span>
            <input
              inputMode="numeric"
              placeholder="000.000.000-00"
              maxLength={14}
              value={f.cpf}
              onChange={(e) => setF({ ...f, cpf: formatCPF(e.target.value) })}
              className={inputCls}
              required
            />
            {f.cpf && !cpfValid && (
              <span className="mt-1 block text-[11px] text-destructive">CPF inválido.</span>
            )}
          </label>

          <label className="block text-sm">Senha (mín. 8) <span className="text-destructive">*</span>
            <input type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className={inputCls} required minLength={8} />
          </label>

          <label className="block text-sm">Permissão
            <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className={inputCls}>
              <option value="aluno">Aluno</option>
              <option value="mentor">Mentor (acesso completo, sem cobrança)</option>
              <option value="professor">Professor</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <div className="rounded-2xl border border-border bg-muted/30 p-3 space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Plano <span className="text-destructive">*</span></div>
            <label className="block text-sm">Qual plano <span className="text-destructive">*</span>
              <select value={planId} onChange={(e) => setPlanId(e.target.value)} className={inputCls} required>
                <option value="">Selecione um plano</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (R$ {(p.price_cents / 100).toFixed(2)})</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">Validade (dias). 0 = sem expiração (vitalício).
              <input
                type="number"
                min={0}
                max={3650}
                value={planDays}
                onChange={(e) => setPlanDays(Math.max(0, Math.min(3650, Number(e.target.value) || 0)))}
                className={inputCls}
              />
            </label>
            <div className="flex flex-wrap gap-2 text-xs">
              {[30, 90, 180, 365, 730].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPlanDays(n)}
                  className={`rounded-full border px-2.5 py-1 hover:bg-muted ${planDays === n ? "border-mint text-mint" : "border-border"}`}
                >
                  {n}d
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPlanDays(0)}
                className={`rounded-full border px-2.5 py-1 hover:bg-muted ${planDays === 0 ? "border-mint text-mint" : "border-border"}`}
              >
                Vitalício
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="hero" onClick={submit} disabled={!allValid}>
            <Plus className="mr-2 h-4 w-4" /> Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
