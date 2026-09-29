import { Router } from "express";
import { submitExerciseAttemptSchema } from "@myenglishjourney/shared";
import { requireAuth } from "../middlewares/requireAuth.js";
import { serviceAvailability } from "../middlewares/serviceAvailability.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { exerciseController } from "../controllers/exercise.controller.js";

export const exerciseRoutes = Router();

// Only Supabase is required here, not AI — closed-answer exercise types never touch
// the AI provider layer, and free_writing degrades gracefully (see exercise.service).
exerciseRoutes.post(
  "/:exerciseId/attempts",
  serviceAvailability("supabase"),
  requireAuth(),
  validateRequest(submitExerciseAttemptSchema),
  exerciseController.submitAttempt,
);
