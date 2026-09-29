import type { Request, Response } from "express";
import type { UpdateLessonProgressInput } from "@myenglishjourney/shared";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { lessonService } from "../services/lesson.service.js";
import { UnauthorizedError } from "../utils/AppError.js";

export const lessonController = {
  getById: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.supabase) throw new UnauthorizedError();
    const lesson = await lessonService.getForUser(req.supabase, req.user.id, req.params.lessonId as string);
    res.json(lesson);
  }),

  updateProgress: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.supabase) throw new UnauthorizedError();
    const body = req.body as UpdateLessonProgressInput;
    await lessonService.updateProgress(req.supabase, req.params.lessonId as string, body);
    res.json({ success: true });
  }),
};
