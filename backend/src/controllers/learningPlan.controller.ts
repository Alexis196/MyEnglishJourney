import type { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { learningPlanService } from "../services/learningPlan.service.js";
import { UnauthorizedError } from "../utils/AppError.js";

export const learningPlanController = {
  getCurrent: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.supabase) throw new UnauthorizedError();
    const result = await learningPlanService.getCurrent(req.supabase, req.user.id);
    res.json(result);
  }),
};
