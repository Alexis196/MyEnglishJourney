import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_OPEN_PLANS, type GeneratePlanRequest, type CurrentLearningPlanResponse } from "@myenglishjourney/shared";
import { ConflictError } from "../utils/AppError";
import { profileRepository } from "../repositories/profile.repository";
import { learningPlanRepository } from "../repositories/learningPlan.repository";
import { planDayRepository, type CreatePlanDayInput } from "../repositories/planDay.repository";
import { lessonRepository } from "../repositories/lesson.repository";
import { lessonSectionRepository } from "../repositories/lessonSection.repository";
import { exerciseRepository, type CreateExerciseInput } from "../repositories/exercise.repository";
import { learningGoalsRepository } from "../repositories/learningGoals.repository";
import { learningPlanService } from "./learningPlan.service";
import {
  aiRouter,
  buildPlanGenerationSystemPrompt,
  buildPlanGenerationUserPrompt,
  planGenerationResponseSchema,
  type AIExercise,
} from "./ai/index";

const TOTAL_DAYS = 90;

type ExerciseInsertFields = Omit<CreateExerciseInput, "userId" | "lessonSectionId">;

function toDbExercise(ai: AIExercise, orderIndex: number): ExerciseInsertFields | null {
  switch (ai.exerciseType) {
    case "multiple_choice":
      if (!ai.prompt || !ai.options || ai.options.length < 2 || ai.correctOptionIndex === undefined) return null;
      return {
        exerciseType: "multiple_choice",
        orderIndex,
        content: { prompt: ai.prompt, options: ai.options },
        answerKey: { correctOptionIndex: ai.correctOptionIndex },
      };
    case "fill_in_blank":
      if (!ai.prompt || !ai.acceptedAnswers || ai.acceptedAnswers.length === 0) return null;
      return {
        exerciseType: "fill_in_blank",
        orderIndex,
        content: { prompt: ai.prompt },
        answerKey: { acceptedAnswers: ai.acceptedAnswers },
      };
    case "translation_es_en":
    case "translation_en_es":
      if (!ai.sourceText || !ai.acceptedAnswers || ai.acceptedAnswers.length === 0) return null;
      return {
        exerciseType: ai.exerciseType,
        orderIndex,
        content: { sourceText: ai.sourceText },
        answerKey: { acceptedAnswers: ai.acceptedAnswers },
      };
    case "free_writing":
      if (!ai.prompt) return null;
      return {
        exerciseType: "free_writing",
        orderIndex,
        content: { prompt: ai.prompt, ...(ai.minWords ? { minWords: ai.minWords } : {}) },
        answerKey: {},
      };
    default:
      return null;
  }
}

export const planGenerationService = {
  async generate(supabase: SupabaseClient, userId: string, input: GeneratePlanRequest): Promise<CurrentLearningPlanResponse> {
    const openPlans = await learningPlanRepository.countOpenForUser(supabase, userId);
    if (openPlans >= MAX_OPEN_PLANS) {
      throw new ConflictError(
        `Llegaste al máximo de ${MAX_OPEN_PLANS} planes activos. Archivá alguno para crear otro.`,
        "plan_limit_reached",
      );
    }

    const profile = await profileRepository.getById(supabase, userId);

    const aiResult = await aiRouter.generate(supabase, {
      activityType: "plan_generation",
      systemPrompt: buildPlanGenerationSystemPrompt(profile.explanation_language),
      userPrompt: buildPlanGenerationUserPrompt({
        occupation: input.occupation,
        interests: input.interests,
        otherInterests: input.otherInterests,
        mainGoal: input.mainGoal,
        currentLevel: input.currentLevel,
        targetLevel: input.targetLevel,
        dailyMinutesGoal: input.dailyMinutesGoal,
        focusAreas: input.focusAreas,
        motivation: input.motivation,
      }),
      responseSchema: planGenerationResponseSchema,
      userId,
      maxOutputTokens: 8000,
    });

    const generated = aiResult.data;

    // Backfill any day numbers the model skipped in its (possibly incomplete) 90-day
    // list, so the schedule spine is always fully populated regardless of minor
    // shortfalls in a single structured-generation call.
    const dayByNumber = new Map(generated.days.map((d) => [d.dayNumber, d]));
    const planDaysInput: CreatePlanDayInput[] = [];
    for (let dayNumber = 1; dayNumber <= TOTAL_DAYS; dayNumber++) {
      const aiDay = dayByNumber.get(dayNumber);
      planDaysInput.push({
        userId,
        learningPlanId: "", // filled in after the plan is created
        dayNumber,
        dayType: aiDay?.dayType ?? "review",
        status: dayNumber === 1 ? "available" : "locked",
        unlockedAt: dayNumber === 1 ? new Date().toISOString() : null,
      });
    }

    const plan = await learningPlanRepository.create(supabase, {
      userId,
      title: generated.planTitle,
      totalDays: TOTAL_DAYS,
      targetLevelStart: input.currentLevel,
      targetLevelEnd: generated.targetLevelEnd,
      generatedBy: "ai",
    });

    const createdDays = await planDayRepository.bulkInsert(
      supabase,
      planDaysInput.map((d) => ({ ...d, learningPlanId: plan.id })),
    );
    const day1 = createdDays.find((d) => d.day_number === 1);
    if (!day1) throw new Error("Failed to create day 1 of the plan — this should never happen");

    const lesson = await lessonRepository.create(supabase, {
      userId,
      planDayId: day1.id,
      title: generated.firstLesson.title,
      objective: generated.firstLesson.objective,
      cefrLevel: input.currentLevel,
    });
    await planDayRepository.setLesson(supabase, day1.id, lesson.id);

    const sections = await lessonSectionRepository.bulkInsert(
      supabase,
      generated.firstLesson.sections.map((section, index) => ({
        userId,
        lessonId: lesson.id,
        sectionType: section.sectionType,
        orderIndex: index,
        title: section.title,
        content: {
          ...(section.explanation ? { explanation: section.explanation } : {}),
          ...(section.examples ? { examples: section.examples } : {}),
          ...(section.vocabulary ? { vocabulary: section.vocabulary } : {}),
        },
      })),
    );

    const exerciseRows: CreateExerciseInput[] = [];
    generated.firstLesson.sections.forEach((section, sectionIndex) => {
      const sectionRow = sections[sectionIndex];
      if (!sectionRow) return;
      (section.exercises ?? []).forEach((aiExercise, exerciseIndex) => {
        const mapped = toDbExercise(aiExercise, exerciseIndex);
        if (!mapped) return;
        exerciseRows.push({ userId, lessonSectionId: sectionRow.id, ...mapped });
      });
    });
    await exerciseRepository.bulkInsert(supabase, exerciseRows);

    await learningGoalsRepository.upsertForUser(supabase, {
      userId,
      targetLevel: input.targetLevel,
      focusAreas: input.focusAreas,
      dailyMinutesGoal: input.dailyMinutesGoal,
      motivation: input.motivation,
    });

    await profileRepository.update(supabase, userId, {
      current_level: input.currentLevel,
      current_plan_id: plan.id,
    });

    return learningPlanService.getCurrent(supabase, userId);
  },
};
