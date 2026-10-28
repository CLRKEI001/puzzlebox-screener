import React, { useState, useEffect, useRef } from "react";

import {
  COLORS, ON_DARK, FONTS, PUBLIC_FONT_IMPORT, CREAM, Reveal, PuzzlePiece, SectionHeading, Navbar, Footer, CallToAction, piecePath, gridEdges, useInView, useIsMobile, PIECE_BODY, PIECE_PAD, PIECE_VIEWBOX, VideoPauseButton,
} from "../shared/SiteChrome";
import { useLanguage } from "../../theme/LanguageContext";
// Hero footage sits directly in src/ so webpack bundles it.
// hero-puzzle.mp4 = desktop (1280x960), hero-puzzle-mobile.mp4 = phones (720x540, ~3 MB)
import Doodle from "../shared/Doodle";
import heroVideo from "../../assets/hero-puzzle.mp4";
import heroVideoMobile from "../../assets/hero-puzzle-mobile.mp4";
import heroPoster from "../../assets/hero-poster.jpg";
// Stills taken from the session footage, used as photos down the page
import momentClassroom from "../../assets/puzzle-play-garden.png";
// Session photo: child building the puzzle in The Puzzle Box frame
import puzzleBoxSession from "../../assets/puzzlepicture_angled.png";


// NOTE — site structure (sponsor feedback, Aug 2026)
// This file is now the home page of THE PUZZLE PROJECT (the organisation).
// The screener-specific parts that used to live here moved to their own
// pages:  the "who can administer" tiers → PuzzleBoxHome.js,  the donation
// form → DonatePage.js.  `Hero` (with the impact-stats strip) and the
// assemble/float animation CSS are exported so The Puzzle Box home page can
// reuse them with its own copy.

