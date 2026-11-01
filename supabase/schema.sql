-- PuzzleBox Screener — full database schema
-- Generated from the live Supabase project. Current state, not a migration:
-- supabase/migrations/ holds the change history; this is where it ended up.
--
-- DO NOT run this against the existing project. Constraints, triggers and
-- policies are not idempotent and will fail with "already exists".
--
-- To rebuild on an empty database:
--   1. Replace <FIREBASE_PROJECT_ID> in app.uid() (two places) with the
--      Firebase project ID, or every request is treated as signed out.
--   2. Replace <URL> and <REDACTED> in notify_email_on_message() with the
--      email webhook endpoint and its secret. Both are redacted here on
--      purpose — do not commit the real secret.
--   3. Run the seed inserts: screener sections, questions, score tables,
--      interpretation bands, training modules, product numbers.
--
-- Why everything is granted to anon: authentication is Firebase, so Supabase
-- sees no Postgres user for a signed-in person. app.uid() reads the Firebase
-- UID out of the JWT, and Row Level Security decides every row from there.
-- The grants permit the commands; the policies decide the access. - then paste this ontop
-- Functions refer to each other; let them be created in any order.
set check_function_bodies = off;

-- ---------------------------------------------------------------- extensions
create extension if not exists pg_net;
create extension if not exists pg_stat_statements;
create extension if not exists pgcrypto;
create extension if not exists supabase_vault;
create extension if not exists "uuid-ossp";

create schema if not exists app;

