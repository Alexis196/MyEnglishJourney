import type { Request, Response } from "express";
import type { SubmitExerciseAttemptInput } from "@myenglishjourney/shared";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { exerciseService } from "../services/exercise.service.js";
import { UnauthorizedError } from "../utils/AppError.js";

export const exerciseController = {
  submitAttempt: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.supabase) throw new UnauthorizedError();
    const body = req.body as SubmitExerciseAttemptInput;
    const result = await exerciseService.submitAttempt(req.supabase, req.user.id, req.params.exerciseId as string, body.response);
    res.status(201).json(result);
  }),
};
