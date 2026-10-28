// @ts-nocheck
// supabase/functions/translator-chat/index.ts
//
// The in-app translator chat bot (English / isiXhosa / Afrikaans), backed by
// Google's Gemini API on its FREE tier (no credit card; get a key at
// https://aistudio.google.com/apikey).
//
// One-time setup (its own key, separate from any other feature's Gemini key):
//   npx supabase secrets set Puzzle_Play_Translator_Gemini_API_Key=<your key>
//   npx supabase functions deploy translator-chat
// Optional:
//   npx supabase secrets set TRANSLATOR_GEMINI_MODEL=gemini-3.5-flash   (default below)
//
// Who can use it: only signed-in, admin-approved users. The browser sends the
// user's Firebase ID token; we verify it against Google's public keys here
// (verify_jwt is off in config.toml because Supabase's own check only knows
// Supabase-issued tokens), then confirm the account is approved.
// 
// Request:  POST { target: "en" | "xh" | "af", messages: [{ role: "user" | "assistant", text }] }
// Response: { reply: string, model: string }  or  { error: string }
//
// Privacy: on Gemini's free tier Google may use prompts to improve its
// products, so the bot is told never to ask for children's details, and the
// app shows the same warning next to the input box.

import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") ?? "puzzle-project-3b369";
const GEMINI_API_KEY = Deno.env.get("Puzzle_Play_Translator_Gemini_API_Key");
// First choice, then a lighter free model if the first is busy or unavailable.
const MODELS = [Deno.env.get("TRANSLATOR_GEMINI_MODEL") ?? "gemini-3.5-flash", "gemini-3.1-flash-lite"];
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const LANGUAGES: Record<string, string> = { en: "English", xh: "isiXhosa", af: "Afrikaans" };
const MAX_TURNS = 12;          // conversation history sent to the model
const MAX_CHARS = 4000;        // per message
const PER_MINUTE = 20;         // per user, per function instance

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const firebaseKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function systemPrompt(target: string) {
  const language = LANGUAGES[target];
  return `You are the translator for The Puzzle Project, a South African early-childhood
development programme. Your users are teachers, psychologists and administrators who
screen 5- and 6-year-olds in the Eastern Cape, mostly in English, isiXhosa and Afrikaans.

Your job:
- When the user gives you text to translate, translate it into ${language}. Reply with the
  translation only - no preamble - unless something needs a short note (see below).
- If the text is already in ${language}, translate it into English instead and say so in
  one short line.
- If the user asks a question (what a word means, how to say something to a child or a
  parent, which form is more polite), answer briefly in the language they wrote in, and
  give example wording in ${language}.
- Use natural, everyday South African usage that a parent or a young child would
  understand, not literal word-for-word translation. Keep the tone warm and simple when
  the text is meant for a child.
- For isiXhosa, use standard orthography and correct noun-class agreement. If a term has
  no common equivalent (for example a clinical or technical term), keep the English term
  and explain it in brackets.
- If you are unsure of a translation, say so in one short line rather than guessing
  silently. Never invent meanings.
- Only work with English, isiXhosa and Afrikaans. Politely decline other tasks that have
  nothing to do with translation or language.
- Never ask for, and never repeat back, a child's full name, address, ID number or
  medical details. If the user includes them, translate using a placeholder such as
  [child's name] and remind them in one short line not to share personal details here.`;
}

// Tiny per-instance rate limit: enough to stop one account looping the API
// and burning the shared free quota.
const recent = new Map<string, number[]>();
function rateLimited(uid: string) {
  const now = Date.now();
  const hits = (recent.get(uid) ?? []).filter((t) => now - t < 60_000);
  hits.push(now);
  recent.set(uid, hits);
  return hits.length > PER_MINUTE;
}

// Verifies the Firebase ID token sent by the browser and returns the
// caller's Firebase UID, or null if the request can't be trusted.
// Unlike verifyFirebase in issue-offline-package, this never throws:
// every failure becomes null, so the handler must turn null into a 401.

