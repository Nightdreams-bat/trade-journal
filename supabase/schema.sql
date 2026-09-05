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
-- RLS: everyone signed in can read everything; you can only write your own.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in select unnest(array['accounts', 'strategies', 'trades', 'missed_trades'])
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
