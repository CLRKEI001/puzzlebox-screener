import React, { useState, useMemo } from "react";
import Doodle from "../shared/Doodle";
import { DOMAIN_BENCHMARK, STATUS, isActiveFlag, avgOf } from "../../services/analyticsData";

// What identifies a child in this funder-facing report: the student number
// (never the database UUID, never the real name).
const childRef = (c) => c.studentNumber || c.id;

const DOMAINS = [
  { key:"cognitive",      label:"Cognitive" },
  { key:"motor",          label:"Fine Motor" },
  { key:"language_score", label:"Language" },
  { key:"social",         label:"Social Cognition" },
  { key:"emotion",        label:"Emotion" },
  { key:"moral",          label:"Moral" },
]; 

const STATUS_META = {
  "On Track":               { color:"#0E7A6E", bg:"#E6F4F2", dot:"#0E7A6E" },
  "Progressing":            { color:"#A84F00", bg:"#FEF0E4", dot:"#F26522" },
  "Developmental Concerns": { color:"#991040", bg:"#FDEDF3", dot:"#E8175D" },
  "Not Scored":             { color:"#555555", bg:"#EEEEEE", dot:"#999999" },
};

const fmtPct = (v) => (typeof v === "number" ? `${v}%` : "–");
const statusColor = (status) => (STATUS_META[status] || STATUS_META["Progressing"]).color;

const domainAvg = (arr, key) => avgOf(arr, key);
const pct = (n, t) => (t ? Math.round((n / t) * 100) : 0);
const unique = (arr, key) => [...new Set(arr.map(c => c[key]))].filter(Boolean).sort();

function StatusPill({ status }) {
  const m = STATUS_META[status] || STATUS_META["Progressing"];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5,
      padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700,
      background:m.bg, color:m.color, whiteSpace:"nowrap" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:m.dot, flexShrink:0 }} />
      {status}
    </span>
  );
}

function ScoreBar({ value }) {
  if (typeof value !== "number") {
    return <div style={{ fontSize:12, color:"#AAA" }}>No data</div>;
  }
  // Same benchmark as the dashboards and the PDF/Excel export.
  const color = value >= DOMAIN_BENCHMARK ? "#0E7A6E" : value >= 40 ? "#F26522" : "#E8175D";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ flex:1, height:4, background:"#EBEBEB", borderRadius:99, overflow:"hidden" }}>
        <div style={{ width:`${value}%`, height:"100%", background:color, borderRadius:99 }} />
      </div>
      <span style={{ fontSize:12, fontWeight:700, color, width:32, textAlign:"right" }}>{value}%</span>
    </div>
  );
}

function StatBox({ label, value, sub, accent }) {
  return (
    <div style={{ padding:"20px 22px", borderTop:`3px solid ${accent}`,
      background:"#fff", borderRadius:10, boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.08em",
        textTransform:"uppercase", color:"#AAA", marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:32, fontWeight:900, color:"#111", lineHeight:1,
        letterSpacing:"-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"#AAA", marginTop:5 }}>{sub}</div>}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, placeholder }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <label style={{ fontSize:10, fontWeight:800, letterSpacing:"0.08em",
        textTransform:"uppercase", color:"#888" }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        padding:"8px 32px 8px 12px", borderRadius:8, border:"1.5px solid #E0E0E0",
        fontSize:13, color:"#111", background:"#fff", cursor:"pointer",
        fontFamily:"inherit", appearance:"none",
        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat:"no-repeat", backgroundPosition:"right 10px center",
        minWidth:170, outline:"none",
      }}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── PRINT FUNCTION ───────────────────────────────────────────────────────────
// Opens a new window with just the report content and prints it
function printReport(htmlContent) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    // Pop-up blocker: nothing to print into.
    window.alert("Your browser blocked the print window. Please allow pop-ups for this site and try again.");
    return;
  }
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>PuzzleBox Screener Report</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Poppins', sans-serif; color: #111; background: #fff; padding: 40px; }
          @page { size: A4; margin: 14mm; }
          @media print { body { padding: 0; } }
          .page-break { page-break-before: always; }
        </style>
      </head>
      <body>${htmlContent}</body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
}

