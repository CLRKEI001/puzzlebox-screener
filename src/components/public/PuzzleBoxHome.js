import React from "react";
import {
  COLORS, FONTS, PUBLIC_FONT_IMPORT, PuzzlePiece, SectionHeading, Navbar, Footer, CallToAction, useIsMobile,
} from "../shared/SiteChrome";
import { Hero, HOME_ANIMATION_CSS } from "./Homepage";
import { useLanguage } from "../../theme/LanguageContext";

// ---------------------------------------------------------------------------
// The Puzzle Box — screener home page (sponsor wireframes TPB p1 + p2)
//
//   p1  Puzzle Box logo, nav "How it works · Training · Purchase · Login",
//       then the impact-stats strip (295+ / 4 / 3 / 4).
//   p2  "A tiered system for education and clinical contexts" — each tier
//       card leads to sign-up / login for that tier.
//
// `onAccess(tier, mode)` is supplied by App.js and opens the Login screen
// pre-set to that tier ("1" | "2") and mode ("register" | "login").
// ---------------------------------------------------------------------------

// Page text in English / Afrikaans / isiXhosa (follows the site-wide language)
const T = {
  en: {
    eyebrow: "Who can administer",
    title: "A tiered system for education and clinical contexts",
    lead: "The Puzzle Box Screener is designed for children aged 5 years 0 months to 6 years 11 months, with two levels of administration to support appropriate use in clinical, educational, home-based and community outreach settings.",
    signUp: "Sign up",
    logIn: "Log in",
    signUpAs: (title, label) => `Sign up as ${title} (${label})`,
    logInAs: (title, label) => `Log in as ${title} (${label})`,
    viewTraining: "View training requirements",
    heroLead: "A structured, play-based developmental screener for children aged 5 to 6 years — administered by trained teachers, primary healthcare practitioners and psychologists, regardless of location or connectivity.",
    seeHow: "See how it works",
    purchase: "Purchase",
    tiers: {
      1: {
        label: "Tier 1",
        title: "Teachers & Primary Healthcare",
        desc: "For preschool teachers and selected primary healthcare practitioners who have completed The Puzzle Box Screener training. This level produces a single global screening score to support early identification and inform referral decisions.",
      },
      2: {
        label: "Tier 2",
        title: "Psychologists",
        desc: "Reserved for psychologists who have completed The Puzzle Box Screener training. This level supports interpretation at domain and construct level, including pattern recognition across domains and informed referral decision-making.",
      },
    },
  },
  af: {
    eyebrow: "Wie kan dit afneem",
    title: "'n Vlakstelsel vir onderwys- en kliniese kontekste",
    lead: "Die Puzzle Box-sifter is ontwerp vir kinders van 5 jaar 0 maande tot 6 jaar 11 maande, met twee vlakke van afneming om toepaslike gebruik in kliniese, opvoedkundige, tuisgebaseerde en gemeenskapsuitreik-omgewings te ondersteun.",
    signUp: "Registreer",
    logIn: "Teken in",
    signUpAs: (title, label) => `Registreer as ${title} (${label})`,
    logInAs: (title, label) => `Teken in as ${title} (${label})`,
    viewTraining: "Sien opleidingsvereistes",
    heroLead: "'n Gestruktureerde, spelgebaseerde ontwikkelingsifter vir kinders van 5 tot 6 jaar — afgeneem deur opgeleide onderwysers, primêre gesondheidsorgpraktisyns en sielkundiges, ongeag ligging of internettoegang.",
    seeHow: "Sien hoe dit werk",
    purchase: "Koop",
    tiers: {
      1: {
        label: "Vlak 1",
        title: "Onderwysers & Primêre Gesondheidsorg",
        desc: "Vir voorskoolse onderwysers en geselekteerde primêre gesondheidsorgpraktisyns wat die Puzzle Box-sifteropleiding voltooi het. Hierdie vlak lewer 'n enkele algehele siftingstelling om vroeë identifisering te ondersteun en verwysingsbesluite te rig.",
      },
      2: {
        label: "Vlak 2",
        title: "Sielkundiges",
        desc: "Voorbehou vir sielkundiges wat die Puzzle Box-sifteropleiding voltooi het. Hierdie vlak ondersteun interpretasie op domein- en konstrukvlak, insluitend patroonherkenning oor domeine heen en ingeligte besluitneming oor verwysings.",
      },
    },
  },
  xh: {
    eyebrow: "Ngubani onokuqhuba uhlolo",
    title: "Inkqubo enamanqanaba yemfundo neyezonyango",
    lead: "Isixhobo sokuhlola se-Puzzle Box senzelwe abantwana abaneminyaka emi-5 neenyanga ezi-0 ukuya kwiminyaka emi-6 neenyanga ezili-11. Sinamanqanaba amabini okuqhuba uhlolo, ukuze sisetyenziswe ngendlela efanelekileyo kwiindawo zonyango, zemfundo, emakhaya nasekuncedeni uluntu.",
    signUp: "Bhalisa",
    logIn: "Ngena",
    signUpAs: (title, label) => `Bhalisa — ${title} (${label})`,
    logInAs: (title, label) => `Ngena — ${title} (${label})`,
    viewTraining: "Jonga iimfuno zoqeqesho",
    heroLead: "Isixhobo sokuhlola uphuhliso esicwangcisiweyo nesisekelwe ekudlaleni, sabantwana abaneminyaka emi-5 ukuya kwemi-6 — siqhutywa ngootitshala abaqeqeshiweyo, abasebenzi bonakekelo lwempilo olusisiseko nezazi zengqondo, nokuba bakweyiphi na indawo, nokuba ikho okanye ayikho i-intanethi.",
    seeHow: "Bona ukuba isebenza njani",
    purchase: "Thenga",
    tiers: {
      1: {
        label: "Inqanaba 1",
        title: "Ootitshala noNonophelo lweMpilo oluSisiseko",
        desc: "Eli nqanaba lenzelwe ootitshala bezikolo zabantwana abancinci nabasebenzi abakhethiweyo bonakekelo lwempilo olusisiseko abagqibe uqeqesho lwesixhobo sokuhlola se-Puzzle Box. Linika amanqaku amanye apheleleyo okuhlola, ukuxhasa ukubona iingxaki kwangoko nokunceda kwizigqibo zokuthumela umntwana kwezinye iingcali.",
      },
      2: {
        label: "Inqanaba 2",
        title: "Izazi Zengqondo",
        desc: "Eli nqanaba lelezazi zengqondo kuphela ezigqibe uqeqesho lwesixhobo sokuhlola se-Puzzle Box. Lixhasa ukutolika iziphumo kwinqanaba lommandla nelobuchule ngabunye, kubandakanya ukubona iipatheni kwimimandla eyahlukeneyo nokwenza izigqibo ezinolwazi zokuthumela umntwana kwezinye iingcali.",
      },
    },
  },
};

