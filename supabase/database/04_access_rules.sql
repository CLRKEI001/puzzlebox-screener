-- 02_access_rules.sql
--
-- WHO MAY READ AND WRITE WHAT. Run LAST, after 01, 02 and 03. Safe to run more than once.
--
-- The general rules:
--   * "Logged in" means signed in AND approved by an admin. Being signed in
--     alone opens nothing (except seeing your own user row while you wait).
--   * Nobody can raise their own role or approve their own account.
--   * Any table not listed in this file is fully locked (section C).
--
-- How the database knows who you are: the app sends the user's Firebase
-- sign-in token with every request (src/supabaseClient.js) and app.uid()
-- (file 01) reads the user id from it. Every rule below checks that id, so a
-- visitor holding only the public key gets nothing.
--
-- Roles (users.role, only counted once users.is_verified = true):
--   admin | psychologist | educator (teacher) | analyst
--
-- Before running: Supabase Dashboard -> Authentication -> Sign In / Providers
-- -> Third-Party Auth must list Firebase project "puzzle-project-3b369".
-- Then run check_my_access.sql while signed in (see README) to confirm.

begin;

-- Removes every existing policy on a table (including old "Allow all" ones).
create or replace function app.drop_all_policies(p_table regclass) returns void
language plpgsql
as $$
declare pol record;
begin
  for pol in
    select p.policyname from pg_policies p
    join pg_class c on c.relname = p.tablename
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = p.schemaname
    where c.oid = p_table
  loop
    execute format('drop policy %I on %s', pol.policyname, p_table);
  end loop;
end $$;

-- Is this child one of the calling teacher's own?
create or replace function app.owns_child(p_child uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.children c where c.id = p_child and c.teacher_uid = app.uid()) $$;

-- Locks a table and clears its rules, ready for the new ones.
create or replace function app.reset_rules(p_table regclass) returns void
language plpgsql
as $$
begin
  execute format('alter table %s enable row level security', p_table);
  perform app.drop_all_policies(p_table);
end $$;

-- =====================================================================
-- A. THE RULES YOU SPECIFIED
-- =====================================================================

-- ---- USERS
--   Anyone logged in sees the user list. A new user sees only their own row.
--   You edit only your own profile. Only an admin approves/rejects or changes roles.
select app.reset_rules('public.users');

create policy users_read on public.users for select to anon, authenticated
  using (id = app.uid() or app.is_member());

-- Sign-up: your own row, not yet approved, never as admin.
create policy users_sign_up on public.users for insert to anon, authenticated
  with check (
    (id = app.uid() and is_verified is not true and role in ('educator', 'psychologist', 'analyst'))
    or app.is_admin());

create policy users_edit_own on public.users for update to anon, authenticated
  using (id = app.uid()) with check (id = app.uid());

create policy users_admin_edit on public.users for update to anon, authenticated
  using (app.is_admin()) with check (app.is_admin());

create policy users_admin_delete on public.users for delete to anon, authenticated
  using (app.is_admin());

-- Row rules can't compare old and new values, so this trigger protects the
-- columns a user must never change on their own row.
create or replace function app.users_guard() returns trigger
language plpgsql
as $$
begin
  if app.is_trusted() or app.is_admin() then return new; end if;
  if new.id is distinct from old.id then
    raise exception 'A user id cannot be changed';
  end if;
  if new.role is distinct from old.role then
    raise exception 'Only an administrator can change a role';
  end if;
  if new.is_verified is distinct from old.is_verified then
    raise exception 'Only an administrator can approve or reject an account';
  end if;
  if new.email is distinct from old.email then
    raise exception 'Only an administrator can change an email address';
  end if;
  if old.is_verified and new.staff_number is distinct from old.staff_number then
    raise exception 'Your staff number is locked once your account is approved';
  end if;
  return new;
end $$;
drop trigger if exists trg_users_guard on public.users;
create trigger trg_users_guard before update on public.users
  for each row execute function app.users_guard();

-- ---- CHILDREN
--   Teacher: only their own children; can add a child only under their own name
--            (the trigger in 01 also forces this).
--   Psychologist + admin: all children. Psychologists may only change the
--            clinical fields flagged / referred / resolved / status (trigger in 01).
--   Delete: admin, or the teacher who owns the child.
select app.reset_rules('public.children');

create policy children_read on public.children for select to anon, authenticated
  using (app.is_admin() or app.is_psychologist() or (app.is_teacher() and teacher_uid = app.uid()));

create policy children_add on public.children for insert to anon, authenticated
  with check (app.is_admin() or (app.is_teacher() and teacher_uid = app.uid()));

