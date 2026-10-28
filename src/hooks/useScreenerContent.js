import { useCallback, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { puzzleBoxContentV1, interpretationBands as fallbackBands } from "../data/puzzleBoxContent.v1";
import { applyShowcaseMode } from "../utils/showcaseMode";

// Loads the screener's content — sections, questions, scoring rules,
// interpretation bands — from the tables created by
// supabase/migrations/007_screener_content.sql, edited by an admin via
// Admin → Screener Content (ScreenerContentAdmin.js).
//
// Reconstructs the exact shape PuzzleBoxScreener.js was already written
// against (see that file's original header comment, which anticipated
// exactly this swap), so the screening UI itself needs no redesign —
// only its content source changes.
//
// SAFETY NET: if the screener_* tables haven't been migrated/seeded yet,
// or Supabase is briefly unreachable, this falls back to the original
// hardcoded content in src/data/puzzleBoxContent.v1.js — a screening in
// progress in a classroom should never break because of a content-admin
// change or a network hiccup. That file is kept for exactly this reason;
// it is no longer the primary source once migration 008 has been run.

// Same evaluate-in-order, first-match rule as the original hardcoded
// scoring predicates in puzzleBoxContent.v1.js — just built from
// (score, min, max) rows an admin can edit instead of a JS function.
export function scoreFromAgeTable(table, age, value) {
  // Only ages that have a table are scored (no silent fallback to age-6 norms).
  const rows = table[age];
  if (!rows) return null;
  for (const row of rows) {
    if (row.test(value)) return row.score;
  }
  return null; 
}

function rangeRowsToTestRows(rows) {
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => ({
      score: r.score,
      min: r.min_value,
      max: r.max_value,
      test: (v) => (r.min_value == null || v >= r.min_value) && (r.max_value == null || v <= r.max_value),
    }));
}

// Turns the raw screener_* table rows into the shape PuzzleBoxScreener.js
// expects. Shared by the online hook below and by offline mode, which gets
// the same rows inside the encrypted offline package — so scoring is
// identical whether a screening is done online or offline.
// Returns null when there are no sections (caller falls back to v1 content).
export function buildScreenerContent({ meta, sections, questions, scoreTables, bandRows }) {
  if (!sections || sections.length === 0) return null;

  const tablesByQuestion = {};
  for (const row of scoreTables || []) {
    tablesByQuestion[row.question_id] = tablesByQuestion[row.question_id] || {};
    tablesByQuestion[row.question_id][row.age] = tablesByQuestion[row.question_id][row.age] || [];
    tablesByQuestion[row.question_id][row.age].push(row);
  }

  const questionsBySection = {};
  for (const q of questions || []) {
    questionsBySection[q.section_id] = questionsBySection[q.section_id] || [];
    const ageRows = tablesByQuestion[q.id];
    let ageTable = null;
    if (ageRows) {
      ageTable = {};
      for (const [age, rows] of Object.entries(ageRows)) {
        ageTable[age] = rangeRowsToTestRows(rows);
      }
    }
    questionsBySection[q.section_id].push({
      id: q.id,
      label: q.label,
      instruction: q.instruction || undefined,
      toPass: q.to_pass || undefined,
      domain: q.domain_override || undefined,
      scoringType: q.scoring_type,
      needsConfirmation: !!q.needs_confirmation,
      checklistOptions: q.checklist_options && q.checklist_options.length ? q.checklist_options : undefined,
      ageTable,
    });
  }

  const builtSections = sections.map((s) => ({
    id: s.id,
    domain: s.domain,
    title: s.title,
    description: s.description || undefined,
    isPuzzleTimerSection: !!s.is_puzzle_timer_section,
    questions: questionsBySection[s.id] || [],
  }));

  const bandsByAge = {};
  for (const row of bandRows || []) {
    bandsByAge[row.age] = bandsByAge[row.age] || [];
    bandsByAge[row.age].push({
      band: row.band_key,
      label: row.label,
      min: row.min_score ?? undefined,
      max: row.max_score ?? undefined,
    });
  }

  return {
    content: {
      version: meta?.version || "1.0",
      status: "published",
      instructions: meta?.instructions || "",
      scoringLegend: meta?.scoring_legend || [],
      sections: builtSections,
    },
    bands: Object.keys(bandsByAge).length > 0 ? bandsByAge : fallbackBands,
  };
}

// Offline package (from the issue-offline-package edge function) → the same
// row shapes buildScreenerContent reads.
function buildFromOfflinePackage(pkg) {
  return buildScreenerContent({
    meta: { version: pkg.version, instructions: pkg.instructions, scoring_legend: pkg.scoringLegend },
    sections: pkg.sections,
    questions: pkg.questions,
    scoreTables: pkg.scoreTables,
    bandRows: pkg.interpretationBands,
  });
}

// Pass `offlinePackage` (the decrypted offline screener) to build the content
// from the device instead of fetching it from Supabase.
export function useScreenerContent(offlinePackage) {
  const [content, setContent] = useState(null); // null = still loading
  const [bands, setBands] = useState(null);
  const [error, setError] = useState("");

  // Single exit point so showcase mode (src/lib/showcaseMode.js) applies to
  // every source of content, including the built-in fallback.
  const publish = useCallback((c, b) => {
    const shown = applyShowcaseMode(c, b);
    setContent(shown.content);
    setBands(shown.bands);
  }, []);

  const refresh = useCallback(async () => {
    if (offlinePackage) {
      const built = buildFromOfflinePackage(offlinePackage);
      setError("");
      publish(built ? built.content : puzzleBoxContentV1, built ? built.bands : fallbackBands);
      return;
    }

    const [
      { data: meta, error: metaErr },
      { data: sections, error: secErr },
      { data: questions, error: qErr },
      { data: scoreTables, error: stErr },
      { data: bandRows, error: bandErr },
    ] = await Promise.all([
      supabase.from("screener_meta").select("*").eq("id", 1).maybeSingle(),
      supabase.from("screener_sections").select("*").order("sort_order", { ascending: true }),
      supabase.from("screener_questions").select("*").order("sort_order", { ascending: true }),
      supabase.from("screener_score_tables").select("*"),
      supabase.from("screener_interpretation_bands").select("*").order("sort_order", { ascending: true }),
    ]);

    const firstError = metaErr || secErr || qErr || stErr || bandErr;
    if (firstError) {
      console.error("Error loading screener content:", firstError);
      setError("Could not load screener content — using the built-in default.");
      publish(puzzleBoxContentV1, fallbackBands);
      return;
    }

    const built = buildScreenerContent({ meta, sections, questions, scoreTables, bandRows });
    setError("");
    if (!built) {
      // Migrations 007/008 not run yet, or content table cleared.
      publish(puzzleBoxContentV1, fallbackBands);
      return;
    }
    publish(built.content, built.bands);
  }, [offlinePackage, publish]);

  useEffect(() => { refresh(); }, [refresh]);

  return {
    content,
    interpretationBands: bands,
    loading: content === null,
    error,
    refresh,
  };
}