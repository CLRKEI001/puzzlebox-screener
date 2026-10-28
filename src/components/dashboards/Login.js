// Login.js — The Puzzle Box Screener System
// Handles: sign in, new-account registration (with staff/teacher number
// captured for future verification), and forgot-password.
//
// Sign-up creates the account but does NOT grant access: every new account
// is inserted with is_verified = false, and App.js's gate (PendingApproval)
// keeps it off every dashboard until an admin approves it there. This file
// only needs to create the account correctly — the actual gate lives in
// App.js so it can't be bypassed by any other entry point into the app.

import React, { useState } from "react";
import { auth } from "../../services/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { supabase } from "../../services/supabaseClient";
import { mapUserRow } from "../../utils/mappers";
import { PuzzlePiece, SinglePuzzlePiece } from "../shared/puzzlePiece";
import ThemeToggle from "../../theme/ThemeToggle";
import { useLanguage, LanguageSwitcher } from "../../theme/LanguageContext";
import "./Login.css";

// Administrator is deliberately NOT self-registerable here — letting anyone
// pick "Administrator" at sign-up and land on AdminHome the moment an
// admin (or a bug) mis-clicks Approve would defeat the whole point of an
// approval gate. Admin accounts are created by promoting an existing user
// (update their `role` directly) — see the note under the role picker.
// `value` is what's saved to the database and must never change; the
// visible label comes from T[lang].roles[value].
const ROLES = [
  { value: "educator", color: "var(--orange, #F26522)" },
  { value: "psychologist", color: "var(--pink, #E8175D)" },
  { value: "analyst", color: "var(--teal, #009B8D)" },
];

// The Puzzle Box site sends visitors here from the Tier 1 / Tier 2 cards
// ("click to sign-up / login"). When a tier is supplied the sign-up form is
// narrowed to the role that tier is for; with no tier (plain "Login" button)
// every self-service role stays selectable, exactly as before.
// Visible tier text lives in T[lang].tiers; role labels a tier overrides
// live in T[lang].tierRoleLabels.
const TIERS = {
  1: { roles: ["educator"] },
  2: { roles: ["psychologist"] },
};

