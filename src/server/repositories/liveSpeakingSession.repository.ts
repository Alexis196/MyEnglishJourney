import type { SupabaseClient } from "@supabase/supabase-js";
import type { LiveSpeakingFeedback, LiveTurn } from "@myenglishjourney/shared";
import { NotFoundError } from "../utils/AppError";

export interface LiveSpeakingSessionRow {
  id: string;
  user_id: string;
  mode: "free" | "scenario";
  scenario: string | null;
  level: string | null;
  model: string;
  status: "active" | "completed" | "abandoned" | "failed";
  max_seconds: number;
  duration_seconds: number | null;
  transcript: LiveTurn[] | null;
  ai_feedback: LiveSpeakingFeedback | null;
  estimated_cost_usd: number;
  started_at: string;
  ended_at: string | null;
}

export const liveSpeakingSessionRepository = {
  async create(
    supabase: SupabaseClient,
    input: { userId: string; mode: "free" | "scenario"; scenario: string | null; level: string | null; model: string; maxSeconds: number },
  ): Promise<LiveSpeakingSessionRow> {
    const { data, error } = await supabase
      .from("live_speaking_sessions")
      .insert({
        user_id: input.userId,
        mode: input.mode,
        scenario: input.scenario,
        level: input.level,
        model: input.model,
        max_seconds: input.maxSeconds,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as LiveSpeakingSessionRow;
  },

  async getById(supabase: SupabaseClient, id: string): Promise<LiveSpeakingSessionRow> {
    const { data, error } = await supabase.from("live_speaking_sessions").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError("Sesión de conversación no encontrada");
    return data as LiveSpeakingSessionRow;
  },

  async countStartedSince(supabase: SupabaseClient, userId: string, since: Date): Promise<number> {
    const { count, error } = await supabase
      .from("live_speaking_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("started_at", since.toISOString());
    if (error) throw error;
    return count ?? 0;
  },

  /** Sessions still "active" long after they could have ended: the student left without finishing. */
  async listStaleActive(supabase: SupabaseClient, userId: string, olderThan: Date): Promise<LiveSpeakingSessionRow[]> {
    const { data, error } = await supabase
      .from("live_speaking_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .lt("started_at", olderThan.toISOString());
    if (error) throw error;
    return (data ?? []) as LiveSpeakingSessionRow[];
  },

  /** Closes a session only while it is still active, so ending twice (or racing a cleanup) is harmless. */
  async finish(
    supabase: SupabaseClient,
    id: string,
    fields: {
      status: "completed" | "abandoned" | "failed";
      durationSeconds: number;
      transcript: LiveTurn[] | null;
      aiFeedback: LiveSpeakingFeedback | null;
      estimatedCostUsd: number;
    },
  ): Promise<LiveSpeakingSessionRow | null> {
    const { data, error } = await supabase
      .from("live_speaking_sessions")
      .update({
        status: fields.status,
        duration_seconds: fields.durationSeconds,
        transcript: fields.transcript,
        ai_feedback: fields.aiFeedback,
        estimated_cost_usd: fields.estimatedCostUsd,
        ended_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "active")
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return (data as LiveSpeakingSessionRow | null) ?? null;
  },
};
