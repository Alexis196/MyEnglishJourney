import { describe, expect, it } from "vitest";
import { DEFAULT_LIVE_VOICE, isLiveVoice, LIVE_PACE_IDS, LIVE_PLAYBACK_RATE, LIVE_PLAYBACK_RATES, LIVE_VOICES } from "./liveVoices";
import { startLiveSpeakingSchema } from "../schemas/liveSpeaking.schema";

describe("live voices and pace", () => {
  it("offers unique voices and includes the default", () => {
    const ids = LIVE_VOICES.map((voice) => voice.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(isLiveVoice(DEFAULT_LIVE_VOICE)).toBe(true);
    expect(isLiveVoice("NotAVoice")).toBe(false);
    expect(isLiveVoice(undefined)).toBe(false);
  });

  it("every pace has a playback rate that never speeds the audio up", () => {
    for (const pace of LIVE_PACE_IDS) expect(LIVE_PLAYBACK_RATE[pace]).toBeLessThanOrEqual(1);
    expect(LIVE_PLAYBACK_RATE.very_slow).toBeLessThan(LIVE_PLAYBACK_RATE.slow);
    expect(LIVE_PLAYBACK_RATE.slow).toBeLessThan(LIVE_PLAYBACK_RATE.normal);
    // The speeds offered during a conversation include what every pace starts at.
    for (const pace of LIVE_PACE_IDS) expect(LIVE_PLAYBACK_RATES as readonly number[]).toContain(LIVE_PLAYBACK_RATE[pace]);
  });

  it("the start request accepts a known voice and pace, defaults the pace and rejects unknown voices", () => {
    expect(startLiveSpeakingSchema.parse({ mode: "free", voice: "Puck", pace: "slow" })).toMatchObject({ voice: "Puck", pace: "slow" });
    expect(startLiveSpeakingSchema.parse({ mode: "free" }).pace).toBe("auto");
    expect(startLiveSpeakingSchema.safeParse({ mode: "free", voice: "Hacker" }).success).toBe(false);
    expect(startLiveSpeakingSchema.safeParse({ mode: "free", pace: "ludicrous" }).success).toBe(false);
  });
});
