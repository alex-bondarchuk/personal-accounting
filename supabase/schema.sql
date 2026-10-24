-- Виконай цей SQL у Supabase Dashboard → SQL Editor.
create table if not exists public.expenses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount integer not null check (amount > 0),
  expense_date date not null,
  category smallint not null default 7 check (category between 0 and 7),
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_date_idx on public.expenses (user_id, expense_date desc);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  budgets jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

drop policy if exists "Users can view their own expenses" on public.expenses;
create policy "Users can view their own expenses" on public.expenses
  for select using (auth.uid() = user_id);

drop policy if exists "Users can create their own expenses" on public.expenses;
create policy "Users can create their own expenses" on public.expenses
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own expenses" on public.expenses;
create policy "Users can update their own expenses" on public.expenses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own expenses" on public.expenses;
create policy "Users can delete their own expenses" on public.expenses
  for delete using (auth.uid() = user_id);

alter table public.user_settings enable row level security;

drop policy if exists "Users can view their own settings" on public.user_settings;
create policy "Users can view their own settings" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "Users can create their own settings" on public.user_settings;
create policy "Users can create their own settings" on public.user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own settings" on public.user_settings;
create policy "Users can update their own settings" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
