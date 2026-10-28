// consentForms.js
//
// Shared upload + AI verification + save flow for consent forms, used by
// both ChildrenTable.js (Student Records' consent panel) and
// TeacherHome.js (the "Add New Student" flow, so a form can be attached
// right when a child is created). Keeping this in one place means there's
// exactly one path that writes consent_verified — never two components
// quietly disagreeing about what counts as "verified".
//
// The actual reading of the form (does it look filled in, even if
// handwritten) is meant to happen server-side in a "validate-consent-form"
// Edge Function that calls an AI vision model. NOTE: that function is not in
// supabase/functions in this repo. Until it is deployed every upload comes
// back "could not verify" and goes to an admin for manual review. When it is
// added it should use a Gemini key secret (like translator-chat, which reads
// Puzzle_Play_Translator_Gemini_API_Key) — NOT ANTHROPIC_API_KEY.

import { supabase } from "./supabaseClient";

export const CONSENT_BUCKET = "consent-forms";

// Mirrors the Edge Function's own REQUIRED_FIELDS list — kept here too so
// the UI can show "what this form needs" before anything is even uploaded
// (see the Download Consent Form template), not only after a rejection.
export const REQUIRED_CONSENT_FIELDS = [
  "Child's full name",
  "Child's date of birth or age",
  "School name",
  "Parent or guardian's full name",
  "Parent or guardian's signature",
  "Date signed",
  "The consent statement itself ticked, circled, initialled, or otherwise marked as agreed to",
];

// Uploads the file, asks the Edge Function to verify it, and saves the
// result onto the child's row — one call does the whole round trip so
// every caller behaves identically. Throws on upload failure (nothing to
// save yet); a verification failure is NOT thrown — it comes back as
// valid:false with notes explaining why, since "the AI check itself broke"
// should still let the teacher see what was uploaded and retry, rather
// than losing the file.
// Storage keys only allow a safe character set; spaces, #, ?, accents or emoji
// in a phone's file name would make the upload fail or the URL break.
export function safeStorageName(name) {
  const raw = String(name || "consent-form");
  const dot = raw.lastIndexOf(".");
  const ext = dot > 0 ? raw.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 8) : "";
  const base = (dot > 0 ? raw.slice(0, dot) : raw)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return (base || "consent-form") + ext;
}

export async function uploadAndVerifyConsentForm({ childId, file }) {
  if (!childId) throw new Error("A child record is required before a consent form can be attached.");
  if (!file) throw new Error("No file selected.");

  const path = `${childId}/${Date.now()}-${safeStorageName(file.name)}`;
  const { error: uploadErr } = await supabase.storage
    .from(CONSENT_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadErr) throw new Error("Could not upload the consent form — " + uploadErr.message);

  // NOTE: this is a public URL, so the "consent-forms" bucket has to be public
  // for the form to open (the dashboards use this URL as-is in links/iframes).
  // Moving to a private bucket + signed URLs means changing every place that
  // reads consent_form_url (ChildrenTable, TeacherHome, AdminHome).
  const { data: pub } = supabase.storage.from(CONSENT_BUCKET).getPublicUrl(path);
  const fileUrl = pub.publicUrl;

  // 1) Save the file onto the child's row. The database trigger
  //    (children_before_update) resets the verification to "not verified" for
  //    any new file, whatever we send — a teacher's browser cannot mark a form
  //    as verified.
  const nowIso = new Date().toISOString();
  const { error: saveErr } = await supabase
    .from("children")
    .update({
      consent_form_url: fileUrl,
      consent_file_name: file.name,
      consent_uploaded_at: nowIso, 
    })
    .eq("id", childId);
  if (saveErr) throw new Error("Uploaded, but could not save the record — " + saveErr.message);

  // 2) Ask the server to check the form. The validate-consent-form Edge
  //    Function writes the verdict (consent_verified / _verified_at /
  //    _verification_notes) itself with the service role, and returns it so we
  //    can show it straight away.
  let verification = { valid: false, missingFields: [], notes: "" };
  try {
    const { data, error: fnErr } = await supabase.functions.invoke("validate-consent-form", {
      body: { childId, fileUrl, fileType: file.type },
    });
    if (fnErr) throw fnErr;
    verification = {
      valid: Boolean(data?.valid),
      missingFields: Array.isArray(data?.missingFields) ? data.missingFields : [],
      notes: data?.notes || "",
    };
  } catch (err) {
    // The upload itself succeeded — don't lose that. The form simply stays
    // "not verified"; "service unavailable" is what lets the UI offer the
    // "send to an admin" fallback.
    verification = {
      valid: false,
      missingFields: [],
      notes: "Could not automatically verify this form (verification service unavailable" + (err?.message ? ": " + err.message : "") + "). A reviewer will need to check it manually before a screening can start.",
    };
  }

  return {
    url: fileUrl,
    fileName: file.name,
    fileType: file.type,
    uploadedAt: nowIso,
    verifiedAt: verification.valid ? nowIso : null,
    valid: verification.valid,
    missingFields: verification.missingFields,
    notes: verification.notes,
  };
}

// ── Manual review fallback ───────────────────────────────────────────
// When the AI check can't run because the service is overloaded / rate
// limited / unavailable ("high demand", 429, 503 ...), the teacher can send
// the already-uploaded form to the admin dashboard instead. The admin opens
// the file and accepts or rejects it.
// Only text that means the CHECKING SERVICE was busy/down matches; a form that
// was read and found incomplete never does.
const OVERLOAD_RE = /high demand|overload|too many requests|rate.?limit|quota (exceeded|exhausted)|service unavailable|temporarily unavailable|try again later|\b(429|502|503|504)\b/i;

export function isOverloadNote(notes) {
  return OVERLOAD_RE.test(notes || "");
}

export async function requestManualConsentReview({ childId, requestedBy }) {
  const { error } = await supabase
    .from("children")
    .update({
      consent_review_status: "pending",
      consent_review_requested_at: new Date().toISOString(),
      consent_review_requested_by: requestedBy || null,
      consent_reviewed_by: null,
      consent_reviewed_at: null,
      consent_review_note: null,
    })
    .eq("id", childId);
  if (error) throw new Error("Could not send the form for manual review — " + error.message);
}

export async function resolveManualConsentReview({ childId, approve, reviewer, note }) {
  const nowIso = new Date().toISOString();
  const patch = {
    consent_review_status: approve ? "approved" : "rejected",
    consent_reviewed_by: reviewer || null,
    consent_reviewed_at: nowIso,
    consent_review_note: note || null,
  };
  if (approve) {
    patch.consent_verified = true;
    patch.consent_verified_at = nowIso;
    patch.consent_verification_notes = "Manually approved by an admin" + (note ? " — " + note : "");
  } else {
    patch.consent_verified = false;
    patch.consent_verification_notes = "Rejected by an admin" + (note ? " — " + note : "") + ". Please upload a corrected form.";
  }
  const { error } = await supabase.from("children").update(patch).eq("id", childId);
  if (error) throw new Error(error.message);
  return patch;
}