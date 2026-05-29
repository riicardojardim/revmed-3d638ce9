import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

    webpush.setVapidDetails(
      "mailto:contato@revmed.app.br",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { type } = await req.json();

    console.log(`Processing automated notifications of type: ${type}`);

    let notificationsToSend = [];

    if (type === 'inactivity_check') {
      // 1. Find users who haven't joined a room in more than 48 hours
      // and haven't received a push in the last 24 hours
      const { data: inactiveUsers, error: userError } = await supabase.rpc('get_inactive_users_for_push');
      
      if (userError) throw userError;

      notificationsToSend = inactiveUsers.map(user => ({
        userId: user.id,
        title: "Sentimos sua falta! 🩺",
        body: "Que tal praticar uma estação hoje? A constância é o segredo da aprovação!",
        url: "/dashboard"
      }));
    } else if (type === 'daily_motivation') {
      // 2. Daily morning motivation for all active subscribers
      const { data: subs, error: subError } = await supabase
        .from('push_subscriptions')
        .select('user_id')
        .distinct();

      if (subError) throw subError;

      notificationsToSend = subs.map(sub => ({
        userId: sub.user_id,
        title: "Bom dia, Doutor(a)! ☀️",
        body: "Sua meta de hoje te espera. Vamos iniciar uma nova estação?",
        url: "/dashboard"
      }));
    }

    // Process sending
    const results = [];
    for (const notification of notificationsToSend) {
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", notification.userId);

      if (!subscriptions) continue;

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({ 
              title: notification.title, 
              body: notification.body, 
              url: notification.url 
            })
          );
          results.push({ userId: notification.userId, success: true });
        } catch (err) {
          console.error(`Error sending to ${sub.endpoint}:`, err);
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }
      
      // Log notification in the database
      await supabase.from('notifications').insert({
        user_id: notification.userId,
        type: 'automated_push',
        payload: { title: notification.title, body: notification.body, type: type }
      });
    }

    return new Response(JSON.stringify({ processed: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in automated-notifications:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});