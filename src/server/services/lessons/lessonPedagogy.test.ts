import { describe, expect, it } from "vitest";
import { CEFR_LEVELS, type CefrLevel, type PlanDayType } from "@myenglishjourney/shared";
import type { AIExercise, GeneratedLesson } from "../ai/planGeneration.schema";
import { getCefrRules } from "./cefrRules";
import { scrambleWords, sameWords, toDbExercise } from "./exerciseMapper";
import { buildLessonSpec, type LessonSpec } from "./lessonBlueprint";
import { allIssues, blockingIssues, repairGeneratedLesson, validateGeneratedLesson } from "./lessonValidator";
import { makeContext, makeLesson } from "./testFactories";
import { matchesAnyAcceptedAnswer } from "../exerciseValidators/normalizeAnswer";

const check = (lesson: GeneratedLesson, spec: LessonSpec, ctx = makeContext({ cefrLevel: spec.level, minutesPerLesson: spec.minutes })) =>
  validateGeneratedLesson(lesson, { spec, rules: getCefrRules(spec.level), context: ctx });

const specFor = (level: CefrLevel, minutes = 45, dayType: PlanDayType = "lesson") => buildLessonSpec({ minutes, level, dayType });
const section = (lesson: GeneratedLesson, key: string, spec: LessonSpec) => lesson.sections[spec.blueprint.findIndex((s) => s.key === key)]!;
const clone = (lesson: GeneratedLesson): GeneratedLesson => structuredClone(lesson);

describe("a lesson that follows the blueprint", () => {
  it("passes cleanly at every level and session length", () => {
    for (const level of CEFR_LEVELS) {
      for (const minutes of [30, 45, 60, 90]) {
        const spec = specFor(level, minutes);
        const result = check(makeLesson(spec), spec);
        expect(allIssues(result), `${level} ${minutes}`).toEqual([]);
      }
    }
  });

  it("also passes for review and assessment days", () => {
    for (const dayType of ["review", "assessment"] as const) {
      const spec = specFor("A2", 45, dayType);
      expect(allIssues(check(makeLesson(spec), spec, makeContext({ cefrLevel: "A2", dayType })))).toEqual([]);
    }
  });
});

describe("essential quality", () => {
  it("rejects a lesson without own production", () => {
    const spec = specFor("A1", 30);
    const lesson = clone(makeLesson(spec));
    section(lesson, "production", spec).exercises = [];
    const result = check(lesson, spec);
    expect(blockingIssues(result).join(" ")).toMatch(/production section needs a main writing task/);
  });

  it("rejects production that is too small for the level (a one-word answer is not the main task)", () => {
    const spec = specFor("B1", 45);
    const lesson = clone(makeLesson(spec));
    for (const exercise of section(lesson, "production", spec).exercises) exercise.minWords = 5;
    expect(check(lesson, spec).essential.join(" ")).toMatch(/main writing task of 50-90 words/);
  });

  it("rejects a final assessment made mostly of multiple choice", () => {
    const spec = specFor("A2", 45);
    const lesson = clone(makeLesson(spec));
    const assessment = section(lesson, "assessment", spec);
    assessment.exercises = assessment.exercises.map((exercise, i) => ({
      exerciseType: "multiple_choice",
      difficulty: "medium",
      prompt: `Pick ${i}: She ___ happy.`,
      options: ["is", "are", "am"],
      correctOptionIndex: 0,
    }));
    const result = check(lesson, spec);
    expect(result.essential.join(" ")).toMatch(/final assessment must check the student with little help/);
    expect(result.essential.join(" ")).toMatch(/building or writing task/);
  });

  it("rejects a final assessment that only copies the guided practice", () => {
    const spec = specFor("A2", 45);
    const lesson = clone(makeLesson(spec));
    const earlier = section(lesson, "construction", spec).exercises.filter((e) => e.exerciseType === "word_ordering");
    const assessment = section(lesson, "assessment", spec);
    assessment.exercises = assessment.exercises.map((exercise, i) => ({ ...earlier[i % earlier.length]!, difficulty: exercise.difficulty }));
    expect(check(lesson, spec).essential.join(" ")).toMatch(/repeats earlier exercises/);
  });

  it("requires the visual pattern at A1 and A2 but not at B1", () => {
    for (const level of ["A1", "A2"] as const) {
      const spec = specFor(level);
      const lesson = clone(makeLesson(spec));
      delete section(lesson, "grammar", spec).pattern;
      expect(check(lesson, spec).essential.join(" ")).toMatch(/needs a "pattern"/);
    }
    const b1 = specFor("B1");
    const lesson = clone(makeLesson(b1));
    delete section(lesson, "grammar", b1).pattern;
    expect(allIssues(check(lesson, b1)).join(" ")).not.toMatch(/pattern/);
  });

  it("rejects a lesson whose difficulty does not rise", () => {
    const spec = specFor("A2");
    const lesson = clone(makeLesson(spec));
    lesson.sections.forEach((s, i) => {
      for (const exercise of s.exercises) exercise.difficulty = i < lesson.sections.length / 2 ? "hard" : "easy";
    });
    expect(check(lesson, spec).essential.join(" ")).toMatch(/Difficulty must rise/);
  });

  it("rejects a construction section that never makes the student build", () => {
    const spec = specFor("A2");
    const lesson = clone(makeLesson(spec));
    const construction = section(lesson, "construction", spec);
    construction.exercises = construction.exercises.map((exercise, i) => ({
      exerciseType: "fill_in_blank",
      difficulty: exercise.difficulty,
      prompt: `Completá ${i}: Ana ___ tea.`,
      acceptedAnswers: ["likes"],
    }));
    expect(check(lesson, spec).essential.join(" ")).toMatch(/must make the student build sentences/);
  });

  it("rejects a lesson that ignores the blueprint order", () => {
    const spec = specFor("A2");
    const lesson = clone(makeLesson(spec));
    lesson.sections.reverse();
    expect(check(lesson, spec).essential.join(" ")).toMatch(/Follow the blueprint exactly/);
  });

  it("rejects a lesson dominated by recognition even when each section looks fine", () => {
    const spec = specFor("A2");
    const lesson = clone(makeLesson(spec));
    for (const s of lesson.sections) {
      s.exercises = s.exercises.map((exercise, i) =>
        exercise.exerciseType === "free_writing"
          ? exercise
          : { exerciseType: "multiple_choice" as const, difficulty: exercise.difficulty, prompt: `Q${i}`, options: ["a", "b", "c"], correctOptionIndex: 0 },
      );
    }
    expect(check(lesson, spec).essential.join(" ")).toMatch(/multiple choice/);
  });
});

