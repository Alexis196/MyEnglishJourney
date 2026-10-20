import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CEFR_LEVELS,
  getLiveScenario,
  liveSpeakingFeedbackSchema,
  type CefrLevel,
  type EndLiveSpeakingInput,
  type EndLiveSpeakingResponse,
  type LiveSpeakingFeedback,
  type StartLiveSpeakingInput,
  type StartLiveSpeakingResponse,
} from "@myenglishjourney/shared";
import { env } from "../config/env";
import { AppError, BudgetExceededError, ConflictError, NotFoundError } from "../utils/AppError";
import { logger } from "../utils/logger";
import { aiUsageLogRepository } from "../repositories/aiUsageLog.repository";
import { errorJournalRepository } from "../repositories/errorJournal.repository";
import { learningPlanRepository } from "../repositories/learningPlan.repository";
import { liveSpeakingSessionRepository, type LiveSpeakingSessionRow } from "../repositories/liveSpeakingSession.repository";
import { profileRepository } from "../repositories/profile.repository";
import {
  aiRouter,
  AIUsageService,
  buildLiveFeedbackSystemPrompt,
  buildLiveFeedbackUserPrompt,
  buildLiveTutorInstruction,
} from "./ai/index";
import { createLiveToken } from "./ai/liveToken";
import { resolvePersonalization } from "./lessons/learningContext";

/** Voice used by the tutor. Prebuilt Gemini voice, kept constant so the tutor sounds the same every time. */
const TUTOR_VOICE = "Kore";
const DAY_MS = 24 * 60 * 60 * 1000;
/** A session still active this long after its maximum length can no longer be running. */
const STALE_GRACE_SECONDS = 180;
const MIN_TURNS_FOR_FEEDBACK = 2;

export function estimateLiveCostUsd(seconds: number): number {
  return Math.round((seconds / 60) * env.LIVE_COST_PER_MINUTE_USD * 1e6) / 1e6;
}

function asLevel(value: string | null | undefined): CefrLevel {
  return (CEFR_LEVELS as readonly string[]).includes(value ?? "") ? (value as CefrLevel) : "A1";
}

async function logLiveUsage(supabase: SupabaseClient, userId: string, model: string, seconds: number, status: "success" | "error"): Promise<number> {
  const costUsd = estimateLiveCostUsd(seconds);
  await aiUsageLogRepository
    .insert(supabase, {
      userId,
      provider: "gemini",
      model,
      activityType: "live_speaking",
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      costUsd,
      latencyMs: seconds * 1000,
      status,
    })
    .catch((error: unknown) => logger.error({ err: error, userId }, "Could not log live speaking usage"));
  return costUsd;
}

