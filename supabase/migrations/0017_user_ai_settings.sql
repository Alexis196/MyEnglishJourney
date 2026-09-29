create table public.user_ai_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider_mode text not null default 'auto' check (provider_mode in ('auto', 'gemini_only', 'openai_only')),
  monthly_budget_usd numeric(6, 2) not null default 3.00 check (monthly_budget_usd >= 0),
  hard_block_at_budget boolean not null default true,
  notify_at_percent integer not null default 80 check (notify_at_percent between 1 and 100),
  updated_at timestamptz not null default now()
);

create trigger set_user_ai_settings_updated_at
  before update on public.user_ai_settings
  for each row execute function public.set_updated_at();

alter table public.user_ai_settings enable row level security;

create policy "user_ai_settings_select_own" on public.user_ai_settings for select using (auth.uid() = user_id);
create policy "user_ai_settings_insert_own" on public.user_ai_settings for insert with check (auth.uid() = user_id);
create policy "user_ai_settings_update_own" on public.user_ai_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
