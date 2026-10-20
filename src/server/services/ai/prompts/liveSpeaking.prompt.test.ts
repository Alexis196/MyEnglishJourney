import { describe, expect, it } from "vitest";
import { CEFR_LEVELS, LIVE_SCENARIOS } from "@myenglishjourney/shared";
import { buildLiveFeedbackSystemPrompt, buildLiveFeedbackUserPrompt, buildLiveTutorInstruction } from "./liveSpeaking.prompt";

const base = { level: "A1" as const, explanationLanguage: "es" as const, interests: [], recentMistakes: [] };

describe("live tutor instruction", () => {
  it("adapts the way the tutor speaks to every CEFR level", () => {
    const texts = CEFR_LEVELS.map((level) => buildLiveTutorInstruction({ profile: { ...base, level }, correctWhileTalking: false, maxSeconds: 300 }));
    expect(new Set(texts).size).toBe(CEFR_LEVELS.length);
    expect(texts[0]).toContain("STUDENT LEVEL (CEFR): A1");
    expect(texts[0]).toContain("very short, simple sentences");
    expect(texts[5]).toContain("native speed");
  });

  it("uses only what the student shared and never invents a job or hobbies", () => {
    const empty = buildLiveTutorInstruction({ profile: base, correctWhileTalking: false, maxSeconds: 300 });
    expect(empty).toContain("has not shared personal details");
    expect(empty).not.toContain("Occupation");

    const full = buildLiveTutorInstruction({
      profile: { ...base, profession: "nurse", interests: ["music", "travel"], goal: "career" },
      correctWhileTalking: false,
      maxSeconds: 300,
    });
    expect(full).toContain("Occupation: nurse");
    expect(full).toContain("Interests: music, travel");
    expect(full).not.toContain("has not shared personal details");
  });

  it("weaves the student's real mistakes into the practice without quizzing them", () => {
    const text = buildLiveTutorInstruction({
      profile: { ...base, recentMistakes: [{ original: "I am agree", corrected: "I agree" }] },
      correctWhileTalking: false,
      maxSeconds: 300,
    });
    expect(text).toContain('"I am agree" -> "I agree"');
    expect(text).toContain("never quiz them");
  });

  it("corrects at the end by default and gently while talking when asked", () => {
    const quiet = buildLiveTutorInstruction({ profile: base, correctWhileTalking: false, maxSeconds: 300 });
    const live = buildLiveTutorInstruction({ profile: base, correctWhileTalking: true, maxSeconds: 300 });
    expect(quiet).toContain("do NOT correct the student while they speak");
    expect(live).toContain("gently model the correct form");
  });

  it("plays the chosen role in a scenario and talks freely otherwise", () => {
    const scenario = LIVE_SCENARIOS.find((item) => item.id === "coffee_shop")!;
    const text = buildLiveTutorInstruction({ profile: base, scenario, correctWhileTalking: false, maxSeconds: 300 });
    expect(text).toContain("ROLE-PLAY");
    expect(text).toContain("barista");
    expect(buildLiveTutorInstruction({ profile: base, correctWhileTalking: false, maxSeconds: 300 })).toContain("FREE CONVERSATION");
  });

  it("never claims to judge pronunciation and keeps turns short", () => {
    const text = buildLiveTutorInstruction({ profile: base, correctWhileTalking: false, maxSeconds: 300 });
    expect(text).toContain("cannot judge pronunciation");
    expect(text).toContain("one to three sentences");
    expect(text).toContain("about 5 minutes");
  });
});

describe("live feedback prompts", () => {
  it("analyses a transcript, not audio, and returns the agreed shape", () => {
    const system = buildLiveFeedbackSystemPrompt("es");
    expect(system).toContain("never claim to have evaluated pronunciation");
    expect(system).toContain('"corrections"');
    expect(system).toContain("Spanish");
    expect(buildLiveFeedbackSystemPrompt("en")).toContain("Write everything in English");
  });

  it("keeps polite-but-correct phrasing out of the error list", () => {
    const system = buildLiveFeedbackSystemPrompt("es");
    expect(system).toContain("ONLY real grammar or vocabulary mistakes");
    expect(system).toContain("is NOT a mistake");
    expect(system).toContain("single corrected sentence");
  });

  it("labels each side of the conversation", () => {
    const user = buildLiveFeedbackUserPrompt({
      level: "A2",
      scenarioTitle: "Pedir en una cafetería",
      turns: [
        { role: "tutor", text: "What would you like?" },
        { role: "user", text: "I want a coffee please" },
      ],
    });
    expect(user).toContain("TUTOR: What would you like?");
    expect(user).toContain("STUDENT: I want a coffee please");
    expect(user).toContain("Student CEFR level: A2");
  });
});
