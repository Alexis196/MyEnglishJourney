import type { AIErrorCategory, AIProviderName, ClassifiedAIError } from "./types.js";

/**
 * Thrown by a provider when the model itself blocked/refused content
 * (e.g. Gemini finishReason === "SAFETY", OpenAI finish_reason ===
 * "content_filter"). This is a distinct path from a transport error: the
 * call succeeded, the content was refused. The classifier treats it as
 * terminal — trying the other provider would likely hit the same block.
 */
export class AISafetyBlockError extends Error {
  constructor(message = "El contenido fue bloqueado por los filtros de seguridad del modelo") {
    super(message);
    this.name = "AISafetyBlockError";
  }
}

/** Thrown when a model's JSON output fails Zod validation. Treated as invalid_request (bad output), not a transport failure. */
export class AIInvalidResponseError extends Error {
  constructor(message = "La respuesta del modelo no tuvo el formato esperado") {
    super(message);
    this.name = "AIInvalidResponseError";
  }
}

const RETRYABLE: ReadonlySet<AIErrorCategory> = new Set(["rate_limit", "timeout", "server_error"]);
const FALLBACK_ELIGIBLE: ReadonlySet<AIErrorCategory> = new Set([
  "rate_limit",
  "quota_exceeded",
  "timeout",
  "server_error",
]);

function extractStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = error as { status?: unknown; statusCode?: unknown; code?: unknown };
  if (typeof candidate.status === "number") return candidate.status;
  if (typeof candidate.statusCode === "number") return candidate.statusCode;
  return undefined;
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return "Error desconocido del proveedor de IA";
}

function classifyByStatus(status: number | undefined, message: string, providerName: AIProviderName): AIErrorCategory {
  const lowerMessage = message.toLowerCase();

  if (status === 429) {
    const isQuota =
      lowerMessage.includes("quota") ||
      lowerMessage.includes("insufficient_quota") ||
      lowerMessage.includes("resource_exhausted");
    return isQuota ? "quota_exceeded" : "rate_limit";
  }
  if (status === 401 || status === 403) return "auth_error";
  if (status === 400) return "invalid_request";
  if (status === 408 || lowerMessage.includes("timeout") || lowerMessage.includes("timed out")) return "timeout";
  if (status !== undefined && status >= 500) return "server_error";

  // Some SDK errors (e.g. network failures) never carry an HTTP status.
  if (lowerMessage.includes("econnreset") || lowerMessage.includes("network") || lowerMessage.includes("fetch failed")) {
    return "server_error";
  }

  void providerName; // reserved for provider-specific heuristics beyond status/message
  return "unknown";
}

export const AIErrorClassifier = {
  classify(error: unknown, providerName: AIProviderName): ClassifiedAIError {
    const message = extractMessage(error);

    let category: AIErrorCategory;
    if (error instanceof AISafetyBlockError) {
      category = "safety_block";
    } else if (error instanceof AIInvalidResponseError) {
      category = "invalid_request";
    } else {
      category = classifyByStatus(extractStatus(error), message, providerName);
    }

    return {
      category,
      retryable: RETRYABLE.has(category),
      fallbackEligible: FALLBACK_ELIGIBLE.has(category),
      providerName,
      message,
      originalError: error,
    };
  },
};
