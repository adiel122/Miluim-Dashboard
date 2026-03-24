-- Shabtzak — shift management schema + RLS
-- Run after supabase/schema.sql (or merge). Safe to re-run: uses IF NOT EXISTS / guarded ALTERs.

create extension if not exists "pgcrypto";

-- --- Migrate profiles to Shabtzak column names (from legacy military_role + role) ---
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'military_role'
  )
  and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role_description'
  ) then
    alter table public.profiles rename column military_role to role_description;
  end if;
end $$;

alter table public.profiles add column if not exists is_admin boolean not null default false;

alter table public.profiles drop column if exists role;

-- התאמה להתחברות OAuth: שדות פרופיל יכולים להיות ריקים עד /setup-profile
alter table public.profiles alter column first_name drop not null;
alter table public.profiles alter column last_name drop not null;
alter table public.profiles alter column military_id drop not null;
alter table public.profiles alter column phone drop not null;
alter table public.profiles alter column rank drop not null;
alter table public.profiles alter column role_description drop not null;

do $$
begin
  alter table public.profiles drop constraint if exists military_id_seven_digits;
  alter table public.profiles add constraint military_id_seven_digits check (
    military_id is null
    or (
      char_length(military_id) = 7
      and military_id ~ '^[0-9]{7}$'
    )
  );
exception
  when others then null;
end $$;

do $$
begin
  alter table public.profiles drop constraint if exists phone_ten_digits;
  alter table public.profiles add constraint phone_ten_digits check (
    phone is null
    or (
      char_length(phone) = 10
      and phone ~ '^[0-9]{10}$'
    )
  );
exception
  when others then null;
end $$;

-- --- Enums ---
do $$
begin
  create type public.shift_type as enum ('day', 'night');
exception
  when duplicate_object then null;
end $$;

-- --- shifts ---
-- עמודת התאריך: shift_date (שם מפורש; "date" שמור בסוג הנתונים)
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  shift_date date not null,
  shift_type public.shift_type not null,
  mission_name text not null default 'כוננות לאתרי הרס',
  start_time time not null,
  created_at timestamptz not null default now(),
  unique (shift_date, shift_type, start_time)
);

create index if not exists shifts_shift_date_idx on public.shifts (shift_date asc);

-- --- assignments ---
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  team_number smallint not null check (team_number in (1, 2, 3)),
  position text not null check (position in ('מפקד', 'נהג', 'מחלץ')),
  created_at timestamptz not null default now(),
  unique (shift_id, team_number, position),
  unique (shift_id, profile_id)
);

create index if not exists assignments_shift_id_idx on public.assignments (shift_id);
create index if not exists assignments_profile_id_idx on public.assignments (profile_id);

-- --- User unavailability (אילוצים) ---
create table if not exists public.profile_constraints (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  constraint_date date not null,
  created_at timestamptz not null default now(),
  unique (profile_id, constraint_date)
);

create index if not exists profile_constraints_profile_date_idx
  on public.profile_constraints (profile_id, constraint_date);

-- --- RLS ---
alter table public.shifts enable row level security;
alter table public.assignments enable row level security;
alter table public.profile_constraints enable row level security;

-- Profiles: replace restrictive policy with board-friendly read + admin write
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own_soldier" on public.profiles;
create policy "profiles_update_own_soldier"
  on public.profiles for update
  to authenticated
  using (
    auth.uid() = id
    and coalesce((select is_admin from public.profiles p where p.id = auth.uid()), false) = false
  )
  with check (
    auth.uid() = id
    and is_admin = false
  );

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (coalesce((select is_admin from public.profiles p where p.id = auth.uid()), false) = true)
  with check (true);

-- shifts
drop policy if exists "shifts_select_authenticated" on public.shifts;
create policy "shifts_select_authenticated"
  on public.shifts for select
  to authenticated
  using (true);

drop policy if exists "shifts_admin_insert" on public.shifts;
create policy "shifts_admin_insert"
  on public.shifts for insert
  to authenticated
  with check (coalesce((select is_admin from public.profiles p where p.id = auth.uid()), false) = true);

drop policy if exists "shifts_admin_update" on public.shifts;
create policy "shifts_admin_update"
  on public.shifts for update
  to authenticated
  using (coalesce((select is_admin from public.profiles p where p.id = auth.uid()), false) = true);

drop policy if exists "shifts_admin_delete" on public.shifts;
create policy "shifts_admin_delete"
  on public.shifts for delete
  to authenticated
  using (coalesce((select is_admin from public.profiles p where p.id = auth.uid()), false) = true);

-- assignments
drop policy if exists "assignments_select_authenticated" on public.assignments;
create policy "assignments_select_authenticated"
  on public.assignments for select
  to authenticated
  using (true);

drop policy if exists "assignments_admin_insert" on public.assignments;
create policy "assignments_admin_insert"
  on public.assignments for insert
  to authenticated
  with check (coalesce((select is_admin from public.profiles p where p.id = auth.uid()), false) = true);

drop policy if exists "assignments_admin_update" on public.assignments;
create policy "assignments_admin_update"
  on public.assignments for update
  to authenticated
  using (coalesce((select is_admin from public.profiles p where p.id = auth.uid()), false) = true);

drop policy if exists "assignments_admin_delete" on public.assignments;
create policy "assignments_admin_delete"
  on public.assignments for delete
  to authenticated
  using (coalesce((select is_admin from public.profiles p where p.id = auth.uid()), false) = true);

-- profile_constraints
-- קריאה לכל המחוברים: נדרש ללוח שבצ״ק ולאזהרות אילוץ (תאריך + מזהה בלבד ברמת האפליקציה)
drop policy if exists "profile_constraints_select" on public.profile_constraints;
create policy "profile_constraints_select"
  on public.profile_constraints for select
  to authenticated
  using (true);

drop policy if exists "profile_constraints_insert_own" on public.profile_constraints;
create policy "profile_constraints_insert_own"
  on public.profile_constraints for insert
  to authenticated
  with check (profile_id = auth.uid());

drop policy if exists "profile_constraints_update_own" on public.profile_constraints;
create policy "profile_constraints_update_own"
  on public.profile_constraints for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "profile_constraints_delete_own" on public.profile_constraints;
create policy "profile_constraints_delete_own"
  on public.profile_constraints for delete
  to authenticated
  using (profile_id = auth.uid());

-- משתמש ראשון כמנהל (הרץ פעם אחת; החלף למזהה או למספר אישי הרלוונטי):
-- update public.profiles set is_admin = true where military_id = '0123456';