async function verifiedUser(req: Request) {

   // Pull the token out of "Authorization: Bearer <token>". The regex strips
  // the "Bearer " prefix case-insensitively; if the header is missing, the
  // `?? ""` fallback leaves an empty string instead of crashing on null.

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");

   // No token supplied, so there is nothing to verify

  if (!token) return null;
  try {


      // Check the token's signature against Google's public keys
    // (firebaseKeys). jwtVerify also rejects expired or not-yet-valid
    // tokens automatically.

    const { payload } = await jwtVerify(token, firebaseKeys, {

       // Must have been issued by this Firebase project's token service

      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,

      // Must be meant for this project, so tokens minted for other
      // Firebase apps are rejected here

      audience: FIREBASE_PROJECT_ID,
    });

     // `sub` is the Firebase UID. Only return it if it's a non-empty string;
    // anything else (missing, wrong type, empty) is treated as unusable.

    return typeof payload.sub === "string" && payload.sub ? payload.sub : null;
  } catch {


    // Any verification failure (bad signature, expired, wrong issuer or
    // audience, malformed token) ends up here. Returning null instead of
    // the error means callers learn nothing about why it failed, which
    // avoids leaking details to an attacker.
    
    return null;
  }
}

async function isApproved(uid: string) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return false;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(uid)}&select=is_verified`,
    { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } },
  );
  if (!res.ok) return false;
  const rows = await res.json();
  return rows?.[0]?.is_verified === true;
}

async function askGemini(target: string, messages: { role: string; text: string }[]) {
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt(target) }] },
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }],
    })),
    generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
  });

  let lastError = "";
  for (const model of MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY! }, body },
    );
    if (res.ok) {
      const data = await res.json();
      const reply = (data?.candidates?.[0]?.content?.parts ?? [])
        .map((p: { text?: string }) => p.text ?? "")
        .join("")
        .trim();
      if (reply) return { reply, model };
      lastError = data?.candidates?.[0]?.finishReason ?? "empty reply";
      continue;
    }
    lastError = `${res.status} ${(await res.text()).slice(0, 300)}`;
    // Busy, over the free quota, or model not available: try the next one.
    if (![404, 429, 500, 503].includes(res.status)) break;
  }
  throw new Error(lastError);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  if (!GEMINI_API_KEY) return json({ error: "The translator isn't set up yet (missing Puzzle_Play_Translator_Gemini_API_Key)." }, 500);

  const uid = await verifiedUser(req);
  if (!uid) return json({ error: "Please sign in again to use the translator." }, 401);
  if (!(await isApproved(uid))) return json({ error: "Your account needs to be approved first." }, 403);
  if (rateLimited(uid)) return json({ error: "Too many requests - please wait a minute and try again." }, 429);

  let target: string, messages: { role: string; text: string }[];
  try {
    const body = await req.json();
    target = String(body?.target ?? "");
    messages = (Array.isArray(body?.messages) ? body.messages : [])
      .filter((m: unknown) => m && typeof (m as { text?: unknown }).text === "string")
      .map((m: { role?: string; text: string }) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        text: m.text.slice(0, MAX_CHARS),
      }))
      .slice(-MAX_TURNS);
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  if (!LANGUAGES[target]) return json({ error: "Choose English, isiXhosa or Afrikaans." }, 400);
  if (!messages.length || messages[messages.length - 1].role !== "user" || !messages[messages.length - 1].text.trim()) {
    return json({ error: "Type something to translate." }, 400);
  }
  // Gemini expects the conversation to start with the user.
  while (messages.length && messages[0].role !== "user") messages.shift();

  try {
    return json(await askGemini(target, messages));
  } catch (err) {
    console.error("translator-chat: Gemini failed:", err);
    return json({ error: "The translator is busy right now. Please try again in a moment." }, 502);
  }
});
