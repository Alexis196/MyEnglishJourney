import type { AIExercise, GeneratedLesson } from "../ai/planGeneration.schema";
import type { CefrRules } from "./cefrRules";
import { allowsTechContext, allowsWorkContext, type LearningContext } from "./learningContext";
import { DURATION_TOLERANCE, estimateLessonMinutes, type LessonSpec } from "./lessonDuration";
import { toDbExercise } from "./exerciseMapper";

export interface ValidationContext {
  spec: LessonSpec;
  rules: CefrRules;
  context: Pick<LearningContext, "interests" | "preferredTopics" | "profession" | "otherInterests" | "learningGoal" | "explanationLanguage">;
}

const TECH_TERMS =
  /\b(developers?|programm(?:er|ers|ing)|software|coding|coder|debug(?:ging)?|bug|deploy(?:ment)?|repository|github|javascript|python|frontend|backend|api|database|startup|tech|it department)\b/i;
const WORKPLACE_TERMS = /\b(colleagues?|co-?workers?|boss|managers?|office|meetings?|job interview|salary)\b/i;

const SPANISH_FUNCTION_WORDS = new Set([
  "el", "la", "los", "las", "de", "del", "que", "en", "es", "un", "una", "para", "por", "con", "se", "tu", "tus",
  "y", "o", "al", "lo", "como", "su", "sus", "más", "este", "esta", "usamos", "usá", "cuando", "son", "está",
]);

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function spanishShare(text: string): number {
  const all = words(text.toLowerCase().replace(/[^\p{L}\s]/gu, " "));
  if (all.length === 0) return 0;
  return all.filter((word) => SPANISH_FUNCTION_WORDS.has(word)).length / all.length;
}

function longestSentenceWords(text: string): number {
  return Math.max(0, ...text.split(/[.!?]+/).map((sentence) => words(sentence.trim()).length));
}

/** English-only text fields of a lesson (the ones where the sentence-length rule is measurable). */
function englishSentences(lesson: GeneratedLesson): string[] {
  const out: string[] = [];
  for (const section of lesson.sections) {
    out.push(...(section.examples ?? []));
    for (const item of section.vocabulary ?? []) if (item.example) out.push(item.example);
    for (const exercise of section.exercises) {
      if (exercise.exerciseType === "translation_es_en") out.push(...(exercise.acceptedAnswers ?? []).slice(0, 1));
      if (exercise.exerciseType === "translation_en_es" && exercise.sourceText) out.push(exercise.sourceText);
    }
  }
  return out;
}

function allText(lesson: GeneratedLesson): string {
  const parts: string[] = [lesson.title, lesson.objective];
  for (const section of lesson.sections) {
    parts.push(section.title, section.explanation ?? "", ...(section.examples ?? []));
    for (const item of section.vocabulary ?? []) parts.push(item.term, item.example ?? "");
    for (const exercise of section.exercises) {
      parts.push(exercise.prompt ?? "", exercise.sourceText ?? "", ...(exercise.options ?? []), ...(exercise.acceptedAnswers ?? []));
    }
  }
  return parts.join("\n");
}

const countExercises = (lesson: GeneratedLesson) => lesson.sections.reduce((sum, section) => sum + section.exercises.length, 0);
const countVocabulary = (lesson: GeneratedLesson) => lesson.sections.reduce((sum, section) => sum + (section.vocabulary?.length ?? 0), 0);
const countWriting = (lesson: GeneratedLesson) =>
  lesson.sections.reduce((sum, section) => sum + section.exercises.filter((e) => e.exerciseType === "free_writing").length, 0);

export interface ValidationResult {
  /** Violations that make the lesson unusable: it is never saved while any remain. */
  hard: string[];
  /** Deviations in amount/length that are worth fixing but do not make the lesson wrong. */
  soft: string[];
}

/** Every problem, hard first — what gets fed back to the model on a retry. */
export const allIssues = (result: ValidationResult): string[] => [...result.hard, ...result.soft];

