import React, { useState, useEffect } from "react";
import {
  COLORS, FONTS, PUBLIC_FONT_IMPORT, PuzzlePiece, SectionHeading, Navbar, Footer, CallToAction, CONTACT_EMAIL, useIsMobile,
} from "../shared/SiteChrome";
import { useTrainingModules } from "../../hooks/useTrainingModules.js";
import { useLanguage } from "../../theme/LanguageContext";

// ---------------------------------------------------------------------------
// Page text in English / Afrikaans / isiXhosa (follows the site-wide language).
// Colours, ids and other non-text fields stay in the arrays further down.
// ---------------------------------------------------------------------------
const T = {
  en: {
    heroBadge: "Training programme",
    heroTitlePre: "Become a certified",
    heroTitleMid: "",
    heroTitlePost: " screener.",
    heroLead: "A certification programme for preschool educators, primary healthcare practitioners and psychologists who want to administer The Puzzle Box Screener.",
    restricted: "Restricted access",
    accessTitle: "Access requires a login and a Product number",
    accessBody: "To administer The Puzzle Box Screener you must complete this certified programme and pass the assessment. Training is unlocked with your login details plus the Product number supplied with each screener. Only registered users with verified professional credentials can access the full screener tool.",

    common: [
      { heading: "What the training entails", body: "A seven-module certification programme — from an introduction to The Puzzle Box and its research background, through test equipment and set-up, administration and interpretation, to online navigation and report writing — followed by a certification assessment." },
      { heading: "Why training is required", body: "The Puzzle Box Screener is a standardised tool. Consistent administration and scoring are what make its results reliable and comparable, so only trained, certified administrators are given access to the screener platform." },
      { heading: "Where training takes place", body: "Face-to-face at partner schools and institutions across the Eastern Cape, or online at your own pace through our digital learning platform in isiXhosa, Afrikaans and English." },
      { heading: "Who administers the training", body: "Face-to-face sessions are led by certified Puzzle Box trainers. Online training is delivered through The Puzzle Box learning platform, with the certification assessment marked on completion." },
    ],
    tiers: {
      1: { label: "Tier 1", title: "Teachers & Primary Healthcare", qualification: "Preschool teachers need a valid SACE registration number. Primary healthcare practitioners need a current professional registration. You will also need the Product number supplied with your Puzzle Box Screener." },
      2: { label: "Tier 2", title: "Psychologists", qualification: "Registration as a psychologist with the HPCSA (your professional registration is verified when you create your account). You will also need the Product number supplied with your Puzzle Box Screener." },
    },
    qualHeading: "Qualification needed before training",
    tierEyebrow: "Two levels of administration",
    tierTitle: "Training for each tier",
    tierLead: "The Puzzle Box Screener supports appropriate use across educational and clinical contexts through two levels of administration. The training follows the same pathway for both tiers; only the qualification you need beforehand differs.",
    chooseTier: "Choose your tier",
    trainingFor: (label) => `Training for ${label}`,
    signUpAs: (label) => `Sign up as ${label}`,
    logInToStart: "Log in to start training",

    accessEyebrow: "Getting started",
    accessHeading: "How to access the training",
    steps: [
      { title: "Get your screener", desc: "Each Puzzle Box Screener is supplied with its own Product number." },
      { title: "Sign up or log in", desc: "Create your account for your tier and wait for your credentials to be verified." },
      { title: "Enter your Product number", desc: "Choose Training after logging in and enter the Product number to unlock the modules." },
    ],

    whoCanApply: "Who can apply",
    requirementsTitle: "Requirements",
    applyForAccess: "Apply for access",
    requirements: [
      { title: "Verified professional credentials", desc: "Registered educators need a valid SACE number; healthcare practitioners and psychologists upload their professional registration during account creation." },
      { title: "Works with children aged 5–6", desc: "The screener is designed for children aged 5 years 0 months to 6 years 11 months, across preschool, Grade R, clinical, home-based and community settings." },
      { title: "Physical puzzle kit & Product number", desc: "You must have a Puzzle Box Screener kit in your possession before training can be meaningfully completed. Each screener supplied comes with a Product number, which you enter to unlock the training." },
      { title: "Pass the certification assessment", desc: "After completing all modules you must pass the post-training assessment before screener access is granted." },
    ],

    curriculum: "Curriculum",
    modulesTitle: (n) => (n ? `${n} training module${n === 1 ? "" : "s"}` : "Seven training modules"),
    modulesLead: "The programme takes you from first principles through to confident administration, interpretation and reporting. Modules are completed in order, followed by the certification assessment.",
    loadingModules: "Loading modules…",

    modesEyebrow: "How it works",
    modesTitle: "Training takes place in these ways...",
    modes: {
      inPerson: {
        type: "Face-to-face training",
        desc: "Attend an in-person training session led by a certified Puzzle Box trainer. Sessions are held at partner schools and institutions across the Eastern Cape and are designed to give you hands-on experience with the physical screener kit.",
        details: ["Full day workshop format", "Hands-on screener practice", "Q&A with certified trainers", "Certificate issued on completion"],
        cta: "Enquire about in-person training",
      },
      online: {
        type: "Online training",
        desc: "Complete the training programme at your own pace through our digital learning platform. Modules cover screener administration, scoring, interpretation and ethical considerations. Available in isiXhosa, Afrikaans and English.",
        details: ["Self-paced, available anytime", "Video modules and practice exercises", "Available in 3 languages", "Online certification assessment"],
        cta: "Log in to start online training",
      },
    },
  },

  af: {
    heroBadge: "Opleidingsprogram",
    heroTitlePre: "Word 'n gesertifiseerde",
    heroTitleMid: "",
    heroTitlePost: "-sifter.",
    heroLead: "'n Sertifiseringsprogram vir voorskoolse opvoeders, primêre gesondheidsorgpraktisyns en sielkundiges wat die Puzzle Box-sifter wil afneem.",
    restricted: "Beperkte toegang",
    accessTitle: "Toegang vereis 'n aanmelding en 'n Produknommer",
    accessBody: "Om die Puzzle Box-sifter af te neem, moet jy hierdie gesertifiseerde program voltooi en die assessering slaag. Opleiding word oopgesluit met jou aanmeldbesonderhede plus die Produknommer wat saam met elke sifter verskaf word. Slegs geregistreerde gebruikers met geverifieerde professionele geloofsbriewe kan die volledige sifter gebruik.",

    common: [
      { heading: "Wat die opleiding behels", body: "'n Sertifiseringsprogram van sewe modules — van 'n inleiding tot The Puzzle Box en die navorsingsagtergrond daarvan, deur toetstoerusting en opstelling, afneming en interpretasie, tot aanlyn navigasie en verslagskrywing — gevolg deur 'n sertifiseringsassessering." },
      { heading: "Waarom opleiding vereis word", body: "Die Puzzle Box-sifter is 'n gestandaardiseerde instrument. Konsekwente afneming en puntetoekenning maak die resultate betroubaar en vergelykbaar, daarom kry slegs opgeleide, gesertifiseerde afnemers toegang tot die sifterplatform." },
      { heading: "Waar opleiding plaasvind", body: "Van aangesig tot aangesig by vennootskole en -instellings regoor die Oos-Kaap, of aanlyn teen jou eie pas deur ons digitale leerplatform in isiXhosa, Afrikaans en Engels." },
      { heading: "Wie die opleiding aanbied", body: "Kontaksessies word gelei deur gesertifiseerde Puzzle Box-opleiers. Aanlyn opleiding word deur The Puzzle Box se leerplatform aangebied, en die sertifiseringsassessering word by voltooiing nagesien." },
    ],
    tiers: {
      1: { label: "Vlak 1", title: "Onderwysers & Primêre Gesondheidsorg", qualification: "Voorskoolse onderwysers het 'n geldige SACE-registrasienommer nodig. Primêre gesondheidsorgpraktisyns het 'n geldige professionele registrasie nodig. Jy sal ook die Produknommer nodig hê wat saam met jou Puzzle Box-sifter verskaf word." },
      2: { label: "Vlak 2", title: "Sielkundiges", qualification: "Registrasie as sielkundige by die HPCSA (jou professionele registrasie word geverifieer wanneer jy jou rekening skep). Jy sal ook die Produknommer nodig hê wat saam met jou Puzzle Box-sifter verskaf word." },
    },
    qualHeading: "Kwalifikasie nodig voor opleiding",
    tierEyebrow: "Twee vlakke van afneming",
    tierTitle: "Opleiding vir elke vlak",
    tierLead: "Die Puzzle Box-sifter ondersteun toepaslike gebruik in opvoedkundige en kliniese kontekste deur twee vlakke van afneming. Die opleiding volg dieselfde roete vir albei vlakke; slegs die kwalifikasie wat jy vooraf nodig het, verskil.",
    chooseTier: "Kies jou vlak",
    trainingFor: (label) => `Opleiding vir ${label}`,
    signUpAs: (label) => `Registreer vir ${label}`,
    logInToStart: "Teken in om met opleiding te begin",

    accessEyebrow: "Om te begin",
    accessHeading: "Hoe om toegang tot die opleiding te kry",
    steps: [
      { title: "Kry jou sifter", desc: "Elke Puzzle Box-sifter word met sy eie Produknommer verskaf." },
      { title: "Registreer of teken in", desc: "Skep jou rekening vir jou vlak en wag totdat jou geloofsbriewe geverifieer is." },
      { title: "Voer jou Produknommer in", desc: "Kies Opleiding nadat jy ingeteken het en voer die Produknommer in om die modules oop te sluit." },
    ],

    whoCanApply: "Wie kan aansoek doen",
    requirementsTitle: "Vereistes",
    applyForAccess: "Doen aansoek om toegang",
    requirements: [
      { title: "Geverifieerde professionele geloofsbriewe", desc: "Geregistreerde opvoeders het 'n geldige SACE-nommer nodig; gesondheidsorgpraktisyns en sielkundiges laai hul professionele registrasie op wanneer hulle hul rekening skep." },
      { title: "Werk met kinders van 5–6 jaar", desc: "Die sifter is ontwerp vir kinders van 5 jaar 0 maande tot 6 jaar 11 maande, in voorskoolse, Graad R-, kliniese, tuisgebaseerde en gemeenskapsomgewings." },
      { title: "Fisiese legkaartstel & Produknommer", desc: "Jy moet 'n Puzzle Box-sifterstel besit voordat die opleiding sinvol voltooi kan word. Elke sifter wat verskaf word, kom met 'n Produknommer wat jy invoer om die opleiding oop te sluit." },
      { title: "Slaag die sertifiseringsassessering", desc: "Nadat jy al die modules voltooi het, moet jy die assessering ná die opleiding slaag voordat jy toegang tot die sifter kry." },
    ],

    curriculum: "Kurrikulum",
    modulesTitle: (n) => (n ? `${n} opleidingsmodule${n === 1 ? "" : "s"}` : "Sewe opleidingsmodules"),
    modulesLead: "Die program neem jou van die grondbeginsels tot by selfversekerde afneming, interpretasie en verslagdoening. Modules word in volgorde voltooi, gevolg deur die sertifiseringsassessering.",
    loadingModules: "Laai tans modules…",

    modesEyebrow: "Hoe dit werk",
    modesTitle: "Opleiding vind op hierdie maniere plaas ...",
    modes: {
      inPerson: {
        type: "Kontakopleiding",
        desc: "Woon 'n persoonlike opleidingsessie by wat deur 'n gesertifiseerde Puzzle Box-opleier gelei word. Sessies word by vennootskole en -instellings regoor die Oos-Kaap gehou en is ontwerp om jou praktiese ervaring met die fisiese sifterstel te gee.",
        details: ["Voldag-werkswinkel", "Praktiese oefening met die sifter", "Vrae en antwoorde met gesertifiseerde opleiers", "Sertifikaat by voltooiing uitgereik"],
        cta: "Doen navraag oor kontakopleiding",
      },
      online: {
        type: "Aanlyn opleiding",
        desc: "Voltooi die opleidingsprogram teen jou eie pas deur ons digitale leerplatform. Die modules dek die afneming van die sifter, puntetoekenning, interpretasie en etiese oorwegings. Beskikbaar in isiXhosa, Afrikaans en Engels.",
        details: ["Teen jou eie pas, enige tyd beskikbaar", "Videomodules en oefeninge", "Beskikbaar in 3 tale", "Aanlyn sertifiseringsassessering"],
        cta: "Teken in om aanlyn opleiding te begin",
      },
    },
  },

  xh: {
    heroBadge: "Inkqubo yoqeqesho",
    heroTitlePre: "Yiba ngumhloli oqinisekisiweyo",
    heroTitleMid: "we-",
    heroTitlePost: ".",
    heroLead: "Inkqubo yesatifikethi yootitshala bezikolo zabantwana abancinci, abasebenzi bonakekelo lwempilo olusisiseko nezazi zengqondo abafuna ukuqhuba uhlolo ngesixhobo sokuhlola se-Puzzle Box.",
    restricted: "Ukufikelela okuthintelweyo",
    accessTitle: "Ukufikelela kufuna ukungena kunye nenombolo yeMveliso",
    accessBody: "Ukuze uqhube uhlolo ngesixhobo sokuhlola se-Puzzle Box, kufuneka ugqibe le nkqubo yesatifikethi uze uphumelele uvavanyo. Uqeqesho luvulwa ngeenkcukacha zakho zokungena kunye nenombolo yeMveliso enikwa nesixhobo ngasinye sokuhlola. Ngabasebenzisi ababhalisiweyo abaneziqinisekiso zobungcali eziqinisekisiweyo kuphela abanokufikelela kwisixhobo sokuhlola esipheleleyo.",

    common: [
      { heading: "Into equkayo uqeqesho", body: "Inkqubo yesatifikethi eneemodyuli ezisixhenxe — ukusuka kwintshayelelo nge-The Puzzle Box nemvelaphi yophando lwayo, ukuya kwizixhobo zovavanyo nokuzilungiselela, ukuqhuba uhlolo nokutolika iziphumo, ukuya kutsho ekusebenziseni i-intanethi nasekubhaleni iingxelo — ilandelwa luvavanyo lwesatifikethi." },
      { heading: "Kutheni uqeqesho lufuneka", body: "Isixhobo sokuhlola se-Puzzle Box sisixhobo esisemgangathweni. Ukuqhuba uhlolo nokunika amanqaku ngendlela efanayo kwenza ukuba iziphumo zithembeke kwaye zithelekiseke, ngoko ke ngabahloli abaqeqeshiweyo nabanesatifikethi kuphela abavunyelwa ukufikelela kwiqonga lokuhlola." },
      { heading: "Uqeqesho lwenzeka phi", body: "Ubuso ngobuso kwizikolo namaziko angamahlakani kulo lonke iMpuma Koloni, okanye kwi-intanethi ngesantya sakho kwiqonga lethu lokufunda ledijithali ngesiXhosa, isiBhulu nesiNgesi." },
      { heading: "Ngubani oqhuba uqeqesho", body: "Iiseshoni zobuso ngobuso zikhokelwa ngabaqeqeshi be-Puzzle Box abanesatifikethi. Uqeqesho lwe-intanethi lunikezelwa ngeqonga lokufunda le-The Puzzle Box, kwaye uvavanyo lwesatifikethi luyamakishwa xa ugqibile." },
    ],
    tiers: {
      1: { label: "Inqanaba 1", title: "Ootitshala noNonophelo lweMpilo oluSisiseko", qualification: "Ootitshala bezikolo zabantwana abancinci bafuna inombolo yobhaliso ye-SACE esebenzayo. Abasebenzi bonakekelo lwempilo olusisiseko bafuna ubhaliso lobungcali olusebenzayo. Uya kufuna nenombolo yeMveliso enikwe kunye nesixhobo sakho sokuhlola se-Puzzle Box." },
      2: { label: "Inqanaba 2", title: "Izazi Zengqondo", qualification: "Ubhaliso njengesazi sengqondo kwi-HPCSA (ubhaliso lwakho lobungcali luyaqinisekiswa xa usenza iakhawunti yakho). Uya kufuna nenombolo yeMveliso enikwe kunye nesixhobo sakho sokuhlola se-Puzzle Box." },
    },
    qualHeading: "Iziqinisekiso ezifunekayo phambi koqeqesho",
    tierEyebrow: "Amanqanaba amabini okuqhuba uhlolo",
    tierTitle: "Uqeqesho lwenqanaba ngalinye",
    tierLead: "Isixhobo sokuhlola se-Puzzle Box sixhasa ukusetyenziswa okufanelekileyo kwiimeko zemfundo nezonyango ngamanqanaba amabini okuqhuba uhlolo. Uqeqesho lulandela indlela efanayo kumanqanaba omabini; kwahluka kuphela iziqinisekiso ozifunayo kwangaphambili.",
    chooseTier: "Khetha inqanaba lakho",
    trainingFor: (label) => `Uqeqesho: ${label}`,
    signUpAs: (label) => `Bhalisa: ${label}`,
    logInToStart: "Ngena ukuze uqalise uqeqesho",

    accessEyebrow: "Ukuqalisa",
    accessHeading: "Indlela yokufikelela kuqeqesho",
    steps: [
      { title: "Fumana isixhobo sakho sokuhlola", desc: "Isixhobo ngasinye sokuhlola se-Puzzle Box sinikwa nenombolo yaso yeMveliso." },
      { title: "Bhalisa okanye ungene", desc: "Yenza iakhawunti yakho yenqanaba lakho uze ulinde ukuba iziqinisekiso zakho ziqinisekiswe." },
      { title: "Faka inombolo yakho yeMveliso", desc: "Khetha Uqeqesho emva kokungena uze ufake inombolo yeMveliso ukuze uvule iimodyuli." },
    ],

    whoCanApply: "Ngubani onokufaka isicelo",
    requirementsTitle: "Iimfuno",
    applyForAccess: "Faka isicelo sokufikelela",
    requirements: [
      { title: "Iziqinisekiso zobungcali eziqinisekisiweyo", desc: "Ootitshala ababhalisiweyo bafuna inombolo ye-SACE esebenzayo; abasebenzi bezempilo nezazi zengqondo bafaka ubhaliso lwabo lobungcali xa besenza iakhawunti." },
      { title: "Usebenza nabantwana abaneminyaka emi-5–6", desc: "Isixhobo sokuhlola senzelwe abantwana abaneminyaka emi-5 neenyanga ezi-0 ukuya kwiminyaka emi-6 neenyanga ezili-11, kwizikolo zabantwana abancinci, kwiBanga R, kwiindawo zonyango, emakhaya nasekuhlaleni." },
      { title: "Ikhithi yephazili nenombolo yeMveliso", desc: "Kufuneka ube nekhithi yesixhobo sokuhlola se-Puzzle Box phambi kokuba uqeqesho lugqitywe ngendlela enentsingiselo. Isixhobo ngasinye esinikiweyo siza nenombolo yeMveliso, oyifakayo ukuze uvule uqeqesho." },
      { title: "Phumelela uvavanyo lwesatifikethi", desc: "Emva kokugqiba zonke iimodyuli, kufuneka uphumelele uvavanyo lwasemva koqeqesho phambi kokuba uvunyelwe ukusebenzisa isixhobo sokuhlola." },
    ],

    curriculum: "Ikharityhulam",
    modulesTitle: (n) => (n ? (n === 1 ? "Imodyuli yoqeqesho e-1" : `Iimodyuli zoqeqesho ezi-${n}`) : "Iimodyuli zoqeqesho ezisixhenxe"),
    modulesLead: "Le nkqubo ikuthatha ukusuka kwiziseko ukuya ekuqhubeni uhlolo, ukutolika iziphumo nokubhala iingxelo ngokuzithemba. Iimodyuli zigqitywa ngokulandelelana, zilandelwe luvavanyo lwesatifikethi.",
    loadingModules: "Kulayishwa iimodyuli…",

    modesEyebrow: "Indlela esebenza ngayo",
    modesTitle: "Uqeqesho lwenzeka ngezi ndlela...",
    modes: {
      inPerson: {
        type: "Uqeqesho lobuso ngobuso",
        desc: "Zimase iseshoni yoqeqesho yobuso ngobuso ekhokelwa ngumqeqeshi we-Puzzle Box onesatifikethi. Iiseshoni zibanjelwa kwizikolo namaziko angamahlakani kulo lonke iMpuma Koloni, kwaye zenzelwe ukukunika amava okusebenza ngezandla nekhithi yesixhobo sokuhlola.",
        details: ["Iworkshop yosuku lonke", "Ukuziqhelisa ngesixhobo sokuhlola ngezandla", "Imibuzo neempendulo nabaqeqeshi abanesatifikethi", "Isatifikethi sinikwa xa ugqibile"],
        cta: "Buza ngoqeqesho lobuso ngobuso",
      },
      online: {
        type: "Uqeqesho lwe-intanethi",
        desc: "Gqiba inkqubo yoqeqesho ngesantya sakho kwiqonga lethu lokufunda ledijithali. Iimodyuli ziquka ukuqhuba uhlolo, ukunika amanqaku, ukutolika iziphumo nemiba yokuziphatha. Ifumaneka ngesiXhosa, isiBhulu nesiNgesi.",
        details: ["Ngesantya sakho, ifumaneka nangaliphi na ixesha", "Iimodyuli zevidiyo nemithambo yokuziqhelisa", "Ifumaneka ngeelwimi ezi-3", "Uvavanyo lwesatifikethi kwi-intanethi"],
        cta: "Ngena ukuze uqalise uqeqesho lwe-intanethi",
      },
    },
  },
};


