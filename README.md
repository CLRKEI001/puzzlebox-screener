# Puzzel-Project-Team-19

**The Puzzle Project · The Puzzle Box Screener** — a web platform for [Picture Tree](https://picturetree.co.za) that digitises early childhood developmental screening. Teachers screen children with a puzzle-based tool, psychologists review the results, and admins oversee the whole programme.

> **Team 19:** Jess, Keira, Kgoshi and Mihle — built for Picture Tree NGO.

---

## Welcome

This repo holds two things in one app:

1. **The public website** — the Puzzle Project home, About, Donate, **The Puzzle Box** (the screener) and **Puzzle Play** pages.
2. **The signed-in platform** — role-based dashboards, the screener itself, training for educators and psychologists, analytics and reports, and an offline mode for schools with poor signal.

### Who uses it

| Role | What they do |
|---|---|
| **Educator (teacher)** | Completes the Puzzle Box training, adds children (with a consent form), runs screenings, reads feedback from psychologists. |
| **Psychologist** | Reviews submitted screenings, records a verdict, sends feedback to the teacher, manages follow-ups, sees full analytics. |
| **Admin** | Approves new accounts, assigns roles, reviews consent forms and purchase requests, manages training and screener content, sees programme-wide analytics. |
| **Data analyst** | Reads aggregated analytics. |

New accounts are **not** active until an admin approves them. 

### What's inside

- **The Puzzle Box Screener** — 6 developmental domains (cognitive, fine motor, language, social, emotional, moral), age-specific scoring for ages 5–6, built-in timers, observation notes, and interpretation bands (On Track / Progressing / Developmental Concerns).
- **Consent forms** — upload, automatic check, and manual admin review before a child can be screened.
- **Training course** — modules and quizzes with a 70% pass mark and a certificate.
- **Analytics & reports** — Overview, Student Records, Screener Results, Flags & Alerts and a Summary Report, with PDF and Excel export.
- **Offline screener** — encrypted offline package, licence-controlled, syncs when back online.
- **Translator chat** — a helper for translating messages (English, Afrikaans, isiXhosa).
- **Notifications** — in-app messages, email, and web push.
- **Demo mode** — a shortened 4-section screener for presentations (see below).

---

## Tech stack

- **Front end:** React (Create React App), Recharts, jsPDF + autotable, SheetJS (`xlsx`)
- **Back end:** [Supabase](https://supabase.com) — Postgres with row-level security, Realtime, Storage and Edge Functions
- **Sign-in:** Firebase Authentication (its token is passed to Supabase)
- **Offline / PWA:** Workbox service worker (`src/service-worker.js`) plus an encrypted vault (`src/offline/`)
- **Hosting:** Vercel  (`vercel.json`)

## Project layout

## Project layout

The code is organised into four layers.

| Layer | What it does | Where it lives |
|---|---|---|
| **1. Presentation** | The screens people see and use | `src/components/`, `App.js`, `public/` |
| **2. Business logic** | Screening rules, app state, offline behaviour | `src/hooks/`, `src/data/`, `src/offline/`, `src/services/` (analytics, reports, consent) |
| **3. Data access** | Talking to Supabase and Firebase | `src/services/supabaseClient.js`, `src/services/firebase.js`, `src/utils/mappers.js` |
| **4. Back end** | The database and server-side functions | `supabase/` (database, migrations, functions) |

```
src/
  App.js                    [Presentation] routing between public site, login and role dashboards
  components/               [Presentation] everything on screen
    public/                   home, About, Donate, Puzzle Box and Puzzle Play pages
    dashboards/               TeacherHome, PsychologistHome, AdminHome, Dashboard, MemberArea
    screener/                 PuzzleBoxScreener + admin content editor + results
    analytics/                Overview, Flags, Student Records, Summary Report
    training/                 training modules, quizzes and admin editors
    translator/               translator chat widget
    shared/                   site chrome (nav/footer), sidebars, shared UI
  hooks/                    [Business logic] screener content and training hooks
  data/                     [Business logic] built-in screener and training content (scoring rules)
  offline/                  [Business logic] offline vault and sync
  services/
    analyticsData.js          [Business logic] the one source of analytics numbers
    reportGenerator.js        [Business logic] PDF and Excel reports
    consentForms.js           [Business logic] consent upload and checks
    push.js                   [Business logic] web-push subscription
    supabaseClient.js         [Data access] Supabase client (passes the Firebase token)
    firebase.js               [Data access] Firebase sign-in
  utils/
    mappers.js                [Data access] converts database rows to app objects
    showcaseMode.js           [Business logic] demo (4-section) mode
supabase/                   [Back end]
  database/                   SQL for tables, student numbers, access rules (see its README)
  migrations/                 numbered migrations
  functions/                  server-side code
    email-notification/         emails each new message
    send-push/                  web-push notifications
    issue-offline-package/      builds the encrypted offline package
    translator-chat/            translation helper (Gemini)
```

> **Note:** Some dashboard screens (for example TeacherHome and AdminHome) also query Supabase directly, so the layers are a guide to the structure, not a strict wall.

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Environment variables

Create a `.env.local` in the project root (never commit it):

```bash
REACT_APP_SUPABASE_URL=https://<your-project>.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<your anon/public key>
REACT_APP_VAPID_PUBLIC_KEY=<public VAPID key>     # only for web push
REACT_APP_SHOWCASE_MODE=true                      # see "Demo mode" below
```

### 3. Run

```bash
npm start        # http://localhost:3000
npm test         # test runner
npm run build    # production build in /build
```

---

## Demo mode

`REACT_APP_SHOWCASE_MODE` controls the screener:

- **not `false`** (the default) — a shortened **4-section, 8-question** screener with rescaled pass marks. Good for presentations.
- **`false`** — the **full 40-question screener**. **Set this before any real use.** Results saved in demo mode are ordinary screenings.

## Supabase setup

1. Create the tables and rules in order from `supabase/database/` (read its README first) and apply `supabase/migrations/`.
2. Deploy the Edge Functions:

   ```bash
   supabase functions deploy email-notification --no-verify-jwt
   supabase functions deploy send-push
   supabase functions deploy issue-offline-package
   supabase functions deploy translator-chat
   ```

3. Set the function secrets:

   ```bash
   supabase secrets set BREVO_API_KEY=... EMAIL_FROM=... WEBHOOK_SECRET=...   # email
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com   # push
   ```

   Generate a VAPID pair once with `npx web-push generate-vapid-keys`. See the header comment of each function for the full list of secrets it needs.

4. Turn on Realtime for the tables the dashboards listen to (`children`, `puzzlebox_screenings`, `follow_ups`, `messages`).

> ⚠️ `supabase/database/emergency_reopen.sql` opens every table to anyone with the public key. It is for emergencies only — never run it on a live project.

## How the numbers work

All analytics pages read from **one place**: `src/services/analyticsData.js`. It loads children, submitted screenings and follow-ups, then works out each child's score from their latest screening.

- A score is **points earned ÷ the maximum possible**: yes/no questions are worth 1, the rest 2 (44 in total).
- **Status** comes from the age-specific interpretation band (or the psychologist's verdict once reviewed) — not from the percentage.
- A screening with no band and no verdict shows as **Not Scored**.
- "Needs follow-up" means the latest result is Developmental Concerns and it hasn't been marked resolved (`isActiveFlag`).

## Contributing

- Work on a branch (`git checkout -b my-change`), push it, and open a pull request.
- Don't commit `.env*` files or secrets.
- Run `npm run build` before pushing, to catch compile errors.

---

# Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app). See the [CRA documentation](https://facebook.github.io/create-react-app/docs/getting-started) for `eject`, code splitting, bundle analysis, PWA setup, deployment and troubleshooting.