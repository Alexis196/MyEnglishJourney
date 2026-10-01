import { describe, expect, it } from "vitest";
import { buildPlanGenerationSystemPrompt, buildPlanGenerationUserPrompt } from "../ai/prompts/planGeneration.prompt";
import { buildSpeakingAnalysisSystemPrompt } from "../ai/prompts/speakingAnalysis.prompt";
import { buildWritingFeedbackSystemPrompt, TUTOR_PERSONA } from "../ai/prompts/systemPrompts";
import { buildLessonSpec } from "./lessonDuration";
import { buildLessonSystemPrompt, buildLessonUserPrompt } from "./lessonPrompt";
import { computePerformance, describePerformance, type AttemptSample } from "./performance";
import { describeReviewItems, selectReviewItems, type HistoricAttempt, type HistoricExercise } from "./reviewSelection";
import { makeContext } from "./testFactories";

const sample = (id: string, isCorrect: boolean | null, exerciseType = "multiple_choice", sectionType: string | null = "grammar"): AttemptSample => ({
  exerciseId: id,
  isCorrect,
  exerciseType,
  sectionType,
});

describe("adaptive difficulty", () => {
  it("does not change anything without enough history", () => {
    const summary = computePerformance([sample("1", false), sample("2", false), sample("3", true)]);
    expect(summary.mode).toBe("steady");
  });

  it("reinforces after consistently low results", () => {
    const samples = Array.from({ length: 20 }, (_, i) => sample(`e${i}`, i % 5 === 0));
    const summary = computePerformance(samples);
    expect(summary.mode).toBe("reinforce");
    expect(summary.weakSkills).toContain("grammar");
    expect(describePerformance(summary)).toContain("simpler examples");
  });

  it("adds challenge only after consistently high results", () => {
    const samples = Array.from({ length: 20 }, (_, i) => sample(`e${i}`, i !== 7));
    expect(computePerformance(samples).mode).toBe("challenge");
  });

  it("is not swayed by a single bad activity", () => {
    const samples = [sample("bad", false), ...Array.from({ length: 19 }, (_, i) => sample(`ok${i}`, true))];
    expect(computePerformance(samples).mode).not.toBe("reinforce");
  });

  it("counts only the latest result of each exercise", () => {
    const summary = computePerformance([sample("x", true), sample("x", false), sample("x", false)]);
    expect(summary.attempts).toBe(1);
    expect(summary.accuracy).toBe(1);
  });

  it("tracks skills separately", () => {
    const grammarBad = Array.from({ length: 6 }, (_, i) => sample(`g${i}`, false, "multiple_choice", "grammar"));
    const vocabGood = Array.from({ length: 6 }, (_, i) => sample(`v${i}`, true, "multiple_choice", "vocabulary"));
    const summary = computePerformance([...grammarBad, ...vocabGood]);
    expect(summary.weakSkills).toEqual(["grammar"]);
    expect(summary.strongSkills).toEqual(["vocabulary"]);
  });
});

const exercise = (id: string, dayNumber: number, prompt: string, vocab: string[] = []): HistoricExercise => ({
  id,
  dayNumber,
  exerciseType: "multiple_choice",
  content: { prompt, options: ["is", "are", "am"] },
  answerKey: { correctOptionIndex: 0 },
  sectionVocabulary: vocab.map((term) => ({ term })),
});
const wrong = (exerciseId: string, at = "2026-01-02T10:00:00Z"): HistoricAttempt => ({
  exerciseId,
  isCorrect: false,
  response: { selectedOptionIndex: 1 },
  submittedAt: at,
});

describe("review selection", () => {
  it("brings back yesterday's mistakes", () => {
    const selection = selectReviewItems({
      dayNumber: 5,
      exercises: [exercise("a", 4, "She ___ a nurse."), exercise("b", 4, "He ___ tall.")],
      attempts: [wrong("a"), wrong("b")],
    });
    expect(selection.items.map((item) => item.daysAgo)).toEqual([1, 1]);
    expect(selection.items[0]).toMatchObject({ question: "She ___ a nurse.", studentAnswer: "are", expectedAnswer: "is" });
  });

  it("can bring back items from 3 and 7 days ago, with small limits", () => {
    const exercises = [
      ...Array.from({ length: 5 }, (_, i) => exercise(`d3-${i}`, 7, `three ${i}`)),
      ...Array.from({ length: 5 }, (_, i) => exercise(`d7-${i}`, 3, `seven ${i}`)),
      exercise("d1", 9, "yesterday"),
    ];
    const attempts = exercises.map((e) => wrong(e.id));
    const selection = selectReviewItems({ dayNumber: 10, exercises, attempts });
    expect(selection.items.filter((i) => i.daysAgo === 1)).toHaveLength(1);
    expect(selection.items.filter((i) => i.daysAgo === 3)).toHaveLength(2);
    expect(selection.items.filter((i) => i.daysAgo === 7)).toHaveLength(2);
  });

  it("ignores correct answers and mistakes that were fixed on a retry", () => {
    const selection = selectReviewItems({
      dayNumber: 3,
      exercises: [exercise("a", 2, "A"), exercise("b", 2, "B")],
      attempts: [
        wrong("a", "2026-01-02T10:00:00Z"),
        { exerciseId: "a", isCorrect: true, response: { selectedOptionIndex: 0 }, submittedAt: "2026-01-02T10:05:00Z" },
        { exerciseId: "b", isCorrect: true, response: { selectedOptionIndex: 0 }, submittedAt: "2026-01-02T10:00:00Z" },
      ],
    });
    expect(selection.items).toEqual([]);
  });

  it("does not look before day 1 and is empty without history", () => {
    expect(selectReviewItems({ dayNumber: 1, exercises: [], attempts: [] })).toEqual({ items: [], weakVocabulary: [] });
    expect(selectReviewItems({ dayNumber: 2, exercises: [exercise("a", 5, "x")], attempts: [wrong("a")] }).items).toEqual([]);
  });

  it("surfaces weak vocabulary tied to the failed exercises", () => {
    const selection = selectReviewItems({
      dayNumber: 3,
      exercises: [exercise("a", 2, "I like my apple.", ["apple", "banana"])],
      attempts: [wrong("a")],
    });
    expect(selection.weakVocabulary).toEqual(["apple"]);
  });
});

