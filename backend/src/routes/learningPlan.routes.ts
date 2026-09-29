import { Router } from "express";
import { generatePlanRequestSchema } from "@myenglishjourney/shared";
import { requireAuth } from "../middlewares/requireAuth.js";
import { serviceAvailability } from "../middlewares/serviceAvailability.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { learningPlanController } from "../controllers/learningPlan.controller.js";
import { planGenerationController } from "../controllers/planGeneration.controller.js";

export const learningPlanRoutes = Router();

learningPlanRoutes.get("/current", serviceAvailability("supabase"), requireAuth(), learningPlanController.getCurrent);
learningPlanRoutes.post(
  "/generate",
  serviceAvailability("supabase", "ai"),
  requireAuth(),
  validateRequest(generatePlanRequestSchema),
  planGenerationController.generate,
);
