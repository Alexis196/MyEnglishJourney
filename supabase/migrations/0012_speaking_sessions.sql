create table public.speaking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  -- Path within the private "speaking-audio" Storage bucket, not a public URL.
  audio_storage_path text,
  duration_seconds integer check (duration_seconds >= 0),
  transcript text,
  ai_feedback jsonb,
  status text not null default 'recorded' check (status in ('recorded', 'transcribing', 'analyzed', 'failed')),
  created_at timestamptz not null default now()
);

create index speaking_sessions_user_created_idx on public.speaking_sessions (user_id, created_at);

alter table public.speaking_sessions enable row level security;

create policy "speaking_sessions_select_own" on public.speaking_sessions for select using (auth.uid() = user_id);
create policy "speaking_sessions_insert_own" on public.speaking_sessions for insert with check (auth.uid() = user_id);
create policy "speaking_sessions_update_own" on public.speaking_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "speaking_sessions_delete_own" on public.speaking_sessions for delete using (auth.uid() = user_id);
