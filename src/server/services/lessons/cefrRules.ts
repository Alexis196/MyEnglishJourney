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
  /**
   * Own-production ladder, in words. `main` is the lesson's culminating writing task, `short` the brief answers
   * that lead to it. These are ranges for the task at its pedagogical moment, not quotas: at A1 what matters is
   * a few correct simple sentences, not reaching the top of the range.
   */
  production: { main: { min: number; max: number }; short: { min: number; max: number } };
  /** Wording of the main task for the prompt, e.g. "2 to 4 simple sentences". */
  mainTaskShape: string;
  /** Sentence starters offered with writing tasks: always, optional or never. */
  starters: "always" | "optional" | "never";
  /** Max free-writing (AI-evaluated) exercises in one lesson: each costs one evaluation. */
  maxFreeWriting: number;
  /** Max share of pure multiple-choice recognition in the whole lesson before it counts as a flaw. */
  maxRecognitionShare: number;
  /** A grammar point must come with a visual pattern before it is evaluated. */
  requiresPattern: boolean;
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

const ALL_TYPES = [
  "multiple_choice",
  "fill_in_blank",
  "translation_es_en",
  "translation_en_es",
  "word_ordering",
  "grammar_error_correction",
  "free_writing",
] as const;

export const CEFR_RULES: Record<CefrLevel, CefrRules> = {
  A1: {
    level: "A1",
    instructionLanguage: "spanish",
    maxWordsPerSentence: 8,
    maxNewWords: 8,
    production: { main: { min: 8, max: 20 }, short: { min: 3, max: 8 } },
    mainTaskShape: "2 to 4 simple sentences about themselves, with sentence starters",
    starters: "always",
    maxFreeWriting: 2,
    maxRecognitionShare: 0.45,
    requiresPattern: true,
    exerciseTypes: ALL_TYPES,
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
    production: { main: { min: 20, max: 50 }, short: { min: 6, max: 18 } },
    mainTaskShape: "a short connected paragraph of 3 to 5 sentences",
    starters: "optional",
    maxFreeWriting: 3,
    maxRecognitionShare: 0.4,
    requiresPattern: true,
    exerciseTypes: ALL_TYPES,
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
    production: { main: { min: 50, max: 90 }, short: { min: 15, max: 35 } },
    mainTaskShape: "an open answer or a short paragraph / brief dialogue",
    starters: "never",
    maxFreeWriting: 3,
    maxRecognitionShare: 0.35,
    requiresPattern: false,
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
    production: { main: { min: 90, max: 150 }, short: { min: 30, max: 60 } },
    mainTaskShape: "an argued text giving an opinion with reasons and examples",
    starters: "never",
    maxFreeWriting: 3,
    maxRecognitionShare: 0.3,
    requiresPattern: false,
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
    production: { main: { min: 140, max: 220 }, short: { min: 50, max: 100 } },
    mainTaskShape: "a structured text with a clear line of argument and appropriate register",
    starters: "never",
    maxFreeWriting: 3,
    maxRecognitionShare: 0.3,
    requiresPattern: false,
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
    production: { main: { min: 180, max: 280 }, short: { min: 70, max: 130 } },
    mainTaskShape: "a nuanced, stylistically varied text",
    starters: "never",
    maxFreeWriting: 3,
    maxRecognitionShare: 0.3,
    requiresPattern: false,
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
    `- Own production: main task = ${rules.mainTaskShape} (${rules.production.main.min}-${rules.production.main.max} words); short answers ${rules.production.short.min}-${rules.production.short.max} words. At most ${rules.maxFreeWriting} free-writing tasks per lesson.`,
    `- Listening difficulty (for future audio tasks): ${rules.listening}`,
    `- Level of help: ${rules.support}`,
  ].join("\n");
}
