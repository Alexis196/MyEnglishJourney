import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpeakingSessionRow } from "@myenglishjourney/shared";
import { NotFoundError } from "../utils/AppError";

export const speakingSessionRepository = {
  async create(
    supabase: SupabaseClient,
    input: { userId: string; audioStoragePath: string; durationSeconds: number },
  ): Promise<SpeakingSessionRow> {
    const { data, error } = await supabase
      .from("speaking_sessions")
      .insert({
        user_id: input.userId,
        audio_storage_path: input.audioStoragePath,
        duration_seconds: input.durationSeconds,
        status: "transcribing",
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as SpeakingSessionRow;
  },

  async updateResult(
    supabase: SupabaseClient,
    id: string,
    fields: { transcript?: string | null; aiFeedback?: Record<string, unknown> | null; status: SpeakingSessionRow["status"] },
  ): Promise<SpeakingSessionRow> {
    const { data, error } = await supabase
      .from("speaking_sessions")
      .update({ transcript: fields.transcript ?? null, ai_feedback: fields.aiFeedback ?? null, status: fields.status })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    if (!data) throw new NotFoundError("Sesión de speaking no encontrada");
    return data as SpeakingSessionRow;
  },
};