// ---- UI text in English, Afrikaans and isiXhosa ---------------------------
// The data arrays below (DOMAINS, PILLARS, WHAT_WE_DO, VISION_ITEMS) keep
// their colours, ids and targets; their words live here, keyed by id, so
// they follow the language picked in the navbar. Brand / product names stay
// the same in every language.
const T = {
  en: {
    domains: {
      cognitive: { label: "Cognitive", title: "Cognitive development", desc: "Thinking, attention, planning, memory and early number concepts." },
      language: { label: "Language", title: "Language development", desc: "Understanding spoken instructions and using language accurately." },
      finemotor: { label: "Fine Motor", title: "Fine Motor development", desc: "Hand-eye coordination, pencil control and motor planning." },
      social: { label: "Social & Emotional", title: "Social & Emotional development", desc: "Understanding feelings, getting along with peers, making fair choices." },
    },
    puzzleIntro: "One screener. Six developmental domains, grouped into four pieces.",
    puzzleTap: "Tap a piece to explore.",
    puzzleHover: "Hover over a piece to explore.",
    tppBadge: "South African NGO initiative",
    tppLead: "The Puzzle Project is a South African non-profit bringing structured early childhood developmental screening to every school — regardless of location or connectivity.",
    heroH1a: "No child left behind —", heroH1b: "early screening,", heroH1c: " every school.",
    videoEyebrow: "One piece at a time",
    videoH1a: "Every child deserves", videoH1b: "to be", videoH1c: "seen.", videoH1d: "",
    videoLead: "We're a South African non-profit using puzzles to spot developmental needs early, in every school, in every language, whether or not there's signal.",
    explorePb: "Explore The Puzzle Box", explorePp: "Explore Puzzle Play",
    whyEyebrow: "Why we exist",
    whyText: "Too often, a child's developmental needs are only noticed once they're already struggling at school. We want to catch them early, with something",
    whyHighlight: "every child already loves.",
    pillarsEyebrow: "What guides us",
    pillarsTitle: "Three things we won't compromise on",
    pillars: {
      "01": { title: "Identify early", tags: ["Evidence-based", "Structured"], desc: "Catch developmental concerns before they become barriers to learning, using structured evidence-based screening tools." },
      "02": { title: "Reach every child", tags: ["Multilingual", "Low-connectivity", "Eastern Cape"], desc: "Multilingual and designed to work in low-connectivity environments, starting in the Eastern Cape." },
      "03": { title: "Protect with ethics", tags: ["POPIA", "HPCSA"], desc: "All child data is anonymised, POPIA-compliant and governed by strict ethical standards aligned with HPCSA guidelines." },
    },
    storyScrollHint: "Keep scrolling to put the picture together",
    storyAlt: "Children planting and watering a vegetable garden, cut into puzzle pieces that fit together",
    storyEyebrow: "How it started",
    storyTitle: "\"What if puzzles could make a difference?\"",
    storyP1: "For Gary King, the question arrived while producing a film in the rural Eastern Cape, where he saw the challenges facing young children growing up with limited access to educational and developmental resources.",
    storyP2: "That question became The Puzzle Project. Gary brought together psychologists, educators, researchers and community partners to build a scientifically rigorous, culturally responsive screening tool made for South African children.",
    storyButton: "Read our story",
    whatEyebrow: "What we do",
    whatTitle: "Play, screening and research, all connected",
    whatWeDo: {
      pp: { title: "Puzzle Play", desc: "Lesson plans, multilingual videos and training quizzes so educators can run puzzle-based activities in class.", cta: "Explore Puzzle Play" },
      pb: { title: "The Puzzle Box", desc: "Our screener: structured assessments with timers, observation notes and results across six developmental domains.", cta: "Explore The Puzzle Box",
        imgAlt: "A child fitting pieces into The Puzzle Box frame while a timer runs on a phone beside it" },
      research: { title: "Research and insight", desc: "Anonymised dashboards and exports for researchers, policy makers and project sponsors.", note: "Coming soon" },
    },
    visionEyebrow: "The bigger picture",
    visionTitle: "The Puzzle Project Vision",
    visionLead: "The Puzzle Box is one piece of a larger plan to bring puzzles into classrooms, homes and communities across South Africa.",
    vision: {
      pb: "ECD developmental screening\nfor 5 to 6 year olds.",
      pp: "Nationwide puzzle development\nfor Grades 0 to 7.",
      tv: "An educational TV show\ntaking development into\nhomes.",
      app: "Puzzles for all — a digital\nplatform, everywhere.",
      production: "Design, production and\ndistribution, creating jobs\nthrough printing and recycling.",
      data: "Recording the shifts that\npuzzles make.",
    },
    learnMore: "Learn more →",
    inDevelopment: "In development",
    goTo: (title) => `Go to ${title}`,
    inDevelopmentAria: (title) => `${title}, in development`,
    supportEyebrow: "Make a difference",
    supportTitle: "Help a child get seen sooner",
    supportText: "Your donation goes towards The Puzzle Box Screener and Puzzle Play, reaching more children and training more educators.",
    donate: "Donate",
  },
  af: {
    domains: {
      cognitive: { label: "Kognitief", title: "Kognitiewe ontwikkeling", desc: "Dink, aandag, beplanning, geheue en vroeë getalbegrip." },
      language: { label: "Taal", title: "Taalontwikkeling", desc: "Om gesproke instruksies te verstaan en taal akkuraat te gebruik." },
      finemotor: { label: "Fyn Motories", title: "Fynmotoriese ontwikkeling", desc: "Hand-oog-koördinasie, potloodbeheer en motoriese beplanning." },
      social: { label: "Sosiaal & Emosioneel", title: "Sosiale en emosionele ontwikkeling", desc: "Om gevoelens te verstaan, met maats oor die weg te kom en regverdige keuses te maak." },
    },
    puzzleIntro: "Een sifter. Ses ontwikkelingsdomeine, gegroepeer in vier stukke.",
    puzzleTap: "Tik op 'n stuk om te verken.",
    puzzleHover: "Beweeg oor 'n stuk om te verken.",
    tppBadge: "Suid-Afrikaanse NRO-inisiatief",
    tppLead: "The Puzzle Project is 'n Suid-Afrikaanse nie-winsgewende organisasie wat gestruktureerde ontwikkelingsifting in die vroeë kinderjare na elke skool bring — ongeag ligging of konnektiwiteit.",
    heroH1a: "Geen kind word agtergelaat nie —", heroH1b: "vroeë sifting", heroH1c: " in elke skool.",
    videoEyebrow: "Een stukkie op 'n slag",
    videoH1a: "Elke kind verdien", videoH1b: "om", videoH1c: "raakgesien", videoH1d: " te word.",
    videoLead: "Ons is 'n Suid-Afrikaanse nie-winsgewende organisasie wat legkaarte gebruik om ontwikkelingsbehoeftes vroeg raak te sien — in elke skool, in elke taal, of daar nou sein is of nie.",
    explorePb: "Verken The Puzzle Box", explorePp: "Verken Puzzle Play",
    whyEyebrow: "Hoekom ons bestaan",
    whyText: "Te dikwels word 'n kind se ontwikkelingsbehoeftes eers raakgesien wanneer hy of sy reeds op skool sukkel. Ons wil dit vroeg raaksien, met iets wat",
    whyHighlight: "elke kind reeds liefhet.",
    pillarsEyebrow: "Wat ons lei",
    pillarsTitle: "Drie dinge waaraan ons nie toegewings maak nie",
    pillars: {
      "01": { title: "Identifiseer vroeg", tags: ["Bewysgebaseer", "Gestruktureerd"], desc: "Identifiseer ontwikkelingskwessies voordat dit hindernisse vir leer word, met gestruktureerde, bewysgebaseerde sifting-instrumente." },
      "02": { title: "Bereik elke kind", tags: ["Veeltalig", "Lae konnektiwiteit", "Oos-Kaap"], desc: "Veeltalig en ontwerp om in omgewings met swak konnektiwiteit te werk, met die Oos-Kaap as beginpunt." },
      "03": { title: "Beskerm met etiek", tags: ["POPIA", "HPCSA"], desc: "Alle kinderdata word geanonimiseer, voldoen aan POPIA en word gerig deur streng etiese standaarde wat met die HPCSA-riglyne strook." },
    },
    storyScrollHint: "Hou aan rol om die prentjie bymekaar te sit",
    storyAlt: "Kinders wat 'n groentetuin plant en natgooi, in legkaartstukke gesny wat inmekaar pas",
    storyEyebrow: "Hoe dit begin het",
    storyTitle: "\"Wat as legkaarte 'n verskil kan maak?\"",
    storyP1: "Vir Gary King het die vraag opgekom terwyl hy 'n film in die landelike Oos-Kaap vervaardig het, waar hy die uitdagings gesien het van jong kinders wat grootword met beperkte toegang tot opvoedkundige en ontwikkelingshulpbronne.",
    storyP2: "Daardie vraag het The Puzzle Project geword. Gary het sielkundiges, onderwysers, navorsers en gemeenskapsvennote saamgebring om 'n wetenskaplik streng, kultureel sensitiewe sifting-instrument vir Suid-Afrikaanse kinders te bou.",
    storyButton: "Lees ons storie",
    whatEyebrow: "Wat ons doen",
    whatTitle: "Spel, sifting en navorsing, alles verbind",
    whatWeDo: {
      pp: { title: "Puzzle Play", desc: "Lesplanne, veeltalige video's en opleidingsvasvrae sodat onderwysers legkaartaktiwiteite in die klas kan aanbied.", cta: "Verken Puzzle Play" },
      pb: { title: "The Puzzle Box", desc: "Ons sifter: gestruktureerde assesserings met tydhouers, waarnemingsnotas en resultate oor ses ontwikkelingsdomeine.", cta: "Verken The Puzzle Box",
        imgAlt: "'n Kind wat stukke in die The Puzzle Box-raam pas terwyl 'n tydhouer op 'n foon langsaan loop" },
      research: { title: "Navorsing en insig", desc: "Geanonimiseerde paneelborde en uitvoere vir navorsers, beleidmakers en projekborge.", note: "Binnekort" },
    },
    visionEyebrow: "Die groter prentjie",
    visionTitle: "Die Visie van The Puzzle Project",
    visionLead: "The Puzzle Box is een stuk van 'n groter plan om legkaarte na klaskamers, huise en gemeenskappe regoor Suid-Afrika te bring.",
    vision: {
      pb: "ECD-ontwikkelingsifting\nvir 5- tot 6-jariges.",
      pp: "Landwye legkaartontwikkeling\nvir Graad 0 tot 7.",
      tv: "'n Opvoedkundige TV-program\nwat ontwikkeling na\nhuise bring.",
      app: "Legkaarte vir almal — 'n digitale\nplatform, oral.",
      production: "Ontwerp, produksie en\nverspreiding, wat werk skep\ndeur drukwerk en herwinning.",
      data: "Teken die verskuiwings aan wat\nlegkaarte teweegbring.",
    },
    learnMore: "Lees meer →",
    inDevelopment: "In ontwikkeling",
    goTo: (title) => `Gaan na ${title}`,
    inDevelopmentAria: (title) => `${title}, in ontwikkeling`,
    supportEyebrow: "Maak 'n verskil",
    supportTitle: "Help 'n kind om gouer raakgesien te word",
    supportText: "Jou skenking gaan na die The Puzzle Box-sifter en Puzzle Play, sodat ons meer kinders kan bereik en meer onderwysers kan oplei.",
    donate: "Skenk",
  },
  xh: {
    domains: {
      cognitive: { label: "Ukucinga", title: "Uphuhliso lokucinga", desc: "Ukucinga, ukunika ingqalelo, ukucwangcisa, inkumbulo neengqiqo zokuqala zamanani." },
      language: { label: "Ulwimi", title: "Uphuhliso lolwimi", desc: "Ukuqonda imiyalelo ethethwayo nokusebenzisa ulwimi ngokuchanekileyo." },
      finemotor: { label: "Izakhono Zezandla", title: "Uphuhliso lwezakhono zezandla", desc: "Ukusebenzisana kwesandla neliso, ukulawula ipensile nokucwangcisa iintshukumo." },
      social: { label: "Ezentlalo & Iimvakalelo", title: "Uphuhliso lwentlalo neemvakalelo", desc: "Ukuqonda iimvakalelo, ukuvana noontanga nokwenza izigqibo ezinobulungisa." },
    },
    puzzleIntro: "Isixhobo sohlolo esinye. Imihlaba emithandathu yophuhliso, ehlelwe yaba ngamaqhekeza amane.",
    puzzleTap: "Cofa iqhekeza ukuze uphonononge.",
    puzzleHover: "Beka ikhesa phezu kweqhekeza ukuze uphonononge.",
    tppBadge: "Iphulo le-NGO yaseMzantsi Afrika",
    tppLead: "The Puzzle Project ngumbutho ongenzi nzuzo waseMzantsi Afrika ozisa uhlolo lophuhliso lwabantwana abasakhulayo olucwangcisiweyo kwisikolo ngasinye — kungakhathaliseki indawo okanye ukufikelela kwi-intanethi.",
    heroH1a: "Akukho mntwana ushiywa ngasemva —", heroH1b: "uhlolo lwangethuba", heroH1c: " kwisikolo ngasinye.",
    videoEyebrow: "Iqhekeza ngeqhekeza",
    videoH1a: "Wonke umntwana", videoH1b: "ufanelwe", videoH1c: "kukubonwa.", videoH1d: "",
    videoLead: "Singumbutho ongenzi nzuzo waseMzantsi Afrika osebenzisa iiphazili ukubona kwangethuba iimfuno zophuhliso — kwisikolo ngasinye, ngalo lonke ulwimi, nokuba inethiwekhi ikhona okanye ayikho.",
    explorePb: "Phonononga The Puzzle Box", explorePp: "Phonononga Puzzle Play",
    whyEyebrow: "Kutheni sikhona",
    whyText: "Kaninzi, iimfuno zophuhliso zomntwana ziqatshelwa kuphela xa sele esokola esikolweni. Sifuna ukuzibona kwangethuba, ngento",
    whyHighlight: "ethandwa ngumntwana wonke.",
    pillarsEyebrow: "Into esikhokelayo",
    pillarsTitle: "Izinto ezintathu esingayi kuzincama",
    pillars: {
      "01": { title: "Fumanisa kwangethuba", tags: ["Esekelwe kubungqina", "Ecwangcisiweyo"], desc: "Bona iinkxalabo zophuhliso ngaphambi kokuba zibe yimiqobo ekufundeni, usebenzisa izixhobo zohlolo ezicwangcisiweyo nezisekelwe kubungqina." },
      "02": { title: "Fikelela kuwo wonke umntwana", tags: ["Iilwimi ezininzi", "Inethiwekhi ebuthathaka", "Mpuma Koloni"], desc: "Ngeelwimi ezininzi kwaye yenzelwe ukusebenza kwiindawo ezinenethiwekhi ebuthathaka, siqala eMpuma Koloni." },
      "03": { title: "Khusela ngokuziphatha okufanelekileyo", tags: ["POPIA", "HPCSA"], desc: "Yonke idatha yabantwana ayichazi magama, ithobela i-POPIA kwaye ilawulwa yimigangatho engqongqo yokuziphatha ehambelana nemigaqo ye-HPCSA." },
    },
    storyScrollHint: "Qhubeka usihla ukuze umfanekiso uhlangane",
    storyAlt: "Abantwana betyala besinkcenkceshela igadi yemifuno, isikwe yaba ngamaqhekeza ephazili adibanayo",
    storyEyebrow: "Kwaqala njani",
    storyTitle: "\"Kuthekani ukuba iiphazili zingenza umahluko?\"",
    storyP1: "KuGary King, lo mbuzo wavela xa wayevelisa ifilimu kwiindawo zasemaphandleni eMpuma Koloni, apho wabona khona imingeni ejongene nabantwana abancinci abakhula befikelela kancinci kwizixhobo zemfundo nezophuhliso.",
    storyP2: "Lo mbuzo waba yiThe Puzzle Project. UGary wahlanganisa izazi zengqondo, ootitshala, abaphandi namaqabane asekuhlaleni ukuze bakhe isixhobo sohlolo esiqinileyo ngokwenzululwazi nesihambelana neenkcubeko, esenzelwe abantwana baseMzantsi Afrika.",
    storyButton: "Funda ibali lethu",
    whatEyebrow: "Esikwenzayo",
    whatTitle: "Umdlalo, uhlolo nophando, konke kunxulumene",
    whatWeDo: {
      pp: { title: "Puzzle Play", desc: "Izicwangciso zezifundo, iividiyo ngeelwimi ezininzi nemibuzo yoqeqesho ukuze ootitshala baqhube imisebenzi esekelwe kwiiphazili eklasini.", cta: "Phonononga Puzzle Play" },
      pb: { title: "The Puzzle Box", desc: "Isixhobo sethu sohlolo: uvavanyo olucwangcisiweyo olunezibali-xesha, amanqaku okuqwalasela neziphumo kwimihlaba emithandathu yophuhliso.", cta: "Phonononga The Puzzle Box",
        imgAlt: "Umntwana efaka amaqhekeza kwisakhelo seThe Puzzle Box ngelixa isibali-xesha sisebenza efowunini ecaleni kwakhe" },
      research: { title: "Uphando nolwazi", desc: "Iideshibhodi neefayile ezikhutshelwayo ezingachazi magama, zabaphandi, abenzi bemigaqo-nkqubo nabaxhasi beprojekthi.", note: "Kuyeza kungekudala" },
    },
    visionEyebrow: "Umfanekiso omkhulu",
    visionTitle: "Umbono weThe Puzzle Project",
    visionLead: "The Puzzle Box liqhekeza elinye lesicwangciso esikhulu sokuzisa iiphazili emagumbini okufundela, emakhaya nasekuhlaleni kuwo wonke uMzantsi Afrika.",
    vision: {
      pb: "Uhlolo lophuhliso lwe-ECD\nlwabantwana abaneminyaka emi-5 ukuya kwemi-6.",
      pp: "Uphuhliso ngeephazili kwilizwe lonke\nkumaBanga 0 ukuya kwele-7.",
      tv: "Inkqubo kamabonakude yemfundo\nezisa uphuhliso\nemakhaya.",
      app: "Iiphazili zabo bonke — iqonga\nledijithali, kuyo yonke indawo.",
      production: "Uyilo, imveliso\nnokusasaza, kudalwa imisebenzi\nngokushicilela nokurisayikilisha.",
      data: "Ukurekhoda utshintsho\nolwenziwa ziiphazili.",
    },
    learnMore: "Funda ngakumbi →",
    inDevelopment: "Kusaphuhliswa",
    goTo: (title) => `Yiya ku-${title}`,
    inDevelopmentAria: (title) => `${title}, kusaphuhliswa`,
    supportEyebrow: "Yenza umahluko",
    supportTitle: "Nceda umntwana abonwe kwangethuba",
    supportText: "Umnikelo wakho uya kwisixhobo sohlolo iThe Puzzle Box nakwiPuzzle Play, ukuze sifikelele kubantwana abaninzi kwaye siqeqeshe ootitshala abaninzi.",
    donate: "Nikela",
  },
};

