// src/offline/offlineVault.js
// Stores the offline screener encrypted in IndexedDB and syncs offline sessions.
// Login is Firebase, data is Supabase.
//
// Each captured session is stored under its own key ("session:<id>") rather
// than in one shared array, so saving and syncing can never overwrite each
// other, and a session is only deleted after Supabase has accepted it.

import { supabase } from "../services/supabaseClient";
import { auth } from "../services/firebase";

// Same table the online screener (PuzzleBoxScreener.js) saves to, so offline
// results go through the normal psychologist review flow.
const SESSIONS_TABLE = "puzzlebox_screenings";
// Postgres "unique violation": this offline result was already uploaded
const ALREADY_SAVED = "23505";

const DB_NAME = "puzzlebox-offline";
const STORE = "vault";
const SESSION_PREFIX = "session:";
const DRAFT_PREFIX = "draft:"; // in-progress screening, one per child
// Set once the server says this device's licence was cancelled, so the card
// keeps saying "download it again" even after a reload or while offline.
const REVOKED_KEY = "revoked";

// Fired on window whenever the number of waiting sessions changes,
// so the UI can update its "waiting to sync" count.
export const QUEUE_EVENT = "offline-queue-changed";
const notify = () => window.dispatchEvent(new Event(QUEUE_EVENT));

// ── Firebase token for the edge function ─────────────────────────────────────
async function firebaseHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to use the offline screener.");
  return { "x-firebase-token": await user.getIdToken() };
}

// ── IndexedDB helpers ────────────────────────────────────────────────────────
// One shared connection instead of opening a new one on every call.


/**
 * Cached IndexedDB connection promise. Private to this module so the
 * database is only opened once and every function reuses the same connection.
 * Starts as null and is set the first time openDb() is called.
 */



/**
 * Opens the offline IndexedDB database (creating the object stores on first
 * run) and caches the connection in dbPromise so later calls reuse it
 * instead of reopening.
 *
 * @returns {Promise<IDBDatabase>} Resolves with the open database connection
 */

let dbPromise = null;
function openDb() {     /* opens IndexedDB once, reuses the connection */ 
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => { db.close(); dbPromise = null; };
        resolve(db);
      };
      req.onerror = () => { dbPromise = null; reject(req.error); };
    });
  }
  return dbPromise;
}

async function run(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

const get = (k) => run("readonly", (s) => s.get(k));
const put = (k, v) => run("readwrite", (s) => s.put(v, k));
const del = (k) => run("readwrite", (s) => s.delete(k));
const wipeAll = () => run("readwrite", (s) => s.clear());

const sessionRange = () => IDBKeyRange.bound(SESSION_PREFIX, SESSION_PREFIX + "￿");
const sessionKeys = () => run("readonly", (s) => s.getAllKeys(sessionRange()));
const draftRange = () => IDBKeyRange.bound(DRAFT_PREFIX, DRAFT_PREFIX + "\uffff");
const draftKeys = () => run("readonly", (s) => s.getAllKeys(draftRange()));

// Older versions kept every session in one "queue" array. Move them to their
// own keys, in a single transaction so it can't half-happen or run twice.
let migrated = null;
function migrateLegacyQueue() {
  if (!migrated) {
    migrated = run("readwrite", (s) => {
      const req = s.get("queue");
      req.onsuccess = () => {
        const legacy = req.result;
        if (!Array.isArray(legacy)) return;
        legacy.forEach((item) => s.put(item, SESSION_PREFIX + crypto.randomUUID()));
        s.delete("queue");
      };
      return req;
    }).catch((e) => { migrated = null; throw e; });
  }
  return migrated;
}

// ── Encoding helpers ─────────────────────────────────────────────────────────
const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const toB64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};

async function encrypt(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { payload: toB64(cipher), iv: toB64(iv) };
}

async function decrypt(key, { payload, iv }) {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(iv) }, key, fromB64(payload));
  return JSON.parse(new TextDecoder().decode(plain));
}

// ── Device ID ────────────────────────────────────────────────────────────────
export async function getDeviceId() {
  let id = await get("deviceId");
  if (!id) {
    id = crypto.randomUUID();
    await put("deviceId", id);
  }
  return id;
}


