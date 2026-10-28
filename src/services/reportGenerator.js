import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { DOMAIN_BENCHMARK, STATUS, isActiveFlag, avgOf } from "./analyticsData";

const BRAND = {
  teal: [0, 155, 141],
  pink: [232, 23, 93],
  purple: [107, 47, 138],
  orange: [242, 101, 34],
  dark: [26, 26, 46],
  gray: [90, 90, 90],
  lightGray: [245, 245, 245],
  white: [255, 255, 255],
};

const DOMAIN_KEYS = [
  "cognitive",
  "motor",
  "language_score",
  "social",
  "emotion",
  "moral",
];

// DOMAIN_BENCHMARK is shared with the on-screen dashboards (analyticsData.js).
const PAGE_HEIGHT = 297;
const BOTTOM_MARGIN = 18;

function ensurePageSpace(doc, y, needed = 30) {
  if (y + needed > PAGE_HEIGHT - BOTTOM_MARGIN) {
    doc.addPage();
    return 20;
  }
  return y;
}

// Average of a domain over a group; null when no child in the group has a
// score for it (shown as "–", never as a fake 0%).
function domainAvgForGroup(group, key) {
  return avgOf(group, key);
}

const pctText = v => (v === null || v === undefined ? "–" : `${v}%`);

// "#E8175D" -> [232, 23, 93]. jsPDF needs numbers; spreading the hex string
// produced a corrupt colour operator in the PDF.
function toRgb(color) {
  if (Array.isArray(color)) return color;
  const m = /^#?([0-9a-f]{6})$/i.exec(String(color || "").trim());
  if (!m) return BRAND.teal;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const labelOf = v => (v === null || v === undefined || v === "" ? "Unknown" : String(v));

function getGroups(children, compareMode) {
  if (compareMode === "school") {
    return [...new Set(children.map(c => c.school).filter(Boolean))];
  }

  if (compareMode === "age") {
    return [...new Set(children.map(c => c.age).filter(a => a !== null && a !== undefined && a !== ""))].sort((a, b) => a - b);
  }

  if (compareMode === "gender") {
    return [...new Set(children.map(c => c.gender).filter(Boolean))];
  }

  if (compareMode === "language") {
    return [...new Set(children.map(c => c.language).filter(Boolean))];
  }

  return [];
}

function getGroupFilter(children, compareMode, g) {
  if (compareMode === "school") {
    return children.filter(c => c.school === g);
  }

  if (compareMode === "age") {
    return children.filter(c => c.age === g);
  }

  if (compareMode === "gender") {
    return children.filter(c => c.gender === g);
  }

  if (compareMode === "language") {
    return children.filter(c => c.language === g);
  }

  return children;
}

function genderLabel(g) {
  if (g === "F") return "Female";
  if (g === "M") return "Male";
  return g;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF EXPORT
// ─────────────────────────────────────────────────────────────────────────────
// `lang` is accepted for API compatibility; the PDF is English only.
export function downloadPDF({ children, compareMode, insights }) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 0;

  // HEADER
  doc.setFillColor(...BRAND.teal);
  doc.rect(0, 0, pageW, 28, "F");

  doc.setTextColor(...BRAND.white);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("The Puzzle Project", margin, 11);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Puzzle Box Screener — Overview Report", margin, 18);

  const today = new Date().toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  doc.setFontSize(8);
  doc.text(`Generated: ${today}`, pageW - margin, 18, {
    align: "right",
  });

  y = 34;

  // REPORT CONTEXT
  doc.setTextColor(...BRAND.dark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Eastern Cape Pilot · All Screened Children", margin, y);

  const compareModeLabel =
    compareMode === "overall"
      ? "Overall view"
      : compareMode === "school"
      ? "Compared by school"
      : compareMode === "age"
      ? "Compared by age"
      : compareMode === "gender"
      ? "Compared by gender"
      : "Compared by language";

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.gray);
  doc.text(`View: ${compareModeLabel}`, margin, y + 5);

  y += 14;

  // SUMMARY SECTION
  const total = children.length;
  const flagged = children.filter(isActiveFlag).length;
  const onTrack = children.filter(c => c.status === STATUS.ON_TRACK).length;
  const progressing = children.filter(c => c.status === STATUS.PROGRESSING).length;
  const concerns = children.filter(
    c => c.status === STATUS.CONCERNS
  ).length;
  const notScored = children.filter(c => c.status === STATUS.NOT_SCORED).length;

  const avgScore = avgOf(children, "total") ?? 0;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("Summary", margin, y);

  y += 4;

  const kpiBoxW = (pageW - margin * 2 - 9) / 4;
  const kpiH = 18;

  const kpis = [
    {
      label: "Total Screened",
      value: String(total),
      color: BRAND.teal,
    },
    {
      label: "Flagged",
      value: String(flagged),
      color: BRAND.pink,
    },
    {
      label: "On Track",
      value: String(onTrack),
      color: BRAND.teal,
    },
    {
      label: "Avg Score",
      value: `${avgScore}%`,
      color: BRAND.orange,
    },
  ];

  kpis.forEach((k, i) => {
    const x = margin + i * (kpiBoxW + 3);

    doc.setFillColor(...BRAND.lightGray);
    doc.roundedRect(x, y, kpiBoxW, kpiH, 2, 2, "F");

    doc.setFillColor(...k.color);
    doc.rect(x, y, 2.5, kpiH, "F");

    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...k.color);
    doc.text(k.value, x + kpiBoxW / 2, y + 10, {
      align: "center",
    });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.gray);
    doc.text(k.label, x + kpiBoxW / 2, y + 15, {
      align: "center",
    });
  });

  y += kpiH + 8;

  // STATUS BREAKDOWN
  const onTrackPct = total
    ? Math.round((onTrack / total) * 100)
    : 0;

  const progressingPct = total
    ? Math.round((progressing / total) * 100)
    : 0;

  const concernsPct = total
    ? Math.round((concerns / total) * 100)
    : 0;

  doc.setFontSize(8);
  doc.setTextColor(...BRAND.gray);

  doc.text(
    `On Track: ${onTrack} (${onTrackPct}%)    Progressing: ${progressing} (${progressingPct}%)    Developmental Concerns: ${concerns} (${concernsPct}%)` +
      (notScored ? `    Not scored: ${notScored}` : ""),
    margin,
    y
  );

  y += 10;

  // KEY INSIGHTS
  if (insights && insights.length > 0) {
    y = ensurePageSpace(doc, y, 50);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    doc.text("Key Insights", margin, y);

    y += 5;

    insights.forEach(ins => {
      const wrapped = doc.splitTextToSize(
        ins.text,
        pageW - margin * 2 - 12
      );

      const boxHeight = Math.max(10, wrapped.length * 4 + 4);

      y = ensurePageSpace(doc, y, boxHeight + 6);

      doc.setFillColor(...BRAND.lightGray);
      doc.roundedRect(
        margin,
        y,
        pageW - margin * 2,
        boxHeight,
        1,
        1,
        "F"
      );

      doc.setFillColor(...toRgb(ins.color));
      doc.rect(margin, y, 2.5, boxHeight, "F");

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.dark);

      doc.text(wrapped, margin + 6, y + 5);

      y += boxHeight + 4;
    });
  }

  // DOMAIN PERFORMANCE
  y = ensurePageSpace(doc, y, 60);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("Domain Performance", margin, y);

  y += 3;

  const domainNames = [
    "Cognitive",
    "Fine Motor",
    "Language",
    "Social",
    "Emotion",
    "Moral",
  ];

  if (compareMode === "overall") {
    const rows = DOMAIN_KEYS.map((key, i) => {
      const val = domainAvgForGroup(children, key);

      return [
        domainNames[i],
        pctText(val),
        `${DOMAIN_BENCHMARK}%`,
        val === null
          ? "No data"
          : val >= DOMAIN_BENCHMARK
          ? "At or above benchmark"
          : `${DOMAIN_BENCHMARK - val}% below benchmark`,
      ];
    });

    autoTable(doc, {
      startY: y,

      head: [["Domain", "Score", "Benchmark", "Status"]],

      body: rows,

      pageBreak: "auto",
      rowPageBreak: "avoid",

      margin: {
        left: margin,
        right: margin,
      },

      styles: {
        cellPadding: 3,
        overflow: "linebreak",
        valign: "middle",
        fontSize: 8,
        textColor: BRAND.dark,
      },

      headStyles: {
        fillColor: BRAND.teal,
        textColor: BRAND.white,
        fontStyle: "bold",
      },

      alternateRowStyles: {
        fillColor: BRAND.lightGray,
      },

      columnStyles: {
        0: {
          cellWidth: 40,
        },

        1: {
          cellWidth: 25,
          halign: "center",
        },

        2: {
          cellWidth: 25,
          halign: "center",
        },
      },

      didParseCell: data => {
        if (data.column.index === 3 && data.section === "body") {
          const val = parseFloat(data.row.cells[1].raw);

          data.cell.styles.textColor =
            Number.isNaN(val)
              ? BRAND.gray
              : val >= DOMAIN_BENCHMARK
              ? BRAND.teal
              : BRAND.pink;
        }
      },

      theme: "plain",
    });
  } else {
    const groups = getGroups(children, compareMode);

    const groupedData = {};

    groups.forEach(g => {
      groupedData[g] = getGroupFilter(children, compareMode, g);
    });

    const head = [[
      "Domain",
      ...groups.map(g =>
        compareMode === "gender"
          ? genderLabel(g)
          : String(g)
      ),
    ]];

    const rows = DOMAIN_KEYS.map((key, i) => {
      const groupVals = groups.map(g => {
        return pctText(domainAvgForGroup(groupedData[g], key));
      });

      return [domainNames[i], ...groupVals];
    });

    autoTable(doc, {
      startY: y,

      head,

      body: rows,

      pageBreak: "auto",
      rowPageBreak: "avoid",

      margin: {
        left: margin,
        right: margin,
      },

      styles: {
        cellPadding: 3,
        overflow: "linebreak",
        valign: "middle",
        fontSize: 8,
        textColor: BRAND.dark,
      },

      headStyles: {
        fillColor: BRAND.teal,
        textColor: BRAND.white,
        fontStyle: "bold",
      },

      alternateRowStyles: {
        fillColor: BRAND.lightGray,
      },

      theme: "plain",
    });
  }

  y = doc.lastAutoTable.finalY + 10;

  // SCHOOL BREAKDOWN
  y = ensurePageSpace(doc, y, 60);

  const schoolCounts = {};

  children.forEach(c => {
    const k = labelOf(c.school);
    schoolCounts[k] = (schoolCounts[k] || 0) + 1;
  });

  const schoolRows = Object.entries(schoolCounts).map(
    ([name, count]) => {
      const group = children.filter(c => labelOf(c.school) === name);

      const concernRate = group.length
        ? Math.round(
            (
              group.filter(
                c => c.status === STATUS.CONCERNS
              ).length /
              group.length
            ) * 100
          )
        : 0;

      return [name, String(count), `${concernRate}%`];
    }
  );

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("Schools & Regions", margin, y);

  y += 3;

  autoTable(doc, {
    startY: y,

    head: [["School", "Children Screened", "Concern Rate"]],

    body: schoolRows,

    pageBreak: "auto",
    rowPageBreak: "avoid",

    margin: {
      left: margin,
      right: margin,
    },

    styles: {
      cellPadding: 3,
      overflow: "linebreak",
      valign: "middle",
      fontSize: 8,
      textColor: BRAND.dark,
    },

    headStyles: {
      fillColor: BRAND.purple,
      textColor: BRAND.white,
      fontStyle: "bold",
    },

    alternateRowStyles: {
      fillColor: BRAND.lightGray,
    },

    theme: "plain",
  });

  y = doc.lastAutoTable.finalY + 10;

  // LANGUAGE BREAKDOWN
  y = ensurePageSpace(doc, y, 60);

  const langCounts = {};

  children.forEach(c => {
    const k = labelOf(c.language);
    langCounts[k] = (langCounts[k] || 0) + 1;
  });

  const langRows = Object.entries(langCounts).map(
    ([name, count]) => [
      name,
      String(count),
      `${total ? Math.round((count / total) * 100) : 0}%`,
    ]
  );

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("Home Language", margin, y);

  y += 3;

  autoTable(doc, {
    startY: y,

    head: [["Language", "Children", "Percentage"]],

    body: langRows,

    pageBreak: "auto",
    rowPageBreak: "avoid",

    margin: {
      left: margin,
      right: margin,
    },

    styles: {
      cellPadding: 3,
      overflow: "linebreak",
      valign: "middle",
      fontSize: 8,
      textColor: BRAND.dark,
    },

    headStyles: {
      fillColor: BRAND.orange,
      textColor: BRAND.white,
      fontStyle: "bold",
    },

    alternateRowStyles: {
      fillColor: BRAND.lightGray,
    },

    theme: "plain",
  });

  // FOOTER
  const pageCount = doc.internal.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    const footerY = PAGE_HEIGHT - 4;

    doc.setDrawColor(220);
    doc.line(margin, footerY - 5, pageW - margin, footerY - 5);

    doc.setFillColor(...BRAND.lightGray);
    doc.rect(0, PAGE_HEIGHT - 10, pageW, 10, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.gray);

    doc.text(
      "The Puzzle Project · Confidential · Not for distribution",
      margin,
      footerY
    );

    doc.text(
      `Page ${i} of ${pageCount}`,
      pageW - margin,
      footerY,
      {
        align: "right",
      }
    );
  }

  doc.save(
    `PuzzleProject_Report_${today.replace(/ /g, "_")}.pdf`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function downloadExcel({ children, compareMode }) {
  const wb = XLSX.utils.book_new();

  const domainNames = [
    "Cognitive",
    "Fine Motor",
    "Language",
    "Social",
    "Emotion",
    "Moral",
  ];

  // METADATA
  const meta = [
    ["Project", "The Puzzle Project"],
    ["Province", "Eastern Cape"],
    ["Generated", new Date().toISOString()],
    ["Compare Mode", compareMode],
    ["Total Children", children.length],
  ];

  const wsMeta = XLSX.utils.aoa_to_sheet(meta);
  XLSX.utils.book_append_sheet(wb, wsMeta, "Metadata");

  // SUMMARY
  const total = children.length;
  const flagged = children.filter(isActiveFlag).length;
  const onTrack = children.filter(c => c.status === STATUS.ON_TRACK).length;
  const progressing = children.filter(c => c.status === STATUS.PROGRESSING).length;
  const concerns = children.filter(c => c.status === STATUS.CONCERNS).length;
  const notScored = children.filter(c => c.status === STATUS.NOT_SCORED).length;

  const avgScore = avgOf(children, "total") ?? 0;

  const summaryData = [
    ["The Puzzle Project — Overview Report"],
    [`Generated: ${new Date().toLocaleDateString("en-ZA")}`],
    [],
    ["Metric", "Value"],
    ["Total Screened", total],
    ["Flagged", flagged],
    ["On Track", onTrack],
    ["Progressing", progressing],
    ["Developmental Concerns", concerns],
    ["Not Scored", notScored],
    ["Average Score (%)", avgScore],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // DOMAIN PERFORMANCE
  let domainSheetData;

  if (compareMode === "overall") {
    domainSheetData = [
      ["Domain", "Average Score (%)", "Benchmark (%)", "Status"],

      ...DOMAIN_KEYS.map((key, i) => {
        const val = domainAvgForGroup(children, key);

        return [
          domainNames[i],
          val,
          DOMAIN_BENCHMARK,
          val === null ? "No data" : val >= DOMAIN_BENCHMARK ? "At or above" : "Below",
        ];
      }),
    ];
  } else {
    const groups = getGroups(children, compareMode);

    domainSheetData = [
      [
        "Domain",
        ...groups.map(g =>
          compareMode === "gender"
            ? genderLabel(g)
            : String(g)
        ),
      ],

      ...DOMAIN_KEYS.map((key, i) => [
        domainNames[i],

        ...groups.map(g =>
          domainAvgForGroup(
            getGroupFilter(children, compareMode, g),
            key
          )
        ),
      ]),
    ];
  }

  const wsDomains = XLSX.utils.aoa_to_sheet(domainSheetData);

  XLSX.utils.book_append_sheet(wb, wsDomains, "Domain Performance");

 // CHILDREN DATA
// Build one row per child for the "Children Data" sheet of the Excel export.
// There is deliberately no name column: each child appears only under a
// coded ID plus anonymous details, so the file is safe to share with sponsors.

 
  const childRows = children.map((c, i) => ({

      // The child's coded ID. If a child has none, a fallback like C001 is made
  // from their position in the list, so every row is still identifiable.
    "Child ID": c.studentNumber || `C${String(i + 1).padStart(3, "0")}`,

     // Background details used for the analytics, with no personal identity.
    Age: c.age,
    Gender: c.gender,
    School: c.school,
    "Home Language": c.language,

      // Overall result: status, total score, and whether the child was flagged
  // for follow-up (shown as Yes/No instead of true/false).
    Status: c.status,
    "Total Score": c.total ?? "",
    Flagged: isActiveFlag(c) ? "Yes" : "No",

     // Score for each developmental domain.
    Cognitive: c.cognitive ?? "",
    "Fine Motor": c.motor ?? "",
    "Language Score": c.language_score ?? "",
    Social: c.social ?? "",
    Emotion: c.emotion ?? "",
    Moral: c.moral ?? "",

    // The date the child was screened.
    Date: c.date,
  }));

  const wsChildren = XLSX.utils.json_to_sheet(childRows);

  XLSX.utils.book_append_sheet(wb, wsChildren, "Children Data");

  XLSX.writeFile(
    wb,
    `PuzzleProject_Data_${new Date()
      .toLocaleDateString("en-ZA")
      .replace(/\//g, "-")}.xlsx`
  );
}