// Modules are managed by an admin (Admin → Training Modules) and read here
// from Supabase via useTrainingModules — see
// supabase/migrations/004_training_modules.sql. `moduleColor` maps the
// small fixed set of colour keys an admin can choose from back to this
// site's actual brand colours.
function moduleColor(colorKey) {
  const key = colorKey || "teal";
  return { color: COLORS[key] || COLORS.teal, bg: COLORS[`${key}Light`] || COLORS.tealLight };
}

function TrainingHero() {
  const { lang } = useLanguage();
  const tx = T[lang] || T.en;
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 100); return () => clearTimeout(t); }, []);

  return (
    <section style={{
      paddingTop: 84,
      background: `linear-gradient(180deg, ${COLORS.white} 0%, ${COLORS.surface} 100%)`,
      position: "relative", overflow: "hidden",
    }}>
      <PuzzlePiece size={150} color={COLORS.teal} rotate={15} style={{ position: "absolute", top: 50, right: -40 }} />
      <div style={{
        maxWidth: 1300, margin: "0 auto", padding: "72px 40px",
        display: "flex", gap: 48, flexWrap: "wrap", alignItems: "center", position: "relative",
      }}>
        <div style={{
          flex: "1 1 460px",
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.5s ease",
        }}>
          <span style={{
            display: "inline-block", padding: "7px 16px", borderRadius: 20,
            background: COLORS.tealLight, border: `1px solid rgba(0,155,141,0.25)`,
            fontSize: 12, fontWeight: 800, color: COLORS.teal, marginBottom: 24,
          }}>
            {tx.heroBadge}
          </span>
          <h1 style={{
            fontFamily: FONTS.heading, fontSize: "clamp(32px, 4.2vw, 52px)",
            fontWeight: 900, color: COLORS.ink, lineHeight: 1.08,
            letterSpacing: "-0.03em", marginBottom: 18,
          }}>
            {tx.heroTitlePre}<br />
            {tx.heroTitleMid}<span style={{ color: COLORS.teal }}>Puzzle Box</span>{tx.heroTitlePost}
          </h1>
          <p style={{ fontSize: 16.5, color: COLORS.inkMid, lineHeight: 1.75, maxWidth: 540 }}>
            {tx.heroLead}
          </p>
        </div>

        {/* Access notice */}
        <div style={{
          flex: "1 1 340px", maxWidth: 460,
          padding: "26px 28px", borderRadius: 18,
          background: `linear-gradient(135deg, ${COLORS.tealLight}, ${COLORS.purpleLight})`,
          border: `1px solid ${COLORS.border}`,
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.5s ease 0.15s",
        }}>
          <span style={{
            display: "inline-block", padding: "4px 13px", borderRadius: 14,
            background: COLORS.white, color: COLORS.teal,
            fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
            marginBottom: 12,
          }}>
            {tx.restricted}
          </span>
          <p style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 900, color: COLORS.ink, marginBottom: 8 }}>
            {tx.accessTitle}
          </p>
          <p style={{ fontSize: 13.5, color: COLORS.inkMid, lineHeight: 1.7 }}>
            {tx.accessBody}
          </p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Training for Tier 1 / Tier 2 (sponsor wireframe TPB p3)
