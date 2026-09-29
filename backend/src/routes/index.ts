import { Router } from "express";
import { isSupabaseConfigured, isGeminiConfigured, isOpenAiConfigured } from "../config/env.js";
import { authRoutes } from "./auth.routes.js";
import { dashboardRoutes } from "./dashboard.routes.js";
import { learningPlanRoutes } from "./learningPlan.routes.js";
import { lessonRoutes } from "./lesson.routes.js";
import { exerciseRoutes } from "./exercise.routes.js";
import { aiUsageRoutes } from "./aiUsage.routes.js";
import { speakingRoutes } from "./speaking.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    configured: {
      supabase: isSupabaseConfigured,
      gemini: isGeminiConfigured,
      openai: isOpenAiConfigured,
    },
  });
});

apiRouter.use("/auth", authRoutes);
apiRouter.use("/dashboard", dashboardRoutes);
apiRouter.use("/learning-plan", learningPlanRoutes);
apiRouter.use("/lessons", lessonRoutes);
apiRouter.use("/exercises", exerciseRoutes);
apiRouter.use("/ai-usage", aiUsageRoutes);
apiRouter.use("/speaking", speakingRoutes);
