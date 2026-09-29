import { Router } from "express";
import { submitSpeakingRecordingSchema } from "@myenglishjourney/shared";
import { requireAuth } from "../middlewares/requireAuth.js";
import { serviceAvailability } from "../middlewares/serviceAvailability.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { speakingController } from "../controllers/speaking.controller.js";

export const speakingRoutes = Router();

speakingRoutes.post(
  "/sessions",
  serviceAvailability("supabase", "gemini"),
  requireAuth(),
  validateRequest(submitSpeakingRecordingSchema),
  speakingController.submitRecording,
);