export const liveSpeakingService = {
  /**
   * Opens a conversation: checks the daily cap and the AI budget, creates the session and returns a one-use token plus
   * the tutor instruction (built here from the student's real profile, never from client input).
   */
  async start(supabase: SupabaseClient, userId: string, input: StartLiveSpeakingInput): Promise<StartLiveSpeakingResponse> {
    const maxSeconds = env.LIVE_SESSION_MAX_SECONDS;
    const scenario = input.mode === "scenario" ? getLiveScenario(input.scenarioId) : undefined;
    if (input.mode === "scenario" && !scenario) throw new NotFoundError("Situación no encontrada");

    // Conversations left open (tab closed, connection lost) are settled at their full length: the safe estimate.
    const stale = await liveSpeakingSessionRepository.listStaleActive(
      supabase,
      userId,
      new Date(Date.now() - (maxSeconds + STALE_GRACE_SECONDS) * 1000),
    );
    for (const row of stale) {
      const cost = await logLiveUsage(supabase, userId, row.model, row.max_seconds, "error");
      await liveSpeakingSessionRepository.finish(supabase, row.id, {
        status: "abandoned",
        durationSeconds: row.max_seconds,
        transcript: null,
        aiFeedback: null,
        estimatedCostUsd: cost,
      });
    }

    const today = await liveSpeakingSessionRepository.countStartedSince(supabase, userId, new Date(Date.now() - DAY_MS));
    if (today >= env.LIVE_SESSIONS_PER_DAY) {
      throw new ConflictError(
        `Llegaste al máximo de ${env.LIVE_SESSIONS_PER_DAY} conversaciones por día. Probá de nuevo más tarde.`,
        "live_daily_limit",
      );
    }

    const budget = await AIUsageService.checkBudget(supabase, userId);
    const worstCase = estimateLiveCostUsd(maxSeconds);
    if (!budget.allowed || (budget.settings.hard_block_at_budget && budget.monthToDateSpendUsd + worstCase > budget.settings.monthly_budget_usd)) {
      throw new BudgetExceededError();
    }

    const profile = await profileRepository.getById(supabase, userId);
    const [plan, mistakes] = await Promise.all([
      learningPlanRepository.getCurrentForUser(supabase, userId, profile.current_plan_id),
      errorJournalRepository.listOpen(supabase, userId, 5).catch(() => []),
    ]);
    const level = asLevel(profile.current_level ?? plan?.target_level_start);
    const personal = resolvePersonalization(plan?.personalization, null);

    const instruction = buildLiveTutorInstruction({
      profile: {
        level,
        explanationLanguage: profile.explanation_language,
        profession: personal.profession,
        interests: personal.interests,
        goal: personal.primaryGoal,
        recentMistakes: mistakes.map((m) => ({ original: m.original_text, corrected: m.corrected_text })),
      },
      scenario,
      correctWhileTalking: input.correctWhileTalking,
      maxSeconds,
    });

    const model = env.GEMINI_LIVE_MODEL;
    const session = await liveSpeakingSessionRepository.create(supabase, {
      userId,
      mode: input.mode,
      scenario: scenario?.id ?? null,
      level,
      model,
      maxSeconds,
    });

    try {
      const token = await createLiveToken({ model, maxSeconds, systemInstruction: instruction, voice: TUTOR_VOICE });
      return {
        sessionId: session.id,
        token,
        model,
        voice: TUTOR_VOICE,
        systemInstruction: instruction,
        maxSeconds,
        scenarioTitle: scenario?.title ?? null,
      };
    } catch (error) {
      logger.error({ err: error, userId }, "Could not create a live speaking token");
      await liveSpeakingSessionRepository.finish(supabase, session.id, {
        status: "failed",
        durationSeconds: 0,
        transcript: null,
        aiFeedback: null,
        estimatedCostUsd: 0,
      });
      if (/429|quota|rate.?limit|resource.?exhausted/i.test(String(error))) {
        // The free tier has its own limits: say so instead of a generic failure.
        throw new AppError("Se agotó el cupo gratuito de Gemini por ahora. Probá de nuevo en unos minutos.", 429, "live_quota");
      }
      throw new AppError("No pudimos iniciar la conversación. Probá de nuevo en un momento.", 503, "live_unavailable");
    }
  },

  /**
   * Closes the conversation: charges the estimated cost to the monthly budget, stores the transcript and builds the
   * post-session feedback (also feeding the student's real mistakes into the error journal).
   */
  async end(supabase: SupabaseClient, userId: string, sessionId: string, input: EndLiveSpeakingInput): Promise<EndLiveSpeakingResponse> {
    const session = await liveSpeakingSessionRepository.getById(supabase, sessionId);
    if (session.user_id !== userId) throw new NotFoundError("Sesión de conversación no encontrada");

    // Never trust a longer duration than the session could have had, nor one longer than the wall clock allows.
    const elapsed = Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000);
    const seconds = Math.max(0, Math.min(input.durationSeconds, session.max_seconds + 30, elapsed + 5));

    if (session.status !== "active") return endResponse(session, session.status === "completed" ? "completed" : "failed");

    const turns = input.turns.map((turn) => ({ role: turn.role, text: turn.text.trim() })).filter((turn) => turn.text.length > 0);
    const studentTurns = turns.filter((turn) => turn.role === "user");

    const cost = await logLiveUsage(supabase, userId, session.model, seconds, "success");

    let feedback: LiveSpeakingFeedback | null = null;
    if (studentTurns.length >= MIN_TURNS_FOR_FEEDBACK) {
      feedback = await buildFeedback(supabase, userId, session, turns);
    }

    const saved = await liveSpeakingSessionRepository.finish(supabase, session.id, {
      status: "completed",
      durationSeconds: seconds,
      transcript: turns,
      aiFeedback: feedback,
      estimatedCostUsd: cost,
    });
    if (!saved) {
      // Another request closed it first (double click, or the stale cleanup): report the stored result.
      const current = await liveSpeakingSessionRepository.getById(supabase, session.id);
      return endResponse(current, current.status === "completed" ? "completed" : "failed");
    }

    if (feedback) {
      await Promise.all(
        feedback.corrections.slice(0, 5).map((correction) =>
          errorJournalRepository
            .record(supabase, {
              userId,
              sourceType: "speaking",
              sourceId: session.id,
              category: "grammar",
              originalText: correction.original,
              correctedText: correction.corrected,
              explanation: correction.explanation,
            })
            .catch((error: unknown) => logger.warn({ err: error, userId }, "Could not record a live speaking mistake")),
        ),
      );
    }

    return endResponse(saved, "completed");
  },
};

function endResponse(session: LiveSpeakingSessionRow, status: "completed" | "failed"): EndLiveSpeakingResponse {
  return {
    sessionId: session.id,
    status,
    durationSeconds: session.duration_seconds ?? 0,
    feedback: session.ai_feedback,
  };
}

async function buildFeedback(
  supabase: SupabaseClient,
  userId: string,
  session: LiveSpeakingSessionRow,
  turns: Array<{ role: "user" | "tutor"; text: string }>,
): Promise<LiveSpeakingFeedback | null> {
  try {
    const profile = await profileRepository.getById(supabase, userId);
    const scenario = getLiveScenario(session.scenario ?? undefined);
    const result = await aiRouter.generate(supabase, {
      activityType: "speaking_feedback",
      systemPrompt: buildLiveFeedbackSystemPrompt(profile.explanation_language),
      userPrompt: buildLiveFeedbackUserPrompt({ level: asLevel(session.level), scenarioTitle: scenario?.title ?? null, turns }),
      responseSchema: liveSpeakingFeedbackSchema,
      userId,
      maxOutputTokens: 2048,
    });
    return result.data;
  } catch (error) {
    // The conversation itself already happened and was charged: a failed analysis must not lose the transcript.
    logger.warn({ err: error, userId, sessionId: session.id }, "Live speaking feedback failed");
    return null;
  }
}
