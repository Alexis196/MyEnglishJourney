create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  current_level text check (current_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  explanation_language text not null default 'es' check (explanation_language in ('es', 'en')),
  theme_preference text not null default 'system' check (theme_preference in ('light', 'dark', 'system')),
  timezone text,
  onboarding_completed boolean not null default false,
  current_plan_id uuid,
  streak_count integer not null default 0,
  longest_streak integer not null default 0,
  last_activity_date date,
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
-- No insert/delete policy: rows are created only by handle_new_user() (security definer)
-- and deleted only via the auth.users cascade, never directly by a client.

-- Auto-create a profile row whenever a new auth user signs up, so the
-- frontend never has to perform a separate "create profile" step.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
