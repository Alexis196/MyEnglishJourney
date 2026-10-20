"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_LIVE_VOICE, isLiveVoice, LIVE_PACE_IDS, type LivePace } from "@myenglishjourney/shared";

export interface LivePreferences {
  voice: string;
  pace: LivePace;
  correctWhileTalking: boolean;
}

const DEFAULTS: LivePreferences = { voice: DEFAULT_LIVE_VOICE, pace: "auto", correctWhileTalking: false };
const STORAGE_KEY = "live-speaking-preferences";
const CHANGE_EVENT = "live-speaking-preferences-changed";

function readRaw(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return ""; // storage blocked (private mode): fall back to the defaults
  }
}

function parse(raw: string): LivePreferences {
  try {
    const value = JSON.parse(raw) as Partial<LivePreferences>;
    return {
      voice: isLiveVoice(value.voice) ? value.voice : DEFAULTS.voice,
      pace: LIVE_PACE_IDS.includes(value.pace as LivePace) ? (value.pace as LivePace) : DEFAULTS.pace,
      correctWhileTalking: value.correctWhileTalking === true,
    };
  } catch {
    return DEFAULTS;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Voice, pace and correction mode, remembered per browser. Server render and first paint use the defaults. */
export function useLivePreferences() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  const preferences = raw ? parse(raw) : DEFAULTS;

  const update = useCallback((patch: Partial<LivePreferences>) => {
    const next = { ...parse(readRaw()), ...patch };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // not persisted, but the change still applies for this visit through the event below
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { preferences, update };
}
