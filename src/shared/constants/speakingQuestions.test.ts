import { describe, expect, it } from "vitest";
import { pickSpeakingQuestion, SPEAKING_QUESTIONS, speakingBandFor, speakingTopicsFor } from "./speakingQuestions";

const never = () => 0.99; // always the general pool
const always = () => 0; // always the personal pool when one exists

describe("speaking questions", () => {
  it("every question has an English text and a Spanish translation", () => {
    for (const item of SPEAKING_QUESTIONS) {
      expect(item.en.length).toBeGreaterThan(5);
      expect(item.es.length).toBeGreaterThan(5);
      expect(item.es).not.toBe(item.en);
    }
  });

  it("matches the band to the CEFR level", () => {
    expect(speakingBandFor("A1")).toBe("basic");
    expect(speakingBandFor("B2")).toBe("mid");
    expect(speakingBandFor("C1")).toBe("advanced");
    expect(speakingBandFor(null)).toBe("basic");
  });

  it("never offers technology or workplace questions to a student who did not ask for them", () => {
    const topics = speakingTopicsFor({ interests: ["music", "travel"], primaryGoal: "personal_growth" });
    expect(topics).not.toContain("tech");
    expect(topics).not.toContain("work");
    for (let i = 0; i < 200; i++) {
      for (const level of ["A1", "B1", "C1"] as const) {
        const question = pickSpeakingQuestion({ level, topics });
        expect(["tech", "work"]).not.toContain(question.topic);
      }
    }
  });

  it("offers technology questions when the student chose technology", () => {
    const topics = speakingTopicsFor({ interests: ["technology"] });
    expect(topics).toContain("tech");
    const picked = pickSpeakingQuestion({ level: "B1", topics, random: always });
    expect(picked.topic).toBe("tech");
  });

  it("uses the student's profession and goals to unlock work questions", () => {
    expect(speakingTopicsFor({ profession: "nurse" })).toContain("work");
    expect(speakingTopicsFor({ primaryGoal: "job_search" })).toContain("work");
    expect(speakingTopicsFor({ focusAreas: ["travel"] })).toContain("travel");
  });

  it("asks easier questions at A1 than at C1", () => {
    const a1 = pickSpeakingQuestion({ level: "A1", topics: ["general"], random: never });
    const c1 = pickSpeakingQuestion({ level: "C1", topics: ["general"], random: never });
    expect(a1.band).toBe("basic");
    expect(c1.band).toBe("advanced");
    const average = (band: string) => {
      const pool = SPEAKING_QUESTIONS.filter((item) => item.band === band);
      return pool.reduce((sum, item) => sum + item.en.split(" ").length, 0) / pool.length;
    };
    expect(average("basic")).toBeLessThan(average("mid"));
    expect(average("mid")).toBeLessThan(average("advanced"));
  });

  it("does not repeat the current question", () => {
    const topics = speakingTopicsFor({});
    const first = pickSpeakingQuestion({ level: "A1", topics, random: never });
    for (let i = 0; i < 50; i++) {
      expect(pickSpeakingQuestion({ level: "A1", topics, excludeEn: first.en }).en).not.toBe(first.en);
    }
  });
});
