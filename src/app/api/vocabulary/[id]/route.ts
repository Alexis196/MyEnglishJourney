import { updateVocabularySchema, type UpdateVocabularyInput } from "@myenglishjourney/shared";
import { authedRoute } from "@/server/http/handler";
import { vocabularyService } from "@/server/services/vocabulary/vocabulary.service";

export const PATCH = authedRoute<UpdateVocabularyInput, { id: string }>(
  { services: ["supabase"], schema: updateVocabularySchema },
  ({ supabase, user, body, params }) => vocabularyService.update(supabase, user.id, params.id, body),
);

export const DELETE = authedRoute<undefined, { id: string }>({ services: ["supabase"] }, async ({ supabase, user, params }) => {
  await vocabularyService.remove(supabase, user.id, params.id);
  return { ok: true };
});
