import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserAiSettingsRow } from "@myenglishjourney/shared";

const DEFAULT_SETTINGS: Omit<UserAiSettingsRow, "user_id" | "updated_at"> = {
  provider_mode: "auto",
  monthly_budget_usd: 3.0,
  hard_block_at_budget: true,
  notify_at_percent: 80,
};

export const userAiSettingsRepository = {
  async getForUser(supabase: SupabaseClient, userId: string): Promise<UserAiSettingsRow> {
    const { data, error } = await supabase.from("user_ai_settings").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (data) return data as UserAiSettingsRow;

    // Row is created lazily on first access rather than requiring a signup-time insert.
    const { data: inserted, error: insertError } = await supabase
      .from("user_ai_settings")
      .insert({ user_id: userId, ...DEFAULT_SETTINGS })
      .select("*")
      .single();
    if (insertError) throw insertError;
    return inserted as UserAiSettingsRow;
  },
};
