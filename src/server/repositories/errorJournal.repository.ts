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
  /** The student's most frequent unresolved mistakes, to bring them up naturally in practice.
   * Only mistakes made in a sentence (grammar/syntax/vocabulary) are useful for conversation. */
  async listOpen(supabase: SupabaseClient, userId: string, limit = 5): Promise<Array<{ original_text: string; corrected_text: string }>> {
    const { data, error } = await supabase
      .from("error_journal")
      .select("original_text, corrected_text")
      .eq("user_id", userId)
      .eq("resolved", false)
      .order("frequency_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as Array<{ original_text: string; corrected_text: string }>;
  },

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
