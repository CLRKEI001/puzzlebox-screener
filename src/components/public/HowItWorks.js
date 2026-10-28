import React from "react";
import {
  COLORS, FONTS, PUBLIC_FONT_IMPORT, WARM_PAGE_CSS, CREAM,
  PuzzlePiece, SectionHeading, PageHero, Reveal,
  Navbar, Footer, CallToAction, useIsMobile,
} from "../shared/SiteChrome";
import { useLanguage } from "../../theme/LanguageContext";

// How It Works, reworked to match the warmer home page.
// Journey is a zigzag timeline on desktop and a single column on phones.
// All copy is unchanged from the previous version except the page title.

// ---- Page copy in English, Afrikaans and isiXhosa ------------------------
// Brand names (The Puzzle Box, Puzzle Play), acronyms (SACE, HPCSA, POPIA)
// and Excel stay the same in every language. The journey, roles and
// features lists are in the same order as the colour lists further down.
const T = {
  en: {
    heroEyebrow: "The Puzzle Box",
    heroTitle: "How it",
    heroHighlight: "works",
    heroLead: "From registration to research — a step-by-step walkthrough of the full screening process.",
    step: "Step",
    journeyEyebrow: "The screening journey",
    journeyTitle: "Six stages from onboarding to research output",
    journey: [
      {
        title: "Register & verify credentials",
        desc: "Users register with their email and professional registration number — a SACE number for educators, HPCSA number for psychologists. The system verifies credentials before granting access. Admins and data analysts are added by the organisation administrator.",
      },
      {
        title: "Complete training modules",
        desc: "Before accessing screening features, users unlock the digital training modules with their login and the Product number supplied with their screener, then complete modules covering puzzle facilitation techniques, observation methods and how to interact with children during assessments. Quizzes ensure knowledge retention.",
      },
      {
        title: "Facilitate the puzzle activity",
        desc: "The educator guides the child through a structured puzzle activity using the Puzzle Play module. Lesson plans are available in English, Afrikaans and isiXhosa. The activity can run offline — data is stored locally and synced when connectivity is restored.",
      },
      {
        title: "Capture screening observations",
        desc: "The educator completes a structured digital form capturing timing, planning, sequencing and completion data. Observational notes are recorded in real time, and all inputs are mapped automatically to the predefined developmental domains.",
      },
      {
        title: "Psychologist reviews & interprets",
        desc: "The assigned psychologist accesses the submitted screening data via their dashboard. They review domain scores, observational notes and timing data, then add their clinical interpretation. Comparative screenings are enabled only after a minimum two-month interval.",
      },
      {
        title: "Results, alerts & research output",
        desc: "The results dashboard generates child-specific summaries and flags potential developmental concerns. Anonymised, aggregated data flows to the Research & Analytics module, where data analysts can explore trends and export to Excel for further analysis.",
      },
    ],
    roleEyebrow: "Access by role",
    roleTitle: "Everyone sees exactly what they need — and nothing more",
    roleLead: "Access to screening results is tiered by professional role. Educators receive a single overall screening score to guide referral, while domain-level interpretation is reserved for qualified psychologists.",
    roles: [
      {
        role: "Educators & primary healthcare",
        tier: "Tier 1",
        sees: ["A single global screening score", "Lesson plans and puzzle activities", "Their assigned learners and session history", "Training modules and certification"],
      },
      {
        role: "Psychologists",
        tier: "Tier 2",
        sees: ["Domain and construct-level scores", "Flagged learners and clinical alerts", "Comparative analysis across sessions", "Report generation and referral letters"],
      },
      {
        role: "Administrators & analysts",
        tier: "Admin",
        sees: ["Anonymised aggregate data only", "User management and role assignment", "Excel export for research", "POPIA compliance oversight"],
      },
    ],
    featuresEyebrow: "Designed for the context",
    featuresTitle: "Built for South African classrooms",
    features: [
      { title: "Works offline", desc: "Screening sessions run without connectivity. Data is stored locally on the device and synced automatically once a connection is restored." },
      { title: "Three languages", desc: "Every instruction, lesson plan and training video is available in English, Afrikaans and isiXhosa — administered in the child's home language." },
      { title: "POPIA compliant", desc: "Child data is anonymised at capture. Research and analytics only ever access aggregated datasets, governed by HPCSA-aligned ethical standards." },
    ],
  },
  af: {
    heroEyebrow: "The Puzzle Box",
    heroTitle: "Hoe dit",
    heroHighlight: "werk",
    heroLead: "Van registrasie tot navorsing — 'n stap-vir-stap deurloop van die hele siftingsproses.",
    step: "Stap",
    journeyEyebrow: "Die siftingsreis",
    journeyTitle: "Ses fases van aanmelding tot navorsingsuitsette",
    journey: [
      {
        title: "Registreer & bevestig geloofsbriewe",
        desc: "Gebruikers registreer met hul e-posadres en professionele registrasienommer — 'n SACE-nommer vir opvoeders, 'n HPCSA-nommer vir sielkundiges. Die stelsel bevestig geloofsbriewe voordat toegang verleen word. Admins en data-ontleders word deur die organisasie se administrateur bygevoeg.",
      },
      {
        title: "Voltooi opleidingsmodules",
        desc: "Voordat gebruikers die siftingsfunksies kan gebruik, ontsluit hulle die digitale opleidingsmodules met hul aanmeldbesonderhede en die Produknommer wat saam met hul sifter verskaf is. Daarna voltooi hulle modules oor hoe om die legkaart-aktiwiteit te lei, waarnemingsmetodes en hoe om tydens assesserings met kinders om te gaan. Vasvrae help om die kennis vas te lê.",
      },
      {
        title: "Lei die legkaart-aktiwiteit",
        desc: "Die opvoeder lei die kind deur 'n gestruktureerde legkaart-aktiwiteit met die Puzzle Play-module. Lesplanne is beskikbaar in Engels, Afrikaans en isiXhosa. Die aktiwiteit werk ook vanlyn — data word plaaslik gestoor en gesinkroniseer sodra daar weer 'n verbinding is.",
      },
      {
        title: "Teken siftingswaarnemings aan",
        desc: "Die opvoeder voltooi 'n gestruktureerde digitale vorm wat tydsduur, beplanning, volgorde en voltooiing aanteken. Waarnemingsnotas word intyds aangeteken, en alle insette word outomaties aan die vooraf bepaalde ontwikkelingsdomeine gekoppel.",
      },
      {
        title: "Sielkundige hersien & interpreteer",
        desc: "Die toegewysde sielkundige sien die ingediende siftingsdata op hul paneelbord. Hulle hersien domeintellings, waarnemingsnotas en tydsdata, en voeg dan hul kliniese interpretasie by. Vergelykende siftings is eers ná 'n tydperk van minstens twee maande moontlik.",
      },
      {
        title: "Resultate, waarskuwings & navorsingsuitsette",
        desc: "Die resultate-paneelbord skep opsommings vir elke kind en vlag moontlike ontwikkelingskwessies. Geanonimiseerde, saamgevoegde data gaan na die Navorsing & Ontleding-module, waar data-ontleders tendense kan verken en na Excel kan uitvoer vir verdere ontleding.",
      },
    ],
    roleEyebrow: "Toegang volgens rol",
    roleTitle: "Elkeen sien presies wat hulle nodig het — en niks meer nie",
    roleLead: "Toegang tot siftingsresultate word volgens professionele rol in vlakke verdeel. Opvoeders kry 'n enkele algehele siftingstelling om verwysings te rig, terwyl interpretasie op domeinvlak vir gekwalifiseerde sielkundiges voorbehou is.",
    roles: [
      {
        role: "Opvoeders & primêre gesondheidsorg",
        tier: "Vlak 1",
        sees: ["'n Enkele algehele siftingstelling", "Lesplanne en legkaart-aktiwiteite", "Hul toegewysde leerders en sessiegeskiedenis", "Opleidingsmodules en sertifisering"],
      },
      {
        role: "Sielkundiges",
        tier: "Vlak 2",
        sees: ["Tellings op domein- en konstrukvlak", "Gevlagde leerders en kliniese waarskuwings", "Vergelykende ontleding oor sessies heen", "Verslae en verwysingsbriewe opstel"],
      },
      {
        role: "Administrateurs & ontleders",
        tier: "Admin",
        sees: ["Slegs geanonimiseerde, saamgevoegde data", "Gebruikerbestuur en roltoewysing", "Excel-uitvoer vir navorsing", "Toesig oor POPIA-nakoming"],
      },
    ],
    featuresEyebrow: "Ontwerp vir die konteks",
    featuresTitle: "Gebou vir Suid-Afrikaanse klaskamers",
    features: [
      { title: "Werk vanlyn", desc: "Siftingsessies werk sonder 'n verbinding. Data word plaaslik op die toestel gestoor en outomaties gesinkroniseer sodra daar weer 'n verbinding is." },
      { title: "Drie tale", desc: "Elke instruksie, lesplan en opleidingsvideo is beskikbaar in Engels, Afrikaans en isiXhosa — aangebied in die kind se huistaal." },
      { title: "POPIA-nakomend", desc: "Kinders se data word geanonimiseer wanneer dit aangeteken word. Navorsing en ontleding kry slegs toegang tot saamgevoegde datastelle, volgens etiese standaarde in lyn met die HPCSA." },
    ],
  },
  xh: {
    heroEyebrow: "The Puzzle Box",
    heroTitle: "Isebenza",
    heroHighlight: "njani",
    heroLead: "Ukususela ekubhaliseni ukuya kuphando — inkcazelo yenyathelo ngenyathelo yayo yonke inkqubo yohlolo.",
    step: "Inyathelo",
    journeyEyebrow: "Uhambo lohlolo",
    journeyTitle: "Izigaba ezithandathu ukusuka ekuqaleni ukuya kwiziphumo zophando",
    journey: [
      {
        title: "Bhalisa uze uqinisekise iziqinisekiso zakho",
        desc: "Abasebenzisi babhalisa nge-imeyile yabo kunye nenombolo yobhaliso lobuchwephesha — inombolo ye-SACE yootitshala, inombolo ye-HPCSA yezazi zengqondo. Inkqubo iqinisekisa iziqinisekiso phambi kokuba inike imvume yokungena. Abalawuli nabahlalutyi bedatha bongezwa ngumlawuli wombutho.",
      },
      {
        title: "Gqiba iimodyuli zoqeqesho",
        desc: "Phambi kokusebenzisa iinkonzo zohlolo, abasebenzisi bavula iimodyuli zoqeqesho zedijithali ngeenkcukacha zabo zokungena kunye neNombolo yeMveliso ehamba nesikrini sabo, emva koko bagqibe iimodyuli ezifundisa indlela yokukhokela umsebenzi wephazili, iindlela zokujonga kunye nendlela yokusebenzisana nabantwana ngexesha lohlolo. Imibuzo emifutshane iqinisekisa ukuba ulwazi luyagcinwa.",
      },
      {
        title: "Khokela umsebenzi wephazili",
        desc: "Utitshala ukhokela umntwana kumsebenzi wephazili olungelelanisiweyo esebenzisa imodyuli yePuzzle Play. Izicwangciso zezifundo ziyafumaneka ngesiNgesi, isiBhulu nesiXhosa. Lo msebenzi unokwenziwa ngaphandle kwe-intanethi — idatha igcinwa kwisixhobo ize ithunyelwe xa uqhagamshelwano lubuyile.",
      },
      {
        title: "Bhala oko ukubonileyo ngexesha lohlolo",
        desc: "Utitshala ugcwalisa ifomu yedijithali elungelelanisiweyo ebhala ixesha, ucwangciso, ulandelelwano nokugqitywa komsebenzi. Amanqaku oko kubonwayo abhalwa kwangoko, kwaye yonke into efakiweyo idityaniswa ngokuzenzekelayo nemimandla yokukhula esele imiselwe.",
      },
      {
        title: "Isazi sengqondo siyaphonononga size sicacise",
        desc: "Isazi sengqondo esabelweyo sifumana idatha yohlolo engenisiweyo kwiphini laso. Siphonononga amanqaku emimandla, amanqaku oko kubonwayo nedatha yexesha, size songeze ingcaciso yaso yezonyango. Uhlolo lokuthelekisa luvulwa kuphela emva kwexesha leenyanga ezimbini ubuncinane.",
      },
      {
        title: "Iziphumo, izilumkiso neziphumo zophando",
        desc: "Iphini leziphumo lenza izishwankathelo zomntwana ngamnye kwaye likhombe iingxaki zokukhula ezinokubakho. Idatha ehlanganisiweyo nengachazi bani iya kwimodyuli yoPhando noHlalutyo, apho abahlalutyi bedatha banokuphonononga iintlobo zeenguqu baze bayithumele ku-Excel ukuze ihlalutywe ngakumbi.",
      },
    ],
    roleEyebrow: "Ukufikelela ngokwendima",
    roleTitle: "Wonke umntu ubona kanye oko akudingayo — akukho nto ingaphezulu",
    roleLead: "Ukufikelela kwiziphumo zohlolo kwahlulwe ngamanqanaba ngokwendima yobuchwephesha. Ootitshala bafumana inqaku elinye lilonke lohlolo ukuze libakhokele ekuthumeleni umntwana kwiingcali, ngelixa ingcaciso ngokwemimandla igcinelwe izazi zengqondo eziqeqeshiweyo.",
    roles: [
      {
        role: "Ootitshala nabasebenzi bezempilo esisiseko",
        tier: "Inqanaba 1",
        sees: ["Inqaku elinye lilonke lohlolo", "Izicwangciso zezifundo nemisebenzi yephazili", "Abafundi ababelwe bona nembali yeeseshoni", "Iimodyuli zoqeqesho nezatifikethi"],
      },
      {
        role: "Izazi zengqondo",
        tier: "Inqanaba 2",
        sees: ["Amanqaku ngokwemimandla nangokwamacandelo", "Abafundi abakhonjiweyo nezilumkiso zezonyango", "Uhlalutyo lokuthelekisa iiseshoni", "Ukwenza iingxelo neeleta zokuthumela"],
      },
      {
        role: "Abalawuli nabahlalutyi",
        tier: "Ulawulo",
        sees: ["Idatha ehlanganisiweyo nengachazi bani kuphela", "Ulawulo lwabasebenzisi nokwabela iindima", "Ukuthumela ku-Excel ngenjongo yophando", "Ukujonga ukuthotyelwa kwe-POPIA"],
      },
    ],
    featuresEyebrow: "Yenzelwe imeko yethu",
    featuresTitle: "Yakhelwe amagumbi okufundela aseMzantsi Afrika",
    features: [
      { title: "Isebenza ngaphandle kwe-intanethi", desc: "Iiseshoni zohlolo ziyaqhuba ngaphandle koqhagamshelwano. Idatha igcinwa kwisixhobo ize ithunyelwe ngokuzenzekelayo xa uqhagamshelwano lubuyile." },
      { title: "Iilwimi ezintathu", desc: "Yonke imiyalelo, izicwangciso zezifundo neevidiyo zoqeqesho ziyafumaneka ngesiNgesi, isiBhulu nesiXhosa — zinikezelwa ngolwimi lwasekhaya lomntwana." },
      { title: "Iyayithobela i-POPIA", desc: "Idatha yomntwana yenziwa ingachazi bani kwangoko xa ibhalwa. Uphando nohlalutyo zifikelela kuphela kwiiseti zedatha ezihlanganisiweyo, zilawulwa yimigangatho yokuziphatha ehambelana ne-HPCSA." },
    ],
  },
};

