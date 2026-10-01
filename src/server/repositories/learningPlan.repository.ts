import type { SupabaseClient } from "@supabase/supabase-js";
import type { LearningPlanRow } from "@myenglishjourney/shared";

export interface CreateLearningPlanInput {
  userId: string;
  title: string;
  totalDays: number;
  targetLevelStart: string;
  targetLevelEnd: string;
  generatedBy: "ai" | "manual" | "template";
  personalization?: Record<string, unknown>;
}

export const learningPlanRepository = {
  async getActiveForUser(supabase: SupabaseClient, userId: string): Promise<LearningPlanRow | null> {
    const { data, error } = await supabase
      .from("learning_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as LearningPlanRow | null) ?? null;
  },

  async getById(supabase: SupabaseClient, planId: string): Promise<LearningPlanRow | null> {
    const { data, error } = await supabase.from("learning_plans").select("*").eq("id", planId).maybeSingle();
    if (error) throw error;
    return (data as LearningPlanRow | null) ?? null;
  },

  /** The user's plans, newest first (RLS already limits rows to the caller). */
  async listForUser(supabase: SupabaseClient, userId: string, includeArchived = false): Promise<LearningPlanRow[]> {
    let query = supabase.from("learning_plans").select("*").eq("user_id", userId);
    if (!includeArchived) query = query.neq("status", "archived");
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as LearningPlanRow[];
  },

  async countOpenForUser(supabase: SupabaseClient, userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("learning_plans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "active");
    if (error) throw error;
    return count ?? 0;
  },

  async setStatus(supabase: SupabaseClient, planId: string, status: LearningPlanRow["status"]): Promise<void> {
    const { error } = await supabase.from("learning_plans").update({ status }).eq("id", planId);
    if (error) throw error;
  },

  /**
   * The plan the user is working on: the one selected in profiles.current_plan_id when it
   * still exists and is not archived, otherwise the newest active plan.
   */
  async getCurrentForUser(
    supabase: SupabaseClient,
    userId: string,
    selectedPlanId: string | null,
  ): Promise<LearningPlanRow | null> {
    if (selectedPlanId) {
      const selected = await this.getById(supabase, selectedPlanId);
      if (selected && selected.user_id === userId && selected.status !== "archived") return selected;
    }
    return this.getActiveForUser(supabase, userId);
  },

  async create(supabase: SupabaseClient, input: CreateLearningPlanInput): Promise<LearningPlanRow> {
    const { data, error } = await supabase
      .from("learning_plans")
      .insert({
        user_id: input.userId,
        title: input.title,
        total_days: input.totalDays,
        target_level_start: input.targetLevelStart,
        target_level_end: input.targetLevelEnd,
        generated_by: input.generatedBy,
        personalization: input.personalization ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as LearningPlanRow;
  },
};