export default function SummaryReport({ children: propChildren }) {
  const [filterScope, setFilterScope] = useState("all");
  const [filterValue, setFilterValue] = useState("");
  const reportRef = React.useRef(null);

  // Real children only: drop demo/test rows and children who have never been
  // screened (callers that already pass only screened children are unaffected).
  const source = useMemo(
    () => (propChildren || []).filter(c => c.dataSource !== "demo" && c.screened !== false),
    [propChildren]
  );
  const schools   = unique(source, "school");
  const districts = unique(source, "district");
  const childOptions = source
    .map(c => ({ value: c.id, label: String(childRef(c)) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const scopeOptions = [
    { value:"all",      label:"All Children" },
    { value:"child",    label:"Child" },
    { value:"school",   label:"School" },
    // Only offered when the data actually has districts.
    ...(districts.length ? [{ value:"district", label:"District" }] : []),
  ];

  const data = useMemo(() => {
    if (!filterValue || filterScope === "all") return source;
    if (filterScope === "child")    return source.filter(c => c.id === filterValue);
    if (filterScope === "school")   return source.filter(c => c.school === filterValue);
    if (filterScope === "district") return source.filter(c => c.district === filterValue);
    return source;
  }, [filterScope, filterValue, source]);

  const total       = data.length;
  const onTrack     = data.filter(c => c.status === STATUS.ON_TRACK).length;
  const progressing = data.filter(c => c.status === STATUS.PROGRESSING).length;
  const concerns    = data.filter(c => c.status === STATUS.CONCERNS).length;
  const notScored   = data.filter(c => c.status === STATUS.NOT_SCORED).length;
  const flaggedList = data.filter(isActiveFlag);
  const avgTotal    = domainAvg(data, "total");
  const schoolSet   = unique(data, "school");
  const langSet     = unique(data, "language");

  const isSingleChild = filterScope === "child" && filterValue && data.length === 1;
  const child = isSingleChild ? data[0] : null;

  const scopeLabel = !filterValue || filterScope === "all"
    ? "All Children · Eastern Cape Pilot"
    : filterScope === "child"    ? `Individual Report · ${child ? childRef(child) : ""}`
    : filterScope === "school"   ? `School Report · ${filterValue}`
    : `District Report · ${filterValue}`;

  const today = new Date().toLocaleDateString("en-ZA", { day:"numeric", month:"long", year:"numeric" });

  const handlePrint = () => {
    if (reportRef.current) {
      printReport(reportRef.current.innerHTML);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;700&display=swap');
        .pb-report-root, .pb-report-root *, .pb-report-root *::before, .pb-report-root *::after { box-sizing: border-box; }
        .pb-report-root { font-family: 'Poppins', sans-serif; color: #111; }
      `}</style>

      <div className="pb-report-root" style={{ minHeight:"100vh", background:"#F2F1EE" }}>

        {/* CONTROL BAR */}
        <div style={{ background:"#fff", borderBottom:"1px solid #E5E5E5", padding:"0 40px" }}>
          <div style={{ maxWidth:1060, margin:"0 auto", padding:"16px 0",
            display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>

            <div style={{ fontWeight:900, fontSize:16, color:"#111", marginRight:12, flexShrink:0 }}>
              The Puzzle Project
            </div>

            <div style={{ width:1, height:28, background:"#E5E5E5", flexShrink:0 }} />

            <FilterSelect
              label="Filter By"
              value={filterScope}
              onChange={v => { setFilterScope(v); setFilterValue(""); }}
              options={scopeOptions}
              placeholder="All children"
            />

            {filterScope === "child" && (
              <FilterSelect label="Child ID" value={filterValue} onChange={setFilterValue}
                options={childOptions} placeholder="Select child…" />
            )}
            {filterScope === "school" && (
              <FilterSelect label="School" value={filterValue} onChange={setFilterValue}
                options={schools.map(s => ({ value: s, label: s }))} placeholder="Select school…" />
            )}
            {filterScope === "district" && (
              <FilterSelect label="District" value={filterValue} onChange={setFilterValue}
                options={districts.map(d => ({ value: d, label: d }))} placeholder="Select district…" />
            )}

            <div style={{ flex:1 }} />

           

            <div style={{ width:1, height:28, background:"#E5E5E5", flexShrink:0 }} />

            {/* PRINT BUTTON — uses new window approach */}
            <button onClick={handlePrint} style={{
              display:"flex", alignItems:"center", gap:7,
              padding:"8px 18px", borderRadius:8,
              background:"#111", color:"#fff", border:"none",
              fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9V2h12v7"/><rect x="6" y="14" width="12" height="8"/>
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              </svg>
              Print / PDF
            </button>
          </div>
        </div>

        {/* REPORT DOCUMENT */}
        <div style={{ maxWidth:1060, margin:"0 auto", padding:"36px 40px" }}>
          <div ref={reportRef} style={{
            background:"#fff", borderRadius:16,
            boxShadow:"0 2px 32px rgba(0,0,0,0.08)", overflow:"hidden",
          }}>

            {/* HEADER */}
            <div style={{ padding:"44px 52px 36px", borderBottom:"1px solid #EBEBEB" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:24 }}>
                <div>
                  <p style={{ margin:"0 0 10px", fontSize:10, fontWeight:800,
                    letterSpacing:"0.12em", textTransform:"uppercase", color:"#AAA" }}>
                    PuzzleBox Screener System
                  </p>
                  <h1 style={{ margin:"0 0 8px", fontSize:34, fontWeight:900, lineHeight:1.05,
                    letterSpacing:"-0.02em", color:"#111" }}>
                    {isSingleChild ? childRef(child) : "Summary Report"}
                  </h1>
                  <p style={{ margin:0, fontSize:13, color:"#888", fontWeight:400 }}>{scopeLabel}</p>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <p style={{ margin:"0 0 4px", fontSize:10, fontWeight:700,
                    letterSpacing:"0.08em", textTransform:"uppercase", color:"#AAA" }}>Generated</p>
                  <p style={{ margin:0, fontSize:13, fontWeight:600, color:"#555" }}>{today}</p>
                  {isSingleChild && (
                    <p style={{ margin:"10px 0 0", fontSize:11, color:"#AAA" }}>
                      Examiner: <strong style={{ color:"#555" }}>{child.examiner}</strong>
                    </p>
                  )}
                </div>
              </div>
              <div style={{ marginTop:28, height:2, width:80, borderRadius:99,
                background:"linear-gradient(90deg,#0E7A6E,#F26522,#E8175D)" }} />
            </div>

            <div style={{ padding:"44px 52px" }}>

              {isSingleChild ? (
                <>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:36 }}>
                    {[
                      ["School",   child.school],
                      ...(child.district ? [["District", child.district]] : []),
                      ["Age",      child.age !== null && child.age !== undefined ? `${child.age} years` : "–"],
                      ["Home language", child.language || "–"],
                      ["Date",     child.date || "–"],
                    ].map(([l,v]) => (
                      <div key={l} style={{ padding:"10px 16px", background:"#F7F7F5",
                        borderRadius:8, border:"1px solid #E8E8E8" }}>
                        <div style={{ fontSize:9, fontWeight:800, letterSpacing:"0.09em",
                          textTransform:"uppercase", color:"#AAA", marginBottom:4 }}>{l}</div>
                        <div style={{ fontSize:13, fontWeight:600, color:"#111" }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"180px 1fr",
                    gap:32, marginBottom:40, alignItems:"start" }}>
                    <div style={{ textAlign:"center", padding:"28px 20px",
                      background:"#F7F7F5", borderRadius:12, border:"1px solid #E8E8E8" }}>
                      <p style={{ margin:"0 0 10px", fontSize:9, fontWeight:800,
                        letterSpacing:"0.1em", textTransform:"uppercase", color:"#AAA" }}>Total Score</p>
                      <div style={{ fontSize:64, fontWeight:900, lineHeight:1,
                        color: statusColor(child.status),
                      }}>{fmtPct(child.total)}</div>
                      <div style={{ marginTop:14 }}><StatusPill status={child.status} /></div>
                      {child.flagged && (
                        <p style={{ margin:"10px 0 0", fontSize:11, color:"#991040", fontWeight:700 }}>
                          Flagged for follow-up
                        </p>
                      )}
                    </div>
                    <div>
                      <p style={{ margin:"0 0 18px", fontSize:10, fontWeight:800,
                        letterSpacing:"0.1em", textTransform:"uppercase", color:"#AAA" }}>
                        Domain Breakdown
                      </p>
                      {DOMAINS.map(d => (
                        <div key={d.key} style={{ marginBottom:14 }}>
                          <p style={{ margin:"0 0 5px", fontSize:12, fontWeight:600, color:"#333" }}>{d.label}</p>
                          <ScoreBar value={child[d.key]} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ margin:"0 0 14px", fontSize:10, fontWeight:800,
                    letterSpacing:"0.1em", textTransform:"uppercase", color:"#AAA" }}>
                    Project Overview
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:40 }}>
                    <StatBox label="Screened"    value={total}          sub={`${schoolSet.length} school${schoolSet.length!==1?"s":""}`} accent="#555" />
                    <StatBox label="On Track"    value={onTrack}        sub={`${pct(onTrack,total)}% of cohort`}     accent="#0E7A6E" />
                    <StatBox label="Progressing" value={progressing}    sub={`${pct(progressing,total)}% of cohort`} accent="#F26522" />
                    <StatBox label="Concerns"    value={concerns}       sub={`${pct(concerns,total)}% of cohort`}    accent="#E8175D" />
                    {notScored > 0 && <StatBox label="Not scored" value={notScored} sub={`${pct(notScored,total)}% of cohort`} accent="#999" />}
                    <StatBox label="Avg Score"   value={fmtPct(avgTotal)} sub="cohort average"                         accent="#888" />
                  </div>

                  <p style={{ margin:"0 0 18px", fontSize:10, fontWeight:800,
                    letterSpacing:"0.1em", textTransform:"uppercase", color:"#AAA" }}>
                    Domain Performance
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", columnGap:52, marginBottom:44 }}>
                    {DOMAINS.map(d => (
                      <div key={d.key} style={{ marginBottom:16 }}>
                        <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:600, color:"#333" }}>{d.label}</p>
                        <ScoreBar value={domainAvg(data, d.key)} />
                      </div>
                    ))}
                  </div>

                  <div style={{ height:1, background:"#EBEBEB", marginBottom:36 }} />
                  
                  <p style={{ margin:"0 0 16px", fontSize:10, fontWeight:800,
                    letterSpacing:"0.1em", textTransform:"uppercase", color:"#AAA" }}>
                    All Screened Children ({total})
                  </p>
                  <div style={{ overflowX:"auto", marginBottom:44 }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                      <thead>
                        <tr style={{ borderBottom:"2px solid #111" }}>
                          {["Child ID","School","Age","Home language","Score","Status","Date"].map(h => (
                            <th key={h} style={{ padding:"8px 12px", textAlign:"left",
                              fontSize:10, fontWeight:800, letterSpacing:"0.07em",
                              textTransform:"uppercase", color:"#666", whiteSpace:"nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((c, i) => (
                          <tr key={c.id} style={{ borderBottom:"1px solid #F0F0F0",
                            background: i%2===0?"#fff":"#FAFAFA" }}>
                            <td style={{ padding:"10px 12px", fontWeight:700, color:"#111" }}>{childRef(c)}</td>
                            <td style={{ padding:"10px 12px", color:"#555" }}>{c.school}</td>
                            <td style={{ padding:"10px 12px", color:"#555" }}>{c.age !== null && c.age !== undefined ? `${c.age} yrs` : "–"}</td>
                            <td style={{ padding:"10px 12px", color:"#555" }}>{c.language}</td>
                            <td style={{ padding:"10px 12px" }}>
                              <span style={{ fontWeight:800,
                                color:statusColor(c.status) }}>
                                {fmtPct(c.total)}
                              </span>
                            </td>
                            <td style={{ padding:"10px 12px" }}><StatusPill status={c.status} /></td>
                            <td style={{ padding:"10px 12px", color:"#AAA", fontStyle:"italic", fontSize:11 }}>{c.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {flaggedList.length > 0 && (
                    <>
                      <div style={{ height:1, background:"#EBEBEB", marginBottom:36 }} />
                      <div className="page-break" />
                      <p style={{ margin:"0 0 16px", fontSize:10, fontWeight:800,
                        letterSpacing:"0.1em", textTransform:"uppercase", color:"#991040" }}>
                        Flagged for Follow-up ({flaggedList.length})
                      </p>
                      <div style={{ display:"grid",
                        gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:12, marginBottom:44 }}>
                        {flaggedList.map(c => (
                          <div key={c.id} style={{ padding:"16px 18px", borderRadius:10,
                            border:"1px solid #F0C0D0", background:"#FEF5F8" }}>
                            <p style={{ margin:"0 0 2px", fontWeight:800, fontSize:13, color:"#111" }}>{childRef(c)}</p>
                            <p style={{ margin:"0 0 10px", fontSize:11, color:"#888" }}>{c.school}</p>
                            <div style={{ fontSize:28, fontWeight:900, color:"#E8175D", lineHeight:1 }}>{fmtPct(c.total)}</div>
                            <div style={{ marginTop:8 }}><StatusPill status={c.status} /></div>
                            <p style={{ margin:"8px 0 0", fontSize:10, color:"#AAA", fontStyle:"italic" }}>{c.date}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div style={{ height:1, background:"#EBEBEB", marginBottom:32 }} />
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:32, marginBottom:8 }}>
                    {[["Schools Covered", schoolSet], ["Home Languages", langSet]].map(([lbl, set]) => (
                      <div key={lbl}>
                        <p style={{ margin:"0 0 12px", fontSize:10, fontWeight:800,
                          letterSpacing:"0.1em", textTransform:"uppercase", color:"#AAA" }}>{lbl}</p>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                          {set.map(s => (
                            <span key={s} style={{ fontSize:11, fontWeight:600, color:"#444",
                              background:"#F0F0EE", padding:"4px 10px", borderRadius:6,
                              border:"1px solid #E5E5E5" }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div style={{ height:1, background:"#EBEBEB", margin:"40px 0 28px" }} />
              <div style={{ display:"flex", gap:14, padding:"16px 20px",
                background:"#FEF5F8", borderRadius:10, border:"1px solid #F0C0D0", marginBottom:16 }}>
                <span style={{ fontSize:16, flexShrink:0, lineHeight:1.4 }}><Doodle name="warning" size={18} /></span>
                <p style={{ margin:0, fontSize:11, color:"#880030", lineHeight:1.8 }}>
                  <strong>Disclaimer:</strong> Scores are the percentage of the available points earned (not percentiles)
                  and are simplified summaries only. Results must not be interpreted as clinical
                  diagnoses. Children are identified by student number only.
                </p>
              </div>
              <p style={{ margin:0, fontSize:11, color:"#AAA", lineHeight:1.9 }}>
                Data collected as part of the PuzzleBox Screener standardisation phase and is intended
                to support evidence-based funding applications and programme evaluation.
              </p>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}