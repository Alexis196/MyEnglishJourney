import { z } from "zod";
import { LIVE_PACE_IDS, LIVE_VOICES } from "../constants/liveVoices";

export const liveSpeakingModeSchema = z.enum(["free", "scenario"]);
export type LiveSpeakingMode = z.infer<typeof liveSpeakingModeSchema>;

export const startLiveSpeakingSchema = z
  .object({
    mode: liveSpeakingModeSchema,
    scenarioId: z.string().min(1).max(60).optional(),
    /** Whether the tutor may gently correct mistakes while talking (otherwise it only does so at the end). */
    correctWhileTalking: z.boolean().default(false),
    /** One of LIVE_VOICES; the server falls back to its default when omitted. */
    voice: z.enum(LIVE_VOICES.map((voice) => voice.id) as [string, ...string[]]).optional(),
    /** How fast the tutor talks: "auto" follows the student's level. */
    pace: z.enum(LIVE_PACE_IDS).default("auto"),
  })
  .refine((value) => value.mode !== "scenario" || Boolean(value.scenarioId), {
    message: "Elegí una situación para practicar",
    path: ["scenarioId"],
  });
export type StartLiveSpeakingInput = z.infer<typeof startLiveSpeakingSchema>;

/** Everything the browser needs to open the live connection. The API key never leaves the server. */
export const startLiveSpeakingResponseSchema = z.object({
  sessionId: z.string().uuid(),
  /** Short-lived, single-use token (Gemini ephemeral auth token). */
  token: z.string().min(1),
  model: z.string(),
  voice: z.string(),
  systemInstruction: z.string(),
  maxSeconds: z.number().int().positive(),
  /** Spanish title of the situation (or null for free conversation), for the header. */
  scenarioTitle: z.string().nullable(),
});
export type StartLiveSpeakingResponse = z.infer<typeof startLiveSpeakingResponseSchema>;

export const liveTurnSchema = z.object({
  role: z.enum(["user", "tutor"]),
  text: z.string().max(2000),
});
export type LiveTurn = z.infer<typeof liveTurnSchema>;

export const endLiveSpeakingSchema = z.object({
  durationSeconds: z.number().int().min(0).max(3600),
  turns: z.array(liveTurnSchema).max(300),
});
export type EndLiveSpeakingInput = z.infer<typeof endLiveSpeakingSchema>;

export const liveSpeakingFeedbackSchema = z.object({
  summary: z.string(),
  corrections: z.array(
    z.object({
      original: z.string(),
      corrected: z.string(),
      explanation: z.string(),
    }),
  ),
  usefulPhrases: z.array(z.object({ phrase: z.string(), meaning: z.string() })),
  strengths: z.string(),
  nextStep: z.string(),
});
export type LiveSpeakingFeedback = z.infer<typeof liveSpeakingFeedbackSchema>;

export const endLiveSpeakingResponseSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.enum(["completed", "failed"]),
  durationSeconds: z.number().int(),
  feedback: liveSpeakingFeedbackSchema.nullable(),
});
export type EndLiveSpeakingResponse = z.infer<typeof endLiveSpeakingResponseSchema>;

/** Translate one thing the tutor said, so the student can understand words they do not know yet. */
export const translateLiveTurnSchema = z.object({
  text: z.string().trim().min(1).max(600),
});
export type TranslateLiveTurnInput = z.infer<typeof translateLiveTurnSchema>;

export const liveTurnTranslationSchema = z.object({
  translation: z.string(),
  /** The few words of the sentence a learner at this level is most likely not to know. */
  keyWords: z.array(z.object({ word: z.string(), meaning: z.string() })).max(5),
});
export type LiveTurnTranslation = z.infer<typeof liveTurnTranslationSchema>;
