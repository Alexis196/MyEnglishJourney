import { describe, expect, it } from "vitest";
import { CEFR_LEVELS } from "@myenglishjourney/shared";
import { CEFR_RULES, describeCefrRules, getCefrRules } from "./cefrRules";
import { buildLessonSpec } from "./lessonBlueprint";
import { DURATION_TOLERANCE, estimateLessonMinutes, tierForMinutes, TIER_CONFIG } from "./lessonDuration";
import { allowsTechContext, allowsWorkContext, resolvePersonalization } from "./learningContext";
import { makeLesson } from "./testFactories";

describe("CEFR rules", () => {
  it("get stricter sentence limits and more freedom as the level rises", () => {
    const lengths = CEFR_LEVELS.map((level) => CEFR_RULES[level].maxWordsPerSentence);
    expect(lengths).toEqual([...lengths].sort((a, b) => a - b));
    expect(CEFR_RULES.A1.maxWordsPerSentence).toBeLessThan(CEFR_RULES.B1.maxWordsPerSentence);
    expect(CEFR_RULES.A1.maxNewWords).toBeLessThan(CEFR_RULES.C1.maxNewWords);
  });

  it("A1/A2 lean on Spanish; B2+ do not", () => {
    expect(CEFR_RULES.A1.instructionLanguage).toBe("spanish");
    expect(CEFR_RULES.A2.instructionLanguage).toBe("mostly_spanish");
    expect(CEFR_RULES.B2.instructionLanguage).toBe("mostly_english");
    expect(CEFR_RULES.C1.instructionLanguage).toBe("english");
  });

  it("uses the approved own-production ladder", () => {
    const main = (level: (typeof CEFR_LEVELS)[number]) => CEFR_RULES[level].production.main;
    expect(main("A1")).toEqual({ min: 8, max: 20 });
    expect(main("A2")).toEqual({ min: 20, max: 50 });
    expect(main("B1")).toEqual({ min: 50, max: 90 });
    expect(main("B2")).toEqual({ min: 90, max: 150 });
    expect(main("C1")).toEqual({ min: 140, max: 220 });
    expect(main("C2")).toEqual({ min: 180, max: 280 });
  });

  it("production grows with the level and short answers always stay below the main task", () => {
    let previousMax = 0;
    for (const level of CEFR_LEVELS) {
      const { main, short } = CEFR_RULES[level].production;
      expect(main.max).toBeGreaterThan(previousMax);
      expect(short.max).toBeLessThanOrEqual(main.min);
      previousMax = main.max;
    }
  });

  it("only A1/A2 require the grammar pattern and A1 keeps scaffolding", () => {
    expect(CEFR_LEVELS.filter((level) => CEFR_RULES[level].requiresPattern)).toEqual(["A1", "A2"]);
    expect(CEFR_RULES.A1.starters).toBe("always");
    expect(CEFR_RULES.B1.starters).toBe("never");
  });

  it("describes the level for the prompt", () => {
    const text = describeCefrRules(getCefrRules("A1"));
    expect(text).toContain("CEFR level: A1");
    expect(text).toContain("at most 8 words");
    expect(text).toContain("2 to 4 simple sentences");
  });
});

