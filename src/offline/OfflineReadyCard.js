// Small card for the educator's home page: get the screener onto this device
// before visiting a school without signal, see how long it's valid for, and
// how many results are still waiting to upload.
//
// Usage (e.g. in TeacherHome.js):
//   <OfflineReadyCard onScreenOffline={() => openScreener({ preferOffline: true })} />

import React, { useCallback, useEffect, useState } from "react";
import {
  checkLicence, downloadOfflineScreener, loadOfflineScreener, pendingCount,
  syncOfflineSessions, QUEUE_EVENT,
} from "./offlineVault";

const TEAL = "#009B8D";
const INK = "#1A1A2E";
const BODY_FONT = "'DM Sans', sans-serif";
const HEADING_FONT = "'Poppins', sans-serif";

export default function OfflineReadyCard({ onScreenOffline }) {
  const [state, setState] = useState({ status: "loading" });
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    try { setState(await loadOfflineScreener()); } catch { setState({ status: "error" }); }
    try { setPending(await pendingCount()); } catch { /* storage unavailable */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Ask the server whether this device's licence is still valid, so a licence
  // an admin cancelled stops showing as "ready" here. Runs on load and again
  // whenever the connection comes back.
  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      await checkLicence().catch(() => {});
      if (!cancelled) refresh();
    };
    verify();
    window.addEventListener("online", verify);
    return () => { cancelled = true; window.removeEventListener("online", verify); };
  }, [refresh]);

  useEffect(() => {
    window.addEventListener(QUEUE_EVENT, refresh);
    return () => window.removeEventListener(QUEUE_EVENT, refresh);
  }, [refresh]);

  const download = async () => {
    setMessage("");
    if (!navigator.onLine) { setMessage("Connect to the internet to download the screener."); return; }
    setBusy(true);
    try {
      await downloadOfflineScreener();
      await refresh();
      setMessage("Ready. You can now screen at schools without signal for the next 7 days.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadNow = async () => {
    setMessage("");
    setBusy(true);
    const { synced = 0, remaining = 0 } = await syncOfflineSessions().catch(() => ({}));
    await refresh();
    setBusy(false);
    setMessage(
      synced > 0
        ? `${synced} ${synced === 1 ? "result" : "results"} uploaded and sent for review.`
        : remaining > 0 ? "Couldn't upload yet. Check your connection and try again." : "Nothing to upload."
    );
  };

  if (state.status === "loading") return null;

  const ready = state.status === "ready";
  const daysLeft = ready
    ? Math.max(0, Math.ceil((new Date(state.licence.expiresAt) - Date.now()) / 86_400_000))
    : 0;

  const button = (label, onClick, primary = true) => (
    <button onClick={onClick} disabled={busy} style={{
      padding: "9px 18px", borderRadius: 10, fontFamily: BODY_FONT, fontWeight: 700, fontSize: 13.5,
      cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1,
      background: primary ? TEAL : "transparent", color: primary ? "#fff" : TEAL,
      border: primary ? "none" : `1.5px solid ${TEAL}`,
    }}>{label}</button>
  );

  return (
    <div style={{ padding: "18px 20px", borderRadius: 14, border: "1px solid #e4e2ee", background: "#fff", color: INK, fontFamily: BODY_FONT }}>
      <div style={{ fontFamily: HEADING_FONT, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Offline screening</div>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: "0 0 14px" }}>
        {ready
          ? `On this device for ${daysLeft} more ${daysLeft === 1 ? "day" : "days"}.`
          : state.status === "revoked"
            ? "Offline access for this device has been withdrawn. Download the screener again to carry on screening offline."
            : state.status === "expired"
            ? "Your offline screener has expired. Download it again before your next visit."
            : state.status === "other_user"
              ? "The offline screener on this device belongs to another educator."
              : "Going to a school without signal? Download the screener to this device first."}
        {pending > 0 && ` ${pending} ${pending === 1 ? "result is" : "results are"} waiting to upload.`}
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {state.status !== "other_user" && button(ready ? "Refresh download" : "Download screener", download, !ready)}
        {ready && onScreenOffline && button("Screen offline", onScreenOffline)}
        {pending > 0 && button("Upload now", uploadNow, false)}
      </div>
      {message && <p role="status" style={{ marginTop: 12, fontSize: 13 }}>{message}</p>}
    </div>
  );
}