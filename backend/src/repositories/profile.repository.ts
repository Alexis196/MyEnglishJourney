import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileRow } from "@myenglishjourney/shared";
import { NotFoundError } from "../utils/AppError.js";

export interface UpdateProfileFields {
  full_name?: string;
  current_level?: string;
  explanation_language?: "es" | "en";
  theme_preference?: "light" | "dark" | "system";
  timezone?: string;
}

export const profileRepository = {
  async getById(supabase: SupabaseClient, userId: string): Promise<ProfileRow> {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError("Perfil no encontrado");
    return data as ProfileRow;
  },

  async update(supabase: SupabaseClient, userId: string, fields: UpdateProfileFields): Promise<ProfileRow> {
    const { data, error } = await supabase
      .from("profiles")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return data as ProfileRow;
  },
};
