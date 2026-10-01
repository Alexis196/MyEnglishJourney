import type { SupabaseClient } from "@supabase/supabase-js";
import type { CefrLevel, EnsureLessonResponse, PlanDayRow } from "@myenglishjourney/shared";
import { env } from "../../config/env";
import { AppError, BudgetExceededError, ConflictError, NotFoundError } from "../../utils/AppError";
import { logger } from "../../utils/logger";
import { learningGoalsRepository } from "../../repositories/learningGoals.repository";
import { learningPlanRepository } from "../../repositories/learningPlan.repository";
import { lessonHistoryRepository } from "../../repositories/lessonHistory.repository";
import { lessonRepository } from "../../repositories/lesson.repository";
import { lessonSectionRepository } from "../../repositories/lessonSection.repository";
import { exerciseRepository, type CreateExerciseInput } from "../../repositories/exercise.repository";
import { planDayRepository } from "../../repositories/planDay.repository";
import { profileRepository } from "../../repositories/profile.repository";
import { AIProviderFailureError } from "../ai/AIRouter";
import type { GeneratedLesson } from "../ai/planGeneration.schema";
import { toDbExercise } from "./exerciseMapper";
import { resolvePersonalization, type LearningContext } from "./learningContext";
import { buildLessonSpec } from "./lessonBlueprint";
import { generateValidLesson, LessonValidationError } from "./lessonGenerator";
import { computePerformance } from "./performance";
import { REVIEW_OFFSETS, selectReviewItems } from "./reviewSelection";

/** A "generating" day older than this is considered abandoned (the serverless instance died) and can be reclaimed. */
export const GENERATION_STALE_MS = 3 * 60 * 1000;
/** Retries of one failing day inside the rolling window, so a persistent failure cannot burn unlimited calls. */
export const MAX_GENERATIONS_PER_DAY_WINDOW = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const PERFORMANCE_SAMPLE_SIZE = 60;

const FAILED_MESSAGE = "No pudimos preparar tu lección. Probá de nuevo en un momento.";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";
}

function asResponse(day: Pick<PlanDayRow, "generation_status" | "lesson_id">): EnsureLessonResponse {
  if (day.lesson_id && day.generation_status === "ready") return { status: "ready", lessonId: day.lesson_id };
  if (day.generation_status === "generating") return { status: "generating", lessonId: null };
  if (day.generation_status === "failed") return { status: "failed", lessonId: null, message: FAILED_MESSAGE };
  return { status: "generating", lessonId: null };
}