const T = {
  en: {
    roles: { educator: "Educator / Teacher", psychologist: "Psychologist", analyst: "Data Analyst" },
    tiers: {
      1: { label: "Tier 1", title: "Teachers & Primary Healthcare" },
      2: { label: "Tier 2", title: "Psychologists" },
    },
    tierRoleLabels: { 1: { educator: "Teacher / Primary healthcare practitioner" }, 2: {} },
    screenerSystem: "Screener System",
    backHome: "← Back to homepage",
    titleLogin: "Welcome back",
    titleRegister: "Create your account",
    titleForgot: "Reset your password",
    subLogin: "Sign in with your email and password.",
    subRegister: "Register with your staff or teacher number.",
    subForgot: "We'll email you a link to set a new password.",
    emailLabel: "Email address",
    passwordLabel: "Password",
    forgotLink: "Forgot password?",
    signingIn: "Signing in…",
    signIn: "Sign In →",
    notRegistered: "Not registered yet?",
    createAnAccount: "Create an account",
    fullName: "Full name",
    namePlaceholder: "e.g. Nomsa Dlamini",
    role: "Role",
    adminNote: "Need an administrator account? Ask an existing admin to grant it — admin access isn't available through self sign-up.",
    staffLabel: "Staff / teacher number",
    staffPlaceholder: "e.g. SACE-0234871",
    passwordPlaceholder: "At least 6 characters",
    confirm: "Confirm",
    confirmPlaceholder: "Repeat password",
    creatingAccount: "Creating account…",
    createAccount: "Create account →",
    haveAccount: "Already have an account?",
    signInInstead: "Sign in instead",
    sending: "Sending…",
    sendReset: "Send reset link →",
    backToSignIn: "← Back to sign in",
    resetSent: (email) => `If ${email} has an account, a reset link is on its way.`,
    errPasswordShort: "Password must be at least 6 characters.",
    errPasswordMismatch: "Passwords don't match.",
    errStaffRequired: "Your staff / teacher number is required.",
    errStaffTaken: "That staff / teacher number is already registered. Try signing in, or contact your administrator.",
    errEmailInUse: "That email is already registered — try signing in instead.",
    errInvalidCredentials: "Invalid email or password. Please try again.",
    errInvalidEmail: "Please enter a valid email address.",
    errTooMany: "Too many attempts — please wait a moment and try again.",
    errGeneric: "Something went wrong. Please try again.",
  },
  af: {
    roles: { educator: "Opvoeder / Onderwyser", psychologist: "Sielkundige", analyst: "Data-ontleder" },
    tiers: {
      1: { label: "Vlak 1", title: "Onderwysers & Primêre Gesondheidsorg" },
      2: { label: "Vlak 2", title: "Sielkundiges" },
    },
    tierRoleLabels: { 1: { educator: "Onderwyser / Primêre gesondheidsorgpraktisyn" }, 2: {} },
    screenerSystem: "Sifterstelsel",
    backHome: "← Terug na tuisblad",
    titleLogin: "Welkom terug",
    titleRegister: "Skep jou rekening",
    titleForgot: "Herstel jou wagwoord",
    subLogin: "Teken in met jou e-pos en wagwoord.",
    subRegister: "Registreer met jou personeel- of onderwysernommer.",
    subForgot: "Ons sal vir jou 'n skakel e-pos om 'n nuwe wagwoord te stel.",
    emailLabel: "E-posadres",
    passwordLabel: "Wagwoord",
    forgotLink: "Wagwoord vergeet?",
    signingIn: "Teken tans in…",
    signIn: "Teken In →",
    notRegistered: "Nog nie geregistreer nie?",
    createAnAccount: "Skep 'n rekening",
    fullName: "Volle naam",
    namePlaceholder: "bv. Nomsa Dlamini",
    role: "Rol",
    adminNote: "Het jy 'n administrateursrekening nodig? Vra 'n bestaande admin om dit toe te ken — admin-toegang is nie deur selfregistrasie beskikbaar nie.",
    staffLabel: "Personeel- / onderwysernommer",
    staffPlaceholder: "bv. SACE-0234871",
    passwordPlaceholder: "Ten minste 6 karakters",
    confirm: "Bevestig",
    confirmPlaceholder: "Herhaal wagwoord",
    creatingAccount: "Skep tans rekening…",
    createAccount: "Skep rekening →",
    haveAccount: "Het jy reeds 'n rekening?",
    signInInstead: "Teken eerder in",
    sending: "Stuur tans…",
    sendReset: "Stuur herstelskakel →",
    backToSignIn: "← Terug na aanteken",
    resetSent: (email) => `As ${email} 'n rekening het, is 'n herstelskakel op pad.`,
    errPasswordShort: "Wagwoord moet ten minste 6 karakters lank wees.",
    errPasswordMismatch: "Wagwoorde stem nie ooreen nie.",
    errStaffRequired: "Jou personeel- / onderwysernommer word vereis.",
    errStaffTaken: "Daardie personeel- / onderwysernommer is reeds geregistreer. Probeer aanteken, of kontak jou administrateur.",
    errEmailInUse: "Daardie e-pos is reeds geregistreer — probeer eerder aanteken.",
    errInvalidCredentials: "Ongeldige e-pos of wagwoord. Probeer asseblief weer.",
    errInvalidEmail: "Voer asseblief 'n geldige e-posadres in.",
    errTooMany: "Te veel pogings — wag asseblief 'n oomblik en probeer weer.",
    errGeneric: "Iets het verkeerd geloop. Probeer asseblief weer.",
  },
  xh: {
    roles: { educator: "uThishala / uTitshala", psychologist: "Isazi Sengqondo", analyst: "Umhluzi Wedatha" },
    tiers: {
      1: { label: "Inqanaba 1", title: "Ootitshala noNonophelo lweMpilo oluSisiseko" },
      2: { label: "Inqanaba 2", title: "Izazi Zengqondo" },
    },
    tierRoleLabels: { 1: { educator: "uTitshala / Umsebenzi wononophelo lwempilo olusisiseko" }, 2: {} },
    screenerSystem: "Inkqubo yoHlolo",
    backHome: "← Buyela kwikhasi lasekhaya",
    titleLogin: "Wamkelekile kwakhona",
    titleRegister: "Yenza iakhawunti yakho",
    titleForgot: "Seta kwakhona iphasiwedi yakho",
    subLogin: "Ngena nge-imeyile yakho nephasiwedi.",
    subRegister: "Bhalisa ngenombolo yakho yomsebenzi okanye katitshala.",
    subForgot: "Siza kukuthumelela ikhonkco nge-imeyile ukuze useke iphasiwedi entsha.",
    emailLabel: "I-imeyile",
    passwordLabel: "Iphasiwedi",
    forgotLink: "Uyilibele iphasiwedi?",
    signingIn: "Iyangena…",
    signIn: "Ngena →",
    notRegistered: "Akukabhalisi?",
    createAnAccount: "Yenza iakhawunti",
    fullName: "Igama elipheleleyo",
    namePlaceholder: "umz. Nomsa Dlamini",
    role: "Indima",
    adminNote: "Ufuna iakhawunti yomlawuli? Cela umlawuli okhoyo ukuba akunike yona — ukufikelela komlawuli akufumaneki ngokuzibhalisa.",
    staffLabel: "Inombolo yomsebenzi / katitshala",
    staffPlaceholder: "umz. SACE-0234871",
    passwordPlaceholder: "Ubuncinane boonobumba aba-6",
    confirm: "Qinisekisa",
    confirmPlaceholder: "Phinda iphasiwedi",
    creatingAccount: "Iyenza iakhawunti…",
    createAccount: "Yenza iakhawunti →",
    haveAccount: "Sele unayo iakhawunti?",
    signInInstead: "Ngena endaweni yoko",
    sending: "Iyathumela…",
    sendReset: "Thumela ikhonkco lokuseta kwakhona →",
    backToSignIn: "← Buyela ekungeneni",
    resetSent: (email) => `Ukuba u-${email} unayo iakhawunti, ikhonkco lokuseta kwakhona lisendleleni.`,
    errPasswordShort: "Iphasiwedi kufuneka ibe noonobumba aba-6 ubuncinane.",
    errPasswordMismatch: "Iiphasiwedi azifani.",
    errStaffRequired: "Inombolo yakho yomsebenzi / katitshala iyafuneka.",
    errStaffTaken: "Loo nombolo yomsebenzi / katitshala sele ibhalisiwe. Zama ukungena, okanye uqhagamshelane nomlawuli wakho.",
    errEmailInUse: "Loo imeyile sele ibhalisiwe — zama ukungena endaweni yoko.",
    errInvalidCredentials: "I-imeyile okanye iphasiwedi engachanekanga. Nceda uzame kwakhona.",
    errInvalidEmail: "Nceda ufake idilesi ye-imeyile esebenzayo.",
    errTooMany: "Iinzame ezininzi kakhulu — nceda ulinde umzuzwana uze uzame kwakhona.",
    errGeneric: "Kukho into engahambanga kakuhle. Nceda uzame kwakhona.",
  },
};

