import OpenAI from "openai";
import { env, isOpenAiConfigured } from "../../config/env";
import { AIInvalidResponseError, AISafetyBlockError } from "./AIErrorClassifier";
import type { AIGenerationRequest, AIGenerationResult, AIProvider } from "./types";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;

  isConfigured(): boolean {
    return isOpenAiConfigured;
  }

  async generateStructured<T>(request: AIGenerationRequest<T>): Promise<AIGenerationResult<T>> {
    if (!isOpenAiConfigured) {
      throw new Error("OpenAI is not configured");
    }

    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    const start = Date.now();
    const completion = await client.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: request.temperature ?? 0.4,
      max_tokens: request.maxOutputTokens ?? 1024,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
    });
    const latencyMs = Date.now() - start;

    const choice = completion.choices[0];
    if (choice?.finish_reason === "content_filter") {
      throw new AISafetyBlockError("OpenAI bloqueó la respuesta por el filtro de contenido");
    }

    const content = choice?.message?.content;
    if (!content) {
      throw new AIInvalidResponseError("OpenAI no devolvió contenido");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(content);
    } catch {
      throw new AIInvalidResponseError("OpenAI no devolvió un JSON válido");
    }

    const validated = request.responseSchema.safeParse(parsedJson);
    if (!validated.success) {
      throw new AIInvalidResponseError(`La respuesta de OpenAI no cumple el esquema esperado: ${validated.error.message}`);
    }

    return {
      data: validated.data,
      provider: "openai",
      model: env.OPENAI_MODEL,
      usage: {
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
        totalTokens: completion.usage?.total_tokens ?? 0,
      },
      latencyMs,
    };
  }
}
