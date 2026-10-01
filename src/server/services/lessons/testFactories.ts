import type { AIExercise, GeneratedLesson } from "../ai/planGeneration.schema";
import { getCefrRules } from "./cefrRules";
import type { LearningContext } from "./learningContext";
import type { LessonSpec } from "./lessonDuration";
import { NO_HISTORY_PERFORMANCE } from "./performance";

/** Test helpers: a student context and a lesson that satisfies a spec exactly. */
export function makeContext(overrides: Partial<LearningContext> = {}): LearningContext {
  return {
    cefrLevel: "A1",
    explanationLanguage: "es",
    interests: [],
    preferredTopics: [],
    minutesPerLesson: 30,
    performance: NO_HISTORY_PERFORMANCE,
    review: { items: [], weakVocabulary: [] },
    dayNumber: 2,
    totalDays: 90,
    dayType: "lesson",
    ...overrides,
  };
}

const mc = (n: number): AIExercise => ({
  exerciseType: "multiple_choice",
  prompt: `Elegí la opción correcta ${n}: She ___ a student.`,
  options: ["is", "are", "am"],
  correctOptionIndex: n % 3,
});
const fill = (n: number): AIExercise => ({
  exerciseType: "fill_in_blank",
  prompt: `Completá ${n}: I ___ happy.`,
  acceptedAnswers: ["am"],
});
const translate = (n: number): AIExercise =>
  n % 2 === 0
    ? { exerciseType: "translation_es_en", sourceText: `Yo tengo ${n} libros.`, acceptedAnswers: [`I have ${n} books.`] }
    : { exerciseType: "translation_en_es", sourceText: `She has ${n} pens.`, acceptedAnswers: [`Ella tiene ${n} lapiceras.`] };

const SPANISH_EXPLANATION =
  "Usamos el verbo to be para decir quién es una persona y de dónde viene en una frase corta con un ejemplo claro.";

/** A lesson with exactly the counts in `spec` (midpoint of every range), short Spanish explanations, no personal content. */
export function makeLesson(spec: LessonSpec, level: Parameters<typeof getCefrRules>[0] = "A1"): GeneratedLesson {
  const rules = getCefrRules(level);
  const total = Math.round((spec.exercises.min + spec.exercises.max) / 2);
  const vocabCount = Math.round((spec.vocabulary.min + spec.vocabulary.max) / 2);
  const writing = spec.freeWriting.min;

  const reviewCount = spec.reviewExercises;
  const remaining = Math.max(0, total - reviewCount - writing);
  const factories = [mc, fill, translate];
  const practice = Array.from({ length: remaining }, (_, i) => factories[i % 3]!(i + 1));
  const writingExercises: AIExercise[] = Array.from({ length: writing }, () => ({
    exerciseType: "free_writing",
    prompt: "Escribí sobre tu día.",
    minWords: rules.freeWritingMinWords.min,
  }));

  const sections: GeneratedLesson["sections"] = [
    {
      sectionType: "review",
      title: "Review",
      explanation: SPANISH_EXPLANATION,
      exercises: Array.from({ length: reviewCount }, (_, i) => mc(i + 100)),
    },
  ];
  for (const type of spec.requiredSections) {
    if (type === "review") continue;
    sections.push({
      sectionType: type as GeneratedLesson["sections"][number]["sectionType"],
      title: type,
      explanation: type === "vocabulary" || type === "grammar" ? SPANISH_EXPLANATION : undefined,
      examples: type === "grammar" ? ["I am a student.", "She is happy."] : undefined,
      vocabulary:
        type === "vocabulary"
          ? Array.from({ length: vocabCount }, (_, i) => ({ term: `word${i}`, translation: `palabra ${i}`, example: "I like it." }))
          : undefined,
      exercises: [],
    });
  }

  // Spread practice and writing over the non-review sections that can hold them.
  const holders = sections.filter((s) => s.sectionType !== "review" && s.sectionType !== "vocabulary");
  const target = holders.length > 0 ? holders : sections.slice(1);
  practice.forEach((exercise, i) => target[i % target.length]!.exercises.push(exercise));
  writingExercises.forEach((exercise, i) => target[target.length - 1 - (i % target.length)]!.exercises.push(exercise));
  while (sections.length < spec.sections.min) {
    sections.push({ sectionType: "interactive", title: "Extra", exercises: [] });
  }

  return { title: "Lesson", objective: "Aprender a presentarte.", sections };
}
