import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { serviceAvailability } from "../middlewares/serviceAvailability.js";
import { learningPlanController } from "../controllers/learningPlan.controller.js";

export const learningPlanRoutes = Router();

learningPlanRoutes.get("/current", serviceAvailability("supabase"), requireAuth(), learningPlanController.getCurrent);
