import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, GraduationCap, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin/usuarios")({
  component: AdminUsers,
});

type Row = {
  id: string;
  full_name: string | null;
  exam_year: string | null;
  roles: ("aluno" | "professor" | "admin")[];
};

function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  async function load() {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, exam_year")
      .order("created_at", { ascending: false })
      .limit(200);
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const byUser = new Map<string, Row["roles"]>();
    (roles ?? []).forEach((r: { user_id: string; role: Row["roles"][number] }) => {
      const list = byUser.get(r.user_id) ?? [];
      list.push(r.role);
      byUser.set(r.user_id, list);
    });
    setRows(
      (profiles ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        exam_year: p.exam_year,
        roles: byUser.get(p.id) ?? [],
      })),
    );
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleRole(userId: string, role: "professor" | "admin", has: boolean) {
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) return toast.error(error.message);
    }
    toast.success("Permissão atualizada");
    load();
  }

  const visible = rows.filter((r) =>
    !filter ||
    (r.full_name ?? "").toLowerCase().includes(filter.toLowerCase()) ||
    r.id.includes(filter),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar por nome ou id..."
          className="w-full max-w-sm rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-mint"
        />
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Ano da prova</th>
              <th className="px-4 py-3">Permissões</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const isProf = r.roles.includes("professor");
              const isAdmin = r.roles.includes("admin");
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.full_name ?? "(sem nome)"}</div>
                    <div className="text-xs text-muted-foreground">{r.id.slice(0, 8)}…</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.exam_year ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {isAdmin && <Badge icon={Shield} label="admin" />}
                      {isProf && <Badge icon={GraduationCap} label="professor" />}
                      {!isAdmin && !isProf && <Badge icon={UserIcon} label="aluno" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <Button size="sm" variant={isProf ? "secondary" : "outline"}
                        onClick={() => toggleRole(r.id, "professor", isProf)}>
                        {isProf ? "Remover professor" : "Tornar professor"}
                      </Button>
                      <Button size="sm" variant={isAdmin ? "secondary" : "outline"}
                        onClick={() => toggleRole(r.id, "admin", isAdmin)}>
                        {isAdmin ? "Remover admin" : "Tornar admin"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && visible.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Nenhum usuário.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Badge({ icon: Icon, label }: { icon: typeof Shield; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-xs">
      <Icon className="h-3 w-3 text-mint" /> {label}
    </span>
  );
}
