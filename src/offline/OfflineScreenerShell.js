// Wraps the screener when it runs offline. Handles download, expiry,
// watermarking and copy/print deterrence.
//
// Usage:
// <OfflineScreenerShell>
//   {(screener, licence) => <ScreenerForm questions={screener.questions} licence={licence} />}
// </OfflineScreenerShell>

import React, { useCallback, useEffect, useState } from "react";
import { downloadOfflineScreener, loadOfflineScreener, pendingCount, QUEUE_EVENT } from "./offlineVault";

const TEAL = "#009B8D";
const INK = "#1A1A2E";
// Same fonts as the rest of the site (Poppins headings, DM Sans body)
const HEADING_FONT = "'Poppins', sans-serif";
const BODY_FONT = "'DM Sans', sans-serif";

const MESSAGES = {
  none: "The screener isn't on this device yet. Connect to the internet and download it before going to a school without signal.",
  revoked: "Offline access for this device has been withdrawn. Connect to the internet and download the screener again. Any results you captured are still saved and will upload first.",
  expired: "Your offline licence has expired. Connect to the internet and download the screener again. Any results you captured are still saved and will upload first.",
  locked: "The device clock looks wrong, so the screener is locked. Set the correct date and time, then reopen it.",
  damaged: "The saved screener on this device couldn't be opened. Connect to the internet and download it again. Any results you captured are still saved and will upload first.",
  other_user: "The offline screener on this device was downloaded by another educator. Sign in with that account to use it or to upload their results.",
  error: "The screener couldn't open on this device. If you're in a private or incognito window, switch to a normal one. Otherwise, reload the page and try again.",
};

// Typing in a form field (e.g. observation notes) shouldn't be blocked
const isEditable = (el) =>
  !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

function Watermark({ text }) {
  const tiles = Array.from({ length: 40 });
  return (
    <div aria-hidden="true" style={{
      position: "absolute", inset: 0, overflow: "hidden",
      pointerEvents: "none", zIndex: 50,
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
      alignContent: "start", rowGap: 90,
    }}>
      {tiles.map((_, i) => (
        <span key={i} style={{
          transform: "rotate(-24deg)", whiteSpace: "nowrap",
          fontSize: 12, color: INK, opacity: 0.07, userSelect: "none",
        }}>
          {text}
        </span>
      ))}
    </div>
  );
}

export default function OfflineScreenerShell({ children }) {
  const [state, setState] = useState({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(0);

  const updatePending = useCallback(async () => {
    try { setPending(await pendingCount()); } catch { /* storage unavailable */ }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setState(await loadOfflineScreener());
    } catch {
      // IndexedDB blocked (private mode) or storage error: never leave the
      // user stuck on "Opening screener…"
      setState({ status: "error" });
    }
    updatePending();
  }, [updatePending]);

  useEffect(() => { refresh(); }, [refresh]);

  // Keep the "waiting to sync" count current as sessions are saved and uploaded
  useEffect(() => {
    window.addEventListener(QUEUE_EVENT, updatePending);
    return () => window.removeEventListener(QUEUE_EVENT, updatePending);
  }, [updatePending]);

  // Block copy, right-click and save shortcuts while the screener is open.
  // Form fields are left alone so examiners can still edit their own notes.
  useEffect(() => {
    if (state.status !== "ready") return;
    const block = (e) => { if (!isEditable(e.target)) e.preventDefault(); };
    const blockKeys = (e) => {
      const k = e.key.toLowerCase();
      if (!(e.ctrlKey || e.metaKey)) return;
      if (["p", "s"].includes(k)) e.preventDefault();
      else if (["c", "a"].includes(k) && !isEditable(e.target)) e.preventDefault();
    };
    document.addEventListener("copy", block);
    document.addEventListener("contextmenu", block);
    document.addEventListener("keydown", blockKeys);
    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("keydown", blockKeys);
    };
  }, [state.status]);

  const handleDownload = async () => {
    setError("");
    if (!navigator.onLine) {
      setError("You're offline. Connect to the internet to download the screener.");
      return;
    }
    setBusy(true);
    try {
      await downloadOfflineScreener();
      await refresh();
    } catch (e) {
      setError(e.message);
      updatePending();
    } finally {
      setBusy(false);
    }
  };

  if (state.status === "loading") {
    return <p style={{ padding: 32, color: INK, fontFamily: BODY_FONT }}>Opening screener…</p>;
  }

  if (state.status !== "ready") {
    const canDownload = !["locked", "error", "other_user"].includes(state.status);
    return (
      <div style={{ maxWidth: 480, margin: "64px auto", padding: 28, borderRadius: 14, border: "1px solid #e4e2ee", fontFamily: BODY_FONT, color: INK }}>
        <h2 style={{ fontFamily: HEADING_FONT, fontSize: 20, marginBottom: 10 }}>Offline screener</h2>
        <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{MESSAGES[state.status] || MESSAGES.error}</p>
        {pending > 0 && (
          <p style={{ fontSize: 13, marginBottom: 16 }}>
            {pending} {pending === 1 ? "result is" : "results are"} waiting to sync.
          </p>
        )}
        {canDownload && (
          <button onClick={handleDownload} disabled={busy} style={{
            padding: "11px 22px", borderRadius: 10, border: "none",
            background: TEAL, color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: BODY_FONT,
            cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1,
          }}>
            {busy ? (pending > 0 ? "Uploading results…" : "Downloading…") : "Download screener"}
          </button>
        )}
        {error && <p role="alert" style={{ marginTop: 14, fontSize: 13, color: "#B4123F" }}>{error}</p>}
      </div>
    );
  }

  const { licence, screener } = state;
  const daysLeft = Math.max(0, Math.ceil((new Date(licence.expiresAt) - Date.now()) / 86_400_000));
  const watermarkText = `${licence.examiner}  ${String(licence.id).slice(0, 8)}`;

  return (
    <div className="offline-screener" style={{ position: "relative", userSelect: "none", fontFamily: BODY_FONT }}>
      <style>{`@media print { .offline-screener { display: none !important; } }`}</style>
      <Watermark text={watermarkText} />
      <div style={{
        display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
        padding: "10px 16px", background: "#E0F5F3", color: "#0F5E56",
        fontSize: 13, borderRadius: 10, marginBottom: 16,
      }}>
        <span>Offline mode. Licensed to {licence.examiner}.</span>
        <span>Licence ends in {daysLeft} {daysLeft === 1 ? "day" : "days"}{pending > 0 ? `, ${pending} waiting to sync` : ""}.</span>
      </div>
      {children(screener, licence)}
    </div>
  );
}