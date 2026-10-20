import { authedRoute } from "@/server/http/handler";
import { vocabularyService } from "@/server/services/vocabulary/vocabulary.service";

export const GET = authedRoute({ services: ["supabase"] }, ({ supabase, user }) => vocabularyService.reviewQueue(supabase, user.id));
