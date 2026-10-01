import type { ExerciseDifficulty } from "@myenglishjourney/shared";
import type { AIExercise, GeneratedLesson } from "../ai/planGeneration.schema";
import type { CefrRules } from "./cefrRules";
import { allowsTechContext, allowsWorkContext, type LearningContext } from "./learningContext";
import type { LessonSpec, SectionPlan } from "./lessonBlueprint";
import { DURATION_TOLERANCE, estimateLessonMinutes } from "./lessonDuration";
import { normalizeAnswer } from "../exerciseValidators/normalizeAnswer";
import { toDbExercise } from "./exerciseMapper";

export interface ValidationContext {
  spec: LessonSpec;
  rules: CefrRules;
  context: Pick<LearningContext, "interests" | "preferredTopics" | "profession" | "otherInterests" | "learningGoal" | "explanationLanguage">;
}

/**
 * Three severities:
 *  - hard: the lesson is unusable or contains what the student did not choose; never saved.
 *  - essential: the lesson would not teach what the blueprint promises (no production, an assessment that is
 *    mostly recognition, missing pattern, progression ignored...). Gets one repair attempt; if it still fails the
 *    day is marked failed instead of saving a weak lesson.
 *  - soft: small deviations in proportions/amounts that do not stop the lesson from being useful; accepted and logged.
 */
export interface ValidationResult {
  hard: string[];
  essential: string[];
  soft: string[];
}

export const blockingIssues = (result: ValidationResult): string[] => [...result.hard, ...result.essential];
export const allIssues = (result: ValidationResult): string[] => [...result.hard, ...result.essential, ...result.soft];

const TECH_TERMS =
  /\b(developers?|programm(?:er|ers|ing)|software|coding|coder|debug(?:ging)?|bug|deploy(?:ment)?|repository|github|javascript|python|frontend|backend|api|database|startup|tech|it department)\b/i;
const WORKPLACE_TERMS = /\b(colleagues?|co-?workers?|boss|managers?|office|meetings?|job interview|salary)\b/i;

const SPANISH_FUNCTION_WORDS = new Set([
  "el", "la", "los", "las", "de", "del", "que", "en", "es", "un", "una", "para", "por", "con", "se", "tu", "tus",
  "y", "o", "al", "lo", "como", "su", "sus", "más", "este", "esta", "usamos", "usá", "cuando", "son", "está",
]);

const DIFFICULTY_SCORE: Record<ExerciseDifficulty, number> = { easy: 1, medium: 2, hard: 3 };
const BUILDING_TYPES = new Set(["word_ordering", "grammar_error_correction"]);
const SAME_TYPE_RUN_LIMIT = 3;
const DUPLICATE_SIMILARITY = 0.8;

type Section = GeneratedLesson["sections"][number];

const words = (text: string): string[] => text.split(/\s+/).filter(Boolean);
const sentenceCount = (text: string): number => text.split(/[.!?]+/).filter((part) => part.trim().length > 0).length;
const unique = (values: string[]): string[] => Array.from(new Set(values));

function spanishShare(text: string): number {
  const all = words(text.toLowerCase().replace(/[^\p{L}\s]/gu, " "));
  if (all.length === 0) return 0;
  return all.filter((word) => SPANISH_FUNCTION_WORDS.has(word)).length / all.length;
}

function longestSentenceWords(text: string): number {
  return Math.max(0, ...text.split(/[.!?]+/).map((sentence) => words(sentence.trim()).length));
}

/** English-only text fields of a lesson (where the sentence-length rule is measurable). */
function englishSentences(lesson: GeneratedLesson): string[] {
  const out: string[] = [];
  for (const section of lesson.sections) {
    out.push(...(section.examples ?? []));
    for (const row of section.pattern?.rows ?? []) out.push(row.join(" "));
    for (const item of section.vocabulary ?? []) if (item.example) out.push(item.example);
    for (const exercise of section.exercises) {
      if (exercise.exerciseType === "translation_es_en") out.push(...(exercise.acceptedAnswers ?? []).slice(0, 1));
      if (exercise.exerciseType === "translation_en_es" && exercise.sourceText) out.push(exercise.sourceText);
      if (exercise.exerciseType === "word_ordering") out.push(...(exercise.acceptedAnswers ?? []).slice(0, 1));
      if (exercise.exerciseType === "grammar_error_correction" && exercise.sentenceWithError) out.push(exercise.sentenceWithError);
    }
  }
  return out;
}

