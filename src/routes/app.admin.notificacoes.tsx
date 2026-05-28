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
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/admin/notificacoes")({
  component: AdminNotifications,
});

function AdminNotifications() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/app");
  const [sending, setSending] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriberCount();
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
              {sending ? "Enviando..." : "Enviar Notificação"}
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
              <Clock className="h-5 w-5 text-mint" />
              Dicas de Automação
            </CardTitle>
            <CardDescription>
              Sugestões de notificações automáticas para implementar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Alerta de Novo Conteúdo
                </h4>
                <Badge variant="secondary">Alta Conversão</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Sempre que publicar um novo checklist ou deck de flashcards, envie uma notificação automática.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  Lembrete de Estudo
                </h4>
                <Badge variant="secondary">Retenção</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Se o usuário não fizer uma tentativa em 48h, envie um lembrete: "Sua evolução não pode parar! Vamos treinar hoje?"
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-purple-500" />
                  Novidades da Prova
                </h4>
                <Badge variant="secondary">Informativo</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Notificações sobre prazos do INEP, edital ou mudanças na prova prática.
              </p>
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Smartphone className="h-4 w-4" />
                Dica Técnica
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                As notificações push funcionam melhor quando o usuário instala o PWA. No iOS, o suporte exige que o app esteja na tela de início.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