describe("prompts", () => {
  it("never assume a profession or a technology background", () => {
    const prompts = [
      TUTOR_PERSONA,
      buildPlanGenerationSystemPrompt(),
      buildLessonSystemPrompt(),
      buildSpeakingAnalysisSystemPrompt("es"),
      buildWritingFeedbackSystemPrompt("es"),
    ].join("\n");
    expect(prompts).not.toMatch(/software professional/i);
    expect(prompts).not.toMatch(/Favor vocabulary and scenarios/i);
  });

  it("a student with no profession gets an explicit 'do not invent' instruction and no tech", () => {
    const spec = buildLessonSpec({ minutes: 30, level: "A1", dayType: "lesson" });
    const prompt = buildLessonUserPrompt({ context: makeContext({ interests: ["music"] }), spec });
    expect(prompt).toContain("Occupation: not provided — do not assume or invent one");
    expect(prompt).toMatch(/Do NOT use: programming/);
    expect(prompt).toMatch(/Do NOT use:.*workplace/);
    expect(prompt).not.toMatch(/developer|software engineer/i);
  });

  it("different interests produce different lesson contexts", () => {
    const spec = buildLessonSpec({ minutes: 30, level: "A2", dayType: "lesson" });
    const music = buildLessonUserPrompt({ context: makeContext({ cefrLevel: "A2", interests: ["music"] }), spec });
    const travel = buildLessonUserPrompt({ context: makeContext({ cefrLevel: "A2", interests: ["travel"], learningGoal: "travel" }), spec });
    expect(music).toContain("Interests: Música");
    expect(travel).toContain("Interests: Viajes");
    expect(music).not.toContain("Viajes");
    expect(travel).not.toContain("Música");
  });

  it("allows technology scenarios only when the student's own data asks for them", () => {
    const spec = buildLessonSpec({ minutes: 30, level: "B1", dayType: "lesson" });
    const tech = buildLessonUserPrompt({
      context: makeContext({ cefrLevel: "B1", interests: ["technology"], profession: "Data analyst", preferredTopics: ["work_meetings"] }),
      spec,
    });
    expect(tech).toContain("Occupation: Data analyst");
    expect(tech).not.toMatch(/Do NOT use: programming/);
  });

  it("carries the level, the session size and the earlier mistakes into the prompt", () => {
    const spec = buildLessonSpec({ minutes: 60, level: "B1", dayType: "lesson" });
    const review = selectReviewItems({ dayNumber: 3, exercises: [exercise("a", 2, "She ___ a nurse.")], attempts: [wrong("a")] });
    const prompt = buildLessonUserPrompt({ context: makeContext({ cefrLevel: "B1", minutesPerLesson: 60, review }), spec });
    expect(prompt).toContain("CEFR level: B1");
    expect(prompt).toContain(`Total exercises: ${spec.exercises.min}-${spec.exercises.max}`);
    expect(prompt).toContain("She ___ a nurse.");
    expect(describeReviewItems(review)).toContain("student answered");
  });

  it("without history, asks for a general warm-up review", () => {
    const spec = buildLessonSpec({ minutes: 30, level: "A1", dayType: "lesson" });
    expect(buildLessonUserPrompt({ context: makeContext(), spec })).toContain("No earlier mistakes on record");
  });

  it("feeds validation problems back on a retry", () => {
    const spec = buildLessonSpec({ minutes: 30, level: "A1", dayType: "lesson" });
    const prompt = buildLessonUserPrompt({ context: makeContext(), spec, repairNotes: ["Use 10-14 exercises in total."] });
    expect(prompt).toContain("FIX THESE PROBLEMS");
    expect(prompt).toContain("Use 10-14 exercises in total.");
  });

  it("plan prompt does not invent a profession either", () => {
    const prompt = buildPlanGenerationUserPrompt({
      interests: ["music"],
      mainGoal: "personal_growth",
      currentLevel: "A1",
      targetLevel: "A2",
      dailyMinutesGoal: 30,
      focusAreas: ["daily_routines"],
    });
    expect(prompt).toContain("Occupation: not provided");
  });
});
