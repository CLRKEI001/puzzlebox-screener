# Database setup: student numbers, pilot data, access rules

Run these **in order**, once each, in Supabase → **SQL Editor** (or with `npx supabase db query --linked -f <file>`). Every file can safely be run again.

| # | File | What it does |
|---|------|--------------|
| 0 | `00_backup.sql` | Copies every table and the current rules into a private `backup_20261006` schema |
| 1 | `01_student_numbers_and_names.sql` | Gives every child a student number and moves real names somewhere only their teacher can read |
| 2 | `02_pilot_data.sql` | Imports the pilot spreadsheet: 327 children, every answer kept. **Not in git** (the repo is public): build it with the script under *Pilot data* below |
| 4 | `04_access_rules.sql` | Turns on the rules for who can see and change what. **Only after the check below passes.** |

**Teachers always see their own students' names** in the updated app. It reads them through the `children_named` view. The site that's live today is older code that reads `children.name` directly, and after step 1 that column holds the student number. So deploy this branch's app at the same time as you run step 1. Don't leave a gap where the old site is running against the new database.

## Before step 4: check the database knows who is signed in

The rules in step 4 work by reading the signed-in user from their Firebase token. Check that this works first:

1. Supabase → **Authentication → Sign In / Providers → Third-Party Auth** must list Firebase project `puzzle-project-3b369`.
2. Run `check_my_access.sql` in the SQL Editor.
3. Run the app locally (`npm start`) and sign in. Open the browser console (F12) and type
   `(await window.supabase.rpc("whoami")).data`
4. You should see your Firebase UID and your role. **If `firebase_uid` is empty, stop and don't run step 4**, because everyone would be locked out.

If step 4 ever locks everyone out, run `emergency_reopen.sql`, fix the token setup, then run step 4 again.

## Student numbers

Format: **school code – age – number**, e.g. `FB-5-0042`.

- **School code:** for a name with several words, the initials (Fort Beaufort → `FB`, East London → `EL`). For a one-word name, the first three letters (Adelaide → `ADE`).
- **Age:** in whole years when the child is registered. Under 1 year it's shown in months with an M, e.g. `FB-11M-0123`. Unknown age shows `NA`.
- **Number:** unique for each child and never reused. Gaps are possible.
- A number never changes, even if you fix the child's age or school later.
- A child with no school on record goes under "Unknown School" (`US`) until an admin fixes it.
- When a teacher types a new school name in Add Student, it's created automatically.

## Who sees names

| | Real name | Student number |
|---|---|---|
| The child's own teacher | ✅ | ✅ |
| Other teachers | can't see the child at all | |
| Psychologists | ✅ | ✅ |
| Admins | ❌ | ✅ |

`children.name`, and `child_name` on follow-ups, sessions, messages and screenings, now hold the student number. The real name is stored in `child_identities`. The app reads it through the `children_named` view, which only fills in `real_name` for the child's own teacher and for psychologists.

## The access rules (step 4)

"Logged in" means signed in **and approved by an admin**.

- **Users:** anyone logged in sees the user list. A user edits only their own profile. Only an admin approves or rejects accounts or changes roles. Nobody can approve or promote themselves.
- **Children:** a teacher sees, edits and deletes only their own children, and can only add children under their own name. Psychologists and admins see all children. Psychologists may only change *flagged / referred / resolved / status*.
- **Follow-ups:** a psychologist writes only the follow-ups they're reviewing. A teacher can read follow-ups on their own children but can't edit them. Admins see everything.
- **Screening sessions and screenings:** a teacher works on their own children's. Psychologists read and review all. Admins see everything.
- **Training modules and screening questions:** everyone logged in reads them. Only an admin adds, edits or deletes them. Draft quiz questions and lesson content (which include answer keys) are admin-only until published.
- **Tables your rules didn't mention** get the narrowest rule that keeps their feature working (see section B of the file). For example, you only see your own training progress, and the purchase form can only send a new enquiry.
- **Any table not named in the file is locked completely.** The SQL Editor prints `LOCKED …` for each one.

## Pilot data (step 2)

- All 327 rows from *Data for coding PuzzleBox.xlsx*. Each child is decoded into a row in `children` (school = place of testing, age from `AgeMths`, gender, home language) with `data_source = 'pilot'` and no teacher. That means only admins and psychologists see them.
- All 133 coded columns are kept untouched in `pilot_screening_data.answers`, with `pilot_column_dictionary` explaining each column's section. Data analysts can read these too.
- The spreadsheet code (`S121`, `3P10`, …) is stored like a name, so it's private.
- **Please check:** `S121`–`S129` have `AgeMths` between 2 and 11, which looks like years typed into the months column. They're imported as recorded, so their numbers look like `FB-11M-…`.
- `S4` and `S14` each appear twice for different children, so each copy gets its spreadsheet row number added, e.g. `S4 (row 267)` and `S4 (row 268)`.
- Place of testing "PE" is stored as Port Elizabeth (`PE`), and "Other" as Other Testing Site (`OTS`).
- To regenerate after the spreadsheet changes:
  `py supabase/database/tools/build_pilot_import.py "C:/path/to/Data for coding PuzzleBox.xlsx"`
- To remove the pilot data: `delete from public.children where data_source = 'pilot';`

## Removing the old mock children

The mock data file (`03_mock_data.sql`) has been removed. If your database still holds the 15 made-up children (`Child PB-001…015`, labelled `data_source = 'demo'`), remove them, and anything recorded against them, with:

```sql
begin;
delete from public.messages             where child_id in (select id from public.children where data_source = 'demo');
delete from public.follow_ups           where child_id in (select id from public.children where data_source = 'demo');
delete from public.puzzlebox_screenings where child_id in (select id from public.children where data_source = 'demo');
delete from public.screening_sessions   where child_id in (select id from public.children where data_source = 'demo');
delete from public.children             where data_source = 'demo';
drop function if exists app.assign_demo_children(text);
commit;
```

Run `00_backup.sql` first. Their private names in `child_identities` are removed automatically with them.

## Tested

Run against a copy of the schema in real Postgres (PGlite). The setup files ran twice in a row with no errors and no duplicate rows. 70 checks passed for logged-out visitors, pending users, two teachers, a psychologist and an admin, including:
- a token from another Firebase project is rejected
- a user can't self-approve or self-promote
- each role sees exactly the rows and names it should

It has **not** been run on your hosted Supabase project yet.