// For each tier the page must answer: what the training entails, why it is
// required, where it takes place, who administers it and which qualification
// is needed beforehand. Tier 2 is "as above" — the same answers apply, except
// the qualification, which is necessarily different for psychologists.
//
// DRAFT COPY — written from what the existing Training / How-it-works pages
// already say. Please have the sponsor confirm the wording.
//
// The text (what / why / where / who, and each tier's label, title and
// qualification) lives in T[lang].common and T[lang].tiers above; only the
// non-text fields are kept here.
// ---------------------------------------------------------------------------
const TRAINING_TIERS = [
  { tier: 1, color: COLORS.teal,   bg: COLORS.tealLight },
  { tier: 2, color: COLORS.purple, bg: COLORS.purpleLight },
];

function TierTrainingSection({ onAccess }) {
  const [active, setActive] = useState(1);
  const isMobile = useIsMobile(640);
  const { lang } = useLanguage();
  const tx = T[lang] || T.en;
  const tiers = TRAINING_TIERS.map(t => ({ ...t, ...tx.tiers[t.tier] }));
  const tier = tiers.find(t => t.tier === active);
  const items = [...tx.common, { heading: tx.qualHeading, body: tier.qualification }];

  return (
    <section style={{ padding: isMobile ? "56px 20px" : "90px 40px", background: COLORS.white }}>
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>
        <SectionHeading
          eyebrow={tx.tierEyebrow}
          title={tx.tierTitle}
          lead={tx.tierLead}
        />

        <div role="tablist" aria-label={tx.chooseTier} style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          {tiers.map(t => {
            const isActive = t.tier === active;
            return (
              <button key={t.tier} role="tab" aria-selected={isActive} onClick={() => setActive(t.tier)} style={{
                padding: "11px 22px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                fontSize: 14, fontWeight: 800,
                background: isActive ? t.color : COLORS.white,
                color: isActive ? COLORS.white : t.color,
                border: `1.5px solid ${t.color}`, transition: "all 0.15s",
              }}>
                {tx.trainingFor(t.label)}
              </button>
            );
          })}
        </div>

        <div style={{
          padding: isMobile ? "26px 22px" : "34px 36px", borderRadius: 20,
          background: COLORS.white, border: `1px solid ${COLORS.border}`,
          borderTop: `4px solid ${tier.color}`, boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
        }}>
          <span style={{
            display: "inline-block", padding: "4px 14px", borderRadius: 16,
            background: tier.bg, color: tier.color,
            fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12,
          }}>
            {tier.label}
          </span>
          <h3 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, color: COLORS.ink, marginBottom: 22 }}>
            {tier.title}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 22 }}>
            {items.map(item => (
              <div key={item.heading} style={{ padding: "18px 20px", borderRadius: 14, background: COLORS.surface }}>
                <p style={{ fontSize: 11.5, fontWeight: 800, color: tier.color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  {item.heading}
                </p>
                <p style={{ fontSize: 13.5, color: COLORS.inkMid, lineHeight: 1.7 }}>{item.body}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 26 }}>
            <button onClick={() => onAccess(tier.tier, "register")} style={{
              padding: "12px 24px", borderRadius: 11, background: tier.color, color: COLORS.white,
              border: `1.5px solid ${tier.color}`, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
            }}>
              {tx.signUpAs(tier.label)}
            </button>
            <button onClick={() => onAccess(tier.tier, "login")} style={{
              padding: "12px 24px", borderRadius: 11, background: COLORS.white, color: tier.color,
              border: `1.5px solid ${tier.color}`, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
            }}>
              {tx.logInToStart}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// How a trainee actually gets into the training (sponsor wireframe TPB p6):
// login details + the Product number that comes with each screener supplied.
function HowToAccessSection() {
  const isMobile = useIsMobile(640);
  const { lang } = useLanguage();
  const tx = T[lang] || T.en;
  const steps = [
    { n: "1", color: COLORS.teal },
    { n: "2", color: COLORS.pink },
    { n: "3", color: COLORS.purple },
  ].map((st, i) => ({ ...st, ...tx.steps[i] }));
  return (
    <section style={{ padding: isMobile ? "56px 20px" : "90px 40px", background: COLORS.surface }}>
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>
        <SectionHeading eyebrow={tx.accessEyebrow} title={tx.accessHeading} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 20 }}>
          {steps.map(st => (
            <div key={st.n} style={{ padding: "26px 24px", borderRadius: 16, background: COLORS.white, border: `1px solid ${COLORS.border}`, borderTop: `4px solid ${st.color}` }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: st.color, color: COLORS.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontFamily: FONTS.heading, marginBottom: 14 }}>{st.n}</div>
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 900, color: COLORS.ink, marginBottom: 8 }}>{st.title}</h3>
              <p style={{ fontSize: 13.5, color: COLORS.inkMid, lineHeight: 1.65 }}>{st.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RequirementsSection({ onApply }) {
  const { lang } = useLanguage();
  const tx = T[lang] || T.en;
  const requirements = [COLORS.teal, COLORS.pink, COLORS.purple, COLORS.orange]
    .map((color, i) => ({ color, ...tx.requirements[i] }));

  return (
    <section style={{ padding: "90px 40px", background: COLORS.surface }}>
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 24, marginBottom: 44 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.teal, marginBottom: 12 }}>
              {tx.whoCanApply}
            </p>
            <h2 style={{ fontFamily: FONTS.heading, fontSize: "clamp(26px, 3.2vw, 40px)", fontWeight: 900, color: COLORS.ink, lineHeight: 1.12, letterSpacing: "-0.02em" }}>
              {tx.requirementsTitle}
            </h2>
          </div>
          <button onClick={onApply} style={{
            padding: "13px 28px", borderRadius: 12,
            background: COLORS.teal, color: COLORS.white,
            border: "none", fontSize: 14, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = COLORS.tealDark; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,155,141,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = COLORS.teal; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            {tx.applyForAccess}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 20 }}>
          {requirements.map(req => (
            <div key={req.title} style={{
              padding: "26px 24px", borderRadius: 16,
              background: COLORS.white, border: `1px solid ${COLORS.border}`,
              borderTop: `4px solid ${req.color}`,
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)", transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)"; }}
            >
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 900, color: COLORS.ink, marginBottom: 8 }}>{req.title}</h3>
              <p style={{ fontSize: 13, color: COLORS.inkMid, lineHeight: 1.65 }}>{req.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ModulesSection() {
  const { modules, loading } = useTrainingModules("educator");
  const { lang } = useLanguage();
  const tx = T[lang] || T.en;

  return (
    <section style={{ padding: "90px 40px", background: COLORS.white, position: "relative", overflow: "hidden" }}>
      <PuzzlePiece size={120} color={COLORS.orange} rotate={-20} style={{ position: "absolute", bottom: -20, right: -30 }} />
      <div style={{ maxWidth: 1300, margin: "0 auto", position: "relative" }}>
        <SectionHeading
          eyebrow={tx.curriculum}
          title={tx.modulesTitle(modules.length)}
          lead={tx.modulesLead}
        />
        {loading ? (
          <p style={{ color: COLORS.inkMid, fontSize: 14 }}>{tx.loadingModules}</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: 18 }}>
            {modules.map((mod, i) => {
              const { color, bg } = moduleColor(mod.colorKey);
              const number = String(mod.sortOrder ?? i + 1).padStart(2, "0");
              return (
                <div key={mod.id} style={{
                  padding: "22px 24px", borderRadius: 16,
                  background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                  display: "flex", alignItems: "center", gap: 18, transition: "all 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, background: bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, fontWeight: 900, color,
                    fontFamily: FONTS.heading, flexShrink: 0,
                  }}>
                    {number}
                  </div>
                  <div>
                    <h3 style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 800, color: COLORS.ink, lineHeight: 1.35, marginBottom: mod.description ? 4 : 0 }}>
                      {mod.title}
                    </h3>
                    {mod.description && (
                      <p style={{ fontSize: 13, color: COLORS.inkMid, lineHeight: 1.5 }}>{mod.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function TrainingModesSection({ onStartOnline }) {
  const { lang } = useLanguage();
  const tx = T[lang] || T.en;
  const modes = [
    { ...tx.modes.inPerson, color: COLORS.teal, bg: COLORS.tealLight },
    { ...tx.modes.online, color: COLORS.purple, bg: COLORS.purpleLight, online: true },
  ];

  return (
    <section style={{ padding: "90px 40px", background: COLORS.surface }}>
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>
        <SectionHeading
          eyebrow={tx.modesEyebrow}
          title={tx.modesTitle}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))", gap: 28 }}>
          {modes.map((mode, i) => (
            <div key={mode.type} style={{
              borderRadius: 20, overflow: "hidden",
              border: `1px solid ${COLORS.border}`,
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
              transition: "all 0.2s", background: COLORS.white,
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(0,0,0,0.10)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.05)"; }}
            >
              {/* Image placeholder — puzzle motif */}
              <div style={{
                height: 190, background: `linear-gradient(135deg, ${mode.bg}, ${mode.color}22)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative", overflow: "hidden",
              }}>
                <PuzzlePiece size={110} color={mode.color} rotate={i === 0 ? -10 : 15} fillOpacity={0.5} />
                <PuzzlePiece size={60} color={mode.color} rotate={i === 0 ? 30 : -25} fillOpacity={0.28}
                  style={{ position: "absolute", top: 22, right: 40 }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 40, background: `linear-gradient(to top, ${COLORS.white}, transparent)` }} />
              </div>

              <div style={{ padding: "28px 28px 32px" }}>
                <h3 style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 900, color: COLORS.ink, marginBottom: 12 }}>
                  {mode.type}
                </h3>
                <p style={{ fontSize: 14, color: COLORS.inkMid, lineHeight: 1.7, marginBottom: 20 }}>
                  {mode.desc}
                </p>
                <ul style={{ listStyle: "none", padding: 0, marginBottom: 24 }}>
                  {mode.details.map(d => (
                    <li key={d} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: COLORS.inkMid, marginBottom: 8 }}>
                      <span style={{ width: 18, height: 18, borderRadius: "50%", background: mode.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l2.5 2.5L9 1" stroke={mode.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {d}
                    </li>
                  ))}
                </ul>
                <button onClick={mode.online
                  ? onStartOnline
                  : () => { window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("In-person training enquiry")}&body=${encodeURIComponent("Hello, I would like to find out about in-person Puzzle Box Screener training near me.")}`; }} style={{
                  padding: "11px 22px", borderRadius: 10,
                  background: mode.color, color: COLORS.white,
                  border: "none", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  {mode.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function TrainingPage(props) {
  // Accepts several naming conventions so navigation works however App.js wires it
  const go = props.onNavigate
    || ((page) => {
      if (page === "home" && props.onBack) return props.onBack();
      if (page === "home" && props.onNavigateHome) return props.onNavigateHome();
      console.warn("No onNavigate handler passed to TrainingPage");
    });
  const goLogin = props.onNavigateToLogin || props.onLogin || (() => console.warn("No login handler passed to TrainingPage"));
  // onAccess(tier, mode) opens sign-up / login for a tier; falls back to plain login
  const access = props.onAccess || ((tier, mode) => goLogin({ tier, mode }));

  return (
    <div style={{ fontFamily: FONTS.body }}>
      <style>{PUBLIC_FONT_IMPORT}</style>
      <Navbar site="pb" current="pb-training" onNavigate={go} onLoginClick={() => goLogin()} />
      <TrainingHero />
      <TierTrainingSection onAccess={access} />
      <HowToAccessSection />
      <RequirementsSection onApply={() => access(null, "register")} />
      <ModulesSection />
      <TrainingModesSection onStartOnline={() => goLogin()} />
      <CallToAction />
      <Footer site="pb" onNavigate={go} onLoginClick={() => goLogin()} />
    </div>
  );
}