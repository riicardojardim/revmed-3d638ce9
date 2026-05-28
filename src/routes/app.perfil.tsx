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
import { formatWhatsapp, normalizeWhatsapp, isValidWhatsapp } from "@/lib/whatsapp";
import { formatCPF, isValidCPF, normalizeCPF } from "@/lib/cpf";
import { AvatarUploader } from "@/components/AvatarUploader";
import { Reveal } from "@/components/ui/reveal";
import { MotionCard } from "@/components/motion/MotionPrimitives";

export const Route = createFileRoute("/app/perfil")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Perfil — REVMED" }] }),
});

const TITLE_OPTIONS = [
  { value: "Dr.", label: "Dr." },
  { value: "Dra.", label: "Dra." },
  { value: "Sem título", label: "Sem título" },
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
  const planName = plan && !plan.expired
    ? plan.name
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
  const splitName = (full: string | null | undefined): [string, string] => {
    const trimmed = (full ?? "").trim();
    if (!trimmed) return ["", ""];
    const parts = trimmed.split(/\s+/);
    const first = parts.shift() ?? "";
    return [first, parts.join(" ")];
  };
  const [initialFirst, initialLast] = splitName(profile?.full_name);
  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [title, setTitle] = useState<string>(profile?.title ?? "");
  const [whatsapp, setWhatsapp] = useState(formatWhatsapp(profile?.whatsapp ?? ""));
  const [username, setUsername] = useState<string>(profile?.username ?? "");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [cpf, setCpf] = useState<string>(formatCPF(profile?.cpf ?? ""));
  const [birthDate, setBirthDate] = useState<string>(profile?.birth_date ?? "");
  const examYear = profile?.exam_year || deduceExamYear();
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const [f, l] = splitName(profile?.full_name);
    setFirstName(profile?.first_name ?? f);
    setLastName(profile?.last_name ?? l);
    setTitle(profile?.title ?? "");
    setWhatsapp(formatWhatsapp(profile?.whatsapp ?? ""));
    setUsername(profile?.username ?? "");
    setCpf(formatCPF(profile?.cpf ?? ""));
    setBirthDate(profile?.birth_date ?? "");
  }, [profile]);

  function validateUsername(v: string): string | null {
    if (!v) return null; // opcional
    if (!/^[a-z0-9._]{3,20}$/.test(v)) {
      return "Use 3–20 caracteres: letras minúsculas, números, ponto ou _";
    }
    return null;
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const digits = normalizeWhatsapp(whatsapp);
    if (digits && !isValidWhatsapp(digits)) {
      toast.error("WhatsApp inválido. Use o formato (XX) 9XXXX-XXXX.");
      return;
    }
    const uname = username.trim().toLowerCase();
    const uErr = validateUsername(uname);
    if (uErr) { setUsernameError(uErr); toast.error(uErr); return; }
    setUsernameError(null);
    const cpfDigits = normalizeCPF(cpf);
    if (cpfDigits && !isValidCPF(cpfDigits)) {
      toast.error("CPF inválido.");
      return;
    }
    setSavingProfile(true);
    const composedName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: composedName || null,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        title: title || null,
        whatsapp: digits || null,
        exam_year: examYear || null,
        username: uname || null,
        cpf: cpfDigits || null,
        birth_date: birthDate || null,
      })
      .eq("id", user.id);
    setSavingProfile(false);
    if (error) {
      if (error.code === "23505") {
        toast.error("Esse @username já está em uso.");
      } else {
        toast.error("Não foi possível salvar: " + error.message);
      }
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) {
      toast.error("Não foi possível identificar seu e-mail.");
      return;
    }
    if (!currentPassword) {
      toast.error("Informe a senha atual.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A nova senha precisa de no mínimo 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (newPassword === currentPassword) {
      toast.error("A nova senha deve ser diferente da atual.");
      return;
    }
    setSavingPassword(true);
    // Reautentica para validar a senha atual antes de atualizar.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInError) {
      setSavingPassword(false);
      toast.error("Senha atual incorreta.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error("Erro ao atualizar senha: " + error.message);
      return;
    }
    toast.success("Senha atualizada com sucesso!");
    setCurrentPassword("");
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
      <Reveal>
      <MotionCard lift={2} glow className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          {user && (
            <AvatarUploader
              userId={user.id}
              avatarUrl={profile?.avatar_url ?? null}
              initial={initial}
              onUpdated={() => refresh()}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="font-display text-xl font-bold truncate">{greetingTitle}</div>
            <div className="text-sm text-muted-foreground truncate">
              {user?.email} · {roleLabel}
            </div>
          </div>
        </div>
      </MotionCard>
      </Reveal>

      {/* Personal info */}
      <form onSubmit={handleSaveProfile} className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-5">
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-mint" />
          <h3 className="font-semibold">Informações pessoais</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">Nome</Label>
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Seu nome" autoComplete="given-name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Sobrenome</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Seu sobrenome" autoComplete="family-name" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Como quer ser chamado(a)</Label>
            <Select value={title} onValueChange={setTitle}>
              <SelectTrigger id="title"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {TITLE_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="username">@username</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">@</span>
              <Input
                id="username"
                value={username}
                onChange={(e) => { setUsername(e.target.value.toLowerCase()); setUsernameError(null); }}
                placeholder="seunome"
                maxLength={20}
                autoComplete="off"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {usernameError ?? "Como seus amigos vão te encontrar. 3–20 caracteres, letras minúsculas, números, ponto ou _."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(formatWhatsapp(e.target.value))}
              placeholder="(11) 99999-9999"
              maxLength={16}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="birthDate">Data de nascimento</Label>
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              inputMode="numeric"
              value={cpf}
              onChange={(e) => setCpf(formatCPF(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={14}
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
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">Senha atual</Label>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Digite sua senha atual"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Nova senha</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
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
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
            />
          </div>
        </div>
        <div>
          <Button
            type="submit"
            variant="outline"
            disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
          >
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
            href="https://wa.me/5521987860985?text=Ol%C3%A1%2C%20quero%20ativar%20minha%20assinatura%20na%20Esta%C3%A7%C3%A3o%20Revalida."
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
