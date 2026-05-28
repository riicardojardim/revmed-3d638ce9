import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = "BFE9sPojxQQCmwoI8wL5iaHph1s1V3B37SAIu-DrrzsyTn0JxVFhvxo5Qcbb7aIIlC9zsYzS5bjFJzjLHOA1250";

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setLoading(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
      setPermission(Notification.permission);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const subscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Notificações não são suportadas neste navegador.');
      return;
    }

    try {
      setLoading(true);
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        toast.error('Permissão para notificações negada.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const { data: { user } } = await supabase.auth.getUser();
      // Removido o bloqueio para permitir inscrição de convidados/visitantes
      // se houver lógica que dependa de user_id, ela lidará com null ou criaremos anônimo
      
      const subscriptionData = subscription.toJSON();
      
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user?.id || null, // Permite nulo para visitantes
        endpoint: subscription.endpoint,
        p256dh: subscriptionData.keys?.p256dh ?? '',
        auth: subscriptionData.keys?.auth ?? '',
      }, { onConflict: 'endpoint' });

      if (error) throw error;

      // Envia notificação de boas-vindas se o usuário estiver logado
      if (user) {
        await supabase.functions.invoke("send-push-notification", {
          body: { 
            title: 'Notificações Ativadas! 🔔', 
            body: 'Você agora receberá as principais novidades do REVMED diretamente aqui.', 
            url: '/app/perfil',
            userId: user.id
          },
        });
      }

      setIsSubscribed(true);
      toast.success('Notificações ativadas com sucesso!');
    } catch (error) {
      console.error('Failed to subscribe', error);
      toast.error('Erro ao ativar notificações.');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    try {
      setLoading(true);
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        await supabase
          .from('push_subscriptions')
          .delete()
          .match({ endpoint: subscription.endpoint });
      }

      setIsSubscribed(false);
      toast.success('Notificações desativadas.');
    } catch (error) {
      console.error('Error unsubscribing', error);
      toast.error('Erro ao desativar notificações.');
    } finally {
      setLoading(false);
    }
  };

  return { isSubscribed, permission, subscribe, unsubscribe, loading };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
