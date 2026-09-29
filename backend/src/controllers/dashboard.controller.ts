import type { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { dashboardService } from "../services/dashboard.service.js";
import { UnauthorizedError } from "../utils/AppError.js";

export const dashboardController = {
  getSummary: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.supabase) throw new UnauthorizedError();
    const summary = await dashboardService.getSummary(req.supabase, req.user.id);
    res.json(summary);
  }),
};
