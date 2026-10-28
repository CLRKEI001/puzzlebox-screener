-- 01_student_numbers_and_names.sql
--
-- WHAT THIS DOES
--   1. Helper functions every other file uses (who is calling, what role they have).
--   2. Schools, each with a short code (Fort Beaufort -> FB, Adelaide -> ADE).
--   3. A permanent STUDENT NUMBER for every child:  <SCHOOL>-<AGE>-<NUMBER>
--        FB-5-0042    5 years old, Fort Beaufort, child no. 42
--        ADE-11M-0107 11 months old (under 1 year shows months with an M)
--   4. Real names move out of `children` into `child_identities`.
--      `children.name` (and `child_name` on follow-ups, sessions, messages and
--      screenings) now holds the student number, so the admin dashboard only
--      ever sees student numbers. The child's own teacher and psychologists
--      read the real name through the `children_named` view (rule set in 04).
--   5. `children.data_source`: 'app' (added in the app), 'pilot' (the spreadsheet,
--      file 02) or 'demo' (the old made-up test children, kept only so they
--      can be found and removed; see README "Removing the old mock children").
--
-- Run this FIRST, then 02 (pilot data), 04 (access rules). Safe to run more than once.

begin;

create schema if not exists app;
grant usage on schema app to anon, authenticated, service_role;

-- Triggers from the earlier draft scripts (manual-sql/018), in case they were
-- run. They would block the backfill below; this file recreates them.
drop trigger if exists trg_children_before_insert on public.children;
drop trigger if exists trg_children_guard on public.children;

-- ======================================================================
-- 1. WHO IS CALLING
-- ======================================================================

-- The signed-in user's Firebase UID, or NULL when logged out.
-- Only tokens issued by OUR Firebase project count.
create or replace function app.uid() returns text
language sql stable
as $$
  select case
    when auth.jwt() ->> 'iss' = 'https://securetoken.google.com/puzzle-project-3b369'
     and auth.jwt() ->> 'aud' = 'puzzle-project-3b369'
    then nullif(auth.jwt() ->> 'sub', '')
  end
$$;

-- The caller's role, but only once an admin has approved the account.
create or replace function app.my_role() returns text
language sql stable security definer set search_path = public, pg_temp
as $$ select u.role from public.users u where u.id = app.uid() and u.is_verified is true $$;

create or replace function app.my_email() returns text
language sql stable security definer set search_path = public, pg_temp
as $$ select lower(u.email) from public.users u where u.id = app.uid() $$;

create or replace function app.is_admin()        returns boolean language sql stable as $$ select coalesce(app.my_role() = 'admin', false) $$;
create or replace function app.is_psychologist() returns boolean language sql stable as $$ select coalesce(app.my_role() = 'psychologist', false) $$;
create or replace function app.is_teacher()      returns boolean language sql stable as $$ select coalesce(app.my_role() = 'educator', false) $$;
-- any approved user, whatever their role
create or replace function app.is_member()       returns boolean language sql stable as $$ select app.my_role() is not null $$;

-- The SQL editor and server-side code (service role) skip the per-user checks.
-- Deliberately NOT security definer: current_user must be the real caller.
create or replace function app.is_trusted() returns boolean
language sql stable
as $$ select current_user in ('postgres', 'supabase_admin', 'service_role') $$;

-- ======================================================================
-- 2. SCHOOLS
-- ======================================================================

create table if not exists public.schools (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  code       text not null,
  province   text,
  created_at timestamptz not null default now(),
  constraint schools_code_format check (code ~ '^[A-Z]{2,4}$')
);
create unique index if not exists schools_name_key on public.schools (lower(btrim(name)));
create unique index if not exists schools_code_key on public.schools (code);

-- Multi-word name -> initials (Fort Beaufort -> FB, East London -> EL);
-- one word -> first three letters (Adelaide -> ADE). Clashes get a letter.
create or replace function app.suggest_school_code(p_name text) returns text
language plpgsql stable
as $$
declare
  words text[];
  base  text;
  cand  text;
  i     int := 0;
begin
  words := array_remove(
    regexp_split_to_array(upper(regexp_replace(btrim(p_name), '[^A-Za-z ]', '', 'g')), '\s+'), '');
  if words is null or array_length(words, 1) is null then
    raise exception 'School name "%" has no letters to build a code from', p_name;
  end if;
  if array_length(words, 1) = 1 then
    base := left(words[1], 3);
  else
    select left(string_agg(left(w, 1), ''), 4) into base from unnest(words) w;
  end if;
  if length(base) < 2 then base := rpad(base, 2, 'X'); end if;
  cand := base;
  while exists (select 1 from public.schools where code = cand) loop
    i := i + 1;
    if i > 20 then raise exception 'Could not generate a unique code for "%"', p_name; end if;
    cand := left(base, 3) || chr(64 + i);
  end loop;
  return cand;
