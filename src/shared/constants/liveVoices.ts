/**
 * Voices offered for the live tutor: a curated subset of the Gemini prebuilt voices (names and traits come from the
 * Gemini speech docs). The id is sent to the API as is, so only ids from this list are ever accepted.
 */
export interface LiveVoice {
  id: string;
  /** Spanish description of how the voice sounds. */
  trait: string;
}

export const LIVE_VOICES: readonly LiveVoice[] = [
  { id: "Kore", trait: "Firme" },
  { id: "Puck", trait: "Animada" },
  { id: "Charon", trait: "Informativa" },
  { id: "Aoede", trait: "Aireada" },
  { id: "Zephyr", trait: "Brillante" },
  { id: "Leda", trait: "Juvenil" },
  { id: "Sulafat", trait: "Cálida" },
  { id: "Achird", trait: "Amistosa" },
  { id: "Vindemiatrix", trait: "Suave" },
  { id: "Gacrux", trait: "Madura" },
  { id: "Schedar", trait: "Pareja" },
  { id: "Callirrhoe", trait: "Relajada" },
] as const;

export const DEFAULT_LIVE_VOICE = "Kore";

export function isLiveVoice(id: string | undefined): id is string {
  return LIVE_VOICES.some((voice) => voice.id === id);
}

/**
 * The Live API has no speed setting, so pace is requested to the tutor in its instructions.
 * "auto" lets the student's CEFR level decide (slower for beginners).
 */
export const LIVE_PACES = [
  { id: "auto", label: "Según mi nivel" },
  { id: "very_slow", label: "Muy lento" },
  { id: "slow", label: "Lento" },
  { id: "normal", label: "Normal" },
] as const;

export type LivePace = (typeof LIVE_PACES)[number]["id"];
export const LIVE_PACE_IDS = LIVE_PACES.map((pace) => pace.id) as [LivePace, ...LivePace[]];

/**
 * Pace asks the tutor to talk slower, but the model only moves a little (about 15-25% in tests), so each pace also sets
 * how fast the browser plays the audio back. Slower playback lowers the pitch slightly; that is the trade-off.
 */
export const LIVE_PLAYBACK_RATE: Record<LivePace, number> = { auto: 1, normal: 1, slow: 0.85, very_slow: 0.7 };

/** Playback speeds the student can switch between during the conversation. */
export const LIVE_PLAYBACK_RATES = [1, 0.85, 0.7] as const;