// ---- The six-stage screening journey -------------------------------------
// Colours are shared; the words come from T[lang].journey (same order).
const JOURNEY_COLORS = [COLORS.teal, COLORS.pink, COLORS.purple, COLORS.orange, COLORS.teal, COLORS.pink];

function StageCard({ stage, i }) {
  const { lang } = useLanguage();
  const t = T[lang] || T.en;
  return (
    <div className="soft-card" style={{ background: COLORS.white, borderRadius: 24, padding: "26px 28px", boxShadow: "0 8px 26px rgba(60,40,20,0.06)" }}>
      <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: stage.color, marginBottom: 8 }}>
        {t.step} {i + 1}
      </p>
      <h3 style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 800, color: COLORS.ink, marginBottom: 10, lineHeight: 1.25 }}>
        {stage.title}
      </h3>
      <p style={{ fontSize: 15, color: COLORS.inkMid, lineHeight: 1.75 }}>{stage.desc}</p>
    </div>
  );
}

function StageMarker({ stage, i }) {
  return (
    <div className="wiggle" style={{
      width: 52, height: 52, borderRadius: "50%", background: stage.color, color: COLORS.white,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: FONTS.heading, fontSize: 20, fontWeight: 900,
      border: `4px solid ${CREAM}`, boxShadow: `0 6px 16px color-mix(in srgb, ${stage.color} 33%, transparent)`,
      position: "relative", zIndex: 1, flexShrink: 0,
    }}>
      {i + 1}
    </div>
  );
}

