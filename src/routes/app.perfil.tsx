import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogOut, MessageCircle, User as UserIcon, Mail, Lock, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/perfil")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Perfil — Estação Revalida" }] }),
});

const TITLE_OPTIONS = [
  { value: "Dr.", label: "Dr." },
  { value: "Dra.", label: "Dra." },
  { value: "Sem título", label: "Sem título" },
];

const GENDER_OPTIONS = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "nao_binario", label: "Não-binário" },
  { value: "prefiro_nao_dizer", label: "Prefiro não dizer" },
];

function deduceExamYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (m <= 3) return `${y}.1`;
  if (m <= 8) return `${y}.2`;
  return `${y + 1}.1`;
}

function ProfilePage() {
  const { user, profile, roles, signOut, refresh } = useAuth();
  const { plan, daysLeft, loading: subLoading, isCompletoLike, isAtorOnly } = useSubscription();
  const nav = useNavigate();

  // -------- Plan display --------
  const isAtorPlan = isAtorOnly;
  const isMonthly = plan?.slug === "completo_mensal" && !plan.expired;
  const isCompletoPlan = plan?.slug === "completo" && !plan.expired;
  const planName = isAtorPlan
    ? "Plano Ator"
    : isMonthly
      ? "Plano Completo Mensal"
      : isCompletoPlan
        ? "Plano Completo"
        : plan && !plan.expired
          ? `Plano ${plan.name}`
          : "Plano Free";
  const planDescription = isAtorPlan
    ? "Você atua como ator em salas de treino."
    : isCompletoLike
      ? "Acesso completo a estações, flashcards, resumos e correções."
      : "Atualize para desbloquear todas as estações e correção do professor.";
  const planStatus = isAtorPlan || isCompletoLike
    ? plan?.status === "trialing"
      ? `Teste · ${daysLeft ?? 0} dias`
      : "Ativo"
    : "Inativo";
  const roleLabel = isAtorPlan
    ? "Ator"
    : roles.includes("admin")
      ? "Admin"
      : roles.includes("professor")
        ? "Professor"
        : "Aluno";

  // -------- Personal info form --------
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [title, setTitle] = useState<string>(profile?.title ?? "");
  const [gender, setGender] = useState<string>(profile?.gender ?? "");
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp ?? "");
  const examYear = profile?.exam_year || deduceExamYear();
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setTitle(profile?.title ?? "");
    setGender(profile?.gender ?? "");
    setWhatsapp(profile?.whatsapp ?? "");
    
  }, [profile]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        title: title || null,
        gender: gender || null,
        whatsapp: whatsapp.trim() || null,
        exam_year: examYear || null,
      })
      .eq("id", user.id);
    setSavingProfile(false);
    if (error) {
      toast.error("Não foi possível salvar: " + error.message);
      return;
    }
    toast.success("Perfil atualizado!");
    await refresh();
  }

  // -------- Email change --------
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSavingEmail(false);
    if (error) {
      toast.error("Erro ao atualizar e-mail: " + error.message);
      return;
    }
    toast.success("Enviamos um link de confirmação para o novo e-mail.");
    setNewEmail("");
  }

  // -------- Password change --------
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("A senha precisa de no mínimo 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error("Erro ao atualizar senha: " + error.message);
      return;
    }
    toast.success("Senha atualizada com sucesso!");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleLogout() {
    await signOut();
    nav({ to: "/login" });
  }

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "—";
  const initial = displayName.charAt(0).toUpperCase();
  const greetingTitle = title && title !== "Sem título" ? `${title} ${displayName.split(" ")[0]}` : displayName;

  if (subLoading) {
    return <div className="mx-auto max-w-3xl text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Header card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-mint text-xl font-bold text-night">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-xl font-bold truncate">{greetingTitle}</div>
            <div className="text-sm text-muted-foreground truncate">
              {user?.email} · {roleLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <form onSubmit={handleSaveProfile} className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-5">
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-mint" />
          <h3 className="font-semibold">Informações pessoais</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Como aparece no seu diploma"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Como quer ser chamado(a)</Label>
            <Select value={title} onValueChange={setTitle}>
              <SelectTrigger id="title">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {TITLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gender">Sexo</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger id="gender">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>

        </div>

        <div>
          <Button type="submit" variant="hero" disabled={savingProfile}>
            <Save className="h-4 w-4" />
            {savingProfile ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </form>

      {/* Email change */}
      <form onSubmit={handleChangeEmail} className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-mint" />
          <h3 className="font-semibold">E-mail de acesso</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          E-mail atual: <strong className="text-foreground">{user?.email}</strong>
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            type="email"
            placeholder="novo@email.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={savingEmail || !newEmail.trim()}>
            {savingEmail ? "Enviando..." : "Atualizar e-mail"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Você receberá um link de confirmação no novo endereço para concluir a troca.
        </p>
      </form>

      {/* Password change */}
      <form onSubmit={handleChangePassword} className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-mint" />
          <h3 className="font-semibold">Alterar senha</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Nova senha</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
            />
          </div>
        </div>
        <div>
          <Button type="submit" variant="outline" disabled={savingPassword || !newPassword || !confirmPassword}>
            {savingPassword ? "Atualizando..." : "Atualizar senha"}
          </Button>
        </div>
      </form>

      {/* Subscription */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h3 className="font-semibold">Minha assinatura</h3>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-display text-2xl font-bold">{planName}</div>
            <div className="mt-1 text-sm text-muted-foreground">{planDescription}</div>
            {plan?.current_period_end && (
              <div className="mt-1 text-xs text-muted-foreground">
                Válido até {new Date(plan.current_period_end).toLocaleDateString("pt-BR")}
              </div>
            )}
          </div>
          <Badge className="bg-mint/15 text-medical hover:bg-mint/15">{planStatus}</Badge>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="hero">Fazer upgrade</Button>
          <a
            href="https://wa.me/5500000000000?text=Ol%C3%A1%2C%20quero%20ativar%20minha%20assinatura%20na%20Esta%C3%A7%C3%A3o%20Revalida."
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="outline">
              <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
            </Button>
          </a>
        </div>
      </div>

      <Button variant="ghost" className="text-muted-foreground" onClick={handleLogout}>
        <LogOut className="h-4 w-4" /> Sair da conta
      </Button>
    </div>
  );
}