end $$;

create or replace function app.schools_before_insert() returns trigger
language plpgsql
as $$
begin
  new.name := btrim(new.name);
  if new.code is null or btrim(new.code) = '' then
    new.code := app.suggest_school_code(new.name);
  end if;
  return new;
end $$;
drop trigger if exists trg_schools_before_insert on public.schools;
create trigger trg_schools_before_insert before insert on public.schools
  for each row execute function app.schools_before_insert();

-- A school's code is part of every student number issued under it.
create or replace function app.schools_guard() returns trigger
language plpgsql
as $$
begin
  if new.code is distinct from old.code
     and exists (select 1 from public.children where school_id = old.id) then
    raise exception 'School code % is already used in student numbers and cannot change', old.code;
  end if;
  return new;
end $$;
drop trigger if exists trg_schools_guard on public.schools;
create trigger trg_schools_guard before update on public.schools
  for each row execute function app.schools_guard();

-- Find a school by name, creating it if it is new. Used when a teacher types a
-- school into the Add Student form, so they never get stuck on "unknown school".
create or replace function app.school_for(p_name text, p_province text default null)
returns public.schools
language plpgsql security definer set search_path = public, pg_temp
as $$
declare s public.schools;
begin
  select * into s from public.schools where lower(btrim(name)) = lower(btrim(p_name));
  if not found then
    insert into public.schools (name, province) values (btrim(p_name), p_province)
    on conflict do nothing;
    select * into s from public.schools where lower(btrim(name)) = lower(btrim(p_name));
  end if;
  return s;
end $$;

-- ======================================================================
-- 3. STUDENT NUMBERS + OWNERSHIP ON children
-- ======================================================================

alter table public.children add column if not exists teacher_email  text;
alter table public.children add column if not exists teacher_uid    text references public.users(id) on update cascade on delete set null;
alter table public.children add column if not exists age_months     smallint;
alter table public.children add column if not exists school_id      uuid references public.schools(id);
alter table public.children add column if not exists student_seq    bigint generated always as identity;
alter table public.children add column if not exists student_number text;
alter table public.children add column if not exists data_source    text not null default 'app';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'children_data_source_check') then
    alter table public.children add constraint children_data_source_check
      check (data_source in ('app', 'pilot', 'demo'));
  end if;
end $$;

create unique index if not exists children_student_number_key on public.children (student_number);
create index if not exists children_teacher_uid_idx on public.children (teacher_uid);
create index if not exists children_school_id_idx   on public.children (school_id);

-- "<CODE>-<age>-<number>". Under 1 year: months with an M. Unknown age: NA.
create or replace function app.format_student_number(p_code text, p_age int, p_seq bigint, p_age_months int default null)
returns text language sql immutable
as $$
  select p_code || '-' ||
         case when p_age >= 1              then p_age::text
              when p_age_months is not null then p_age_months::text || 'M'
              else 'NA' end
         || '-' || lpad(p_seq::text, 4, '0')
$$;

-- The old app-generated mock children ("Child PB-001" ... "Child PB-015") are
-- labelled as demo data so they can be told apart and removed.
-- (Before names are moved, while children.name still holds the real value.)
update public.children
   set data_source = 'demo'
 where data_source = 'app'
   and name ilike 'Child PB-%'
   and student_number is null;

-- Backfill: school, then student number. A child with no school on record is
-- filed under "Unknown School" (code US) so they still get a number and their
-- name is still hidden; an admin can fix the school later.
do $$
declare r record; s public.schools;
begin
  for r in select id, school, province from public.children
            where school_id is null
            order by student_seq
  loop
    s := app.school_for(coalesce(nullif(btrim(r.school), ''), 'Unknown School'), r.province);
    update public.children set school_id = s.id, school = s.name where id = r.id;
  end loop;
end $$;

update public.children c
   set student_number = app.format_student_number(s.code, c.age, c.student_seq, c.age_months)
  from public.schools s
 where c.student_number is null
   and c.school_id = s.id;

-- Backfill ownership: teacher_email first, then the examiner name (older rows),
-- only where exactly one approved-or-not educator matches.
update public.children c
   set teacher_uid = (select u.id from public.users u
                       where lower(u.email) = lower(c.teacher_email) and u.role = 'educator')
 where c.teacher_uid is null and c.teacher_email is not null
   and (select count(*) from public.users u
         where lower(u.email) = lower(c.teacher_email) and u.role = 'educator') = 1;

update public.children c
   set teacher_uid = (select u.id from public.users u
                       where lower(btrim(u.name)) = lower(btrim(c.examiner)) and u.role = 'educator')
 where c.teacher_uid is null and c.examiner is not null
   and (select count(*) from public.users u
         where lower(btrim(u.name)) = lower(btrim(c.examiner)) and u.role = 'educator') = 1;

