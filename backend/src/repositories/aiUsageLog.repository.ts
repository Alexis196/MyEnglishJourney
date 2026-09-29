import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiUsageLogRow } from "@myenglishjourney/shared";

export interface InsertAiUsageLogInput {
  userId: string;
  provider: "gemini" | "openai";
  model: string;
  activityType: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  status: "success" | "error" | "fallback";
  errorCode?: string | null;
}

export const aiUsageLogRepository = {
  async insert(supabase: SupabaseClient, input: InsertAiUsageLogInput): Promise<void> {
    const { error } = await supabase.from("ai_usage_logs").insert({
      user_id: input.userId,
      provider: input.provider,
      model: input.model,
      activity_type: input.activityType,
      prompt_tokens: input.promptTokens,
      completion_tokens: input.completionTokens,
      total_tokens: input.totalTokens,
      cost_usd: input.costUsd,
      latency_ms: input.latencyMs,
      status: input.status,
      error_code: input.errorCode ?? null,
    });
    if (error) throw error;
  },

  async getMonthToDateSpendUsd(supabase: SupabaseClient, userId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("ai_usage_logs")
      .select("cost_usd")
      .eq("user_id", userId)
      .gte("created_at", startOfMonth.toISOString());

    if (error) throw error;
    return (data as Pick<AiUsageLogRow, "cost_usd">[]).reduce((sum, row) => sum + Number(row.cost_usd), 0);
  },
};
