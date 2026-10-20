import { createVocabularySchema } from "@myenglishjourney/shared";
import { authedRoute } from "@/server/http/handler";
import { vocabularyService } from "@/server/services/vocabulary/vocabulary.service";

export const GET = authedRoute({ services: ["supabase"] }, ({ supabase, user }) => vocabularyService.list(supabase, user.id));

export const POST = authedRoute(
  { services: ["supabase"], schema: createVocabularySchema, status: 201 },
  ({ supabase, user, body }) => vocabularyService.create(supabase, user.id, body),
);
