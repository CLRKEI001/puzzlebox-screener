// PuzzleBoxScreener.js — Phase 2 of the PuzzleBox Screener feature
// (see feature/puzzlebox-screener branch).
//
// Implements: teacher entry point, child search/select + confirm, the
// digital screening form itself (content-driven from
// src/data/puzzleBoxContent.v1.js), back/forward navigation without losing
// data, and autosave to Supabase as the teacher progresses.
//
// Deliberately NOT in this file yet (later phases, per the requirements doc):
//   - Phase 3: the live puzzle timer / automatic "Over Time" flag. Item 1
//     and item 19 currently take a manually-entered time so the form is
//     still usable end-to-end; PuzzleTimer.js will replace the manual
//     entry for the puzzle section without changing the content model.
//   - Phase 4: psychologist notification on submit.
//   - Phase 5: Admin Content Management (this already reads its content
//     from a single data-driven object, so swapping that object for a
//     Supabase-backed one later shouldn't require touching this file).

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Doodle from "../shared/Doodle";
import { supabase } from "../../services/supabaseClient";
import { useScreenerContent, scoreFromAgeTable } from "../../hooks/useScreenerContent";
import { mapChildRow } from "../../utils/mappers";
import { saveDraft, getDraft, deleteDraft, saveOfflineSession } from "../../offline/offlineVault";
import { SinglePuzzlePiece } from "../shared/puzzlePiece";
import "./PuzzleBoxScreener.css";

