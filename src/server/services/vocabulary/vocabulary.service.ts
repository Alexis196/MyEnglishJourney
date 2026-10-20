import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CEFR_LEVELS,
  detectedWordSchema,
  enrichedWordSchema,
  type CefrLevel,
  type CreateVocabularyInput,
  type CreateVocabularyResponse,
  type DetectVocabularyInput,
  type DetectVocabularyResponse,
  type EnrichedWord,
  type EnrichVocabularyInput,
  type ReviewGradeInput,
  type SavedWord,
  type UpdateVocabularyInput,
  type VocabularyListResponse,
  type VocabularyReviewQueue,
} from "@myenglishjourney/shared";
import { z } from "zod";
import { profileRepository } from "../../repositories/profile.repository";
import { reviewOf, vocabularyRepository, type VocabularyRow } from "../../repositories/vocabulary.repository";
import { aiRouter, buildDetectWordsSystemPrompt, buildEnrichWordSystemPrompt } from "../ai/index";
import { scheduleReview } from "@myenglishjourney/shared";

/** Words offered per detection and per study batch: enough to be useful, few enough to finish. */
const MAX_DETECTED = 12;
const REVIEW_BATCH = 20;
const DEFAULT_REVIEW = { ease_factor: 2.5, interval_days: 1, repetitions: 0, last_grade: null as number | null };

function asLevel(value: string | null | undefined): CefrLevel {
  return (CEFR_LEVELS as readonly string[]).includes(value ?? "") ? (value as CefrLevel) : "A1";
}

export function toSavedWord(row: VocabularyRow, now = new Date()): SavedWord {
  const review = reviewOf(row);
  const nextReviewAt = review?.next_review_at ?? row.created_at;
  return {
    id: row.id,
    term: row.term,
    translation: row.translation,
    exampleSentence: row.example_sentence,
    category: row.category,
    learningStatus: row.learning_status,
    source: row.source,
    createdAt: row.created_at,
    review: {
      nextReviewAt,
      intervalDays: review?.interval_days ?? DEFAULT_REVIEW.interval_days,
      repetitions: review?.repetitions ?? DEFAULT_REVIEW.repetitions,
      lastGrade: review?.last_grade ?? DEFAULT_REVIEW.last_grade,
      due: new Date(nextReviewAt).getTime() <= now.getTime(),
    },
  };
}

async function studentLevel(supabase: SupabaseClient, userId: string): Promise<CefrLevel> {
  const profile = await profileRepository.getById(supabase, userId);
  return asLevel(profile.current_level);
}

export const vocabularyService = {
  async list(supabase: SupabaseClient, userId: string): Promise<VocabularyListResponse> {
    const now = new Date();
    const items = (await vocabularyRepository.list(supabase, userId)).map((row) => toSavedWord(row, now));
    return {
      items,
      stats: {
        total: items.length,
        pending: items.filter((item) => item.learningStatus === "pending").length,
        learned: items.filter((item) => item.learningStatus === "learned").length,
        difficult: items.filter((item) => item.learningStatus === "difficult").length,
        due: items.filter((item) => item.review.due).length,
      },
    };
  },

  /** Saves a word once: asking again for a word the student already has returns the existing one. */
  async create(supabase: SupabaseClient, userId: string, input: CreateVocabularyInput): Promise<CreateVocabularyResponse> {
    const existing = await vocabularyRepository.findByTerm(supabase, userId, input.term);
    if (existing) return { item: toSavedWord(existing), created: false };

    const created = await vocabularyRepository.create(supabase, { userId, ...input });
    if (!created) {
      // Lost a race with the unique index (double tap): the word exists now.
      const winner = await vocabularyRepository.findByTerm(supabase, userId, input.term);
      if (winner) return { item: toSavedWord(winner), created: false };
      throw new Error("No se pudo guardar la palabra");
    }
    return { item: toSavedWord(created), created: true };
  },

  async update(supabase: SupabaseClient, userId: string, id: string, input: UpdateVocabularyInput): Promise<SavedWord> {
    return toSavedWord(await vocabularyRepository.update(supabase, userId, id, input));
  },

  async remove(supabase: SupabaseClient, userId: string, id: string): Promise<void> {
    await vocabularyRepository.remove(supabase, userId, id);
  },

  /** Completes a word the student typed (translation, example, category), adapted to their level. */
  async enrich(supabase: SupabaseClient, userId: string, input: EnrichVocabularyInput): Promise<EnrichedWord> {
    const level = await studentLevel(supabase, userId);
    const result = await aiRouter.generate(supabase, {
      activityType: "vocabulary",
      systemPrompt: buildEnrichWordSystemPrompt(level),
      userPrompt: input.term,
      responseSchema: enrichedWordSchema,
      userId,
      temperature: 0.2,
      maxOutputTokens: 400,
    });
    return result.data;
  },

  /** Finds the words in a text that are probably new for the student, leaving out the ones they already saved. */
  async detect(supabase: SupabaseClient, userId: string, input: DetectVocabularyInput): Promise<DetectVocabularyResponse> {
    const level = await studentLevel(supabase, userId);
    const result = await aiRouter.generate(supabase, {
      activityType: "vocabulary",
      systemPrompt: buildDetectWordsSystemPrompt(level),
      userPrompt: input.text,
      responseSchema: z.object({ words: z.array(detectedWordSchema) }),
      userId,
      temperature: 0.2,
      maxOutputTokens: 2000,
    });

    const saved = new Set((await vocabularyRepository.list(supabase, userId)).map((row) => row.term.trim().toLowerCase()));
    const seen = new Set<string>();
    const words = [];
    let alreadySaved = 0;
    for (const word of result.data.words) {
      const key = word.term.trim().toLowerCase();
      if (!key || !word.translation.trim() || seen.has(key)) continue;
      seen.add(key);
      if (saved.has(key)) {
        alreadySaved += 1;
        continue;
      }
      if (words.length < MAX_DETECTED) words.push({ ...word, term: word.term.trim(), translation: word.translation.trim() });
    }
    return { words, alreadySaved };
  },

  /** The words due for study today, oldest first. */
  async reviewQueue(supabase: SupabaseClient, userId: string): Promise<VocabularyReviewQueue> {
    const now = new Date();
    const due = (await vocabularyRepository.list(supabase, userId))
      .map((row) => toSavedWord(row, now))
      .filter((item) => item.review.due)
      .sort((a, b) => a.review.nextReviewAt.localeCompare(b.review.nextReviewAt));
    return { items: due.slice(0, REVIEW_BATCH), dueTotal: due.length };
  },

  /** Records how well the student remembered a word and schedules its next review. */
  async grade(supabase: SupabaseClient, userId: string, id: string, input: ReviewGradeInput): Promise<SavedWord> {
    const row = await vocabularyRepository.getById(supabase, userId, id);
    const current = reviewOf(row);
    const result = scheduleReview(
      {
        easeFactor: Number(current?.ease_factor ?? 2.5),
        intervalDays: current?.interval_days ?? 1,
        repetitions: current?.repetitions ?? 0,
      },
      input.grade,
      row.learning_status,
    );
    await vocabularyRepository.saveReview(supabase, userId, id, result);
    return toSavedWord(await vocabularyRepository.getById(supabase, userId, id));
  },
};
