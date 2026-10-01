import type { SupabaseClient } from "@supabase/supabase-js";
import type { ErrorJournalRow } from "@myenglishjourney/shared";

export interface RecordErrorInput {
  userId: string;
  sourceType: ErrorJournalRow["source_type"];
  sourceId: string;
  category: ErrorJournalRow["error_category"];
  originalText: string;
  correctedText: string;
  explanation: string;
}

export const errorJournalRepository = {
  /**
   * One row per distinct mistake: repeating the same mistake bumps `frequency_count` instead of adding a
   * duplicate row. (Full attempt data stays in exercise_attempts; this table feeds the dashboard's "recent errors".)
   */
  async record(supabase: SupabaseClient, input: RecordErrorInput): Promise<void> {
    const { data: existing, error: selectError } = await supabase
      .from("error_journal")
      .select("id, frequency_count")
      .eq("user_id", input.userId)
      .eq("resolved", false)
      .eq("original_text", input.originalText)
      .eq("corrected_text", input.correctedText)
      .limit(1)
      .maybeSingle();
    if (selectError) throw selectError;

    if (existing) {
      const { error } = await supabase
        .from("error_journal")
        .update({ frequency_count: (existing.frequency_count as number) + 1 })
        .eq("id", existing.id);
      if (error) throw error;
      return;
    }

    const { error } = await supabase.from("error_journal").insert({
      user_id: input.userId,
      source_type: input.sourceType,
      source_id: input.sourceId,
      error_category: input.category,
      original_text: input.originalText,
      corrected_text: input.correctedText,
      explanation: input.explanation,
    });
    if (error) throw error;
  },
};
