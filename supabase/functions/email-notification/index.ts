// supabase/functions/email-notification/index.ts
//
// Emails every new row in the `messages` table to its recipient, so in-app
// notifications also arrive in the person's inbox. A database trigger
// (migration 020_email_notifications.sql) calls this function on each INSERT.
//
// Deploy with JWT verification OFF (the trigger authenticates with a shared
// secret header instead):
//   supabase functions deploy email-notification --no-verify-jwt
// Secrets:
//   supabase secrets set BREVO_API_KEY=...            (Brevo > SMTP & API > API keys)
//   supabase secrets set EMAIL_FROM=you@gmail.com     (a sender verified in Brevo)
//   supabase secrets set EMAIL_FROM_NAME="The Puzzle Project"   (optional)
//   supabase secrets set WEBHOOK_SECRET=...           (same value as in the migration)
//   supabase secrets set APP_URL=https://your-site    (optional, adds a button)

// @ts-ignore -- Deno remote import isn't resolved by a local TS toolchain
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
 
// @ts-ignore -- Deno global
const env = (k: string) => Deno.env.get(k) ?? "";

const SUBJECTS: Record<string, string> = {
  account_approved: "Your PuzzleBox account has been approved",
  screening_ready_for_review: "A screening is ready for your review",
  review_verdict: "A review verdict is ready",
  diagnosis_report: "A new screening report is available",
  consent_review: "A consent form needs a manual review",
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

function render(m: Record<string, any>) {
  const type = m.message_type || "notification";
  const subject = SUBJECTS[type] || "New notification from The Puzzle Project";
  const name = m.recipient_name || m.teacher_name || "";
  const lines: string[] = [];
  if (m.child_name) lines.push(`<b>Child:</b> ${esc(m.child_name)}`);
  if (m.school) lines.push(`<b>School:</b> ${esc(m.school)}`);
  if (m.sent_by) lines.push(`<b>From:</b> ${esc(m.sent_by)}`);
  const body = esc(m.diagnosis || "You have a new notification.").replace(/\n/g, "<br>");
  const appUrl = env("APP_URL");
  const html = `<!doctype html><html><body style="margin:0;background:#f4f2fb;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#fff;border-radius:14px;padding:28px;border:1px solid #e6e2f3">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#1d8f7f;font-weight:700">The Puzzle Project</p>
    <h2 style="margin:0 0 16px;font-size:20px">${esc(subject)}</h2>
    ${name ? `<p style="margin:0 0 12px">Hi ${esc(name)},</p>` : ""}
    <p style="margin:0 0 16px;line-height:1.6">${body}</p>
    ${lines.length ? `<p style="margin:0 0 16px;line-height:1.7;font-size:14px;color:#44445a">${lines.join("<br>")}</p>` : ""}
    ${appUrl ? `<a href="${esc(appUrl)}" style="display:inline-block;background:#1d8f7f;color:#fff;text-decoration:none;padding:11px 20px;border-radius:999px;font-weight:700;font-size:14px">Open the app</a>` : ""}
  </div>
  <p style="text-align:center;font-size:12px;color:#8a88a0;margin-top:14px">You're receiving this because you have an account on The Puzzle Project.</p>
</div></body></html>`;
  const text = `${subject}\n\n${m.diagnosis || ""}\n${appUrl ? "\nOpen the app: " + appUrl : ""}`;
  return { subject, html, text };
}

serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Authenticate the caller with a shared secret. This function is called by
// a database trigger (not a signed-in user), so there is no Firebase token
// to verify. Instead, the trigger sends a secret header that only the
// database and this function know.

// Read the expected secret from the function's environment variables
// (set as a Supabase secret, never hard-coded in the source).

  const secret = env("WEBHOOK_SECRET");

  // Reject the request unless the header matches the secret exactly.
// `!secret` makes this fail closed: if WEBHOOK_SECRET was never configured,
// every request is refused, rather than an undefined secret accidentally
// letting callers through. Returning 401 before doing anything else means
// no email is built or sent for an unauthorised caller.

  if (!secret || req.headers.get("x-webhook-secret") !== secret) return json({ error: "Unauthorized" }, 401);

  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const m = payload.record ?? payload;
  const to = m.recipient_email || m.teacher_email;
  if (!to) return json({ skipped: "no recipient email" });

  if (!env("BREVO_API_KEY") || !env("EMAIL_FROM")) {
    console.error("BREVO_API_KEY / EMAIL_FROM not set");
    return json({ error: "Email provider not configured" }, 500);
  }

  const { subject, html, text } = render(m);
  const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env("BREVO_API_KEY"), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { email: env("EMAIL_FROM"), name: env("EMAIL_FROM_NAME") || "The Puzzle Project" },
      to: [{ email: to, name: m.recipient_name || m.teacher_name || undefined }],
      subject, htmlContent: html, textContent: text,
    }),
  });
  if (!resp.ok) {
    const detail = await resp.text();
    console.error("Brevo error", resp.status, detail);
    return json({ error: "Email provider rejected the request", status: resp.status, detail }, 502);
  }
  return json({ sent: true, to });
});