// App.js — now hosts two separate flows:
// 1) Logged OUT: the public sites, each with its own navigation:
//      The Puzzle Project  home · about · donate
//      The Puzzle Box      pb-home · pb-how · pb-training · pb-purchase
//      Puzzle Play         pp-home · pp-how · pp-purchase · pp-login
//    Login opens when the visitor clicks "Login" or a tier's Sign up / Log in.
// 2) Logged IN: the existing role-based dashboards + puzzle transition,
//    unchanged from before.

import React, { useState, useEffect } from "react";
import { auth } from "./services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { supabase } from "./services/supabaseClient";
import { mapUserRow } from "./utils/mappers";
import Login from "./components/dashboards/Login";
import PendingApproval from "./components/dashboards/PendingApproval";
import Dashboard from "./components/dashboards/Dashboard";
import TeacherHome from "./components/dashboards/TeacherHome";
import PsychologistHome from "./components/dashboards/PsychologistHome";
import AdminHome from "./components/dashboards/AdminHome";
import PuzzleTransition from "./components/shared/PuzzleTransition";
import TranslatorChat from "./components/translator/TranslatorChat";


import Homepage from "./components/public/Homepage";
import About from "./components/public/About";
import HowItWorks from "./components/public/HowItWorks";
import TrainingPage from "./components/public/Trainingpage";
import DonatePage from "./components/public/DonatePage";
import PuzzleBoxHome from "./components/public/PuzzleBoxHome";
import PuzzleBoxPurchase from "./components/public/PuzzleBoxPurchase";
import MemberArea from "./components/dashboards/MemberArea";
import {
  PuzzlePlayHome, PuzzlePlayHow, PuzzlePlayPurchase, PuzzlePlayLogin,
} from "./components/public/PuzzlePlayPages";

import "./App.css";

// Tier 1 (educator) and Tier 2 (psychologist) users first land on a page with
// the "Training" and "Buy The Puzzle Box Screener" buttons (sponsor wireframe
// TPB p4) before continuing to their dashboard. Kept in sessionStorage so a
// page refresh doesn't bounce someone back to it mid-session.
const MEMBER_VIEW_KEY = "pb_member_view";
const readMemberView = () => {
  try { return sessionStorage.getItem(MEMBER_VIEW_KEY) || "landing"; } catch { return "landing"; }
};
const writeMemberView = (v) => {
  try { sessionStorage.setItem(MEMBER_VIEW_KEY, v || "dashboard"); } catch { /* storage unavailable */ }
};

// Older code paths used these page names; map them onto the new sites.
const LEGACY_PAGES = { how: "pb-how", training: "pb-training" };


const PAGE_TO_PATH = {
  home: "/",
  about: "/about",
  donate: "/donate",
  "pb-home": "/puzzlebox",
  "pb-how": "/puzzlebox/how-it-works",
  "pb-training": "/puzzlebox/training",
  "pb-purchase": "/puzzlebox/purchase",
  "pp-home": "/puzzleplay",
  "pp-how": "/puzzleplay/how-it-works",
  "pp-purchase": "/puzzleplay/purchase",
  "pp-login": "/puzzleplay/login",
};
const PATH_TO_PAGE = Object.fromEntries(
  Object.entries(PAGE_TO_PATH).map(([page, path]) => [path, page])
);
// Reads the address bar and works out which public page it points to.
const pageFromPath = () => {
  const p = window.location.pathname.replace(/\/+$/, "") || "/";
  return PATH_TO_PAGE[p] || "home";
};

// Teachers (role "educator") skip the landing page entirely: if they've
// already redeemed a Product number (training_access has a row for them),
// they go straight to their dashboard; otherwise they land straight in
// Training — never on the "Training / Buy Screener" choice screen.
async function resolveEducatorMemberView(uid) {
  try {
    const { data, error } = await supabase
      .from("training_access")
      .select("user_id")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) throw error;
    return data ? "dashboard" : "training";
  } catch {
    // Can't tell — fall back to Training rather than silently skipping it.
    return "training";
  }
}

