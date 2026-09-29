import type { AIProviderName } from "./types.js";

export interface PricingEntry {
  /** USD per 1,000,000 prompt tokens */
  promptPer1M: number;
  /** USD per 1,000,000 completion tokens */
  completionPer1M: number;
}

/**
 * Single source of truth for AI pricing. Verify current figures against
 * each provider's official pricing page before relying on them for real
 * budgeting — they are not fetched live and can go stale. Update this
 * table (not scattered literals in code) when prices change or new models
 * are added.
 */
export const PRICING_TABLE: Record<AIProviderName, Record<string, PricingEntry>> = {
  gemini: {
    "gemini-1.5-flash": { promptPer1M: 0.075, completionPer1M: 0.3 },
    "gemini-1.5-pro": { promptPer1M: 1.25, completionPer1M: 5.0 },
  },
  openai: {
    "gpt-4o-mini": { promptPer1M: 0.15, completionPer1M: 0.6 },
    "gpt-4o": { promptPer1M: 2.5, completionPer1M: 10.0 },
  },
};

export class UnpricedModelError extends Error {
  constructor(provider: AIProviderName, model: string) {
    super(
      `No hay precio configurado para ${provider}/${model} en PRICING_TABLE. ` +
        "Agregalo antes de usar este modelo para evitar registrar costo $0 de forma silenciosa.",
    );
    this.name = "UnpricedModelError";
  }
}

export function computeCostUsd(
  provider: AIProviderName,
  model: string,
  usage: { promptTokens: number; completionTokens: number },
): number {
  const entry = PRICING_TABLE[provider]?.[model];
  if (!entry) {
    throw new UnpricedModelError(provider, model);
  }
  const promptCost = (usage.promptTokens / 1_000_000) * entry.promptPer1M;
  const completionCost = (usage.completionTokens / 1_000_000) * entry.completionPer1M;
  return Number((promptCost + completionCost).toFixed(6));
}