function JourneySection() {
  const isMobile = useIsMobile(860);
  const { lang } = useLanguage();
  const t = T[lang] || T.en;
  const journey = t.journey.map((text, i) => ({ ...text, color: JOURNEY_COLORS[i] }));
  return (
    <section style={{ padding: isMobile ? "64px 22px" : "100px 40px", background: CREAM }}>
      <div style={{ maxWidth: 1100, margin: "auto" }}>
        <Reveal>
          <SectionHeading align="center" eyebrow={t.journeyEyebrow} title={t.journeyTitle} maxWidth={620} />
        </Reveal>

        <div style={{ position: "relative" }}>
          {/* The dashed line the steps hang off */}
          <div aria-hidden="true" style={{
            position: "absolute", top: 26, bottom: 26,
            left: isMobile ? 25 : "50%", marginLeft: isMobile ? 0 : -1,
            borderLeft: `2.5px dashed rgba(60,40,20,0.18)`,
          }} />

          {journey.map((stage, i) => {
            const left = i % 2 === 0;
            if (isMobile) {
              return (
                <Reveal key={i} style={{ display: "flex", gap: 18, marginBottom: i === journey.length - 1 ? 0 : 26 }}>
                  <StageMarker stage={stage} i={i} />
                  <div style={{ flex: 1 }}><StageCard stage={stage} i={i} /></div>
                </Reveal>
              );
            }
            return (
              <Reveal key={i} style={{
                display: "grid", gridTemplateColumns: "1fr 90px 1fr", alignItems: "center",
                marginBottom: i === journey.length - 1 ? 0 : 34,
              }}>
                <div>{left && <StageCard stage={stage} i={i} />}</div>
                <div style={{ display: "flex", justifyContent: "center" }}><StageMarker stage={stage} i={i} /></div>
                <div>{!left && <StageCard stage={stage} i={i} />}</div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---- What each role sees: reinforces the tiered access rule --------------
// Colours are shared; the words come from T[lang].roles (same order).
const ROLE_STYLES = [
  { color: COLORS.teal, bg: COLORS.tealLight },
  { color: COLORS.purple, bg: COLORS.purpleLight },
  { color: COLORS.pink, bg: COLORS.pinkLight },
];

function RoleAccessSection() {
  const isMobile = useIsMobile(860);
  const { lang } = useLanguage();
  const t = T[lang] || T.en;
  const roles = t.roles.map((text, i) => ({ ...text, ...ROLE_STYLES[i] }));
  return (
    <section style={{ padding: isMobile ? "64px 22px" : "100px 40px", background: COLORS.white }}>
      <div style={{ maxWidth: 1150, margin: "auto" }}>
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow={t.roleEyebrow}
            title={t.roleTitle}
            lead={t.roleLead}
            maxWidth={760}
          />
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 22 }}>
          {roles.map((r, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <div className="soft-card" style={{ height: "100%", padding: isMobile ? "30px 26px" : "36px 32px", borderRadius: 28, background: r.bg }}>
                <span style={{
                  display: "inline-block", padding: "5px 14px", borderRadius: 999,
                  background: COLORS.white, color: r.color, fontSize: 11.5, fontWeight: 800,
                  letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16,
                }}>
                  {r.tier}
                </span>
                <h3 style={{ fontFamily: FONTS.heading, fontSize: 21, fontWeight: 800, color: COLORS.ink, marginBottom: 18 }}>{r.role}</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {r.sees.map(item => (
                    <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 15, color: COLORS.inkMid, marginBottom: 12, lineHeight: 1.55 }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: "50%", background: COLORS.white,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
                      }}>
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                          <path d="M1 4l2.5 2.5L9 1" stroke={r.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- Built for South African classrooms ----------------------------------
// Colours are shared; the words come from T[lang].features (same order).
const FEATURE_COLORS = [COLORS.teal, COLORS.pink, COLORS.purple];

function FeaturesSection() {
  const isMobile = useIsMobile(760);
  const { lang } = useLanguage();
  const t = T[lang] || T.en;
  const features = t.features.map((text, i) => ({ ...text, color: FEATURE_COLORS[i] }));
  return (
    <section style={{ padding: isMobile ? "64px 22px" : "100px 40px", background: CREAM }}>
      <div style={{ maxWidth: 1100, margin: "auto" }}>
        <Reveal>
          <SectionHeading align="center" eyebrow={t.featuresEyebrow} title={t.featuresTitle} />
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: isMobile ? 36 : 48 }}>
          {features.map((f, i) => (
            <Reveal key={i} delay={i * 0.12} style={{ textAlign: "center" }}>
              <PuzzlePiece size={58} color={f.color} fillOpacity={1} rotate={[-10, 8, -4][i % 3]} style={{ margin: "0 auto 18px", display: "block" }} />
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 21, fontWeight: 800, color: COLORS.ink, marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: 15, color: COLORS.inkMid, lineHeight: 1.75, maxWidth: 320, margin: "0 auto" }}>{f.desc}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HowItWorks({ onNavigateToLogin, onNavigate }) {
  const go = onNavigate || (() => console.warn("No onNavigate handler passed to HowItWorks"));
  const { lang } = useLanguage();
  const t = T[lang] || T.en;

  return (
    <div style={{ fontFamily: FONTS.body }}>
      <style>{`${PUBLIC_FONT_IMPORT}${WARM_PAGE_CSS}`}</style>
      <Navbar site="pb" current="pb-how" onNavigate={go} onLoginClick={() => onNavigateToLogin()} />
      <PageHero
        eyebrow={t.heroEyebrow}
        title={t.heroTitle}
        highlight={t.heroHighlight}
        lead={t.heroLead}
      />
      <JourneySection />
      <RoleAccessSection />
      <FeaturesSection />
      <CallToAction />
      <Footer site="pb" onNavigate={go} onLoginClick={() => onNavigateToLogin()} />
    </div>
  );
}
