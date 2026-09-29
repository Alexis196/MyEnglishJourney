import type { Request, Response } from "express";
import type { SubmitSpeakingRecordingInput } from "@myenglishjourney/shared";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { speakingService } from "../services/speaking.service.js";
import { UnauthorizedError } from "../utils/AppError.js";

export const speakingController = {
  submitRecording: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.supabase) throw new UnauthorizedError();
    const body = req.body as SubmitSpeakingRecordingInput;
    const result = await speakingService.submitRecording(req.supabase, req.user.id, body);
    res.status(201).json(result);
  }),
};
