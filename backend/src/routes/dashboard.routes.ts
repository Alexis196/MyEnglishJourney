import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { serviceAvailability } from "../middlewares/serviceAvailability.js";
import { dashboardController } from "../controllers/dashboard.controller.js";

export const dashboardRoutes = Router();

dashboardRoutes.get("/summary", serviceAvailability("supabase"), requireAuth(), dashboardController.getSummary);
