import { GoogleGenAI, Modality } from "@google/genai";
import { env } from "../../config/env";

export interface LiveTokenParams {
  model: string;
  /** How long the conversation may last; the token expires shortly after. */
  maxSeconds: number;
  /** The tutor's rules. Locked inside the token: the browser cannot change them and the API only honours them this way. */
  systemInstruction: string;
  voice: string;
}

/**
 * Creates a short-lived, single-use token the browser uses to talk to the Gemini Live API directly (a serverless
 * function cannot hold a streaming audio connection). The real API key stays on the server; the token is bound to
 * one model, the tutor's rules and audio replies, can open one session, and must be used within a minute.
 */
export async function createLiveToken({ model, maxSeconds, systemInstruction, voice }: LiveTokenParams): Promise<string> {
  const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const now = Date.now();
  const token = await client.authTokens.create({
    config: {
      uses: 1,
      expireTime: new Date(now + (maxSeconds + 120) * 1000).toISOString(),
      newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),
      liveConnectConstraints: {
        model,
        // With a constrained token the session setup comes from here: anything the browser sends on its own is ignored,
        // so the instruction must live in the token or the tutor would run without its rules.
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
          realtimeInputConfig: { automaticActivityDetection: { silenceDurationMs: 800 } },
        },
      },
    },
  });
  if (!token.name) throw new Error("Gemini did not return a live token");
  return token.name;
}
