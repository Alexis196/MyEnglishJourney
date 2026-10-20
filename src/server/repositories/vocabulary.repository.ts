import type { SupabaseClient } from "@supabase/supabase-js";
import type { LearningStatus, VocabularySource } from "@myenglishjourney/shared";
import { NotFoundError } from "../utils/AppError";

export interface VocabularyReviewRow {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string;
  last_grade: number | null;
}

export interface VocabularyRow {
  id: string;
  user_id: string;
  term: string;
  translation: string;
  example_sentence: string | null;
  category: string | null;
  learning_status: LearningStatus;
  source: VocabularySource;
  created_at: string;
  /** One-to-one embed: PostgREST returns an object (or an array of one, depending on the relationship hint). */
  vocabulary_reviews: VocabularyReviewRow | VocabularyReviewRow[] | null;
}

const SELECT = "*, vocabulary_reviews(ease_factor, interval_days, repetitions, next_review_at, last_grade)";

export function reviewOf(row: VocabularyRow): VocabularyReviewRow | null {
  const review = row.vocabulary_reviews;
  return Array.isArray(review) ? (review[0] ?? null) : review;
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

export const vocabularyRepository = {
  async list(supabase: SupabaseClient, userId: string): Promise<VocabularyRow[]> {
    const { data, error } = await supabase
      .from("vocabulary")
      .select(SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as VocabularyRow[];
  },

  async getById(supabase: SupabaseClient, userId: string, id: string): Promise<VocabularyRow> {
    const { data, error } = await supabase.from("vocabulary").select(SELECT).eq("id", id).eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError("Palabra no encontrada");
    return data as unknown as VocabularyRow;
  },

  async findByTerm(supabase: SupabaseClient, userId: string, term: string): Promise<VocabularyRow | null> {
    // `ilike` without wildcards is a case-insensitive equality; escape the characters that are special in a pattern.
    const exact = term.replace(/[\\%_]/g, (char) => `\\${char}`);
    const { data, error } = await supabase.from("vocabulary").select(SELECT).eq("user_id", userId).ilike("term", exact).limit(1).maybeSingle();
    if (error) throw error;
    return (data as unknown as VocabularyRow | null) ?? null;
  },

  /** Inserts the word and its review state. Returns null when the student already has that word (unique index). */
  async create(
    supabase: SupabaseClient,
    input: {
      userId: string;
      term: string;
      translation: string;
      exampleSentence?: string | undefined;
      category?: string | undefined;
      source: VocabularySource;
      sourceLessonId?: string | undefined;
    },
  ): Promise<VocabularyRow | null> {
    const { data, error } = await supabase
      .from("vocabulary")
      .insert({
        user_id: input.userId,
        term: input.term,
        translation: input.translation,
        example_sentence: input.exampleSentence || null,
        category: input.category || null,
        source: input.source,
        source_lesson_id: input.sourceLessonId ?? null,
      })
      .select("id")
      .single();
    if (isUniqueViolation(error)) return null;
    if (error) throw error;

    const { error: reviewError } = await supabase.from("vocabulary_reviews").insert({ user_id: input.userId, vocabulary_id: data.id });
    if (reviewError) {
      // Without its review state the word could never be studied: do not leave it half-created.
      await supabase.from("vocabulary").delete().eq("id", data.id);
      throw reviewError;
    }
    return this.getById(supabase, input.userId, data.id as string);
  },

  async update(
    supabase: SupabaseClient,
    userId: string,
    id: string,
    fields: { translation?: string; exampleSentence?: string | null; category?: string | null; learningStatus?: LearningStatus },
  ): Promise<VocabularyRow> {
    const patch: Record<string, unknown> = {};
    if (fields.translation !== undefined) patch.translation = fields.translation;
    if (fields.exampleSentence !== undefined) patch.example_sentence = fields.exampleSentence || null;
    if (fields.category !== undefined) patch.category = fields.category || null;
    if (fields.learningStatus !== undefined) patch.learning_status = fields.learningStatus;
    const { data, error } = await supabase.from("vocabulary").update(patch).eq("id", id).eq("user_id", userId).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError("Palabra no encontrada");
    return this.getById(supabase, userId, id);
  },

  async remove(supabase: SupabaseClient, userId: string, id: string): Promise<void> {
    const { data, error } = await supabase.from("vocabulary").delete().eq("id", id).eq("user_id", userId).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError("Palabra no encontrada");
  },

  async saveReview(
    supabase: SupabaseClient,
    userId: string,
    id: string,
    review: { easeFactor: number; intervalDays: number; repetitions: number; nextReviewAt: Date; quality: number; learningStatus: LearningStatus },
  ): Promise<void> {
    const { error } = await supabase
      .from("vocabulary_reviews")
      .update({
        ease_factor: review.easeFactor,
        interval_days: review.intervalDays,
        repetitions: review.repetitions,
        next_review_at: review.nextReviewAt.toISOString(),
        last_reviewed_at: new Date().toISOString(),
        last_grade: review.quality,
      })
      .eq("vocabulary_id", id)
      .eq("user_id", userId);
    if (error) throw error;

    const { error: statusError } = await supabase.from("vocabulary").update({ learning_status: review.learningStatus }).eq("id", id).eq("user_id", userId);
    if (statusError) throw statusError;
  },
};
