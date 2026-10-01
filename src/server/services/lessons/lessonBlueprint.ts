import type { CefrLevel, ExerciseDifficulty, ExerciseType, LessonStage, PlanDayType } from "@myenglishjourney/shared";
import { getCefrRules } from "./cefrRules";
import {
  AVG_PRACTICE_SECONDS,
  EXPLANATION_SECONDS,
  PATTERN_SECONDS,
  productionSeconds,
  TIER_CONFIG,
  tierForMinutes,
  VOCAB_ITEM_SECONDS,
  type SessionTier,
} from "./lessonDuration";

/**
 * The lesson blueprint: the pedagogical skeleton computed in code from level, session length and day type.
 * Progression is always  recognise -> understand/practise -> build -> produce -> show it with less help.
 * The blueprint fixes the stages, counts, allowed exercise types and difficulty windows; the model is free to
 * choose the situations, examples and concrete activities inside those limits (so days do not feel identical).
 */
export type SectionKey = "review" | "vocabulary" | "grammar" | "construction" | "construction_2" | "production" | "assessment";
type DbSectionType = "review" | "vocabulary" | "grammar" | "interactive" | "final_assessment";

export interface SectionPlan {
  key: SectionKey;
  sectionType: DbSectionType;
  stage: LessonStage;
  /** Expected number of exercises (production: the number of writing tasks). */
  count: number;
  allowedTypes: ExerciseType[];
  /** Difficulty labels this section may use, easiest first. */
  difficulties: ExerciseDifficulty[];
  /** Max pure multiple-choice items (recognition) in this section. */
  maxMultipleChoice: number;
  /** Min word_ordering / grammar_error_correction items (building sentences). */
  minConstructive: number;
  requiresPattern: boolean;
  /** The section carries a short explanation. */
  explanation: boolean;
  production?: { short: number; main: number };
  /** One-line goal for the prompt. */
  goal: string;
}

export interface LessonSpec {
  tier: SessionTier;
  minutes: number;
  level: CefrLevel;
  dayType: PlanDayType;
  blueprint: SectionPlan[];
  /** Exactly the blueprint length. */
  sections: { min: number; max: number };
  exercises: { min: number; max: number };
  vocabulary: { min: number; max: number };
  /** Free-writing tasks in the whole lesson (each costs one AI evaluation). */
  freeWriting: { min: number; max: number };
  production: { short: number; main: number };
  /** Target "minWords" of the writing tasks: lower in short sessions, higher in long ones, always inside the CEFR range. */
  productionWords: { short: number; main: number };
  /** Exercises in the review section (0 when there is none). */
  reviewExercises: number;
  requiredSections: string[];
  allowedSections: string[];
}

const RECOGNITION: ExerciseType[] = ["multiple_choice", "fill_in_blank", "translation_es_en", "translation_en_es"];
const ALLOWED_SECTIONS = ["review", "vocabulary", "grammar", "interactive", "final_assessment"];
const BUILDING: ExerciseType[] = ["word_ordering", "grammar_error_correction"];

/** Largest-remainder split of `total` by `weights`, giving every share at least `minEach`. */
function allocate(weights: number[], total: number, minEach: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / sum) * total);
  const base = raw.map((r) => Math.max(minEach, Math.floor(r)));
  let remaining = total - base.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; remaining > 0; k = (k + 1) % order.length) {
    base[order[k]!.i]! += 1;
    remaining -= 1;
  }
  // If the minimums overshot the total, take the surplus from the largest shares.
  while (remaining < 0) {
    const biggest = base.indexOf(Math.max(...base));
    if (base[biggest]! <= minEach) break;
    base[biggest]! -= 1;
    remaining += 1;
  }
  return base;
}

function plan(partial: Omit<SectionPlan, "maxMultipleChoice" | "minConstructive" | "requiresPattern" | "explanation"> & Partial<SectionPlan>): SectionPlan {
  return { maxMultipleChoice: partial.count, minConstructive: 0, requiresPattern: false, explanation: false, ...partial };
}

