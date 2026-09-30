import { describe, expect, it } from "vitest";
import { validateMultipleChoice } from "./multipleChoice.validator";
import { validateFillInBlank } from "./fillInBlank.validator";
import { validateTranslation } from "./translation.validator";

describe("validateMultipleChoice", () => {
  it("marks the correct option index as correct", () => {
    expect(validateMultipleChoice({ correctOptionIndex: 2 }, 2)).toEqual({ isCorrect: true, score: 100 });
  });

  it("marks any other option index as incorrect", () => {
    expect(validateMultipleChoice({ correctOptionIndex: 2 }, 0)).toEqual({ isCorrect: false, score: 0 });
  });
});

describe("validateFillInBlank", () => {
  const answerKey = { acceptedAnswers: ["go", "goes"] };

  it("accepts an exact match", () => {
    expect(validateFillInBlank(answerKey, "go").isCorrect).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(validateFillInBlank(answerKey, "GO").isCorrect).toBe(true);
  });

  it("ignores surrounding whitespace", () => {
    expect(validateFillInBlank(answerKey, "  go  ").isCorrect).toBe(true);
  });

  it("ignores trailing punctuation", () => {
    expect(validateFillInBlank(answerKey, "go.").isCorrect).toBe(true);
  });

  it("rejects an answer not in the accepted list", () => {
    expect(validateFillInBlank(answerKey, "went").isCorrect).toBe(false);
  });
});

describe("validateTranslation", () => {
  const answerKey = { acceptedAnswers: ["I work from home", "I work remotely"] };

  it("accepts any of the accepted phrasings", () => {
    expect(validateTranslation(answerKey, "I work remotely").isCorrect).toBe(true);
  });

  it("normalizes whitespace and case before comparing", () => {
    expect(validateTranslation(answerKey, "  i WORK from home  ").isCorrect).toBe(true);
  });

  it("rejects an unrelated answer", () => {
    expect(validateTranslation(answerKey, "I live in Argentina").isCorrect).toBe(false);
  });
});
