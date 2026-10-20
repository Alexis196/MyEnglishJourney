import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { VocabularyRow } from "../../repositories/vocabulary.repository";

const db = vi.hoisted(() => ({
  rows: [] as unknown[],
  level: "B1" as string | null,
  raceOnCreate: false,
}));
const ai = vi.hoisted(() => ({ generate: vi.fn() }));

vi.mock("../ai/index", () => ({
  aiRouter: ai,
  buildEnrichWordSystemPrompt: vi.fn((level: string) => `ENRICH_${level}`),
  buildDetectWordsSystemPrompt: vi.fn((level: string) => `DETECT_${level}`),
}));
vi.mock("../../repositories/profile.repository", () => ({
  profileRepository: { getById: vi.fn(async () => ({ current_level: db.level })) },
}));

const NOW = Date.now();
function row(overrides: Partial<VocabularyRow> & { id: string; term: string }): VocabularyRow {
  return {
    user_id: "u1",
    translation: "traducción",
    example_sentence: null,
    category: null,
    learning_status: "pending",
    source: "manual",
    created_at: new Date(NOW - 86_400_000).toISOString(),
    vocabulary_reviews: {
      ease_factor: 2.5,
      interval_days: 1,
      repetitions: 0,
      next_review_at: new Date(NOW - 3600_000).toISOString(),
      last_grade: null,
    },
    ...overrides,
  };
}
const rows = () => db.rows as VocabularyRow[];

vi.mock("../../repositories/vocabulary.repository", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../repositories/vocabulary.repository")>();
  return {
    ...original,
    vocabularyRepository: {
      list: vi.fn(async () => rows().map((r) => structuredClone(r))),
      getById: vi.fn(async (_s: unknown, _u: string, id: string) => {
        const found = rows().find((r) => r.id === id);
        if (!found) throw new Error("not found");
        return structuredClone(found);
      }),
      findByTerm: vi.fn(async (_s: unknown, _u: string, term: string) => {
        const found = rows().find((r) => r.term.toLowerCase() === term.toLowerCase());
        return found ? structuredClone(found) : null;
      }),
      create: vi.fn(async (_s: unknown, input: { term: string; translation: string; source: VocabularyRow["source"] }) => {
        if (db.raceOnCreate) return null;
        const created = row({ id: `id-${rows().length + 1}`, term: input.term, translation: input.translation, source: input.source });
        db.rows.push(created);
        return structuredClone(created);
      }),
      saveReview: vi.fn(
        async (_s: unknown, _u: string, id: string, review: { easeFactor: number; intervalDays: number; repetitions: number; nextReviewAt: Date; quality: number; learningStatus: VocabularyRow["learning_status"] }) => {
          const target = rows().find((r) => r.id === id)!;
          target.learning_status = review.learningStatus;
          target.vocabulary_reviews = {
            ease_factor: review.easeFactor,
            interval_days: review.intervalDays,
            repetitions: review.repetitions,
            next_review_at: review.nextReviewAt.toISOString(),
            last_grade: review.quality,
          };
        },
      ),
    },
  };
});

import { vocabularyService } from "./vocabulary.service";

const supabase = {} as SupabaseClient;
const USER = "u1";

beforeEach(() => {
  db.rows = [];
  db.level = "B1";
  db.raceOnCreate = false;
  ai.generate.mockReset();
});

describe("vocabulary: saving", () => {
  it("saves a new word with where it came from", async () => {
    const result = await vocabularyService.create(supabase, USER, { term: "cope with", translation: "lidiar con", source: "live" });
    expect(result.created).toBe(true);
    expect(result.item).toMatchObject({ term: "cope with", translation: "lidiar con", source: "live", learningStatus: "pending" });
    expect(result.item.review.due).toBe(true);
  });

  it("does not duplicate a word, whatever its capitalisation: it returns the one already saved", async () => {
    await vocabularyService.create(supabase, USER, { term: "Shift", translation: "turno", source: "manual" });
    const again = await vocabularyService.create(supabase, USER, { term: "shift", translation: "cambio", source: "lesson" });
    expect(again.created).toBe(false);
    expect(again.item.translation).toBe("turno");
    expect(rows()).toHaveLength(1);
  });

  it("copes with a double tap that races the unique index", async () => {
    db.rows.push(row({ id: "winner", term: "demanding" }));
    // First lookup misses (the other request has not committed yet), the insert loses, the second lookup finds it.
    const { vocabularyRepository } = await import("../../repositories/vocabulary.repository");
    vi.mocked(vocabularyRepository.findByTerm).mockResolvedValueOnce(null);
    db.raceOnCreate = true;
    const result = await vocabularyService.create(supabase, USER, { term: "demanding", translation: "exigente", source: "live" });
    expect(result).toMatchObject({ created: false, item: { id: "winner" } });
  });
});