/**
 * Downloads the screener content (puzzles, questions, assets) from the server
 * and stores it in IndexedDB so the screener can run without an internet
 * connection. Call this while online, before going out to a school.
 *
 * @returns {Promise<void>} Resolves once the screener is stored locally
 */

export async function downloadOfflineScreener() {
  // Waiting sessions are encrypted with the current key. Downloading issues a
  // new key, which would make them unreadable, so upload them first and refuse
  // to continue if any are still left.
  if ((await pendingCount()) > 0) {
    await syncOfflineSessions();
    const left = await pendingCount();
    if (left > 0) {
      throw new Error(
        `${left} ${left === 1 ? "result hasn't" : "results haven't"} uploaded yet. ` +
        "Stay connected and try again, so nothing is lost when the screener is downloaded."
      );
    }
  }

  const deviceId = await getDeviceId();
  const { data, error } = await supabase.functions.invoke("issue-offline-package", {
    body: { deviceId },
    headers: await firebaseHeaders(),
  });

  if (error) {
    const body = await error.context?.json?.().catch(() => null);
    throw new Error(body?.error || "Download failed. Check your connection and try again.");
  }

  
  // Client side: runs after the app downloads the package from the Edge Function.

// Import the raw AES-256 key bytes (sent base64-encoded) as a CryptoKey.
// `false` makes it NON-extractable: once imported, JavaScript can use the
// key to encrypt/decrypt but can never read the raw bytes back out. That
// limits the damage if something later reads the app's local storage.

  const key = await crypto.subtle.importKey("raw", fromB64(data.key), "AES-GCM", false, ["encrypt", "decrypt"]);


  // Persist everything needed to open the screener offline.
// (Assuming `put` is a helper that writes to IndexedDB. CryptoKey objects
// can be stored there directly without being exported.)

// The imported key, so the app can decrypt on later launches

  await put("key", key);

  // The encrypted screener plus its IV. Both are needed for decryption;
// the IV isn't secret, but it must match the one used to encrypt.

  await put("package", { payload: data.payload, iv: data.iv });

  // The licence info (including the expiry date) so the app can check
// whether the offline package is still valid without a network connection
  await put("licence", data.licence);

  // Record the last time the app saw "now". On later launches, if the
// device clock is earlier than this value, the clock has been rolled back
// and the expiry check can't be trusted.

  await put("lastSeen", Date.now());

  // A new licence replaces a cancelled one, so clear the old verdict.
  await del(REVOKED_KEY);
  notify();

  return data.licence;
}

/**
 * Reads the previously downloaded screener from IndexedDB so it can be
 * used while offline.
 *
 * @returns {Promise<Object|null>} The stored screener data, or null if it
 *   has not been downloaded yet
 */
export async function loadOfflineScreener() {
  const licence = await get("licence");
  if (!licence) return { status: "none" };

  // The licence belongs to whoever downloaded it. If someone else is signed in
  // on this browser, don't open it for them.
  if (licence.userId && auth.currentUser && auth.currentUser.uid !== licence.userId) {
    return { status: "other_user", licence };
  }

  // An administrator cancelled this licence (or deleted it) while the device
  // was online. The screener stays closed until a new one is downloaded.
  if (await get(REVOKED_KEY)) return { status: "revoked", licence };

  // Offline licence check: runs on app launch, before the screener is decrypted

  const now = Date.now();

  // Last time the app recorded the clock (written when the package was
// downloaded). Defaults to 0 if missing, so a fresh install never
// triggers the rollback check.
  const lastSeen = (await get("lastSeen")) || 0;

  
  // Clock rollback detection: the device can't verify the time offline, so
// compare against the latest time we've already seen. If "now" is earlier
// than lastSeen by more than 5 minutes, the clock was probably set back
// to stretch an expired licence. The 5-minute tolerance absorbs normal
// clock drift and small automatic time corrections, so honest users
// aren't locked out.
// "locked" blocks access without deleting anything, so the user can
// recover by correcting the clock or reconnecting to the network.

  if (now < lastSeen - 5 * 60_000) return { status: "locked", licence };

  // Expiry check: compare the current time to the licence's ISO expiry date.

  if (now > new Date(licence.expiresAt).getTime()) {

    // Delete the encrypted package so the screener content is no longer
  // stored on the device once the licence has lapsed.

    await del("package");
    return { status: "expired", licence };
  }

  const key = await get("key");
  const pkg = await get("package");
  if (!key || !pkg) return { status: "none" };

  let screener;
  try {
    screener = await decrypt(key, pkg);
  } catch {
    // Stored package is corrupt or doesn't match the key
    return { status: "damaged", licence };
  }

  await put("lastSeen", now);

  // Decrypted questions only ever live in memory
  return { status: "ready", licence, screener };
}

