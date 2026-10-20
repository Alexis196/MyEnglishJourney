import { enrichVocabularySchema } from "@myenglishjourney/shared";
import { authedRoute } from "@/server/http/handler";
import { vocabularyService } from "@/server/services/vocabulary/vocabulary.service";

// One short text-model call that fills in translation, example and category.
export const maxDuration = 30;

export const POST = authedRoute(
  { services: ["supabase", "gemini"], schema: enrichVocabularySchema },
  ({ supabase, user, body }) => vocabularyService.enrich(supabase, user.id, body),
);
