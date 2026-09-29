import type { Request, Response } from "express";
import type { GeneratePlanRequest } from "@myenglishjourney/shared";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { planGenerationService } from "../services/planGeneration.service.js";
import { UnauthorizedError } from "../utils/AppError.js";

export const planGenerationController = {
  generate: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.supabase) throw new UnauthorizedError();
    const body = req.body as GeneratePlanRequest;
    const result = await planGenerationService.generate(req.supabase, req.user.id, body);
    res.status(201).json(result);
  }),
};