/**
 * Saves a completed (or in-progress) screening session to IndexedDB so that
 * no results are lost when there is no connection. Saved sessions stay
 * queued until syncOfflineSessions() uploads them.
 *
 * @param {Object} s - The screening session (child, responses, scores, etc.)
 * @returns {Promise<void>} Resolves once the session is stored locally
 */


export async function saveOfflineSession(session) {
  const key = await get("key");
  const licence = await get("licence");
  if (!key || !licence) throw new Error("No offline screener on this device.");

  // The same ID is used for the local key, the screening's own id and the
  // offline_session_id column (both unique in Supabase), so a retried upload
  // can never create a copy.
  const offlineId = session.id || crypto.randomUUID();
  const record = {
    ...session,
    id: offlineId,
    is_offline: true,
    licence_id: licence.id,
    captured_at: new Date().toISOString(),
    offline_session_id: offlineId,
  };

  await put(SESSION_PREFIX + offlineId, await encrypt(key, record));
  notify();
}

// ── In-progress screenings (drafts) ──────────────────────────────────────────
// Autosaved on the device as the examiner goes, encrypted like everything
// else, so a refresh or flat battery mid-screening loses nothing.
export async function saveDraft(draft) {
  const key = await get("key");
  if (!key) throw new Error("No offline screener on this device.");
  await put(DRAFT_PREFIX + draft.child_id, await encrypt(key, draft));
}

export async function getDraft(childId) {
  const key = await get("key");
  const item = await get(DRAFT_PREFIX + childId);
  if (!key || !item) return null;
  try { return await decrypt(key, item); } catch { return null; }
}

export const deleteDraft = (childId) => del(DRAFT_PREFIX + childId);

export async function pendingCount() {
  await migrateLegacyQueue();
  return (await sessionKeys()).length;
}

// ── Cancelled licences ───────────────────────────────────────────────────────

/**
 * Shuts the offline screener down on this device after the server says the
 * licence was cancelled (revoked, or its row deleted by an administrator).
 *
 * The encrypted screener and its key always go, so the questions can't be
 * opened again. Captured results are never thrown away: if anything is still
 * waiting to upload, or a screening is half-done, only the licence is marked
 * cancelled and the rest is wiped on the next sync, once nothing is left.
 *
 * @param {number} remaining - Sessions that failed to upload in this sync.
 * @returns {Promise<void>}
 */
async function applyRevocation(remaining = 0) {
  const stillWaiting = remaining > 0
    || (await sessionKeys()).length > 0
    || (await draftKeys()).length > 0;

  if (stillWaiting) {
    // Keep the saved results and drafts, but close the screener itself.
    await put(REVOKED_KEY, true);
    await del("package");
    await del("key");
  } else {
    await wipeAll();
  }
  notify();
}

/**
 * Asks the server whether this device's offline licence is still valid, and
 * applies the answer locally. Safe to call on every page load: it does
 * nothing when the device is offline, nobody is signed in, or no licence has
 * been downloaded.
 *
 * @returns {Promise<{ revoked: boolean, checked: boolean }>} `checked` is
 *   false when the server couldn't be reached, so the caller can leave the
 *   current state alone rather than treat it as cancelled.
 */
export async function checkLicence() {
  if (!navigator.onLine || !auth.currentUser) return { revoked: false, checked: false };

  const licence = await get("licence");
  if (!licence) return { revoked: false, checked: false };
  if (await get(REVOKED_KEY)) return { revoked: true, checked: true };

  try {
    const { data, error } = await supabase.functions.invoke("issue-offline-package", {
      body: { action: "status", licenceId: licence.id },
      headers: await firebaseHeaders(),
    });
    if (error) return { revoked: false, checked: false };

    if (data?.revoked) {
      // Upload anything outstanding first, so no result is lost with the licence.
      if ((await sessionKeys()).length > 0) await syncOfflineSessions().catch(() => {});
      await applyRevocation();
      return { revoked: true, checked: true };
    }
    return { revoked: false, checked: true };
  } catch {
    return { revoked: false, checked: false };
  }
}

