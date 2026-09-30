import { GeminiProvider } from "./GeminiProvider";
import { OpenAIProvider } from "./OpenAIProvider";
import { AIRouter } from "./AIRouter";

export const geminiProvider = new GeminiProvider();
export const openAiProvider = new OpenAIProvider();
export const aiRouter = new AIRouter(geminiProvider, openAiProvider);

export * from "./types";
export * from "./AIErrorClassifier";
export * from "./AIUsageService";
export * from "./AIRouter";
export * from "./pricing";
export * from "./prompts/index";
export * from "./planGeneration.schema";
