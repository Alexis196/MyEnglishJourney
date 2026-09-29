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
 *
 * Verified against https://ai.google.dev/gemini-api/docs/pricing and
 * https://developers.openai.com/api/docs/pricing on 2026-09-28. The
 * gemini-1.x family has since been fully retired (confirmed via a live
 * models.list call) — do not reintroduce it as a default. The 3.6/3.7/3.8
 * flash promotional prices below are only valid through Dec 31, 2026 per
 * the pricing page; re-check after that date.
 */
export const PRICING_TABLE: Record<AIProviderName, Record<string, PricingEntry>> = {
  gemini: {
    "gemini-3.1-flash-lite": { promptPer1M: 0.25, completionPer1M: 1.5 },
    "gemini-3.5-flash-lite": { promptPer1M: 0.3, completionPer1M: 2.5 },
    "gemini-3.5-flash": { promptPer1M: 1.5, completionPer1M: 9.0 },
    "gemini-3.6-flash": { promptPer1M: 0.75, completionPer1M: 3.75 },
    "gemini-3.7-flash": { promptPer1M: 0.75, completionPer1M: 3.75 },
    "gemini-3.8-flash": { promptPer1M: 0.75, completionPer1M: 3.75 },
    // Pro pricing below is the <=200k-token tier; a higher tier applies past that (not modeled here).
    "gemini-2.5-pro": { promptPer1M: 1.25, completionPer1M: 10.0 },
  },
  openai: {
    "gpt-4.1-nano": { promptPer1M: 0.1, completionPer1M: 0.4 },
    "gpt-4o-mini": { promptPer1M: 0.15, completionPer1M: 0.6 },
    "gpt-5-nano": { promptPer1M: 0.05, completionPer1M: 0.4 },
    "gpt-5-mini": { promptPer1M: 0.25, completionPer1M: 2.0 },
    "gpt-4.1-mini": { promptPer1M: 0.4, completionPer1M: 1.6 },
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