update public.children c
   set teacher_email = lower(u.email)
  from public.users u
 where c.teacher_uid = u.id and c.teacher_email is distinct from lower(u.email);

-- ======================================================================
-- 4. REAL NAMES -> child_identities
-- ======================================================================

create table if not exists public.child_identities (
  child_id   uuid primary key,
  full_name  text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Deferrable so a child and its name can be saved in the same statement.
alter table public.child_identities drop constraint if exists child_identities_child_id_fkey;
alter table public.child_identities add constraint child_identities_child_id_fkey
  foreign key (child_id) references public.children(id) on delete cascade
  deferrable initially deferred;

-- Saves a child's real name. SECURITY DEFINER because it runs from the
-- children trigger before the teacher's ownership of the row is visible.
create or replace function app.save_child_name(p_child uuid, p_name text) returns void
language sql security definer set search_path = public, pg_temp
as $$
  insert into public.child_identities (child_id, full_name)
  values (p_child, btrim(p_name))
  on conflict (child_id) do update set full_name = excluded.full_name, updated_at = now()
$$;
-- Not callable from the app: the `app` schema is not exposed by the Supabase API,
-- so this only ever runs from the children triggers below.

-- Move existing names out of children (anything that isn't already the number).
insert into public.child_identities (child_id, full_name)
select id, btrim(name) from public.children
 where coalesce(btrim(name), '') <> '' and name is distinct from student_number
on conflict (child_id) do update set full_name = excluded.full_name, updated_at = now();

update public.children set name = student_number
 where student_number is not null and name is distinct from student_number;

-- Look up a child's student number from inside triggers on other tables.
create or replace function app.student_number_of(p_child uuid) returns text
language sql stable security definer set search_path = public, pg_temp
as $$ select student_number from public.children where id = p_child $$;

-- Old legacy sessions were saved without child_id; link them by name where
-- exactly one child has that name, so their name can be replaced too.
update public.screening_sessions s
   set child_id = ci.child_id
  from public.child_identities ci
 where s.child_id is null
   and lower(btrim(s.child_name)) = lower(btrim(ci.full_name))
   and (select count(*) from public.child_identities x
         where lower(btrim(x.full_name)) = lower(btrim(s.child_name))) = 1;

-- Replace copied names on the other tables with the student number.
do $$
declare t text;
begin
  foreach t in array array['follow_ups', 'screening_sessions', 'messages', 'puzzlebox_screenings'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format(
      'update public.%I x set child_name = c.student_number
         from public.children c
        where x.child_id = c.id and x.child_name is distinct from c.student_number', t);
  end loop;
end $$;

-- From now on, any child_name written to those tables is replaced by the
-- student number automatically (the app does not need to know).
create or replace function app.child_name_is_number() returns trigger
language plpgsql
as $$
begin
  if new.child_id is not null then
    new.child_name := coalesce(app.student_number_of(new.child_id), new.child_name);
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['follow_ups', 'screening_sessions', 'messages', 'puzzlebox_screenings'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop trigger if exists trg_%s_child_name on public.%I', t, t);
    execute format('create trigger trg_%s_child_name before insert or update on public.%I
                    for each row execute function app.child_name_is_number()', t, t);
  end loop;
end $$;

-- ======================================================================
-- 5. TRIGGERS ON children
-- ======================================================================

-- New child: owner, school, student number, and the name moves to child_identities.
create or replace function app.children_before_insert() returns trigger
language plpgsql
as $$
declare s public.schools;
begin
  -- A teacher can only ever add a child under their own name.
  if not app.is_trusted() and app.is_teacher() then
    new.teacher_uid := app.uid();
  elsif new.teacher_uid is null and new.teacher_email is not null then
    select u.id into new.teacher_uid from public.users u
     where lower(u.email) = lower(new.teacher_email) and u.role = 'educator' limit 1;
  end if;
  if new.teacher_uid is not null then
    select lower(u.email) into new.teacher_email from public.users u where u.id = new.teacher_uid;
  end if;

  -- Data source can only be chosen by the SQL editor / server.
  if not app.is_trusted() then new.data_source := 'app'; end if;

  if new.school_id is not null then
    select * into s from public.schools where id = new.school_id;
  else
    s := app.school_for(coalesce(nullif(btrim(new.school), ''), 'Unknown School'), new.province);
  end if;

  new.school_id      := s.id;
  new.school         := s.name;
  new.student_number := app.format_student_number(s.code, new.age, new.student_seq, new.age_months);

  if coalesce(btrim(new.name), '') <> '' and new.name <> new.student_number then
    perform app.save_child_name(new.id, new.name);
  end if;
  new.name := new.student_number;
  return new;
end $$;
create trigger trg_children_before_insert before insert on public.children
  for each row execute function app.children_before_insert();

-- Editing a child: the number never changes, a new name goes to
-- child_identities, and each role may only change its own fields.
create or replace function app.children_before_update() returns trigger
language plpgsql
as $$
declare
  changed  text[];
  clinical text[] := array['flagged', 'referred', 'resolved', 'status'];
begin
  if new.student_number is distinct from old.student_number
     or new.student_seq is distinct from old.student_seq then
    raise exception 'A student number is permanent and cannot be changed';
  end if;

  -- A changed name is saved privately; the row keeps the student number.
  if new.name is distinct from old.name then
    if coalesce(btrim(new.name), '') <> '' and new.name <> old.student_number
       and (app.is_trusted() or app.is_admin() or (app.is_teacher() and old.teacher_uid = app.uid())) then
      perform app.save_child_name(old.id, new.name);
    end if;
    new.name := old.name;
  end if;

  if app.is_trusted() or app.is_admin() then return new; end if;

  select array_agg(n.key) into changed
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
   where n.value is distinct from o.value;
  changed := coalesce(changed, '{}');

  if app.is_psychologist() then
    if exists (select 1 from unnest(changed) k where k <> all (clinical)) then
      raise exception 'Psychologists may only update: %', array_to_string(clinical, ', ');
    end if;
    return new;
  end if;

  if changed && array['teacher_uid', 'teacher_email', 'school', 'school_id', 'data_source', 'created_at'] then
    raise exception 'Only an administrator can change who a child belongs to, or their school';
  end if;
  return new;
end $$;
create trigger trg_children_guard before update on public.children
  for each row execute function app.children_before_update();

-- What the app reads: every child column, plus the real name. Row rules on
-- child_identities mean real_name is only filled in for the child's own
-- teacher and for psychologists; admins get NULL and see the student number.
drop view if exists public.children_named;
create view public.children_named with (security_invoker = true) as
  select c.*, ci.full_name as real_name
    from public.children c
    left join public.child_identities ci on ci.child_id = c.id;

-- ======================================================================
-- 6. FOLLOW-UPS AND LEGACY SCREENING SESSIONS
-- ======================================================================

-- The psychologist reviewing a follow-up "owns" it.
alter table public.follow_ups add column if not exists psychologist_uid text
  references public.users(id) on update cascade on delete set null;
create index if not exists follow_ups_psychologist_uid_idx on public.follow_ups (psychologist_uid);

update public.follow_ups f
   set psychologist_uid = (select u.id from public.users u
                            where lower(btrim(u.name)) = lower(btrim(f.follow_up_psych)) and u.role = 'psychologist')
 where f.psychologist_uid is null and f.follow_up_psych is not null
   and (select count(*) from public.users u
         where lower(btrim(u.name)) = lower(btrim(f.follow_up_psych)) and u.role = 'psychologist') = 1;

create or replace function app.follow_ups_guard() returns trigger
language plpgsql
as $$
begin
  if app.is_trusted() or app.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.psychologist_uid := app.uid();
  elsif new.psychologist_uid is distinct from old.psychologist_uid
     or new.child_id is distinct from old.child_id then
    raise exception 'A follow-up cannot be moved to another child or psychologist';
  end if;
  return new;
end $$;
drop trigger if exists trg_follow_ups_guard on public.follow_ups;
create trigger trg_follow_ups_guard before insert or update on public.follow_ups
  for each row execute function app.follow_ups_guard();

-- A psychologist may only set the follow-up stage on a legacy session.
create or replace function app.screening_sessions_guard() returns trigger
language plpgsql
as $$
declare changed text[];
begin
  if app.is_trusted() or app.is_admin() or not app.is_psychologist() then return new; end if;
  select array_agg(n.key) into changed
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
   where n.value is distinct from o.value;
  if exists (select 1 from unnest(coalesce(changed, '{}')) k where k not in ('follow_up_stage', 'child_name')) then
    raise exception 'Psychologists may only update a session''s follow-up stage';
  end if;
  return new;
end $$;
drop trigger if exists trg_screening_sessions_guard on public.screening_sessions;
create trigger trg_screening_sessions_guard before update on public.screening_sessions
  for each row execute function app.screening_sessions_guard();

-- ======================================================================
-- 7. SMALL HELPERS THE APP CALLS
-- ======================================================================

-- Sign-up duplicate check. Runs before the new user can read the users
-- table, so it only answers yes/no and never reveals who owns the number.
create or replace function public.staff_number_taken(p_staff_number text) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.users where btrim(staff_number) = btrim(p_staff_number)) $$;
grant execute on function public.staff_number_taken(text) to anon, authenticated;

grant execute on all functions in schema app to anon, authenticated, service_role;
grant select, insert, update, delete on public.schools, public.child_identities to anon, authenticated, service_role;
grant select on public.children_named to anon, authenticated, service_role;

commit;
