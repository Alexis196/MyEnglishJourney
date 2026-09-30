import { describe, expect, it } from "vitest";
import { generatePlanRequestSchema } from "@myenglishjourney/shared";
import { buildPlanGenerationUserPrompt } from "./planGeneration.prompt";

const validRequest = {
  occupation: "Frontend developer",
  interests: ["music", "videogames"],
  otherInterests: "chess",
  mainGoal: "job_search",
  currentLevel: "A2",
  targetLevel: "B2",
  dailyMinutesGoal: 45,
  focusAreas: ["job_interviews"],
  motivation: "I have interviews soon",
};

describe("generatePlanRequestSchema", () => {
  it("accepts a fully personalized request", () => {
    expect(generatePlanRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it("requires an occupation", () => {
    expect(generatePlanRequestSchema.safeParse({ ...validRequest, occupation: " " }).success).toBe(false);
  });

  it("rejects a target level below the current level", () => {
    const result = generatePlanRequestSchema.safeParse({ ...validRequest, currentLevel: "B2", targetLevel: "A2" });
    expect(result.success).toBe(false);
  });
});

describe("buildPlanGenerationUserPrompt", () => {
  it("includes occupation, interests and main goal", () => {
    const parsed = generatePlanRequestSchema.parse(validRequest);
    const prompt = buildPlanGenerationUserPrompt(parsed);
    expect(prompt).toContain("Occupation: Frontend developer");
    expect(prompt).toContain("Música");
    expect(prompt).toContain("chess");
    expect(prompt).toContain("Conseguir un trabajo en inglés");
  });
});
