import type { CefrLevel, ExerciseType } from "@myenglishjourney/shared";

/**
 * Programmatic, per-level lesson rules. The prompt describes them to the model, and lessonValidator enforces the
 * measurable ones afterwards — we never rely on "generate an A2 lesson" alone.
 */
export interface CefrRules {
  level: CefrLevel;
  /** Language used for explanations and exercise instructions. */
  instructionLanguage: "spanish" | "mostly_spanish" | "mixed" | "mostly_english" | "english";
  /** Max words per English sentence in examples, vocabulary examples and translation texts. */
  maxWordsPerSentence: number;
  /** Cap on new vocabulary items in one lesson, whatever the session length. */
  maxNewWords: number;
  /** Allowed range of `minWords` for free-writing exercises. */
  freeWritingMinWords: { min: number; max: number };
  /** Max free-writing exercises in one lesson (open writing is hard at the lower levels). */
  maxFreeWriting: number;
  /** Exercise types the model may use. */
  exerciseTypes: readonly ExerciseType[];
  /** 0..1: minimum share of Spanish function words expected in explanations (0 = not checked). */
  minSpanishShareInExplanations: number;
  grammar: string;
  vocabulary: string;
  texts: string;
  listening: string;
  speaking: string;
  support: string;
}

const EASY_TYPES = ["multiple_choice", "fill_in_blank", "translation_es_en", "translation_en_es"] as const;
const ALL_TYPES = [...EASY_TYPES, "free_writing"] as const;

export const CEFR_RULES: Record<CefrLevel, CefrRules> = {
  A1: {
    level: "A1",
    instructionLanguage: "spanish",
    maxWordsPerSentence: 8,
    maxNewWords: 8,
    freeWritingMinWords: { min: 5, max: 10 },
    maxFreeWriting: 1,
    exerciseTypes: EASY_TYPES,
    minSpanishShareInExplanations: 0.2,
    grammar:
      "Only present simple of 'to be' and a few very common verbs, basic articles, this/that, there is/are, simple questions (what/where/who). No past tenses, no perfect tenses, no conditionals, no phrasal verbs.",
    vocabulary:
      "The ~600 most frequent English words (family, food, colors, numbers, days, places, daily objects). Cognates welcome. Avoid idioms and any technical or specialised jargon.",
    texts: "Sentences of 3 to 8 words. No subordinate clauses. One idea per sentence. Very short texts (1-3 sentences).",
    listening: "Slow, clearly separated words; single short sentences.",
    speaking: "Answer with one or two short sentences; give a sentence starter or model answer.",
    support:
      "Explain everything in Spanish. Give a model answer or sentence starter for every open task. Offer 3 options in multiple choice. Show the Spanish meaning of every new word.",
  },
  A2: {
    level: "A2",
    instructionLanguage: "mostly_spanish",
    maxWordsPerSentence: 12,
    maxNewWords: 10,
    freeWritingMinWords: { min: 10, max: 25 },
    maxFreeWriting: 1,
    exerciseTypes: EASY_TYPES,
    minSpanishShareInExplanations: 0.15,
    grammar:
      "Present simple and continuous, past simple (regular and common irregular verbs), going to, can/could, comparatives, countable/uncountable with some/any, basic prepositions and connectors (and, but, because).",
    vocabulary: "Frequent everyday vocabulary (~1200-1500 words): routines, shopping, travel basics, hobbies, simple work and study topics. Explain any slightly specialised word.",
    texts: "Sentences of 6 to 12 words, mostly simple with at most one 'and/but/because'. Short texts (3-5 sentences).",
    listening: "Clear, slow speech; familiar topics; short exchanges.",
    speaking: "Answers of 2 to 4 sentences with a model or prompts to follow.",
    support: "Explain in Spanish with simple English examples. Provide hints for open tasks. 3-4 options in multiple choice.",
  },
  B1: {
    level: "B1",
    instructionLanguage: "mixed",
    maxWordsPerSentence: 18,
    maxNewWords: 12,
    freeWritingMinWords: { min: 25, max: 60 },
    maxFreeWriting: 2,
    exerciseTypes: ALL_TYPES,
    minSpanishShareInExplanations: 0,
    grammar:
      "Present perfect, past continuous, future forms, first conditional, modals of obligation/advice, relative clauses (who/which/that), basic passive, used to.",
    vocabulary: "Common vocabulary plus topic vocabulary (~2500-3000 words); some collocations and basic phrasal verbs.",
    texts: "Sentences up to 18 words with simple subordination. Texts of 4-7 sentences on familiar topics.",
    listening: "Normal-speed, clear speech on familiar topics.",
    speaking: "Answers of 4 to 6 sentences; give reasons and examples; light prompts only.",
    support: "Mix Spanish and English in explanations (key rules in Spanish). Fewer hints; keep instructions short.",
  },
  B2: {
    level: "B2",
    instructionLanguage: "mostly_english",
    maxWordsPerSentence: 24,
    maxNewWords: 14,
    freeWritingMinWords: { min: 50, max: 100 },
    maxFreeWriting: 2,
    exerciseTypes: ALL_TYPES,
    minSpanishShareInExplanations: 0,
    grammar:
      "Second and third conditionals, reported speech, perfect continuous tenses, passive in more tenses, wish/if only, defining and non-defining relative clauses, linking devices.",
    vocabulary: "Broad vocabulary (~4000-5000 words), collocations, common phrasal verbs, nuance between near-synonyms.",
    texts: "Natural sentences up to 24 words; texts of 6-10 sentences with varied structures.",
    listening: "Natural speed, different accents, longer stretches.",
    speaking: "Developed answers with opinions, comparisons and justification.",
    support: "Explain mostly in English; use Spanish only for subtle contrasts. Minimal hints.",
  },
  C1: {
    level: "C1",
    instructionLanguage: "english",
    maxWordsPerSentence: 30,
    maxNewWords: 16,
    freeWritingMinWords: { min: 80, max: 150 },
    maxFreeWriting: 3,
    exerciseTypes: ALL_TYPES,
    minSpanishShareInExplanations: 0,
    grammar:
      "Mixed conditionals, inversion for emphasis, cleft sentences, advanced modals (speculation, deduction), nominalisation, subjunctive-like structures, complex linking.",
    vocabulary: "Advanced, precise and idiomatic vocabulary (~6000-8000 words), formal/informal register, collocations, discourse markers.",
    texts: "Complex sentences up to 30 words; authentic-style texts with implicit meaning.",
    listening: "Fast, authentic speech with idioms and implied meaning.",
    speaking: "Fluent, structured, argued answers with nuance and appropriate register.",
    support: "Everything in English. No hints unless the student asks; Spanish only for brief contrastive notes.",
  },
  C2: {
    level: "C2",
    instructionLanguage: "english",
    maxWordsPerSentence: 36,
    maxNewWords: 16,
    freeWritingMinWords: { min: 100, max: 200 },
    maxFreeWriting: 3,
    exerciseTypes: ALL_TYPES,
    minSpanishShareInExplanations: 0,
    grammar: "Full range with precision: subtle tense/aspect choices, stylistic variation, register shifts, rare structures.",
    vocabulary: "Rich, nuanced, idiomatic and low-frequency vocabulary; irony, figurative language, subtle connotation.",
    texts: "Sophisticated, authentic-style texts; long sentences when natural.",
    listening: "Native speed, regional variety, humour and subtext.",
    speaking: "Spontaneous, precise, stylistically varied answers.",
    support: "Everything in English; challenge the student; no scaffolding by default.",
  },
};

