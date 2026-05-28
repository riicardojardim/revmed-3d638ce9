import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Bell, 
  Send, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Globe,
  Smartphone,
  Info,
  Play,
  Trash2,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/admin/notificacoes")({
  component: AdminNotifications,
});

interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  url: string;
  interval_days: number;
  last_sent_at: string | null;
}


function AdminNotifications() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/app");
  const [sending, setSending] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scheduled, setScheduled] = useState<ScheduledNotification[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchSubscriberCount();
    fetchScheduled();
  }, []);

  async function fetchSubscriberCount() {
    try {
      const { count, error } = await supabase
        .from("push_subscriptions")
        .select("*", { count: "exact", head: true });
      
      if (error) throw error;
      setSubscriberCount(count || 0);
    } catch (error) {
      console.error("Error fetching subscriber count:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchScheduled() {
    const { data } = await supabase
      .from("scheduled_notifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setScheduled(data as ScheduledNotification[]);
  }

  async function handleSendTest() {
    if (!user) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-push-notification", {
        body: { 
          title: "🔔 Teste de Notificação", 
          body: "Esta é uma notificação de teste enviada agora pelo painel admin.", 
          url: "/app/admin/notificacoes",
          userId: user.id
        },
      });
      if (error) throw error;
      toast.success("Notificação de teste enviada para você!");
    } catch (error) {
      toast.error("Erro ao enviar teste.");
    } finally {
      setSending(false);
    }
  }

  async function handleSendNow(notif: ScheduledNotification) {
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-push-notification", {
        body: { title: notif.title, body: notif.body, url: notif.url },
      });
      if (error) throw error;
      
      await supabase
        .from("scheduled_notifications")
        .update({ last_sent_at: new Date().toISOString() })
        .eq("id", notif.id);
      
      toast.success("Notificação enviada com sucesso!");
      fetchScheduled();
    } catch (error) {
      toast.error("Erro ao enviar.");
    } finally {
      setSending(false);
    }
  }

  async function handleSendNotification() {
    if (!title || !body) {
      toast.error("Título e mensagem são obrigatórios.");
      return;
    }

    setSending(true);
    try {
      // We'll call an edge function here
      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: { title, body, url },
      });

      if (error) throw error;

      toast.success("Notificação enviada para todos os inscritos!");
      setTitle("");
      setBody("");
      setUrl("/app");
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Erro ao enviar notificação.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notificações Push</h2>
          <p className="text-muted-foreground">
            Envie mensagens instantâneas para os usuários que ativaram as notificações.
          </p>
        </div>
        <Card className="min-w-[200px]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-mint" />
              <span className="text-sm font-medium">Inscritos ativos</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {loading ? "..." : subscriberCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-mint" />
              Enviar Nova Notificação
            </CardTitle>
            <CardDescription>
              Esta mensagem será enviada para todos os {subscriberCount} inscritos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                placeholder="Ex: Novo Checklist Disponível!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Mensagem</Label>
              <Textarea
                id="body"
                placeholder="Ex: Já está disponível o novo checklist de Clínica Médica. Venha treinar!"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Link de Destino</Label>
              <Input
                id="url"
                placeholder="Ex: /app/checklists"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleSendNotification}
              disabled={sending || subscriberCount === 0}
            >
              {sending ? "Enviando..." : "Enviar Notificação em Massa"}
            </Button>
            
            <Button 
              variant="outline"
              className="w-full" 
              onClick={handleSendTest}
              disabled={sending}
            >
              <Play className="mr-2 h-4 w-4" />
              Enviar Teste para Mim
            </Button>

            {subscriberCount === 0 && (
              <p className="text-xs text-center text-warning flex items-center justify-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Nenhum usuário inscrito ainda.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-mint" />
              Notificações Automáticas
            </CardTitle>
            <CardDescription>
              Mensagens programadas para serem enviadas periodicamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scheduled.map((notif) => (
              <div key={notif.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold">{notif.title}</h4>
                  <Badge variant="secondary">Cada {notif.interval_days} dias</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{notif.body}</p>
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-[10px] text-muted-foreground">
                    Último envio: {notif.last_sent_at ? new Date(notif.last_sent_at).toLocaleDateString("pt-BR") : "Nunca"}
                  </span>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => handleSendNow(notif)} disabled={sending}>
                    <Send className="mr-1 h-3 w-3" /> Enviar agora
                  </Button>
                </div>
              </div>
            ))}
            
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Info className="h-4 w-4 text-blue-500" />
                Como funciona?
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                As notificações automáticas são enviadas aos usuários para manter o engajamento. Você pode forçar o envio manual clicando em "Enviar agora".
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
