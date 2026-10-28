// @ts-nocheck
// supabase/functions/issue-offline-package/index.ts
//
// Two actions, both called by src/offline/offlineVault.js:
//
//   download (default)  Verified educators only. Bundles the screener content
//                       and the educator's consent-verified children, encrypts
//                       it with a fresh AES-256 key, records a 7-day licence
//                       and returns { key, payload, iv, licence }.
//
//   status              Called after each offline sync. Records the sync time
//                       and says whether the licence was cancelled.
//
// Login is Firebase, so the caller's Firebase ID token arrives in the
// x-firebase-token header and is verified here against Google's public keys.
// Deploy with JWT verification OFF (the Supabase gateway can't check a
// Firebase token; this function does it itself).

import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

const FIREBASE_PROJECT = "puzzle-project-3b369";
const LICENCE_DAYS = 7;
const ALLOWED_ROLES = ["educator"];

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-firebase-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const toB64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};

/**
 * Verifies the Firebase ID token sent by the client and returns the
 * authenticated user's Firebase UID.
 *
 * The client sends its Firebase ID token in the custom `x-firebase-token`
 * header. We validate it against Google's public keys (JWKS) so the Edge
 * Function can trust who is calling without needing a Supabase session.
 *
 * @param req - The incoming HTTP request.
 * @returns The Firebase user ID (the token's `sub` claim).
 * @throws If the token is missing, invalid, expired, issued by the wrong
 *         project, or has no subject.
 */

