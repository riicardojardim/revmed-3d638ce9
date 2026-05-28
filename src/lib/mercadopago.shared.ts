import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function syncUserProfile(userId: string, data: any) {
  if (!data) return;
  
  const fullName = `${data.first_name || ""} ${data.last_name || ""}`.trim();
  
  await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      full_name: fullName || undefined,
      title: data.title,
      first_name: data.first_name,
      last_name: data.last_name,
      username: data.username,
      whatsapp: data.whatsapp,
      cpf: data.cpf,
      birth_date: data.birth_date,
      selected_plan: data.selected_plan,
    },
    { onConflict: "id" }
  );
}