function allText(lesson: GeneratedLesson): string {
  const parts: string[] = [lesson.title, lesson.objective];
  for (const section of lesson.sections) {
    parts.push(section.title, section.explanation ?? "", ...(section.examples ?? []));
    for (const row of section.pattern?.rows ?? []) parts.push(row.join(" "));
    for (const item of section.vocabulary ?? []) parts.push(item.term, item.example ?? "");
    for (const exercise of section.exercises) {
      parts.push(
        exercise.prompt ?? "",
        exercise.sourceText ?? "",
        exercise.sentenceWithError ?? "",
        ...(exercise.words ?? []),
        ...(exercise.options ?? []),
        ...(exercise.acceptedAnswers ?? []),
        ...(exercise.starters ?? []),
      );
    }
  }
  return parts.join("\n");
}

/** The text that identifies an exercise, for spotting copies. */
function exerciseText(exercise: AIExercise): string {
  return (
    exercise.prompt ?? exercise.sourceText ?? exercise.sentenceWithError ?? exercise.acceptedAnswers?.[0] ?? (exercise.words ?? []).join(" ")
  );
}

function similarity(a: string, b: string): number {
  const sa = new Set(normalizeAnswer(a).split(" ").filter(Boolean));
  const sb = new Set(normalizeAnswer(b).split(" ").filter(Boolean));
  if (sa.size === 0 || sb.size === 0) return 0;
  let shared = 0;
  for (const token of sa) if (sb.has(token)) shared += 1;
  return shared / (sa.size + sb.size - shared);
}

const countExercises = (lesson: GeneratedLesson) => lesson.sections.reduce((sum, section) => sum + section.exercises.length, 0);
const countVocabulary = (lesson: GeneratedLesson) => lesson.sections.reduce((sum, section) => sum + (section.vocabulary?.length ?? 0), 0);

function difficultyAverage(exercises: AIExercise[]): number | null {
  const scores = exercises.flatMap((e) => (e.difficulty ? [DIFFICULTY_SCORE[e.difficulty]] : []));
  return scores.length === 0 ? null : scores.reduce((a, b) => a + b, 0) / scores.length;
}

/** Sections line up with the blueprint when they come in the same order with the same DB types. */
function followsBlueprint(lesson: GeneratedLesson, spec: LessonSpec): boolean {
  return (
    lesson.sections.length === spec.blueprint.length &&
    lesson.sections.every((section, i) => section.sectionType === spec.blueprint[i]!.sectionType)
  );
}

function longestRun(exercises: AIExercise[]): number {
  let best = 0;
  let run = 0;
  let previous = "";
  for (const exercise of exercises) {
    run = exercise.exerciseType === previous ? run + 1 : 1;
    previous = exercise.exerciseType;
    best = Math.max(best, run);
  }
  return best;
}