async function verifyFirebase(req: Request): Promise<string> {
    // Read the Firebase ID token from the custom request header
  const token = req.headers.get("x-firebase-token");
   // Reject immediately if the caller didn't send a token
  if (!token) throw new Error("missing token");

  // Verify the token's signature and claims using the remote JWKS
  // (Google's public signing keys). jwtVerify also checks `exp`/`nbf`
  // automatically, so expired tokens are rejected.
  const { payload } = await jwtVerify(token, JWKS, {

    // The token must have been issued by this Firebase project's
    // secure token service
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT}`,

    // The token must be intended for this Firebase project, which stops
    // tokens issued for other apps from being accepted here
    audience: FIREBASE_PROJECT,
  });

  // `sub` is the Firebase UID. Without it we can't identify the user,
  // so treat the token as unusable
  if (!payload.sub) throw new Error("no subject");

  // Return the verified UID so the caller can use it to scope data access
  // (e.g. issuing an offline package for this specific user)
  return payload.sub;
}

async function buildScreener(uid: string, teacher: { email: string; name: string }) {
  const [meta, sections, questions, scoreTables, bands, children] = await Promise.all([
    admin.from("screener_meta").select("version, instructions, scoring_legend").eq("id", 1).maybeSingle(),
    admin.from("screener_sections").select("id, sort_order, title, description, domain, is_puzzle_timer_section").order("sort_order"),
    admin.from("screener_questions")
      .select("id, section_id, sort_order, label, instruction, to_pass, domain_override, scoring_type, needs_confirmation, checklist_options")
      .order("sort_order"),
    admin.from("screener_score_tables").select("id, question_id, age, sort_order, score, min_value, max_value").order("sort_order"),
    admin.from("screener_interpretation_bands").select("id, age, sort_order, band_key, label, min_score, max_score").order("sort_order"),
    
    // Only this educator's children whose consent form has been verified,
    // the same rule the online screener applies before a screening can start.
    // Same view the online screener reads (children + real_name), so the app
    // can shape offline children with the same mapChildRow as online.
    admin.from("children_named")
      .select("*")
      .eq("teacher_uid", uid)
      .eq("consent_verified", true)
      .order("real_name"),
  ]);

  for (const r of [meta, sections, questions, scoreTables, bands, children]) {
    if (r.error) throw r.error;
  }

  return {
    version: meta.data?.version ?? "1.0",
    instructions: meta.data?.instructions ?? "",
    scoringLegend: meta.data?.scoring_legend ?? [],
    sections: sections.data,
    questions: questions.data,
    scoreTables: scoreTables.data,
    interpretationBands: bands.data,
    children: children.data ?? [],
    // The registered email is what the database checks uploads against
    // (teacher_email must match users.email), so offline screenings use it.
    teacher,
    packagedAt: new Date().toISOString(),
  };
}

async function handleDownload(uid: string, body: { deviceId?: string }) {
  const deviceId = String(body.deviceId || "").slice(0, 100);
  if (!deviceId) return json({ error: "Missing device ID." }, 400);


  // Authorisation: look up the verified Firebase UID in our own users table.
// verifyFirebase only proves WHO the caller is; this decides whether
// they're ALLOWED to download the offline screener.
// `admin` is the service-role client, so this bypasses RLS and must only
// ever be queried with the UID we verified above, never client input.

  const { data: user, error: userErr } = await admin
    .from("users").select("id, name, email, role, is_verified").eq("id", uid).maybeSingle();
  if (userErr) throw userErr;


  // Role check: the offline screener is restricted to educators.
// A missing user row, or a null role, fails the check (`?? ""`),
// so unknown accounts are denied by default.
  if (!user || !ALLOWED_ROLES.includes(user.role ?? "")) {
    return json({ error: "The offline screener is only available to educators." }, 403);
  }

  // Verification check: an educator must also have been approved
// (is_verified) before they can get an offline package.
  if (!user.is_verified) {
    return json({ error: "Your account hasn't been approved yet, so the offline screener isn't available." }, 403);
  }

  const examiner = user.name || user.email || "Educator";
  const screener = await buildScreener(uid, { email: (user.email || "").toLowerCase(), name: examiner });

  // Generate a brand-new AES-256-GCM key for this package. A fresh key per
// issue means one leaked key only exposes one package.
// `true` makes the key extractable, so it can be exported later and
// delivered to the client (a non-extractable key couldn't be sent).


  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  
  // Random 96-bit (12-byte) IV/nonce, the size recommended for GCM.
// It must be unique for every encryption under the same key. It isn't
// secret, but the client needs it to decrypt, so it ships with the package.
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Serialise the screener to JSON, convert it to bytes, and encrypt it.
// AES-GCM is authenticated encryption: the output includes an auth tag,
// so any tampering with the ciphertext makes decryption fail instead of
// silently returning corrupted data.
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(screener)),
  );
  const rawKey = await crypto.subtle.exportKey("raw", key);

  // Licence expiry: now + LICENCE_DAYS, converted to milliseconds
// (86,400,000 ms per day) and stored as an ISO-8601 string so it's easy
// to store, send, and compare on the client.

  const expiresAt = new Date(Date.now() + LICENCE_DAYS * 86_400_000).toISOString();

  const { data: licence, error: licErr } = await admin
    .from("offline_licences")
    .insert({ user_id: uid, examiner, device_id: deviceId, expires_at: expiresAt })
    .select("id, examiner, expires_at")
    .single();
  if (licErr) throw licErr;

  return json({
    key: toB64(rawKey),
    payload: toB64(cipher),
    iv: toB64(iv),
    // userId lets the app refuse to open this licence for anyone else signed in on the device
    licence: { id: licence.id, userId: uid, examiner: licence.examiner, expiresAt: licence.expires_at },
  });
} 

async function handleStatus(uid: string, body: { licenceId?: string; markSynced?: boolean }) {
  if (!body.licenceId) return json({ error: "Missing licence ID." }, 400);

  const { data: licence, error } = await admin
    .from("offline_licences").select("id, revoked").eq("id", body.licenceId).eq("user_id", uid).maybeSingle();
  if (error) throw error;

  // A licence that no longer exists counts as cancelled. The app only wipes
  // the device once every captured result has uploaded, so nothing is lost.
  if (!licence) return json({ revoked: true });

  if (body.markSynced) {
    await admin.from("offline_licences").update({ last_synced_at: new Date().toISOString() }).eq("id", licence.id);
  }
  return json({ revoked: licence.revoked });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  let uid: string;
  try {
    uid = await verifyFirebase(req);
  } catch {
    return json({ error: "Please sign in again to use the offline screener." }, 401);
  }


  // Main request router for issue-offline-package. By this point the caller
// has already been authenticated, so `uid` is the verified Firebase UID.
// Wrapping the whole thing in one try/catch means any unexpected failure
// (database, encryption, a bug in a handler) ends in a single place
// instead of crashing the function with an unhelpful error.

  try {

      // Parse the JSON body. If it's missing or malformed, .catch() swaps in
  // an empty object so the code below can still read `body.action`
  // without throwing.

    const body = await req.json().catch(() => ({}));

    // "status" request: the app asks about its existing offline package
  // (for example, whether the licence is still valid) without issuing a
  // new one.

    if (body.action === "status") return await handleStatus(uid, body);

    // Anything else is treated as a download request: check the user is
  // allowed, then build and return a fresh encrypted package.
  // `return await` (not just `return`) matters here: it makes a rejected
  // promise from the handler land in the catch below, instead of
  // escaping it.

    return await handleDownload(uid, body);
  } catch (e) {

    // Log the real cause on the server, prefixed with the function name so
  // the Supabase logs show where the failure came from. The error object
  // goes to the logs only and is never sent to the client.

    console.error("issue-offline-package:", e);

    // Send the client a generic, friendly message with a 500 status. This
  // avoids leaking internal details (stack traces, table names) while
  // still telling the user what to do next.
  
    return json({ error: "Something went wrong preparing the offline screener. Try again in a minute." }, 500);
  }
});