describe("vocabulary: list and stats", () => {
  it("counts words by status and by what is due today", async () => {
    const future = new Date(NOW + 5 * 86_400_000).toISOString();
    db.rows.push(
      row({ id: "a", term: "a" }),
      row({ id: "b", term: "b", learning_status: "learned", vocabulary_reviews: { ease_factor: 2.5, interval_days: 30, repetitions: 5, next_review_at: future, last_grade: 5 } }),
      row({ id: "c", term: "c", learning_status: "difficult" }),
    );
    const { stats } = await vocabularyService.list(supabase, USER);
    expect(stats).toEqual({ total: 3, pending: 1, learned: 1, difficult: 1, due: 2 });
  });

  it("treats a word without review state as due, so it can still be studied", async () => {
    db.rows.push(row({ id: "x", term: "x", vocabulary_reviews: null }));
    const { items } = await vocabularyService.list(supabase, USER);
    expect(items[0]!.review.due).toBe(true);
  });
});

describe("vocabulary: studying", () => {
  it("offers only the words that are due, oldest first, and says how many are waiting", async () => {
    const hours = (n: number) => new Date(NOW - n * 3600_000).toISOString();
    const base = { ease_factor: 2.5, interval_days: 1, repetitions: 0, last_grade: null };
    db.rows.push(
      row({ id: "new", term: "new", vocabulary_reviews: { ...base, next_review_at: hours(1) } }),
      row({ id: "old", term: "old", vocabulary_reviews: { ...base, next_review_at: hours(30) } }),
      row({ id: "later", term: "later", vocabulary_reviews: { ...base, next_review_at: new Date(NOW + 86_400_000).toISOString() } }),
    );
    const queue = await vocabularyService.reviewQueue(supabase, USER);
    expect(queue.items.map((item) => item.id)).toEqual(["old", "new"]);
    expect(queue.dueTotal).toBe(2);
  });

  it("schedules the next review according to the answer", async () => {
    db.rows.push(row({ id: "w", term: "word" }));
    const good = await vocabularyService.grade(supabase, USER, "w", { grade: "good" });
    expect(good.review).toMatchObject({ repetitions: 1, intervalDays: 1, due: false });

    const forgotten = await vocabularyService.grade(supabase, USER, "w", { grade: "again" });
    expect(forgotten).toMatchObject({ learningStatus: "difficult", review: { repetitions: 0 } });
  });
});

describe("vocabulary: AI help", () => {
  it("completes a typed word using the student's level", async () => {
    ai.generate.mockResolvedValueOnce({ data: { term: "take advantage of", translation: "aprovechar", exampleSentence: "Take advantage of the sun.", category: "Verbo compuesto" } });
    const result = await vocabularyService.enrich(supabase, USER, { term: "aprovechar" });
    expect(result.term).toBe("take advantage of");
    expect(ai.generate).toHaveBeenCalledWith(supabase, expect.objectContaining({ systemPrompt: "ENRICH_B1", userPrompt: "aprovechar", activityType: "vocabulary" }));
  });

  it("falls back to A1 when the student has no level yet", async () => {
    db.level = null;
    ai.generate.mockResolvedValueOnce({ data: { term: "cat", translation: "gato", exampleSentence: "A cat.", category: "Sustantivo" } });
    await vocabularyService.enrich(supabase, USER, { term: "cat" });
    expect(ai.generate).toHaveBeenCalledWith(supabase, expect.objectContaining({ systemPrompt: "ENRICH_A1" }));
  });

  it("offers new words from a text, leaving out the ones already saved and any duplicates", async () => {
    db.rows.push(row({ id: "s", term: "Shift" }));
    const word = (term: string, translation = "x") => ({ term, translation, exampleSentence: "e", category: "Verbo" });
    ai.generate.mockResolvedValueOnce({
      data: { words: [word("cope with"), word("shift"), word("Cope With"), word("demanding"), word("", "vacío"), word("blank", "  ")] },
    });

    const result = await vocabularyService.detect(supabase, USER, { text: "It must be demanding to cope with shift work." });

    expect(result.words.map((w) => w.term)).toEqual(["cope with", "demanding"]);
    expect(result.alreadySaved).toBe(1);
    expect(ai.generate).toHaveBeenCalledWith(supabase, expect.objectContaining({ systemPrompt: "DETECT_B1" }));
  });

  it("never offers more than 12 words at once", async () => {
    ai.generate.mockResolvedValueOnce({
      data: { words: Array.from({ length: 30 }, (_, i) => ({ term: `word${i}`, translation: "t", exampleSentence: "e", category: "Verbo" })) },
    });
    const result = await vocabularyService.detect(supabase, USER, { text: "a long enough text to analyse for words" });
    expect(result.words).toHaveLength(12);
  });
});