describe("desirable quality (accepted, only reported)", () => {
  it("tolerates small deviations in counts and proportions", () => {
    const spec = specFor("A2");
    const lesson = clone(makeLesson(spec));
    const construction = section(lesson, "construction", spec);
    construction.exercises.push({ ...construction.exercises[0]!, prompt: undefined, words: ["Zed", "likes", "jam"], acceptedAnswers: ["Zed likes jam"] });
    const result = check(lesson, spec);
    expect(blockingIssues(result)).toEqual([]);
  });

  it("flags a missing sentence starter at A1 only as a soft issue", () => {
    const spec = specFor("A1", 30);
    const lesson = clone(makeLesson(spec));
    for (const exercise of section(lesson, "production", spec).exercises) delete exercise.starters;
    const result = check(lesson, spec);
    expect(blockingIssues(result)).toEqual([]);
    expect(result.soft.join(" ")).toMatch(/starters/);
  });

  it("flags long same-type runs and low variety softly", () => {
    const spec = specFor("A2");
    const lesson = clone(makeLesson(spec));
    const grammar = section(lesson, "grammar", spec);
    grammar.exercises = grammar.exercises.map((exercise) => ({ ...exercise, exerciseType: "fill_in_blank", prompt: `${exercise.prompt ?? "x"} ___`, acceptedAnswers: ["is"] }));
    const construction = section(lesson, "construction", spec);
    construction.exercises = construction.exercises.map((exercise) => ({ ...exercise, exerciseType: "fill_in_blank", prompt: `${exercise.prompt ?? "y"} ___`, acceptedAnswers: ["is"] }));
    const result = check(lesson, spec);
    expect(result.soft.join(" ")).toMatch(/same type in a row/);
  });

  it("flags a pattern with ragged rows softly", () => {
    const spec = specFor("A1");
    const lesson = clone(makeLesson(spec));
    section(lesson, "grammar", spec).pattern = { columns: ["I", "am"], rows: [["I", "am", "from Spain"]] };
    const result = check(lesson, spec);
    expect(blockingIssues(result)).toEqual([]);
    expect(result.soft.join(" ")).toMatch(/one cell per column/);
  });
});