function useT() {
  const { lang } = useLanguage();
  return T[lang] || T.en;
}

// The four developmental domains the screener measures, rendered as a real
// 2x2 jigsaw: each piece's tabs slot into the neighbouring piece's sockets.
// Pieces slide in from four directions on load, then float gently.
// Hovering, tapping or tabbing to a piece lifts it out of the puzzle and
// reveals its description (tap/keyboard support so it works on phones too).
//
// row/col place the piece in the grid; `edges` describe its four sides, where
// 1 = tab (knob), -1 = blank (socket), 0 = flat outer border. Tabs and blanks
// are mirrored between neighbours so the pieces genuinely fit together.
const DOMAINS = [
  {
    key: "cognitive", color: COLORS.teal,
    row: 0, col: 0, edges: { top: -1, right: 1, bottom: -1, left: 1 },
    from: "translate(-70px, -70px)",
    icon: "bulb",
  },
  {
    key: "language", color: COLORS.pink, labelDy: -0.22,
    row: 0, col: 1, edges: { top: 1, right: -1, bottom: 1, left: -1 },
    from: "translate(70px, -70px)",
    icon: "books",
  },
  {
    key: "finemotor", color: COLORS.orange,
    row: 1, col: 0, edges: { top: 1, right: 1, bottom: 1, left: -1 },
    from: "translate(-70px, 70px)",
    icon: "pencil",
  },
  {
    key: "social", color: COLORS.purple,
    row: 1, col: 1, edges: { top: -1, right: 1, bottom: -1, left: -1 },
    from: "translate(70px, 70px)",
    icon: "users",
  },
];

// True on devices without a real hover (phones, tablets)
const noHover = () =>
  typeof window !== "undefined" && window.matchMedia?.("(hover: none)").matches;

