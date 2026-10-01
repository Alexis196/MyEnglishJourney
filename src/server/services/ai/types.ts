import type { ZodType } from "zod";
import type { AIActivityType, AIProviderName } from "@myenglishjourney/shared";

export type { AIActivityType, AIProviderName };

export interface AITokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIAudioInput {
  mimeType: string;
  /** Base64-encoded raw audio bytes (no data: URL prefix). */
  base64Data: string;
}

export interface AIGenerationRequest<T> {
  activityType: AIActivityType;
  systemPrompt: string;
  userPrompt: string;
  responseSchema: ZodType<T>;
  userId: string;
  temperature?: number;
  maxOutputTokens?: number;
  /**
   * When set, routes exclusively to Gemini — audio input is not implemented
   * for OpenAIProvider in this codebase (it would need a separate
   * transcription step via a different API). See AIRouter.generate.
   */
  audio?: AIAudioInput;
  /**
   * Start with this provider when the user's mode is "auto" (the other one stays as fallback). Used to retry a
   * lesson that failed validation on the other provider. Ignored for audio and for single-provider modes.
   */
  preferProvider?: AIProviderName;
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