export function buildLessonSpec(params: { minutes: number; level: CefrLevel; dayType: PlanDayType }): LessonSpec {
  const { minutes, level, dayType } = params;
  const rules = getCefrRules(level);
  const tier = tierForMinutes(minutes);
  const cfg = TIER_CONFIG[tier];
  const isReviewDay = dayType === "review";
  const isAssessmentDay = dayType === "assessment";
  const isRegular = !isReviewDay && !isAssessmentDay;

  // --- production tasks: always present, capped by the level (every one is an AI evaluation) ---
  let main = cfg.production.main;
  let short = cfg.production.short;
  if (!isRegular) short = Math.min(short, 1);
  while (main + short > rules.maxFreeWriting && short > 0) short -= 1;
  while (main + short > rules.maxFreeWriting && main > 1) main -= 1;

  // --- vocabulary: only on regular days, bounded by the level ---
  const vocabMax = isRegular ? Math.min(cfg.vocabulary.max, rules.maxNewWords) : 0;
  const vocabulary = { min: isRegular ? Math.min(cfg.vocabulary.min, vocabMax) : 0, max: vocabMax };
  const vocabMid = Math.round((vocabulary.min + vocabulary.max) / 2);

  // --- which sections, in pedagogical order ---
  const keys: SectionKey[] = isRegular
    ? ["review", "vocabulary", "grammar", "construction", ...(tier === 90 ? (["construction_2"] as SectionKey[]) : []), "production", "assessment"]
    : ["review", "construction", "production", "assessment"];
  const patternApplies = keys.includes("grammar") && rules.requiresPattern;
  const explanationSections = keys.filter((k) => k === "review" || k === "vocabulary" || k === "grammar").length;

  // --- how demanding the writing is: a short session asks for the low end of the level's range, a long one more ---
  const reach = { 30: 0, 45: 0.25, 60: 0.5, 90: 0.8 }[tier];
  const lerp = (range: { min: number; max: number }) => Math.round(range.min + (range.max - range.min) * reach);
  const productionWords = { short: lerp(rules.production.short), main: lerp(rules.production.main) };

  // Writing can eat a short session at the upper levels (a 140-word text takes ~20 minutes): drop the short
  // answers first so the main task still has room for practice around it.
  const writingShare = () => (main * productionSeconds(productionWords.main) + short * productionSeconds(productionWords.short)) / (minutes * 60);
  while (short > 0 && writingShare() > 0.55) short -= 1;
  const productionTasks = main + short;

  // --- time budget -> number of non-production exercises ---
  const mainMid = productionWords.main;
  const shortMid = productionWords.short;
  const targetSeconds = minutes * 60;
  const fixedSeconds =
    explanationSections * EXPLANATION_SECONDS + (patternApplies ? PATTERN_SECONDS : 0) + vocabMid * VOCAB_ITEM_SECONDS;
  const productionTime = main * productionSeconds(mainMid) + short * productionSeconds(shortMid);
  const practiceCount = Math.max(isRegular ? 10 : 8, Math.round((targetSeconds - fixedSeconds - productionTime) / AVG_PRACTICE_SECONDS));

  // --- split the practice between sections ---
  const practiceKeys = keys.filter((k) => k !== "production");
  const weights: Record<SectionKey, number> = isRegular
    ? tier === 90
      ? { review: 0, vocabulary: 0.18, grammar: 0.22, construction: 0.22, construction_2: 0.2, production: 0, assessment: 0.18 }
      : { review: 0, vocabulary: 0.22, grammar: 0.26, construction: 0.32, construction_2: 0, production: 0, assessment: 0.2 }
    : isReviewDay
      ? { review: 0.34, vocabulary: 0, grammar: 0, construction: 0.36, construction_2: 0, production: 0, assessment: 0.3 }
      : { review: 0.2, vocabulary: 0, grammar: 0, construction: 0.25, construction_2: 0, production: 0, assessment: 0.55 };

  const counts = new Map<SectionKey, number>();
  if (isRegular) {
    const review = Math.max(2, Math.min(cfg.review, Math.floor(practiceCount * 0.3)));
    counts.set("review", review);
    const others = practiceKeys.filter((k) => k !== "review");
    const split = allocate(others.map((k) => weights[k]), Math.max(others.length * 2, practiceCount - review), 2);
    others.forEach((k, i) => counts.set(k, split[i]!));
  } else {
    const split = allocate(practiceKeys.map((k) => weights[k]), practiceCount, 2);
    practiceKeys.forEach((k, i) => counts.set(k, split[i]!));
  }

  const plans: Record<SectionKey, () => SectionPlan> = {
    review: () => {
      const n = counts.get("review")!;
      return plan({
        key: "review",
        sectionType: "review",
        stage: "recognition",
        count: n,
        allowedTypes: [...RECOGNITION, "word_ordering"],
        difficulties: ["easy", "medium"],
        maxMultipleChoice: Math.ceil(n * 0.6),
        explanation: true,
        goal: "Warm-up that brings back earlier material (use the REVIEW MATERIAL) with easy recognition and light practice.",
      });
    },
    vocabulary: () => {
      const n = counts.get("vocabulary")!;
      return plan({
        key: "vocabulary",
        sectionType: "vocabulary",
        stage: "recognition",
        count: n,
        allowedTypes: RECOGNITION,
        difficulties: ["easy", "medium"],
        maxMultipleChoice: Math.ceil(n * 0.6),
        explanation: true,
        goal: "Introduce the new words and let the student recognise and recall them.",
      });
    },
    grammar: () => {
      const n = counts.get("grammar")!;
      return plan({
        key: "grammar",
        sectionType: "grammar",
        stage: "guided",
        count: n,
        allowedTypes: [...RECOGNITION, "word_ordering", ...(level === "A1" ? [] : (["grammar_error_correction"] as ExerciseType[]))],
        difficulties: ["easy", "medium"],
        maxMultipleChoice: Math.ceil(n * 0.5),
        requiresPattern: rules.requiresPattern,
        explanation: true,
        goal: "Explain the structure briefly (with a visual pattern) and practise it with support.",
      });
    },
    construction: () => {
      const n = counts.get("construction")!;
      return plan({
        key: "construction",
        sectionType: "interactive",
        stage: "construction",
        count: n,
        allowedTypes: [...BUILDING, "fill_in_blank", "translation_es_en", "translation_en_es"],
        difficulties: ["medium", "hard"],
        maxMultipleChoice: 0,
        minConstructive: Math.max(1, Math.floor(n / 2)),
        goal: "The student builds sentences themselves: order words, correct a sentence, complete without options, translate with context.",
      });
    },
    construction_2: () => {
      const n = counts.get("construction_2")!;
      return plan({
        key: "construction_2",
        sectionType: "interactive",
        stage: "construction",
        count: n,
        allowedTypes: [...BUILDING, "fill_in_blank", "translation_es_en", "translation_en_es"],
        difficulties: ["medium", "hard"],
        maxMultipleChoice: 0,
        minConstructive: Math.max(1, Math.floor(n / 2)),
        goal: "A second round of building, in a different situation and a little harder than the first.",
      });
    },
    production: () =>
      plan({
        key: "production",
        sectionType: "interactive",
        stage: "production",
        count: productionTasks,
        allowedTypes: ["free_writing"],
        difficulties: ["medium", "hard"],
        maxMultipleChoice: 0,
        explanation: true,
        production: { short, main },
        goal: `The student writes in English by themselves: ${short} short answer(s) leading to ${main} main task(s) (${rules.mainTaskShape}).`,
      }),
    assessment: () => {
      const n = counts.get("assessment")!;
      return plan({
        key: "assessment",
        sectionType: "final_assessment",
        stage: "assessment",
        count: n,
        allowedTypes: [...BUILDING, "fill_in_blank", "translation_es_en", "translation_en_es", "multiple_choice"],
        difficulties: ["medium", "hard"],
        maxMultipleChoice: Math.floor(n / 3),
        minConstructive: 1,
        goal: "Checks whether the student can use what they learned with less help: NEW sentences and situations, no copies of earlier exercises, little or no multiple choice.",
      });
    },
  };
  const blueprint = keys.map((key) => plans[key]());

  const total = blueprint.reduce((sum, section) => sum + section.count, 0);
  return {
    tier,
    minutes,
    level,
    dayType,
    blueprint,
    sections: { min: blueprint.length, max: blueprint.length },
    exercises: { min: Math.floor(total * 0.85), max: Math.ceil(total * 1.15) },
    vocabulary,
    freeWriting: { min: productionTasks, max: productionTasks },
    production: { short, main },
    productionWords,
    reviewExercises: counts.get("review") ?? 0,
    requiredSections: Array.from(new Set(blueprint.map((section) => section.sectionType))),
    allowedSections: ALLOWED_SECTIONS,
  };
}