describe("session length", () => {
  it("snaps arbitrary minutes to the closest tier", () => {
    expect(tierForMinutes(20)).toBe(30);
    expect(tierForMinutes(40)).toBe(45);
    expect(tierForMinutes(60)).toBe(60);
    expect(tierForMinutes(120)).toBe(90);
  });

  it("30 minutes means less practice than 60 or 90", () => {
    const at = (minutes: number) => buildLessonSpec({ minutes, level: "A2", dayType: "lesson" });
    expect(at(30).exercises.max).toBeLessThan(at(60).exercises.min);
    expect(at(60).exercises.max).toBeLessThan(at(90).exercises.min);
    expect(at(30).reviewExercises).toBeLessThan(at(90).reviewExercises);
    expect(at(30).vocabulary.max).toBeLessThan(at(90).vocabulary.max);
  });

  it("caps vocabulary and writing tasks by level whatever the minutes", () => {
    const a1 = buildLessonSpec({ minutes: 90, level: "A1", dayType: "lesson" });
    expect(a1.vocabulary.max).toBe(CEFR_RULES.A1.maxNewWords);
    expect(a1.freeWriting.max).toBeLessThanOrEqual(CEFR_RULES.A1.maxFreeWriting);
    expect(a1.production.main).toBeGreaterThanOrEqual(1);
  });

  it("the writing target grows with the session but stays inside the level's range", () => {
    for (const level of CEFR_LEVELS) {
      const { main } = CEFR_RULES[level].production;
      const words = [30, 45, 60, 90].map((minutes) => buildLessonSpec({ minutes, level, dayType: "lesson" }).productionWords.main);
      expect(words).toEqual([...words].sort((a, b) => a - b));
      expect(words[0]).toBeGreaterThanOrEqual(main.min);
      expect(words.at(-1)).toBeLessThanOrEqual(main.max);
    }
    // A1 prioritises a few correct sentences over volume: even 90 minutes asks for a short text.
    expect(buildLessonSpec({ minutes: 90, level: "A1", dayType: "lesson" }).productionWords.main).toBeLessThanOrEqual(20);
  });

  it("a lesson built to each blueprint lands inside the duration tolerance, at every level", () => {
    for (const level of CEFR_LEVELS) {
      for (const minutes of [30, 45, 60, 90]) {
        const spec = buildLessonSpec({ minutes, level, dayType: "lesson" });
        const estimate = estimateLessonMinutes(makeLesson(spec));
        expect(estimate, `${level} ${minutes} min`).toBeGreaterThanOrEqual(minutes * DURATION_TOLERANCE.min);
        expect(estimate, `${level} ${minutes} min`).toBeLessThanOrEqual(minutes * DURATION_TOLERANCE.max);
      }
    }
    expect(Object.keys(TIER_CONFIG)).toHaveLength(4);
  });

  it("minutes are interaction time: a long session adds practice, not longer explanations", () => {
    const short = buildLessonSpec({ minutes: 30, level: "A2", dayType: "lesson" });
    const long = buildLessonSpec({ minutes: 90, level: "A2", dayType: "lesson" });
    expect(long.exercises.min).toBeGreaterThan(short.exercises.max);
    const explanations = (spec: typeof short) => spec.blueprint.filter((section) => section.explanation).length;
    expect(explanations(long)).toBe(explanations(short));
  });
});