/** Returns the problems found, by severity (all lists empty when the lesson is fully acceptable). */
export function validateGeneratedLesson(lesson: GeneratedLesson, { spec, rules, context }: ValidationContext): ValidationResult {
  const hard: string[] = [];
  const essential: string[] = [];
  const soft: string[] = [];

  // ---- Structure ------------------------------------------------------------------------------------------
  const aligned = followsBlueprint(lesson, spec);
  if (!aligned) {
    essential.push(
      `Follow the blueprint exactly: ${spec.blueprint.length} sections in this order: ${spec.blueprint.map((s) => `${s.key} (${s.sectionType})`).join(", ")}.`,
    );
  }
  for (const section of lesson.sections) {
    if (!spec.allowedSections.includes(section.sectionType)) hard.push(`Section type "${section.sectionType}" is not allowed.`);
  }

  // ---- Exercises: usable, allowed at the level ---------------------------------------------------------------
  let invalid = 0;
  for (const section of lesson.sections) {
    section.exercises.forEach((exercise, index) => {
      if (toDbExercise(exercise, index) === null) invalid += 1;
      if (!rules.exerciseTypes.includes(exercise.exerciseType)) {
        hard.push(`Exercise type "${exercise.exerciseType}" is not allowed at ${rules.level}.`);
      }
    });
  }
  if (invalid > 0) {
    hard.push(
      `${invalid} exercise(s) are incomplete or unsolvable (missing prompt/options/correct index/accepted answers, or a word bank that cannot build the answer).`,
    );
  }
  hard.push(...multipleChoiceIssues(lesson, rules));

  const total = countExercises(lesson);
  if (total < Math.floor(spec.exercises.min * 0.7) || total > Math.ceil(spec.exercises.max * 1.3)) {
    essential.push(`The lesson has ${total} exercises; the plan needs ${spec.exercises.min}-${spec.exercises.max}.`);
  } else if (total < spec.exercises.min || total > spec.exercises.max) {
    soft.push(`Use ${spec.exercises.min}-${spec.exercises.max} exercises in total (you wrote ${total}).`);
  }

  // ---- Per-section rules, driven by the blueprint -----------------------------------------------------------
  if (aligned) {
    lesson.sections.forEach((section, i) => sectionIssues(section, spec.blueprint[i]!, lesson, i, { rules, essential, soft }));
  }

  // ---- Progression and composition across the whole lesson ----------------------------------------------------
  progressionIssues(lesson, essential, soft);

  const all = lesson.sections.flatMap((s) => s.exercises);
  const mcShare = all.length === 0 ? 0 : all.filter((e) => e.exerciseType === "multiple_choice").length / all.length;
  if (mcShare > 0.6) {
    essential.push(`Over ${Math.round(mcShare * 100)}% of the exercises are multiple choice; replace most of them with building and writing tasks.`);
  } else if (mcShare > rules.maxRecognitionShare) {
    soft.push(`Too much multiple choice (${Math.round(mcShare * 100)}%): keep it under ${Math.round(rules.maxRecognitionShare * 100)}%.`);
  }

  const distinctTypes = new Set(all.map((e) => e.exerciseType)).size;
  if (all.length >= 8 && distinctTypes < 3) soft.push("Use more variety: at least 3 different exercise types.");
  if (longestRun(all) > SAME_TYPE_RUN_LIMIT) soft.push(`Do not put more than ${SAME_TYPE_RUN_LIMIT} exercises of the same type in a row.`);

  const vocabulary = countVocabulary(lesson);
  if (vocabulary < spec.vocabulary.min || vocabulary > spec.vocabulary.max) {
    soft.push(`Teach ${spec.vocabulary.min}-${spec.vocabulary.max} new vocabulary items in total (you wrote ${vocabulary}).`);
  }

  // ---- Level -----------------------------------------------------------------------------------------------
  const sentences = englishSentences(lesson);
  const tooLong = sentences.filter((sentence) => longestSentenceWords(sentence) > rules.maxWordsPerSentence + 2);
  if (tooLong.length > 0) {
    // A few long sentences are a flaw; many of them mean the whole lesson is above the level.
    (tooLong.length / Math.max(1, sentences.length) > 0.25 ? hard : soft).push(
      `English sentences must have at most ${rules.maxWordsPerSentence} words at ${rules.level}; too long: "${tooLong[0]}"${tooLong.length > 1 ? ` (+${tooLong.length - 1} more)` : ""}.`,
    );
  }

  if (context.explanationLanguage === "es" && rules.minSpanishShareInExplanations > 0) {
    const explanations = lesson.sections.map((s) => s.explanation ?? "").filter((text) => words(text).length >= 8);
    const failing = explanations.filter((text) => spanishShare(text) < rules.minSpanishShareInExplanations);
    if (explanations.length > 0 && failing.length > explanations.length / 2) {
      hard.push(`At ${rules.level} the explanations must be written in Spanish.`);
    }
  }

  // ---- Personalization limits -----------------------------------------------------------------------------
  const text = allText(lesson);
  if (!allowsTechContext(context) && TECH_TERMS.test(text)) {
    hard.push("Remove programming/software/technology content: the student did not choose it.");
  }
  if (!allowsWorkContext(context) && WORKPLACE_TERMS.test(text)) {
    hard.push("Remove workplace content (colleagues, meetings, bosses, interviews): the student did not provide a profession or work goal.");
  }

  // ---- Duration ---------------------------------------------------------------------------------------------
  const minutes = estimateLessonMinutes(lesson);
  if (minutes < spec.minutes * DURATION_TOLERANCE.min || minutes > spec.minutes * DURATION_TOLERANCE.max) {
    const wayOff = minutes < spec.minutes * 0.35 || minutes > spec.minutes * 2;
    (wayOff ? essential : soft).push(`The lesson would take about ${minutes} minutes; aim for about ${spec.minutes}.`);
  }

  return { hard: unique(hard), essential: unique(essential), soft: unique(soft) };
}