create policy children_edit on public.children for update to anon, authenticated
  using      (app.is_admin() or app.is_psychologist() or (app.is_teacher() and teacher_uid = app.uid()))
  with check (app.is_admin() or app.is_psychologist() or (app.is_teacher() and teacher_uid = app.uid()));

create policy children_delete on public.children for delete to anon, authenticated
  using (app.is_admin() or (app.is_teacher() and teacher_uid = app.uid()));

-- ---- CHILD NAMES (child_identities)
--   The child's own teacher and psychologists can read the real name.
--   Admins work from student numbers only. Names are written only by the
--   children trigger in 01, never directly.
select app.reset_rules('public.child_identities');

create policy child_names_read on public.child_identities for select to anon, authenticated
  using (app.is_psychologist() or (app.is_teacher() and app.owns_child(child_id)));

-- ---- FOLLOW-UPS
--   Psychologist: sees all, writes only the follow-ups they are reviewing.
--   Teacher: reads follow-ups on their own children, can't edit them.
--   Admin: everything.
select app.reset_rules('public.follow_ups');

create policy follow_ups_read on public.follow_ups for select to anon, authenticated
  using (app.is_admin() or app.is_psychologist() or (app.is_teacher() and app.owns_child(child_id)));

create policy follow_ups_add on public.follow_ups for insert to anon, authenticated
  with check (app.is_admin() or (app.is_psychologist() and psychologist_uid = app.uid()));

create policy follow_ups_edit on public.follow_ups for update to anon, authenticated
  using      (app.is_admin() or (app.is_psychologist() and psychologist_uid = app.uid()))
  with check (app.is_admin() or (app.is_psychologist() and psychologist_uid = app.uid()));

create policy follow_ups_delete on public.follow_ups for delete to anon, authenticated
  using (app.is_admin() or (app.is_psychologist() and psychologist_uid = app.uid()));

-- ---- SCREENING SESSIONS (legacy table)
--   Teacher: their own children's sessions. Psychologist: reads all, may only
--   set the follow-up stage (trigger in 01). Admin: everything.
select app.reset_rules('public.screening_sessions');

create policy sessions_read on public.screening_sessions for select to anon, authenticated
  using (app.is_admin() or app.is_psychologist() or (app.is_teacher() and app.owns_child(child_id)));

create policy sessions_add on public.screening_sessions for insert to anon, authenticated
  with check (app.is_admin() or (app.is_teacher() and app.owns_child(child_id)));

create policy sessions_edit on public.screening_sessions for update to anon, authenticated
  using      (app.is_admin() or app.is_psychologist() or (app.is_teacher() and app.owns_child(child_id)))
  with check (app.is_admin() or app.is_psychologist() or (app.is_teacher() and app.owns_child(child_id)));

create policy sessions_delete on public.screening_sessions for delete to anon, authenticated
  using (app.is_admin());

-- ---- PUZZLEBOX SCREENINGS (the real screenings)
--   Same idea: a teacher works on screenings of their own children (or ones
--   they ran), until a psychologist has reviewed it. Psychologists read and
--   review all. Admin: everything.
select app.reset_rules('public.puzzlebox_screenings');

create policy screenings_read on public.puzzlebox_screenings for select to anon, authenticated
  using (app.is_admin() or app.is_psychologist()
         or (app.is_teacher() and (app.owns_child(child_id) or lower(teacher_email) = app.my_email())));

create policy screenings_add on public.puzzlebox_screenings for insert to anon, authenticated
  with check (app.is_admin()
         or (app.is_teacher() and app.owns_child(child_id) and lower(teacher_email) = app.my_email()));

create policy screenings_teacher_edit on public.puzzlebox_screenings for update to anon, authenticated
  using      (app.is_teacher() and lower(teacher_email) = app.my_email() and status is distinct from 'reviewed')
  with check (app.is_teacher() and lower(teacher_email) = app.my_email());

create policy screenings_review on public.puzzlebox_screenings for update to anon, authenticated
  using (app.is_admin() or app.is_psychologist()) with check (app.is_admin() or app.is_psychologist());

create policy screenings_delete on public.puzzlebox_screenings for delete to anon, authenticated
  using (app.is_admin());

-- ---- TRAINING MODULES AND SCREENING QUESTIONS
--   Everyone logged in reads them; only an admin adds, edits or deletes.
do $$
declare t text;
begin
  foreach t in array array[
    'training_modules',
    'screener_meta', 'screener_sections', 'screener_questions',
    'screener_score_tables', 'screener_interpretation_bands']
  loop
    if to_regclass('public.' || t) is null then raise notice 'skipping % (no such table)', t; continue; end if;
    perform app.reset_rules(format('public.%I', t)::regclass);
    execute format('create policy %I on public.%I for select to anon, authenticated using (app.is_member())', t || '_read', t);
    execute format('create policy %I on public.%I for all to anon, authenticated using (app.is_admin()) with check (app.is_admin())', t || '_admin', t);
  end loop;
