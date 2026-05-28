import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function syncUserProfile(userId: string, data: any) {
  if (!data) return;
  
  const firstName = (data.first_name || "").trim();
  const lastName = (data.last_name || "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  
  // Atualiza metadados do Auth
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { 
      full_name: fullName || undefined,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      title: data.title || undefined,
    }
  });

  // Atualiza Profile
  await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      full_name: fullName || undefined,
      title: data.title,
      first_name: firstName,
      last_name: lastName,
      username: data.username,
      whatsapp: data.whatsapp,
      cpf: data.cpf,
      birth_date: data.birth_date,
      selected_plan: data.selected_plan,
    },
    { onConflict: "id" }
  );
}