function DomainPuzzle() {
  const [hovered, setHovered] = useState(null);
  const t = useT();
  // Shared shape/colour data plus the words for the current language
  const domains = DOMAINS.map(d => ({ ...d, ...t.domains[d.key] }));
  const active = domains.find(d => d.key === hovered);
  const isMobile = useIsMobile(480);
  const touch = noHover();

  // Rendered size of one piece body — shrinks on narrow phones so the
  // 2x2 grid (BODY_PX * 2 wide) never forces horizontal scroll.
  const BODY_PX = isMobile ? 124 : 188;
  const SCALE = BODY_PX / PIECE_BODY;
  const PAD_PX = PIECE_PAD * SCALE;                       // room the tabs need
  const SVG_PX = (PIECE_BODY + PIECE_PAD * 2) * SCALE;
  const labelSize = isMobile ? 12.5 : 16.5;
  // Push a label away from a socket (a neighbour's tab pokes in); sockets that
  // face a neighbouring piece look deeper, so they push a little harder.
  const nudge = (side, d) => {
    if (d.edges[side] !== -1) return 0;
    const inner = (side === "left" && d.col === 1) || (side === "right" && d.col === 0) ||
                  (side === "top" && d.row === 1) || (side === "bottom" && d.row === 0);
    return BODY_PX * (inner ? 0.18 : 0.13);
  };

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 520, margin: "0 auto" }}>
      {/* The assembled jigsaw. Pieces are absolutely positioned so their tabs
          overlap into the neighbouring sockets rather than sitting in a grid. */}
      <div style={{
        position: "relative", width: BODY_PX * 2, height: BODY_PX * 2,
        margin: `${PAD_PX * 0.8}px auto`, overflow: "visible",
      }}>
        {domains.map((d, i) => {
          const isHovered = hovered === d.key;
          return (
            <div key={d.key}
              className="domain-piece"
              role="button"
              tabIndex={0}
              aria-pressed={isHovered}
              aria-label={`${d.label}: ${d.desc}`}
              onMouseEnter={() => !touch && setHovered(d.key)}
              onMouseLeave={() => !touch && setHovered(null)}
              // Keyboard focus opens a piece; a tap/click must not (on touch the
              // focus fired first and the click then toggled it straight shut).
              onFocus={(e) => { if (e.target.matches?.(":focus-visible")) setHovered(d.key); }}
              onBlur={() => setHovered(null)}
              onClick={() => setHovered(h => (h === d.key ? null : d.key))}
              style={{
                "--from": d.from,
                animationDelay: `${0.25 + i * 0.18}s, ${1.6 + i * 0.6}s`,
                position: "absolute",
                left: d.col * BODY_PX, top: d.row * BODY_PX,
                width: BODY_PX, height: BODY_PX,
                cursor: "pointer", outlineOffset: 4,
                zIndex: isHovered ? 5 : 1,
              }}
            >
              <div style={{
                position: "relative", width: "100%", height: "100%",
                transition: "transform 0.25s ease, opacity 0.25s ease",
                transform: isHovered ? "translateY(-10px) scale(1.05)" : "none",
                opacity: hovered && !isHovered ? 0.45 : 1,
              }}>
                <svg
                  width={SVG_PX} height={SVG_PX} viewBox={PIECE_VIEWBOX}
                  style={{
                    position: "absolute", left: -PAD_PX, top: -PAD_PX,
                    overflow: "visible", pointerEvents: "none",
                    filter: `drop-shadow(0 8px 20px ${d.color}45)`,
                  }}
                >
                  <path d={piecePath(d.edges)} fill={d.color} stroke="#fff" strokeWidth={3.5} strokeLinejoin="round" />
                </svg>
                <span style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: FONTS.heading, fontWeight: 900,
                  fontSize: labelSize, color: ON_DARK, textAlign: "center",
                  lineHeight: 1.2, pointerEvents: "none", padding: isMobile ? "0 12px" : "0 18px",
                  transform: `translate(${nudge("left", d) - nudge("right", d)}px, ${nudge("top", d) - nudge("bottom", d) + (d.labelDy || 0) * BODY_PX}px)`,
                  textShadow: "0 1px 6px rgba(0,0,0,0.3)",
                }}>
                  {d.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Description panel — swaps as you hover/tap each piece */}
      <div aria-live="polite" style={{
        marginTop: 20, minHeight: 78, padding: "16px 20px",
        borderRadius: 14, background: COLORS.white,
        border: `1px solid ${active ? active.color + "55" : COLORS.border}`,
        boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
        transition: "border-color 0.25s ease",
        display: "flex", alignItems: "center", gap: 16, textAlign: "left",
      }}>
        <div style={{
          flex: "0 0 auto", width: 64, height: 64, borderRadius: 16,
          background: (active ? active.color : COLORS.teal) + "1f",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.25s ease",
        }}>
          <Doodle name={active ? active.icon : "puzzle"} size={44} color={active ? active.color : COLORS.teal} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {active ? (
            <>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: active.color, marginBottom: 5 }}>
                {active.title}
              </p>
              <p style={{ fontSize: 13.5, color: COLORS.inkMid, lineHeight: 1.6 }}>{active.desc}</p>
            </>
          ) : (
            <p style={{ fontSize: 13, color: COLORS.inkFaint, lineHeight: 1.6 }}>
              {t.puzzleIntro}<br />{touch ? t.puzzleTap : t.puzzleHover}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Animation CSS shared by every page that shows the four-domain puzzle
export const HOME_ANIMATION_CSS = `
  @keyframes assemble {
    from { opacity: 0; transform: var(--from) scale(0.8); }
    to { opacity: 1; transform: translate(0, 0) scale(1); }
  }
  @keyframes gentle-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-7px); }
  }
  .domain-piece {
    opacity: 0;
    animation: assemble 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards,
               gentle-float 5s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .domain-piece { animation: none; opacity: 1; }
  }
`;

// Light hero — soft background, brand colours, split layout.
// `badge` / `lead` / `actions` / `stats` let The Puzzle Box home page reuse it with its own copy.
// Leave `badge` / `lead` out to get The Puzzle Project's own copy in the current language.
// actions: [{ label, onClick, primary? }]
// stats:   [{ value, label }] — the strip below the hero only renders when this has items
export function Hero({ badge: badgeProp, lead: leadProp, actions = [], stats = [] }) {
  const t = useT();
  const badge = badgeProp === undefined ? t.tppBadge : badgeProp;
  const lead = leadProp === undefined ? t.tppLead : leadProp;
  const [visible, setVisible] = useState(false);
  const isMobile = useIsMobile(860);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 120); return () => clearTimeout(t); }, []);

  const fadeUp = (delay = 0) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(24px)",
    transition: `all 0.6s ease ${delay}s`,
  });

  return (
    <section style={{
      paddingTop: 84,
      paddingBottom: stats.length ? 0 : (isMobile ? 48 : 72),
      background: `linear-gradient(180deg, ${COLORS.white} 0%, ${COLORS.surface} 100%)`,
      position: "relative", overflow: "hidden",
    }}>
      {/* Soft colour washes */}
      <div style={{ position: "absolute", top: -120, right: -80, width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,155,141,0.10) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -140, left: -100, width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(107,47,138,0.09) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{
        maxWidth: 1300, margin: "0 auto",
        padding: isMobile ? "44px 20px 0" : "72px 40px 0",
        width: "100%",
        position: "relative", zIndex: 1,
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1.05fr 0.95fr",
        gap: isMobile ? 40 : 56, alignItems: "center",
      }}>
        {/* Left — message */}
        <div style={{ textAlign: isMobile ? "center" : "left" }}>
          {badge && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "7px 16px", borderRadius: 20,
            background: COLORS.tealLight, border: `1px solid rgba(0,155,141,0.25)`,
            fontSize: 12, fontWeight: 800, color: COLORS.teal,
            letterSpacing: "0.04em", marginBottom: 26,
            ...fadeUp(0.05),
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.teal }} />
            {badge}
          </div>
          )}

          <h1 style={{
            fontFamily: FONTS.heading,
            fontSize: "clamp(34px, 4.4vw, 58px)",
            fontWeight: 900, color: COLORS.ink,
            lineHeight: 1.08, letterSpacing: "-0.03em",
            marginBottom: 22, ...fadeUp(0.15),
          }}>
            {t.heroH1a}<br />
            <span style={{ color: COLORS.teal }}>{t.heroH1b}</span>{t.heroH1c}
          </h1>

          <p style={{
            fontSize: "clamp(15px, 1.7vw, 18px)",
            color: COLORS.inkMid,
            maxWidth: 520, lineHeight: 1.75, marginBottom: 34,
            marginLeft: isMobile ? "auto" : 0, marginRight: isMobile ? "auto" : 0,
            ...fadeUp(0.25),
          }}>
            {lead}
          </p>

          <div style={{
            display: "flex", gap: 14, flexWrap: "wrap",
            justifyContent: isMobile ? "center" : "flex-start",
            ...fadeUp(0.35),
          }}>
            {actions.map(a => (
              <button key={a.label} onClick={a.onClick} style={{
                padding: "14px 32px", borderRadius: 12,
                background: a.primary ? COLORS.teal : COLORS.white,
                color: a.primary ? COLORS.white : COLORS.ink,
                border: a.primary ? "none" : `1.5px solid ${COLORS.border}`,
                fontSize: 15, fontWeight: a.primary ? 800 : 700,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
              }}
                onMouseEnter={e => {
                  if (a.primary) { e.currentTarget.style.background = COLORS.tealDark; }
                  else { e.currentTarget.style.borderColor = COLORS.teal; e.currentTarget.style.color = COLORS.teal; }
                }}
                onMouseLeave={e => {
                  if (a.primary) { e.currentTarget.style.background = COLORS.teal; }
                  else { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.ink; }
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right — the four-domain puzzle (kept for The Puzzle Box home page) */}
        <div style={{ ...fadeUp(0.3) }}>
          <DomainPuzzle />
        </div>
      </div>

      {/* Impact counter strip — only when there are stats to show.
          4-across on desktop, 2x2 grid on mobile */}
      {stats.length > 0 && (
      <div style={{
        maxWidth: 1300, margin: isMobile ? "36px auto 0" : "56px auto 0",
        padding: isMobile ? "0 20px" : "0 40px",
        position: "relative", zIndex: 1, ...fadeUp(0.5),
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(160px, 1fr))",
          borderTop: `1px solid ${COLORS.border}`, borderBottom: `1px solid ${COLORS.border}`,
        }}>
          {stats.map((s, i) => {
            const cols = isMobile ? 2 : 4;
            const isFirstInRow = i % cols === 0;
            const isSecondRowOrLater = isMobile && i >= cols;
            return (
              <div key={s.label} style={{
                padding: isMobile ? "20px 14px" : "26px 20px", textAlign: "center",
                borderLeft: isFirstInRow ? "none" : `1px solid ${COLORS.border}`,
                borderTop: isSecondRowOrLater ? `1px solid ${COLORS.border}` : "none",
              }}>
                <div style={{ fontSize: isMobile ? 26 : 32, fontWeight: 900, color: COLORS.teal, fontFamily: FONTS.heading, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: COLORS.inkFaint, marginTop: 7, fontWeight: 600 }}>{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </section>
  );
}

// ===========================================================================
// THE PUZZLE PROJECT HOME PAGE (reworked, Sep 2026)
// Goal: feel human, not corporate. Real footage and photos from sessions,
// warm cream backgrounds, softer shapes, and sections that ease in as you
// scroll. Content and navigation targets are unchanged from the sponsor
// wireframes; only the layout and feel changed.
// ===========================================================================

// ---- 1. Hero: full-bleed footage, centred message ------------------------

// The footage file is stored upside down, so it's turned the right way up
// here. The poster belongs to the <video>, so it gets turned too — keep
// hero-poster.jpg saved the same way round as the footage.
const HERO_MEDIA_STYLE = {
  position: "absolute", inset: 0, width: "100%", height: "100%",
  objectFit: "cover", transform: "scale(1.04) rotate(180deg)",
};

// Skip the video (show the still instead) for visitors on data saver or who
// have asked for less motion — many of our users are on limited mobile data.
function shouldPlayHeroVideo() {
  if (typeof window === "undefined") return false;
  const saveData = navigator.connection?.saveData;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return !saveData && !reduceMotion;
}

export function VideoHero({ actions = [] }) {
  const [visible, setVisible] = useState(false);
  const [playVideo] = useState(shouldPlayHeroVideo);
  const isMobile = useIsMobile(860);
  const t = useT();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

  const rise = (delay = 0) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(18px)",
    transition: `opacity 0.8s ease ${delay}s, transform 0.8s ease ${delay}s`,
  });

  return (
    <section style={{
      position: "relative", minHeight: "100svh", width: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", background: "#1d1a17",
    }}>
      {playVideo ? (
        <video
          key={isMobile ? "mobile" : "desktop"}
          src={isMobile ? heroVideoMobile : heroVideo}
          poster={heroPoster}
          preload="metadata"
          autoPlay muted loop playsInline
          aria-hidden="true"
          style={HERO_MEDIA_STYLE}
        />
      ) : (
        <img src={heroPoster} alt="" aria-hidden="true" style={HERO_MEDIA_STYLE} />
      )}
      {playVideo && <VideoPauseButton />}

      {/* Even shade across the frame so centred text reads anywhere */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at center, rgba(20,14,8,0.55) 0%, rgba(20,14,8,0.35) 55%, rgba(20,14,8,0.6) 100%)",
      }} />

      <div style={{
        position: "relative", zIndex: 1, width: "100%", maxWidth: 980,
        padding: isMobile ? "130px 22px 90px" : "150px 40px 110px",
        textAlign: "center", color: ON_DARK,
      }}>
        <p style={{
          fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800,
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: COLORS.pinkLight, marginBottom: 16, ...rise(0.1),
        }}>
          {t.videoEyebrow}
        </p>

        <h1 style={{
          fontFamily: FONTS.heading, fontWeight: 900,
          fontSize: "clamp(38px, 6.4vw, 84px)", lineHeight: 1.04,
          letterSpacing: "-0.03em", marginBottom: 22,
          textShadow: "0 2px 24px rgba(0,0,0,0.35)", ...rise(0.2),
        }}>
          {t.videoH1a}<br />{t.videoH1b && <>{t.videoH1b}{" "}</>}
          <span style={{ position: "relative", whiteSpace: "nowrap" }}>
            {t.videoH1c}
            <svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true"
              style={{ position: "absolute", left: 0, bottom: "-0.12em", width: "100%", height: "0.3em", overflow: "visible" }}>
              <path d="M3 13 C 40 4, 90 18, 130 9 S 185 6, 197 11"
                fill="none" stroke={COLORS.pink} strokeWidth="5" strokeLinecap="round" className="scribble" />
            </svg>
          </span>{t.videoH1d}
        </h1>

        <p style={{
          fontSize: "clamp(15px, 1.6vw, 19px)", lineHeight: 1.7, maxWidth: 580,
          margin: "0 auto 32px", color: "rgba(255,255,255,0.9)", ...rise(0.35),
        }}>
          {t.videoLead}
        </p>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", ...rise(0.5) }}>
          {actions.map(a => (
            <button key={a.label} onClick={a.onClick} className={a.primary ? "hero-btn hero-btn--primary" : "hero-btn"}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scroll cue */}
      <div aria-hidden="true" className="scroll-cue" style={{
        position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)",
        width: 26, height: 42, borderRadius: 14, border: "2px solid rgba(255,255,255,0.7)",
        zIndex: 1, ...rise(0.9),
      }}>
        <span style={{ position: "absolute", top: 8, left: "50%", width: 4, height: 8, marginLeft: -2, borderRadius: 2, background: ON_DARK }} />
      </div>
    </section>
  );
}

export const VIDEO_HERO_CSS = `
  @keyframes draw-scribble { from { stroke-dashoffset: 260; } to { stroke-dashoffset: 0; } }
  .scribble { stroke-dasharray: 260; stroke-dashoffset: 260; animation: draw-scribble 0.9s ease 0.9s forwards; }
  @keyframes cue { 0% { opacity: 0; transform: translateY(0); } 40% { opacity: 1; } 100% { opacity: 0; transform: translateY(12px); } }
  .scroll-cue span { animation: cue 1.8s ease-in-out infinite; }
  .hero-btn {
    padding: 14px 30px; border-radius: 999px; font-family: inherit; font-size: 15px;
    font-weight: 800; cursor: pointer; transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
    background: rgba(255,255,255,0.12); color: #fff; border: 1.5px solid rgba(255,255,255,0.7);
    backdrop-filter: blur(6px);
  }
  .hero-btn:hover { background: #fff; color: #1d1a17; transform: translateY(-2px) rotate(-1deg); }
  .hero-btn--primary { background: ${COLORS.pinkLight}; color: #1d1a17; border-color: ${COLORS.pink}; }
  .hero-btn--primary:hover { background: #fff; border-color: #fff; }
  .snapshot { transition: transform 0.35s ease; }
  .snapshot:hover { transform: rotate(0deg) translateY(-6px) scale(1.02) !important; }
  .mix-btn { background: none; border: 1.5px solid rgba(40,30,20,0.25); color: #1a1a2e; border-radius: 999px; padding: 8px 18px; font-family: inherit; font-size: 13.5px; font-weight: 800; cursor: pointer; transition: transform 0.2s ease, border-color 0.2s ease, color 0.2s ease; }
  .mix-btn:hover { transform: translateY(-2px) rotate(-1deg); border-color: #009b8d; color: #009b8d; }
  .soft-card { transition: transform 0.25s ease; }
  .soft-card:hover { transform: translateY(-6px); }
  @media (prefers-reduced-motion: reduce) {
    .scribble { animation: none; stroke-dashoffset: 0; }
    .scroll-cue span { animation: none; }
    .hero-btn:hover, .snapshot:hover, .soft-card:hover { transform: none !important; }
  }
`;

// ---- 2. Why we exist: plain-language statement ----------------------------

function WhyWeExist() {
  const isMobile = useIsMobile(760);
  const t = useT();
  return (
    <section style={{ background: CREAM, padding: isMobile ? "70px 22px" : "110px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <Reveal>
          <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: COLORS.teal, marginBottom: 18 }}>
            {t.whyEyebrow}
          </p>
          <h2 style={{
            fontFamily: FONTS.heading, fontWeight: 800, color: COLORS.ink,
            fontSize: "clamp(24px, 3.4vw, 42px)", lineHeight: 1.25, letterSpacing: "-0.02em",
            maxWidth: 860, margin: "0 auto",
          }}>
            {t.whyText}{" "}
            <span style={{ color: COLORS.pink }}>{t.whyHighlight}</span>
          </h2>
        </Reveal>

      </div>
    </section>
  );
}

// ---- 3. What guides us: three pillars, no boxes --------------------------
const PILLARS = [
  // title / tags / desc for each pillar are in T.pillars, keyed by `n`
  { n: "01", color: COLORS.orange },
  { n: "02", color: COLORS.pink },
  { n: "03", color: COLORS.purple },
];

// Deep teal band — the page's main colour break between the cream sections.
// Fixed dark background, so text uses ON_DARK rather than theme-aware ink.
// Each pillar is a glassy card with a brand-coloured puzzle-piece badge, a
// ghosted outline number and tags; the pieces "click" together between cards.
function Pillars() {
  const isMobile = useIsMobile(760);
  const [hover, setHover] = useState(null);
  const t = useT();
  const pillars = PILLARS.map(p => ({ ...p, ...t.pillars[p.n] }));
  return (
    <section style={{
      background: COLORS.tealDark, padding: isMobile ? "68px 22px" : "104px 40px",
      position: "relative", overflow: "hidden",
    }}>
      {/* Faint oversized pieces for texture */}
      <PuzzlePiece size={isMobile ? 160 : 260} color={ON_DARK} fillOpacity={0.06} rotate={-16}
        style={{ position: "absolute", top: isMobile ? -50 : -80, left: isMobile ? -60 : -70, pointerEvents: "none" }} />
      <PuzzlePiece size={isMobile ? 130 : 210} color={ON_DARK} fillOpacity={0.06} rotate={22}
        style={{ position: "absolute", bottom: isMobile ? -50 : -70, right: isMobile ? -40 : -50, pointerEvents: "none" }} />

      <div style={{ maxWidth: 1120, margin: "0 auto", position: "relative" }}>
        <Reveal style={{ textAlign: "center", marginBottom: isMobile ? 44 : 64 }}>
          <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: COLORS.pinkLight, marginBottom: 14 }}>
            {t.pillarsEyebrow}
          </p>
          <h2 style={{ fontFamily: FONTS.heading, fontSize: "clamp(26px, 3.2vw, 40px)", fontWeight: 900, color: ON_DARK, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
            {t.pillarsTitle}
          </h2>
        </Reveal>

        <div style={{ position: "relative", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: isMobile ? 34 : 28 }}>
          {pillars.map((p, i) => {
            const on = hover === i;
            return (
              <Reveal key={p.n} delay={i * 0.12} style={{ position: "relative" }}>
                <div
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                  style={{
                    position: "relative", height: "100%", boxSizing: "border-box", overflow: "hidden",
                    borderRadius: 26, padding: isMobile ? "30px 26px 28px" : "34px 30px 30px",
                    background: on ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.08)",
                    border: "1.5px solid rgba(255,255,255,0.22)",
                    boxShadow: on ? "0 22px 44px rgba(0,0,0,0.22)" : "0 10px 28px rgba(0,0,0,0.12)",
                    transform: on ? "translateY(-8px)" : "none",
                    transition: "transform 0.3s ease, background 0.3s ease, box-shadow 0.3s ease",
                    textAlign: "left",
                  }}
                >
                  {/* ghosted outline number */}
                  <span aria-hidden="true" style={{
                    position: "absolute", top: 8, right: 22, fontFamily: FONTS.heading, fontWeight: 900,
                    fontSize: isMobile ? 84 : 104, lineHeight: 1, color: "transparent",
                    WebkitTextStroke: "2px rgba(255,255,255,0.28)", pointerEvents: "none",
                  }}>{p.n}</span>

                  <div style={{ height: isMobile ? 70 : 92 }} aria-hidden="true" />

                  <h3 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 800, color: ON_DARK, marginBottom: 12, letterSpacing: "-0.01em" }}>{p.title}</h3>
                  <p style={{ fontSize: 15, color: "rgba(255,255,255,0.86)", lineHeight: 1.75, marginBottom: 20 }}>{p.desc}</p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {p.tags.map((t) => (
                      <span key={t} style={{
                        fontSize: 12, fontWeight: 700, color: ON_DARK, padding: "5px 12px", borderRadius: 999,
                        background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
                      }}>{t}</span>
                    ))}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---- Our-story photo, cut into a jigsaw that assembles on scroll -----------
// Same idea as the donate page: the picture is cut into pieces that start
// scattered, then click into place when the section scrolls into view.
const STORY_ROWS = 4;
const STORY_COLS = 6;
const STORY_PIECES = Array.from({ length: STORY_ROWS * STORY_COLS }, (_, i) => {
  const row = Math.floor(i / STORY_COLS);
  const col = i % STORY_COLS;
  // Fixed pseudo-random scatter so it looks the same every visit
  const r = (n) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
  return {
    row, col,
    d: piecePath(gridEdges(row, col, STORY_ROWS, STORY_COLS)),
    dx: (col - 2.5) * 60 + (r(1) - 0.5) * 160,
    dy: (row - 1.5) * 60 + (r(2) - 0.5) * 130,
    rot: (r(3) - 0.5) * 90,
    delay: r(4) * 0.5 + i * 0.025,
  };
});

function StoryPuzzle({ src, alt }) {
  const wrapRef = useRef(null);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const t = useT();

  // Scroll-driven: the picture builds itself as the section scrolls into view
  useEffect(() => {
    if (reduced) return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = wrapRef.current;
      if (!el) return;
      const vh = window.innerHeight || 800;
      const top = el.getBoundingClientRect().top;
      const start = vh * 0.95, end = vh * 0.25;
      setProgress(Math.min(1, Math.max(0, (start - top) / (start - end))));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  const done = progress >= 1;

  return (
    <div ref={wrapRef} style={{ width: "100%", maxWidth: 560, margin: "0 auto" }}>
      <svg viewBox="-40 -40 680 480" role="img" aria-label={alt}
        style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}>
        <defs>
          {STORY_PIECES.map(p => (
            <clipPath key={`c${p.row}${p.col}`} id={`story-piece-${p.row}-${p.col}`}>
              <path d={p.d} />
            </clipPath>
          ))}
        </defs>
        {/* soft shadow under the finished picture */}
        <rect x="6" y="14" width="588" height="388" rx="14" fill="rgba(60,40,20,0.16)"
          style={{ filter: "blur(16px)", opacity: Math.max(0, (progress - 0.7) / 0.3) }} />
        {STORY_PIECES.map(p => {
          // each piece starts a little later than the last, so they settle one by one
          const t = Math.min(1, Math.max(0, (progress - p.delay * 0.8) / 0.4));
          const e = 1 - Math.pow(1 - t, 3);
          const k = 1 - e;
          return (
            <g key={`${p.row}-${p.col}`} transform={`translate(${p.col * 100} ${p.row * 100})`}>
              <g style={{
                transformBox: "fill-box", transformOrigin: "center",
                transform: `translate(${p.dx * k}px, ${p.dy * k}px) rotate(${p.rot * k}deg)`,
                opacity: 0.25 + 0.75 * e,
              }}>
                <g style={{ filter: k > 0.02 ? "drop-shadow(0 6px 8px rgba(60,40,20,0.22))" : "none" }}>
                  <image href={src} x={-p.col * 100} y={-p.row * 100} width="600" height="400"
                    preserveAspectRatio="xMidYMid slice" clipPath={`url(#story-piece-${p.row}-${p.col})`} />
                  <path d={p.d} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
                </g>
              </g>
            </g>
          );
        })}
      </svg>
      <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "#6b6b7a", fontFamily: FONTS.body,
        opacity: done ? 0 : 0.8, transition: "opacity 0.4s" }}>
        {t.storyScrollHint}
      </p>
    </div>
  );
}

// ---- 4. Our story: told like a story -------------------------------------
function OurStory({ onNavigate }) {
  const isMobile = useIsMobile(860);
  const t = useT();
  return (
    <section style={{ background: CREAM, padding: isMobile ? "70px 22px" : "110px 40px", overflow: "hidden" }}>
      <div style={{
        maxWidth: 1150, margin: "0 auto", display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: isMobile ? 44 : 72, alignItems: "center",
      }}>
        {/* Picture first on desktop so the story reads beside it */}
        <div style={{ order: isMobile ? 2 : 1 }}>
          <StoryPuzzle src={momentClassroom} alt={t.storyAlt} />
        </div>

        <Reveal delay={0.1} style={{ order: isMobile ? 1 : 2, textAlign: isMobile ? "center" : "left" }}>
          <p style={{ color: COLORS.teal, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.12em", marginBottom: 14, fontSize: 12 }}>
            {t.storyEyebrow}
          </p>
          <h2 style={{ fontFamily: FONTS.heading, fontSize: "clamp(28px, 3.4vw, 44px)", color: COLORS.ink, lineHeight: 1.12, marginBottom: 22, fontWeight: 900, letterSpacing: "-0.02em" }}>
            {t.storyTitle}
          </h2>
          <p style={{ color: COLORS.inkMid, lineHeight: 1.85, marginBottom: 16, fontSize: 16 }}>
            {t.storyP1}
          </p>
          <p style={{ color: COLORS.inkMid, lineHeight: 1.85, marginBottom: 28, fontSize: 16 }}>
            {t.storyP2}
          </p>
          <button onClick={() => onNavigate("about")} className="hero-btn" style={{ background: COLORS.ink, borderColor: COLORS.ink }}>
            {t.storyButton}
          </button>
        </Reveal>
      </div>
    </section>
  );
}

// ---- 5. What we do: soft tinted cards ------------------------------------
// COLORS.pinkLight/tealLight/purpleLight (var(--pink-lt) etc.) are pastel
// tints that stay pale on purpose in dark mode too — that's fine for a small
// badge, but as a big card background it turns into a glaring light patch
// with near-invisible text (COLORS.ink flips light in dark mode). cardTint()
// mixes the accent colour toward COLORS.white instead of a literal white, so
// it lands on the same soft pastel in light mode but a muted dark tone in
// dark mode — letting the existing theme-aware ink text stay legible either way.
const cardTint = (color) => `color-mix(in srgb, ${color} 10%, ${COLORS.white})`;

const WHAT_WE_DO = [
  // title / desc / cta / imgAlt / note for each card are in T.whatWeDo, keyed by `id`
  { id: "pp", color: COLORS.pink, bg: cardTint(COLORS.pink), page: "pp-home" },
  { id: "pb", color: COLORS.teal, bg: cardTint(COLORS.teal), page: "pb-home", img: puzzleBoxSession },
  { id: "research", color: COLORS.purple, bg: cardTint(COLORS.purple) },
];

function WhatWeDo({ onNavigate }) {
  const isMobile = useIsMobile(760);
  const t = useT();
  const items = WHAT_WE_DO.map(item => ({ ...item, ...t.whatWeDo[item.id] }));
  return (
    <section style={{ background: COLORS.white, padding: isMobile ? "64px 22px" : "100px 40px" }}>
      <div style={{ maxWidth: 1150, margin: "0 auto" }}>
        <Reveal>
          <SectionHeading align="center" eyebrow={t.whatEyebrow} title={t.whatTitle} maxWidth={640} />
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 22 }}>
          {items.map((item, i) => (
            <Reveal key={item.id} delay={i * 0.12}>
              <div className="soft-card" style={{
                height: "100%", padding: isMobile ? "30px 26px" : "38px 32px", borderRadius: 28,
                background: item.bg, display: "flex", flexDirection: "column", overflow: "hidden",
              }}>
                {item.img ? (
                  // Photo bleeds to the card edges (negative margins cancel the padding)
                  <img src={item.img} alt={item.imgAlt} loading="lazy" style={{
                    display: "block", objectFit: "cover", objectPosition: "center 60%",
                    width: `calc(100% + ${isMobile ? 52 : 64}px)`, height: isMobile ? 190 : 170,
                    margin: isMobile ? "-30px -26px 22px" : "-38px -32px 22px",
                  }} />
                ) : (
                  <PuzzlePiece size={68} color={item.color} fillOpacity={1} rotate={-8} style={{ marginBottom: 6, marginLeft: -6 }} />
                )}
                <h3 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 800, color: COLORS.ink, marginBottom: 10 }}>{item.title}</h3>
                <p style={{ fontSize: 15, color: COLORS.inkMid, lineHeight: 1.7, flex: 1 }}>{item.desc}</p>
                {item.page && (
                  <button onClick={() => onNavigate(item.page)} style={{
                    marginTop: 22, alignSelf: "flex-start", background: "none", border: "none", padding: 0,
                    cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: item.color,
                  }}>
                    {item.cta} →
                  </button>
                )}
                {item.note && (
                  <span style={{
                    marginTop: 22, alignSelf: "flex-start", fontSize: 12, fontWeight: 800,
                    letterSpacing: "0.08em", textTransform: "uppercase", color: item.color,
                  }}>
                    {item.note}
                  </span>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- 6. The Puzzle Project Vision, built as one interlocking jigsaw ----------
//
// Six pieces, 3x2 on desktop and 2x3 on phones. Position and tab/socket
// edges are worked out from each item's place in the list (gridEdges), so
// only order matters here.
//
// Live products (Puzzle Box, Puzzle Play) are solid brand colour with light
// text. Products still in development are a pale tint of their colour with
// dark text, plus an "In development" badge — clearly different at a glance,
// and readable in both light and dark mode.
//
// On phones the pieces are too small for descriptions, so the pieces show
// titles only and the descriptions appear as a list underneath.

const VISION_ITEMS = [
  // Titles are product names (the same in every language); each description
  // is in T.vision, keyed by `id`.
  { id: "pb", title: "The Puzzle Box", color: COLORS.teal, page: "pb-home" },
  { id: "pp", title: "Puzzle Play", color: COLORS.pink, page: "pp-home" },
  { id: "tv", title: "Puzzle TV", color: COLORS.purple, inDevelopment: true },
  { id: "app", title: "Puzzle App", color: COLORS.orange, inDevelopment: true },
  { id: "production", title: "Puzzle Production", color: COLORS.maroon, inDevelopment: true },
  // Neutral rather than teal, so it isn't mistaken for part of The Puzzle Box
  { id: "data", title: "Puzzle Data Analysis", color: COLORS.inkFaint, inDevelopment: true },
];

const VISION_COLS = 3;
const VISION_ROWS = 2;

// Pale tint for in-development pieces: see-through enough to read as
// "not ready yet", light enough for dark text to stay readable.
const devFill = (color) => `color-mix(in srgb, ${color} 45%, ${COLORS.white})`;

function VisionSection({ onNavigate }) {
  const [ref, inView] = useInView();
  const isMobile = useIsMobile(640);
  // Which in-development piece is showing its "In development" badge
  // (on hover, keyboard focus, or a tap on phones)
  const [revealed, setRevealed] = useState(null);
  const t = useT();
  const visionItems = VISION_ITEMS.map(item => ({ ...item, desc: t.vision[item.id] }));

  const cols = isMobile ? 2 : VISION_COLS;
  const rows = isMobile ? 3 : VISION_ROWS;

  return (
    <section style={{
      padding: isMobile ? "56px 20px 60px" : "90px 40px 100px",
      background: CREAM,
      overflow: "hidden",
    }}>
      <div style={{ maxWidth: 1300, margin: "auto" }}>
        <SectionHeading
          align="center"
          eyebrow={t.visionEyebrow}
          title={t.visionTitle}
          lead={t.visionLead}
          maxWidth={620}
        />

        {/* Assembled jigsaw */}
        <div
          ref={ref}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 1100,
            margin: "0 auto",
            aspectRatio: isMobile ? `${cols} / ${rows}` : "1.6 / 1",
            padding: isMobile ? "0" : "0 18px",
          }}
        >
          {visionItems.map((item, i) => {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const edges = gridEdges(row, col, rows, cols);

            // Each piece enters from its own side of the screen
            const dx = (col - (cols - 1) / 2) * (isMobile ? 70 : 160);
            const dy = (row - (rows - 1) / 2) * (isMobile ? 90 : 190);

            const textColor = item.inDevelopment ? COLORS.ink : ON_DARK;
            const showBadge = revealed === item.title;

            // Keep the text clear of sockets: where a neighbour's tab pokes
            // into this piece, push the text further in from that side.
            const inset = (side) => {
              const vertical = side === "top" || side === "bottom";
              if (edges[side] === -1) return isMobile ? "26%" : (vertical ? "32%" : "30%");
              return isMobile ? (vertical ? "16%" : "8%") : (vertical ? "18%" : "22%");
            };

            return (
              <div
                key={item.title}
                onClick={item.page ? () => onNavigate(item.page)
                  : item.inDevelopment ? () => setRevealed(r => (r === item.title ? null : item.title))
                  : undefined}
                onMouseEnter={item.inDevelopment ? () => setRevealed(item.title) : undefined}
                onMouseLeave={item.inDevelopment ? () => setRevealed(null) : undefined}
                onFocus={item.inDevelopment ? (e) => { if (e.target.matches?.(":focus-visible")) setRevealed(item.title); } : undefined}
                onBlur={item.inDevelopment ? () => setRevealed(null) : undefined}
                onKeyDown={item.page ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onNavigate(item.page);
                  }
                } : undefined}
                role={item.page ? "link" : item.inDevelopment ? "button" : undefined}
                tabIndex={item.page || item.inDevelopment ? 0 : undefined}
                aria-label={
                  item.page ? t.goTo(item.title)
                  : item.inDevelopment ? t.inDevelopmentAria(item.title)
                  : undefined
                }
                style={{
                  cursor: item.page ? "pointer" : "default",
                  position: "absolute",
                  left: `${(col / cols) * 100}%`,
                  top: `${(row / rows) * 100}%`,
                  width: `${100 / cols}%`,
                  height: `${100 / rows}%`,
                  opacity: inView ? 1 : 0,
                  transform: inView
                    ? "translate(0, 0) scale(1)"
                    : `translate(${dx}px, ${dy}px) scale(0.82)`,
                  transition: `opacity 0.6s ease ${i * 0.09}s, transform 0.75s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.09}s`,
                  padding: isMobile ? "0" : "0 6px",
                }}
              >
                {/* The puzzle piece */}
                <svg
                  viewBox={PIECE_VIEWBOX}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  style={{
                    // Sized from PIECE_PAD so the tabs always land in their
                    // neighbour's socket, even if the piece shape changes
                    position: "absolute", left: `-${PIECE_PAD}%`, top: `-${PIECE_PAD}%`,
                    width: `${100 + PIECE_PAD * 2}%`, height: `${100 + PIECE_PAD * 2}%`,
                    overflow: "visible", pointerEvents: "none",
                  }}
                >
                  <path
                    d={piecePath(edges)}
                    style={{ fill: item.inDevelopment ? devFill(item.color) : item.color }}
                  />
                </svg>

                {/* Text on the piece */}
                <div style={{
                  position: "absolute",
                  top: inset("top"), right: inset("right"), bottom: inset("bottom"), left: inset("left"),
                  display: "flex", flexDirection: "column",
                  justifyContent: "center", alignItems: "center",
                  textAlign: "center", pointerEvents: "none",
                }}>
                  <h3 style={{
                    fontFamily: FONTS.heading, fontWeight: 900, color: textColor,
                    fontSize: isMobile ? "clamp(13px, 3.6vw, 17px)" : "clamp(14px, 1.3vw, 22px)",
                    lineHeight: 1.15, marginBottom: isMobile ? 0 : 6,
                    textShadow: item.inDevelopment ? "none" : "0 1px 6px rgba(0,0,0,0.25)",
                    maxWidth: "88%", overflowWrap: "break-word",
                  }}>
                    {item.title}
                  </h3>

                  {!isMobile && (
                    <p style={{
                      fontSize: "clamp(11px, 0.9vw, 13px)", lineHeight: 1.4,
                      color: item.inDevelopment ? COLORS.inkMid : "rgba(255,255,255,0.92)",
                      maxWidth: "88%", margin: 0, whiteSpace: "pre-line",
                    }}>
                      {item.desc}
                    </p>
                  )}

                  {item.page && (
                    <span style={{
                      marginTop: isMobile ? 6 : 11,
                      fontFamily: FONTS.heading, fontSize: isMobile ? 11 : 12,
                      fontWeight: 800, color: ON_DARK, letterSpacing: "0.03em",
                      borderBottom: "1px solid rgba(255,255,255,0.65)", paddingBottom: 2,
                    }}>
                      {t.learnMore}
                    </span>
                  )}

                  {/* Space is always kept for the badge so the text doesn't
                      jump when it appears */}
                  {item.inDevelopment && (
                    <span aria-hidden={!showBadge} style={{
                      opacity: showBadge ? 1 : 0,
                      transform: showBadge ? "translateY(0) scale(1)" : "translateY(6px) scale(0.92)",
                      transition: "opacity 0.2s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
                      display: "inline-flex", alignItems: "center", gap: 6,
                      marginTop: isMobile ? 6 : 10,
                      padding: isMobile ? "3px 8px" : "5px 10px",
                      borderRadius: 999,
                      background: `color-mix(in srgb, ${COLORS.white} 85%, transparent)`,
                      color: COLORS.ink, fontFamily: FONTS.heading,
                      fontSize: isMobile ? 10 : 11, fontWeight: 800,
                      letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                      {t.inDevelopment}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Phones: descriptions as a readable list under the puzzle */}
        {isMobile && (
          <ul style={{ listStyle: "none", padding: 0, margin: "40px auto 0", maxWidth: 480, display: "grid", gap: 16 }}>
            {visionItems.map(item => (
              <li key={item.title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, flexShrink: 0, marginTop: 6 }} />
                <div>
                  <p style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 15, color: COLORS.ink, margin: 0 }}>
                    {item.title}
                    {item.inDevelopment && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.inkFaint, marginLeft: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {t.inDevelopment}
                      </span>
                    )}
                  </p>
                  <p style={{ fontSize: 14, color: COLORS.inkMid, lineHeight: 1.6, margin: "2px 0 0" }}>
                    {item.desc.replace(/\n/g, " ")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// ---- 7. Support: warm, personal ask --------------------------------------
function SupportBand({ onNavigate }) {
  const isMobile = useIsMobile(760);
  const t = useT();
  return (
    <section style={{ background: cardTint(COLORS.pink), padding: isMobile ? "64px 22px" : "100px 40px" }}>
      <Reveal>
        <div style={{
          maxWidth: 820, margin: "0 auto", borderRadius: 32, background: COLORS.white,
          boxShadow: "0 20px 50px rgba(60,40,20,0.10)", position: "relative", overflow: "hidden",
        }}>
          <PuzzlePiece size={120} color={COLORS.pink} rotate={-14} style={{ position: "absolute", top: -34, right: -30 }} />
          <PuzzlePiece size={90} color={COLORS.teal} rotate={18} style={{ position: "absolute", bottom: -30, left: -24 }} />
          <div style={{ padding: isMobile ? "40px 26px" : "60px 56px", textAlign: "center", position: "relative" }}>
            <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: COLORS.pink, marginBottom: 12 }}>
              {t.supportEyebrow}
            </p>
            <h2 style={{ fontFamily: FONTS.heading, fontSize: "clamp(26px, 3vw, 38px)", fontWeight: 900, color: COLORS.ink, lineHeight: 1.12, letterSpacing: "-0.02em", marginBottom: 14 }}>
              {t.supportTitle}
            </h2>
            <p style={{ fontSize: 16, color: COLORS.inkMid, lineHeight: 1.75, marginBottom: 26, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
              {t.supportText}
            </p>
            <button onClick={() => onNavigate("donate")} className="hero-btn hero-btn--primary">
              {t.donate}
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// Section backgrounds:
// hero → Why (cream) → Pillars (deep teal) → Story (cream) → What we do (white,
// tinted cards) → Vision (cream) → Support (soft pink) → CTA
export default function Homepage({ onNavigateToLogin, onNavigate }) {
  const go = onNavigate || (() => console.warn("No onNavigate handler passed to Homepage"));
  const t = useT();

  return (
    <div style={{ fontFamily: FONTS.body }}>
      <style>{`
        ${PUBLIC_FONT_IMPORT}
        ${HOME_ANIMATION_CSS}
        ${VIDEO_HERO_CSS}
      `}</style>
      <Navbar site="tpp" current="home" overlay onNavigate={go} onLoginClick={onNavigateToLogin} />
      <VideoHero actions={[
        { label: t.explorePb, primary: true, onClick: () => go("pb-home") },
        { label: t.explorePp, onClick: () => go("pp-home") },
      ]} />
      <WhyWeExist />
      <Pillars />
      <OurStory onNavigate={go} />
      <WhatWeDo onNavigate={go} />
      <VisionSection onNavigate={go} />
      <SupportBand onNavigate={go} />
      <CallToAction />
      <Footer site="tpp" onNavigate={go} onLoginClick={onNavigateToLogin} />
    </div>
  );
}