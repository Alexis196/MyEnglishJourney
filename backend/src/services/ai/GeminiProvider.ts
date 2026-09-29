import { GoogleGenerativeAI } from "@google/generative-ai";
import { env, isGeminiConfigured } from "../../config/env.js";
import { AIInvalidResponseError, AISafetyBlockError } from "./AIErrorClassifier.js";
import type { AIGenerationRequest, AIGenerationResult, AIProvider } from "./types.js";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini" as const;

  isConfigured(): boolean {
    return isGeminiConfigured;
  }

  async generateStructured<T>(request: AIGenerationRequest<T>): Promise<AIGenerationResult<T>> {
    if (!isGeminiConfigured) {
      throw new Error("Gemini is not configured");
    }

    const client = new GoogleGenerativeAI(env.GEMINI_API_KEY as string);
    const model = client.getGenerativeModel({
      model: env.GEMINI_MODEL,
      systemInstruction: request.systemPrompt,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: request.temperature ?? 0.4,
        maxOutputTokens: request.maxOutputTokens ?? 1024,
      },
    });

    const start = Date.now();
    const result = await model.generateContent(request.userPrompt);
    const latencyMs = Date.now() - start;
    const response = result.response;

    const blockReason = response.promptFeedback?.blockReason;
    const finishReason = response.candidates?.[0]?.finishReason;
    if (blockReason || finishReason === "SAFETY") {
      throw new AISafetyBlockError(`Gemini bloqueó la respuesta (${blockReason ?? finishReason})`);
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(response.text());
    } catch {
      throw new AIInvalidResponseError("Gemini no devolvió un JSON válido");
    }

    const validated = request.responseSchema.safeParse(parsedJson);
    if (!validated.success) {
      throw new AIInvalidResponseError(`La respuesta de Gemini no cumple el esquema esperado: ${validated.error.message}`);
    }

    const usageMetadata = response.usageMetadata;
    return {
      data: validated.data,
      provider: "gemini",
      model: env.GEMINI_MODEL,
      usage: {
        promptTokens: usageMetadata?.promptTokenCount ?? 0,
        completionTokens: usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: usageMetadata?.totalTokenCount ?? 0,
      },
      latencyMs,
    };
  }
}