const EMPTY_REGISTER = {
  name: "",
  email: "",
  password: "",
  confirm: "",
  role: "educator",
  staffNumber: "",
};

// A handful of jigsaw-outline pieces that drift slowly behind the form.
// Kept purely decorative — aria-hidden and paused under reduced motion.
const AMBIENT_PIECES = [
  { top: "6%",  left: "10%", size: 74,  rotate: 12,  delay: "0s",   duration: "22s", color: "var(--teal, #009B8D)",   opacity: 0.5,  blur: 0 },
  { top: "64%", left: "4%",  size: 50,  rotate: -18, delay: "-4s",  duration: "26s", color: "var(--purple, #6B2F8A)", opacity: 0.4,  blur: 0 },
  { top: "16%", left: "80%", size: 60,  rotate: 30,  delay: "-9s",  duration: "20s", color: "var(--pink, #E8175D)",   opacity: 0.45, blur: 0 },
  { top: "74%", left: "76%", size: 80,  rotate: -8,  delay: "-14s", duration: "28s", color: "var(--orange, #F26522)", opacity: 0.35, blur: 0 },
  { top: "44%", left: "90%", size: 44,  rotate: 50,  delay: "-2s",  duration: "18s", color: "var(--teal, #009B8D)",   opacity: 0.4,  blur: 0 },
  { top: "38%", left: "0%",  size: 40,  rotate: -35, delay: "-11s", duration: "24s", color: "var(--pink, #E8175D)",   opacity: 0.35, blur: 0 },
  { top: "88%", left: "26%", size: 34,  rotate: 20,  delay: "-7s",  duration: "21s", color: "var(--orange, #F26522)", opacity: 0.3,  blur: 0 },
  { top: "4%",  left: "46%", size: 120, rotate: -12, delay: "-16s", duration: "30s", color: "var(--purple, #6B2F8A)", opacity: 0.16, blur: 8 },
  { top: "60%", left: "42%", size: 140, rotate: 22,  delay: "-6s",  duration: "34s", color: "var(--teal, #009B8D)",   opacity: 0.14, blur: 10 },
];