function multipleChoiceIssues(lesson: GeneratedLesson, rules: CefrRules): string[] {
  const issues: string[] = [];
  const maxOptions = rules.level === "A1" || rules.level === "A2" ? 3 : 4;
  for (const section of lesson.sections) {
    for (const exercise of section.exercises) {
      if (exercise.exerciseType !== "multiple_choice" || !exercise.options) continue;
      const lowered = exercise.options.map((option) => option.trim().toLowerCase());
      if (new Set(lowered).size !== lowered.length) {
        issues.push("Multiple-choice options must be distinct.");
        break;
      }
      if (exercise.options.length > maxOptions || exercise.options.length < 3) {
        issues.push(`Multiple choice needs ${maxOptions === 3 ? "exactly 3" : "3-4"} options at ${rules.level}.`);
        break;
      }
    }
  }
  return issues;
}

interface SectionCheckEnv {
  rules: CefrRules;
  essential: string[];
  soft: string[];
}

function sectionIssues(section: Section, plan: SectionPlan, lesson: GeneratedLesson, index: number, env: SectionCheckEnv): void {
  const { rules, essential, soft } = env;
  const exercises = section.exercises;
  const n = exercises.length;
  const label = `"${plan.key}" section`;

  // amount
  if (n < Math.ceil(plan.count * 0.6) || n > Math.floor(plan.count * 1.6) + 1) {
    essential.push(`The ${label} needs about ${plan.count} exercises (you wrote ${n}).`);
  } else if (Math.abs(n - plan.count) > 1) {
    soft.push(`The ${label} should have about ${plan.count} exercises (you wrote ${n}).`);
  }

  // types allowed in this stage
  const outOfPlan = exercises.filter((e) => !plan.allowedTypes.includes(e.exerciseType));
  if (outOfPlan.length > 0) {
    const kinds = Array.from(new Set(outOfPlan.map((e) => e.exerciseType))).join(", ");
    (outOfPlan.length > n * 0.4 ? essential : soft).push(`The ${label} should only use: ${plan.allowedTypes.join(", ")} (found ${kinds}).`);
  }

  const mc = exercises.filter((e) => e.exerciseType === "multiple_choice").length;
  if (mc > plan.maxMultipleChoice) {
    const tooRecognitionHeavy = plan.stage === "assessment" && n > 0 && mc / n > 0.5;
    (tooRecognitionHeavy ? essential : soft).push(
      plan.stage === "assessment"
        ? `The final assessment must check the student with little help: at most ${plan.maxMultipleChoice} multiple-choice item(s); use ordering, correction, completion without options, translation in context or writing.`
        : `The ${label} may have at most ${plan.maxMultipleChoice} multiple-choice item(s).`,
    );
  }

  // difficulty window
  const labelled = exercises.filter((e) => e.difficulty);
  const outside = labelled.filter((e) => !plan.difficulties.includes(e.difficulty!));
  if (outside.length > Math.max(1, labelled.length * 0.34)) {
    soft.push(`The ${label} should use difficulty ${plan.difficulties.join(" to ")}.`);
  }

  const constructive = exercises.filter((e) => BUILDING_TYPES.has(e.exerciseType)).length;
  if (plan.minConstructive > 0 && n > 0) {
    if (constructive === 0 && plan.stage !== "assessment") {
      essential.push(`The ${label} must make the student build sentences: include word_ordering and grammar_error_correction exercises.`);
    } else if (constructive < Math.min(plan.minConstructive, n)) {
      soft.push(`The ${label} needs at least ${plan.minConstructive} building exercises (word_ordering / grammar_error_correction).`);
    }
  }

  if (plan.stage === "assessment") assessmentIssues(section, lesson, index, env);

  // grammar pattern
  if (plan.requiresPattern) {
    const pattern = section.pattern;
    if (!pattern || pattern.columns.length < 2 || pattern.rows.length < 1) {
      essential.push(`At ${rules.level} the grammar section needs a "pattern" (a small table: columns + 1-4 example rows) BEFORE the exercises.`);
    } else {
      if (pattern.rows.some((row) => row.length !== pattern.columns.length)) soft.push("Every pattern row must have one cell per column.");
      if (pattern.rows.length > 4) soft.push("Keep the pattern to at most 4 rows.");
    }
    const examples = section.examples?.length ?? 0;
    if (examples < 2 || examples > 4) soft.push("Give 2 to 4 short examples in the grammar section.");
  }

  // brief explanations
  if (plan.explanation && section.explanation && sentenceCount(section.explanation) > 3) {
    soft.push(`Keep the explanation of the ${label} to 3 sentences or fewer.`);
  }

  if (plan.production) productionIssues(section, plan, env);
}

