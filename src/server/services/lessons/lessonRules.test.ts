import { describe, expect, it } from "vitest";
import { CEFR_LEVELS } from "@myenglishjourney/shared";
import { CEFR_RULES, describeCefrRules, getCefrRules } from "./cefrRules";
import { buildLessonSpec, estimateLessonMinutes, DURATION_TOLERANCE, tierForMinutes, TIER_CONFIG } from "./lessonDuration";
import { allowsTechContext, allowsWorkContext, resolvePersonalization } from "./learningContext";
import { allIssues, repairGeneratedLesson, validateGeneratedLesson } from "./lessonValidator";
import { makeContext, makeLesson } from "./testFactories";

const validate = (lesson: ReturnType<typeof makeLesson>, level: Parameters<typeof getCefrRules>[0], minutes: number, ctx = makeContext({ cefrLevel: level ?? "A1", minutesPerLesson: minutes })) => {
  const spec = buildLessonSpec({ minutes, level: level ?? "A1", dayType: "lesson" });
  return validateGeneratedLesson(lesson, { spec, rules: getCefrRules(level), context: ctx });
};

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

  it("describes the level for the prompt", () => {
    const text = describeCefrRules(getCefrRules("A1"));
    expect(text).toContain("CEFR level: A1");
    expect(text).toContain("at most 8 words");
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
    const at = (minutes: number) => buildLessonSpec({ minutes, level: "B1", dayType: "lesson" });
    expect(at(30).exercises.max).toBeLessThan(at(60).exercises.min);
    expect(at(60).exercises.max).toBeLessThan(at(90).exercises.min);
    expect(at(30).reviewExercises).toBeLessThan(at(90).reviewExercises);
    expect(at(30).vocabulary.max).toBeLessThan(at(90).vocabulary.max);
  });

  it("caps vocabulary and writing by level whatever the minutes", () => {
    const a1 = buildLessonSpec({ minutes: 90, level: "A1", dayType: "lesson" });
    expect(a1.vocabulary.max).toBe(CEFR_RULES.A1.maxNewWords);
    expect(a1.freeWriting.max).toBe(CEFR_RULES.A1.maxFreeWriting);
  });

  it("review and assessment days change the required structure", () => {
    expect(buildLessonSpec({ minutes: 60, level: "A2", dayType: "assessment" }).requiredSections).toContain("final_assessment");
    expect(buildLessonSpec({ minutes: 60, level: "A2", dayType: "review" }).requiredSections).not.toContain("grammar");
  });

  it("a lesson built to each tier's midpoint lands inside the duration tolerance", () => {
    for (const minutes of [30, 45, 60, 90]) {
      const spec = buildLessonSpec({ minutes, level: "B1", dayType: "lesson" });
      const estimate = estimateLessonMinutes(makeLesson(spec, "B1"));
      expect(estimate, `${minutes} min`).toBeGreaterThanOrEqual(minutes * DURATION_TOLERANCE.min);
      expect(estimate, `${minutes} min`).toBeLessThanOrEqual(minutes * DURATION_TOLERANCE.max);
    }
    expect(Object.keys(TIER_CONFIG)).toHaveLength(4);
  });
});

describe("lesson validation", () => {
  it("accepts a well-formed A1 lesson", () => {
    const spec = buildLessonSpec({ minutes: 30, level: "A1", dayType: "lesson" });
    expect(allIssues(validate(makeLesson(spec, "A1"), "A1", 30))).toEqual([]);
  });

  it("flags too-long English sentences for A1 but accepts them for B2", () => {
    const spec = buildLessonSpec({ minutes: 30, level: "A1", dayType: "lesson" });
    const lesson = makeLesson(spec, "A1");
    const long = "Although it was raining heavily yesterday evening, my friends and I decided to walk to the old cinema downtown.";
    for (const section of lesson.sections) if (section.examples) section.examples = [long, long, long];

    expect(validate(lesson, "A1", 30).hard.join(" ")).toMatch(/at most 8 words/);

    const specB2 = buildLessonSpec({ minutes: 30, level: "B2", dayType: "lesson" });
    const b2 = makeLesson(specB2, "B2");
    for (const section of b2.sections) if (section.examples) section.examples = [long];
    expect(allIssues(validate(b2, "B2", 30)).join(" ")).not.toMatch(/words per|at most \d+ words/);
  });

  it("requires Spanish explanations at A1", () => {
    const spec = buildLessonSpec({ minutes: 30, level: "A1", dayType: "lesson" });
    const lesson = makeLesson(spec, "A1");
    for (const section of lesson.sections) {
      if (section.explanation) section.explanation = "We use the verb to be to say who a person is and where they come from today.";
    }
    expect(validate(lesson, "A1", 30).hard.join(" ")).toMatch(/Spanish/);
  });

  it("rejects free writing that is too demanding for the level", () => {
    const spec = buildLessonSpec({ minutes: 60, level: "A1", dayType: "lesson" });
    const lesson = makeLesson(spec, "A1");
    for (const section of lesson.sections) for (const e of section.exercises) if (e.exerciseType === "free_writing") e.minWords = 50;
    expect(allIssues(validate(lesson, "A1", 60)).join(" ")).toMatch(/minWords/);
  });

  it("does not let programming content through unless the student chose it", () => {
    const spec = buildLessonSpec({ minutes: 30, level: "A2", dayType: "lesson" });
    const lesson = makeLesson(spec, "A2");
    lesson.sections[1]!.examples = ["I am a software developer."];
    const without = makeContext({ cefrLevel: "A2", interests: ["music"] });
    expect(validate(lesson, "A2", 30, without).hard.join(" ")).toMatch(/programming|software/i);

    const withTech = makeContext({ cefrLevel: "A2", interests: ["technology"] });
    expect(validate(lesson, "A2", 30, withTech).hard.join(" ")).not.toMatch(/programming|software/i);
  });

  it("does not let workplace content through without a profession or work goal", () => {
    const spec = buildLessonSpec({ minutes: 30, level: "A2", dayType: "lesson" });
    const lesson = makeLesson(spec, "A2");
    lesson.sections[1]!.examples = ["My boss has a meeting with the manager."];
    expect(validate(lesson, "A2", 30, makeContext({ cefrLevel: "A2" })).hard.join(" ")).toMatch(/workplace/);
    expect(validate(lesson, "A2", 30, makeContext({ cefrLevel: "A2", profession: "nurse" })).hard.join(" ")).not.toMatch(/workplace/);
  });

  it("flags a lesson that is far shorter than the session", () => {
    const spec = buildLessonSpec({ minutes: 90, level: "B1", dayType: "lesson" });
    const small = makeLesson(buildLessonSpec({ minutes: 30, level: "B1", dayType: "lesson" }), "B1");
    const result = validate(small, "B1", 90, makeContext({ cefrLevel: "B1", minutesPerLesson: 90 }));
    expect(allIssues(result).join(" ")).toMatch(/exercises|minutes/);
    expect(spec.tier).toBe(90);
  });

  it("repairs unusable exercises deterministically", () => {
    const spec = buildLessonSpec({ minutes: 30, level: "A1", dayType: "lesson" });
    const lesson = makeLesson(spec, "A1");
    lesson.sections[0]!.exercises.push({ exerciseType: "multiple_choice", prompt: "bad", options: ["a", "b", "c"], correctOptionIndex: 9 });
    const repaired = repairGeneratedLesson(lesson, { spec, rules: getCefrRules("A1"), context: makeContext() });
    expect(repaired.sections[0]!.exercises.some((e) => e.prompt === "bad")).toBe(false);
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
