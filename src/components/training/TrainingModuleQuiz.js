// TrainingModuleQuiz.js
//
// The quiz a teacher/psychologist takes for one training module, once
// it's published. Pulls its questions from Supabase (admin-managed via
// Admin → Training Modules → Quiz) and scores the attempt in the browser
// — nothing is written back, so retaking is always available.

import React, { useMemo, useState } from "react";
import { COLORS } from "../shared/SiteChrome";
import { useTrainingQuestions } from "../../hooks/useTrainingQuestions";
import { useLanguage } from "../../theme/LanguageContext";

const T = {
  en: {
    takeQuiz: (n) => `Take quiz (${n} question${n === 1 ? "" : "s"})`,
    passed: "Nice work — you've passed this module's quiz.",
    failed: "Not quite there yet — have another look and try again.",
    retake: "Retake quiz",
    missing: "Please answer every question before submitting.",
    submit: "Submit",
    loadError: "Could not load this module's quiz.",
  },
  af: {
    takeQuiz: (n) => `Doen die vasvra (${n} ${n === 1 ? "vraag" : "vrae"})`,
    passed: "Mooi so — jy het hierdie module se vasvra geslaag.",
    failed: "Nog nie heeltemal nie — kyk gerus weer en probeer weer.",
    retake: "Doen die vasvra weer",
    missing: "Beantwoord asseblief elke vraag voordat jy indien.",
    submit: "Dien in",
    loadError: "Kon nie hierdie module se vasvra laai nie.",
  },
  xh: {
    takeQuiz: (n) => `Yenza uvavanyo (${n === 1 ? "umbuzo omnye" : `imibuzo eyi-${n}`})`,
    passed: "Wenze kakuhle — uphumelele kuvavanyo lwale modyuli.",
    failed: "Akukafikeleli — phinda ujonge uzame kwakhona.",
    retake: "Phinda uvavanyo",
    missing: "Nceda uphendule yonke imibuzo phambi kokuba uthumele.",
    submit: "Thumela",
    loadError: "Asikwazanga ukulayisha uvavanyo lwale modyuli.",
  },
};

export default function TrainingModuleQuiz({ moduleId, color, onResult }) {
  const { lang } = useLanguage();
  const t = T[lang] || T.en;
  // Scoring always runs against the English rows (choice ids are shared
  // across languages); the current language's rows are only used for the
  // text shown, falling back to English wherever a translation is empty.
  const { questions, loading, error } = useTrainingQuestions(moduleId, "en");
  const localised = useTrainingQuestions(lang !== "en" ? moduleId : null, lang);
  const displayById = useMemo(() => {
    const map = {};
    if (lang === "en" || localised.loading) return map;
    localised.questions.forEach((q) => { map[q.id] = q; });
    return map;
  }, [lang, localised.loading, localised.questions]);
  const textFor = (q) => {
    const d = displayById[q.id];
    return (d && d.text && d.text.trim()) ? d.text : q.text;
  };
  const choiceTextFor = (q, c) => {
    const d = displayById[q.id];
    const dc = d && Array.isArray(d.choices) ? d.choices.find((x) => x.id === c.id) : null;
    return (dc && dc.text && dc.text.trim()) ? dc.text : c.text;
  };
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState({}); // questionId -> choiceId
  const [result, setResult] = useState(null); // { score, total, percent }
  const [missing, setMissing] = useState(false);

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  const choose = (questionId, choiceId) => {
    setAnswers({ ...answers, [questionId]: choiceId });
    setMissing(false);
  };

  const submit = () => {
    const unanswered = questions.some((q) => !answers[q.id]);
    if (unanswered) { setMissing(true); return; }

    const score = questions.reduce(
      (sum, q) => sum + (answers[q.id] === q.correctChoiceId ? q.points : 0),
      0
    );
    // Pass/fail uses the UNROUNDED percentage: 69.6% must not round up to a pass.
    const exactPercent = totalPoints ? (score / totalPoints) * 100 : 0;
    const outcome = { score, total: totalPoints, percent: Math.round(exactPercent), passed: exactPercent >= 70 };
    setResult(outcome);
    // Snapshot exactly which version of each question this attempt was
    // scored against — see migration 023. Without this, editing/publishing
    // a question later would silently rewrite what an already-completed
    // attempt means.
    const questionVersions = questions.map((q) => ({
      id: q.id,
      questionKey: q.questionKey,
      version: q.version,
    }));
    // Let the parent (MemberArea's Training flow) persist pass/fail to
    // training_progress — this component stays pure/presentational and
    // keeps working exactly as before when no callback is passed in.
    if (onResult) onResult({ ...outcome, questionVersions });
  };

  const retake = () => {
    setAnswers({});
    setResult(null);
    setMissing(false);
  };

  if (loading) return null;
  if (error) return <p style={{ fontSize: 12.5, color: COLORS.inkFaint }}>{t.loadError}</p>;
  if (questions.length === 0) return null;

  if (!started) {
    return (
      <button
        onClick={() => setStarted(true)}
        style={{
          marginTop: 10, background: "none", border: `1.5px solid ${color}`, borderRadius: 10,
          padding: "8px 16px", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 800, color,
        }}
      >
        {t.takeQuiz(questions.length)}
      </button>
    );
  }

  if (result) {
    const passed = result.passed;
    return (
      <div style={{ marginTop: 12, padding: "16px 18px", borderRadius: 12, background: passed ? COLORS.tealLight : COLORS.pinkLight }}>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: 18, color: passed ? COLORS.teal : COLORS.pink, marginBottom: 4 }}>
          {result.score} / {result.total} ({result.percent}%)
        </div>
        <div style={{ fontSize: 13, color: COLORS.inkMid, marginBottom: 12 }}>
          {passed ? t.passed : t.failed}
        </div>
        <button onClick={retake} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color }}>
          {t.retake}
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 16 }}>
      {questions.map((q, qi) => (
        <div key={q.id}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.ink, marginBottom: 8 }}>
            {qi + 1}. {textFor(q)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {q.choices.map((c) => (
              <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.inkMid, cursor: "pointer" }}>
                <input
                  type="radio"
                  name={`question-${q.id}`}
                  checked={answers[q.id] === c.id}
                  onChange={() => choose(q.id, c.id)}
                />
                {choiceTextFor(q, c)}
              </label>
            ))}
          </div>
        </div>
      ))}

      {missing && (
        <div style={{ fontSize: 12.5, color: COLORS.pink, fontWeight: 700 }}>{t.missing}</div>
      )}

      <button
        onClick={submit}
        style={{
          alignSelf: "flex-start", background: color, color: "#fff", border: "none", borderRadius: 10,
          padding: "10px 22px", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800,
        }}
      >
        {t.submit}
      </button>
    </div>
  );
}