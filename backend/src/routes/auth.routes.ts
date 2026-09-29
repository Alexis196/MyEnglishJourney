import { Router } from "express";
import { updateProfileSchema } from "@myenglishjourney/shared";
import { requireAuth } from "../middlewares/requireAuth.js";
import { serviceAvailability } from "../middlewares/serviceAvailability.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { authController } from "../controllers/auth.controller.js";

export const authRoutes = Router();

authRoutes.get("/me", serviceAvailability("supabase"), requireAuth(), authController.getMe);
authRoutes.patch(
  "/me",
  serviceAvailability("supabase"),
  requireAuth(),
  validateRequest(updateProfileSchema),
  authController.updateMe,
);
