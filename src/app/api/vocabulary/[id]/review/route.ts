import { reviewGradeSchema, type ReviewGradeInput } from "@myenglishjourney/shared";
import { authedRoute } from "@/server/http/handler";
import { vocabularyService } from "@/server/services/vocabulary/vocabulary.service";

export const POST = authedRoute<ReviewGradeInput, { id: string }>(
  { services: ["supabase"], schema: reviewGradeSchema },
  ({ supabase, user, body, params }) => vocabularyService.grade(supabase, user.id, params.id, body),
);