// ── Sync when back online ────────────────────────────────────────────────────
// Only one sync runs at a time. A second call while one is running gets the
// same result instead of starting another upload of the same sessions.

/**
 * Uploads any sessions saved offline to the server once a connection is
 * available, and clears them from local storage after a successful sync.
 *
 * @returns {Promise<void>|void} Resolves when syncing is finished
 */

let syncing = null;
export function syncOfflineSessions() {
  if (!syncing) syncing = doSync().finally(() => { syncing = null; });
  return syncing;
}

async function doSync() {
  if (!navigator.onLine || !auth.currentUser) return { synced: 0 };

  const licence = await get("licence");
  const key = await get("key");
  if (!licence || !key) return { synced: 0 };

  await migrateLegacyQueue();

  let synced = 0;
  let remaining = 0; 

  try {
    for (const k of await sessionKeys()) {
      try {
        const item = await get(k);
        // _notify (psychologist message) and _childStage aren't table columns;
        // they're applied after the screening itself is saved
        const { _notify, _childStage, ...record } = await decrypt(key, item);
        const { error } = await supabase.from(SESSIONS_TABLE).insert(record);
        // An earlier upload got through but the reply was lost: it's already
        // saved, so treat it as done rather than retrying forever.
        if (error && error.code !== ALREADY_SAVED) { remaining++; continue; }

        // Same "ready for review" message the online submit sends. Only on a
        // first successful upload, so a retry doesn't notify twice. If it
        // fails the screening is still saved, as online.
        // Same as the online submit: move the child's Stage badge to "Processing".
        // Non-fatal, as online.
        if (!error && _childStage?.id) {
          const { error: stageErr } = await supabase
            .from("children").update({ stage: _childStage.stage }).eq("id", _childStage.id);
          if (stageErr) console.error("Could not update the child's stage:", stageErr.message);
        }

        if (!error && _notify) {
          const { error: notifyErr } = await supabase.from("messages").insert({
            ..._notify,
            screening_id: record.id,
            sent_by: "Teacher",
            recipient_role: "psychologist",
            message_type: "screening_ready_for_review",
          });
          if (notifyErr) console.error("Could not notify the psychologist:", notifyErr.message);
        }
        // Delete this one session only once Supabase has accepted it
        await del(k);
        synced++;
      } catch {
        remaining++;
      }
    }

    if (synced > 0) notify();

    // Ask the server if this licence was cancelled, and record the sync time
    const { data: status } = await supabase.functions.invoke("issue-offline-package", {
      body: { action: "status", licenceId: licence.id, markSynced: synced > 0 },
      headers: await firebaseHeaders(),
    });

    // Cancelled licence (lost device, staff left, admin deleted the row):
    // shut the screener down on this device straight away.
    if (status?.revoked) await applyRevocation(remaining);

    return { synced, remaining };
  } catch {
    return { synced, remaining: await pendingCount().catch(() => remaining) };
  }
}

// Starts the background sync of offline assessments and returns a cleanup
// function. Call it once when the app starts (e.g. in a useEffect) and call
// the returned function on unmount so the listeners don't pile up.

export function startAutoSync() {

  // One shared trigger for every reason we might want to sync.
  // The .catch(() => {}) stops a failed sync (no network, server error)
  // from surfacing as an unhandled promise rejection. Sessions that failed
  // stay in IndexedDB and are retried on the next trigger.

  const trySync = () => { syncOfflineSessions().catch(() => {}); };


  // Trigger 1: the browser reports the connection is back, so upload
  // anything completed while offline.

  window.addEventListener("online", trySync);

  // Trigger 2: sync once a user is signed in. The upload needs an
  // authenticated user, so a sync attempted before login would fail.
  // `user` is null on sign-out, so we only sync when someone is signed in.
  // onAuthStateChanged returns an unsubscribe function, kept for cleanup.

  const unsubscribe = auth.onAuthStateChanged((user) => { if (user) trySync(); });
  trySync();

  // Cleanup: remove both listeners so the sync doesn't keep firing after
  // the component or app that started it is gone.
  
  return () => {
    window.removeEventListener("online", trySync);
    unsubscribe();
  };
}