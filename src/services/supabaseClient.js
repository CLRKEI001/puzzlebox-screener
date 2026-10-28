

// Supabase is our database. This file creates the one connection to it that
// every other file imports, and Firebase handles sign-in. Firebase gives the
// user a signed token, and we hand that token to Supabase so the database
// knows who is making each request.

import { createClient } from "@supabase/supabase-js";
import { auth } from "./firebase";

// --- Firebase as a trusted third-party auth provider for Supabase -------
//
// Previously every table's RLS policy was a permissive "soft gate"
// (`using (true)`) because Postgres had no way to verify who was really
// calling — the Firebase UID was just a plain value the client sent
// along with each query, which anyone could fake. That's no longer true
// once Firebase is configured as a trusted JWT issuer in this Supabase
// project (Dashboard -> Authentication -> Sign In / Providers -> Third
// Party Auth -> add your Firebase Project ID) — see
// supabase/migrations/022_question_versioning_and_rls.sql's header
// comment for the one-time setup step and why it's needed.
//
// Once that's configured, Supabase verifies the token's signature itself
// (against Firebase's public keys) before any RLS policy runs, so a
// policy that reads `auth.jwt() ->> 'sub'` can trust that value is the
// real, signed-in Firebase UID — not something the client can spoof.
// This `accessToken` callback is what hands that verified token to
// Supabase on every request; `getIdToken()` returns Firebase's cached
// token and silently refreshes it when it's close to expiring, so this
// is cheap to call on every request.



// Called by Supabase before every request to get the signed-in user's token.
function getFirebaseAccessToken() {
  const user = auth.currentUser;     // Nobody is signed in, so there is no token to send.
  if (!user) return Promise.resolve(null);

  // Firebase keeps the token cached and refreshes it before it expires,
  // so this is cheap to call. If it fails, we send no token rather than crash.
  return user.getIdToken().catch(() => null);
}

// These come from Supabase Dashboard → Project Settings → API.
// supabaseUrl is your project's unique REST endpoint.
// supabaseAnonKey is the public "anon" key — safe to expose in the browser
// bundle (same idea as Firebase's apiKey), because it only grants whatever
// access your Row Level Security policies allow. NEVER put the
// "service_role" key in frontend code — that one bypasses RLS entirely.

// Create React App only exposes env vars prefixed with REACT_APP_ to the
// browser bundle, so both variables below must use that prefix, and must be
// set in a .env file at the project root (see .env.example).


// Connection details come from the .env file, never from the code itself.
// The URL is our project's address. The anon key is public by design and
// only allows what our Row Level Security rules allow. The powerful
// service_role key is never used in the browser.

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;


// If either value is missing, show a clear error at startup instead of
// letting every database call fail silently later. This usually means .env
// is missing or the dev server wasn't restarted after editing it.
  
if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly at startup instead of silently breaking every DB call —
  // this almost always means .env is missing or the dev server wasn't
  // restarted after adding it (CRA only reads .env at startup).
  console.error(
    "Missing Supabase environment variables. Check that .env contains " +
    "REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY, then restart `npm start`."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: getFirebaseAccessToken,
});

// Local dev server only: lets you run supabase/database/check_my_access.sql's
// whoami() check from the browser console. Never included in a production build.
if (process.env.NODE_ENV === "development") window.supabase = supabase;
export default supabase;