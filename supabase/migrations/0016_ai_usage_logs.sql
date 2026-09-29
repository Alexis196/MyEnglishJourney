create table public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('gemini', 'openai')),
  model text not null,
  activity_type text not null check (
    activity_type in (
      'exercise_evaluation', 'writing_feedback', 'speaking_feedback',
      'plan_generation', 'error_journal_analysis', 'chat'
    )
  ),
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  latency_ms integer not null default 0,
  status text not null check (status in ('success', 'error', 'fallback')),
  error_code text,
  created_at timestamptz not null default now()
);

create index ai_usage_logs_user_created_idx on public.ai_usage_logs (user_id, created_at);
create index ai_usage_logs_user_provider_idx on public.ai_usage_logs (user_id, provider);

alter table public.ai_usage_logs enable row level security;

create policy "ai_usage_logs_select_own" on public.ai_usage_logs for select using (auth.uid() = user_id);
-- Insert only, enforced as the caller's own user_id: the backend always writes through
-- the request-scoped (per-user JWT) Supabase client, never the service-role key, so
-- this WITH CHECK is what actually stops a forged user_id from being logged as someone else.
create policy "ai_usage_logs_insert_own" on public.ai_usage_logs for insert with check (auth.uid() = user_id);
-- No update/delete policy: usage logs are an append-only audit trail.
