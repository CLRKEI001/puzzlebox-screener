// mappers.js
//
// Postgres/Supabase convention is snake_case column names (child_name,
// follow_up_date, etc). Your existing components were written for
// Firestore's camelCase field names (childName, followUpDate, etc) and
// there's a lot of JSX already relying on those names.
//
// Rather than rewriting every JSX reference across 4 components, these
// helper functions convert Postgres rows -> camelCase objects when READING
// from Supabase, and camelCase state -> snake_case payloads when WRITING
// to Supabase. This keeps all your existing component render logic
// untouched — only the data-fetching/saving code at the top of each
// component needs to change.

// children.name holds the child's STUDENT NUMBER (e.g. FB-5-0042) — real
// names live in child_identities, which only the child's own teacher and
// psychologists can read (supabase/database/01 + 04). Rows read from the
// `children_named` view carry that real name as `real_name`; for admins it
// is null, so `name` falls back to the student number.
export function mapChildRow(r) {
  return {
    id: r.id,        // Unique user identifier

    // Use the child's real name if recorded; otherwise fall back to the
    // stored name (which may be an anonymised/pseudonymous label)
    name: r.real_name || r.name,    // User's full name

    // Use the student number if present; otherwise fall back to name so
    // the child can still be identified in lists and reports
    studentNumber: r.student_number || r.name,
    dataSource: r.data_source, // "app" | "pilot" | "demo" (mock data for testing)
    school: r.school,
    province: r.province,
    age: r.age,
    gender: r.gender,
    language: r.language,
    cognitive: r.cognitive,
    motor: r.motor,
    language_score: r.language_score, // already snake_case in the original Firestore data too
    social: r.social,
    emotion: r.emotion,
    moral: r.moral,
    total: r.total,
    status: r.status,
    flagged: r.flagged,
    referred: r.referred,
    resolved: r.resolved,
    date: r.date,
    examiner: r.examiner,
    teacherEmail: r.teacher_email,
    teacherUid: r.teacher_uid,
    stage: r.stage,
    consentFormUrl: r.consent_form_url,
    consentFileName: r.consent_file_name,
    consentUploadedAt: r.consent_uploaded_at,
    consentVerified: r.consent_verified,
    consentVerificationNotes: r.consent_verification_notes,
    consentVerifiedAt: r.consent_verified_at,
    consentReviewStatus: r.consent_review_status,
    consentReviewRequestedAt: r.consent_review_requested_at,
    consentReviewRequestedBy: r.consent_review_requested_by,
    consentReviewedBy: r.consent_reviewed_by,
    consentReviewedAt: r.consent_reviewed_at,
    consentReviewNote: r.consent_review_note,
    createdAt: r.created_at,
  };
}
export function mapPuzzleboxScreeningRow(r) {
  return {
    id: r.id,
    childId: r.child_id,
    childName: r.child_name,
    school: r.school,
    childAge: r.child_age,
    teacherEmail: r.teacher_email,
    teacherName: r.teacher_name,
    contentVersion: r.content_version,
    contentSnapshot: r.content_snapshot,
    status: r.status,
    responses: r.responses,
    puzzleTimeSeconds: r.puzzle_time_seconds,
    puzzleOverTime: r.puzzle_over_time,
    totalTimeSeconds: r.total_time_seconds,
    sectionTimes: r.section_times,
    observations: r.observations,
    rawScore: r.raw_score,
    interpretationBand: r.interpretation_band,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    reviewedAt: r.reviewed_at,
    reviewedBy: r.reviewed_by,
    reviewVerdict: r.review_verdict,
    reviewNotes: r.review_notes,
    sharedWith: r.shared_with,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapSessionRow(r) {
  return {
    id: r.id,
    childId: r.child_id,
    childName: r.child_name,
    school: r.school,
    age: r.age,
    language: r.language,
    score: r.score,
    date: r.date,
    examiner: r.examiner,
    status: r.status,
    stage: r.stage,
    followUpStage: r.follow_up_stage,
    cognitive: r.cognitive,
    motor: r.motor,
    language_score: r.language_score,
    social: r.social,
    emotion: r.emotion,
    moral: r.moral,
    createdAt: r.created_at,
  };
}

export function mapFollowUpRow(r) {
  return {
    docId: r.id,        // kept as "docId" so existing ChildrenTable.js logic (existingFollowUp?.docId) needs no changes
    childId: r.child_id,
    childName: r.child_name,
    school: r.school,
    followUpDate: r.follow_up_date,
    followUpPsych: r.follow_up_psych,
    followUpReason: r.follow_up_reason,
    followUpType: r.follow_up_type,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Indexes mapped follow-ups (mapFollowUpRow output) so a child's follow-up is
// found by child_id — the only key that is the same for every viewer. `byName`
// is a backwards-compatible fallback for older rows that have no child_id
// (their child_name holds the student number or, for older psychologist
// saves, the real name). When a child has several follow-ups the most
// recently updated one wins, whatever order the rows arrive in.
export function indexFollowUps(list) {
  const stamp = (f) => String(f.updatedAt || f.createdAt || "");
  const byId = {};
  const byName = {};
  [...(list || [])]
    .sort((a, b) => stamp(a).localeCompare(stamp(b)))
    .forEach((f) => {
      if (f.childId) byId[f.childId] = f;
      if (f.childName) byName[f.childName] = f;
    });
  return { byId, byName };
}

// Look a child up in an indexFollowUps() result.
export function findFollowUp(index, child) {
  if (!index || !child) return null;
  const id = child.id || child.childId;
  return (
    (id && index.byId[id]) ||
    (child.studentNumber && index.byName[child.studentNumber]) ||
    (child.name && index.byName[child.name]) ||
    (child.childName && index.byName[child.childName]) ||
    null
  );
}

export function mapMessageRow(r) {
  return {
    id: r.id,
    childId: r.child_id,
    childName: r.child_name,
    childScore: r.child_score,
    childStatus: r.child_status,
    school: r.school,
    teacherEmail: r.teacher_email,
    teacherName: r.teacher_name,
    diagnosis: r.diagnosis,
    language: r.language,
    domains: r.domains,
    sentBy: r.sent_by,
    sentAt: r.sent_at,
    screeningId: r.screening_id,
    recipientRole: r.recipient_role,
    recipientEmail: r.recipient_email,
    recipientName: r.recipient_name,
    messageType: r.message_type,
    readAt: r.read_at,
  };
}

export function mapUserRow(r) {
  return {
    id: r.id,                // Unique user identifier    // Firebase Auth UID
    name: r.name,       // User's full name
    email: r.email,       // Login/contact email address
    role: r.role,        // Access level (e.g. admin, psychologist, staff)
    staffNumber: r.staff_number,          // Staff ID (snake_case DB column -> camelCase)
    isVerified: r.is_verified,           // Whether the account has been verified/approved
    createdAt: r.created_at,            // Timestamp of account creation
  };
}

export function mapPurchaseRequestRow(r) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    organisation: r.organisation,
    phone: r.phone,
    numberOfScreeners: r.number_of_screeners,
    message: r.message,
    status: r.status,
    productNumber: r.product_number,
    adminNotes: r.admin_notes,
    fulfilledBy: r.fulfilled_by,
    fulfilledAt: r.fulfilled_at,
    createdAt: r.created_at,
  };
} 

export function mapTrainingCertificateRow(r) {
  return {
    userId: r.user_id,
    userEmail: r.user_email,
    userName: r.user_name,
    status: r.status, // "pending" | "approved"
    requestedAt: r.requested_at,
    issuedAt: r.issued_at,
    reviewedBy: r.reviewed_by,
    reviewedAt: r.reviewed_at,
  };
}