function productionIssues(section: Section, plan: SectionPlan, env: SectionCheckEnv): void {
  const { rules, essential, soft } = env;
  const production = rules.production;
  const writing = section.exercises.filter((e) => e.exerciseType === "free_writing");
  const mains = writing.filter((e) => (e.minWords ?? 0) >= production.main.min);

  if (writing.length === 0 || mains.length === 0) {
    essential.push(
      `The production section needs a main writing task of ${production.main.min}-${production.main.max} words (${rules.mainTaskShape}); set "minWords" accordingly.`,
    );
    return;
  }
  if (plan.production && mains.length < plan.production.main) soft.push("Add the missing main writing task.");
  for (const task of writing) {
    const min = task.minWords ?? 0;
    const inRange =
      (min >= production.short.min && min <= production.short.max) || (min >= production.main.min && min <= production.main.max);
    if (!inRange) {
      soft.push(
        `Writing tasks need "minWords" within ${production.short.min}-${production.short.max} (short) or ${production.main.min}-${production.main.max} (main) at ${rules.level}.`,
      );
    }
  }
  if (rules.starters === "always" && mains.some((task) => !task.starters || task.starters.length === 0)) {
    soft.push(`At ${rules.level} give sentence starters ("starters") for the main writing task.`);
  }
}

function assessmentIssues(section: Section, lesson: GeneratedLesson, index: number, env: SectionCheckEnv): void {
  const { essential, soft } = env;
  const items = section.exercises;
  if (items.length === 0) return;

  const productive = items.filter((e) => BUILDING_TYPES.has(e.exerciseType) || e.exerciseType === "free_writing").length;
  if (productive === 0) {
    essential.push(
      "The final assessment must include at least one building or writing task (word_ordering, grammar_error_correction or free_writing), not only recognition.",
    );
  }

  const avg = difficultyAverage(items);
  if (avg !== null && avg < 1.6) soft.push("The final assessment should be at least medium difficulty.");

  // Not a copy of the guided practice: compare against everything that came before.
  const earlier = lesson.sections.slice(0, index).flatMap((s) => s.exercises.map(exerciseText));
  const copies = items.filter((item) => {
    const text = exerciseText(item);
    return text.length > 0 && earlier.some((previous) => similarity(text, previous) >= DUPLICATE_SIMILARITY);
  });
  if (copies.length > 0) {
    (copies.length >= items.length / 2 ? essential : soft).push(
      "The final assessment repeats earlier exercises; write NEW sentences and situations that use what was learned.",
    );
  }
}

function progressionIssues(lesson: GeneratedLesson, essential: string[], soft: string[]): void {
  const perSection = lesson.sections.map((section) => difficultyAverage(section.exercises));
  const labelled = perSection.map((avg, i) => ({ avg, i })).filter((entry): entry is { avg: number; i: number } => entry.avg !== null);
  if (labelled.length < 3) return;

  // Writing tasks are hard by nature; the section after them is compared with the practice that came before.
  const practice = labelled.filter((entry) => lesson.sections[entry.i]!.stage !== "production");

  const half = Math.floor(labelled.length / 2);
  const firstHalf = labelled.slice(0, half).reduce((sum, e) => sum + e.avg, 0) / half;
  const lastHalf = labelled.slice(-half).reduce((sum, e) => sum + e.avg, 0) / half;
  if (lastHalf < firstHalf + 0.25) {
    essential.push(
      "Difficulty must rise through the lesson: easy recognition first, then guided practice, building, production and a harder final assessment.",
    );
  }
  for (let k = 1; k < practice.length; k++) {
    if (practice[k]!.avg < practice[k - 1]!.avg - 0.6) {
      soft.push(`Difficulty drops in section ${practice[k]!.i + 1}; keep it steady or rising.`);
      break;
    }
  }
}

