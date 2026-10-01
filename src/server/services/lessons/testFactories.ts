import type { ExerciseDifficulty } from "@myenglishjourney/shared";
import type { AIExercise, GeneratedLesson } from "../ai/planGeneration.schema";
import { getCefrRules } from "./cefrRules";
import type { LearningContext } from "./learningContext";
import type { LessonSpec, SectionPlan } from "./lessonBlueprint";
import { NO_HISTORY_PERFORMANCE } from "./performance";

/** Test helpers: a student context and a lesson that satisfies a spec (blueprint) exactly. */
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

const SPANISH_EXPLANATION = "Usamos el verbo to be para decir quién es una persona y de dónde viene.";
const NAMES = ["Ana", "Tom", "Lia", "Sam", "Eva", "Leo", "Mia", "Ben", "Zoe", "Max", "Ivy", "Dan"];
const THINGS = ["tea", "milk", "bread", "rice", "soup", "fish", "cake", "juice", "pasta", "salad", "fruit", "honey"];

/** Every sentence is unique (distinct name + thing + counter) so duplicate detection never trips on test data. */
let counter = 0;
const sentence = () => {
  counter += 1;
  return { name: `${NAMES[counter % NAMES.length]}${counter}`, thing: `${THINGS[(counter * 5) % THINGS.length]}${counter}` };
};

const difficultyFor = (plan: SectionPlan, index: number, total: number): ExerciseDifficulty => {
  const last = plan.difficulties.length - 1;
  return plan.difficulties[total <= 1 ? 0 : Math.min(last, Math.floor((index / (total - 1)) * (last + 0.99)))]!;
};

function exerciseOf(kind: string, difficulty: ExerciseDifficulty, minWords?: number, starters?: string[]): AIExercise {
  const { name, thing } = sentence();
  switch (kind) {
    case "multiple_choice":
      return { exerciseType: "multiple_choice", difficulty, prompt: `Elegí: ${name} ___ ${thing}.`, options: ["likes", "like", "liking"], correctOptionIndex: counter % 3 };
    case "fill_in_blank":
      return { exerciseType: "fill_in_blank", difficulty, prompt: `Completá: ${name} ___ ${thing}.`, acceptedAnswers: ["likes"] };
    case "translation_es_en":
      return { exerciseType: "translation_es_en", difficulty, sourceText: `A ${name} le gusta ${thing}.`, acceptedAnswers: [`${name} likes ${thing}.`] };
    case "translation_en_es":
      return { exerciseType: "translation_en_es", difficulty, sourceText: `${name} eats ${thing}.`, acceptedAnswers: [`${name} come ${thing}.`] };
    case "word_ordering":
      return { exerciseType: "word_ordering", difficulty, words: [name, "likes", thing], acceptedAnswers: [`${name} likes ${thing}`] };
    case "grammar_error_correction":
      return { exerciseType: "grammar_error_correction", difficulty, sentenceWithError: `${name} like ${thing}`, acceptedAnswers: [`${name} likes ${thing}`] };
    default:
      return { exerciseType: "free_writing", difficulty, prompt: "Escribí sobre vos.", minWords, ...(starters ? { starters } : {}) };
  }
}

/** Which exercise kinds fill a section, in order (varied, so no long same-type runs). */
function kindsFor(plan: SectionPlan): string[] {
  const rotation: Record<string, string[]> = {
    recognition: ["multiple_choice", "fill_in_blank", "translation_es_en", "multiple_choice", "translation_en_es"],
    guided: ["multiple_choice", "fill_in_blank", "word_ordering", "fill_in_blank"],
    construction: ["word_ordering", "grammar_error_correction", "fill_in_blank", "translation_es_en", "word_ordering"],
    assessment: ["word_ordering", "grammar_error_correction", "translation_es_en", "fill_in_blank", "word_ordering"],
  };
  const pool = rotation[plan.stage] ?? rotation.guided!;
  const out: string[] = [];
  let mc = 0;
  for (let i = 0; out.length < plan.count; i++) {
    let kind = pool[i % pool.length]!;
    if (kind === "multiple_choice") {
      if (mc >= plan.maxMultipleChoice) kind = "fill_in_blank";
      else mc += 1;
    }
    if (!plan.allowedTypes.includes(kind as never)) kind = plan.allowedTypes[0]!;
    out.push(kind);
  }
  return out;
}

/** A lesson that follows the blueprint section by section, rising in difficulty, with real production and a fresh assessment. */
export function makeLesson(spec: LessonSpec): GeneratedLesson {
  const rules = getCefrRules(spec.level);
  let vocabLeft = Math.round((spec.vocabulary.min + spec.vocabulary.max) / 2);

  const sections = spec.blueprint.map((plan): GeneratedLesson["sections"][number] => {
    const base = {
      sectionType: plan.sectionType,
      stage: plan.stage,
      title: plan.key,
      ...(plan.explanation ? { explanation: SPANISH_EXPLANATION } : {}),
    };

    if (plan.production) {
      const { short, main } = plan.production;
      const exercises: AIExercise[] = [
        ...Array.from({ length: short }, () => exerciseOf("free_writing", "medium", spec.productionWords.short)),
        ...Array.from({ length: main }, () =>
          exerciseOf("free_writing", "hard", spec.productionWords.main, rules.starters === "never" ? undefined : ["My name is", "I like"]),
        ),
      ];
      return { ...base, exercises };
    }

    const kinds = kindsFor(plan);
    const exercises = kinds.map((kind, i) => exerciseOf(kind, difficultyFor(plan, i, kinds.length)));
    const section: GeneratedLesson["sections"][number] = { ...base, exercises };

    if (plan.key === "vocabulary") {
      section.vocabulary = Array.from({ length: vocabLeft }, (_, i) => ({ term: `word${i}`, translation: `palabra ${i}`, example: "I like it." }));
      vocabLeft = 0;
    }
    if (plan.key === "grammar") {
      section.examples = ["I am a student.", "She is happy."];
      if (plan.requiresPattern) section.pattern = { columns: ["I", "am", "from"], rows: [["I", "am", "from Spain"], ["She", "is", "from Peru"]] };
    }
    return section;
  });

  return { title: "Lesson", objective: "Aprender a presentarte.", sections };
}