/** Returns the problems found (both lists empty when the lesson is acceptable). */
export function validateGeneratedLesson(lesson: GeneratedLesson, { spec, rules, context }: ValidationContext): ValidationResult {
  const hard: string[] = [];
  const soft: string[] = [];

  // Structure ------------------------------------------------------------------------------------------------
  if (lesson.sections.length < spec.sections.min || lesson.sections.length > spec.sections.max) {
    soft.push(`Use ${spec.sections.min}-${spec.sections.max} sections (you used ${lesson.sections.length}).`);
  }
  const types = new Set(lesson.sections.map((section) => section.sectionType));
  for (const required of spec.requiredSections) {
    if (!types.has(required as never)) hard.push(`Missing required section type "${required}".`);
  }
  for (const section of lesson.sections) {
    if (!spec.allowedSections.includes(section.sectionType)) hard.push(`Section type "${section.sectionType}" is not allowed.`);
  }
  if (lesson.sections[0]?.sectionType !== "review") soft.push("The review section must come first.");

  // Exercises ------------------------------------------------------------------------------------------------
  let invalid = 0;
  for (const section of lesson.sections) {
    section.exercises.forEach((exercise, index) => {
      if (toDbExercise(exercise, index) === null) invalid += 1;
      if (!rules.exerciseTypes.includes(exercise.exerciseType)) {
        hard.push(`Exercise type "${exercise.exerciseType}" is too hard/not allowed at ${rules.level}.`);
      }
    });
  }
  if (invalid > 0) hard.push(`${invalid} exercise(s) are incomplete (missing prompt, options, correct index or accepted answers).`);

  const total = countExercises(lesson);
  if (total < spec.exercises.min || total > spec.exercises.max) {
    (total < spec.exercises.min * 0.7 ? hard : soft).push(`Use ${spec.exercises.min}-${spec.exercises.max} exercises in total (you wrote ${total}).`);
  }

  const reviewSection = lesson.sections.find((section) => section.sectionType === "review");
  if (reviewSection) {
    const reviewCount = reviewSection.exercises.length;
    if (reviewCount < spec.reviewExercises - 1 || reviewCount > spec.reviewExercises + 2) {
      soft.push(`The review section should have about ${spec.reviewExercises} exercises (you wrote ${reviewCount}).`);
    }
  }

  const vocabulary = countVocabulary(lesson);
  if (vocabulary < spec.vocabulary.min || vocabulary > spec.vocabulary.max) {
    soft.push(`Teach ${spec.vocabulary.min}-${spec.vocabulary.max} new vocabulary items in total (you wrote ${vocabulary}).`);
  }

  const writing = countWriting(lesson);
  if (writing < spec.freeWriting.min || writing > spec.freeWriting.max) {
    soft.push(`Use ${spec.freeWriting.min}-${spec.freeWriting.max} free-writing exercises (you wrote ${writing}).`);
  }
  for (const section of lesson.sections) {
    for (const exercise of section.exercises) {
      if (exercise.exerciseType !== "free_writing") continue;
      const min = exercise.minWords;
      if (min === undefined || min < rules.freeWritingMinWords.min || min > rules.freeWritingMinWords.max) {
        soft.push(`free_writing "minWords" must be ${rules.freeWritingMinWords.min}-${rules.freeWritingMinWords.max} at ${rules.level}.`);
        break;
      }
    }
  }

  hard.push(...multipleChoiceIssues(lesson, rules));

  // Level ----------------------------------------------------------------------------------------------------
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

  // Personalization limits -----------------------------------------------------------------------------------
  const text = allText(lesson);
  if (!allowsTechContext(context) && TECH_TERMS.test(text)) {
    hard.push("Remove programming/software/technology content: the student did not choose it.");
  }
  if (!allowsWorkContext(context) && WORKPLACE_TERMS.test(text)) {
    hard.push("Remove workplace content (colleagues, meetings, bosses, interviews): the student did not provide a profession or work goal.");
  }

  // Duration -------------------------------------------------------------------------------------------------
  const minutes = estimateLessonMinutes(lesson);
  if (minutes < spec.minutes * DURATION_TOLERANCE.min || minutes > spec.minutes * DURATION_TOLERANCE.max) {
    const wayOff = minutes < spec.minutes * 0.35 || minutes > spec.minutes * 2;
    (wayOff ? hard : soft).push(`The lesson would take about ${minutes} minutes; aim for about ${spec.minutes}.`);
  }

  return { hard: Array.from(new Set(hard)), soft: Array.from(new Set(soft)) };
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

/**
 * Deterministic, safe repairs applied before spending another AI call: drop unusable exercises, drop exercises
 * the level does not allow and trim surplus content. Never invents content.
 */
export function repairGeneratedLesson(lesson: GeneratedLesson, { spec, rules }: ValidationContext): GeneratedLesson {
  const sections = lesson.sections
    .filter((section) => spec.allowedSections.includes(section.sectionType))
    .map((section) => ({
      ...section,
      exercises: section.exercises.filter(
        (exercise: AIExercise, index) => rules.exerciseTypes.includes(exercise.exerciseType) && toDbExercise(exercise, index) !== null,
      ),
    }));

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

  // Too many free-writing tasks: drop the surplus ones from the end.
  let writing = sections.reduce((sum, s) => sum + s.exercises.filter((e) => e.exerciseType === "free_writing").length, 0);
  for (let i = sections.length - 1; i >= 0 && writing > spec.freeWriting.max; i--) {
    const section = sections[i];
    if (!section) continue;
    while (writing > spec.freeWriting.max) {
      const at = section.exercises.map((e) => e.exerciseType).lastIndexOf("free_writing");
      if (at < 0) break;
      section.exercises.splice(at, 1);
      writing -= 1;
    }
  }

  // Too many exercises: trim from the last sections first (never from the review section).
  let total = sections.reduce((sum, section) => sum + section.exercises.length, 0);
  for (let i = sections.length - 1; i >= 0 && total > spec.exercises.max; i--) {
    const section = sections[i];
    if (!section || section.sectionType === "review") continue;
    while (total > spec.exercises.max && section.exercises.length > 1) {
      section.exercises.pop();
      total -= 1;
    }
  }

  return { ...lesson, sections };
}