export default function Login({ onVerified, onBack, tier = null, initialMode = "login" }) {
  const { lang } = useLanguage();
  const t = T[lang] || T.en;
  const tierInfo = TIERS[tier] || null;
  const tierText = tierInfo ? t.tiers[tier] : null;
  const tierRoleLabels = tierInfo ? t.tierRoleLabels[tier] || {} : {};
  const visibleRoles = tierInfo ? ROLES.filter((r) => tierInfo.roles.includes(r.value)) : ROLES;

  const [mode, setMode] = useState(initialMode); // login | register | forgot

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [reg, setReg] = useState({
    ...EMPTY_REGISTER,
    role: tierInfo ? tierInfo.roles[0] : EMPTY_REGISTER.role,
  });
  const [forgotEmail, setForgotEmail] = useState("");

  const resetMessages = () => {
    setError("");
    setInfo("");
  };

  const switchMode = (next) => {
    resetMessages();
    setMode(next);
  };

  // ── LOGIN ──────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      const { data: profileRow, error: profileError } = await supabase.from("users").select("*").eq("id", cred.user.uid).maybeSingle();
      if (profileError) throw profileError;

      // Hand whatever we found to App.js unfiltered — including a missing
      // row (e.g. a rejected account) or is_verified: false. App.js's gate
      // is what decides whether that's enough to reach a dashboard; this
      // component never makes that call itself.
      onVerified?.(profileRow ? mapUserRow(profileRow) : null);
    } catch (err) {
      setError(friendlyAuthError(err, t));
    }
    setLoading(false);
  };

  // ── REGISTER ───────────────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    resetMessages();

    if (reg.password.length < 6) {
      setError(t.errPasswordShort);
      return;
    }
    if (reg.password !== reg.confirm) {
      setError(t.errPasswordMismatch);
      return;
    }
    if (!reg.staffNumber.trim()) {
      setError(t.errStaffRequired);
      return;
    }

    setLoading(true);
    try {
      // A lightweight duplicate check before creating the Firebase account —
      // makes it harder to flood the admin's Pending Approvals list with
      // near-identical fake accounts under the same staff/teacher number.
      // A new visitor can't read the users table, so ask the database a
      // yes/no question instead (supabase/database/01: staff_number_taken).
      const { data: taken, error: dupError } = await supabase.rpc("staff_number_taken", {
        p_staff_number: reg.staffNumber.trim(),
      });
      if (dupError) throw dupError;
      if (taken) {
        setError(t.errStaffTaken);
        setLoading(false);
        return;
      }

      const cred = await createUserWithEmailAndPassword(auth, reg.email, reg.password);
      const newProfile = {
        id: cred.user.uid,
        name: reg.name,
        email: reg.email,
        role: reg.role,
        staff_number: reg.staffNumber.trim(),
        is_verified: false, // the actual gate — see App.js / PendingApproval.js
      };
      const { error: insertError } = await supabase.from("users").insert(newProfile);
      if (insertError) throw insertError;

      // Hands off to App.js's gate, which will render PendingApproval
      // (is_verified is false) rather than any dashboard.
      onVerified?.(mapUserRow(newProfile));
    } catch (err) {
      setError(friendlyAuthError(err, t));
    }
    setLoading(false);
  };

  // ── FORGOT PASSWORD ────────────────────────────────────────────────────
  const handleForgot = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setInfo(t.resetSent(forgotEmail));
    } catch (err) {
      setError(friendlyAuthError(err, t));
    }
    setLoading(false);
  };

  return (
    <div className="pb-login-page">
      {/* ── LEFT: brand / ambient puzzle pieces ── */}
      <div className="pb-login-visual" aria-hidden="true">
        <div className="pb-login-visual-glow" />
        {AMBIENT_PIECES.map((p, i) => (
          <span
            key={i}
            className="pb-ambient-piece"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
              filter: p.blur ? `blur(${p.blur}px)` : undefined,
              "--rot": `${p.rotate}deg`,
            }}
          >
            <SinglePuzzlePiece fill={p.color} opacity={p.opacity} rotate={p.rotate} />
          </span>
        ))}
        <div className="pb-login-visual-copy">
          <div className="pb-login-mark">
            <PuzzlePiece rotate={0}   fill="var(--teal, #009B8D)"   className="pb-mark-piece" />
            <PuzzlePiece rotate={90}  fill="var(--orange, #F26522)" className="pb-mark-piece" />
            <PuzzlePiece rotate={180} fill="var(--pink, #E8175D)"   className="pb-mark-piece" />
            <PuzzlePiece rotate={270} fill="var(--purple, #6B2F8A)" className="pb-mark-piece" />
          </div>
          <h1>The Puzzle Box</h1>
          <p></p>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                marginTop: 22,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.35)",
                color: "#fff",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 700,
                padding: "9px 18px",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              {t.backHome}
            </button>
          )}
        </div>
      </div>

      {/* ── RIGHT: form ── */}
      <div className="pb-login-panel">
        <div className="pb-login-card">
          <div style={{ position: "absolute", top: 24, right: 24, zIndex: 2, display: "flex", alignItems: "center", gap: 10 }}>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <div className="pb-login-card-head">
            <div className="pb-login-eyebrow">
              {tierInfo
                ? `The Puzzle Box · ${tierText.label} — ${tierText.title}`
                : `The Puzzle Box · ${t.screenerSystem}`}
            </div>
            <h2>
              {mode === "login" && t.titleLogin}
              {mode === "register" && t.titleRegister}
              {mode === "forgot" && t.titleForgot}
            </h2>
            <p className="pb-login-sub">
              {mode === "login" && t.subLogin}
              {mode === "register" && t.subRegister}
              {mode === "forgot" && t.subForgot}
            </p>
          </div>

          {error && <div className="pb-alert pb-alert-error">{error}</div>}
          {info && <div className="pb-alert pb-alert-info">{info}</div>}

          {mode === "login" && (
            <form onSubmit={handleLogin}>
              <label className="pb-label" htmlFor="login-email">{t.emailLabel}</label>
              <input
                id="login-email"
                className="pb-input"
                type="email"
                placeholder="you@puzzleproject.org.za"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <div className="pb-label-row">
                <label className="pb-label" htmlFor="login-password">{t.passwordLabel}</label>
                <button type="button" className="pb-link-btn" onClick={() => switchMode("forgot")}>
                  {t.forgotLink}
                </button>
              </div>
              <input
                id="login-password"
                className="pb-input"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button className="pb-submit" type="submit" disabled={loading}>
                {loading ? t.signingIn : t.signIn}
              </button>
              <div className="pb-switch-row">
                {t.notRegistered}{" "}
                <button type="button" className="pb-link-btn" onClick={() => switchMode("register")}>
                  {t.createAnAccount}
                </button>
              </div>
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={handleRegister}>
              <label className="pb-label" htmlFor="reg-name">{t.fullName}</label>
              <input
                id="reg-name"
                className="pb-input"
                placeholder={t.namePlaceholder}
                value={reg.name}
                onChange={(e) => setReg({ ...reg, name: e.target.value })}
                required
              />

              <label className="pb-label">{t.role}</label>
              <div className="pb-role-grid" style={tierInfo ? { gridTemplateColumns: "1fr" } : undefined}>
                {visibleRoles.map((r) => (
                  <button
                    type="button"
                    key={r.value}
                    className={`pb-role-chip ${reg.role === r.value ? "active" : ""}`}
                    style={{ "--chip-color": r.color }}
                    onClick={() => setReg({ ...reg, role: r.value })}
                  >
                    {tierRoleLabels[r.value] || t.roles[r.value]}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 12, color: "var(--ink-faint, #8888a8)", margin: "-6px 0 14px" }}>
                {t.adminNote}
              </p>

              <label className="pb-label" htmlFor="reg-staff">
                {t.staffLabel}
              </label>
              <input
                id="reg-staff"
                className="pb-input"
                placeholder={t.staffPlaceholder}
                value={reg.staffNumber}
                onChange={(e) => setReg({ ...reg, staffNumber: e.target.value })}
                required
              />

              <label className="pb-label" htmlFor="reg-email">{t.emailLabel}</label>
              <input
                id="reg-email"
                className="pb-input"
                type="email"
                placeholder="you@puzzleproject.org.za"
                value={reg.email}
                onChange={(e) => setReg({ ...reg, email: e.target.value })}
                required
                autoComplete="email"
              />

              <div className="pb-input-pair">
                <div>
                  <label className="pb-label" htmlFor="reg-password">{t.passwordLabel}</label>
                  <input
                    id="reg-password"
                    className="pb-input"
                    type="password"
                    placeholder={t.passwordPlaceholder}
                    value={reg.password}
                    onChange={(e) => setReg({ ...reg, password: e.target.value })}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="pb-label" htmlFor="reg-confirm">{t.confirm}</label>
                  <input
                    id="reg-confirm"
                    className="pb-input"
                    type="password"
                    placeholder={t.confirmPlaceholder}
                    value={reg.confirm}
                    onChange={(e) => setReg({ ...reg, confirm: e.target.value })}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button className="pb-submit" type="submit" disabled={loading}>
                {loading ? t.creatingAccount : t.createAccount}
              </button>
              <div className="pb-switch-row">
                {t.haveAccount}{" "}
                <button type="button" className="pb-link-btn" onClick={() => switchMode("login")}>
                  {t.signInInstead}
                </button>
              </div>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleForgot}>
              <label className="pb-label" htmlFor="forgot-email">{t.emailLabel}</label>
              <input
                id="forgot-email"
                className="pb-input"
                type="email"
                placeholder="you@puzzleproject.org.za"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <button className="pb-submit" type="submit" disabled={loading}>
                {loading ? t.sending : t.sendReset}
              </button>
              <div className="pb-switch-row">
                <button type="button" className="pb-link-btn" onClick={() => switchMode("login")}>
                  {t.backToSignIn}
                </button>
              </div>
            </form>
          )}

          <div className="pb-login-footer">
            
            <br />
           
          </div>
        </div>
      </div>
    </div>
  );
}

function friendlyAuthError(err, t = T.en) {
  const code = err?.code || "";
  if (code.includes("email-already-in-use")) return t.errEmailInUse;
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found"))
    return t.errInvalidCredentials;
  if (code.includes("weak-password")) return t.errPasswordShort;
  if (code.includes("invalid-email")) return t.errInvalidEmail;
  if (code.includes("too-many-requests")) return t.errTooMany;
  return t.errGeneric;
}

/*
README — wiring this in
========================
1. Supabase: this expects a "users" table with columns { id (Firebase UID,
   primary key), name, email, role, staff_number, is_verified, created_at }.
   is_verified is the real approval gate — App.js renders PendingApproval
   instead of any dashboard until an admin flips it true from AdminHome's
   Pending Approvals list.

2. App.js's onAuthStateChanged loads whatever profile exists for the
   signed-in Firebase user (including none at all) and lets its gate decide
   what to render — this file never grants access itself.

3. Drop PuzzleTransition.js next to Login.js — it's the full-screen
   "pieces fly together" animation, played only once an approved account
   actually reaches a dashboard.
*/