// Shared (non-text) tier fields; the text comes from T[lang].tiers
const TIERS = [
  { tier: 1, color: COLORS.teal,   bg: COLORS.tealLight },
  { tier: 2, color: COLORS.purple, bg: COLORS.purpleLight },
];

function TiersSection({ onNavigate, onAccess }) {
  const isMobile = useIsMobile(640);
  const { lang } = useLanguage();
  const tx = T[lang] || T.en;
  const tiers = TIERS.map(tier => ({ ...tier, ...tx.tiers[tier.tier] }));
  return (
    <section style={{ padding: isMobile ? "56px 20px" : "90px 40px", background: COLORS.surface, position: "relative", overflow: "hidden" }}>
      {!isMobile && (
        <PuzzlePiece size={110} color={COLORS.teal} rotate={-15} style={{ position: "absolute", top: 40, right: -30 }} />
      )}
      <div style={{ maxWidth: 1300, margin: "auto", position: "relative" }}>
        <SectionHeading
          eyebrow={tx.eyebrow}
          title={tx.title}
          lead={tx.lead}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", gap: 24 }}>
          {tiers.map(t => (
            <div key={t.label} style={{
              padding: "32px 30px", borderRadius: 20,
              background: COLORS.white, borderTop: `4px solid ${t.color}`,
              border: `1px solid ${COLORS.border}`,
              display: "flex", flexDirection: "column",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <span style={{
                alignSelf: "flex-start",
                display: "inline-block", padding: "4px 14px", borderRadius: 16,
                background: t.bg, color: t.color,
                fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
                marginBottom: 14,
              }}>
                {t.label}
              </span>
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 900, color: COLORS.ink, marginBottom: 12 }}>{t.title}</h3>
              <p style={{ fontSize: 14, color: COLORS.inkMid, lineHeight: 1.75, marginBottom: 24, flex: 1 }}>{t.desc}</p>

              {/* Sponsor feedback: each tier card is the entry point to sign-up / login */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button onClick={() => onAccess(t.tier, "register")} style={{
                  padding: "12px 24px", borderRadius: 11, background: t.color, color: COLORS.white,
                  border: `1.5px solid ${t.color}`, fontSize: 14, fontWeight: 800,
                  cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.15s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                  aria-label={tx.signUpAs(t.title, t.label)}
                >
                  {tx.signUp}
                </button>
                <button onClick={() => onAccess(t.tier, "login")} style={{
                  padding: "12px 24px", borderRadius: 11, background: COLORS.white, color: t.color,
                  border: `1.5px solid ${t.color}`, fontSize: 14, fontWeight: 800,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = t.bg; }}
                  onMouseLeave={e => { e.currentTarget.style.background = COLORS.white; }}
                  aria-label={tx.logInAs(t.title, t.label)}
                >
                  {tx.logIn}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 28 }}>
          <button onClick={() => onNavigate("pb-training")} style={{
            padding: "13px 28px", borderRadius: 12,
            background: COLORS.teal, color: COLORS.white,
            border: "none", fontSize: 14, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = COLORS.tealDark; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = COLORS.teal; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {tx.viewTraining}
          </button>
        </div>
      </div>
    </section>
  );
}

export default function PuzzleBoxHome({ onNavigate, onNavigateToLogin, onAccess }) {
  const go = onNavigate || (() => console.warn("No onNavigate handler passed to PuzzleBoxHome"));
  const access = onAccess || ((tier, mode) => onNavigateToLogin && onNavigateToLogin({ tier, mode }));
  const { lang } = useLanguage();
  const t = T[lang] || T.en;

  return (
    <div style={{ fontFamily: FONTS.body }}>
      <style>{`
        ${PUBLIC_FONT_IMPORT}
        ${HOME_ANIMATION_CSS}
      `}</style>
      <Navbar site="pb" current="pb-home" onNavigate={go} onLoginClick={() => onNavigateToLogin()} />
      <Hero
        badge=""
        lead={t.heroLead}
        actions={[
          { label: t.seeHow, primary: true, onClick: () => go("pb-how") },
          { label: t.purchase, onClick: () => go("pb-purchase") },
        ]}
      />
      <TiersSection onNavigate={go} onAccess={access} />
      <CallToAction />
      <Footer site="pb" onNavigate={go} onLoginClick={() => onNavigateToLogin()} />
    </div>
  );
}