# Row Level Security — design reasoning & manual verification

Every user-owned table in `supabase/migrations/` carries its own `user_id` column
(denormalized on purpose, even where it's reachable through a parent row) so every
policy is the same flat check:

```sql
using (auth.uid() = user_id)
with check (auth.uid() = user_id)
```

This is simpler to audit than nested `EXISTS (...)` policies and cannot be bypassed by a
forged `user_id` in a request body, because the backend never trusts a client-supplied
`user_id` — it always derives it from the verified JWT (`req.user.id` set by
`authenticate`, see `src/server/http/requireAuth.ts`) and queries through a
**request-scoped Supabase client** built with that JWT (`src/server/lib/supabaseClient.ts`),
so every query is subject to RLS as that specific user. The service-role key
(`src/server/config/supabaseAdmin.ts`) bypasses RLS entirely and is not used by any
Phase 1 data path.

## Table-by-table policy shape

| Table | select | insert | update | delete | Notes |
|---|---|---|---|---|---|
| profiles | own | — | own | — | Row is created only by the `handle_new_user()` trigger (`security definer`) on signup, never by a direct client insert. No delete policy — rows are removed only via `auth.users` cascade. |
| learning_goals | own | own | own | own | |
| learning_plans | own | own | own | own | |
| plan_days | own | own | own | own | |
| lessons | own | own | own | own | |
| lesson_sections | own | own | own | own | |
| exercises | own | own | own | own | See the "answer_key" caveat below. |
| exercise_attempts | own | own | own | own | |
| vocabulary | own | own | own | own | |
| vocabulary_reviews | own | own | own | own | |
| speaking_sessions | own | own | own | own | |
| error_journal | own | own | own | own | |
| study_sessions | own | own | own | own | |
| progress_metrics | own | own | own | own | |
| ai_usage_logs | own | own | — | — | Append-only audit trail; no update/delete policy at all. |
| user_ai_settings | own | own | own | — | No delete — the row is 1:1 with the user and lazily created on first read. |

## Known limitation: `exercises.answer_key`

RLS enforces **row ownership**, not **column visibility**. The backend API never returns
`answer_key` to the client (`lesson.service.ts` strips it before building the response),
but because the frontend holds the user's own valid Supabase JWT, a motivated user could
in principle call the Postgrest endpoint directly (e.g. from browser dev tools) and select
their own row's `answer_key`, bypassing the app's stripping logic. This is a self-only
"cheat on your own exercise" concern, not a cross-user data exposure — the RLS boundary
between different users' data is unaffected. It's an accepted Phase 1 trade-off; a future
hardening step is to `REVOKE SELECT (answer_key) ... FROM authenticated` and have the
backend read it via the service-role client instead (with an explicit `user_id` filter in
the query, since service-role bypasses RLS).

## Manual verification (requires a real Supabase project)

This cannot be fully exercised without live Supabase Auth issuing real JWTs for two
different accounts. Once you have a project set up (see the root README):

1. Register two accounts (e.g. `a@example.com`, `b@example.com`) through the app.
2. In the Supabase SQL editor, run a query **as each user** via `set local role authenticated; set local request.jwt.claims = '{"sub": "<user-a-id>"}';` (or use "RLS test as user" in Supabase Studio's table editor, which does this for you) and confirm:
   - Selecting from any table above as user A never returns user B's rows.
   - Attempting `insert ... (user_id) values ('<user-b-id>')` while impersonating user A is rejected by the `with check` clause.
3. Confirm `ai_usage_logs` cannot be updated or deleted at all, even by its owner (no policy exists for those operations, so Postgrest returns 42501/permission denied).
4. Confirm an unauthenticated request (no JWT, using only the anon key) gets zero rows from every table above — RLS has no policy granting anon access.