// Cycles each child's avatar through the app's own accent palette (rather
// than one flat color for every row), keyed off the name so it's stable
// across re-renders/searches instead of random.
const AVATAR_COLORS = ["#009B8D", "#E8175D", "#F26522", "#6B2F8A"];
function avatarColorFor(name) {
  const s = name || "?";
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// Puzzle-piece-shaped avatar (instead of a plain circle) carrying the
// child's initial — a small callback to the PuzzleBox mark used elsewhere.
function ChildAvatar({ name, size = 40 }) {
  const color = avatarColorFor(name);
  return (
    <div className="pbs-avatar-wrap" style={{ width: size, height: size }}>
      <SinglePuzzlePiece fill={color} className="pbs-avatar-piece" />
      <span className="pbs-avatar-letter" style={{ fontSize: size * 0.4 }}>
        {(name || "?").charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

const T = {
  en: {
    title: "PuzzleBox Screener",
    selectChild: "Select a Child",
    searchPlaceholder: "Search by child name or school...",
    noChildren: "No children found",
    noChildrenSub: "Try a different search, or add the child on the Children page first.",
    resumeBadge: "In progress",
    confirmChild: "Confirm Child",
    confirmSub: "Make sure this is the right child before you begin.",
    name: "Name", school: "School", age: "Age", language: "Language",
    goBack: "← Choose a different child",
    startScreening: "Start Screening",
    resumeScreening: "Resume Screening",
    back: "Back", next: "Next", submit: "Submit Screening",
    saving: "Saving…", saved: "Saved",
    sectionOf: "Section", of: "of",
    observations: "Observations / Notes",
    observationsPlaceholder: "Anything else worth noting about this screening...",
    submitConfirmTitle: "Submit this screening?",
    submitConfirmBody: "questions are still unanswered. You can still submit — the psychologist will see which items were skipped.",
    submitConfirmBodyComplete: "All questions have been answered.",
    cancel: "Cancel",
    confirmSubmit: "Yes, Submit",
    submitted: "Screening Submitted",
    submittedSub: "has been saved to",
    submittedBackHome: "Back to My Home",
    submittedOffline: "is saved on this device. It will upload and go to the psychologist for review automatically the next time you're online.",
    recordTime: "Record Time",
    min: "min", sec: "sec",
    computedScore: "Score",
    exit: "Exit",
    exitConfirm: "Leave the screening? Your progress has already been saved and you can resume later.",
    exitConfirmOffline: "Leave the screening? Your progress is saved on this device and you can resume later, even without signal.",
    notAgeSupported: "This screener's age-based scoring covers 5 and 6 year olds — a raw time/count is still recorded for this child, but no 0–2 score can be derived automatically.",
    checklistCount: "checked",
    consentMissingTitle: "No consent form on file",
    consentMissingBody: "A signed parent/guardian consent form is required before this child can be screened. Go to My Class, open this child's record, and upload one — you can also download a blank form to send home.",
    consentIncompleteTitle: "Consent form incomplete",
    consentVerifiedBadge: "Consent form on file ✓",
  },
};

// Collects every change made within `delay` ms and saves them together.
// (It used to keep only the last call, so e.g. the puzzle timer's save
// cancelled the answer saves made in the same moment.)
function useDebouncedSave(fn, delay = 700) {
  const timer = useRef(null);
  const pending = useRef({});
  const savedFn = useRef(fn);
  savedFn.current = fn;
  return useCallback((patch) => {
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const merged = pending.current;
      pending.current = {};
      savedFn.current(merged);
    }, delay);
  }, [delay]);
}

// Section times are accumulated as fractional seconds; store whole seconds.
function roundTimes(obj) {
  return Object.fromEntries(Object.entries(obj || {}).map(([k, v]) => [k, Math.round(v)]));
}

// Sums up every question's derived score into a raw total.
function computeRawScore(content, responses) {
  let total = 0;
  for (const section of content.sections) {
    for (const q of section.questions) {
      const r = responses[q.id];
      if (r && typeof r.score === "number") total += r.score;
    }
  }
  return total;
}

function computeBand(interpretationBands, age, rawScore) {
  const rows = interpretationBands[age];
  if (!rows) return null;
  for (const row of rows) {
    const min = row.min ?? -Infinity;
    const max = row.max ?? Infinity;
    if (rawScore >= min && rawScore <= max) return row;
  }
  return null;
}

// The puzzle itself is meant to be completed within 10 minutes — past that
// the screening record should carry an "Over Time" flag the psychologist
// can see (puzzlebox_screenings.puzzle_time_seconds / puzzle_over_time,
// migration 002 — present in the schema from the start but never actually
// written to until now).
const PUZZLE_TIME_LIMIT_SECONDS = 600;

function formatTimer(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// `offline` = { screener, licence } from OfflineScreenerShell. When set, the
// screener works entirely from the device: children and content come from the
// encrypted offline package, progress autosaves to the device, and the
// finished screening is queued to upload (with the psychologist's
// notification) the next time there's signal. Everything else — questions,
// scoring, timer, layout — is identical to online.
export default function PuzzleBoxScreener({ user, profile, onExit, initialChild, offline }) {
  const t = T.en;
  const isOffline = !!offline;
  // Content — sections, questions, scoring tables — is admin-managed via
  // Admin → Screener Content (see supabase/migrations/007_screener_content.sql).
  // Falls back to the original hardcoded content if Supabase can't be
  // reached, so a screening in progress never breaks because of that.
  const { content, interpretationBands, loading: contentLoading } = useScreenerContent(offline?.screener);

  // When a caller (e.g. the "Screen" button on a specific child's row)
  // hands us a child up front, skip straight past the search/select step.
  const [view, setView] = useState(initialChild ? "confirm" : "select"); // select | confirm | form | submitted
  const [search, setSearch] = useState("");
  const [children, setChildren] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [selectedChild, setSelectedChild] = useState(initialChild || null);
  const [existingSession, setExistingSession] = useState(null);
  // Past (non in-progress) screenings for the selected child — shown on the
  // confirm step so re-screening a child is an informed choice, not a
  // surprise. The DB has always allowed multiple screenings per child
  // (no unique constraint on child_id); this just surfaces that history
  // instead of the teacher re-screening blind.
  const [priorScreenings, setPriorScreenings] = useState([]);

  const [session, setSession] = useState(null); // the puzzlebox_screenings row
  const [responses, setResponses] = useState({});
  const [observations, setObservations] = useState("");
  const [sectionIndex, setSectionIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState("saved"); // saving | saved | error
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [error, setError] = useState("");

  // ── Live puzzle timer (section 1 only — see isPuzzleTimerSection) ───
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMs, setTimerMs] = useState(0);
  const timerIntervalRef = useRef(null);

  // ── Continuous overall session timer ─────────────────────────────
  // Separate from the per-section timer above: this one never resets
  // between sections, so it answers "how long did the whole screening
  // take" — see total_time_seconds (migration 025).
  const [sessionTimerMs, setSessionTimerMs] = useState(0);
  const sessionTimerIntervalRef = useRef(null);

  // Refs used by the timers and submit (see the timer section below).
  const timerMsRef = useRef(0);               // always the latest timerMs, for cleanup callbacks
  const lastSectionTickRef = useRef(0);       // wall-clock time of the section timer's last tick
  const lastTimeBucketRef = useRef(-1);       // which 10-second slot was last SAVED for the section timer
  const lastSessionBucketRef = useRef(-1);    // same, for the whole-session timer
  const submittedRef = useRef(false);         // true once Submit starts: no more autosaves
  const submittingRef = useRef(false);        // blocks a double-click on Submit
  const submitOkRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Per-section elapsed time ──────────────────────────────────────
  // Most questions are plain 0-2 observational scores with no time of
  // their own — this is how the review screen can still show "how long
  // did section N take" without inventing a time for every question.
  // Keyed by section id, accumulates (never resets) across revisits.
  const [sectionTimes, setSectionTimes] = useState({});

  const offlineTeacher = offline?.screener?.teacher;
  const teacherEmail = offlineTeacher?.email || user?.email || "";
  const teacherName = offlineTeacher?.name || profile?.name || user?.email?.split("@")[0] || "Educator";

  // Offline: always the latest in-progress draft, so autosaves never write
  // an older copy over a newer one.
  const draftRef = useRef(null);

  // content is null while still loading from Supabase (see
  // useScreenerContent above) — sections/currentSection fall back to
  // empty/undefined until then, and every place that reads them below
  // is guarded for that (either optional-chained, or the render itself
  // shows a loading state before touching them).
  timerMsRef.current = timerMs;
  const sections = useMemo(() => content?.sections || [], [content]);
  const currentSection = sections[sectionIndex];
  // Any section with a time-scored question (section 1's puzzle, section 7's
  // fence sticks, and any added later) gets the timer wired to that
  // question; every other section still gets the timer, just running free.
  const timerQuestion = currentSection?.questions.find((q) => q.scoringType === "age_table") || null;

  // ── Child search ──────────────────────────────────────────────────
  useEffect(() => {
    if (view !== "select") return;
    let active = true;
    if (isOffline) {
      // This educator's consent-verified children, from the offline package.
      // They're children_named rows (same as the online query below), so
      // mapChildRow gives them exactly the same shape as online.
      const q = search.trim().toLowerCase();
      const all = offline.screener.children || [];
      const matches = q
        ? all.filter((c) =>
            [c.real_name, c.student_number, c.school].some((v) => (v || "").toLowerCase().includes(q)))
        : all;
      setChildren(matches.slice(0, 50).map(mapChildRow));
      setLoadingChildren(false);
      return () => { active = false; };
    }
    setLoadingChildren(true);
    const run = async () => {
      // Scoped to this teacher's own children (teacher_uid). The database
      // enforces the same rule, so this filter just keeps the intent clear.
      // Read from `children_named` so the teacher sees real names.
      let query = supabase
        .from("children_named")
        .select("*")
        .eq("teacher_uid", user?.uid || "")
        .order("real_name", { ascending: true })
        .limit(50);
      // Commas and brackets would break the filter syntax, so strip them.
      const term = search.trim().replace(/[,()*%]/g, " ").trim();
      if (term) {
        query = query.or(`real_name.ilike.%${term}%,student_number.ilike.%${term}%,school.ilike.%${term}%`);
      }
      const { data, error: qErr } = await query;
      if (!active) return;
      if (qErr) {
        setError("Could not load children: " + qErr.message);
        setChildren([]);
      } else {
        // Mapped to camelCase so selectedChild is shaped identically whether
        // it came from this search or was handed in as initialChild (which
        // TeacherHome.js already maps via mapChildRow) — consentVerified
        // and friends are read off selectedChild below either way.
        setChildren((data || []).map(mapChildRow));
      }
      setLoadingChildren(false);
    };
    const debounce = setTimeout(run, 250);
    return () => { active = false; clearTimeout(debounce); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, view, user?.uid]);

  // ── Deep link: caller handed us a specific child directly ───────────
  // Mirrors the lookup half of selectChild() below, just without the
  // "which child did they pick" step since that's already decided.
  useEffect(() => {
    if (!initialChild) return;
    let active = true;
    if (isOffline) {
      getDraft(initialChild.id).then((d) => { if (active) setExistingSession(d); });
      setPriorScreenings([]);
      return () => { active = false; };
    }
    (async () => {
      const { data } = await supabase
        .from("puzzlebox_screenings")
        .select("*")
        .eq("child_id", initialChild.id)
        .eq("status", "in_progress")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) setExistingSession(data || null);
    })();
    (async () => {
      const { data } = await supabase
        .from("puzzlebox_screenings")
        .select("id, status, completed_at, interpretation_band")
        .eq("child_id", initialChild.id)
        .neq("status", "in_progress")
        .order("completed_at", { ascending: false })
        .limit(5);
      if (active) setPriorScreenings(data || []);
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Selecting a child → check for an in-progress screening to resume ──
  const selectChild = async (child) => {
    setSelectedChild(child);
    setError("");
    if (isOffline) {
      // Past screenings live in Supabase, so offline only a half-done one
      // on this device can be shown.
      setExistingSession(await getDraft(child.id));
      setPriorScreenings([]);
      setView("confirm");
      return;
    }
    const { data } = await supabase
      .from("puzzlebox_screenings")
      .select("*")
      .eq("child_id", child.id)
      .eq("status", "in_progress")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setExistingSession(data || null);
    const { data: prior } = await supabase
      .from("puzzlebox_screenings")
      .select("id, status, completed_at, interpretation_band")
      .eq("child_id", child.id)
      .neq("status", "in_progress")
      .order("completed_at", { ascending: false })
      .limit(5);
    setPriorScreenings(prior || []);
    setView("confirm");
  };

  // ── Start (or resume) the screening session ──────────────────────────
  const beginScreening = async (resume) => {
    setError("");
    submittedRef.current = false;
    // Defense in depth — the confirm screen's button is already disabled
    // without a verified consent form, but a screening must never actually
    // start without one regardless of how this function gets called.
    if (!selectedChild?.consentVerified) {
      setError(t.consentMissingBody);
      return;
    }
    if (resume && existingSession) {
      draftRef.current = existingSession;
      setSession(existingSession);
      setResponses(existingSession.responses || {});
      setObservations(existingSession.observations || "");
      setSessionTimerMs((existingSession.total_time_seconds || 0) * 1000);
      setSectionTimes(existingSession.section_times || {});
      setView("form");
      return;
    }

    if (isOffline) {
      // Same fields the online insert below sets, kept on the device
      const draft = {
        id: crypto.randomUUID(),
        child_id: selectedChild.id,
        child_name: selectedChild.name,
        school: selectedChild.school,
        child_age: selectedChild.age,
        teacher_email: teacherEmail,
        teacher_name: teacherName,
        content_version: content?.version || "1.0",
        status: "in_progress",
        responses: {},
        observations: "",
        started_at: new Date().toISOString(),
      };
      try {
        await saveDraft(draft);
      } catch (e) {
        setError("Could not start the screening on this device: " + e.message);
        return;
      }
      draftRef.current = draft;
      setSession(draft);
      setResponses({});
      setObservations("");
      setSectionIndex(0);
      setView("form");
      return;
    }

    const { data, error: insertErr } = await supabase
      .from("puzzlebox_screenings")
      .insert({
        child_id: selectedChild.id,
        child_name: selectedChild.name,
        school: selectedChild.school,
        child_age: selectedChild.age,
        teacher_email: teacherEmail,
        teacher_name: teacherName,
        content_version: content?.version || "1.0",
        status: "in_progress",
        responses: {},
      })
      .select()
      .single();

    if (insertErr) {
      setError("Could not start the screening: " + insertErr.message);
      return;
    }
    setSession(data);
    setResponses({});
    setObservations("");
    setSectionIndex(0);
    setView("form");
  };

  // ── Autosave ──────────────────────────────────────────────────────
  const persist = useCallback(async (patch) => {
    if (!session?.id) return;
    // Once Submit has started, nothing may write to the screening any more
    // (a late autosave could undo the submit, patch a submitted screening,
    // or recreate an offline draft that was just deleted).
    if (submittedRef.current) return;
    setSaveStatus("saving");
    if (isOffline) {
      draftRef.current = { ...draftRef.current, ...patch };
      try {
        await saveDraft(draftRef.current);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
      return;
    }
    const { error: saveErr } = await supabase
      .from("puzzlebox_screenings")
      .update(patch)
      .eq("id", session.id);
    setSaveStatus(saveErr ? "error" : "saved");
  }, [session?.id, isOffline]);

  const debouncedPersist = useDebouncedSave(persist, 700);

  // `quiet` = update what's on screen but don't trigger a save (the timers use
  // this every second; they save once every 10 seconds instead).
  const updateResponse = (questionId, patch, quiet = false) => {
    setResponses((prev) => {
      const next = { ...prev, [questionId]: { ...prev[questionId], ...patch } };
      if (!quiet) debouncedPersist({ responses: next });
      return next;
    });
  };

  const updateObservations = (value) => {
    setObservations(value);
    debouncedPersist({ observations: value });
  };

  // ── Scoring helpers per question type ────────────────────────────
  const setBinary = (q, score) => updateResponse(q.id, { score });

  const setTimeValue = (q, minutes, seconds, quiet = false) => {
    // No negative times (or NaN): they would score as "fastest".
    const mins = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
    const secs = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const totalSeconds = mins * 60 + secs;
    const age = selectedChild?.age;
    const score = age && q.ageTable ? scoreFromAgeTable(q.ageTable, age, totalSeconds) : null;
    updateResponse(q.id, { rawValueSeconds: totalSeconds, score }, quiet);
  };

  const toggleChecklist = (q, option) => {
    const current = responses[q.id]?.checked || [];
    const next = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    const age = selectedChild?.age;
    const score = age && q.ageTable ? scoreFromAgeTable(q.ageTable, age, next.length) : null;
    updateResponse(q.id, { checked: next, score });
  };

  // ── Live puzzle timer ────────────────────────────────────────────
  // Resets whenever the teacher moves to a new section (loading any
  // previously recorded time, e.g. resuming a saved session, as the
  // starting point) and now auto-starts immediately instead of waiting
  // for a manual "Start" click every time — teachers were having to
  // remember to press Start on every single section. Pause/Reset are
  // still there for a genuine interruption.
  // Timing rules:
  //  • Time is measured from the CLOCK (Date.now), not by counting ticks, so a
  //    locked or backgrounded tablet doesn't undercount the times that decide
  //    the score.
  //  • A section's timer auto-starts the FIRST time it opens. Coming back to a
  //    section that already has a recorded time shows that time, paused —
  //    just looking at it again no longer adds time (it used to turn 20s
  //    into 35s and flip the score). Press Resume to add more.
  //  • Nothing is scored until some time has actually elapsed (a 0-second
  //    puzzle used to be scored as "Passed Confidently").
  //  • What's on screen updates every second; what's SAVED updates every 10
  //    seconds, when you pause, and when you leave the section.
  const runSectionInterval = (sectionId) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    lastSectionTickRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const dt = Math.max(0, now - lastSectionTickRef.current);
      lastSectionTickRef.current = now;
      setTimerMs((ms) => ms + dt);
      if (sectionId) {
        setSectionTimes((prev) => ({ ...prev, [sectionId]: (prev[sectionId] || 0) + dt / 1000 }));
      }
    }, 1000);
  };

  // Writes the elapsed time into the page's questions (the time-scored one gets
  // rawValueSeconds + score; the others a plain timeSeconds).
  const commitTimes = (ms, quiet) => {
    const totalSeconds = Math.floor(ms / 1000);
    if (totalSeconds <= 0) return;
    if (timerQuestion) setTimeValue(timerQuestion, Math.floor(totalSeconds / 60), totalSeconds % 60, quiet);
    currentSection?.questions.forEach((q) => {
      if (q.id === timerQuestion?.id) return;
      updateResponse(q.id, { timeSeconds: totalSeconds }, quiet);
    });
    // Only the puzzle section drives puzzle_time_seconds / puzzle_over_time.
    if (!quiet && currentSection?.isPuzzleTimerSection) {
      debouncedPersist({
        puzzle_time_seconds: totalSeconds,
        puzzle_over_time: totalSeconds > PUZZLE_TIME_LIMIT_SECONDS,
      });
    }
  };

  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (view !== "form") {
      // Left the form (e.g. submitted): stop the timer for good.
      setTimerRunning(false);
      return;
    }
    const refQ = timerQuestion || currentSection?.questions?.[0];
    const saved = refQ
      ? timerQuestion
        ? responses[refQ.id]?.rawValueSeconds
        : responses[refQ.id]?.timeSeconds
      : null;
    const hasSaved = typeof saved === "number" && saved > 0;
    lastTimeBucketRef.current = -1;
    setTimerMs(hasSaved ? saved * 1000 : 0);
    const sectionId = currentSection?.id;
    if (hasSaved) {
      setTimerRunning(false); // revisit: show the recorded time, don't keep adding to it
    } else {
      setTimerRunning(true);
      runSectionInterval(sectionId);
    }
    // Leaving the section (or the form): save the time reached so far.
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (!submittedRef.current) commitTimes(timerMsRef.current, false);
    };
    // currentSection?.id is included (not just sectionIndex) because content
    // loads asynchronously (useScreenerContent) — see the note in git history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIndex, view, currentSection?.id]);

  // ── Continuous overall session timer ─────────────────────────────
  // Starts the moment the screening form opens (new or resumed) and keeps
  // going across section changes. Clock-based, and stopped when the form closes.
  useEffect(() => {
    if (view !== "form" || !session?.id) return;
    let last = Date.now();
    sessionTimerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const dt = Math.max(0, now - last);
      last = now;
      setSessionTimerMs((ms) => ms + dt);
    }, 1000);
    return () => {
      if (sessionTimerIntervalRef.current) clearInterval(sessionTimerIntervalRef.current);
      sessionTimerIntervalRef.current = null;
    };
  }, [view, session?.id]);

  // Saves the running total and the per-section breakdown together, but only
  // once per 10 seconds (it used to fire a full save every second).
  useEffect(() => {
    if (view !== "form" || !session?.id) return;
    const bucket = Math.floor(sessionTimerMs / 10000);
    if (bucket === lastSessionBucketRef.current) return;
    lastSessionBucketRef.current = bucket;
    debouncedPersist({ total_time_seconds: Math.floor(sessionTimerMs / 1000), section_times: roundTimes(sectionTimes) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionTimerMs]);

  // Every tick refreshes what's on screen; only every 10th second (or a pause)
  // is actually saved.
  useEffect(() => {
    if (view !== "form") return;
    const totalSeconds = Math.floor(timerMs / 1000);
    if (totalSeconds <= 0) return;
    let quiet = false;
    if (timerRunning) {
      const bucket = Math.floor(totalSeconds / 10);
      quiet = bucket === lastTimeBucketRef.current;
      lastTimeBucketRef.current = bucket;
    }
    commitTimes(timerMs, quiet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerMs, timerRunning]);

  const isPuzzleOverTime =
    !!currentSection?.isPuzzleTimerSection && Math.floor(timerMs / 1000) > PUZZLE_TIME_LIMIT_SECONDS;

  const startTimer = () => {
    if (timerRunning) return;
    setTimerRunning(true);
    runSectionInterval(currentSection?.id);
  };

  const pauseTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
    setTimerRunning(false);
  };

  const resetTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
    setTimerRunning(false);
    setTimerMs(0);
    // Clear the recorded time AND its score (0 seconds must not score as a pass).
    if (timerQuestion) updateResponse(timerQuestion.id, { rawValueSeconds: null, score: null });
    currentSection?.questions.forEach((q) => {
      if (q.id === timerQuestion?.id) return;
      updateResponse(q.id, { timeSeconds: null });
    });
  };

  // ── Progress ──────────────────────────────────────────────────────
  const allQuestions = useMemo(() => sections.flatMap((s) => s.questions), [sections]);
  const answeredCount = allQuestions.filter((q) => {
    const r = responses[q.id];
    return r && (typeof r.score === "number" || (r.checked && r.checked.length > 0));
  }).length;
  const unansweredCount = allQuestions.length - answeredCount;

  const sectionAnswered = (section) =>
    section.questions.filter((q) => responses[q.id] && typeof responses[q.id].score === "number").length;
 
  // ── Submit ────────────────────────────────────────────────────────
  // Guarded wrapper: ignores a second click while a submit is running, and
  // blocks autosaves from the moment Submit starts.
  const doSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    submittedRef.current = true;
    submitOkRef.current = false;
    setSubmitting(true);
    setError("");
    try {
      await doSubmitInner();
    } finally {
      if (!submitOkRef.current) submittedRef.current = false; // failed: autosave may resume
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const doSubmitInner = async () => {
    const rawScore = computeRawScore(content, responses);
    // A partly finished screening must NOT get a result: skipped questions
    // count as 0, which would label it "Developmental Concerns". Without a
    // band it shows as "Not Scored" until it is finished.
    const band = unansweredCount > 0 ? null : computeBand(interpretationBands, selectedChild?.age, rawScore);
    const puzzleTime = currentSection?.isPuzzleTimerSection
      ? { puzzle_time_seconds: Math.floor(timerMs / 1000), puzzle_over_time: Math.floor(timerMs / 1000) > PUZZLE_TIME_LIMIT_SECONDS }
      : {};

    if (isOffline) {
      // Exactly what the online submit writes, plus the message it sends,
      // stored encrypted until there's signal (see offlineVault.syncOfflineSessions)
      const record = {
        ...draftRef.current,
        responses,
        observations,
        status: "awaiting_review",
        completed_at: new Date().toISOString(),
        raw_score: rawScore,
        interpretation_band: band?.band || null,
        content_snapshot: content,
        total_time_seconds: Math.floor(sessionTimerMs / 1000),
        section_times: roundTimes(sectionTimes),
        ...puzzleTime,
        // Applied after upload, same as the online submit: move the child's
        // Stage badge to "Processing"
        _childStage: { id: selectedChild.id, stage: "stage3" },
        _notify: {
          child_id: selectedChild.id,
          child_name: selectedChild.name,
          child_score: rawScore,
          school: selectedChild.school,
          teacher_email: teacherEmail,
          teacher_name: teacherName,
          diagnosis:
            // Student number, not the name: psychologists only see student numbers.
            `${teacherName} finished a PuzzleBox screening for ${selectedChild.studentNumber || "a child"} at ${selectedChild.school || "their school"}.` +
            (band ? ` Result: ${band.label}.` : unansweredCount > 0 ? ` Incomplete: ${unansweredCount} question(s) were not answered, so no result was calculated.` : "") +
            " Open it to review and share the outcome.",
        },
      };
      try {
        await saveOfflineSession(record);
        await deleteDraft(selectedChild.id);
      } catch (e) {
        setError("Could not save the screening on this device: " + e.message);
        return;
      }
      setShowSubmitConfirm(false);
      submitOkRef.current = true;
      setView("submitted");
      return;
    }

    const { error: submitErr } = await supabase
      .from("puzzlebox_screenings")
      .update({
        responses,
        observations,
        status: "awaiting_review",
        completed_at: new Date().toISOString(),
        raw_score: rawScore,
        interpretation_band: band?.band || null,
        content_snapshot: content,
        total_time_seconds: Math.floor(sessionTimerMs / 1000),
        section_times: roundTimes(sectionTimes),
        ...puzzleTime,
      })
      .eq("id", session.id);

    if (submitErr) {
      setError("Could not submit the screening: " + submitErr.message);
      return;
    }

    // Move the child's Stage badge (Student Records / Full Analytics
    // Dashboard) forward to "Processing" — it's a separate, manually-set
    // field on `children` left over from before PuzzleBox screenings got
    // their own table, and nothing was ever advancing it automatically.
    // Without this, a child who'd actually been screened (and even fully
    // reviewed by a psychologist) still showed "Not Started" there forever.
    // Non-fatal if it fails — the screening itself is already saved above.
    const { error: stageErr } = await supabase
      .from("children")
      .update({ stage: "stage3" })
      .eq("id", selectedChild.id);
    if (stageErr) console.error("Could not update the child's stage:", stageErr.message);

    // Let the psychologist know there's a screening waiting on them. If
    // this insert fails for some reason, the screening itself is already
    // safely saved above — don't block the teacher's flow on it.
    const { error: notifyErr } = await supabase.from("messages").insert({
      screening_id: session.id,
      child_id: selectedChild.id,
      child_name: selectedChild.name,
      child_score: rawScore,
      school: selectedChild.school,
      teacher_email: teacherEmail,
      teacher_name: teacherName,
      diagnosis:
        // Student number, not the name: psychologists only see student numbers.
        `${teacherName} finished a PuzzleBox screening for ${selectedChild.studentNumber || "a child"} at ${selectedChild.school || "their school"}.` +
        (band ? ` Result: ${band.label}.` : unansweredCount > 0 ? ` Incomplete: ${unansweredCount} question(s) were not answered, so no result was calculated.` : "") +
        " Open it to review and share the outcome.",
      sent_by: "Teacher",
      recipient_role: "psychologist",
      message_type: "screening_ready_for_review",
    });
    if (notifyErr) console.error("Could not notify the psychologist:", notifyErr.message);

    submitOkRef.current = true;
    setShowSubmitConfirm(false);
    setView("submitted");
  };

  // ── Question renderer ────────────────────────────────────────────
  const renderQuestion = (q) => {
    const r = responses[q.id] || {};
    return (
      <div className="pbs-question" key={q.id}>
        <div className="pbs-question-head">
          <div className="pbs-question-label">{q.label}</div>
          {q.id !== timerQuestion?.id && r.timeSeconds != null && (
            <span className="pbs-question-time" title="Time recorded from the page timer">
              <Doodle name="stopwatch" size={16} inline /> {formatTimer(r.timeSeconds * 1000)}
            </span>
          )}
          {saveStatusBadgeFor(q.id)}
        </div>
        {q.instruction && <div className="pbs-question-instruction">{q.instruction}</div>}
        {q.toPass && <div className="pbs-question-topass"><strong>To Pass:</strong> {q.toPass}</div>}

        {q.scoringType === "binary" && (
          <div className="pbs-score-row">
            {[0, 1].map((val) => (
              <button
                key={val}
                className={`pbs-score-btn ${r.score === val ? "active" : ""}`}
                onClick={() => setBinary(q, val)}
              >
                {val}
              </button>
            ))}
          </div>
        )}

        {q.scoringType === "scale3" && (
          <div className="pbs-score-row">
            {[0, 1, 2].map((val) => (
              <button
                key={val}
                className={`pbs-score-btn ${r.score === val ? "active" : ""}`}
                onClick={() => setBinary(q, val)}
              >
                {val}
              </button>
            ))}
          </div>
        )}

        {q.scoringType === "age_table" && (
          <div className="pbs-time-entry">
            <label className="pbs-time-label">{t.recordTime}:</label>
            <input
              type="number" min="0" className="pbs-time-input"
              value={r.rawValueSeconds != null ? Math.floor(r.rawValueSeconds / 60) : ""}
              placeholder="0"
              disabled={q.id === timerQuestion?.id && timerRunning}
              onChange={(e) => setTimeValue(q, Number(e.target.value), r.rawValueSeconds ? r.rawValueSeconds % 60 : 0)}
            />
            <span>{t.min}</span>
            <input
              type="number" min="0" max="59" className="pbs-time-input"
              value={r.rawValueSeconds != null ? r.rawValueSeconds % 60 : ""}
              placeholder="0"
              disabled={q.id === timerQuestion?.id && timerRunning}
              onChange={(e) => setTimeValue(q, r.rawValueSeconds ? Math.floor(r.rawValueSeconds / 60) : 0, Number(e.target.value))}
            />
            <span>{t.sec}</span>
            {q.id === timerQuestion?.id && (
              <span className="pbs-timer-sync-note">Synced with the puzzle timer →</span>
            )}
            {r.rawValueSeconds != null && (
              r.score != null
                ? <span className="pbs-computed-score">{t.computedScore}: {r.score}</span>
                : <span className="pbs-computed-score pbs-computed-score-warn">{t.notAgeSupported}</span>
            )}
            {q.needsConfirmation && (
              <div className="pbs-tbd-note">Scoring for going over the time limit is still being finalised by the psychologists — the time is recorded either way.</div>
            )}
          </div>
        )}

        {q.scoringType === "checklist" && (
          <div className="pbs-checklist">
            {q.checklistOptions.map((opt) => (
              <label key={opt} className="pbs-checklist-item">
                <input
                  type="checkbox"
                  checked={(r.checked || []).includes(opt)}
                  onChange={() => toggleChecklist(q, opt)}
                />
                {opt}
              </label>
            ))}
            <div className="pbs-checklist-count">
              {(r.checked || []).length} {t.checklistCount}
              {r.score != null && <span className="pbs-computed-score"> · {t.computedScore}: {r.score}</span>}
            </div>
          </div>
        )}
      </div>
    );
  };

  // small no-op placeholder kept for a future per-question save indicator
  const saveStatusBadgeFor = () => null;

  // ── Views ─────────────────────────────────────────────────────────

  if (view === "select") {
    return (
      <div className="pbs-shell">
        <div className="pbs-topbar">
          <div className="pbs-topbar-title">{t.title}</div>
          <button className="btn btn-ghost btn-sm" onClick={onExit}>{t.exit}</button>
        </div>
        <div className="pbs-body pbs-body-narrow">
          <SinglePuzzlePiece fill="#009B8D" opacity={0.08} rotate={12} className="pbs-hero-piece" />
          <h2 className="pbs-h2">{t.selectChild}</h2>
          <div className="pbs-search-wrap">
            <svg className="pbs-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              className="search-input pbs-search-input"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          {error && <div className="pbs-error">{error}</div>}
          <div className="pbs-child-list">
            {loadingChildren && <div className="pbs-loading">…</div>}
            {!loadingChildren && children.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-title">{t.noChildren}</div>
                <div className="empty-state-sub">{t.noChildrenSub}</div>
              </div>
            )}
            {!loadingChildren && children.map((child) => (
              <button key={child.id} className="pbs-child-row" onClick={() => selectChild(child)}>
                <ChildAvatar name={child.name} />
                <div className="pbs-child-info">
                  <div className="pbs-child-name">{child.name}</div>
                  <div className="pbs-child-tags">
                    <span className="pbs-tag pbs-tag-school">{child.school || "—"}</span>
                    <span className="pbs-tag pbs-tag-age">{t.age} {child.age ?? "—"}</span>
                    <span className="pbs-tag pbs-tag-lang">{child.language || "—"}</span>
                  </div>
                </div>
                <svg className="pbs-child-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === "confirm") {
    return (
      <div className="pbs-shell">
        <div className="pbs-topbar">
          <div className="pbs-topbar-title">{t.title}</div>
          <button className="btn btn-ghost btn-sm" onClick={onExit}>{t.exit}</button>
        </div>
        <div className="pbs-body pbs-body-narrow">
          <h2 className="pbs-h2">{t.confirmChild}</h2>
          <p className="pbs-sub">{t.confirmSub}</p>
          <div className="card pbs-confirm-card">
            <ChildAvatar name={selectedChild.name} size={64} />
            <div className="pbs-confirm-name">{selectedChild.name}</div>
            {existingSession && <span className="pill pill-pink">{t.resumeBadge}</span>}
            <div className="pbs-confirm-grid">
              <div><div className="pbs-confirm-label">{t.school}</div><div>{selectedChild.school || "—"}</div></div>
              <div><div className="pbs-confirm-label">{t.age}</div><div>{selectedChild.age ?? "—"}</div></div>
              <div><div className="pbs-confirm-label">{t.language}</div><div>{selectedChild.language || "—"}</div></div>
            </div>
          </div>
          {selectedChild.consentVerified ? (
            <div className="card" style={{ marginTop: 12, padding: "10px 16px", background: "var(--teal-lt, #E6F7F5)", color: "var(--teal)", fontSize: 12.5, fontWeight: 700 }}>
              {t.consentVerifiedBadge}
            </div>
          ) : (
            <div className="card pbs-consent-block" style={{ marginTop: 12, padding: "14px 16px", background: "var(--pink-lt, #FFE6EF)" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--pink)" }}>
                {selectedChild.consentFormUrl ? t.consentIncompleteTitle : t.consentMissingTitle}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-mid)", marginTop: 4, lineHeight: 1.5 }}>
                {selectedChild.consentVerificationNotes || t.consentMissingBody}
              </div>
            </div>
          )}
          {priorScreenings.length > 0 && (
            <div className="card" style={{ marginTop: 12, padding: "12px 16px", background: "var(--teal-lt, #E6F7F5)" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--teal)", marginBottom: 4 }}>
                Already screened {priorScreenings.length} time{priorScreenings.length === 1 ? "" : "s"} before
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-mid)" }}>
                Most recent: {priorScreenings[0].completed_at ? new Date(priorScreenings[0].completed_at).toLocaleDateString() : "—"}
                {priorScreenings[0].interpretation_band ? ` — ${priorScreenings[0].interpretation_band}` : ""}
                {priorScreenings[0].status === "awaiting_review" ? " (still awaiting review)" : ""}
              </div>
            </div>
          )}
          {error && <div className="pbs-error">{error}</div>}
          <div className="pbs-confirm-actions">
            <button className="btn btn-ghost" onClick={() => setView("select")}>{t.goBack}</button>
            <button
              className="btn btn-teal"
              onClick={() => beginScreening(!!existingSession)}
              disabled={!selectedChild.consentVerified}
              title={selectedChild.consentVerified ? undefined : t.consentMissingBody}
            >
              {existingSession ? t.resumeScreening : t.startScreening}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "submitted") {
    return (
      <div className="pbs-shell">
        <div className="pbs-body pbs-body-narrow pbs-submitted">
          <div className="pbs-submitted-icon">✓</div>
          <h2 className="pbs-h2">{t.submitted}</h2>
          <p className="pbs-sub">
            {isOffline
              ? `${selectedChild?.name}'s screening ${t.submittedOffline}`
              : `${selectedChild?.name} ${t.submittedSub} ${selectedChild?.school || "the child's record"}.`}
          </p>
          <p className="pbs-submitted-time">Total time taken: {formatTimer(sessionTimerMs)}</p>
          <button className="btn btn-teal" onClick={onExit}>{t.submittedBackHome}</button>
        </div>
      </div>
    );
  }

  // view === "form"
  if (contentLoading || !currentSection) {
    return (
      <div className="pbs-shell">
        <div className="pbs-body pbs-body-narrow">
          <p className="pbs-loading">Loading screener content…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pbs-shell">
      <div className={`pbs-timer-panel ${timerRunning ? "running" : ""}`}>
        <div className="pbs-timer-label">Section timer</div>
        <div className="pbs-timer-display">{formatTimer(timerMs)}</div>
        {timerQuestion && <div className="pbs-timer-target">for "{timerQuestion.label}"</div>}
        {isPuzzleOverTime && (
          <div className="pbs-timer-target" style={{ color: "var(--pink)", fontWeight: 800 }}>
            <Doodle name="warning" size={16} inline /> Over time (10 min limit)
          </div>
        )}
        <div className="pbs-timer-controls">
          {!timerRunning ? (
            <button className="btn btn-teal btn-sm" onClick={startTimer}>
              {timerMs > 0 ? "Resume" : "Start"}
            </button>
          ) : (
            <button className="btn pbs-btn-orange btn-sm" onClick={pauseTimer}>Pause</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={resetTimer} disabled={timerRunning}>Reset</button>
        </div>
      </div>
      <div className="pbs-topbar">
        <div>
          <div className="pbs-topbar-title">{selectedChild.name}</div>
          <div className="pbs-topbar-sub">{t.sectionOf} {sectionIndex + 1} {t.of} {sections.length} · {currentSection.title}</div>
        </div>
        <div className="pbs-topbar-right">
          <span className="pbs-session-timer" title="Total time on this screening, across every section">
            <Doodle name="stopwatch" size={16} inline /> {formatTimer(sessionTimerMs)}
          </span>
          <span className={`pbs-save-indicator pbs-save-${saveStatus}`}>
            {saveStatus === "saving" ? t.saving : saveStatus === "error" ? <Doodle name="warning" size={16} inline /> : t.saved}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowExitConfirm(true)}>{t.exit}</button>
        </div>
      </div>

      <div className="pbs-progress-track">
        <div className="pbs-progress-fill" style={{ width: `${(answeredCount / allQuestions.length) * 100}%` }} />
      </div>

      <div className="pbs-section-tabs">
        {sections.map((s, i) => (
          <button
            key={s.id}
            className={`pbs-section-tab ${i === sectionIndex ? "active" : ""} ${sectionAnswered(s) === s.questions.length ? "done" : ""}`}
            onClick={() => setSectionIndex(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="pbs-body">
        <h2 className="pbs-h2">{currentSection.title}</h2>
        {currentSection.description && <p className="pbs-section-desc">{currentSection.description}</p>}
        {error && <div className="pbs-error">{error}</div>}

        <div className="pbs-question-list">
          {currentSection.questions.map(renderQuestion)}
        </div>

        {sectionIndex === sections.length - 1 && (
          <div className="pbs-observations">
            <label className="pbs-question-label">{t.observations}</label>
            <textarea
              className="pbs-observations-input"
              placeholder={t.observationsPlaceholder}
              value={observations}
              onChange={(e) => updateObservations(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="pbs-footer">
        <button
          className="btn btn-ghost"
          disabled={sectionIndex === 0}
          onClick={() => setSectionIndex((i) => Math.max(0, i - 1))}
        >
          {t.back}
        </button>
        {sectionIndex < sections.length - 1 ? (
          <button className="btn btn-teal" onClick={() => setSectionIndex((i) => Math.min(sections.length - 1, i + 1))}>
            {t.next}
          </button>
        ) : (
          <button className="btn btn-teal" onClick={() => setShowSubmitConfirm(true)}>
            {t.submit}
          </button>
        )}
      </div>

      {showSubmitConfirm && (
        <div className="modal-overlay" onClick={() => setShowSubmitConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{t.submitConfirmTitle}</div>
              <button className="modal-close" onClick={() => setShowSubmitConfirm(false)}>✕</button>
            </div>
            <p>
              {unansweredCount > 0
                ? `${unansweredCount} ${t.submitConfirmBody}`
                : t.submitConfirmBodyComplete}
            </p>
            {error && <div className="pbs-error">{error}</div>}
            <div className="pbs-confirm-actions">
              <button className="btn btn-ghost" onClick={() => setShowSubmitConfirm(false)} disabled={submitting}>{t.cancel}</button>
              <button className="btn btn-teal" onClick={doSubmit} disabled={submitting}>{submitting ? "Submitting…" : t.confirmSubmit}</button>
            </div>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div className="modal-overlay" onClick={() => setShowExitConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p>{isOffline ? t.exitConfirmOffline : t.exitConfirm}</p>
            <div className="pbs-confirm-actions">
              <button className="btn btn-ghost" onClick={() => setShowExitConfirm(false)}>{t.cancel}</button>
              <button className="btn btn-teal" onClick={onExit}>{t.exit}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}