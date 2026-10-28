// LanguageContext.js
//
// Site-wide language (English / Afrikaans / isiXhosa) for the screens that
// don't keep their own: the public sites, Login, Pending Approval, the Member
// Area (training) and the PuzzleBox Screener. Wrap the app in
// <LanguageProvider> once (see index.js); any component reads the current
// language with useLanguage(), and <LanguageSwitcher /> renders the same
// EN / AF / XH buttons the dashboards already use (.lang-switcher /
// .lang-btn in App.css).
//
// The dashboards (TeacherHome, PsychologistHome, AdminHome, Dashboard) keep
// their own lang state, exactly as before.
//
// Remembered on this device, the same way ThemeContext remembers the theme.

import React, { createContext, useContext, useEffect, useState } from "react";

export const LANGUAGES = { en: "EN", af: "AF", xh: "XH" };
const GROUP_LABEL = { en: "Language", af: "Taal", xh: "Ulwimi" };

const LanguageContext = createContext({ lang: "en", setLang: () => {} });
const STORAGE_KEY = "pb_lang";

function readStoredLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return LANGUAGES[stored] ? stored : "en";
  } catch {
    return "en";
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(readStoredLang);

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // storage unavailable (private browsing etc.) — the language still
      // works, it just won't be remembered on the next visit
    }
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

// The EN / AF / XH buttons. Uses the site-wide language unless a screen
// passes its own `lang` / `onChange` (the PuzzleBox Screener does, so it can
// start in whatever language the teacher's dashboard was in).
export function LanguageSwitcher({ lang: langProp, onChange, style }) {
  const site = useLanguage();
  const lang = langProp || site.lang;
  const setLang = onChange || site.setLang;
  return (
    <div className="lang-switcher" style={style} role="group" aria-label={GROUP_LABEL[lang] || GROUP_LABEL.en}>
      {Object.entries(LANGUAGES).map(([code, label]) => (
        <button
          key={code}
          type="button"
          className={`lang-btn ${lang === code ? "active" : ""}`}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
