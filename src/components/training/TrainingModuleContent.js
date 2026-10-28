import React, { useState } from "react";
import { Ico } from "../shared/Doodle";
import { COLORS } from "../shared/SiteChrome";
import { useLanguage } from "../../theme/LanguageContext";

// Fixed UI labels only — the module content itself (titles, body text,
// table rows...) comes from the data and is shown as-is.
const T = {
  en: {
    verdict: "Verdict:",
    users: "Users",
    purpose: "Purpose",
    supports: "Supports professionals to",
    provides: "Provides",
    sharedFoundation: "Shared foundation — one screening tool, two levels of application",
    toPass: "To pass: ",
    colBand: "Band",
    colAge: "Age",
    colPercentile: "Percentile",
    colTotal: "Total score",
    classroom: "What this can look like in the classroom",
  },
  af: {
    verdict: "Uitspraak:",
    users: "Gebruikers",
    purpose: "Doel",
    supports: "Ondersteun professionele persone om",
    provides: "Bied",
    sharedFoundation: "Gedeelde grondslag — een siftingsinstrument, twee vlakke van toepassing",
    toPass: "Om te slaag: ",
    colBand: "Band",
    colAge: "Ouderdom",
    colPercentile: "Persentiel",
    colTotal: "Totale telling",
    classroom: "Hoe dit in die klaskamer kan lyk",
  },
  xh: {
    verdict: "Isigqibo:",
    users: "Abasebenzisi",
    purpose: "Injongo",
    supports: "Incedisa iingcali ukuba",
    provides: "Inika",
    sharedFoundation: "Isiseko esifanayo — isixhobo esinye sohlolo, amanqanaba amabini okusetyenziswa",
    toPass: "Ukuze kuphunyelelwe: ",
    colBand: "Udidi",
    colAge: "Ubudala",
    colPercentile: "Ipesentayili",
    colTotal: "Amanqaku ewonke",
    classroom: "Oku kunokubonakala njani eklasini",
  },
};

function useT() {
  const { lang } = useLanguage();
  return T[lang] || T.en;
}

// ---------------------------------------------------------------------------
// TrainingModuleContent.js
//
// Renders the rich, block-based module content from
// src/data/trainingContent.v1.js inside the logged-in Training experience
// (see MemberArea.js). Each module's content is an ordered array of typed
// blocks (hero, timeline, principleCards, phasePipeline, ...) — this file
// is the one place that knows how to draw each block type, so the content
// data stays plain, versioned, and (per the project's own established
// pattern — see puzzleBoxContent.v1.js) easy to move into Supabase later
// without touching this rendering code.
// ---------------------------------------------------------------------------

function colorFor(key) {
  const k = key || "teal";
  return { color: COLORS[k] || COLORS.teal, bg: COLORS[`${k}Light`] || COLORS.tealLight };
}

const H2 = ({ children }) => (
  <h2 style={{ fontFamily: "'Nunito', sans-serif", fontSize: 22, fontWeight: 900, color: COLORS.ink, margin: "0 0 16px" }}>{children}</h2>
);

const Card = ({ children, style }) => (
  <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "20px 22px", ...style }}>
    {children}
  </div>
);