end $$;

-- Training quiz questions and lesson content have drafts with answer keys:
-- learners read only PUBLISHED rows; only an admin sees drafts or writes.
do $$
declare t text;
begin
  foreach t in array array['training_questions', 'training_content_blocks'] loop
    if to_regclass('public.' || t) is null then raise notice 'skipping % (no such table)', t; continue; end if;
    perform app.reset_rules(format('public.%I', t)::regclass);
    execute format('create policy %I on public.%I for select to anon, authenticated using (app.is_member() and status = ''published'')', t || '_read', t);
    execute format('create policy %I on public.%I for all to anon, authenticated using (app.is_admin()) with check (app.is_admin())', t || '_admin', t);
  end loop;
end $$;

-- =====================================================================
-- B. TABLES YOUR RULES DIDN'T MENTION
--    Each gets the narrowest rule that keeps its feature working.
--    Anything not here is locked by section C.
-- =====================================================================

-- ---- schools: everyone logged in reads; admin manages. (Teachers' new
--      schools are created automatically by the Add Student trigger.)
select app.reset_rules('public.schools');
create policy schools_read  on public.schools for select to anon, authenticated using (app.is_member());
create policy schools_admin on public.schools for all to anon, authenticated using (app.is_admin()) with check (app.is_admin());

-- ---- messages: you see messages addressed to you or about your children;
--      admins and psychologists see all (they send the reports and reviews).
do $$ begin
  if to_regclass('public.messages') is null then return; end if;
  perform app.reset_rules('public.messages');
  create policy messages_read on public.messages for select to anon, authenticated
    using (app.is_admin() or app.is_psychologist()
           or (app.is_member() and (lower(recipient_email) = app.my_email() or lower(teacher_email) = app.my_email())));
  create policy messages_send on public.messages for insert to anon, authenticated
    with check (app.is_member());
  create policy messages_mark_read on public.messages for update to anon, authenticated
    using      (app.is_admin() or app.is_psychologist()
                or (app.is_member() and (lower(recipient_email) = app.my_email() or lower(teacher_email) = app.my_email())))
    with check (app.is_admin() or app.is_psychologist()
                or (app.is_member() and (lower(recipient_email) = app.my_email() or lower(teacher_email) = app.my_email())));
  create policy messages_delete on public.messages for delete to anon, authenticated
    using (app.is_admin());
end $$;

-- ---- training progress: your own; admin reads all.
do $$ begin
  if to_regclass('public.training_progress') is null then return; end if;
  perform app.reset_rules('public.training_progress');
  create policy progress_read on public.training_progress for select to anon, authenticated
    using (user_id = app.uid() or app.is_admin());
  create policy progress_add  on public.training_progress for insert to anon, authenticated
    with check (user_id = app.uid() and app.is_member());
  create policy progress_edit on public.training_progress for update to anon, authenticated
    using (user_id = app.uid()) with check (user_id = app.uid());
  create policy progress_delete on public.training_progress for delete to anon, authenticated
    using (app.is_admin());
end $$;

-- ---- training certificates: you REQUEST yours (pending only); an admin approves.
create or replace function app.training_certificates_guard() returns trigger
language plpgsql
as $$
begin
  if app.is_trusted() or app.is_admin() then return new; end if;
  if tg_op = 'UPDATE' then
    if old.status is distinct from 'pending' then return old; end if;  -- already reviewed: no change
    new.status      := 'pending';
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
    new.issued_at   := old.issued_at;
  end if;
  return new;
end $$;
do $$ begin
  if to_regclass('public.training_certificates') is null then return; end if;
  drop trigger if exists trg_training_certificates_guard on public.training_certificates;
  create trigger trg_training_certificates_guard before update on public.training_certificates
    for each row execute function app.training_certificates_guard();
  perform app.reset_rules('public.training_certificates');
  create policy certs_read on public.training_certificates for select to anon, authenticated
    using (user_id = app.uid() or app.is_admin());
  create policy certs_request on public.training_certificates for insert to anon, authenticated
    with check (app.is_admin()
      or (user_id = app.uid() and app.is_member() and status = 'pending'
          and reviewed_by is null and reviewed_at is null and issued_at is null));
  create policy certs_edit on public.training_certificates for update to anon, authenticated
    using (user_id = app.uid() or app.is_admin()) with check (user_id = app.uid() or app.is_admin());
  create policy certs_delete on public.training_certificates for delete to anon, authenticated
    using (app.is_admin());
