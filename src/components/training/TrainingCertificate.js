import React from "react";
import Doodle from "../shared/Doodle";
import { COLORS } from "../shared/SiteChrome";
import { useLanguage } from "../../theme/LanguageContext";

const T = {
  en: {
    locale: undefined,
    heading: "Certificate of Completion",
    trainee: "Trainee",
    completed: (tier) => `has completed The PuzzleBox training course${tier ? ` — ${tier}` : ""}`,
    issued: (date) => `Issued ${date}`,
  },
  af: {
    locale: "af-ZA",
    heading: "Sertifikaat van Voltooiing",
    trainee: "Kursusganger",
    completed: (tier) => `het The PuzzleBox-opleidingskursus voltooi${tier ? ` — ${tier}` : ""}`,
    issued: (date) => `Uitgereik op ${date}`,
  },
  xh: {
    locale: "xh-ZA",
    heading: "Isatifikethi Sokugqiba",
    trainee: "Umfundi",
    completed: (tier) => `uyigqibile ikhosi yoqeqesho ye-PuzzleBox${tier ? ` — ${tier}` : ""}`,
    issued: (date) => `Sikhutshwe ngomhla ${date}`,
  },
};

// A simple on-screen certificate shown once a trainee has viewed every
// published module and passed its quiz (see useTrainingProgress's
// issueCertificateIfEligible, and training_certificates in
// supabase/migrations/015_training_course_tables.sql).
export default function TrainingCertificate({ name, tierLabel, issuedAt }) {
  const { lang } = useLanguage();
  const t = T[lang] || T.en;
  const date = issuedAt
    ? new Date(issuedAt).toLocaleDateString(t.locale, { year: "numeric", month: "long", day: "numeric" })
    : "";

  return (
    <div
      style={{
        marginTop: 28, borderRadius: 20, padding: "40px 36px", textAlign: "center",
        background: `linear-gradient(160deg, ${COLORS.tealLight} 0%, ${COLORS.white} 70%)`,
        border: `2px solid ${COLORS.teal}`, position: "relative", overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><Doodle name="trophy" size={72} /></div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: COLORS.teal, marginBottom: 10 }}>
        {t.heading}
      </div>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 900, color: COLORS.ink, margin: "0 0 6px" }}>
        {name || t.trainee}
      </h2>
      <p style={{ fontSize: 14, color: COLORS.inkMid, margin: "0 0 18px" }}>
        {t.completed(tierLabel)}
      </p>
      {date && <p style={{ fontSize: 12.5, color: COLORS.inkFaint, margin: 0 }}>{t.issued(date)}</p>}
    </div>
  );
}