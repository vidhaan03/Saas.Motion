-- ─────────────────────────────────────────────────────────────────────────
-- motion.saas database schema
--
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste this →
-- click "Run". Re-running is safe (everything uses IF NOT EXISTS / CREATE
-- OR REPLACE), so you can re-apply after changes too.
-- ─────────────────────────────────────────────────────────────────────────

-- ─── profiles ──────────────────────────────────────────────────────────────
-- One row per authenticated user. Auto-created via trigger when a new auth
-- user signs up.
create table if not exists public.profiles (
  id                    uuid        primary key references auth.users(id) on delete cascade,
  display_name          text,
  default_brand_name    text,
  default_brand_color   text        default '#0EA5E9',
  default_brand_accent  text        default '#22D3EE',
  default_aspect        text        default 'vertical',
  theme_preference      text        default 'system',
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ─── storyboards ───────────────────────────────────────────────────────────
-- One row per saved storyboard. Full JSON blob in `storyboard`.
create table if not exists public.storyboards (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references auth.users(id) on delete cascade,
  name                  text        not null,
  storyboard            jsonb       not null,
  scene_count           int,
  total_duration_frames int,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists storyboards_user_id_idx on public.storyboards(user_id);
create index if not exists storyboards_created_at_idx on public.storyboards(user_id, created_at desc);

-- ─── Row-level security ───────────────────────────────────────────────────
-- Users can only see and modify their own rows. No anonymous access.
alter table public.profiles enable row level security;
alter table public.storyboards enable row level security;

drop policy if exists "users read own profile"    on public.profiles;
drop policy if exists "users update own profile"  on public.profiles;
drop policy if exists "users insert own profile"  on public.profiles;

create policy "users read own profile"    on public.profiles
  for select using (auth.uid() = id);
create policy "users update own profile"  on public.profiles
  for update using (auth.uid() = id);
create policy "users insert own profile"  on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "users CRUD own storyboards" on public.storyboards;
create policy "users CRUD own storyboards" on public.storyboards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Auto-create profile when a new auth user signs up ────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Auto-update `updated_at` ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at    on public.profiles;
drop trigger if exists storyboards_set_updated_at on public.storyboards;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger storyboards_set_updated_at
  before update on public.storyboards
  for each row execute function public.set_updated_at();

-- ─── Backfill profiles for any users that signed up before this migration ─
insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  )
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
