// TeacherHome.js
//
// Teacher/Educator home screen.
//
// IMPORTANT:
// - Teachers can see Student Records from the shared `children` table.
// - Existing students are NOT filtered by examiner name, so records created
//   by psychologists/admins will also appear.
// - Teachers do NOT get access to the full Psychologist/Admin analytics.
// - Teachers can add new students.
// - Teachers can view individual student records.
// - PuzzleBox Screener remains available as its own flow.
// - Messages continue to come from the existing Firestore `messages`
//   collection.

import React, { useState, useEffect, useMemo } from "react";
import Doodle from "../shared/Doodle";
import { supabase } from "../../services/supabaseClient";
import { mapChildRow, mapPuzzleboxScreeningRow, mapMessageRow } from "../../utils/mappers";
import { uploadAndVerifyConsentForm, requestManualConsentReview, isOverloadNote } from "../../services/consentForms";

import RoleSidebar from "../shared/RoleSidebar";
import RoleHero from "../shared/RoleHero";
import StatRing from "../analytics/StatRing";
import TodayList from "../shared/TodayList";
// ScreenerWithOffline renders the normal PuzzleBoxScreener when online, and
// the offline screener (downloaded, encrypted copy) when there's no signal or
// the teacher chooses "Screen offline" on the home page card.
import ScreenerWithOffline from "../../offline/ScreenerWithOffline";
import OfflineReadyCard from "../../offline/OfflineReadyCard";

import "./TeacherHome.css";
import "../shared/RoleHomeKit.css";


// ============================================================
// STAGE COLOURS
// ============================================================

const stageColors = {
  stage1: {
    bg: "#F0EDF8",
    color: "#6B2F8A",
  },
  stage2: {
    bg: "#FEF0E7",
    color: "#F26522",
  },
  stage3: {
    bg: "#FCE6EE",
    color: "#E8175D",
  },
  stage4: {
    bg: "#E0F5F3",
    color: "#009B8D",
  },
};

const sessionStatusColors = {
  in_progress: { bg: "#FEF0E7", color: "#F26522" },
  awaiting_review: { bg: "#F0EDF8", color: "#6B2F8A" },
  reviewed: { bg: "#E0F5F3", color: "#009B8D" },
};


// ============================================================
// FORM STYLES
// ============================================================

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  border: "1.5px solid var(--border)",
  borderRadius: 10,
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  background: "#fff",
};

const labelStyle = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  color: "var(--ink-mid)",
  display: "block",
  marginBottom: 5,
};


// ============================================================
// TRANSLATIONS
// ============================================================

const T = {
  en: {
    roleLabel: "Educator",

    navHome: "My Home",
    navMessages: "Messages",
    navScreener: "PuzzleBox Screener",
    navProfile: "My Profile",
    navStudents: "My Students",
    navHistory: "Screening History",

    screenerSub:
      "Start a new PuzzleBox screening for one of your children.",

    historySub:
      "Your completed and in-progress PuzzleBox screenings.",

    statInProgress: "In Progress",
    statCompleted: "Completed",

    screen: "Screen",
    resume: "Resume",
    startResume: "Start / Resume Screening",

    statusInProgress: "In progress",
    statusAwaitingReview: "Awaiting review",
    statusReviewed: "Reviewed",
    startedOn: "Started",

    historyEmptyTitle: "No screenings yet",
    historyEmptySub:
      "Screenings you start or complete for your class will show up here.",

    viewHistory: "Screening History",
    viewHistorySub:
      "See what's done and what's still open.",

    flagsTitle: "Flags in My Class",
    flagsCardSub: "Children flagged for follow-up.",
    flagsEmptyTitle: "No flags right now",
    flagsEmptySub:
      "Flagged children from your class will appear here.",

    openScreener: "Start Screening",
    openScreenerSub:
      "Begin a new PuzzleBox Screener session.",

    addStudent: "Add New Student",
    addStudentSub:
      "Register a new child in the PuzzleBox system.",

    addStudentTitle: "Add New Student",
    editChild: "Edit Child",
    deleteChild: "Delete Child Record",

    childNameLabel: "Child ID",
    schoolLabel: "School",
    ageLabel: "Age",
    genderLabel: "Gender",
    langLabel: "Language",
    examinerLabel: "Examiner",
    dateLabel: "Date",
    stageLabel: "Stage",

    save: "Save",
    cancel: "Cancel",

    stage1: "Not Started",
    stage2: "Registered",
    stage3: "Processing",
    stage4: "Completed",

    duplicateWarning:
      "A child with this name already exists",

    duplicateDetail:
      "already exists in the database. Please check before adding.",

    viewStudents: "My Class",
    viewStudentsSub:
      "View and screen the children in your own class.",

    myStudents: "My Class",
    myStudentsSub: "Children you added or screened — not the full PuzzleBox dataset.",
  
      

    filterStatus: "All Stages",

    showing: "Showing",
    of: "of",
    childrenCountWord: "students",

    actions: "Actions",
    childNameCol: "Child",
    stageCol: "Stage",

    noResults: "No students found",
    noResultsSub:
      "Student records will appear here.",

    section1: "Overview",
    section2: "Screenings & Records",
    section3: "Account",

    goodMorning: "Good morning",
    goodAfternoon: "Good afternoon",
    goodEvening: "Good evening",

    homeSub:
      "Here's what's new for your class.",

    messagesSub:
      "Diagnosis reports sent to you by the screening psychologist.",

    profileSub:
      "Your account details and verification status.",

    statMessages: "Messages Received",
    statFlagged: "Children Flagged",
    statMonth: "This Month",

    recentMessages: "Recent Messages",
    viewAll: "View all",

    noMessages: "No messages yet",
    noMessagesSub:
      "When a psychologist sends you a diagnosis report, it will appear here.",

    quickLinks: "Quick Links",

    search:
      "Search by child or school...",

    messagesWord: "messages",

    view: "View",
    school: "School",
    score: "Score",
    sentOn: "Sent on",
    language: "Language",

    diagnosis: "Diagnosis Summary",
    domainScores: "Domain Scores",

    cognitive: "Cognitive",
    motor: "Fine Motor",
    social: "Social",
    emotion: "Emotion",

    close: "Close",

    profileName: "Full Name",
    profileEmail: "Email Address",
    profileRole: "Role",
    profileStaff: "Staff / Teacher Number",
    profileStatus: "Verification Status",
    verified: "Verified",

    recordDetails: "Student Record",
    status: "Status",
    province: "Province",
    examiner: "Examiner",
    screeningScore: "Screening Score",

    lang_en: "English",
    lang_af: "Afrikaans",
    lang_xh: "isiXhosa",
  },

  af: {
    roleLabel: "Opvoeder",

    navHome: "My Tuisblad",
    navMessages: "Boodskappe",
    navScreener: "PuzzleBox Sifter",
    navProfile: "My Profiel",
    navStudents: "Studentrekords",
    navHistory: "Siftingsgeskiedenis",

    screenerSub:
      "Begin 'n nuwe PuzzleBox-sifting vir een van jou kinders.",

    historySub:
      "Jou voltooide en aan-die-gang PuzzleBox-siftings.",

    statInProgress: "Aan die Gang",
    statCompleted: "Voltooi",

    screen: "Sif",
    resume: "Hervat",
    startResume: "Begin / Hervat Sifting",

    statusInProgress: "Aan die gang",
    statusAwaitingReview: "Wag vir Hersiening",
    statusReviewed: "Hersien",
    startedOn: "Begin",

    historyEmptyTitle: "Nog geen siftings nie",
    historyEmptySub:
      "Siftings wat jy vir jou klas begin of voltooi, sal hier verskyn.",

    viewHistory: "Siftingsgeskiedenis",
    viewHistorySub:
      "Sien wat klaar is en wat nog oop is.",

    flagsTitle: "Vlae in My Klas",
    flagsCardSub: "Kinders gevlag vir opvolging.",
    flagsEmptyTitle: "Geen vlae op die oomblik nie",
    flagsEmptySub:
      "Gevlagde kinders uit jou klas sal hier verskyn.",

    openScreener: "Begin Sifting",
    openScreenerSub:
      "Begin 'n nuwe PuzzleBox Sifter-sessie.",

    addStudent: "Voeg Nuwe Student By",
    addStudentSub:
      "Registreer 'n nuwe kind in die PuzzleBox-stelsel.",

    addStudentTitle: "Voeg Nuwe Student By",
    editChild: "Wysig Kind",
    deleteChild: "Skrap Kindrekord",

    childNameLabel: "Kind ID",
    schoolLabel: "Skool",
    ageLabel: "Ouderdom",
    genderLabel: "Geslag",
    langLabel: "Taal",
    examinerLabel: "Ondersoeker",
    dateLabel: "Datum",
    stageLabel: "Stadium",

    save: "Stoor",
    cancel: "Kanselleer",

    stage1: "Nie Begin Nie",
    stage2: "Geregistreer",
    stage3: "Verwerk",
    stage4: "Voltooi",

    duplicateWarning:
      "'n Kind met hierdie naam bestaan reeds",

    duplicateDetail:
      "bestaan reeds in die databasis. Maak asseblief seker voor jy byvoeg.",

    viewStudents: "My Klas",
    viewStudentsSub:
      "Sien en sif die kinders in jou eie klas.",

    myStudents: "My Klas",
    myStudentsSub:
      "Kinders wat deur jou bygevoeg of gesif is — nie die volle PuzzleBox-datastel nie.",

    filterStatus: "Alle Stadiums",

    showing: "Wys",
    of: "van",
    childrenCountWord: "studente",

    actions: "Aksies",
    childNameCol: "Kind",
    stageCol: "Stadium",

    noResults: "Geen studente gevind nie",
    noResultsSub:
      "Studentrekords sal hier verskyn.",

    section1: "Oorsig",
    section2: "Sifting & Rekords",
    section3: "Rekening",

    goodMorning: "Goeie môre",
    goodAfternoon: "Goeie middag",
    goodEvening: "Goeie naand",

    homeSub:
      "Hier is wat nuut is vir jou klas.",

    messagesSub:
      "Diagnoseverslae wat die sielkundige aan jou gestuur het.",

    profileSub:
      "Jou rekeningbesonderhede en verifikasiestatus.",

    statMessages: "Boodskappe Ontvang",
    statFlagged: "Kinders Gevlag",
    statMonth: "Hierdie Maand",

    recentMessages: "Onlangse Boodskappe",
    viewAll: "Sien almal",

    noMessages: "Nog geen boodskappe",
    noMessagesSub:
      "Wanneer 'n sielkundige 'n diagnoseverslag stuur, verskyn dit hier.",

    quickLinks: "Vinnige Skakels",

    search:
      "Soek volgens kind of skool...",

    messagesWord: "boodskappe",

    view: "Sien",
    school: "Skool",
    score: "Punt",
    sentOn: "Gestuur op",
    language: "Taal",

    diagnosis: "Diagnose Opsomming",
    domainScores: "Domeinpunte",

    cognitive: "Kognitief",
    motor: "Fyn Motories",
    social: "Sosiaal",
    emotion: "Emosie",

    close: "Maak Toe",

    profileName: "Volle Naam",
    profileEmail: "E-pos",
    profileRole: "Rol",
    profileStaff: "Personeel- / Onderwysernommer",
    profileStatus: "Verifikasiestatus",
    verified: "Geverifieer",

    recordDetails: "Studentrekord",
    status: "Status",
    province: "Provinsie",
    examiner: "Ondersoeker",
    screeningScore: "Siftingspunt",

    lang_en: "Engels",
    lang_af: "Afrikaans",
    lang_xh: "isiXhosa",
  },

  xh: {
    roleLabel: "uThishala",

    navHome: "Ikhaya Lam",
    navMessages: "Imiyalezo",
    navScreener: "Isikrini se-PuzzleBox",
    navProfile: "Iprofayile Yam",
    navStudents: "Iirekhodi Zabafundi",
    navHistory: "Imbali Yokuhlolwa",

    screenerSub:
      "Qalisa uhlolo lwe-PuzzleBox olutsha lomnye wabantwana bakho.",

    historySub:
      "Uhlolo lwakho olugqityiweyo nolusaqhubekayo lwe-PuzzleBox.",

    statInProgress: "Iyaqhubeka",
    statCompleted: "Igqityiwe",

    screen: "Hlola",
    resume: "Qhubeka",
    startResume: "Qalisa / Qhubeka Uhlolo",

    statusInProgress: "Iyaqhubeka",
    statusAwaitingReview: "Ilinde Ukuhlolwa",
    statusReviewed: "Ihloliwe",
    startedOn: "Kuqalisiwe",

    historyEmptyTitle: "Akukho zohlolo okwangoku",
    historyEmptySub:
      "Uhlolo oluqalisayo okanye oluqgibayo lweklasi yakho luya kubonakala apha.",

    viewHistory: "Imbali Yokuhlolwa",
    viewHistorySub:
      "Bona okugqityiweyo nokusavulekileyo.",

    flagsTitle: "Izikhombisi Kwiklasi Yam",
    flagsCardSub: "Abantwana abakhonjiweyo ukuze balandelwe.",
    flagsEmptyTitle: "Akukho zikhombisi okwangoku",
    flagsEmptySub:
      "Abantwana abakhonjiweyo kwiklasi yakho baya kubonakala apha.",

    openScreener: "Qalisa Uhlolo",
    openScreenerSub:
      "Qalisa iseshoni entsha ye-PuzzleBox Screener.",

    addStudent: "Yongeza Umfundi Omtsha",
    addStudentSub:
      "Bhalisa umntwana omtsha kwinkqubo yePuzzleBox.",

    addStudentTitle: "Yongeza Umfundi Omtsha",
    editChild: "Hlela Umntwana",
    deleteChild: "Cima Irekhodi Lomntwana",

    childNameLabel: "ID Yomntwana",
    schoolLabel: "Isikolo",
    ageLabel: "Ubudala",
    genderLabel: "Isini",
    langLabel: "Ulwimi",
    examinerLabel: "Umhloli",
    dateLabel: "Umhla",
    stageLabel: "Inqanaba",

    save: "Gcina",
    cancel: "Rhoxisa",

    stage1: "Ayikaqaliswa",
    stage2: "Ibhalisiwe",
    stage3: "Iyaqhubeka",
    stage4: "Igqityiwe",

    duplicateWarning:
      "Umntwana onegama elifanayo sele ekhona",

    duplicateDetail:
      "sele ekhona kwidatabase. Nceda ujonge phambi kokongeza.",

    viewStudents: "Iklasi Yam",
    viewStudentsSub:
      "Jonga uze uhlole abantwana abakwiklasi yakho.",

    myStudents: "Iklasi Yam",
    myStudentsSub:
      "Abantwana abongezwe okanye abahlolwe nguwe — hayi yonke idatha yePuzzleBox.",

    filterStatus: "Onke Amanqanaba",

    showing: "Ibonisa",
    of: "kwi",
    childrenCountWord: "abafundi",

    actions: "Izenzo",
    childNameCol: "Umntwana",
    stageCol: "Inqanaba",

    noResults: "Akukho bafundi bafunyenweyo",
    noResultsSub:
      "Iirekhodi zabafundi ziya kubonakala apha.",

    section1: "Uhlolo",
    section2: "Ukuhlolwa & Iirekhodi",
    section3: "Iakhawunti",

    goodMorning: "Molo",
    goodAfternoon: "Molo Emini",
    goodEvening: "Molo Ngokuhlwa",

    homeSub:
      "Nazi iindaba ezintsha zeklasi yakho.",

    messagesSub:
      "Iingxelo zohlolo ezithunyelwe nguSazi Sengqondo.",

    profileSub:
      "Iinkcukacha zeakhawunti yakho nemeko yokuqinisekiswa.",

    statMessages: "Imiyalezo Efunyenweyo",
    statFlagged: "Abantwana Abakhonjiweyo",
    statMonth: "Le Nyanga",

    recentMessages: "Imiyalezo Yamva Nje",
    viewAll: "Jonga Yonke",

    noMessages: "Akukho miyalezo",
    noMessagesSub:
      "Xa isazi sengqondo sithumela ingxelo, izakuvela apha.",

    quickLinks: "Amakhonkco Akhawulezayo",

    search:
      "Khangela ngomntwana okanye isikolo...",

    messagesWord: "imiyalezo",

    view: "Jonga",
    school: "Isikolo",
    score: "Amanqaku",
    sentOn: "Ithunyelwe ngo",
    language: "Ulwimi",

    diagnosis: "Isishwankathelo Sohlolo",
    domainScores: "Amanqaku eMihlaba",

    cognitive: "Ukucinga",
    motor: "Amandla",
    social: "Uluntu",
    emotion: "Imvakalelo",

    close: "Vala",

    profileName: "Igama Elipheleleyo",
    profileEmail: "I-imeyile",
    profileRole: "Indima",
    profileStaff: "Inombolo Yomsebenzi",
    profileStatus: "Imeko Yokuqinisekiswa",
    verified: "Kuqinisekisiwe",

    recordDetails: "Irekhodi Yomfundi",
    status: "Imeko",
    province: "Iphondo",
    examiner: "Umhloli",
    screeningScore: "Amanqaku Ohlolo",

    lang_en: "IsiNgesi",
    lang_af: "IsiBhulu",
    lang_xh: "IsiXhosa",
  },
};