describe("lesson blueprint", () => {
  it("keeps the six-section structure and walks recognition -> guided -> construction -> production -> assessment", () => {
    const spec = buildLessonSpec({ minutes: 60, level: "A2", dayType: "lesson" });
    expect(spec.blueprint.map((section) => section.key)).toEqual([
      "review",
      "vocabulary",
      "grammar",
      "construction",
      "production",
      "assessment",
    ]);
    expect(spec.blueprint.map((section) => section.stage)).toEqual([
      "recognition",
      "recognition",
      "guided",
      "construction",
      "production",
      "assessment",
    ]);
  });

  it("never plans a Speaking or Listening section (no oral interaction in the lesson)", () => {
    for (const level of CEFR_LEVELS) {
      for (const dayType of ["lesson", "review", "assessment"] as const) {
        const spec = buildLessonSpec({ minutes: 60, level, dayType });
        expect(spec.allowedSections).not.toContain("speaking");
        expect(spec.blueprint.map((section) => section.sectionType)).not.toContain("speaking" as never);
      }
    }
  });

  it("every lesson plans real production and a final assessment with little multiple choice", () => {
    for (const level of CEFR_LEVELS) {
      const spec = buildLessonSpec({ minutes: 45, level, dayType: "lesson" });
      const production = spec.blueprint.find((section) => section.key === "production");
      const assessment = spec.blueprint.find((section) => section.key === "assessment");
      expect(production?.production?.main).toBeGreaterThanOrEqual(1);
      expect(assessment!.maxMultipleChoice).toBeLessThanOrEqual(Math.floor(assessment!.count / 3));
      expect(assessment!.minConstructive).toBeGreaterThanOrEqual(1);
    }
  });

  it("difficulty windows rise from section to section", () => {
    const spec = buildLessonSpec({ minutes: 60, level: "B1", dayType: "lesson" });
    const first = spec.blueprint[0]!.difficulties;
    const last = spec.blueprint.at(-1)!.difficulties;
    expect(first).toContain("easy");
    expect(last).not.toContain("easy");
    expect(spec.blueprint.find((section) => section.key === "construction")!.maxMultipleChoice).toBe(0);
  });

  it("requires the visual pattern for A1/A2 grammar only", () => {
    const grammar = (level: (typeof CEFR_LEVELS)[number]) =>
      buildLessonSpec({ minutes: 45, level, dayType: "lesson" }).blueprint.find((section) => section.key === "grammar")!;
    expect(grammar("A1").requiresPattern).toBe(true);
    expect(grammar("A2").requiresPattern).toBe(true);
    expect(grammar("B1").requiresPattern).toBe(false);
  });

  it("adds a second building round only in 90-minute sessions", () => {
    const keys = (minutes: number) => buildLessonSpec({ minutes, level: "B1", dayType: "lesson" }).blueprint.map((s) => s.key);
    expect(keys(60)).not.toContain("construction_2");
    expect(keys(90)).toContain("construction_2");
  });

  it("review and assessment days reshape the lesson (no new grammar/vocabulary)", () => {
    const review = buildLessonSpec({ minutes: 60, level: "A2", dayType: "review" });
    const assessment = buildLessonSpec({ minutes: 60, level: "A2", dayType: "assessment" });
    expect(review.blueprint.map((s) => s.key)).toEqual(["review", "construction", "production", "assessment"]);
    expect(review.vocabulary.max).toBe(0);
    const weight = (spec: typeof review) => spec.blueprint.find((s) => s.key === "assessment")!.count;
    expect(weight(assessment)).toBeGreaterThan(weight(review));
  });

  it("scales the number of writing tasks (AI evaluations) within the level's cap", () => {
    for (const level of CEFR_LEVELS) {
      for (const minutes of [30, 90]) {
        const spec = buildLessonSpec({ minutes, level, dayType: "lesson" });
        expect(spec.freeWriting.max).toBeLessThanOrEqual(CEFR_RULES[level].maxFreeWriting);
      }
    }
  });
});

describe("personal context", () => {
  it("falls back to neutral defaults when a plan has no personalization", () => {
    const resolved = resolvePersonalization(null, { focus_areas: ["travel", "not-an-area"], daily_minutes_goal: 45 });
    expect(resolved.profession).toBeUndefined();
    expect(resolved.interests).toEqual([]);
    expect(resolved.focusAreas).toEqual(["travel"]);
    expect(resolved.minutesPerSession).toBe(45);
  });

  it("uses neutral defaults when there is nothing at all", () => {
    const resolved = resolvePersonalization(undefined, null);
    expect(resolved).toMatchObject({ interests: [], focusAreas: [], minutesPerSession: 30 });
    expect(resolved.profession).toBeUndefined();
  });

  it("reads stored personalization as structured fields", () => {
    const stored = { profession: "nurse", interests: ["music"], primaryGoal: "travel", focusAreas: ["travel"], minutesPerSession: 60 };
    expect(resolvePersonalization(stored, null)).toMatchObject(stored);
  });

  it("allows technology/work context only from the student's own data", () => {
    expect(allowsTechContext({ interests: [], preferredTopics: [], profession: undefined, otherInterests: undefined })).toBe(false);
    expect(allowsTechContext({ interests: ["technology"], preferredTopics: [], profession: undefined, otherInterests: undefined })).toBe(true);
    expect(allowsTechContext({ interests: [], preferredTopics: [], profession: "Backend developer", otherInterests: undefined })).toBe(true);
    expect(allowsWorkContext({ preferredTopics: [], profession: undefined, learningGoal: "travel" })).toBe(false);
    expect(allowsWorkContext({ preferredTopics: [], profession: undefined, learningGoal: "job_search" })).toBe(true);
  });
});