/**
 * Deterministic, safe repairs applied before spending another AI call. They never invent content:
 * map the legacy "speaking" label to written production, drop sections/exercises the plan cannot use,
 * stamp each section with its blueprint stage, fill in missing difficulty labels and trim surplus.
 */
export function repairGeneratedLesson(lesson: GeneratedLesson, { spec, rules }: ValidationContext): GeneratedLesson {
  let sections = lesson.sections
    .filter((section) => section.sectionType !== "listening")
    // Writing is not Speaking: written activities live in an ordinary interactive section.
    .map((section) => ({ ...section, sectionType: section.sectionType === "speaking" ? ("interactive" as const) : section.sectionType }))
    .filter((section) => spec.allowedSections.includes(section.sectionType))
    .map((section) => ({
      ...section,
      exercises: section.exercises.filter(
        (exercise, index) => rules.exerciseTypes.includes(exercise.exerciseType) && toDbExercise(exercise, index) !== null,
      ),
    }));

  const aligned = sections.length === spec.blueprint.length && sections.every((s, i) => s.sectionType === spec.blueprint[i]!.sectionType);
  if (aligned) {
    sections = sections.map((section, i) => {
      const plan = spec.blueprint[i]!;
      const lastIndex = Math.max(1, section.exercises.length - 1);
      return {
        ...section,
        stage: plan.stage,
        exercises: section.exercises.map((exercise, k) => ({
          ...exercise,
          // Unlabelled exercises inherit the section window: the earlier half the easier end, the later the harder.
          difficulty: exercise.difficulty ?? plan.difficulties[k / lastIndex > 0.5 ? plan.difficulties.length - 1 : 0],
        })),
      };
    });
  }

  // Vocabulary over the cap: trim from the last vocabulary section.
  let vocabulary = sections.reduce((sum, section) => sum + (section.vocabulary?.length ?? 0), 0);
  for (let i = sections.length - 1; i >= 0 && vocabulary > spec.vocabulary.max; i--) {
    const section = sections[i];
    if (!section?.vocabulary?.length) continue;
    const removable = Math.min(section.vocabulary.length - 1, vocabulary - spec.vocabulary.max);
    if (removable <= 0) continue;
    section.vocabulary = section.vocabulary.slice(0, section.vocabulary.length - removable);
    vocabulary -= removable;
  }

  // Too many writing tasks (each is an AI evaluation): drop the surplus ones, never the last one in a section.
  const writingTotal = () => sections.reduce((sum, s) => sum + s.exercises.filter((e) => e.exerciseType === "free_writing").length, 0);
  for (let i = sections.length - 1; i >= 0 && writingTotal() > spec.freeWriting.max; i--) {
    const section = sections[i];
    if (!section) continue;
    while (writingTotal() > spec.freeWriting.max) {
      const writing = section.exercises.filter((e) => e.exerciseType === "free_writing");
      if (writing.length <= 1) break;
      const shortest = writing.reduce((a, b) => ((a.minWords ?? 0) <= (b.minWords ?? 0) ? a : b));
      section.exercises.splice(section.exercises.indexOf(shortest), 1);
    }
  }

  // Too many exercises: trim from the later practice sections first (never review, assessment or production).
  let total = sections.reduce((sum, section) => sum + section.exercises.length, 0);
  const ceiling = Math.ceil(spec.exercises.max * 1.3);
  for (let i = sections.length - 1; i >= 0 && total > ceiling; i--) {
    const section = sections[i];
    if (!section || ["review", "final_assessment"].includes(section.sectionType)) continue;
    if (section.exercises.some((e) => e.exerciseType === "free_writing")) continue;
    while (total > ceiling && section.exercises.length > 2) {
      section.exercises.pop();
      total -= 1;
    }
  }

  return { ...lesson, sections };
}
