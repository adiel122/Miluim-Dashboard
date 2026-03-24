-- Miluim Sipoach — initial schema for Supabase (PostgreSQL)
-- Apply in: Supabase Dashboard → SQL Editor → New query → Run

create extension if not exists "pgcrypto";

-- --- Types ---
do $$
begin
  create type public.user_role as enum ('soldier', 'unit', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.listing_status as enum ('pending', 'approved', 'closed');
exception
  when duplicate_object then null;
end $$;

-- --- profiles: 1:1 with auth.users (personal & military identity) ---
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  military_id text not null
    constraint military_id_seven_digits check (
      char_length(military_id) = 7
      and military_id ~ '^[0-9]{7}$'
    ),
  phone text not null
    constraint phone_ten_digits check (
      char_length(phone) = 10
      and phone ~ '^[0-9]{10}$'
    ),
  rank text not null,
  military_role text not null,
  role public.user_role not null default 'soldier',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_military_id_key unique (military_id)
);

-- --- listings ---
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  rank_required text,
  profession text,
  location text,
  status public.listing_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists listings_status_idx on public.listings (status);
create index if not exists listings_created_at_idx on public.listings (created_at desc);
create index if not exists listings_user_id_idx on public.listings (user_id);

-- --- RLS ---
alter table public.profiles enable row level security;
alter table public.listings enable row level security;

-- Profiles: users manage only their row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Listings: public sees approved; authors see all their rows
drop policy if exists "listings_select_public" on public.listings;
create policy "listings_select_public"
  on public.listings for select
  using (
    status = 'approved'
    or (auth.uid() is not null and auth.uid() = user_id)
  );

drop policy if exists "listings_insert_own" on public.listings;
create policy "listings_insert_own"
  on public.listings for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "listings_update_own" on public.listings;
create policy "listings_update_own"
  on public.listings for update
  to authenticated
  using (auth.uid() = user_id);

-- Admin operations (approve / delete any listing) are best done with service_role
-- or a custom claim + policies — add when wiring the admin dashboard.