// Last successfully loaded profile, kept so a cold start with no signal (or a
// failed request) doesn't wrongly show "Account not found" for a real,
// approved user. Cleared on sign-out. Only the fields routing needs.
const PROFILE_CACHE_KEY = "pb_profile_cache_v1";
function readCachedProfile(uid) {
  try {
    const c = JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || "null");
    return c && c.id === uid ? c : null;
  } catch { return null; }
}
function writeCachedProfile(p) {
  try {
    if (!p) return localStorage.removeItem(PROFILE_CACHE_KEY);
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
      id: p.id, role: p.role, isVerified: !!p.isVerified, name: p.name, email: p.email,
    }));
  } catch { /* storage unavailable — fine */ }
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  // undefined = "haven't checked yet", null = "checked, no profile doc",
  // object = the loaded profile. Keeping these distinct is what stops the
  // brief Dashboard-fallback flash while the profile fetch is in flight.
  const [profile, setProfile] = useState(undefined);

  // The Puzzle Box login screen sits on top of whatever page opened it.
  // loginCtx = { tier: 1 | 2 | null, mode: "login" | "register" } or null.
  const [showLogin, setShowLogin] = useState(false);
  const [loginCtx, setLoginCtx] = useState(null);

  // Which public-site page a signed-out visitor is looking at:
  // "home" | "about" | "donate" | "pb-home" | "pb-how" | "pb-training" |
  // "pb-purchase" | "pp-home" | "pp-how" | "pp-purchase" | "pp-login"
  
  const [publicPage, setPublicPageRaw] = useState(pageFromPath);

  
  // Back button returns to the previous page instead of leaving the site.
  const setPublicPage = (page) => {
    const next = LEGACY_PAGES[page] || page;
    setPublicPageRaw(next);
    const path = PAGE_TO_PATH[next] || "/";
    if (window.location.pathname !== path) {
      window.history.pushState({ login: false }, "", path);
    }
  };

  const openLogin = (ctx) => {
    // Navbar buttons can hand us a click event — only accept a real context.
    const valid = ctx && typeof ctx === "object" && ("tier" in ctx || "mode" in ctx) ? ctx : null;
    setLoginCtx(valid);
    setShowLogin(true);
    // opening Login is its own history entry, so Back closes it.
    window.history.pushState({ login: true, ctx: valid }, "", window.location.pathname);
  };

  // "landing" | "training" | "purchase" | "dashboard" — see MEMBER_VIEW_KEY above
  const [memberView, setMemberViewState] = useState(readMemberView);
  const setMemberView = (v) => { writeMemberView(v); setMemberViewState(v || "dashboard"); };
  // While an educator's training status is being resolved, hold off rendering
  // MemberArea at all — otherwise the "landing" choice screen would flash on
  // screen for a moment before we swap it for training/dashboard.
  const [memberViewReady, setMemberViewReady] = useState(true);

  // ONE place that decides where a freshly verified/approved person lands.
  // Used by both Login (onVerified) and PendingApproval (onApproved).
  //  - teachers: straight to Training or the dashboard (never the choice screen)
  //  - psychologists: always the dashboard
  //  - everyone else (admin…): landing
  const routeVerifiedProfile = async (p, uid) => {
    if (p?.isVerified && p.role === "educator") {
      setMemberViewReady(false);
      const resolved = await resolveEducatorMemberView(p.id || uid);
      setMemberView(resolved);
      setMemberViewReady(true);
    } else if (p?.isVerified && p.role === "psychologist") {
      setMemberView("dashboard");
    } else {
      setMemberView("landing");
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (u) {
        setProfile(undefined);
        try {
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", u.uid)
            .maybeSingle();
          if (error) throw error;
          // Load whatever profile exists (or none at all) — App.js's render
          // below is what actually gates access: PendingApproval renders
          // instead of a dashboard unless profile.isVerified is true.
          const mapped = data ? mapUserRow(data) : null;
          // Only a SUCCESSFUL query may say "no profile" (null). Remember
          // the good result for offline starts.
          writeCachedProfile(mapped);
          setProfile(mapped);

          // Teachers only: replace the "landing" choice screen with a direct
          // route based on training status. Only do this the first time this
          // session lands on "landing" — a view the person has since chosen
          // themselves (training/purchase/dashboard) is left alone.
          if (mapped?.isVerified && mapped.role === "educator" && readMemberView() === "landing") {
            setMemberViewReady(false);
            const resolved = await resolveEducatorMemberView(u.uid);
            setMemberView(resolved);
            setMemberViewReady(true);
          }

          // Psychologists skip the "Training / Buy Screener" landing choice
          // entirely and go straight to their dashboard — that screen (and
          // the underlying buy/training pages, still reachable from the
          // sidebar via onOpenMember) is a Tier 1/teacher onboarding step,
          // not something a psychologist needs to see on every login.
          // Checked against anything other than "dashboard" (not just
          // "landing") since this same browser tab's sessionStorage can
          // still be holding "training"/"purchase" from an earlier visit —
          // a fresh login as a psychologist should never land on any of
          // those, only ever the dashboard.
          if (mapped?.isVerified && mapped.role === "psychologist" && readMemberView() !== "dashboard") {
            setMemberView("dashboard");
          }
        } catch {
          // The request FAILED (offline, timeout…) — that's not the same as
          // "this account doesn't exist". Fall back to the last good profile
          // for this user; only if there is none do we show no-profile.
          const cached = readCachedProfile(u.uid);
          setProfile(cached || null);
          if (cached?.isVerified && cached.role === "psychologist" && readMemberView() !== "dashboard") {
            setMemberView("dashboard");
          }
        }
      } else {
        writeCachedProfile(null);
        setProfile(null);
        setTransitioning(false);
        setShowLogin(false);
        setLoginCtx(null);
        writeMemberView("landing");      // next login starts at the landing page again
        setMemberViewState("landing");
        setMemberViewReady(true);
      }

      setLoading(false);
    });
    return () => unsub();
  }, []);

  // scroll to top whenever the visitor moves between public pages
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [publicPage]);

  // listens for the browser's Back / Forward buttons and shows the
  // page (and Login screen, if it was open) that the history entry points to.
  useEffect(() => {
    const onPop = (e) => {
      setPublicPageRaw(pageFromPath());
      setShowLogin(!!e.state?.login);
      setLoginCtx(e.state?.ctx || null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <img src="/logo.png" alt="The Puzzle Project" className="loading-logo" />
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // ── LOGGED IN: unchanged role-based routing ──────────────────────────
  if (user) {
    // Still figuring out the role — show the loading screen (which the
    // puzzle transition will cover anyway on a fresh login) instead of
    // letting the Dashboard fallback render prematurely.
    if (profile === undefined) {
      return (
        <>
          <div className="app-loading">
            <img src="/logo.png" alt="The Puzzle Project" className="loading-logo" />
            <div className="loading-spinner"></div>
            <p>Loading...</p>
          </div>
          {transitioning && (
            <PuzzleTransition onComplete={() => setTransitioning(false)} />
          )}
        </>
      );
    }

    // Still resolving a teacher's Training-vs-dashboard route — hold on the
    // loading screen rather than flashing the landing choice screen first.
    if (!memberViewReady) {
      return (
        <>
          <div className="app-loading">
            <img src="/logo.png" alt="The Puzzle Project" className="loading-logo" />
            <div className="loading-spinner"></div>
            <p>Loading...</p>
          </div>
          {transitioning && (
            <PuzzleTransition onComplete={() => setTransitioning(false)} />
          )}
        </>
      );
    }

    const isMember = profile?.isVerified && (profile.role === "educator" || profile.role === "psychologist");

    // Verified Tier 1 / Tier 2 users see the Training / Buy page until they
    // choose to continue to their dashboard.
    if (isMember && memberView !== "dashboard") {
      return (
        <>
          <MemberArea user={user} profile={profile} view={memberView} onView={setMemberView} />
          <TranslatorChat />
          {transitioning && (
            <PuzzleTransition onComplete={() => setTransitioning(false)} />
          )}
        </>
      );
    }

    const openMember = (view) => setMemberView(view);

    return (
      <>
        {!profile || !profile.isVerified ? (
          // The safety gate: signing up creates the account but NOT access.
          // Anything without a verified profile — including a rejected
          // account, whose row is deleted rather than left visible — lands
          // here instead of any dashboard.
          <PendingApproval
            user={user}
            profile={profile}
            onApproved={async (approvedProfile) => {
              setProfile(approvedProfile);
              writeCachedProfile(approvedProfile);
              // Same routing as a normal login, so a newly approved teacher
              // lands in Training/dashboard and a psychologist on their
              // dashboard — not the "Training / Buy" choice screen.
              await routeVerifiedProfile(approvedProfile, user?.uid);
              setTransitioning(true);
            }}
          />
        ) : profile.role === "educator" ? (
          <TeacherHome user={user} profile={profile} onOpenMember={openMember} />
        ) : profile.role === "psychologist" ? (
          <PsychologistHome user={user} profile={profile} onOpenMember={openMember} />
        ) : profile.role === "admin" ? (
          <AdminHome user={user} profile={profile} />
        ) : (
          <Dashboard user={user} profile={profile} />
        )}
        {profile?.isVerified && <TranslatorChat />}
        {transitioning && (
          <PuzzleTransition onComplete={() => setTransitioning(false)} />
        )}
      </>
    );
  }

  // ── LOGGED OUT: the public sites, or Login once they click through ────
  if (showLogin) {
    return (
      <Login
        tier={loginCtx?.tier || null}
        initialMode={loginCtx?.mode || "login"}
        // Back returns to the page the visitor opened Login from (Puzzle Box, Puzzle Play…), not always Home.
        // uses the browser history, so it matches the browser's Back button.
        onBack={() => window.history.back()}
        onVerified={async (verifiedProfile) => {
          setProfile(verifiedProfile);
          writeCachedProfile(verifiedProfile);
          await routeVerifiedProfile(verifiedProfile, auth.currentUser?.uid);
          // Only play the "welcome in" transition for an already-approved
          // account — a fresh signup lands on PendingApproval instead,
          // where a celebratory animation would be misleading.
          if (verifiedProfile?.isVerified) setTransitioning(true);
        }}
      />
    );
  }

  const publicPageProps = {
    onNavigate: setPublicPage,
    // Puzzle Play has its own (not yet built) login page; everything else
    // uses The Puzzle Box login.
    onNavigateToLogin: openLogin, // Puzzle Play has no login of its own: everyone uses the one sign-in
    onAccess: (tier, mode) => openLogin({ tier, mode }),
  };

  switch (publicPage) {
    case "about":
      return <About {...publicPageProps} />;
    case "donate":
      return <DonatePage {...publicPageProps} />;
    case "pb-home":
      return <PuzzleBoxHome {...publicPageProps} />;
    case "pb-how":
      return <HowItWorks {...publicPageProps} />;
    case "pb-training":
      return <TrainingPage {...publicPageProps} />;
    case "pb-purchase":
      return <PuzzleBoxPurchase {...publicPageProps} />;
    case "pp-home":
      return <PuzzlePlayHome {...publicPageProps} />;
    case "pp-how":
      return <PuzzlePlayHow {...publicPageProps} />;
    case "pp-purchase":
      return <PuzzlePlayPurchase {...publicPageProps} />;
    case "pp-login":
      return <PuzzlePlayLogin {...publicPageProps} />;
    case "home":
    default:
      return <Homepage {...publicPageProps} />;
  }
}

export default App;