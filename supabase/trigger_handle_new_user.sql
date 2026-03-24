-- Run after supabase/schema.sql + shabtzak_schema.sql
-- Syncs public.profiles from auth.users metadata on signup (שדות ריקים עד השלמת פרופיל).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fn text := nullif(trim(coalesce(new.raw_user_meta_data->>'first_name', '')), '');
  ln text := nullif(trim(coalesce(new.raw_user_meta_data->>'last_name', '')), '');
  mid text := nullif(trim(coalesce(new.raw_user_meta_data->>'military_id', '')), '');
  ph text := nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), '');
  rk text := nullif(trim(coalesce(new.raw_user_meta_data->>'rank', '')), '');
  rd text := nullif(trim(coalesce(
    new.raw_user_meta_data->>'role_description',
    new.raw_user_meta_data->>'military_role',
    ''
  )), '');
begin
  if mid is not null and mid !~ '^[0-9]{7}$' then
    mid := null;
  end if;
  if ph is not null and (char_length(ph) <> 10 or ph !~ '^[0-9]{10}$') then
    ph := null;
  end if;

  insert into public.profiles (
    id,
    first_name,
    last_name,
    military_id,
    phone,
    rank,
    role_description,
    is_admin
  )
  values (new.id, fn, ln, mid, ph, rk, rd, false)
  on conflict (id) do update set
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    military_id = coalesce(excluded.military_id, public.profiles.military_id),
    phone = coalesce(excluded.phone, public.profiles.phone),
    rank = coalesce(excluded.rank, public.profiles.rank),
    role_description = coalesce(excluded.role_description, public.profiles.role_description),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