describe("deterministic repair", () => {
  it("never keeps a section called Speaking for written activities", () => {
    const spec = specFor("A1", 30);
    const lesson = clone(makeLesson(spec));
    // A model that still uses the old label for the writing section.
    (section(lesson, "production", spec) as { sectionType: string }).sectionType = "speaking";
    const repaired = repairGeneratedLesson(lesson, { spec, rules: getCefrRules("A1"), context: makeContext() });
    expect(repaired.sections.map((s) => s.sectionType)).not.toContain("speaking");
    expect(repaired.sections[spec.blueprint.findIndex((s) => s.key === "production")]!.stage).toBe("production");
    expect(blockingIssues(check(repaired, spec))).toEqual([]);
  });

  it("stamps stages from the blueprint and fills missing difficulty (easier early, harder late)", () => {
    const spec = specFor("A2");
    const lesson = clone(makeLesson(spec));
    for (const s of lesson.sections) {
      delete s.stage;
      for (const exercise of s.exercises) delete exercise.difficulty;
    }
    const repaired = repairGeneratedLesson(lesson, { spec, rules: getCefrRules("A2"), context: makeContext() });
    expect(repaired.sections.map((s) => s.stage)).toEqual(spec.blueprint.map((p) => p.stage));
    const review = repaired.sections[0]!.exercises;
    expect(review[0]!.difficulty).toBe("easy");
    expect(repaired.sections.at(-1)!.exercises.at(-1)!.difficulty).toBe("hard");
  });

  it("drops unsolvable exercises instead of saving them", () => {
    const spec = specFor("A1", 30);
    const lesson = clone(makeLesson(spec));
    const construction = section(lesson, "construction", spec);
    construction.exercises.push({ exerciseType: "word_ordering", words: ["a", "b", "c"], acceptedAnswers: ["x y z"] });
    const repaired = repairGeneratedLesson(lesson, { spec, rules: getCefrRules("A1"), context: makeContext() });
    expect(repaired.sections[spec.blueprint.findIndex((s) => s.key === "construction")]!.exercises).toHaveLength(construction.exercises.length - 1);
  });

  it("keeps the number of writing tasks (AI evaluations) within the plan", () => {
    const spec = specFor("A1", 30);
    const lesson = clone(makeLesson(spec));
    const production = section(lesson, "production", spec);
    production.exercises.push({ exerciseType: "free_writing", prompt: "extra", minWords: 5, difficulty: "medium" }, { exerciseType: "free_writing", prompt: "extra 2", minWords: 4, difficulty: "medium" });
    const repaired = repairGeneratedLesson(lesson, { spec, rules: getCefrRules("A1"), context: makeContext() });
    const writing = repaired.sections.flatMap((s) => s.exercises).filter((e) => e.exerciseType === "free_writing");
    expect(writing.length).toBeLessThanOrEqual(spec.freeWriting.max);
    expect(Math.max(...writing.map((e) => e.minWords ?? 0))).toBe(spec.productionWords.main);
  });
});

describe("new exercise types", () => {
  it("word ordering needs a bank that can rebuild every accepted answer", () => {
    const ok: AIExercise = { exerciseType: "word_ordering", words: ["am", "I", "from", "Spain"], acceptedAnswers: ["I am from Spain."] };
    expect(toDbExercise(ok, 0)).not.toBeNull();
    expect(toDbExercise({ ...ok, acceptedAnswers: ["I am from Peru"] }, 0)).toBeNull();
    expect(toDbExercise({ ...ok, words: ["I", "am"] }, 0)).toBeNull();
    expect(sameWords(["am", "I"], "I am.")).toBe(true);
  });

  it("never hands the student the answer order in the word bank", () => {
    const sentence = ["I", "am", "from", "Spain"];
    for (const seed of ["a", "b", "c", "d", "e", "I am from Spain"]) {
      expect(scrambleWords(sentence, seed).join(" ")).not.toBe(sentence.join(" "));
    }
    const stored = toDbExercise({ exerciseType: "word_ordering", words: sentence, acceptedAnswers: ["I am from Spain"] }, 0);
    expect((stored!.content.words as string[]).join(" ")).not.toBe("I am from Spain");
    expect(stored!.answerKey).toEqual({ acceptedAnswers: ["I am from Spain"] });
  });

  it("corrects ordering answers without AI, ignoring case and punctuation", () => {
    const accepted = ["I am from Spain."];
    expect(matchesAnyAcceptedAnswer("i am from spain", accepted)).toBe(true);
    expect(matchesAnyAcceptedAnswer("am I from Spain", accepted)).toBe(false);
  });

  it("error correction needs a real fix and keeps the faulty sentence public", () => {
    const ok: AIExercise = { exerciseType: "grammar_error_correction", sentenceWithError: "She like tea", acceptedAnswers: ["She likes tea"], difficulty: "hard" };
    const stored = toDbExercise(ok, 3);
    expect(stored).toMatchObject({ exerciseType: "grammar_error_correction", difficulty: "hard", content: { sentenceWithError: "She like tea" } });
    expect(toDbExercise({ ...ok, acceptedAnswers: ["she like tea."] }, 0)).toBeNull();
  });

  it("writing tasks keep their sentence starters and difficulty", () => {
    const stored = toDbExercise({ exerciseType: "free_writing", prompt: "Write", minWords: 8, starters: ["My name is"], difficulty: "hard" }, 0);
    expect(stored).toMatchObject({ difficulty: "hard", content: { minWords: 8, starters: ["My name is"] }, answerKey: {} });
  });
});
