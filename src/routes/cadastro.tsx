import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/cadastro")({
  component: SignupPage,
  head: () => ({ meta: [{ title: "Criar conta — Estação Revalida" }] }),
});

function SignupPage() {
  const nav = useNavigate();
  const [role, setRole] = useState("aluno");
  return (
    <div className="min-h-screen bg-gradient-card">
      <div className="container mx-auto flex min-h-screen max-w-md flex-col px-4 py-8">
        <Logo />
        <div className="mt-12 rounded-3xl border border-border bg-card p-8 shadow-elegant">
          <h1 className="font-display text-2xl font-bold">Crie sua conta</h1>
          <p className="mt-2 text-sm text-muted-foreground">Comece a treinar com método em menos de 1 minuto.</p>
          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              nav({ to: "/app" });
            }}
          >
            <div>
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" required />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required />
            </div>
            <div>
              <Label>Perfil</Label>
              <RadioGroup value={role} onValueChange={setRole} className="mt-2 grid grid-cols-2 gap-3">
                {[
                  { v: "aluno", l: "Aluno", d: "Quero treinar" },
                  { v: "professor", l: "Professor", d: "Quero ensinar" },
                ].map((o) => (
                  <label
                    key={o.v}
                    className={`flex cursor-pointer flex-col rounded-xl border p-3 transition-all ${
                      role === o.v ? "border-mint bg-mint/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value={o.v} id={o.v} />
                      <span className="font-medium">{o.l}</span>
                    </div>
                    <span className="mt-1 pl-6 text-xs text-muted-foreground">{o.d}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="wpp">WhatsApp</Label>
                <Input id="wpp" placeholder="opcional" />
              </div>
              <div>
                <Label htmlFor="year">Ano da prova</Label>
                <Input id="year" placeholder="opcional" />
              </div>
            </div>
            <Button variant="hero" size="lg" className="w-full">
              Criar conta <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="font-semibold text-medical hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
