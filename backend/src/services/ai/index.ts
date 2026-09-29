import { GeminiProvider } from "./GeminiProvider.js";
import { OpenAIProvider } from "./OpenAIProvider.js";
import { AIRouter } from "./AIRouter.js";

export const geminiProvider = new GeminiProvider();
export const openAiProvider = new OpenAIProvider();
export const aiRouter = new AIRouter(geminiProvider, openAiProvider);

export * from "./types.js";
export * from "./AIErrorClassifier.js";
export * from "./AIUsageService.js";
export * from "./AIRouter.js";
export * from "./pricing.js";
export * from "./prompts/index.js";
export * from "./planGeneration.schema.js";
