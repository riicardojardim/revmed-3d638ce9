import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Loader2, MoreHorizontal, Plus, Shield, UserPlus } from "lucide-react";
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
          <Button variant="hero" onClick={() => setOpenCreate(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Novo usuário
          </Button>
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
              const role = u.roles.includes("admin") ? "admin" : u.roles.includes("professor") ? "professor" : "aluno";
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
                    <Badge variant={role === "admin" ? "destructive" : role === "professor" ? "default" : "outline"} className="text-[10px]">
                      {role === "admin" && <Shield className="mr-1 h-3 w-3" />}
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

      <CreateUserDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
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
  onSetRole: (role: "aluno" | "professor" | "admin") => void;
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

function CreateUserDialog({ open, onOpenChange, onCreate }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onCreate: (p: { email: string; password: string; full_name: string; role: "aluno" | "professor" | "admin" }) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"aluno" | "professor" | "admin">("aluno");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>O usuário será criado já confirmado.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block text-sm">Nome completo
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
          </label>
          <label className="block text-sm">E-mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
          </label>
          <label className="block text-sm">Senha temporária (mín. 8)
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
          </label>
          <label className="block text-sm">Permissão
            <select value={role} onChange={(e) => setRole(e.target.value as "aluno" | "professor" | "admin")} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2">
              <option value="aluno">Aluno</option>
              <option value="professor">Professor</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="hero" onClick={() => onCreate({ email, password, full_name: name, role })} disabled={!email || password.length < 8 || !name}>
            <Plus className="mr-2 h-4 w-4" /> Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