-- ---------------------------------------------------------------- tables
create table if not exists public.child_identities (
  child_id uuid not null,
  full_name text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.children (
  id uuid default gen_random_uuid() not null,
  name text not null,
  school text,
  province text,
  age integer,
  gender text,
  language text,
  cognitive integer,
  motor integer,
  language_score integer,
  social integer,
  emotion integer,
  moral integer,
  total integer,
  status text default 'Progressing'::text,
  flagged boolean default false,
  referred boolean default false,
  resolved boolean default false,
  date date,
  examiner text,
  stage text default 'stage1'::text,
  created_at timestamp with time zone default now(),
  teacher_email text,
  consent_form_url text,
  consent_file_name text,
  consent_uploaded_at timestamp with time zone,
  consent_verified boolean default false not null,
  consent_verification_notes text,
  consent_verified_at timestamp with time zone,
  teacher_uid text,
  age_months smallint,
  school_id uuid,
  student_seq bigint generated always as identity not null,
  student_number text,
  data_source text default 'app'::text not null,
  consent_review_status text,
  consent_review_requested_at timestamp with time zone,
  consent_review_requested_by text,
  consent_reviewed_by text,
  consent_reviewed_at timestamp with time zone,
  consent_review_note text
);

create table if not exists public.follow_ups (
  id uuid default gen_random_uuid() not null,
  child_id uuid,
  child_name text not null,
  school text,
  follow_up_date date,
  follow_up_psych text,
  follow_up_reason text,
  follow_up_type text default 'fu2'::text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  psychologist_uid text
);

create table if not exists public.messages (
  id uuid default gen_random_uuid() not null,
  child_id uuid,
  child_name text not null,
  child_score integer,
  child_status text,
  school text,
  teacher_email text not null,
  teacher_name text,
  diagnosis text,
  language text default 'en'::text,
  domains jsonb,
  sent_by text default 'Psychologist'::text,
  sent_at timestamp with time zone default now(),
  screening_id uuid,
  recipient_role text,
  recipient_email text,
  recipient_name text,
  message_type text default 'diagnosis_report'::text not null,
  read_at timestamp with time zone
);

create table if not exists public.offline_licences (
  id uuid default gen_random_uuid() not null,
  user_id text not null,
  examiner text,
  device_id text not null,
  issued_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone not null,
  revoked boolean default false not null,
  revoked_at timestamp with time zone,
  last_synced_at timestamp with time zone
);

create table if not exists public.pilot_column_dictionary (
  column_number integer not null,
  column_key text not null,
  section text,
  subsection text
);

create table if not exists public.pilot_screening_data (
  child_id uuid not null,
  source_row integer not null,
  source_code text not null,
  answers jsonb not null,
  imported_at timestamp with time zone default now() not null
);

create table if not exists public.purchase_requests (
  id uuid default gen_random_uuid() not null,
  name text not null,
  email text not null,
  organisation text,
  phone text,
  number_of_screeners integer,
  message text,
  status text default 'pending'::text not null,
  product_number text,
  admin_notes text,
  fulfilled_by text,
  fulfilled_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() not null,
  user_id text not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.puzzlebox_screenings (
  id uuid default gen_random_uuid() not null,
  child_id uuid,
  child_name text not null,
  school text,
  teacher_email text not null,
  teacher_name text,
  content_version text default '1.0'::text not null,
  content_snapshot jsonb,
  status text default 'in_progress'::text not null,
  responses jsonb default '{}'::jsonb not null,
  puzzle_time_seconds integer,
  puzzle_over_time boolean default false not null,
  observations text,
  child_age integer,
  raw_score integer,
  interpretation_band text,
  started_at timestamp with time zone default now() not null,
  completed_at timestamp with time zone,
  reviewed_at timestamp with time zone,
  reviewed_by text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  review_verdict text,
  review_notes text,
  shared_with jsonb default '[]'::jsonb not null,
  total_time_seconds integer default 0 not null,
  section_times jsonb default '{}'::jsonb not null,
  is_offline boolean default false not null,
  licence_id uuid,
  captured_at timestamp with time zone,
  offline_session_id uuid
);

create table if not exists public.schools (
  id uuid default gen_random_uuid() not null,
  name text not null,
  code text not null,
  province text,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.screener_interpretation_bands (
  id uuid default gen_random_uuid() not null,
  age integer not null,
  sort_order integer not null,
  band_key text not null,
  label text not null,
  min_score integer,
  max_score integer,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.screener_meta (
  id integer default 1 not null,
  version text default '1.0'::text not null,
  instructions text default ''::text not null,
  scoring_legend jsonb default '[]'::jsonb not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.screener_products (
  product_number text not null,
  notes text,
  active boolean default true not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.screener_questions (
  id uuid default gen_random_uuid() not null,
  section_id uuid not null,
  sort_order integer not null,
  label text not null,
  instruction text default ''::text not null,
  to_pass text default ''::text not null,
  domain_override text,
  scoring_type text default 'binary'::text not null,
  needs_confirmation boolean default false not null,
  checklist_options jsonb default '[]'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.screener_score_tables (
  id uuid default gen_random_uuid() not null,
  question_id uuid not null,
  age integer not null,
  sort_order integer not null,
  score integer not null,
  min_value integer,
  max_value integer,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.screener_sections (
  id uuid default gen_random_uuid() not null,
  sort_order integer not null,
  title text not null,
  description text default ''::text not null,
  domain text default 'cognitive'::text not null,
  is_puzzle_timer_section boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.screening_sessions (
  id uuid default gen_random_uuid() not null,
  child_id uuid,
  child_name text not null,
  school text,
  age integer,
  language text,
  score integer,
  date date,
  examiner text,
  status text,
  stage text,
  follow_up_stage text default 'fu1'::text,
  cognitive integer,
  motor integer,
  language_score integer,
  social integer,
  emotion integer,
  moral integer,
  created_at timestamp with time zone default now()
);

create table if not exists public.training_access (
  user_id text not null,
  user_email text,
  product_number text not null,
  redeemed_at timestamp with time zone default now() not null
);

create table if not exists public.training_certificates (
  user_id text not null,
  user_email text,
  user_name text,
  issued_at timestamp with time zone,
  status text default 'pending'::text not null,
  requested_at timestamp with time zone default now() not null,
  reviewed_by text,
  reviewed_at timestamp with time zone
);

create table if not exists public.training_content_blocks (
  id uuid default gen_random_uuid() not null,
  module_id uuid not null,
  block_order integer default 0 not null,
  block_type text not null,
  data jsonb default '{}'::jsonb not null,
  status text default 'published'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.training_modules (
  id uuid default gen_random_uuid() not null,
  sort_order integer not null,
  title text not null,
  description text default ''::text not null,
  color_key text default 'teal'::text not null,
  status text default 'coming_soon'::text not null,
  content_url text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  video_url text,
  audience text default 'educator'::text not null
);

create table if not exists public.training_progress (
  user_id text not null,
  module_id uuid not null,
  status text default 'viewed'::text not null,
  best_score_percent integer,
  viewed_at timestamp with time zone default now() not null,
  quiz_passed_at timestamp with time zone,
  question_versions jsonb default '[]'::jsonb not null
);

create table if not exists public.training_questions (
  id uuid default gen_random_uuid() not null,
  module_id uuid not null,
  question_order integer not null,
  question_text text not null,
  choices jsonb default '[]'::jsonb not null,
  correct_choice_id text not null,
  points integer default 1 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  question_key uuid,
  version integer default 1 not null,
  status text default 'published'::text not null,
  translations jsonb default '{}'::jsonb not null,
  multiple_select boolean default false not null,
  shuffle_options boolean default false not null,
  correct_choice_ids jsonb,
  hint text,
  category text,
  created_by text
);

create table if not exists public.users (
  id text not null,
  name text,
  email text,
  role text,
  staff_number text,
  is_verified boolean default false,
  created_at timestamp with time zone default now()
);

-- ---------------------------------------------------------------- primary keys, unique and check constraints
alter table public.child_identities add constraint child_identities_pkey PRIMARY KEY (child_id);
alter table public.children add constraint children_pkey PRIMARY KEY (id);
alter table public.children add constraint children_name_key UNIQUE (name);
alter table public.children add constraint children_consent_review_status_check CHECK (((consent_review_status IS NULL) OR (consent_review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))));
alter table public.children add constraint children_data_source_check CHECK ((data_source = ANY (ARRAY['app'::text, 'pilot'::text, 'demo'::text])));
alter table public.follow_ups add constraint follow_ups_pkey PRIMARY KEY (id);
alter table public.messages add constraint messages_pkey PRIMARY KEY (id);
alter table public.messages add constraint messages_message_type_check CHECK ((message_type = ANY (ARRAY['diagnosis_report'::text, 'screening_ready_for_review'::text, 'review_verdict'::text, 'account_approved'::text])));
alter table public.messages add constraint messages_recipient_role_check CHECK ((recipient_role = ANY (ARRAY['teacher'::text, 'psychologist'::text, 'parent'::text, 'headmistress'::text, 'educator'::text, 'analyst'::text, 'admin'::text])));
alter table public.offline_licences add constraint offline_licences_pkey PRIMARY KEY (id);
alter table public.pilot_column_dictionary add constraint pilot_column_dictionary_pkey PRIMARY KEY (column_number);
alter table public.pilot_column_dictionary add constraint pilot_column_dictionary_column_key_key UNIQUE (column_key);
alter table public.pilot_screening_data add constraint pilot_screening_data_pkey PRIMARY KEY (child_id);
alter table public.pilot_screening_data add constraint pilot_screening_data_source_row_key UNIQUE (source_row);
alter table public.purchase_requests add constraint purchase_requests_pkey PRIMARY KEY (id);
alter table public.push_subscriptions add constraint push_subscriptions_pkey PRIMARY KEY (id);
alter table public.push_subscriptions add constraint push_subscriptions_endpoint_key UNIQUE (endpoint);
alter table public.puzzlebox_screenings add constraint puzzlebox_screenings_pkey PRIMARY KEY (id);
alter table public.puzzlebox_screenings add constraint puzzlebox_screenings_offline_session_id_key UNIQUE (offline_session_id);
alter table public.puzzlebox_screenings add constraint puzzlebox_screenings_review_verdict_check CHECK ((review_verdict = ANY (ARRAY['fine'::text, 'concerns'::text])));
alter table public.puzzlebox_screenings add constraint puzzlebox_screenings_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'awaiting_review'::text, 'reviewed'::text])));
alter table public.schools add constraint schools_pkey PRIMARY KEY (id);
alter table public.schools add constraint schools_code_format CHECK ((code ~ '^[A-Z]{2,4}$'::text));
alter table public.screener_interpretation_bands add constraint screener_interpretation_bands_pkey PRIMARY KEY (id);
alter table public.screener_meta add constraint screener_meta_pkey PRIMARY KEY (id);
alter table public.screener_meta add constraint screener_meta_id_check CHECK ((id = 1));
alter table public.screener_products add constraint screener_products_pkey PRIMARY KEY (product_number);
alter table public.screener_questions add constraint screener_questions_pkey PRIMARY KEY (id);
alter table public.screener_questions add constraint screener_questions_scoring_type_check CHECK ((scoring_type = ANY (ARRAY['binary'::text, 'scale3'::text, 'age_table'::text, 'checklist'::text])));
alter table public.screener_score_tables add constraint screener_score_tables_pkey PRIMARY KEY (id);
alter table public.screener_sections add constraint screener_sections_pkey PRIMARY KEY (id);
alter table public.screening_sessions add constraint screening_sessions_pkey PRIMARY KEY (id);
alter table public.training_access add constraint training_access_pkey PRIMARY KEY (user_id);
alter table public.training_certificates add constraint training_certificates_pkey PRIMARY KEY (user_id);
alter table public.training_content_blocks add constraint training_content_blocks_pkey PRIMARY KEY (id);
alter table public.training_modules add constraint training_modules_pkey PRIMARY KEY (id);
alter table public.training_modules add constraint training_modules_audience_check CHECK ((audience = ANY (ARRAY['educator'::text, 'psychologist'::text])));
alter table public.training_modules add constraint training_modules_color_key_check CHECK ((color_key = ANY (ARRAY['teal'::text, 'pink'::text, 'purple'::text, 'orange'::text, 'maroon'::text])));
alter table public.training_modules add constraint training_modules_status_check CHECK ((status = ANY (ARRAY['coming_soon'::text, 'published'::text])));
alter table public.training_progress add constraint training_progress_pkey PRIMARY KEY (user_id, module_id);
alter table public.training_questions add constraint training_questions_pkey PRIMARY KEY (id);
alter table public.training_questions add constraint training_questions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])));
alter table public.users add constraint users_pkey PRIMARY KEY (id);

-- ---------------------------------------------------------------- foreign keys
alter table public.child_identities add constraint child_identities_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
alter table public.children add constraint children_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id);
alter table public.children add constraint children_teacher_uid_fkey FOREIGN KEY (teacher_uid) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;
alter table public.follow_ups add constraint follow_ups_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;
alter table public.follow_ups add constraint follow_ups_psychologist_uid_fkey FOREIGN KEY (psychologist_uid) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;
alter table public.messages add constraint messages_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE SET NULL;
alter table public.messages add constraint messages_screening_id_fkey FOREIGN KEY (screening_id) REFERENCES puzzlebox_screenings(id) ON DELETE SET NULL;
alter table public.offline_licences add constraint offline_licences_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
alter table public.pilot_screening_data add constraint pilot_screening_data_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;
alter table public.push_subscriptions add constraint push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
alter table public.puzzlebox_screenings add constraint puzzlebox_screenings_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE SET NULL;
alter table public.puzzlebox_screenings add constraint puzzlebox_screenings_licence_id_fkey FOREIGN KEY (licence_id) REFERENCES offline_licences(id) ON DELETE SET NULL;
alter table public.screener_questions add constraint screener_questions_section_id_fkey FOREIGN KEY (section_id) REFERENCES screener_sections(id) ON DELETE CASCADE;
alter table public.screener_score_tables add constraint screener_score_tables_question_id_fkey FOREIGN KEY (question_id) REFERENCES screener_questions(id) ON DELETE CASCADE;
alter table public.screening_sessions add constraint screening_sessions_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;
alter table public.training_access add constraint training_access_product_number_fkey FOREIGN KEY (product_number) REFERENCES screener_products(product_number);
alter table public.training_content_blocks add constraint training_content_blocks_module_id_fkey FOREIGN KEY (module_id) REFERENCES training_modules(id) ON DELETE CASCADE;
alter table public.training_progress add constraint training_progress_module_id_fkey FOREIGN KEY (module_id) REFERENCES training_modules(id) ON DELETE CASCADE;
alter table public.training_questions add constraint training_questions_module_id_fkey FOREIGN KEY (module_id) REFERENCES training_modules(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------- indexes
create index if not exists children_school_id_idx ON public.children USING btree (school_id);
create unique index if not exists children_student_number_key ON public.children USING btree (student_number);
create index if not exists children_teacher_email_idx ON public.children USING btree (teacher_email);
create index if not exists children_teacher_uid_idx ON public.children USING btree (teacher_uid);
create index if not exists idx_children_name ON public.children USING btree (name);
create index if not exists idx_children_teacher_email ON public.children USING btree (teacher_email);
create index if not exists follow_ups_psychologist_uid_idx ON public.follow_ups USING btree (psychologist_uid);
create index if not exists idx_followups_child_name ON public.follow_ups USING btree (child_name);
create index if not exists messages_read_at_idx ON public.messages USING btree (read_at);
create index if not exists messages_recipient_email_idx ON public.messages USING btree (recipient_email);
create index if not exists messages_recipient_role_idx ON public.messages USING btree (recipient_role);
create index if not exists messages_screening_id_idx ON public.messages USING btree (screening_id);
create index if not exists offline_licences_user_id_idx ON public.offline_licences USING btree (user_id);
create index if not exists purchase_requests_status_idx ON public.purchase_requests USING btree (status);
create index if not exists push_subscriptions_user_id_idx ON public.push_subscriptions USING btree (user_id);
create index if not exists idx_screenings_child_id ON public.puzzlebox_screenings USING btree (child_id);
create index if not exists puzzlebox_screenings_child_id_idx ON public.puzzlebox_screenings USING btree (child_id);
create index if not exists puzzlebox_screenings_status_idx ON public.puzzlebox_screenings USING btree (status);
create index if not exists puzzlebox_screenings_teacher_email_idx ON public.puzzlebox_screenings USING btree (teacher_email);
create unique index if not exists schools_code_key ON public.schools USING btree (code);
create unique index if not exists schools_name_key ON public.schools USING btree (lower(btrim(name)));
create index if not exists screener_bands_age_idx ON public.screener_interpretation_bands USING btree (age, sort_order);
create index if not exists screener_questions_section_idx ON public.screener_questions USING btree (section_id, sort_order);
create index if not exists screener_score_tables_question_idx ON public.screener_score_tables USING btree (question_id, age, sort_order);
create index if not exists screener_sections_order_idx ON public.screener_sections USING btree (sort_order);
create index if not exists idx_sessions_child_name ON public.screening_sessions USING btree (child_name);
create index if not exists training_access_product_idx ON public.training_access USING btree (product_number);
create index if not exists training_content_blocks_module_idx ON public.training_content_blocks USING btree (module_id, block_order);
create index if not exists training_modules_sort_order_idx ON public.training_modules USING btree (sort_order);
create index if not exists training_questions_key_idx ON public.training_questions USING btree (question_key);
create index if not exists training_questions_module_idx ON public.training_questions USING btree (module_id, question_order);
create unique index if not exists training_questions_one_published_per_key ON public.training_questions USING btree (question_key) WHERE (status = 'published'::text);
create index if not exists idx_users_email ON public.users USING btree (email);

-- ---------------------------------------------------------------- functions
-- app.child_name_is_number
CREATE OR REPLACE FUNCTION app.child_name_is_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

begin

  if new.child_id is not null then

    new.child_name := coalesce(app.student_number_of(new.child_id), new.child_name);

  end if;

  return new;

end $function$;

-- app.children_before_insert
CREATE OR REPLACE FUNCTION app.children_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

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

end $function$;

-- app.children_before_update
CREATE OR REPLACE FUNCTION app.children_before_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

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

end $function$;

-- app.drop_all_policies
CREATE OR REPLACE FUNCTION app.drop_all_policies(p_table regclass)
 RETURNS void
 LANGUAGE plpgsql
AS $function$

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

end $function$;

-- app.follow_ups_guard
CREATE OR REPLACE FUNCTION app.follow_ups_guard()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

begin

  if app.is_trusted() or app.is_admin() then return new; end if;

  if tg_op = 'INSERT' then

    new.psychologist_uid := app.uid();

  elsif new.psychologist_uid is distinct from old.psychologist_uid

     or new.child_id is distinct from old.child_id then

    raise exception 'A follow-up cannot be moved to another child or psychologist';

  end if;

  return new;

end $function$;

-- app.format_student_number
CREATE OR REPLACE FUNCTION app.format_student_number(p_code text, p_age integer, p_seq bigint, p_age_months integer DEFAULT NULL::integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$

  select p_code || '-' ||

         case when p_age >= 1              then p_age::text

              when p_age_months is not null then p_age_months::text || 'M'

              else 'NA' end

         || '-' || lpad(p_seq::text, 4, '0')

$function$;

-- app.is_admin
CREATE OR REPLACE FUNCTION app.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$ select coalesce(app.my_role() = 'admin', false) $function$;

-- app.is_member
CREATE OR REPLACE FUNCTION app.is_member()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$ select app.my_role() is not null $function$;

-- app.is_psychologist
CREATE OR REPLACE FUNCTION app.is_psychologist()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$ select coalesce(app.my_role() = 'psychologist', false) $function$;

-- app.is_teacher
CREATE OR REPLACE FUNCTION app.is_teacher()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$ select coalesce(app.my_role() = 'educator', false) $function$;

-- app.is_trusted
CREATE OR REPLACE FUNCTION app.is_trusted()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$ select current_user in ('postgres', 'supabase_admin', 'service_role') $function$;

-- app.my_email
CREATE OR REPLACE FUNCTION app.my_email()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ select lower(u.email) from public.users u where u.id = app.uid() $function$;

-- app.my_role
CREATE OR REPLACE FUNCTION app.my_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ select u.role from public.users u where u.id = app.uid() and u.is_verified is true $function$;

-- app.owns_child
CREATE OR REPLACE FUNCTION app.owns_child(p_child uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ select exists (select 1 from public.children c where c.id = p_child and c.teacher_uid = app.uid()) $function$;

-- app.reset_rules
CREATE OR REPLACE FUNCTION app.reset_rules(p_table regclass)
 RETURNS void
 LANGUAGE plpgsql
AS $function$

begin

  execute format('alter table %s enable row level security', p_table);

  perform app.drop_all_policies(p_table);

end $function$;

-- app.save_child_name
CREATE OR REPLACE FUNCTION app.save_child_name(p_child uuid, p_name text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

  insert into public.child_identities (child_id, full_name)

  values (p_child, btrim(p_name))

  on conflict (child_id) do update set full_name = excluded.full_name, updated_at = now()

$function$;

-- app.school_for
CREATE OR REPLACE FUNCTION app.school_for(p_name text, p_province text DEFAULT NULL::text)
 RETURNS schools
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

declare s public.schools;

begin

  select * into s from public.schools where lower(btrim(name)) = lower(btrim(p_name));

  if not found then

    insert into public.schools (name, province) values (btrim(p_name), p_province)

    on conflict do nothing;

    select * into s from public.schools where lower(btrim(name)) = lower(btrim(p_name));

  end if;

  return s;

end $function$;

-- app.schools_before_insert
CREATE OR REPLACE FUNCTION app.schools_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

begin

  new.name := btrim(new.name);

  if new.code is null or btrim(new.code) = '' then

    new.code := app.suggest_school_code(new.name);

  end if;

  return new;

end $function$;

-- app.schools_guard
CREATE OR REPLACE FUNCTION app.schools_guard()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

begin

  if new.code is distinct from old.code

     and exists (select 1 from public.children where school_id = old.id) then

    raise exception 'School code % is already used in student numbers and cannot change', old.code;

  end if;

  return new;

end $function$;

-- app.screening_sessions_guard
CREATE OR REPLACE FUNCTION app.screening_sessions_guard()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

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

end $function$;

-- app.student_number_of
CREATE OR REPLACE FUNCTION app.student_number_of(p_child uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ select student_number from public.children where id = p_child $function$;

-- app.suggest_school_code
CREATE OR REPLACE FUNCTION app.suggest_school_code(p_name text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$

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

end $function$;

-- app.training_certificates_guard
CREATE OR REPLACE FUNCTION app.training_certificates_guard()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

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

end $function$;

-- app.uid
CREATE OR REPLACE FUNCTION app.uid()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$

  select case

    when auth.jwt() ->> 'iss' = 'https://securetoken.google.com/<FIREBASE_PROJECT_ID>'

     and auth.jwt() ->> 'aud' = '<FIREBASE_PROJECT_ID>'

    then nullif(auth.jwt() ->> 'sub', '')

  end

$function$;

-- app.users_guard
CREATE OR REPLACE FUNCTION app.users_guard()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

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

end $function$;

-- public.archive_training_question
CREATE OR REPLACE FUNCTION public.archive_training_question(p_question_key uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  caller_role text;
begin
  select role into caller_role from users where id = (auth.jwt() ->> 'sub');
  if caller_role is distinct from 'admin' then
    raise exception 'not authorized';
  end if;

  update training_questions
    set status = 'archived', updated_at = now()
    where question_key = p_question_key and status in ('published', 'draft');
end;
$function$;

-- public.notify_email_on_message
CREATE OR REPLACE FUNCTION public.notify_email_on_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if coalesce(new.recipient_email, new.teacher_email) is not null then
    begin
      perform net.http_post(
        url     := '<URL>',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', '<REDACTED>'),
        body    := jsonb_build_object('record', to_jsonb(new))
      );
    exception when others then
      raise warning 'email notification failed: %', sqlerrm;
    end;
  end if;
  return new;
end;
$function$;

-- public.publish_training_question
CREATE OR REPLACE FUNCTION public.publish_training_question(p_question_key uuid, p_row_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  caller_role text;
begin
  select role into caller_role from users where id = (auth.jwt() ->> 'sub');
  if caller_role is distinct from 'admin' then
    raise exception 'not authorized';
  end if;

  if not exists (select 1 from training_questions where id = p_row_id and question_key = p_question_key) then
    raise exception 'question version not found';
  end if;

  -- retire whatever was published for this question before promoting
  -- the new version, so there is never a moment with two published rows
  -- (belt-and-suspenders alongside the partial unique index above)
  update training_questions
    set status = 'archived', updated_at = now()
    where question_key = p_question_key and status = 'published' and id <> p_row_id;

  update training_questions
    set status = 'published', updated_at = now()
    where id = p_row_id;
end;
$function$;

-- public.redeem_product_number
CREATE OR REPLACE FUNCTION public.redeem_product_number(p_user_id text, p_email text, p_product_number text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

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

end $function$;

-- public.rls_auto_enable
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

-- public.set_puzzlebox_screenings_updated_at
CREATE OR REPLACE FUNCTION public.set_puzzlebox_screenings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- public.set_screener_updated_at
CREATE OR REPLACE FUNCTION public.set_screener_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- public.set_training_modules_updated_at
CREATE OR REPLACE FUNCTION public.set_training_modules_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- public.set_training_questions_updated_at
CREATE OR REPLACE FUNCTION public.set_training_questions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- public.staff_number_taken
CREATE OR REPLACE FUNCTION public.staff_number_taken(p_staff_number text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ select exists (select 1 from public.users where btrim(staff_number) = btrim(p_staff_number)) $function$;

-- public.whoami
CREATE OR REPLACE FUNCTION public.whoami()
 RETURNS TABLE(firebase_uid text, token_issuer text, role text, approved boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

  select auth.jwt() ->> 'sub',

         auth.jwt() ->> 'iss',

         (select u.role from public.users u where u.id = auth.jwt() ->> 'sub'),

         (select u.is_verified from public.users u where u.id = auth.jwt() ->> 'sub')

$function$;

-- ---------------------------------------------------------------- view
create or replace view public.children_named with (security_invoker=true) as
 SELECT c.id,
    c.name,
    c.school,
    c.province,
    c.age,
    c.gender,
    c.language,
    c.cognitive,
    c.motor,
    c.language_score,
    c.social,
    c.emotion,
    c.moral,
    c.total,
    c.status,
    c.flagged,
    c.referred,
    c.resolved,
    c.date,
    c.examiner,
    c.stage,
    c.created_at,
    c.teacher_email,
    c.consent_form_url,
    c.consent_file_name,
    c.consent_uploaded_at,
    c.consent_verified,
    c.consent_verification_notes,
    c.consent_verified_at,
    c.teacher_uid,
    c.age_months,
    c.school_id,
    c.student_seq,
    c.student_number,
    c.data_source,
    ci.full_name AS real_name
   FROM children c
     LEFT JOIN child_identities ci ON ci.child_id = c.id;

-- ---------------------------------------------------------------- triggers
CREATE TRIGGER trg_children_before_insert BEFORE INSERT ON children FOR EACH ROW EXECUTE FUNCTION app.children_before_insert();
CREATE TRIGGER trg_children_guard BEFORE UPDATE ON children FOR EACH ROW EXECUTE FUNCTION app.children_before_update();
CREATE TRIGGER trg_follow_ups_child_name BEFORE INSERT OR UPDATE ON follow_ups FOR EACH ROW EXECUTE FUNCTION app.child_name_is_number();
CREATE TRIGGER trg_follow_ups_guard BEFORE INSERT OR UPDATE ON follow_ups FOR EACH ROW EXECUTE FUNCTION app.follow_ups_guard();
CREATE TRIGGER messages_email_notify AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION notify_email_on_message();
CREATE TRIGGER trg_messages_child_name BEFORE INSERT OR UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION app.child_name_is_number();
CREATE TRIGGER trg_puzzlebox_screenings_child_name BEFORE INSERT OR UPDATE ON puzzlebox_screenings FOR EACH ROW EXECUTE FUNCTION app.child_name_is_number();
CREATE TRIGGER trg_puzzlebox_screenings_updated_at BEFORE UPDATE ON puzzlebox_screenings FOR EACH ROW EXECUTE FUNCTION set_puzzlebox_screenings_updated_at();
CREATE TRIGGER trg_schools_before_insert BEFORE INSERT ON schools FOR EACH ROW EXECUTE FUNCTION app.schools_before_insert();
CREATE TRIGGER trg_schools_guard BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION app.schools_guard();
CREATE TRIGGER trg_screener_meta_updated_at BEFORE UPDATE ON screener_meta FOR EACH ROW EXECUTE FUNCTION set_screener_updated_at();
CREATE TRIGGER trg_screener_questions_updated_at BEFORE UPDATE ON screener_questions FOR EACH ROW EXECUTE FUNCTION set_screener_updated_at();
CREATE TRIGGER trg_screener_sections_updated_at BEFORE UPDATE ON screener_sections FOR EACH ROW EXECUTE FUNCTION set_screener_updated_at();
CREATE TRIGGER trg_screening_sessions_child_name BEFORE INSERT OR UPDATE ON screening_sessions FOR EACH ROW EXECUTE FUNCTION app.child_name_is_number();
CREATE TRIGGER trg_screening_sessions_guard BEFORE UPDATE ON screening_sessions FOR EACH ROW EXECUTE FUNCTION app.screening_sessions_guard();
CREATE TRIGGER trg_training_certificates_guard BEFORE UPDATE ON training_certificates FOR EACH ROW EXECUTE FUNCTION app.training_certificates_guard();
CREATE TRIGGER trg_training_modules_updated_at BEFORE UPDATE ON training_modules FOR EACH ROW EXECUTE FUNCTION set_training_modules_updated_at();
CREATE TRIGGER trg_training_questions_updated_at BEFORE UPDATE ON training_questions FOR EACH ROW EXECUTE FUNCTION set_training_questions_updated_at();
CREATE TRIGGER trg_users_guard BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION app.users_guard();

-- ---------------------------------------------------------------- row-level security
alter table public.child_identities enable row level security;
alter table public.children enable row level security;
alter table public.follow_ups enable row level security;
alter table public.messages enable row level security;
alter table public.offline_licences enable row level security;
alter table public.pilot_column_dictionary enable row level security;
alter table public.pilot_screening_data enable row level security;
alter table public.purchase_requests enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.puzzlebox_screenings enable row level security;
alter table public.schools enable row level security;
alter table public.screener_interpretation_bands enable row level security;
alter table public.screener_meta enable row level security;
alter table public.screener_products enable row level security;
alter table public.screener_questions enable row level security;
alter table public.screener_score_tables enable row level security;
alter table public.screener_sections enable row level security;
alter table public.screening_sessions enable row level security;
alter table public.training_access enable row level security;
alter table public.training_certificates enable row level security;
alter table public.training_content_blocks enable row level security;
alter table public.training_modules enable row level security;
alter table public.training_progress enable row level security;
alter table public.training_questions enable row level security;
alter table public.users enable row level security;

-- ---------------------------------------------------------------- policies
create policy child_names_read on public.child_identities
  for select to anon,authenticated
  using ((app.is_psychologist() OR (app.is_teacher() AND app.owns_child(child_id))));
create policy children_add on public.children
  for insert to anon,authenticated
  with check ((app.is_admin() OR (app.is_teacher() AND (teacher_uid = app.uid()))));
create policy children_delete on public.children
  for delete to anon,authenticated
  using ((app.is_admin() OR (app.is_teacher() AND (teacher_uid = app.uid()))));
create policy children_edit on public.children
  for update to anon,authenticated
  using ((app.is_admin() OR app.is_psychologist() OR (app.is_teacher() AND (teacher_uid = app.uid()))))
  with check ((app.is_admin() OR app.is_psychologist() OR (app.is_teacher() AND (teacher_uid = app.uid()))));
create policy children_read on public.children
  for select to anon,authenticated
  using ((app.is_admin() OR app.is_psychologist() OR (app.is_teacher() AND (teacher_uid = app.uid()))));
create policy follow_ups_add on public.follow_ups
  for insert to anon,authenticated
  with check ((app.is_admin() OR (app.is_psychologist() AND (psychologist_uid = app.uid()))));
create policy follow_ups_delete on public.follow_ups
  for delete to anon,authenticated
  using ((app.is_admin() OR (app.is_psychologist() AND (psychologist_uid = app.uid()))));
create policy follow_ups_edit on public.follow_ups
  for update to anon,authenticated
  using ((app.is_admin() OR (app.is_psychologist() AND (psychologist_uid = app.uid()))))
  with check ((app.is_admin() OR (app.is_psychologist() AND (psychologist_uid = app.uid()))));
create policy follow_ups_read on public.follow_ups
  for select to anon,authenticated
  using ((app.is_admin() OR app.is_psychologist() OR (app.is_teacher() AND app.owns_child(child_id))));
create policy messages_delete on public.messages
  for delete to anon,authenticated
  using (app.is_admin());
create policy messages_mark_read on public.messages
  for update to anon,authenticated
  using ((app.is_admin() OR app.is_psychologist() OR (app.is_member() AND ((lower(recipient_email) = app.my_email()) OR (lower(teacher_email) = app.my_email())))))
  with check ((app.is_admin() OR app.is_psychologist() OR (app.is_member() AND ((lower(recipient_email) = app.my_email()) OR (lower(teacher_email) = app.my_email())))));
create policy messages_read on public.messages
  for select to anon,authenticated
  using ((app.is_admin() OR app.is_psychologist() OR (app.is_member() AND ((lower(recipient_email) = app.my_email()) OR (lower(teacher_email) = app.my_email())))));
create policy messages_send on public.messages
  for insert to anon,authenticated
  with check (app.is_member());
create policy offline_licences_admin on public.offline_licences
  for all to anon,authenticated
  using (app.is_admin())
  with check (app.is_admin());
create policy offline_licences_read_own on public.offline_licences
  for select to anon,authenticated
  using ((user_id = app.uid()));
create policy pilot_dictionary_read on public.pilot_column_dictionary
  for select to anon,authenticated
  using ((app.my_role() = ANY (ARRAY['admin'::text, 'psychologist'::text, 'analyst'::text])));
create policy pilot_read on public.pilot_screening_data
  for select to anon,authenticated
  using ((app.my_role() = ANY (ARRAY['admin'::text, 'psychologist'::text, 'analyst'::text])));
create policy purchases_admin on public.purchase_requests
  for all to anon,authenticated
  using (app.is_admin())
  with check (app.is_admin());
create policy purchases_enquire on public.purchase_requests
  for insert to anon,authenticated
  with check (((status = 'pending'::text) AND (product_number IS NULL) AND (admin_notes IS NULL) AND (fulfilled_by IS NULL) AND (fulfilled_at IS NULL)));
create policy push_own on public.push_subscriptions
  for all to anon,authenticated
  using ((user_id = app.uid()))
  with check ((user_id = app.uid()));
create policy screenings_add on public.puzzlebox_screenings
  for insert to anon,authenticated
  with check ((app.is_admin() OR (app.is_teacher() AND app.owns_child(child_id) AND (lower(teacher_email) = app.my_email()))));
create policy screenings_delete on public.puzzlebox_screenings
  for delete to anon,authenticated
  using (app.is_admin());
create policy screenings_read on public.puzzlebox_screenings
  for select to anon,authenticated
  using ((app.is_admin() OR app.is_psychologist() OR (app.is_teacher() AND (app.owns_child(child_id) OR (lower(teacher_email) = app.my_email())))));
create policy screenings_review on public.puzzlebox_screenings
  for update to anon,authenticated
  using ((app.is_admin() OR app.is_psychologist()))
  with check ((app.is_admin() OR app.is_psychologist()));
create policy screenings_teacher_edit on public.puzzlebox_screenings
  for update to anon,authenticated
  using ((app.is_teacher() AND (lower(teacher_email) = app.my_email()) AND (status IS DISTINCT FROM 'reviewed'::text)))
  with check ((app.is_teacher() AND (lower(teacher_email) = app.my_email())));
create policy schools_admin on public.schools
  for all to anon,authenticated
  using (app.is_admin())
  with check (app.is_admin());
create policy schools_read on public.schools
  for select to anon,authenticated
  using (app.is_member());
create policy screener_interpretation_bands_admin on public.screener_interpretation_bands
  for all to anon,authenticated
  using (app.is_admin())
  with check (app.is_admin());
create policy screener_interpretation_bands_read on public.screener_interpretation_bands
  for select to anon,authenticated
  using (app.is_member());
create policy screener_meta_admin on public.screener_meta
  for all to anon,authenticated
  using (app.is_admin())
  with check (app.is_admin());
create policy screener_meta_read on public.screener_meta
  for select to anon,authenticated
  using (app.is_member());
create policy products_admin on public.screener_products
  for all to anon,authenticated
  using (app.is_admin())
  with check (app.is_admin());
create policy screener_questions_admin on public.screener_questions
  for all to anon,authenticated
  using (app.is_admin())
  with check (app.is_admin());
create policy screener_questions_read on public.screener_questions
  for select to anon,authenticated
  using (app.is_member());
create policy screener_score_tables_admin on public.screener_score_tables
  for all to anon,authenticated
  using (app.is_admin())
  with check (app.is_admin());
create policy screener_score_tables_read on public.screener_score_tables
  for select to anon,authenticated
  using (app.is_member());
create policy screener_sections_admin on public.screener_sections
  for all to anon,authenticated
  using (app.is_admin())
  with check (app.is_admin());
create policy screener_sections_read on public.screener_sections
  for select to anon,authenticated
  using (app.is_member());
create policy sessions_add on public.screening_sessions
  for insert to anon,authenticated
  with check ((app.is_admin() OR (app.is_teacher() AND app.owns_child(child_id))));
create policy sessions_delete on public.screening_sessions
  for delete to anon,authenticated
  using (app.is_admin());
create policy sessions_edit on public.screening_sessions
  for update to anon,authenticated
  using ((app.is_admin() OR app.is_psychologist() OR (app.is_teacher() AND app.owns_child(child_id))))
  with check ((app.is_admin() OR app.is_psychologist() OR (app.is_teacher() AND app.owns_child(child_id))));
create policy sessions_read on public.screening_sessions
  for select to anon,authenticated
  using ((app.is_admin() OR app.is_psychologist() OR (app.is_teacher() AND app.owns_child(child_id))));
create policy access_read on public.training_access
  for select to anon,authenticated
  using (((user_id = app.uid()) OR app.is_admin()));
create policy certs_delete on public.training_certificates
  for delete to anon,authenticated
  using (app.is_admin());
create policy certs_edit on public.training_certificates
  for update to anon,authenticated
  using (((user_id = app.uid()) OR app.is_admin()))
  with check (((user_id = app.uid()) OR app.is_admin()));
create policy certs_read on public.training_certificates
  for select to anon,authenticated
  using (((user_id = app.uid()) OR app.is_admin()));
create policy certs_request on public.training_certificates
  for insert to anon,authenticated
  with check ((app.is_admin() OR ((user_id = app.uid()) AND app.is_member() AND (status = 'pending'::text) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL) AND (issued_at IS NULL))));
create policy training_content_blocks_admin on public.training_content_blocks
  for all to anon,authenticated
  using (app.is_admin())
  with check (app.is_admin());
create policy training_content_blocks_read on public.training_content_blocks
  for select to anon,authenticated
  using ((app.is_member() AND (status = 'published'::text)));
create policy training_modules_admin on public.training_modules
  for all to anon,authenticated
  using (app.is_admin())
  with check (app.is_admin());
create policy training_modules_read on public.training_modules
  for select to anon,authenticated
  using (app.is_member());
create policy progress_add on public.training_progress
  for insert to anon,authenticated
  with check (((user_id = app.uid()) AND app.is_member()));
create policy progress_delete on public.training_progress
  for delete to anon,authenticated
  using (app.is_admin());
create policy progress_edit on public.training_progress
  for update to anon,authenticated
  using ((user_id = app.uid()))
  with check ((user_id = app.uid()));
create policy progress_read on public.training_progress
  for select to anon,authenticated
  using (((user_id = app.uid()) OR app.is_admin()));
create policy training_questions_admin on public.training_questions
  for all to anon,authenticated
  using (app.is_admin())
  with check (app.is_admin());
create policy training_questions_read on public.training_questions
  for select to anon,authenticated
  using ((app.is_member() AND (status = 'published'::text)));
create policy users_admin_delete on public.users
  for delete to anon,authenticated
  using (app.is_admin());
create policy users_admin_edit on public.users
  for update to anon,authenticated
  using (app.is_admin())
  with check (app.is_admin());
create policy users_edit_own on public.users
  for update to anon,authenticated
  using ((id = app.uid()))
  with check ((id = app.uid()));
create policy users_read on public.users
  for select to anon,authenticated
  using (((id = app.uid()) OR app.is_member()));
create policy users_sign_up on public.users
  for insert to anon,authenticated
  with check ((((id = app.uid()) AND (is_verified IS NOT TRUE) AND (role = ANY (ARRAY['educator'::text, 'psychologist'::text, 'analyst'::text]))) OR app.is_admin()));

-- ---------------------------------------------------------------- grants
-- Row-level security decides WHICH rows; these allow the normal commands.
grant usage on schema public, app to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema app to anon, authenticated, service_role;

-- ---------------------------------------------------------------- storage buckets
insert into storage.buckets (id, name, public) values ('consent-forms', 'consent-forms', true) on conflict (id) do nothing;

-- ---------------------------------------------------------------- realtime (live updates)
alter publication supabase_realtime add table public.children;
alter publication supabase_realtime add table public.follow_ups;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.screening_sessions;
alter publication supabase_realtime add table public.users;
