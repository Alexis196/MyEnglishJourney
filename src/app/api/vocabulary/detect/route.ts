import { detectVocabularySchema } from "@myenglishjourney/shared";
import { authedRoute } from "@/server/http/handler";
import { vocabularyService } from "@/server/services/vocabulary/vocabulary.service";

// Reads a pasted text and suggests the words that are probably new for the student's level.
export const maxDuration = 60;

export const POST = authedRoute(
  { services: ["supabase", "gemini"], schema: detectVocabularySchema },
  ({ supabase, user, body }) => vocabularyService.detect(supabase, user.id, body),
);
