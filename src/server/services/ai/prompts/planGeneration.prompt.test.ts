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

  it("treats the occupation as optional and never invents one", () => {
    for (const occupation of [" ", "", undefined]) {
      const result = generatePlanRequestSchema.safeParse({ ...validRequest, occupation });
      expect(result.success).toBe(true);
      expect(result.success && result.data.occupation).toBeUndefined();
    }
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

  it("states that no occupation was provided instead of making one up", () => {
    const parsed = generatePlanRequestSchema.parse({ ...validRequest, occupation: "" });
    const prompt = buildPlanGenerationUserPrompt(parsed);
    expect(prompt).toContain("Occupation: not provided");
    expect(prompt).not.toMatch(/developer|programmer|software/i);
  });
});
