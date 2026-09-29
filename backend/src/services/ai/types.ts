import type { ZodType } from "zod";
import type { AIActivityType, AIProviderName } from "@myenglishjourney/shared";

export type { AIActivityType, AIProviderName };

export interface AITokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIGenerationRequest<T> {
  activityType: AIActivityType;
  systemPrompt: string;
  userPrompt: string;
  responseSchema: ZodType<T>;
  userId: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AIGenerationResult<T> {
  data: T;
  provider: AIProviderName;
  model: string;
  usage: AITokenUsage;
  latencyMs: number;
}

export interface AIProvider {
  readonly name: AIProviderName;
  isConfigured(): boolean;
  generateStructured<T>(request: AIGenerationRequest<T>): Promise<AIGenerationResult<T>>;
}

export type AIErrorCategory =
  | "rate_limit"
  | "quota_exceeded"
  | "timeout"
  | "server_error"
  | "auth_error"
  | "invalid_request"
  | "safety_block"
  | "unknown";

export interface ClassifiedAIError {
  category: AIErrorCategory;
  retryable: boolean;
  fallbackEligible: boolean;
  providerName: AIProviderName;
  message: string;
  originalError: unknown;
}
