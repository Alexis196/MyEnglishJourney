import { NextResponse } from "next/server";
import { isSupabaseConfigured, isGeminiConfigured, isOpenAiConfigured } from "@/server/config/env";

export function GET() {
  return NextResponse.json({
    status: "ok",
    configured: {
      supabase: isSupabaseConfigured,
      gemini: isGeminiConfigured,
      openai: isOpenAiConfigured,
    },
  });
}
