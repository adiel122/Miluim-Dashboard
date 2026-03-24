-- הרחבות ניהול: צוותים/תפקידים גמישים, אפטר, הגדרות לוח
-- גרסה זו מוטמעת גם בסוף supabase/shabtzak_schema.sql — קובץ זה שימושי
-- כשכבר הרצת את הסכימה הבסיסית ורק צריך להוסיף את ההרחבות (או לדבג).

-- --- assignments: יותר צוותים ותפקיד טקסט חופשי (קצר) ---
alter table public.assignments drop constraint if exists assignments_team_number_check;
alter table public.assignments add constraint assignments_team_number_check
  check (team_number >= 1 and team_number <= 15);

alter table public.assignments drop constraint if exists assignments_position_trim_check;
alter table public.assignments drop constraint if exists assignments_position_check;
alter table public.assignments add constraint assignments_position_trim_check
  check (
    char_length(trim(position)) > 0
    and char_length(position) <= 48
  );

-- --- הגדרת מבנה מטריצה (שורת יחידה id=1) ---
create table if not exists public.admin_roster_settings (
  id smallint primary key default 1 check (id = 1),
  team_count smallint not null default 3 check (team_count between 1 and 15),
  positions text[] not null default array['מפקד', 'נהג', 'מחלץ']::text[],
  updated_at timestamptz not null default now()
);

insert into public.admin_roster_settings (id, team_count, positions)
values (1, 3, array['מפקד', 'נהג', 'מחלץ']::text[])
on conflict (id) do nothing;

-- --- יציאות אפטר (רישום אדמין) ---
create table if not exists public.after_hours_outings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  outing_date date not null,
  end_date date,
  note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint after_hours_dates_ok check (end_date is null or end_date >= outing_date)
);

create index if not exists after_hours_outings_profile_idx
  on public.after_hours_outings (profile_id, outing_date desc);

alter table public.admin_roster_settings enable row level security;
alter table public.after_hours_outings enable row level security;

drop policy if exists "roster_settings_select" on public.admin_roster_settings;
create policy "roster_settings_select"
  on public.admin_roster_settings for select
  to authenticated
  using (true);

drop policy if exists "roster_settings_admin_write" on public.admin_roster_settings;
create policy "roster_settings_admin_write"
  on public.admin_roster_settings for insert
  to authenticated
  with check (coalesce((select is_admin from public.profiles p where p.id = auth.uid()), false) = true);

drop policy if exists "roster_settings_admin_update" on public.admin_roster_settings;
create policy "roster_settings_admin_update"
  on public.admin_roster_settings for update
  to authenticated
  using (coalesce((select is_admin from public.profiles p where p.id = auth.uid()), false) = true)
  with check (coalesce((select is_admin from public.profiles p where p.id = auth.uid()), false) = true);

drop policy if exists "roster_settings_admin_delete" on public.admin_roster_settings;
create policy "roster_settings_admin_delete"
  on public.admin_roster_settings for delete
  to authenticated
  using (coalesce((select is_admin from public.profiles p where p.id = auth.uid()), false) = true);

drop policy if exists "after_hours_admin_select" on public.after_hours_outings;
create policy "after_hours_admin_select"
  on public.after_hours_outings for select
  to authenticated
  using (coalesce((select is_admin from public.profiles p where p.id = auth.uid()), false) = true);

drop policy if exists "after_hours_admin_insert" on public.after_hours_outings;
create policy "after_hours_admin_insert"
  on public.after_hours_outings for insert
  to authenticated
  with check (coalesce((select is_admin from public.profiles p where p.id = auth.uid()), false) = true);

drop policy if exists "after_hours_admin_update" on public.after_hours_outings;
create policy "after_hours_admin_update"
  on public.after_hours_outings for update
  to authenticated
  using (coalesce((select is_admin from public.profiles p where p.id = auth.uid()), false) = true);

drop policy if exists "after_hours_admin_delete" on public.after_hours_outings;
create policy "after_hours_admin_delete"
  on public.after_hours_outings for delete
  to authenticated
  using (coalesce((select is_admin from public.profiles p where p.id = auth.uid()), false) = true);