export function getCefrRules(level: CefrLevel | null | undefined): CefrRules {
  return CEFR_RULES[level ?? "A1"] ?? CEFR_RULES.A1;
}

const INSTRUCTION_LANGUAGE_TEXT: Record<CefrRules["instructionLanguage"], string> = {
  spanish: "Spanish for ALL explanations and exercise instructions (only the English target sentences are in English).",
  mostly_spanish: "Mostly Spanish for explanations and instructions; English only for the target language and short examples.",
  mixed: "A balanced mix: key grammar rules in Spanish, instructions short and in simple English.",
  mostly_english: "Mostly English for explanations and instructions; Spanish only for subtle contrasts.",
  english: "English for explanations and instructions.",
};

/** Plain-text rules block placed inside the lesson prompt. */
export function describeCefrRules(rules: CefrRules): string {
  return [
    `CEFR level: ${rules.level} (strict — never exceed it)`,
    `- Language of explanations/instructions: ${INSTRUCTION_LANGUAGE_TEXT[rules.instructionLanguage]}`,
    `- Grammar scope: ${rules.grammar}`,
    `- Vocabulary: ${rules.vocabulary}`,
    `- Sentence length: at most ${rules.maxWordsPerSentence} words per English sentence. ${rules.texts}`,
    `- New words per lesson: at most ${rules.maxNewWords}.`,
    `- Free-writing tasks: at most ${rules.maxFreeWriting}; "minWords" between ${rules.freeWritingMinWords.min} and ${rules.freeWritingMinWords.max}.`,
    `- Speaking tasks: ${rules.speaking}`,
    `- Listening difficulty (for future audio tasks): ${rules.listening}`,
    `- Level of help: ${rules.support}`,
  ].join("\n");
}
