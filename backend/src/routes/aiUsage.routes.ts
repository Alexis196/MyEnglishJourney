import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { serviceAvailability } from "../middlewares/serviceAvailability.js";
import { aiUsageController } from "../controllers/aiUsage.controller.js";

export const aiUsageRoutes = Router();

aiUsageRoutes.get("/summary", serviceAvailability("supabase"), requireAuth(), aiUsageController.getSummary);