end $$;

-- ---- training access: you see your own row; written only by redeem_product_number().
do $$ begin
  if to_regclass('public.training_access') is null then return; end if;
  perform app.reset_rules('public.training_access');
  create policy access_read on public.training_access for select to anon, authenticated
    using (user_id = app.uid() or app.is_admin());
end $$;

-- ---- product numbers: admin only.
do $$ begin
  if to_regclass('public.screener_products') is null then return; end if;
  perform app.reset_rules('public.screener_products');
  create policy products_admin on public.screener_products for all to anon, authenticated
    using (app.is_admin()) with check (app.is_admin());
end $$;

-- ---- purchase requests: the public "buy a screener" form may send a plain
--      pending enquiry (even logged out); only an admin reads or manages them.
do $$ begin
  if to_regclass('public.purchase_requests') is null then return; end if;
  perform app.reset_rules('public.purchase_requests');
  create policy purchases_enquire on public.purchase_requests for insert to anon, authenticated
    with check (status = 'pending' and product_number is null and admin_notes is null
                and fulfilled_by is null and fulfilled_at is null);
  create policy purchases_admin on public.purchase_requests for all to anon, authenticated
    using (app.is_admin()) with check (app.is_admin());
end $$;

-- ---- push notifications: you manage only your own devices.
do $$ begin
  if to_regclass('public.push_subscriptions') is null then return; end if;
  perform app.reset_rules('public.push_subscriptions');
  create policy push_own on public.push_subscriptions for all to anon, authenticated
    using (user_id = app.uid()) with check (user_id = app.uid());
end $$;

-- ---- pilot research data (file 02): de-identified; admin, psychologists and
--      data analysts read it; nobody writes it from the app.
do $$ begin
  if to_regclass('public.pilot_screening_data') is not null then
    perform app.reset_rules('public.pilot_screening_data');
    create policy pilot_read on public.pilot_screening_data for select to anon, authenticated
      using (app.my_role() in ('admin', 'psychologist', 'analyst'));
  end if;
  if to_regclass('public.pilot_column_dictionary') is not null then
    perform app.reset_rules('public.pilot_column_dictionary');
    create policy pilot_dictionary_read on public.pilot_column_dictionary for select to anon, authenticated
      using (app.my_role() in ('admin', 'psychologist', 'analyst'));
  end if;
end $$;

-- ---- redeem_product_number: uses the verified caller, not a user id sent by
--      the browser (previously anyone could unlock training for someone else).
create or replace function public.redeem_product_number(p_user_id text, p_email text, p_product_number text)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_number text := upper(trim(p_product_number));
  v_uid    text := app.uid();
begin
  if v_uid is null or coalesce(v_number, '') = '' then return 'invalid'; end if;
  if p_user_id is not null and p_user_id <> v_uid then return 'invalid'; end if;
  if not exists (select 1 from public.screener_products where product_number = v_number and active) then
    return 'invalid';
  end if;
  insert into public.training_access (user_id, user_email, product_number)
  values (v_uid, coalesce(app.my_email(), p_email), v_number)
  on conflict (user_id) do update
    set product_number = excluded.product_number, user_email = excluded.user_email, redeemed_at = now();
  return 'ok';
end $$;
revoke all on function public.redeem_product_number(text, text, text) from public;
grant execute on function public.redeem_product_number(text, text, text) to anon, authenticated, service_role;

-- =====================================================================
-- C. EVERYTHING ELSE IS LOCKED
-- =====================================================================
do $$
declare
  t record;
  covered text[] := array[
    'users', 'children', 'child_identities', 'follow_ups', 'screening_sessions', 'puzzlebox_screenings',
    'training_modules', 'training_questions', 'training_content_blocks',
    'screener_meta', 'screener_sections', 'screener_questions', 'screener_score_tables', 'screener_interpretation_bands',
    'schools', 'messages', 'training_progress', 'training_certificates', 'training_access',
    'screener_products', 'purchase_requests', 'push_subscriptions',
    'pilot_screening_data', 'pilot_column_dictionary'];
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname <> all (covered)
  loop
    perform app.reset_rules(format('public.%I', t.relname)::regclass);
    raise notice 'LOCKED (no rule written for it): public.%', t.relname;
  end loop;
end $$;

-- Table privileges. Row rules above decide WHICH rows; these only allow the
-- normal read/write commands. TRUNCATE / TRIGGER / REFERENCES ignore row
-- rules, so nobody using the app gets them.
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema app to anon, authenticated, service_role;

commit;  
