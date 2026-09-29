import { Router } from "express";
import { updateLessonProgressSchema } from "@myenglishjourney/shared";
import { requireAuth } from "../middlewares/requireAuth.js";
import { serviceAvailability } from "../middlewares/serviceAvailability.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { lessonController } from "../controllers/lesson.controller.js";

export const lessonRoutes = Router();

lessonRoutes.get("/:lessonId", serviceAvailability("supabase"), requireAuth(), lessonController.getById);
lessonRoutes.post(
  "/:lessonId/progress",
  serviceAvailability("supabase"),
  requireAuth(),
  validateRequest(updateLessonProgressSchema),
  lessonController.updateProgress,
);
