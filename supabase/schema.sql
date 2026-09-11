-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Sets up the shared-journal mirror: one row per local SQLite row, tagged by
-- who owns it. Local SQLite stays the source of truth on each machine; this
-- is purely a read-shared mirror.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles: minimal public info about each signed-in user (auth.users itself
-- isn't queryable from the client).
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles are readable by any signed-in user"
  on profiles for select
  to authenticated
  using (true);

create policy "users manage their own profile"
  on profiles for all
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------------
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id integer not null,
  name text not null,
  broker text,
  starting_balance numeric not null default 0,
  currency text not null default 'USD',
  account_type text not null default 'live',
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

-- ---------------------------------------------------------------------------
-- strategies
-- ---------------------------------------------------------------------------
create table if not exists strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id integer not null,
  name text not null,
  description text,
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

-- ---------------------------------------------------------------------------
-- trades
-- ---------------------------------------------------------------------------
create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id integer not null,
  name text,
  date text not null,
  pair text,
  session text,
  direction text,
  risk_per_trade numeric,
  pnl numeric not null default 0,
  r_multiple numeric,
  followed_plan boolean not null default false,
  break_even boolean not null default false,
  entry_win boolean not null default false,
  strategy_local_id integer,
  account_local_id integer,
  notes text,
  source text not null default 'manual',
  created_at text,
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

-- ---------------------------------------------------------------------------
-- missed_trades
-- ---------------------------------------------------------------------------
create table if not exists missed_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id integer not null,
  date text not null,
  pair text,
  direction text,
  would_be_pnl numeric,
  reason_missed text,
  strategy_local_id integer,
  notes text,
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

-- ---------------------------------------------------------------------------
-- trade_images: points at the actual bytes in the `trade-images` Storage
-- bucket below. One row per local `entity_images` row for entity_type='trade'
-- — missed-trade screenshots never sync, same as missed trades not appearing
-- in the Shared tab at all.
-- ---------------------------------------------------------------------------
create table if not exists trade_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_trade_id integer not null,
  local_image_id integer not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  unique (user_id, local_image_id)
);

-- ---------------------------------------------------------------------------
-- RLS: everyone signed in can read everything; you can only write your own.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in select unnest(array['accounts', 'strategies', 'trades', 'missed_trades', 'trade_images'])
  loop
    execute format('alter table %I enable row level security', t);

    execute format(
      'create policy "%1$s readable by any signed-in user" on %1$I for select to authenticated using (true)',
      t
    );

    execute format(
      'create policy "users write their own %1$s" on %1$I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: a public bucket for trade screenshots, one object per image at
-- `<user_id>/<local_image_id>.<ext>`. Public read means the Shared tab can
-- just render the plain URL — no signed-URL plumbing needed for a private
-- two-person tool. Writes are still locked to each user's own folder.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('trade-images', 'trade-images', true)
on conflict (id) do nothing;

create policy "trade-images readable by anyone"
  on storage.objects for select
  using (bucket_id = 'trade-images');

create policy "users upload their own trade images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'trade-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users update their own trade images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'trade-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete their own trade images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'trade-images' and (storage.foldername(name))[1] = auth.uid()::text);
