// PendingApproval.js — the screen an account sits on between "signed up"
// and "an admin approved them". This IS the safety gate: App.js renders
// this instead of any dashboard whenever profile is missing or
// profile.isVerified is false, so a freshly-registered (or rejected)
// account can never reach real screening data.

import React, { useEffect, useState } from "react";
import { auth } from "../../services/firebase";
import { signOut } from "firebase/auth";
import { supabase } from "../../services/supabaseClient";
import { mapUserRow } from "../../utils/mappers";
import { enablePushNotifications, pushSupported } from "../../services/push";
import { SinglePuzzlePiece } from "../shared/puzzlePiece";
import { useLanguage, LanguageSwitcher } from "../../theme/LanguageContext";
import "./Login.css";

const T = {
  en: {
    roles: { educator: "Educator / Teacher", psychologist: "Psychologist", analyst: "Data Analyst", admin: "Administrator" },
    eyebrow: "The Puzzle Project · Screener System",
    notFoundTitle: "Account not found",
    notFoundBody: "We couldn't find a registration for this account. If you just signed up this should resolve in a moment — otherwise, it may not have been approved. Contact your administrator.",
    awaitingTitle: "Awaiting approval",
    awaitingBody: (name) => `Thanks for signing up, ${name}. An administrator needs to approve your account before you can sign in — you'll be brought straight through the moment that happens, no need to refresh.`,
    name: "Name:",
    email: "Email:",
    roleRequested: "Role requested:",
    notifyOn: "We'll send you a notification as soon as you're approved.",
    notifyDenied: "Notifications are blocked in your browser settings — you can still check back here.",
    notifyUnsupported: "This browser doesn't support push notifications — you can still check back here.",
    notifyError: "Couldn't turn on notifications — please try again.",
    requesting: "Requesting…",
    notifyMe: "Notify me when I'm approved",
    checking: "Checking…",
    checkAgain: "Check again",
    signOut: "← Sign out",
  },
  af: {
    roles: { educator: "Opvoeder / Onderwyser", psychologist: "Sielkundige", analyst: "Data-ontleder", admin: "Administrateur" },
    eyebrow: "The Puzzle Project · Sifterstelsel",
    notFoundTitle: "Rekening nie gevind nie",
    notFoundBody: "Ons kon nie 'n registrasie vir hierdie rekening vind nie. As jy pas geregistreer het, behoort dit binne 'n oomblik reg te kom — anders is dit dalk nie goedgekeur nie. Kontak jou administrateur.",
    awaitingTitle: "Wag op goedkeuring",
    awaitingBody: (name) => `Dankie dat jy geregistreer het, ${name}. 'n Administrateur moet jou rekening goedkeur voordat jy kan aanteken — jy sal dadelik deurgeneem word sodra dit gebeur, jy hoef nie te herlaai nie.`,
    name: "Naam:",
    email: "E-pos:",
    roleRequested: "Rol aangevra:",
    notifyOn: "Ons sal vir jou 'n kennisgewing stuur sodra jy goedgekeur is.",
    notifyDenied: "Kennisgewings is in jou blaaierinstellings geblokkeer — jy kan steeds hier terugkom om te kyk.",
    notifyUnsupported: "Hierdie blaaier ondersteun nie stootkennisgewings nie — jy kan steeds hier terugkom om te kyk.",
    notifyError: "Kon nie kennisgewings aanskakel nie — probeer asseblief weer.",
    requesting: "Versoek tans…",
    notifyMe: "Laat weet my wanneer ek goedgekeur is",
    checking: "Kyk tans…",
    checkAgain: "Kyk weer",
    signOut: "← Teken Uit",
  },
  xh: {
    roles: { educator: "uThishala / uTitshala", psychologist: "Isazi Sengqondo", analyst: "Umhluzi Wedatha", admin: "Umlawuli" },
    eyebrow: "The Puzzle Project · Inkqubo yoHlolo",
    notFoundTitle: "Iakhawunti ayifumanekanga",
    notFoundBody: "Asikwazanga ukufumana ubhaliso lwale akhawunti. Ukuba usandula ukubhalisa, oku kufanele kulungiswe kungekudala — kungenjalo, isenokuba ayivunywanga. Qhagamshelana nomlawuli wakho.",
    awaitingTitle: "Ilinde ukuvunywa",
    awaitingBody: (name) => `Enkosi ngokubhalisa, ${name}. Umlawuli kufuneka avume iakhawunti yakho phambi kokuba ungene — uya kungeniswa ngoko nangoko xa oko kusenzeka, akukho mfuneko yokuhlaziya.`,
    name: "Igama:",
    email: "I-imeyile:",
    roleRequested: "Indima ecelweyo:",
    notifyOn: "Siza kukuthumelela isaziso nje ukuba uvunyiwe.",
    notifyDenied: "Izaziso zivaliwe kwiisetingi zebhrawuza yakho — usenako ukubuya uze ujonge apha.",
    notifyUnsupported: "Le bhrawuza ayixhasi izaziso ezityhalwayo — usenako ukubuya uze ujonge apha.",
    notifyError: "Asikwazanga ukuvula izaziso — nceda uzame kwakhona.",
    requesting: "Iyacela…",
    notifyMe: "Ndazise xa ndivunyiwe",
    checking: "Iyajonga…",
    checkAgain: "Jonga kwakhona",
    signOut: "← Phuma",
  },
};

