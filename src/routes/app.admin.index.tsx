import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookOpen, ClipboardList, Layers } from "lucide-react";

export const Route = createFileRoute("/app/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const [stats, setStats] = useState({ users: 0, attempts: 0, stations: 0, flashcards: 0 });

  useEffect(() => {
    (async () => {
      const [u, a, s, f] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("attempts").select("id", { count: "exact", head: true }),
        supabase.from("custom_stations").select("id", { count: "exact", head: true }),
        supabase.from("flashcards").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        users: u.count ?? 0,
        attempts: a.count ?? 0,
        stations: s.count ?? 0,
        flashcards: f.count ?? 0,
      });
    })();
  }, []);

  const cards = [
    { label: "Usuários", value: stats.users, icon: Users },
    { label: "Tentativas", value: stats.attempts, icon: ClipboardList },
    { label: "Estações criadas", value: stats.stations, icon: Layers },
    { label: "Flashcards", value: stats.flashcards, icon: BookOpen },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <c.icon className="h-5 w-5 text-mint" />
          <div className="mt-3 text-3xl font-bold font-display">{c.value}</div>
          <div className="text-sm text-muted-foreground">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
