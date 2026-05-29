import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MOTIVATIONAL_MESSAGES = [
  "Sua meta de hoje te espera. Vamos iniciar uma nova estação?",
  "A constância é o que separa o sonho da aprovação. Pronto para hoje?",
  "Cada minuto de estudo é um passo a mais rumo ao CRM. Vamos praticar?",
  "O Revalida está chegando. Que tal revisar uma estação agora?",
  "Foco total hoje! Escolha um tema e vamos para a sala de treinamento.",
  "Dê o seu melhor em cada checklist. A excelência vem da prática!",
  "Sua dedicação hoje é o seu sucesso amanhã. Vamos juntos?",
  "Não pare até se orgulhar. Tem estação nova esperando por você!"
];

const INACTIVITY_MESSAGES = [
  "Sentimos sua falta! Que tal praticar uma estação hoje?",
  "Não deixe o ritmo cair! A constância é o segredo da aprovação.",
  "O tempo voa! Vamos garantir que você esteja afiado para o Revalida?",
  "Um pequeno passo hoje é um grande salto na prova. Vamos treinar?"
];

function getSalutation(profile: any) {
  const title = profile.title || "";
  const firstName = profile.first_name || profile.full_name?.split(' ')[0] || "Doutor(a)";
  
  if (title.includes("Dra")) return `Dra. ${firstName}`;
  if (title.includes("Dr")) return `Dr. ${firstName}`;
  
  // Fallback based on gender if title is missing
  if (profile.gender === 'feminino') return `Dra. ${firstName}`;
  if (profile.gender === 'masculino') return `Dr. ${firstName}`;
  
  return `Doutor(a) ${firstName}`;
}

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
      const { data: inactiveUsers, error: userError } = await supabase.rpc('get_inactive_users_for_push');
      if (userError) throw userError;

      notificationsToSend = inactiveUsers.map((user: any) => {
        const salutation = getSalutation(user);
        const randomMsg = INACTIVITY_MESSAGES[Math.floor(Math.random() * INACTIVITY_MESSAGES.length)];
        return {
          userId: user.id,
          title: `Olá, ${salutation}! 🩺`,
          body: randomMsg,
          url: "/dashboard"
        };
      });
    } else if (type === 'daily_motivation') {
      // Get all users with push subscriptions
      const { data: subs, error: subError } = await supabase
        .from('push_subscriptions')
        .select('user_id')
        .distinct();

      if (subError) throw subError;

      // Fetch profiles for these users to get names/titles
      const userIds = subs.map(s => s.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, gender, title')
        .in('id', userIds);

      if (profileError) throw profileError;

      notificationsToSend = profiles.map((profile: any) => {
        const salutation = getSalutation(profile);
        // Random message so it's different for each user and each day
        const randomMsg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
        return {
          userId: profile.id,
          title: `Bom dia, ${salutation}! ☀️`,
          body: randomMsg,
          url: "/dashboard"
        };
      });
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