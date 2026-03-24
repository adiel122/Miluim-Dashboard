-- מצב פעיל/לא פעיל לפרופיל + חיזוק RLS: חייל לא יכול לשנות is_active בעצמו
-- הרץ ב-SQL Editor אחרי shabtzak_schema.sql (או בפרודקשן קיים).

alter table public.profiles
  add column if not exists is_active boolean not null default true;

comment on column public.profiles.is_active is 'כבוי = חשבון מושבת (משולב עם ban ב-Auth דרך האפליקציה)';

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
    and is_active is not distinct from (
      select p.is_active from public.profiles p where p.id = auth.uid()
    )
  );
