// TranslatorChat.js
//
// Floating "Translate" chat bot for signed-in, approved users. Type or paste
// text in any of English / isiXhosa / Afrikaans and it answers in the language
// chosen at the top; you can also ask language questions ("how do I say ...
// to a parent?"). The AI call happens server-side in the translator-chat
// Edge Function (supabase/functions/translator-chat), which checks the
// user's Firebase sign-in and approval before calling Gemini.

import React, { useEffect, useRef, useState } from "react";
import { auth } from "../../services/firebase";
import { supabase } from "../../services/supabaseClient";
import "./TranslatorChat.css";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "xh", label: "isiXhosa" },
  { code: "af", label: "Afrikaans" },
];

const GREETING = {
  en: "Hi! Paste or type anything and I'll translate it into English. You can also ask me how to say something.",
  xh: "Molo! Bhala okanye ncamathisela nantoni na, ndiza kuyiguqulela esiXhoseni. Ungandibuza nendlela yokuthetha into.",
  af: "Hallo! Tik of plak enigiets en ek vertaal dit na Afrikaans. Jy kan my ook vra hoe om iets te sê.",
};

export default function TranslatorChat() {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("xh");
  const [messages, setMessages] = useState([]); // { role: "user" | "assistant", text }
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user", text }];
    setMessages(next);
    setDraft("");
    setError("");
    setSending(true);
    try { 


      // Call the "translator-chat" Edge Function on behalf of the signed-in user.

// Get a fresh Firebase ID token. getIdToken() returns the cached token and
// refreshes it automatically if it's close to expiring, so it's safe to
// call before every request. `?.` handles the case where nobody is signed
// in (currentUser is null), which gives `undefined` instead of crashing.


      const token = await auth.currentUser?.getIdToken();

      // No token means the session is gone (signed out, or the refresh failed).
// Stop here with a message the UI can show, rather than sending a request
// the server would reject anyway.


      if (!token) throw new Error("Please sign in again to use the translator.");
      // Invoke the Edge Function through the Supabase client.

      const { data, error: fnError } = await supabase.functions.invoke("translator-chat", {
        
         // `target` is the language to translate into; `messages: next` is the
  // conversation so far including the user's newest message, so the
  // function has the full context on every call (the server keeps no state).
        
        body: { target, messages: next },


         // Send the Firebase token as a Bearer token so the function can verify
  // who is calling (same check as verifyFirebase) and can reject
  // unauthenticated callers before doing any work.
  
        headers: { Authorization: `Bearer ${token}` },
      });
      if (fnError) {
        // The function's own message (e.g. "account needs approval") is in the response body.
        let message = fnError.message;
        try {
          message = (await fnError.context?.json())?.error || message;
        } catch {
          /* keep the generic message */
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const copy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  };

  if (!open) {
    return (
      <button className="tchat-launcher" onClick={() => setOpen(true)} aria-label="Open translator">
        <span aria-hidden="true">A⇄ä</span> Translate
      </button>
    );
  }

  return (
    <div className="tchat-panel" role="dialog" aria-label="Translator">
      <div className="tchat-header">
        <div>
          <div className="tchat-title">Translator</div>
          <div className="tchat-subtitle">English · isiXhosa · Afrikaans</div>
        </div>
        <div className="tchat-header-actions">
          {messages.length > 0 && (
            <button className="tchat-icon-btn" onClick={() => { setMessages([]); setError(""); }} title="Start over">
              Clear
            </button>
          )}
          <button className="tchat-icon-btn" onClick={() => setOpen(false)} aria-label="Close translator">✕</button>
        </div>
      </div>

      <div className="tchat-target">
        <span>Translate into</span>
        <div className="tchat-pills" role="radiogroup" aria-label="Translate into">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              role="radio"
              aria-checked={target === l.code}
              className={`tchat-pill ${target === l.code ? "active" : ""}`}
              onClick={() => setTarget(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tchat-messages" ref={listRef}>
        {messages.length === 0 && <div className="tchat-bubble assistant">{GREETING[target]}</div>}
        {messages.map((m, i) => (
          <div key={i} className={`tchat-bubble ${m.role}`}>
            <div className="tchat-text">{m.text}</div>
            {m.role === "assistant" && (
              <button className="tchat-copy" onClick={() => copy(m.text, i)}>
                {copied === i ? "Copied" : "Copy"}
              </button>
            )}
          </div>
        ))}
        {sending && <div className="tchat-bubble assistant tchat-typing">Translating…</div>}
        {error && <div className="tchat-error">{error}</div>}
      </div>

      <div className="tchat-input">
        <textarea
          ref={inputRef}
          rows={2}
          value={draft}
          maxLength={4000}
          placeholder="Type or paste text…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="tchat-send" onClick={send} disabled={sending || !draft.trim()}>
          Send
        </button>
      </div>
      <div className="tchat-note">
        AI translation can make mistakes, so check anything important. Don't enter children's names or personal details.
      </div>
    </div>
  );
}