// ============================================================
// DOMAIN COLOURS
// ============================================================

const domainColors = {
  cognitive: "#009B8D",
  motor: "#6B2F8A",
  social: "#E8175D",
  emotion: "#F26522",
};


// ============================================================
// NAVIGATION ICONS
// ============================================================

const NAV_ICONS = {
  home: (
    <svg viewBox="0 0 16 16" fill="none">
      <path
        d="M2 7l6-5 6 5v7a1 1 0 01-1 1h-3v-4H6v4H3a1 1 0 01-1-1V7z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),

  messages: (
    <svg viewBox="0 0 16 16" fill="none">
      <rect
        x="1.5"
        y="3"
        width="13"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M2 4l6 5 6-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),

  profile: (
    <svg viewBox="0 0 16 16" fill="none">
      <circle
        cx="8"
        cy="5"
        r="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),

  history: (
    <svg viewBox="0 0 16 16" fill="none">
      <path
        d="M2.5 8a5.5 5.5 0 1 1 1.7 3.97"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M1.5 5.5v3h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 4.75V8l2.5 1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),

  screener: (
    <svg viewBox="0 0 16 16" fill="none">
      <rect
        x="1.5"
        y="1.5"
        width="6"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="8.5"
        y="1.5"
        width="6"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="1.5"
        y="8.5"
        width="6"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M11.5 8.5v6M8.5 11.5h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),

  addStudent: (
    <svg viewBox="0 0 16 16" fill="none">
      <circle
        cx="6"
        cy="5"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M1.5 14c0-2.761 2.015-4.5 4.5-4.5s4.5 1.739 4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12.5 6v4M10.5 8h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),

  students: (
    <svg viewBox="0 0 16 16" fill="none">
      <circle
        cx="5.5"
        cy="5"
        r="2.3"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle
        cx="11"
        cy="6"
        r="1.8"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M1.3 14c0-2.6 1.9-4.2 4.2-4.2s4.2 1.6 4.2 4.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M10 10.2c1.9.15 3.3 1.6 3.3 3.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
};


// ============================================================
// COMPONENT
// ============================================================


// Sidebar shortcuts to the Puzzle Box Training / Buy pages (see MemberArea.js).
// Labels are English-only for now — the rest of this screen is translated.
const MEMBER_ICONS = {
  training: <svg viewBox="0 0 16 16" fill="none"><path d="M1.5 5.5L8 2.5l6.5 3L8 8.5l-6.5-3zM4 7.2V10c0 1 1.8 2 4 2s4-1 4-2V7.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" /></svg>,
  buy: <svg viewBox="0 0 16 16" fill="none"><path d="M2 2.5h1.7l1.3 7h7l1.2-4.8H4.4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" /><circle cx="6" cy="13" r="1" fill="currentColor" /><circle cx="11" cy="13" r="1" fill="currentColor" /></svg>,
};

function memberNavItems(onOpenMember) {
  if (!onOpenMember) return [];
  return [
    { id: "member-buy", label: "Buy The Puzzle Box Screener", section: "The Puzzle Box", icon: MEMBER_ICONS.buy, onClick: () => onOpenMember("purchase") },
    { id: "member-training", label: "Training", section: "The Puzzle Box", icon: MEMBER_ICONS.training, onClick: () => onOpenMember("training") },
    ];
}

export default function TeacherHome({ user, profile, onOpenMember }) {
  const [activePage, setActivePage] = useState("home");

  const [lang, setLang] = useState("en");

  const [rawMessages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const [search, setSearch] = useState("");

  const [studentSearch, setStudentSearch] = useState("");
  const [studentStageFilter, setStudentStageFilter] = useState("");

  const [selected, setSelected] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [addStudentError, setAddStudentError] = useState("");
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [confirmDeleteStudent, setConfirmDeleteStudent] = useState(null);

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  // ── Consent form prompt, right after a brand-new student is created ──
  // A screening can't start without a verified consent form on file
  // (PuzzleBoxScreener.js), so rather than leave that for later, the
  // moment a new child is added offers to upload one immediately.
  const [consentPromptChild, setConsentPromptChild] = useState(null); // { id, name }
  const [consentPromptFile, setConsentPromptFile] = useState(null);
  const [consentPromptSaving, setConsentPromptSaving] = useState(false);
  const [consentPromptResult, setConsentPromptResult] = useState(null); // { valid, missingFields, notes }
  const [consentPromptError, setConsentPromptError] = useState("");

  // Which child (if any) the "Screen" button on a row/modal was clicked
  // for — handed straight into PuzzleBoxScreener so it skips its own
  // search step and goes right to confirm/resume for that child.
  const [screenerChild, setScreenerChild] = useState(null);

  // True when the teacher opened the screener with "Screen offline" (home
  // page card). Without it the screener still switches to offline by itself
  // when the device has no signal; this covers weak or captive school wifi
  // that reports "connected" but can't actually reach the server.
  const [screenerOffline, setScreenerOffline] = useState(false);

  // This teacher's own PuzzleBox screening sessions (in_progress /
  // awaiting_review / reviewed), for the Screening History tab.
  const [rawSessions, setSessions] = useState([]);

  // Messages and screenings store the child's student number in child_name
  // (real names are kept private). This teacher may see their own
  // children's real names, so swap them back in for display.
  const realNameById = useMemo(
    () => new Map(students.map((s) => [s.id, s.name])),
    [students]
  );
  const messages = useMemo(
    () => rawMessages.map((m) => ({ ...m, childName: realNameById.get(m.childId) || m.childName })),
    [rawMessages, realNameById]
  );
  const sessions = useMemo(
    () => rawSessions.map((x) => ({ ...x, childName: realNameById.get(x.childId) || x.childName })),
    [rawSessions, realNameById]
  );
  const [loadingSessions, setLoadingSessions] = useState(true);

  // The session (if any) whose psychologist feedback is open in the
  // "View Feedback" modal — see the Screening History table below.
  const [viewingFeedback, setViewingFeedback] = useState(null);

  const [newStudent, setNewStudent] = useState({
    name: "",
    school: "",
    province: "Eastern Cape",
    age: "",
    gender: "Female",
    language: "English",
    date: "",
    examiner: "",
    stage: "stage1",
    flagged: false,
    total: 0,
    status: "Progressing",
  });

  const t = T[lang];

  const langLabels = {
    en: "EN",
    af: "AF",
    xh: "XH",
  };

  const displayName =
    profile?.name ||
    user?.email?.split("@")[0] ||
    "Educator";


  // ============================================================
  // SUPABASE — MESSAGES FROM THE PSYCHOLOGIST
  //
  // This used to read a Firestore "messages" collection that nothing in
  // the app ever actually wrote to (the psychologist's review only ever
  // inserted into the Supabase `messages` table, and only for parent/
  // headmistress recipients — never "teacher"). So this tab was
  // structurally guaranteed to always be empty. Now reads the same
  // Supabase table everything else already uses, scoped to messages
  // addressed to this teacher; PsychologistHome.js's submitReview now
  // always sends one here on every review, regardless of whether the
  // parent/headmistress boxes are checked.
  // ============================================================

  useEffect(() => {
    if (!user?.email) return;
    let isMounted = true;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("recipient_role", "teacher")
        .eq("recipient_email", user.email)
        .order("sent_at", { ascending: false });

      if (error) {
        console.error("Error loading teacher messages:", error);
        if (isMounted) setLoadingMessages(false);
        return;
      }

      if (isMounted) {
        setMessages((data || []).map(mapMessageRow));
        setLoadingMessages(false);
      }
    };

    loadMessages();

    const channel = supabase
      .channel("teacher-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `recipient_email=eq.${user.email}` },
        () => loadMessages()
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.email]);


  // ============================================================
  // SUPABASE — STUDENT RECORDS
  //
  // We still load every row from `children` here (this list also
  // backs the duplicate-name check in handleAddStudent, which should
  // catch a clash against the whole dataset, not just this teacher's
  // slice of it). What's shown in the "My Class" tab and the Home
  // widgets is the scoped `myStudents` below, filtered client-side to
  // rows whose `examiner` matches this teacher's display name — the
  // same value the Add Student form stamps onto new records by
  // default. Older records with no examiner set, or one that doesn't
  // match, won't show up here even though they're still in the shared
  // table; that's the tradeoff of scoping by a free-text name field.
  // ============================================================

  useEffect(() => {
    let isMounted = true;

    const loadStudents = async () => {
      setLoadingStudents(true);

      // children_named = children + the real name, which only this
      // teacher can read (admins/psychologists see student numbers).
      const { data, error } = await supabase
        .from("children_named")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Error loading student records:",
          error
        );

        if (isMounted) {
          setStudents([]);
          setLoadingStudents(false);
        }

        return;
      }

      if (isMounted) {
        const mappedStudents = (data || []).map(mapChildRow);

        setStudents(mappedStudents);
        setLoadingStudents(false);
      }
    };

    loadStudents();

    // Listen for additions/updates/deletions so that the
    // Student Records section updates automatically.

    const channel = supabase
      .channel("teacher-student-records")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "children",
        },
        () => {
          loadStudents();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);


  // ============================================================
  // SUPABASE — THIS TEACHER'S SCREENING SESSIONS
  // ============================================================

  useEffect(() => {
    if (!user?.email) return;
    let isMounted = true;

    const loadSessions = async () => {
      setLoadingSessions(true);

      const { data, error } = await supabase
        .from("puzzlebox_screenings")
        .select("*")
        .eq("teacher_email", user.email)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error loading screening sessions:", error);
        if (isMounted) {
          setSessions([]);
          setLoadingSessions(false);
        }
        return;
      }

      if (isMounted) {
        setSessions((data || []).map(mapPuzzleboxScreeningRow));
        setLoadingSessions(false);
      }
    };

    loadSessions();

    const channel = supabase
      .channel("teacher-screening-sessions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "puzzlebox_screenings",
          filter: `teacher_email=eq.${user.email}`,
        },
        () => {
          loadSessions();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.email]);


  // ============================================================
  // GREETING
  // ============================================================

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return t.goodMorning;
    if (hour < 18) return t.goodAfternoon;

    return t.goodEvening;
  }, [t]);


  // ============================================================
  // MESSAGE STATISTICS
  // ============================================================

  const thisMonthCount = useMemo(() => {
    const now = new Date();

    return messages.filter((m) => {
      const d = m.sentAt?.seconds
        ? new Date(m.sentAt.seconds * 1000)
        : null;

      return (
        d &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    }).length;
  }, [messages]);


  // ============================================================
  // MESSAGE SEARCH
  // ============================================================

  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (!search) return true;

      const s = search.toLowerCase();

      return (
        m.childName
          ?.toLowerCase()
          .includes(s) ||
        m.school
          ?.toLowerCase()
          .includes(s)
      );
    });
  }, [messages, search]);


  // ============================================================
  // MY CLASS — this teacher's own students (teacher_uid). The database
  // only returns a teacher's own children anyway (supabase/database/04);
  // filtering here as well keeps the screen correct on its own.
  // ============================================================

  const myStudents = useMemo(
    () => students.filter((s) => s.teacherUid === user?.uid),
    [students, user?.uid]
  );

  // Flags raised on this teacher's own children — flagged and not
  // yet resolved, same definition FlagsAlerts/AdminHome use elsewhere.
  const openFlaggedStudents = useMemo(
    () => myStudents.filter((s) => s.flagged && !s.resolved),
    [myStudents]
  );

  // Screening History is scoped to this teacher's own students, not every
  // screening this teacher account has ever started — the two can differ
  // (e.g. sessions run against the shared demo/seed children before "My
  // Class" ownership existed). `sessions` itself is already filtered to
  // this teacher server-side (teacher_email); this narrows it further to
  // children currently in myStudents.
  const myStudentIds = useMemo(
    () => new Set(myStudents.map((s) => s.id)),
    [myStudents]
  );

  const myStudentSessions = useMemo(
    () => sessions.filter((s) => myStudentIds.has(s.childId)),
    [sessions, myStudentIds]
  );

  // The "Stage" column on My Class was reading child.stage — a separate,
  // static field on the `children` row (set once, at "stage1"/Not Started,
  // when the student is added) that the PuzzleBox screening flow never
  // touches. So a child's badge never moved off "Not Started" no matter
  // how far their actual screening progressed. This maps each child to
  // their most recent PuzzleBox session instead, so the badge reflects
  // in_progress / awaiting_review / reviewed once one exists — child.stage
  // is only used as a fallback for children with no PuzzleBox session yet.
  const latestSessionByChild = useMemo(() => {
    const map = {};
    for (const s of myStudentSessions) {
      const existing = map[s.childId];
      const ts = s.updatedAt || s.startedAt || "";
      const existingTs = existing ? existing.updatedAt || existing.startedAt || "" : "";
      if (!existing || ts > existingTs) map[s.childId] = s;
    }
    return map;
  }, [myStudentSessions]);

  // Screening sessions, split the way the Screening History tab
  // presents them: still open vs. done on this teacher's end
  // (submitted, whether or not the psychologist has reviewed it yet).
  const inProgressSessions = useMemo(
    () => myStudentSessions.filter((s) => s.status === "in_progress"),
    [myStudentSessions]
  );

  const completedSessions = useMemo(
    () =>
      myStudentSessions.filter(
        (s) =>
          s.status === "awaiting_review" ||
          s.status === "reviewed"
      ),
    [myStudentSessions]
  );

  // Fastest way to answer "does this child already have an
  // in-progress session?" from the row-level Screen/Resume button,
  // without a network round-trip — PuzzleBoxScreener re-confirms this
  // itself once it opens, so this is just for the button's label.
  const inProgressChildIds = useMemo(
    () => new Set(inProgressSessions.map((s) => s.childId)),
    [inProgressSessions]
  );


  // ============================================================
  // STUDENT SEARCH + FILTER
  // ============================================================

  const filteredStudents = useMemo(() => {
    return myStudents.filter((student) => {
      const searchValue =
        studentSearch.trim().toLowerCase();

      const matchesSearch =
        !searchValue ||
        student.name
          ?.toLowerCase()
          .includes(searchValue) ||
        student.school
          ?.toLowerCase()
          .includes(searchValue);

      const matchesStage =
        !studentStageFilter ||
        (student.stage || "stage4") ===
          studentStageFilter;

      return matchesSearch && matchesStage;
    });
  }, [
    myStudents,
    studentSearch,
    studentStageFilter,
  ]);


  // ============================================================
  // DATE FORMAT
  // ============================================================

  const formatDate = (value) => {
    if (!value) return "—";

    if (value?.seconds) {
      return new Date(
        value.seconds * 1000
      ).toLocaleDateString();
    }

    if (typeof value === "string") {
      const parsed = new Date(value);

      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString();
      }

      return value;
    }

    return "—";
  };


  // ============================================================
  // NAVIGATION
  // ============================================================

  const navItems = [
    {
      id: "home",
      label: t.navHome,
      section: t.section1,
      icon: NAV_ICONS.home,
    },

    {
      id: "screener",
      label: t.navScreener,
      section: t.section2,
      icon: NAV_ICONS.screener,
    },

    {
      id: "students",
      label: t.navStudents,
      section: t.section2,
      icon: NAV_ICONS.students,
    },

    {
      id: "history",
      label: t.navHistory,
      section: t.section2,
      icon: NAV_ICONS.history,
    },

    {
      id: "messages",
      label: t.navMessages,
      section: t.section2,
      icon: NAV_ICONS.messages,
    },

    {
      id: "add-student",
      label: t.addStudent,
      section: t.section2,
      icon: NAV_ICONS.addStudent,
      onClick: () => setShowAddStudent(true),
    },

    {
      id: "profile",
      label: t.navProfile,
      section: t.section3,
      icon: NAV_ICONS.profile,
    },

    ...memberNavItems(onOpenMember),
  ];


  // ============================================================
  // ADD STUDENT
  // ============================================================

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.school) {
      return;
    }

    setAddStudentError("");

    // Check for an existing child with the same name — only relevant
    // when adding a brand new record, not when editing one that already
    // exists (its own name obviously already matches itself).

    if (!editingStudentId) {
      const {
        data: existing,
        error: checkError,
      } = await supabase
        .from("children_named")
        .select("id")
        .ilike("real_name", newStudent.name.trim());

      if (checkError) {
        console.error(
          "Error checking for duplicate child:",
          checkError
        );
        setAddStudentError("Could not check for duplicates — " + checkError.message);
        return;
      }

      if (existing && existing.length > 0) {
        setDuplicateWarning(true);
        return;
      }
    }

    const recordToInsert = {
      ...newStudent,

      // Automatically associate the new record with the
      // educator if they leave Examiner blank.
      examiner:
        newStudent.examiner || displayName,

      // Real ownership key (see migration 009) — this is what "My Class"
      // now filters on, instead of the fragile examiner-name match below.
      // Only stamped on create; editing an existing record (which may
      // have been added by someone else) doesn't reassign ownership.
      ...(editingStudentId ? {} : { teacher_email: user?.email || null }),

      age:
        parseInt(newStudent.age, 10) || 5,

      // IMPORTANT: an empty string here is not a valid Postgres `date`
      // value — Supabase rejects it outright and the insert/update fails
      // silently (only a console error, nothing shown to the teacher).
      // "Date of Assessment" is optional in this form, so send null
      // instead of "" whenever it's left blank.
      date: newStudent.date || null,
    };

    const { data: savedRow, error: saveError } = editingStudentId
      ? await supabase.from("children").update(recordToInsert).eq("id", editingStudentId).select().maybeSingle()
      : await supabase.from("children").insert(recordToInsert).select().single();

    if (saveError) {
      console.error(
        editingStudentId ? "Error updating student:" : "Error adding student:",
        saveError
      );
      setAddStudentError(
        (editingStudentId ? "Could not save changes — " : "Could not add this student — ") + saveError.message
      );
      return;
    }

    setShowAddStudent(false);
    setDuplicateWarning(false);

    // Brand-new student only (not an edit) — offer to upload their consent
    // form right away, since a screening can't start without one.
    if (!editingStudentId && savedRow?.id) {
      setConsentPromptChild({ id: savedRow.id, name: newStudent.name });
      setConsentPromptFile(null);
      setConsentPromptResult(null);
      setConsentPromptError("");
    }

    setEditingStudentId(null);
    setAddStudentError("");

    setNewStudent({
      name: "",
      school: "",
      province: "Eastern Cape",
      age: "",
      gender: "Female",
      language: "English",
      date: "",
      examiner: "",
      stage: "stage1",
      flagged: false,
      total: 0,
      status: "Progressing",
    });
  };

  // ── Consent form prompt handlers ──────────────────────────────────
  const handleConsentPromptUpload = async () => {
    if (!consentPromptChild?.id || !consentPromptFile) return;
    setConsentPromptSaving(true);
    setConsentPromptError("");
    try {
      const result = await uploadAndVerifyConsentForm({ childId: consentPromptChild.id, file: consentPromptFile });
      setConsentPromptResult(result);
      // Keep myStudents in sync without waiting for the realtime refetch —
      // otherwise "Screen" would still look blocked right after a
      // successful, verified upload until the next load.
      setStudents((prev) =>
        prev.map((s) =>
          s.id === consentPromptChild.id
            ? { ...s, consentFormUrl: result.url, consentFileName: result.fileName, consentVerified: result.valid, consentVerificationNotes: result.notes }
            : s
        )
      );
      // The Student Record modal (if open on this same child) holds its own
      // copy of the row, so patch it too.
      setSelectedStudent((prev) =>
        prev && prev.id === consentPromptChild.id
          ? { ...prev, consentFormUrl: result.url, consentFileName: result.fileName, consentVerified: result.valid, consentVerificationNotes: result.notes }
          : prev
      );
    } catch (err) {
      setConsentPromptError(err.message || "Could not save the consent form.");
    }
    setConsentPromptSaving(false);
  };

  const handleManualReview = async (childId) => {
    setConsentPromptSaving(true);
    setConsentPromptError("");
    try {
      await requestManualConsentReview({ childId, requestedBy: user?.email });
      const patch = { consentReviewStatus: "pending" };
      setStudents((prev) => prev.map((s) => (s.id === childId ? { ...s, ...patch } : s)));
      setSelectedStudent((prev) => (prev && prev.id === childId ? { ...prev, ...patch } : prev));
      setConsentPromptResult((r) => (r ? { ...r, sentForReview: true } : r));
    } catch (err) {
      setConsentPromptError(err.message);
    }
    setConsentPromptSaving(false);
  };

  const closeConsentPrompt = () => {
    setConsentPromptChild(null);
    setConsentPromptFile(null);
    setConsentPromptResult(null);
    setConsentPromptError("");
  };

  const openEditStudent = (student) => {
    setNewStudent({
      name: student.name || "",
      school: student.school || "",
      province: student.province || "Eastern Cape",
      age: student.age || "",
      gender: student.gender || "Female",
      language: student.language || "English",
      date: student.date || "",
      examiner: student.examiner || "",
      stage: student.stage || "stage1",
      flagged: student.flagged || false,
      total: student.total || 0,
      status: student.status || "Progressing",
    });
    setEditingStudentId(student.id);
    setAddStudentError("");
    setSelectedStudent(null);
    setShowAddStudent(true);
  };

  const handleDeleteStudent = async () => {
    if (!confirmDeleteStudent) return;
    const { error: deleteError } = await supabase.from("children").delete().eq("id", confirmDeleteStudent.id);
    if (deleteError) {
      console.error("Error deleting student:", deleteError);
      setAddStudentError("Could not delete this record — " + deleteError.message);
      setConfirmDeleteStudent(null);
      return;
    }
    setConfirmDeleteStudent(null);
    setSelectedStudent(null);
  };

 
  // ============================================================
  // PUZZLEBOX SCREENER
  // ============================================================

  if (activePage === "screener") {
    return (
      <ScreenerWithOffline
        user={user}
        profile={profile}
        lang={lang}
        initialChild={screenerChild}
        preferOffline={screenerOffline}
        onExit={() => {
          setScreenerChild(null);
          setScreenerOffline(false);
          setActivePage("home");
        }}
      />
    );
  }


  // ============================================================
  // START/RESUME SCREENING FOR A SPECIFIC CHILD
  // ============================================================

  const handleScreenChild = (child) => {
    setScreenerChild(child);
    setActivePage("screener");
  };


  // ============================================================
  // MAIN LAYOUT
  // ============================================================

  return (
    <div
      className="dashboard-layout rh-shell"
      style={{
        "--rh-accent": "#F26522",
        "--rh-accent-soft": "#FFEFE3",
      }}
    >

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <RoleSidebar
        navItems={navItems}
        activePage={activePage}
        setActivePage={setActivePage}
        roleLabel={t.roleLabel}
        displayName={displayName}
      />


      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <div className="main-content page-fade">

        {/* TOP BAR */}

        <div className="topbar">

          <div className="topbar-left">

            <div className="page-title">

              {activePage === "home" && t.navHome}

              {activePage === "messages" &&
                t.navMessages}

              {activePage === "students" &&
                t.navStudents}

              {activePage === "history" &&
                t.navHistory}

              {activePage === "profile" &&
                t.navProfile}

            </div>

            <div className="page-sub">

              {activePage === "messages" &&
                t.messagesSub}

              {activePage === "profile" &&
                t.profileSub}

              {activePage === "students" &&
                t.myStudentsSub}

              {activePage === "history" &&
                t.historySub}

            </div>

          </div>


          {/* LANGUAGE SWITCHER — TOP RIGHT */}

          <div className="topbar-right">

            <div className="lang-switcher">

              {Object.entries(langLabels).map(
                ([code, label]) => (
                  <button
                    key={code}
                    className={`lang-btn ${
                      lang === code
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setLang(code)
                    }
                  >
                    {label}
                  </button>
                )
              )}

            </div>

          </div>

        </div>


        {/* ====================================================
            HOME
        ==================================================== */}

        {activePage === "home" && (
          <>
            <RoleHero
              tint="orange"
              eyebrow="The Puzzle Project · Educator"
              greeting={`${greeting}, ${
                displayName.split(" ")[0]
              }`}
              subtitle={t.homeSub}
            >

              <StatRing
                value={messages.length}
                max={10}
                color="#fff"
                label={t.statMessages}
              />

              <StatRing
                value={openFlaggedStudents.length}
                max={10}
                color="#fff"
                label={t.statFlagged}
              />

              <StatRing
                value={thisMonthCount}
                max={10}
                color="#fff"
                label={t.statMonth}
              />

            </RoleHero>


            <div className="rh-home-grid">

              <div>

                {/* FLAGS ON MY CLASS */}

                <TodayList
                  title={t.flagsTitle}
                  actionLabel={t.viewAll}
                  onAction={() =>
                    setActivePage("students")
                  }
                  emptyIcon="tick"
                  emptyTitle={t.flagsEmptyTitle}
                  emptySub={t.flagsEmptySub}
                  onItemClick={(f) =>
                    setSelectedStudent(f.child)
                  }
                  items={
                    loadingStudents
                      ? null
                      : openFlaggedStudents
                          .slice(0, 5)
                          .map((c) => ({
                            icon: "flag",
                            color: "#E8175D",
                            title: c.name,
                            meta: c.school || t.flagsCardSub,
                            child: c,
                          }))
                  }
                />


                {/* RECENT MESSAGES */}

                <TodayList
                  title={t.recentMessages}
                  actionLabel={t.viewAll}
                  onAction={() =>
                    setActivePage("messages")
                  }
                  emptyIcon="mailbox"
                  emptyTitle={t.noMessages}
                  emptySub={t.noMessagesSub}
                  onItemClick={(m) =>
                    setSelected(m)
                  }
                  items={
                    loadingMessages
                      ? null
                      : messages
                          .slice(0, 5)
                          .map((m) => ({
                            data: m,
                            icon: "envelope",
                            color: "#F26522",
                            title: m.childName,
                            meta: `${
                              m.school
                            } · ${
                              t.sentOn
                            } ${formatDate(
                              m.sentAt
                            )}`,
                          }))
                  }
                />


                {/* QUICK LINKS */}

                <div className="rh-card">

                  <div className="rh-card-head">
                    <div className="rh-card-title">
                      {t.quickLinks}
                    </div>
                  </div>


                  {/* SCREENING */}

                  <button
                    className="th-quicklink"
                    onClick={() =>
                      setActivePage(
                        "screener"
                      )
                    }
                  >

                    <div className="th-quicklink-icon"><Doodle name="puzzle" size={24} /></div>

                    <div>
                      <div className="th-quicklink-title">
                        {t.openScreener}
                      </div>

                      <div className="th-quicklink-sub">
                        {t.openScreenerSub}
                      </div>
                    </div>

                    <div className="th-quicklink-arrow">
                      →
                    </div>

                  </button>


                  {/* STUDENT RECORDS */}

                  <button
                    className="th-quicklink"
                    onClick={() =>
                      setActivePage(
                        "students"
                      )
                    }
                  >

                    <div className="th-quicklink-icon"><Doodle name="backpack" size={24} /></div>

                    <div>
                      <div className="th-quicklink-title">
                        {t.viewStudents}
                      </div>

                      <div className="th-quicklink-sub">
                        {t.viewStudentsSub}
                      </div>
                    </div>

                    <div className="th-quicklink-arrow">
                      →
                    </div>

                  </button>


                  {/* ADD STUDENT */}

                  <button
                    className="th-quicklink"
                    onClick={() =>
                      setShowAddStudent(true)
                    }
                  >

                    <div className="th-quicklink-icon"><Doodle name="pencil" size={24} /></div>

                    <div>
                      <div className="th-quicklink-title">
                        {t.addStudent}
                      </div>

                      <div className="th-quicklink-sub">
                        {t.addStudentSub}
                      </div>
                    </div>

                    <div className="th-quicklink-arrow">
                      →
                    </div>

                  </button>


                  {/* SCREENING HISTORY */}

                  <button
                    className="th-quicklink"
                    onClick={() =>
                      setActivePage(
                        "history"
                      )
                    }
                  >

                    <div className="th-quicklink-icon"><Doodle name="notes" size={24} /></div>

                    <div>
                      <div className="th-quicklink-title">
                        {t.viewHistory}
                      </div>

                      <div className="th-quicklink-sub">
                        {t.viewHistorySub}
                      </div>
                    </div>

                    <div className="th-quicklink-arrow">
                      →
                    </div>

                  </button>


                  {/* MESSAGES */}

                  <button
                    className="th-quicklink"
                    onClick={() =>
                      setActivePage(
                        "messages"
                      )
                    }
                    style={{
                      marginBottom: 0,
                    }}
                  >

                    <div className="th-quicklink-icon">
                      <Doodle name="envelope" size={24} />
                    </div>

                    <div>
                      <div className="th-quicklink-title">
                        {t.navMessages}
                      </div>

                      <div className="th-quicklink-sub">
                        {t.messagesSub}
                      </div>
                    </div>

                    <div className="th-quicklink-arrow">
                      →
                    </div>

                  </button>

                </div>


                {/* OFFLINE SCREENING — download before visiting a school
                    without signal, then screen and upload later */}

                <div style={{ marginTop: 16 }}>
                  <OfflineReadyCard
                    onScreenOffline={() => {
                      setScreenerChild(null);
                      setScreenerOffline(true);
                      setActivePage("screener");
                    }}
                  />
                </div>

              </div>


              {/* PROFILE CARD */}

              <div>

                <div className="rh-profile-card">

                  <div
                    className="rh-profile-avatar"
                    style={{
                      background:
                        "#F26522",
                    }}
                  >
                    {displayName
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="rh-profile-name">
                    {displayName}
                  </div>

                  <span
                    className="rh-profile-role"
                    style={{
                      background:
                        "#F265221a",
                      color:
                        "#F26522",
                    }}
                  >
                    {t.roleLabel}
                  </span>

                  <div className="rh-profile-verified">
                    ✓ {t.verified}
                  </div>


                  <div className="rh-chip-grid">

                    <div className="rh-chip">

                      <div className="rh-chip-value">
                        {myStudents.length}
                      </div>

                      <div className="rh-chip-label">
                        {t.navStudents}
                      </div>

                    </div>


                    <div className="rh-chip">

                      <div className="rh-chip-value">
                        {messages.length}
                      </div>

                      <div className="rh-chip-label">
                        {t.statMessages}
                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </div>
          </>
        )}


        {/* ====================================================
            STUDENT RECORDS
        ==================================================== */}

        {activePage === "students" && (
          <>

            {/* SEARCH + FILTER */}

            <div className="search-bar">

              <input
                className="search-input"
                placeholder={t.search}
                value={studentSearch}
                onChange={(e) =>
                  setStudentSearch(
                    e.target.value
                  )
                }
              />

              <select
                className="filter-select"
                value={
                  studentStageFilter
                }
                onChange={(e) =>
                  setStudentStageFilter(
                    e.target.value
                  )
                }
              >

                <option value="">
                  {t.filterStatus}
                </option>

                <option value="stage1">
                  {t.stage1}
                </option>

                <option value="stage2">
                  {t.stage2}
                </option>

                <option value="stage3">
                  {t.stage3}
                </option>

                <option value="stage4">
                  {t.stage4}
                </option>

              </select>


              <button
                className="btn btn-primary btn-sm"
                onClick={() =>
                  setShowAddStudent(true)
                }
              >
                + {t.addStudent}
              </button>


              <span
                style={{
                  fontSize: 12,
                  color:
                    "var(--ink-faint)",
                  fontWeight: 600,
                  marginLeft:
                    "auto",
                }}
              >
                {t.showing}{" "}
                {filteredStudents.length}{" "}
                {t.of}{" "}
                {myStudents.length}{" "}
                {t.childrenCountWord}
              </span>

            </div>


            {/* STUDENT TABLE */}

            <div
              className="card"
              style={{
                padding: 0,
                overflow: "hidden",
              }}
            >

              {loadingStudents ? (

                <div className="empty-state">

                  <div
                    className="empty-state-icon"
                    style={{
                      fontSize: 28,
                    }}
                  >
                    
                  </div>

                  <div className="empty-state-title">
                    Loading student records...
                  </div>

                  <div className="empty-state-sub">
                    Please wait while the student
                    records are loaded.
                  </div>

                </div>

              ) : filteredStudents.length === 0 ? (

                <div className="empty-state">

                  <div className="empty-state-icon">
                    <Doodle name="backpack" size={64} />
                  </div>

                  <div className="empty-state-title">
                    {t.noResults}
                  </div>

                  <div className="empty-state-sub">
                    {myStudents.length === 0
                      ? "No children are registered under your name yet — add one, or ask your admin to check the examiner name on existing records."
                      : t.noResultsSub}
                  </div>

                </div>

              ) : (

                <div
                  style={{
                    overflowX:
                      "auto",
                  }}
                >

                  <table className="data-table">

                    <thead>

                      <tr>

                        <th>
                          {t.childNameCol}
                        </th>

                        <th>
                          {t.school}
                        </th>

                        <th>
                          {t.stageCol}
                        </th>

                        <th>
                          {t.actions}
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {filteredStudents.map(
                        (child, i) => {

                          const latestSession =
                            latestSessionByChild[child.id];

                          const stage =
                            child.stage ||
                            "stage4";

                          const sc = latestSession
                            ? sessionStatusColors[latestSession.status] ||
                              sessionStatusColors.in_progress
                            : stageColors[stage] ||
                              stageColors.stage4;

                          const stageLabel = latestSession
                            ? latestSession.status === "reviewed"
                              ? t.statusReviewed
                              : latestSession.status === "awaiting_review"
                              ? t.statusAwaitingReview
                              : t.statusInProgress
                            : t[stage] || stage;

                          return (
                            <tr
                              key={
                                child.id ||
                                i
                              }
                            >

                              <td>

                                <div
                                  style={{
                                    fontWeight:
                                      800,
                                    fontSize: 13,
                                  }}
                                >
                                  {child.name ||
                                    "—"}
                                </div>

                                {child.id && (
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color:
                                        "var(--ink-faint)",
                                      marginTop:
                                        2,
                                    }}
                                  >
                                    {child.id}
                                  </div>
                                )}

                              </td>


                              <td>
                                {child.school ||
                                  "—"}
                              </td>


                              <td>

                                <span
                                  style={{
                                    display:
                                      "inline-block",
                                    padding:
                                      "5px 12px",
                                    borderRadius:
                                      20,
                                    fontSize:
                                      12,
                                    fontWeight:
                                      700,
                                    background:
                                      sc.bg,
                                    color:
                                      sc.color,
                                  }}
                                >
                                  {stageLabel}
                                </span>

                              </td>


                              <td>

                                <button
                                  className="btn btn-teal btn-sm"
                                  onClick={() =>
                                    setSelectedStudent(
                                      child
                                    )
                                  }
                                >
                                  {t.view}
                                </button>

                                <button
                                  className="btn btn-primary btn-sm"
                                  style={{
                                    marginLeft: 6,
                                  }}
                                  title={child.consentVerified ? undefined : "No verified consent form on file yet — you can still open this, but the screening won't be able to start"}
                                  onClick={() =>
                                    handleScreenChild(
                                      child
                                    )
                                  }
                                >
                                  {!child.consentVerified && <Doodle name="warning" size={14} inline />}
                                  {inProgressChildIds.has(
                                    child.id
                                  )
                                    ? t.resume
                                    : t.screen}
                                </button>

                              </td>

                            </tr>
                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

          </>
        )}


        {/* ====================================================
            SCREENING HISTORY
        ==================================================== */}

        {activePage === "history" && (
          <>

            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >

              <div
                className="card"
                style={{ flex: "1 1 160px" }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink-faint)",
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  {t.statInProgress}
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: "#F26522",
                  }}
                >
                  {inProgressSessions.length}
                </div>
              </div>

              <div
                className="card"
                style={{ flex: "1 1 160px" }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink-faint)",
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  {t.statCompleted}
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: "#009B8D",
                  }}
                >
                  {completedSessions.length}
                </div>
              </div>

            </div>

            <div
              className="card"
              style={{
                padding: 0,
                overflow: "hidden",
              }}
            >

              {loadingSessions ? (

                <div className="empty-state">
                  <div
                    className="empty-state-icon"
                    style={{ fontSize: 28 }}
                  >
                    
                  </div>
                  <div className="empty-state-title">
                    Loading screening history...
                  </div>
                </div>

              ) : myStudentSessions.length === 0 ? (

                <div className="empty-state">
                  <div className="empty-state-icon" style={{ display: "flex", justifyContent: "center" }}><Doodle name="notes" size={64} /></div>
                  <div className="empty-state-title">
                    {t.historyEmptyTitle}
                  </div>
                  <div className="empty-state-sub">
                    {t.historyEmptySub}
                  </div>
                </div>

              ) : (

                <div style={{ overflowX: "auto" }}>

                  <table className="data-table">

                    <thead>
                      <tr>
                        <th>{t.childNameCol}</th>
                        <th>{t.school}</th>
                        <th>{t.status}</th>
                        <th>{t.startedOn}</th>
                        <th>{t.actions}</th>
                      </tr>
                    </thead>

                    <tbody>
                      {myStudentSessions.map((s) => {
                        const sc =
                          sessionStatusColors[s.status] ||
                          sessionStatusColors.in_progress;

                        const statusLabel =
                          s.status === "reviewed"
                            ? t.statusReviewed
                            : s.status === "awaiting_review"
                            ? t.statusAwaitingReview
                            : t.statusInProgress;

                        // Shown as a tooltip on the pill — the three
                        // statuses this app actually uses (a 4th,
                        // "completed", is in the database's check
                        // constraint but nothing in the app sets it).
                        const statusExplainer =
                          s.status === "reviewed"
                            ? "The psychologist has reviewed this screening — click \"View Feedback\" for their notes."
                            : s.status === "awaiting_review"
                            ? "Submitted — waiting for a psychologist to review it. Nothing more to do on your end."
                            : "You've started this screening but haven't submitted it yet — click Resume to pick up where you left off.";

                        return (
                          <tr key={s.id}>
                            <td>
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: 13,
                                }}
                              >
                                {s.childName || "—"}
                              </div>
                            </td>

                            <td>{s.school || "—"}</td>

                            <td>
                              <span
                                title={statusExplainer}
                                style={{
                                  display: "inline-block",
                                  padding: "5px 12px",
                                  borderRadius: 20,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  background: sc.bg,
                                  color: sc.color,
                                  cursor: "help",
                                }}
                              >
                                {statusLabel}
                              </span>
                            </td>

                            <td
                              style={{
                                fontSize: 12,
                                color: "var(--ink-mid)",
                              }}
                            >
                              {s.startedAt
                                ? new Date(
                                    s.startedAt
                                  ).toLocaleDateString()
                                : "—"}
                            </td>

                            <td>
                              {s.status === "in_progress" && (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() =>
                                    handleScreenChild(
                                      // Prefer the full record (has
                                      // consentVerified etc. via
                                      // mapChildRow) — this fallback object
                                      // is only for a child that's since
                                      // been removed from "My Class".
                                      myStudents.find((c) => c.id === s.childId) || {
                                        id: s.childId,
                                        name: s.childName,
                                        school: s.school,
                                        age: s.childAge,
                                      }
                                    )
                                  }
                                >
                                  {t.resume}
                                </button>
                              )}
                              {s.status === "reviewed" && (
                                <button
                                  className="btn btn-teal btn-sm"
                                  onClick={() => setViewingFeedback(s)}
                                >
                                  View Feedback
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                  </table>

                </div>

              )}

            </div>

            {/* PSYCHOLOGIST FEEDBACK MODAL — the review a psychologist left
                on this screening (review_verdict / review_notes on the
                puzzlebox_screenings row itself), so it's visible from the
                teacher's own Screening History instead of only existing on
                the psychologist's side. */}
            {viewingFeedback && (
              <div className="modal-overlay" onClick={() => setViewingFeedback(null)}>
                <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <div className="modal-title">
                      Psychologist's Feedback — {viewingFeedback.childName}
                    </div>
                    <button className="modal-close" onClick={() => setViewingFeedback(null)}>✕</button>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "5px 12px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                        background:
                          viewingFeedback.reviewVerdict === "concerns" ? "var(--pink-lt)" : "var(--teal-lt)",
                        color: viewingFeedback.reviewVerdict === "concerns" ? "var(--pink)" : "var(--teal)",
                      }}
                    >
                      {viewingFeedback.reviewVerdict === "concerns"
                        ? "Developmental concerns flagged"
                        : viewingFeedback.reviewVerdict === "fine"
                        ? "No concerns"
                        : "No verdict recorded"}
                    </span>
                  </div>

                  <div style={{ fontSize: 12.5, color: "var(--ink-mid)", marginBottom: 14 }}>
                    {viewingFeedback.reviewedBy && <>Reviewed by {viewingFeedback.reviewedBy}</>}
                    {viewingFeedback.reviewedAt && (
                      <> on {new Date(viewingFeedback.reviewedAt).toLocaleDateString()}</>
                    )}
                  </div>

                  <div style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {viewingFeedback.reviewNotes || "No written notes were left with this review."}
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                    <button className="btn btn-ghost" onClick={() => setViewingFeedback(null)}>Close</button>
                  </div>
                </div>
              </div>
            )}

          </>
        )}


        {/* ====================================================
            MESSAGES
        ==================================================== */}

        {activePage === "messages" && (
          <>

            <div className="search-bar">

              <input
                className="search-input"
                placeholder={t.search}
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
              />

              <span
                style={{
                  fontSize: 12,
                  color:
                    "var(--ink-faint)",
                  fontWeight: 600,
                  marginLeft:
                    "auto",
                }}
              >
                {filteredMessages.length}{" "}
                {t.of}{" "}
                {messages.length}{" "}
                {t.messagesWord}
              </span>

            </div>


            <div
              className="card"
              style={{
                padding: 0,
                overflow: "hidden",
              }}
            >

              {filteredMessages.length === 0 ? (

                <div className="empty-state">

                  <div className="empty-state-icon">
                    <Doodle name="mailbox" size={64} />
                  </div>

                  <div className="empty-state-title">
                    {t.noMessages}
                  </div>

                  <div className="empty-state-sub">
                    {t.noMessagesSub}
                  </div>

                </div>

              ) : (

                <div
                  style={{
                    overflowX:
                      "auto",
                  }}
                >

                  <table className="data-table">

                    <thead>

                      <tr>

                        <th>
                          {t.childNameCol}
                        </th>

                        <th>
                          {t.school}
                        </th>

                        <th>
                          {t.score}
                        </th>

                        <th>
                          {t.sentOn}
                        </th>

                        <th></th>

                      </tr>

                    </thead>


                    <tbody>

                      {filteredMessages.map(
                        (m) => (

                          <tr
                            key={m.id}
                          >

                            <td
                              style={{
                                fontWeight:
                                  700,
                              }}
                            >
                              {m.childName ||
                                "—"}
                            </td>

                            <td>
                              {m.school ||
                                "—"}
                            </td>

                            <td>
                              <strong>
                                {m.childScore ??
                                  "—"}
                                {m.childScore !=
                                  null &&
                                  "%"}
                              </strong>
                            </td>

                            <td
                              style={{
                                color:
                                  "var(--ink-faint)",
                                fontSize:
                                  12,
                              }}
                            >
                              {formatDate(
                                m.sentAt
                              )}
                            </td>

                            <td>

                              <button
                                className="btn btn-teal btn-sm"
                                onClick={() =>
                                  setSelected(m)
                                }
                              >
                                {t.view}
                              </button>

                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

          </>
        )}


        {/* ====================================================
            PROFILE
        ==================================================== */}

        {activePage === "profile" && (

          <div
            className="card"
            style={{
              maxWidth: 520,
            }}
          >

            <div
              className="report-section"
              style={{
                marginBottom: 0,
              }}
            >

              <div className="report-row">

                <span className="report-row-label">
                  {t.profileName}
                </span>

                <span className="report-row-value">
                  {displayName}
                </span>

              </div>


              <div className="report-row">

                <span className="report-row-label">
                  {t.profileEmail}
                </span>

                <span className="report-row-value">
                  {user?.email}
                </span>

              </div>


              <div className="report-row">

                <span className="report-row-label">
                  {t.profileRole}
                </span>

                <span className="report-row-value">
                  {t.roleLabel}
                </span>

              </div>


              {profile?.staffNumber && (

                <div className="report-row">

                  <span className="report-row-label">
                    {t.profileStaff}
                  </span>

                  <span className="report-row-value">
                    {profile.staffNumber}
                  </span>

                </div>

              )}


              <div className="report-row">

                <span className="report-row-label">
                  {t.profileStatus}
                </span>

                <span
                  style={{
                    fontWeight: 700,
                    color:
                      "var(--teal)",
                  }}
                >
                  ✓ {t.verified}
                </span>

              </div>

            </div>

          </div>

        )}

      </div>


      {/* ======================================================
          MESSAGE DETAIL MODAL
      ====================================================== */}

      {selected && (

        <div
          className="modal-overlay"
          onClick={() =>
            setSelected(null)
          }
        >

          <div
            className="modal"
            style={{
              maxWidth: 560,
            }}
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div className="modal-title">
                {selected.childName}
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setSelected(null)
                }
              >
                ✕
              </button>

            </div>


            <div
              style={{
                padding: "12px 16px",
                background:
                  "var(--teal-lt)",
                borderRadius: 12,
                marginBottom: 20,
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
              }}
            >

              <div>

                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 14,
                    color:
                      "var(--teal)",
                  }}
                >
                  {selected.school}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color:
                      "var(--ink-mid)",
                  }}
                >
                  {t.sentOn}{" "}
                  {formatDate(
                    selected.sentAt
                  )}
                </div>

              </div>


              <span className="pill pill-pink">
                {selected.childScore}%
              </span>

            </div>


            {selected.domains && (

              <div
                style={{
                  marginBottom: 20,
                }}
              >

                {[
                  "cognitive",
                  "motor",
                  "social",
                  "emotion",
                ].map((key) => (

                  <div
                    className="domain-bar"
                    key={key}
                  >

                    <div className="domain-bar-header">

                      <span>
                        {t[key]}
                      </span>

                      <span>
                        {selected
                          .domains[
                            key
                          ] || 0}
                        %
                      </span>

                    </div>

                    <div className="domain-bar-track">

                      <div
                        className="domain-bar-fill"
                        style={{
                          width: `${
                            selected
                              .domains[
                              key
                            ] || 0
                          }%`,
                          background:
                            domainColors[
                              key
                            ],
                        }}
                      />

                    </div>

                  </div>

                ))}

              </div>

            )}


            <div className="report-section">

              <div className="report-section-title">
                {t.diagnosis}
              </div>

              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.7,
                  color:
                    "var(--ink-mid)",
                  whiteSpace:
                    "pre-wrap",
                }}
              >
                {selected.diagnosis ||
                  "—"}
              </div>

            </div>


            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
              }}
            >

              <button
                className="btn btn-ghost"
                onClick={() =>
                  setSelected(null)
                }
              >
                {t.close}
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          ADD NEW STUDENT MODAL
      ====================================================== */}

      {showAddStudent && (

        <div
          className="modal-overlay"
          onClick={() => {
            setShowAddStudent(false);
            setEditingStudentId(null);
            setAddStudentError("");
          }}
        >

          <div
            className="modal"
            style={{
              maxWidth: 560,
            }}
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div className="modal-title">
                {editingStudentId ? t.editChild || "Edit Student" : t.addStudentTitle}
              </div>

              <button
                className="modal-close"
                onClick={() => {
                  setShowAddStudent(false);
                  setEditingStudentId(null);
                  setAddStudentError("");
                }}
              >
                ✕
              </button>

            </div>

            {addStudentError && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "var(--pink-lt)",
                  color: "var(--pink)",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 14,
                }}
              >
                <Doodle name="warning" size={16} inline /> {addStudentError}
              </div>
            )}


            {duplicateWarning && (

              <div
                style={{
                  padding:
                    "10px 14px",
                  background:
                    "var(--pink-lt)",
                  color:
                    "var(--pink)",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 14,
                }}
              >
                <Doodle name="warning" size={16} inline />{" "}
                {t.duplicateWarning}{" "}
                — "{newStudent.name}"{" "}
                {t.duplicateDetail}
              </div>

            )}


            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: 12,
                marginBottom: 16,
              }}
            >

              {/* CHILD ID */}

              <div>

                <label style={labelStyle}>
                  {t.childNameLabel}
                </label>

                <input
                  style={inputStyle}
                  placeholder="Child PB-016"
                  value={
                    newStudent.name
                  }
                  onChange={(e) => {

                    setNewStudent({
                      ...newStudent,
                      name:
                        e.target.value,
                    });

                    setDuplicateWarning(
                      false
                    );

                  }}
                />

              </div>


              {/* SCHOOL */}

              <div>

                <label style={labelStyle}>
                  {t.schoolLabel}
                </label>

                <input
                  style={inputStyle}
                  placeholder="School name"
                  value={
                    newStudent.school
                  }
                  onChange={(e) =>
                    setNewStudent({
                      ...newStudent,
                      school:
                        e.target.value,
                    })
                  }
                />

              </div>


              {/* AGE */}

              <div>

                <label style={labelStyle}>
                  {t.ageLabel}
                </label>

                <input
                  style={inputStyle}
                  type="number"
                  placeholder="5"
                  value={
                    newStudent.age
                  }
                  onChange={(e) =>
                    setNewStudent({
                      ...newStudent,
                      age:
                        e.target.value,
                    })
                  }
                />

              </div>


              {/* GENDER */}

              <div>

                <label style={labelStyle}>
                  {t.genderLabel}
                </label>

                <select
                  style={inputStyle}
                  value={
                    newStudent.gender
                  }
                  onChange={(e) =>
                    setNewStudent({
                      ...newStudent,
                      gender:
                        e.target.value,
                    })
                  }
                >
                  <option>
                    Female
                  </option>

                  <option>
                    Male
                  </option>
                </select>

              </div>


              {/* LANGUAGE */}

              <div>

                <label style={labelStyle}>
                  {t.langLabel}
                </label>

                <select
                  style={inputStyle}
                  value={
                    newStudent.language
                  }
                  onChange={(e) =>
                    setNewStudent({
                      ...newStudent,
                      language:
                        e.target.value,
                    })
                  }
                >

                  <option>
                    English
                  </option>

                  <option>
                    Afrikaans
                  </option>

                  <option>
                    isiXhosa
                  </option>

                </select>

              </div>


              {/* EXAMINER */}

              <div>

                <label style={labelStyle}>
                  {t.examinerLabel}
                </label>

                <input
                  style={inputStyle}
                  placeholder={
                    displayName
                  }
                  value={
                    newStudent.examiner
                  }
                  onChange={(e) =>
                    setNewStudent({
                      ...newStudent,
                      examiner:
                        e.target.value,
                    })
                  }
                />

              </div>


              {/* DATE */}

              <div
                style={{
                  gridColumn:
                    "span 2",
                }}
              >

                <label style={labelStyle}>
                  {t.dateLabel}
                </label>

                <input
                  style={inputStyle}
                  type="date"
                  value={
                    newStudent.date
                  }
                  onChange={(e) =>
                    setNewStudent({
                      ...newStudent,
                      date:
                        e.target.value,
                    })
                  }
                />

              </div>

            </div>


            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent:
                  "flex-end",
              }}
            >

              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowAddStudent(false);
                  setEditingStudentId(null);
                  setAddStudentError("");
                }}
              >
                {t.cancel}
              </button>

              <button
                className="btn btn-primary"
                onClick={
                  handleAddStudent
                }
                disabled={
                  !newStudent.name ||
                  !newStudent.school
                }
              >
                {editingStudentId ? (t.save || "Save") : t.save}
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          CONSENT FORM PROMPT — shown right after a brand-new
          student is created. Skippable, but a screening can't
          actually start for this child until a verified form is
          on file (see the gate in PuzzleBoxScreener.js).
      ====================================================== */}

      {consentPromptChild && (
        <div className="modal-overlay" style={{ zIndex: 300 }} onClick={() => !consentPromptSaving && closeConsentPrompt()}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Upload a consent form for {consentPromptChild.name}?</div>
              <button className="modal-close" onClick={closeConsentPrompt}>✕</button>
            </div>

            <p style={{ fontSize: 13, color: "var(--ink-mid)", marginBottom: 16, lineHeight: 1.5 }}>
              A signed parent/guardian consent form is required before {consentPromptChild.name} can be screened.
              You can upload it now, or come back to it later from {consentPromptChild.name}'s record in Student Records.
            </p>

            <a
              href="/puzzlebox-consent-form.pdf"
              download
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "var(--teal)", marginBottom: 16, textDecoration: "none" }}
            >
              <Doodle name="download" size={16} inline /> Download a blank consent form to print or send to a parent
            </a>

            {consentPromptResult && (
              <div
                style={{
                  padding: "12px 14px", borderRadius: 10, marginBottom: 16,
                  background: consentPromptResult.valid ? "var(--teal-lt)" : "var(--pink-lt)",
                  color: consentPromptResult.valid ? "var(--teal)" : "var(--pink)",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 13.5 }}>
                  {consentPromptResult.valid ? "✓ Consent form verified" : "✗ Consent form incomplete"}
                </div>
                {!consentPromptResult.valid && (
                  <>
                    <div style={{ fontSize: 12.5, marginTop: 4, color: "var(--ink-mid)" }}>
                      {consentPromptResult.notes || "Some required fields look blank."}
                    </div>
                    {consentPromptResult.missingFields?.length > 0 && (
                      <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--ink-mid)" }}>
                        {consentPromptResult.missingFields.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}

            {/* File input stays available until a verified result comes
                back — an incomplete form just means "pick a different (or
                re-signed) file and try again" rather than starting over. */}
            {consentPromptResult && !consentPromptResult.valid && isOverloadNote(consentPromptResult.notes) && (
              <div style={{ padding: "12px 14px", borderRadius: 12, marginBottom: 14, background: "var(--orange-lt)", border: "1px solid rgba(242,101,34,0.25)" }}>
                {consentPromptResult.sentForReview ? (
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--orange)" }}>
                    ✓ Sent to an admin for manual review. You'll see the result on the student's record.
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 13, color: "var(--ink-mid)", marginBottom: 10 }}>
                      The automatic check is busy right now (high demand). Your file is saved. You can send it to an admin to check by hand instead.
                    </div>
                    <button className="btn btn-sm btn-primary" disabled={consentPromptSaving} onClick={() => handleManualReview(consentPromptChild.id)}>
                      {consentPromptSaving ? "Sending…" : "Send to admin for manual review"}
                    </button>
                  </>
                )}
              </div>
            )}

            {!consentPromptResult?.valid && (
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => { setConsentPromptFile(e.target.files[0] || null); setConsentPromptResult(null); }}
                style={{ marginBottom: 16, fontSize: 13 }}
              />
            )}

            {consentPromptError && (
              <div style={{ color: "var(--pink)", fontSize: 12.5, marginBottom: 12 }}><Doodle name="warning" size={16} inline /> {consentPromptError}</div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn btn-ghost" onClick={closeConsentPrompt}>
                {consentPromptResult?.valid ? "Done" : "Skip for now"}
              </button>
              {!consentPromptResult?.valid && (
                <button
                  className="btn btn-primary"
                  disabled={!consentPromptFile || consentPromptSaving}
                  onClick={handleConsentPromptUpload}
                >
                  {consentPromptSaving ? "Checking…" : "Upload & Verify"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ======================================================
          STUDENT RECORD DETAIL MODAL
      ====================================================== */}

      {selectedStudent && (

        <div
          className="modal-overlay"
          onClick={() =>
            setSelectedStudent(null)
          }
        >

          <div
            className="modal"
            style={{
              maxWidth: 520,
            }}
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div className="modal-title">
                {selectedStudent.name ||
                  "Student"}
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setSelectedStudent(
                    null
                  )
                }
              >
                ✕
              </button>

            </div>


            {/* RECORD SUMMARY */}

            <div
              style={{
                padding:
                  "14px 16px",
                background:
                  "#FFF7F1",
                borderRadius: 12,
                marginBottom: 20,
              }}
            >

              <div
                style={{
                  fontSize: 12,
                  color:
                    "var(--ink-mid)",
                  marginBottom: 4,
                }}
              >
                {t.recordDetails}
              </div>

              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color:
                    "var(--ink)",
                }}
              >
                {selectedStudent.name ||
                  "—"}
              </div>

            </div>


            {/* RECORD FIELDS */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: 16,
                marginBottom: 20,
              }}
            >

              {/* SCHOOL */}

              <div>

                <label style={labelStyle}>
                  {t.schoolLabel}
                </label>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {selectedStudent.school ||
                    "—"}
                </div>

              </div>


              {/* STAGE */}

              <div>

                <label style={labelStyle}>
                  {t.stageLabel}
                </label>

                {(() => {

                  const latestSession =
                    latestSessionByChild[selectedStudent.id];

                  const stage =
                    selectedStudent.stage ||
                    "stage4";

                  const sc = latestSession
                    ? sessionStatusColors[latestSession.status] ||
                      sessionStatusColors.in_progress
                    : stageColors[stage] ||
                      stageColors.stage4;

                  const stageLabel = latestSession
                    ? latestSession.status === "reviewed"
                      ? t.statusReviewed
                      : latestSession.status === "awaiting_review"
                      ? t.statusAwaitingReview
                      : t.statusInProgress
                    : t[stage] || stage;

                  return (
                    <span
                      style={{
                        display:
                          "inline-block",
                        padding:
                          "5px 12px",
                        borderRadius:
                          20,
                        fontSize: 12,
                        fontWeight: 700,
                        background:
                          sc.bg,
                        color:
                          sc.color,
                      }}
                    >
                      {stageLabel}
                    </span>
                  );

                })()}

              </div>


              {/* AGE */}

              <div>

                <label style={labelStyle}>
                  {t.ageLabel}
                </label>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {selectedStudent.age ||
                    "—"}
                </div>

              </div>


              {/* GENDER */}

              <div>

                <label style={labelStyle}>
                  {t.genderLabel}
                </label>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {selectedStudent.gender ||
                    "—"}
                </div>

              </div>


              {/* LANGUAGE */}

              <div>

                <label style={labelStyle}>
                  {t.langLabel}
                </label>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {selectedStudent.language ||
                    "—"}
                </div>

              </div>


              {/* DATE */}

              <div>

                <label style={labelStyle}>
                  {t.dateLabel}
                </label>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {formatDate(
                    selectedStudent.date
                  )}
                </div>

              </div>


              {/* PROVINCE */}

              <div>

                <label style={labelStyle}>
                  {t.province}
                </label>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {selectedStudent.province ||
                    "—"}
                </div>

              </div>


              {/* EXAMINER */}

              <div>

                <label style={labelStyle}>
                  {t.examiner}
                </label>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {selectedStudent.examiner ||
                    "—"}
                </div>

              </div>


              {/* STATUS */}

              <div>

                <label style={labelStyle}>
                  {t.status}
                </label>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {selectedStudent.status ||
                    "—"}
                </div>

              </div>


              {/* SCORE */}

              <div>

                <label style={labelStyle}>
                  {t.screeningScore}
                </label>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {selectedStudent.total ??
                    "—"}
                </div>

              </div>

            </div>


            {/* CONSENT FORM */}

            <div
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                marginBottom: 20,
                background: selectedStudent.consentVerified
                  ? "var(--teal-lt)"
                  : selectedStudent.consentFormUrl
                  ? "var(--pink-lt)"
                  : "#F4F4F4",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <label style={labelStyle}>Consent form</label>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: selectedStudent.consentVerified
                      ? "var(--teal)"
                      : selectedStudent.consentFormUrl
                      ? "var(--pink)"
                      : "var(--ink-mid)",
                  }}
                >
                  {selectedStudent.consentVerified
                    ? "✓ Verified"
                    : selectedStudent.consentReviewStatus === "pending"
                    ? "Awaiting manual review by an admin"
                    : selectedStudent.consentFormUrl
                    ? "✗ Incomplete — " + (selectedStudent.consentVerificationNotes || "some required fields look blank.")
                    : "No consent form uploaded yet"}
                </div>
                {selectedStudent.consentFormUrl && (
                  <a
                    href={selectedStudent.consentFormUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, color: "var(--ink-mid)" }}
                  >
                    View uploaded file
                  </a>
                )}
                {!selectedStudent.consentVerified && selectedStudent.consentFormUrl && selectedStudent.consentReviewStatus !== "pending" && isOverloadNote(selectedStudent.consentVerificationNotes) && (
                  <div style={{ marginTop: 8 }}>
                    <button className="btn btn-sm btn-primary" disabled={consentPromptSaving} onClick={() => handleManualReview(selectedStudent.id)}>
                      Send to admin for manual review
                    </button>
                  </div>
                )}
              </div>

              <button
                className="btn btn-sm btn-ghost"
                onClick={() =>
                  setConsentPromptChild({
                    id: selectedStudent.id,
                    name: selectedStudent.name,
                  })
                }
              >
                {selectedStudent.consentFormUrl ? "Replace form" : "Upload consent form"}
              </button>
            </div>


            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: 10,
              }}
            >

              <button
                className="btn btn-sm"
                style={{ background: "var(--pink-lt)", color: "var(--pink)", border: "none" }}
                onClick={() =>
                  setConfirmDeleteStudent(selectedStudent)
                }
              >
                {t.deleteChild || "Delete Child Record"}
              </button>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn btn-primary"
                  onClick={() =>
                    handleScreenChild(selectedStudent)
                  }
                >
                  {" "}
                  {inProgressChildIds.has(
                    selectedStudent.id
                  )
                    ? t.resume
                    : t.startResume}
                </button>

                <button
                  className="btn btn-ghost"
                  onClick={() =>
                    openEditStudent(selectedStudent)
                  }
                >
                  {t.editChild || "Edit Child"}
                </button>

                <button
                  className="btn btn-ghost"
                  onClick={() =>
                    setSelectedStudent(
                      null
                    )
                  }
                >
                  {t.close}
                </button>
              </div>

            </div>

          </div>

        </div>

      )}

      {confirmDeleteStudent && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteStudent(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Delete {confirmDeleteStudent.name}?</div>
              <button className="modal-close" onClick={() => setConfirmDeleteStudent(null)}>✕</button>
            </div>
            <p style={{ fontSize: 13.5, color: "var(--ink-mid)", lineHeight: 1.6, marginBottom: 20 }}>
              This permanently removes this child's record, including any screening history attached to it. This can't be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDeleteStudent(null)}>{t.cancel}</button>
              <button className="btn btn-sm" style={{ background: "var(--pink)", color: "#fff", border: "none", padding: "10px 18px" }} onClick={handleDeleteStudent}>
                {t.deleteChild || "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}