export default function PendingApproval({ user, profile, onApproved }) {
  const { lang } = useLanguage();
  const t = T[lang] || T.en;
  const [notifyState, setNotifyState] = useState("idle"); // idle | requesting | on | unsupported | denied | error
  const [checking, setChecking] = useState(false);

  // Live: the moment an admin flips is_verified (or the row reappears after
  // having been missing), pull the fresh profile and hand off to App.js —
  // no manual refresh needed.
  useEffect(() => {
    let cancelled = false;

    const refetch = async () => {
      const { data } = await supabase.from("users").select("*").eq("id", user.uid).maybeSingle();
      if (cancelled || !data) return;
      const mapped = mapUserRow(data);
      if (mapped.isVerified) onApproved?.(mapped);
    };

    const channel = supabase
      .channel(`pending-approval-${user.uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "users", filter: `id=eq.${user.uid}` }, refetch)
      .subscribe();

    // Realtime replication has to be turned on per-table in the Supabase
    // dashboard (see the notes on the messages/screenings migrations) —
    // this poll is a safety net in case it isn't, so approval is never
    // silently missed while someone's sitting on this screen.
    const poll = setInterval(refetch, 15000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid]);

  const checkNow = async () => {
    setChecking(true);
    const { data } = await supabase.from("users").select("*").eq("id", user.uid).maybeSingle();
    setChecking(false);
    const mapped = data ? mapUserRow(data) : null;
    if (mapped?.isVerified) onApproved?.(mapped);
  };

  const handleEnablePush = async () => {
    setNotifyState("requesting");
    if (!pushSupported()) { setNotifyState("unsupported"); return; }
    const result = await enablePushNotifications(user.uid);
    if (result.ok) setNotifyState("on");
    else if (result.reason === "denied") setNotifyState("denied");
    else setNotifyState("error");
  };

  const missingRow = !profile;

  return (
    <div className="pb-login-page">
      <div className="pb-login-visual" aria-hidden="true">
        <div className="pb-login-visual-glow" />
        <span className="pb-ambient-piece" style={{ top: "20%", left: "20%", width: 90, height: 90, "--rot": "10deg" }}>
          <SinglePuzzlePiece fill="var(--teal, #009B8D)" opacity={0.4} rotate={10} />
        </span>
        <span className="pb-ambient-piece" style={{ top: "60%", left: "68%", width: 70, height: 70, "--rot": "-15deg" }}>
          <SinglePuzzlePiece fill="var(--orange, #F26522)" opacity={0.35} rotate={-15} />
        </span>
        <div className="pb-login-visual-copy">
          <h1>The Puzzle Box</h1>
        </div>
      </div>

      <div className="pb-login-panel">
        <div className="pb-login-card">
          <div style={{ position: "absolute", top: 24, right: 24, zIndex: 2 }}>
            <LanguageSwitcher />
          </div>
          <div className="pb-login-card-head">
            <div className="pb-login-eyebrow">{t.eyebrow}</div>
            {missingRow ? (
              <>
                <h2>{t.notFoundTitle}</h2>
                <p>{t.notFoundBody}</p>
              </>
            ) : (
              <>
                <h2>{t.awaitingTitle}</h2>
                <p>{t.awaitingBody(profile.name || user.email)}</p>
              </>
            )}
          </div>

          {!missingRow && (
            <div style={{ background: "var(--surface, #F7F6FF)", borderRadius: 12, padding: "14px 16px", marginBottom: 18, fontSize: 13 }}>
              <div style={{ marginBottom: 4 }}><strong>{t.name}</strong> {profile.name || "—"}</div>
              <div style={{ marginBottom: 4 }}><strong>{t.email}</strong> {profile.email}</div>
              <div><strong>{t.roleRequested}</strong> {t.roles[profile.role] || profile.role}</div>
            </div>
          )}

          {notifyState === "on" && <div className="pb-alert pb-alert-info"> {t.notifyOn}</div>}
          {notifyState === "denied" && <div className="pb-alert pb-alert-error">{t.notifyDenied}</div>}
          {notifyState === "unsupported" && <div className="pb-alert pb-alert-error">{t.notifyUnsupported}</div>}
          {notifyState === "error" && <div className="pb-alert pb-alert-error">{t.notifyError}</div>}

          {!missingRow && notifyState !== "on" && (
            <button className="pb-submit" type="button" onClick={handleEnablePush} disabled={notifyState === "requesting"}>
              {notifyState === "requesting" ? t.requesting : ` ${t.notifyMe}`}
            </button>
          )}

          <button
            className="pb-submit"
            type="button"
            onClick={checkNow}
            disabled={checking}
            style={{ background: "transparent", color: "var(--ink, #1A1A2E)", border: "1.5px solid var(--border, #E4E1F5)", marginTop: 10 }}
          >
            {checking ? t.checking : t.checkAgain}
          </button>

          <div className="pb-switch-row" style={{ marginTop: 18 }}>
            <button type="button" className="pb-link-btn" onClick={() => signOut(auth)}>
              {t.signOut}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}