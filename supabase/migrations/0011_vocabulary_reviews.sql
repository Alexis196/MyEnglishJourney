-- SM-2-style spaced repetition state, one row per vocabulary item.
create table public.vocabulary_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id uuid not null unique references public.vocabulary(id) on delete cascade,
  ease_factor numeric(4, 2) not null default 2.5,
  interval_days integer not null default 1,
  repetitions integer not null default 0,
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  last_grade integer check (last_grade between 0 and 5)
);

create index vocabulary_reviews_user_next_review_idx on public.vocabulary_reviews (user_id, next_review_at);

alter table public.vocabulary_reviews enable row level security;

create policy "vocabulary_reviews_select_own" on public.vocabulary_reviews for select using (auth.uid() = user_id);
create policy "vocabulary_reviews_insert_own" on public.vocabulary_reviews for insert with check (auth.uid() = user_id);
create policy "vocabulary_reviews_update_own" on public.vocabulary_reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vocabulary_reviews_delete_own" on public.vocabulary_reviews for delete using (auth.uid() = user_id);