export const lessonEngineService = {
  /** Read-only status, used by the client to poll while another request is generating. */
  async getStatus(supabase: SupabaseClient, userId: string, planDayId: string): Promise<EnsureLessonResponse> {
    const day = await planDayRepository.getById(supabase, planDayId);
    if (!day || day.user_id !== userId) throw new NotFoundError("Día no encontrado");
    return asResponse(day);
  },

  /**
   * Makes sure the day has its lesson. Safe to call any number of times and from any number of tabs at once:
   *   ready      -> returns the existing lesson, no AI call;
   *   generating -> returns immediately (someone else is generating), the client polls;
   *   pending / failed / stale -> exactly one caller wins an atomic claim and generates.
   */
  async ensureLesson(supabase: SupabaseClient, userId: string, planDayId: string): Promise<EnsureLessonResponse> {
    const day = await planDayRepository.getById(supabase, planDayId);
    if (!day || day.user_id !== userId) throw new NotFoundError("Día no encontrado");

    if (day.lesson_id && day.generation_status === "ready") return asResponse(day);

    if (day.day_type === "rest") {
      throw new AppError("Los días de descanso no tienen lección.", 400, "rest_day_has_no_lesson");
    }
    if (day.status === "locked") {
      throw new ConflictError("Este día todavía está bloqueado.", "day_locked");
    }

    const plan = await learningPlanRepository.getById(supabase, day.learning_plan_id);
    if (!plan || plan.user_id !== userId || plan.status === "archived") throw new NotFoundError("Plan no encontrado");

    // Server-side guarantee of the unlock rule: day N can only be generated once day N-1 is completed.
    if (day.day_number > 1) {
      const previous = await planDayRepository.getByNumber(supabase, day.learning_plan_id, day.day_number - 1);
      if (previous?.status !== "completed") {
        throw new ConflictError("Completá el día anterior para preparar esta lección.", "previous_day_not_completed");
      }
    }

    const now = Date.now();
    const windowStart = new Date(now - WINDOW_MS).toISOString();

    // Per-day retry cap inside the window, and the per-user safety limit (cost only, never pedagogical).
    const startedRecently = day.generation_started_at !== null && day.generation_started_at >= windowStart;
    const attemptsInWindow = startedRecently ? day.generation_attempts : 0;
    if (day.generation_status !== "generating" && attemptsInWindow >= MAX_GENERATIONS_PER_DAY_WINDOW) {
      throw new AppError(
        "Esta lección falló varias veces seguidas. Esperá un rato antes de volver a intentarlo.",
        429,
        "lesson_generation_retry_limit",
      );
    }
    if (day.generation_status !== "generating") {
      const started = await planDayRepository.countGenerationsSince(supabase, userId, windowStart, day.id);
      if (started >= env.LESSON_GENERATIONS_PER_DAY) {
        throw new AppError(
          `Llegaste al límite de ${env.LESSON_GENERATIONS_PER_DAY} lecciones preparadas por día. Podés seguir mañana.`,
          429,
          "lesson_generation_limit",
        );
      }
    }

    const claimed = await planDayRepository.claimGeneration(supabase, day.id, {
      staleBefore: new Date(now - GENERATION_STALE_MS).toISOString(),
      nextAttempt: attemptsInWindow + 1,
    });
    if (!claimed) {
      // Lost the race (or it finished meanwhile): report whatever state it is in now.
      const current = await planDayRepository.getById(supabase, day.id);
      return current ? asResponse(current) : { status: "generating", lessonId: null };
    }

    try {
      const context = await this.buildContext(supabase, userId, claimed, plan);
      const spec = buildLessonSpec({ minutes: context.minutesPerLesson, level: context.cefrLevel, dayType: claimed.day_type });
      const generated = await generateValidLesson({ supabase, userId, context, spec });
      const lessonId = await this.persistLesson(supabase, userId, claimed, context.cefrLevel, generated);
      await planDayRepository.markReady(supabase, claimed.id, lessonId);
      return { status: "ready", lessonId };
    } catch (error) {
      if (isUniqueViolation(error)) {
        // A reclaimed stale generation finished first: its lesson is the one to use.
        const existing = await lessonRepository.findIdByPlanDay(supabase, claimed.id);
        if (existing) {
          await planDayRepository.markReady(supabase, claimed.id, existing);
          return { status: "ready", lessonId: existing };
        }
      }

      const code =
        error instanceof LessonValidationError
          ? "invalid_lesson"
          : error instanceof BudgetExceededError
            ? "ai_budget_exceeded"
            : error instanceof AIProviderFailureError
              ? "ai_unavailable"
              : "unexpected";
      await planDayRepository.markFailed(supabase, claimed.id, code).catch((markError: unknown) => {
        logger.error({ err: markError, planDayId: claimed.id }, "Could not mark lesson generation as failed");
      });
      logger.warn({ err: error, planDayId: claimed.id, code }, "Lesson generation failed");

      if (error instanceof BudgetExceededError) return { status: "failed", lessonId: null, message: error.message };
      if (code === "unexpected") throw error;
      return { status: "failed", lessonId: null, message: FAILED_MESSAGE };
    }
  },

  /** Everything the model is allowed to know, built from stored data. Only a handful of small queries. */
  async buildContext(
    supabase: SupabaseClient,
    userId: string,
    day: PlanDayRow,
    plan: Awaited<ReturnType<typeof learningPlanRepository.getById>> & object,
  ): Promise<LearningContext> {
    const reviewDays = REVIEW_OFFSETS.map((offset) => day.day_number - offset).filter((n) => n >= 1);

    const [profile, goals, history, samples] = await Promise.all([
      profileRepository.getById(supabase, userId),
      plan.personalization ? Promise.resolve(null) : learningGoalsRepository.getForUser(supabase, userId),
      lessonHistoryRepository.loadForReview(supabase, userId, plan.id, reviewDays),
      lessonHistoryRepository.recentSamples(supabase, userId, PERFORMANCE_SAMPLE_SIZE),
    ]);

    const personalization = resolvePersonalization(plan.personalization, goals);
    const level = (profile.current_level ?? plan.target_level_start ?? "A1") as CefrLevel;
    const review = selectReviewItems({ dayNumber: day.day_number, exercises: history.exercises, attempts: history.attempts });

    return {
      cefrLevel: level,
      explanationLanguage: profile.explanation_language,
      learningGoal: personalization.primaryGoal,
      interests: personalization.interests,
      otherInterests: personalization.otherInterests,
      profession: personalization.profession,
      preferredTopics: personalization.focusAreas,
      minutesPerLesson: personalization.minutesPerSession,
      performance: computePerformance(samples),
      review,
      dayNumber: day.day_number,
      totalDays: plan.total_days,
      dayType: day.day_type,
      theme: day.theme ?? undefined,
      previousLessonTitle: history.titlesByDay.get(day.day_number - 1),
    };
  },

  /** Saves lesson + sections + exercises; removes the partial lesson if any step fails. */
  async persistLesson(
    supabase: SupabaseClient,
    userId: string,
    day: PlanDayRow,
    level: CefrLevel,
    generated: GeneratedLesson,
  ): Promise<string> {
    const lesson = await lessonRepository.create(supabase, {
      userId,
      planDayId: day.id,
      title: generated.title,
      objective: generated.objective,
      cefrLevel: level,
    });

    try {
      const sections = await lessonSectionRepository.bulkInsert(
        supabase,
        generated.sections.map((section, index) => ({
          userId,
          lessonId: lesson.id,
          sectionType: section.sectionType,
          orderIndex: index,
          title: section.title,
          content: {
            ...(section.stage ? { stage: section.stage } : {}),
            ...(section.pattern ? { pattern: section.pattern } : {}),
            ...(section.explanation ? { explanation: section.explanation } : {}),
            ...(section.examples ? { examples: section.examples } : {}),
            ...(section.vocabulary ? { vocabulary: section.vocabulary } : {}),
          },
        })),
      );

      const rows: CreateExerciseInput[] = [];
      generated.sections.forEach((section, sectionIndex) => {
        const row = sections[sectionIndex];
        if (!row) return;
        section.exercises.forEach((exercise, exerciseIndex) => {
          const mapped = toDbExercise(exercise, exerciseIndex);
          if (mapped) rows.push({ userId, lessonSectionId: row.id, ...mapped });
        });
      });
      await exerciseRepository.bulkInsert(supabase, rows);
    } catch (error) {
      await lessonRepository.deleteById(supabase, lesson.id).catch(() => undefined);
      throw error;
    }
    return lesson.id;
  },

  /**
   * Best-effort background preparation of the next day. Never throws: if it fails, the student simply triggers the
   * same (idempotent) generation when opening the day.
   */
  async prepareDay(supabase: SupabaseClient, userId: string, learningPlanId: string, dayNumber: number): Promise<void> {
    if (!env.LESSON_PREFETCH_NEXT) return;
    try {
      const day = await planDayRepository.getByNumber(supabase, learningPlanId, dayNumber);
      if (!day || day.day_type === "rest" || day.lesson_id || day.status === "locked") return;
      await this.ensureLesson(supabase, userId, day.id);
    } catch (error) {
      logger.warn({ err: error, learningPlanId, dayNumber }, "Background lesson preparation skipped");
    }
  },
};