// ---- hero -------------------------------------------------------------
function HeroBlock({ block, colorKey }) {
  const { color } = colorFor(colorKey);
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: 16, background: colorFor(colorKey).bg, color, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
        {block.kicker}
      </span>
      <h1 style={{ fontFamily: "'Nunito', sans-serif", fontSize: "clamp(26px, 3.2vw, 36px)", fontWeight: 900, color: COLORS.ink, lineHeight: 1.15, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
        {block.title}
      </h1>
      {block.intro && <p style={{ fontSize: 15.5, color: COLORS.inkMid, lineHeight: 1.75, maxWidth: 680, margin: 0 }}>{block.intro}</p>}
    </div>
  );
}

// ---- timeline -----------------------------------------------------------
function TimelineBlock({ block }) {
  return (
    <section>
      {block.title && <H2>{block.title}</H2>}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {block.steps.map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: COLORS.tealLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                <Ico v={step.icon} size={26} />
              </div>
              {i < block.steps.length - 1 && <div style={{ flex: 1, width: 2, background: COLORS.border, minHeight: 28, margin: "4px 0" }} />}
            </div>
            <div style={{ paddingBottom: 26 }}>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 16, fontWeight: 800, color: COLORS.ink, marginBottom: 4 }}>{step.title}</div>
              <div style={{ fontSize: 14, color: COLORS.inkMid, lineHeight: 1.65, maxWidth: 560 }}>{step.body}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- principleCards -----------------------------------------------------
const PRINCIPLE_COLOR_CYCLE = ["teal", "pink", "purple", "orange", "maroon"];
function PrincipleCards({ block }) {
  const [openId, setOpenId] = useState(null);
  return (
    <section>
      {block.title && <H2>{block.title}</H2>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {block.cards.map((card, i) => {
          const { color, bg } = colorFor(PRINCIPLE_COLOR_CYCLE[i % PRINCIPLE_COLOR_CYCLE.length]);
          const open = openId === card.id;
          return (
            <button
              key={card.id}
              onClick={() => setOpenId(open ? null : card.id)}
              style={{
                textAlign: "left", cursor: "pointer", fontFamily: "inherit", width: "100%",
                background: COLORS.white, border: `1px solid ${COLORS.border}`, borderTop: `4px solid ${color}`,
                borderRadius: 14, padding: "16px 18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 14.5, fontWeight: 800, color: COLORS.ink }}>{card.title}</div>
                <span style={{ fontSize: 18, color, lineHeight: 1, flexShrink: 0 }}>{open ? "−" : "+"}</span>
              </div>
              <div style={{ fontSize: 12.5, color: COLORS.inkMid, marginTop: 6, lineHeight: 1.55 }}>{card.summary}</div>
              {open && (
                <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: bg, fontSize: 12.5, color: COLORS.inkMid, lineHeight: 1.65 }}>
                  {card.body}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ---- phasePipeline --------------------------------------------------------
function PhasePipeline({ block }) {
  const phaseColors = ["maroon", "purple", "pink", "orange"];
  return (
    <section>
      {block.title && <H2>{block.title}</H2>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {block.phases.map((phase, i) => {
          const { color, bg } = colorFor(phaseColors[i % phaseColors.length]);
          return (
            <div key={phase.n} style={{ display: "grid", gridTemplateColumns: "140px 1fr 160px", gap: 10, alignItems: "stretch" }}>
              <div style={{ background: color, color: "#fff", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Nunito', sans-serif", display: "flex", alignItems: "center", gap: 10 }}><span style={{ background: "#fff", borderRadius: 10, padding: 4, display: "inline-flex" }}><Ico v={phase.icon} size={24} /></span>{phase.n}</div>
                <div style={{ fontSize: 12.5, fontWeight: 800, marginTop: 2 }}>{phase.name}</div>
              </div>
              <div style={{ background: bg, borderRadius: 12, padding: "14px 16px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {phase.methods.map((m, mi) => (
                  <span key={mi} style={{ fontSize: 12, fontWeight: 700, color: COLORS.ink, background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "5px 10px" }}>{m}</span>
                ))}
              </div>
              <div style={{ background: "var(--surface)", border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", fontSize: 12.5, fontWeight: 800, color: COLORS.ink, textAlign: "center", justifyContent: "center" }}>
                {phase.outcome}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---- statCallouts --------------------------------------------------------
function StatCallouts({ block }) {
  return (
    <section>
      {block.title && <H2>{block.title}</H2>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: block.note ? 14 : 0 }}>
        {block.stats.map((s, i) => (
          <Card key={i} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 30, fontWeight: 900, color: COLORS.teal, marginBottom: 6 }}>{s.value}</div>
            <div style={{ fontSize: 12.5, color: COLORS.inkMid, lineHeight: 1.55 }}>{s.label}</div>
          </Card>
        ))}
      </div>
      {block.note && <p style={{ fontSize: 12.5, color: COLORS.inkFaint, lineHeight: 1.65 }}>{block.note}</p>}
    </section>
  );
}

// ---- domainGrid -----------------------------------------------------------
function DomainGrid({ block }) {
  return (
    <section>
      {block.title && <H2>{block.title}</H2>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
        {block.domains.map((d) => {
          const { color, bg } = colorFor(d.colorKey);
          return (
            <Card key={d.id} style={{ borderTop: `4px solid ${color}` }}>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 15, fontWeight: 800, color, marginBottom: 8 }}>{d.label}</div>
              <div style={{ fontSize: 12.5, color: COLORS.inkMid, lineHeight: 1.6, marginBottom: 10 }}>{d.summary}</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
                {d.subConstructs.map((sc, i) => (
                  <li key={i} style={{ fontSize: 11.5, color: COLORS.ink, lineHeight: 1.5 }}>{sc}</li>
                ))}
              </ul>
              <div style={{ display: "none" }}>{bg}</div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

// ---- caseStudy --------------------------------------------------------
function CaseStudy({ block }) {
  const t = useT();
  const ratingColor = { strong: COLORS.teal, moderate: COLORS.orange, weak: COLORS.pink };
  return (
    <section>
      {block.title && <H2>{block.title}</H2>}
      {block.intro && <p style={{ fontSize: 14, color: COLORS.inkMid, lineHeight: 1.7, marginBottom: 14 }}>{block.intro}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {block.factors.map((f, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 14px", borderRadius: 10, background: "var(--surface)" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: ratingColor[f.rating] || COLORS.inkFaint, marginTop: 4, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.ink }}>{f.label}</div>
              <div style={{ fontSize: 12.5, color: COLORS.inkMid, lineHeight: 1.55, marginTop: 2 }}>{f.note}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 10, background: COLORS.pinkLight, color: COLORS.pink, fontWeight: 800, fontSize: 12.5 }}>
        {t.verdict} {block.verdict}
      </div>
    </section>
  );
}

// ---- tierCompare --------------------------------------------------------
function TierCompare({ block }) {
  const t = useT();
  const tierColors = ["teal", "purple"];
  return (
    <section>
      {block.title && <H2>{block.title}</H2>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginBottom: 16 }}>
        {block.tiers.map((tier, i) => {
          const { color, bg } = colorFor(tierColors[i % tierColors.length]);
          return (
            <Card key={i} style={{ borderTop: `4px solid ${color}` }}>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 15, fontWeight: 800, color, marginBottom: 10 }}>{tier.name}</div>
              <Field label={t.users} value={tier.users} />
              <Field label={t.purpose} value={tier.purpose} />
              <ListField label={t.supports} items={tier.supports} />
              <ListField label={t.provides} items={tier.provides} />
              <div style={{ marginTop: 10, display: "inline-block", padding: "5px 12px", borderRadius: 8, background: bg, color, fontWeight: 800, fontSize: 11.5 }}>{tier.goal}</div>
            </Card>
          );
        })}
      </div>
      {block.shared && (
        <Card style={{ background: COLORS.pinkLight, border: "none" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.pink, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.sharedFoundation}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {block.shared.map((s, i) => (
              <span key={i} style={{ fontSize: 12, fontWeight: 700, color: COLORS.ink, background: COLORS.white, borderRadius: 8, padding: "5px 10px" }}>{s}</span>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}
function Field({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: COLORS.inkFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 12.5, color: COLORS.ink, lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}
function ListField({ label, items }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: COLORS.inkFaint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {items.map((it, i) => <li key={i} style={{ fontSize: 12, color: COLORS.ink, lineHeight: 1.55 }}>{it}</li>)}
      </ul>
    </div>
  );
}

// ---- adminScript --------------------------------------------------------
const DOMAIN_COLOR = { cognitive: "maroon", language: "purple", fine_motor: "pink", emotional_social_moral: "teal" };
function AdminScript({ block }) {
  const t = useT();
  const [openN, setOpenN] = useState(block.items[0]?.n ?? null);
  return (
    <section>
      {block.title && <H2>{block.title}</H2>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {block.items.map((item) => {
          const { color, bg } = colorFor(DOMAIN_COLOR[item.domain]);
          const open = openN === item.n;
          return (
            <div key={item.n} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden", background: COLORS.white }}>
              <button
                onClick={() => setOpenN(open ? null : item.n)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
              >
                <span style={{ width: 30, height: 30, borderRadius: 8, background: bg, color, fontWeight: 900, fontSize: 12.5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.n}</span>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: COLORS.ink }}>{item.title}</span>
                <span style={{ fontSize: 16, color: COLORS.inkFaint }}>{open ? "−" : "+"}</span>
              </button>
              {open && (
                <div style={{ padding: "0 16px 16px 60px" }}>
                  <div style={{ fontSize: 12.5, color: COLORS.inkMid, lineHeight: 1.65, marginBottom: 8, fontStyle: "italic" }}>{item.script}</div>
                  <div style={{ fontSize: 12, color: COLORS.ink, lineHeight: 1.6, background: "var(--surface)", borderRadius: 8, padding: "8px 12px", marginBottom: item.ageTable ? 8 : 0 }}>
                    <strong>{t.toPass}</strong>{item.toPass}
                  </div>
                  {item.ageTable && (
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
                      {Object.entries(item.ageTable).map(([age, rows]) => (
                        <table key={age} style={{ fontSize: 11.5, borderCollapse: "collapse" }}>
                          <caption style={{ textAlign: "left", fontWeight: 800, color: COLORS.ink, marginBottom: 4 }}>{age}</caption>
                          <tbody>
                            {rows.map((r, i) => (
                              <tr key={i}>
                                <td style={{ border: `1px solid ${COLORS.border}`, padding: "3px 8px", color: COLORS.inkMid }}>{r[0]}</td>
                                <td style={{ border: `1px solid ${COLORS.border}`, padding: "3px 8px", fontWeight: 800, color }}>{r[1]}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---- scoringTable --------------------------------------------------------
function ScoringTable({ block }) {
  const t = useT();
  const bandColor = { "On Track": COLORS.teal, Progressing: COLORS.orange, Concerns: COLORS.pink };
  return (
    <section>
      {block.title && <H2>{block.title}</H2>}
      <div style={{ overflowX: "auto", marginBottom: 18 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              {[t.colBand, t.colAge, t.colPercentile, t.colTotal].map((h) => (
                <th key={h} style={{ padding: "8px 12px", borderBottom: `2px solid ${COLORS.border}`, color: COLORS.inkFaint, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r, i) => (
              <tr key={i}>
                <td style={{ padding: "8px 12px", borderBottom: `1px solid ${COLORS.border}`, fontWeight: 800, color: bandColor[r.band] || COLORS.ink }}>{r.band}</td>
                <td style={{ padding: "8px 12px", borderBottom: `1px solid ${COLORS.border}`, color: COLORS.inkMid }}>{r.age}</td>
                <td style={{ padding: "8px 12px", borderBottom: `1px solid ${COLORS.border}`, color: COLORS.inkMid }}>{r.percentile}</td>
                <td style={{ padding: "8px 12px", borderBottom: `1px solid ${COLORS.border}`, color: COLORS.ink, fontWeight: 700 }}>{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {block.interpretation.map((it, i) => (
          <Card key={i}>
            <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.ink, marginBottom: 4 }}>{it.band}</div>
            <div style={{ fontSize: 12.5, color: COLORS.inkMid, lineHeight: 1.65 }}>{it.body}</div>
          </Card>
        ))}
      </div>
    </section>
  );
}

// ---- interpretationLadder --------------------------------------------------
function InterpretationLadder({ block }) {
  return (
    <section>
      {block.title && <H2>{block.title}</H2>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {block.layers.map((layer, i) => {
          const { color, bg } = colorFor(layer.colorKey);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 8, height: 36, borderRadius: 4, background: color, flexShrink: 0 }} />
              <div style={{ flex: 1, padding: "10px 16px", borderRadius: 10, background: bg, fontSize: 13.5, fontWeight: 700, color: COLORS.ink }}>{layer.label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---- domainClassroomGuide --------------------------------------------------
function DomainClassroomGuide({ block }) {
  const t = useT();
  return (
    <section>
      {block.title && <H2>{block.title}</H2>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        {block.domains.map((d) => {
          const { color } = colorFor(d.colorKey);
          return (
            <Card key={d.id} style={{ borderTop: `4px solid ${color}` }}>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 14.5, fontWeight: 800, color, marginBottom: 6 }}>{d.label}</div>
              <div style={{ fontSize: 12, color: COLORS.inkMid, lineHeight: 1.6, marginBottom: 10 }}>{d.summary}</div>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: COLORS.inkFaint, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{t.classroom}</div>
              <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                {d.classroom.map((c, i) => <li key={i} style={{ fontSize: 11.5, color: COLORS.ink, lineHeight: 1.5 }}>{c}</li>)}
              </ul>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

// ---- constructMap / capsMap / unclearNotice / richText --------------------
function ConstructMap({ block }) {
  return (
    <section>
      {block.title && <H2>{block.title}</H2>}
      <Card style={{ background: "var(--surface)" }}>
        <p style={{ fontSize: 13, color: COLORS.inkMid, lineHeight: 1.7, margin: 0 }}>{block.note}</p>
      </Card>
    </section>
  );
}

function CapsMap({ block }) {
  const subjectColors = ["teal", "purple", "orange"];
  return (
    <section>
      {block.title && <H2>{block.title}</H2>}
      {block.intro && <p style={{ fontSize: 13.5, color: COLORS.inkMid, lineHeight: 1.7, marginBottom: 14 }}>{block.intro}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        {block.subjects.map((s, i) => {
          const { color, bg } = colorFor(subjectColors[i % subjectColors.length]);
          return (
            <Card key={s.name} style={{ borderTop: `4px solid ${color}` }}>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 14.5, fontWeight: 800, color, marginBottom: 8 }}>{s.name}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: s.indirect?.length ? 10 : 0 }}>
                {s.direct.map((d, di) => (
                  <span key={di} style={{ fontSize: 11, fontWeight: 700, color, background: bg, borderRadius: 7, padding: "4px 9px" }}>{d}</span>
                ))}
              </div>
              {s.indirect?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {s.indirect.map((d, di) => (
                    <span key={di} style={{ fontSize: 11, fontWeight: 700, color: COLORS.inkFaint, background: "transparent", border: `1.5px dashed ${COLORS.border}`, borderRadius: 7, padding: "4px 9px" }}>{d}</span>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function UnclearNotice({ block }) {
  return (
    <Card style={{ background: COLORS.orangeLight, border: "none" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.orange, marginBottom: 6 }}>{block.title}</div>
      <div style={{ fontSize: 12.5, color: COLORS.ink, lineHeight: 1.65 }}>{block.body}</div>
    </Card>
  );
}

function RichText({ block }) {
  return (
    <section>
      {block.title && <H2>{block.title}</H2>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {block.paragraphs.map((p, i) => (
          <p key={i} style={{ fontSize: 14, color: COLORS.inkMid, lineHeight: 1.75, margin: 0 }}>{p}</p>
        ))}
      </div>
      {block.note && <p style={{ fontSize: 12, color: COLORS.inkFaint, lineHeight: 1.65, marginTop: 10, fontStyle: "italic" }}>{block.note}</p>}
    </section>
  );
}

const BLOCK_RENDERERS = {
  hero: HeroBlock,
  timeline: TimelineBlock,
  principleCards: PrincipleCards,
  phasePipeline: PhasePipeline,
  statCallouts: StatCallouts,
  domainGrid: DomainGrid,
  caseStudy: CaseStudy,
  tierCompare: TierCompare,
  adminScript: AdminScript,
  scoringTable: ScoringTable,
  interpretationLadder: InterpretationLadder,
  domainClassroomGuide: DomainClassroomGuide,
  constructMap: ConstructMap,
  capsMap: CapsMap,
  unclearNotice: UnclearNotice,
  richText: RichText,
};

export default function TrainingModuleContent({ content, colorKey }) {
  if (!content) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
      {content.blocks.map((block, i) => {
        const Renderer = BLOCK_RENDERERS[block.type];
        if (!Renderer) return null;
        return <Renderer key={i} block={block} colorKey={colorKey} />;
      })}
    </div>
  );
}