import React, { useState, useEffect, useRef } from "react";
import ThemeToggle from "../../theme/ThemeToggle";
import { useLanguage, LanguageSwitcher } from "../../theme/LanguageContext";

// UI text for the shared public-site chrome (nav, footer, call-to-action...)
// in English, Afrikaans and isiXhosa. Brand names, people's names, email
// addresses and phone numbers stay as they are in every language.
const T = {
  en: {
    navHome: "Home", navAbout: "About", navDonate: "Donate",
    navPbHome: "Puzzle Box Home", navPpHome: "Puzzle Play Home",
    navHow: "How it works", navTraining: "Training", navPurchase: "Purchase",
    login: "Login", openMenu: "Open menu", closeMenu: "Close menu",
    homeAria: (name) => `${name} home`,
    footOrg: "Organisation", footProducts: "Our products", footPlatform: "Platform",
    aboutUs: "About Us", supportWork: "Support Our Work", contact: "Contact",
    trainingModules: "Training Modules",
    footBlurb: "Supporting early childhood development across South Africa through accessible, culturally relevant, play-based screening tools.",
    contactPerson: "Contact Gary King",
    rights: "All rights reserved.",
    ip: "Intellectual property of Dr R. Marais & Dr J. Jansen (2025)",
    ctaTitle: "Together we can give every child the opportunity to thrive.",
    ctaBody: "Whether you are an educator, therapist, school, researcher or partner organisation, your involvement helps us create brighter futures for children across South Africa.",
    contactUs: "Contact Us",
    photo: "Photo",
    playVideo: "Play background video", pauseVideo: "Pause background video",
  },
  af: {
    navHome: "Tuis", navAbout: "Oor Ons", navDonate: "Skenk",
    navPbHome: "Puzzle Box Tuis", navPpHome: "Puzzle Play Tuis",
    navHow: "Hoe dit werk", navTraining: "Opleiding", navPurchase: "Koop",
    login: "Teken In", openMenu: "Maak spyskaart oop", closeMenu: "Maak spyskaart toe",
    homeAria: (name) => `${name} tuisblad`,
    footOrg: "Organisasie", footProducts: "Ons produkte", footPlatform: "Platform",
    aboutUs: "Oor Ons", supportWork: "Ondersteun Ons Werk", contact: "Kontak",
    trainingModules: "Opleidingsmodules",
    footBlurb: "Ons ondersteun vroeë kinderontwikkeling regoor Suid-Afrika met toeganklike, kultureel relevante sifting-instrumente wat op spel gebaseer is.",
    contactPerson: "Kontak Gary King",
    rights: "Alle regte voorbehou.",
    ip: "Intellektuele eiendom van dr. R. Marais & dr. J. Jansen (2025)",
    ctaTitle: "Saam kan ons elke kind die geleentheid gee om te floreer.",
    ctaBody: "Of jy nou 'n onderwyser, terapeut, skool, navorser of vennootorganisasie is, jou betrokkenheid help ons om 'n beter toekoms vir kinders regoor Suid-Afrika te bou.",
    contactUs: "Kontak Ons",
    photo: "Foto",
    playVideo: "Speel agtergrondvideo", pauseVideo: "Onderbreek agtergrondvideo",
  },
  xh: {
    navHome: "Ekhaya", navAbout: "Malunga Nathi", navDonate: "Nikela",
    navPbHome: "Ikhaya lePuzzle Box", navPpHome: "Ikhaya lePuzzle Play",
    navHow: "Indlela esebenza ngayo", navTraining: "Uqeqesho", navPurchase: "Thenga",
    login: "Ngena", openMenu: "Vula imenyu", closeMenu: "Vala imenyu",
    homeAria: (name) => `Ikhaya: ${name}`,
    footOrg: "Umbutho", footProducts: "Iimveliso zethu", footPlatform: "Iqonga",
    aboutUs: "Malunga Nathi", supportWork: "Xhasa Umsebenzi Wethu", contact: "Qhagamshelana Nathi",
    trainingModules: "Iimodyuli Zoqeqesho",
    footBlurb: "Sixhasa uphuhliso lwabantwana abasakhulayo kuwo wonke uMzantsi Afrika ngezixhobo zohlolo ezifikelelekayo, ezihambelana neenkcubeko nezisekelwe kumdlalo.",
    contactPerson: "Qhagamshelana noGary King",
    rights: "Onke amalungelo agciniwe.",
    ip: "Ipropati yengqondo kaGqr R. Marais noGqr J. Jansen (2025)",
    ctaTitle: "Kunye singamnika wonke umntwana ithuba lokukhula kakuhle.",
    ctaBody: "Nokuba ungutitshala, uyingcali yonyango, isikolo, umphandi okanye umbutho oliqabane, ukuzibandakanya kwakho kusinceda sakhe ikamva eliqaqambileyo labantwana kuwo wonke uMzantsi Afrika.",
    contactUs: "Qhagamshelana Nathi",
    photo: "Ifoto",
    playVideo: "Dlala ividiyo engasemva", pauseVideo: "Misa ividiyo engasemva",
  },
};

function useT() {
  const { lang } = useLanguage();
  return T[lang] || T.en;
}

// Shared design tokens and page chrome for every public-facing page.
// Homepage, About, HowItWorks and Trainingpage all import from here so the
// navigation, logo and footer stay identical across the site.

// These read from the CSS custom properties defined in App.css (:root and
// its [data-theme="dark"] override) rather than hardcoded hex, so every
// public page built from COLORS re-themes automatically when ThemeContext
// flips data-theme on <html> — no per-page changes needed.
export const COLORS = {
  teal: "var(--teal)",
  tealDark: "var(--teal-dark)",
  tealLight: "var(--teal-lt)",
  pink: "var(--pink)",
  pinkLight: "var(--pink-lt)",
  purple: "var(--purple)",
  purpleLight: "var(--purple-lt)",
  orange: "var(--orange)",
  orangeLight: "var(--orange-lt)",
  // Deep berry maroon — the colour the Puzzle Project wordmark is set in
  maroon: "var(--maroon)",
  maroonLight: "var(--maroon-lt)",
  dark: "var(--dark)",
  ink: "var(--ink)",
  inkMid: "var(--ink-mid)",
  inkFaint: "var(--ink-faint)",
  surface: "var(--surface)",
  white: "var(--white)",
  border: "var(--border)",
};

// Always-white, for text sitting on something that stays dark in both
// themes (the homepage video, the dark call-to-action band). COLORS.white
// flips to a dark surface in dark mode, so it can't be used there.
export const ON_DARK = "#ffffff";

// ---- Public-site fonts ------------------------------------------------------
// The public pages (home, about, Puzzle Box, Puzzle Play, donate, training...)
// read their fonts from CSS variables, set by PUBLIC_FONT_IMPORT. The logged-in
// area never sets those variables, so anything shared with it (PurchaseContent,
// BrandLogo) falls back to Nunito there and looks exactly as before.
//
// To switch the whole public site, change ACTIVE_FONT_THEME to one of the keys below.
export const FONT_THEMES = {
  playful: {
    label: "Rounded and playful",
    url: "https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Quicksand:wght@500;600;700&display=swap",
    heading: "'Baloo 2', 'Nunito', sans-serif",
    body: "'Quicksand', 'Nunito Sans', sans-serif",
  },
  friendly: {
    label: "Clean and friendly",
    url: "https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap",
    heading: "'Poppins', 'Nunito', sans-serif",
    body: "'DM Sans', 'Nunito Sans', sans-serif",
  },
  warm: {
    label: "Warm serif headings",
    url: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800;9..144,900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap",
    heading: "'Fraunces', Georgia, serif",
    body: "'DM Sans', 'Nunito Sans', sans-serif",
  },
};

export const ACTIVE_FONT_THEME = "friendly";

// Use these in inline styles on public pages instead of hard-coding a font name
export const FONTS = {
  heading: "var(--font-heading, 'Poppins', sans-serif)",
  body: "var(--font-body, 'DM Sans', sans-serif)",
};

const activeTheme = FONT_THEMES[ACTIVE_FONT_THEME] || FONT_THEMES.friendly;

// --cream is the "alternate section" background used across the public pages
// (the name is historical). Sponsor wants brand colours only, so instead of a
// beige it's a very pale wash of maroon, the Puzzle Project wordmark colour.
// Keep it around 4–6%: maroon is dark, so more turns it pinkish-grey.
export const PUBLIC_FONT_IMPORT = `
  @import url('${activeTheme.url}');
  :root { --font-heading: ${activeTheme.heading}; --font-body: ${activeTheme.body}; --cream: color-mix(in srgb, var(--maroon) 5%, #ffffff); }
  [data-theme="dark"] { --cream: #17172A; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--font-body); }
  button, input, select, textarea { font-family: inherit; }
`;

// Logged-in area uses the same fonts as the public site.
export const FONT_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
  :root { --font-heading: 'Poppins', sans-serif; --font-body: 'DM Sans', sans-serif; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--font-body); }
`;

// ---- Jigsaw piece geometry ----------------------------------------------
// A real puzzle piece is a square whose edges carry a "tab" (a mushroom-shaped
// knob that sticks out) or a "blank" (the matching socket). The tab is drawn
// with bezier curves: a narrow neck that undercuts, then a wide round bulb.
//
// Each edge is described as  1 = tab, -1 = blank, 0 = flat (a straight border).
// The body of the piece occupies 0..100; tabs extend 30 units beyond that, so
// the viewBox is padded by 34 on every side.

export const PIECE_BODY = 100;   // size of the square body
export const PIECE_PAD = 34;     // room for tabs on each side
export const PIECE_VIEWBOX = `${-PIECE_PAD} ${-PIECE_PAD} ${PIECE_BODY + PIECE_PAD * 2} ${PIECE_BODY + PIECE_PAD * 2}`;

// Maps a point on a local edge (running left→right, tab bulging towards -y)
// onto the correct side of the square.
const EDGE_MAPS = {
  top: (x, y) => [x, y],
  right: (x, y) => [PIECE_BODY - y, x],
  bottom: (x, y) => [PIECE_BODY - x, PIECE_BODY - y],
  left: (x, y) => [y, PIECE_BODY - x],
};

// Soft jigsaw geometry: every corner is rounded (CORNER) and the tabs have a
// narrow neck opening into a big, round, slightly asymmetric-looking head,
// so pieces read as friendly and chunky rather than sharp and technical.
const CORNER = 10;

function edgeSegment(type, map) {
  const p = (x, y) => { const [gx, gy] = map(x, y); return `${gx.toFixed(1)},${gy.toFixed(1)}`; };
  const end = `L ${p(PIECE_BODY - CORNER, 0)}`;
  if (!type) return end;
  const o = (v) => -type * v; // tab pushes outwards, blank pulls inwards
  return [
    `L ${p(34, 0)}`,
    `C ${p(42, 0)} ${p(44, o(6))} ${p(40, o(12))}`,        // ease into the neck
    `C ${p(34, o(20))} ${p(36, o(30))} ${p(50, o(30))}`,   // round head, left half
    `C ${p(64, o(30))} ${p(66, o(20))} ${p(60, o(12))}`,   // round head, right half
    `C ${p(56, o(6))} ${p(58, 0)} ${p(66, 0)}`,            // ease back out of the neck
    end,
  ].join(" ");
}

/**
 * Builds the SVG path for one jigsaw piece.
 * edges: { top, right, bottom, left } each 1 (tab), -1 (blank) or 0 (flat).
 */
export function piecePath({ top = 0, right = 0, bottom = 0, left = 0 } = {}) {
  const order = [["top", top], ["right", right], ["bottom", bottom], ["left", left]];
  const pt = (map, x, y) => { const [gx, gy] = map(x, y); return `${gx.toFixed(1)},${gy.toFixed(1)}`; };
  const parts = [`M ${pt(EDGE_MAPS.top, CORNER, 0)}`];
  order.forEach(([name, type], i) => {
    const map = EDGE_MAPS[name];
    const nextMap = EDGE_MAPS[order[(i + 1) % 4][0]];
    parts.push(edgeSegment(type, map));
    // rounded corner into the start of the next edge
    parts.push(`Q ${pt(map, PIECE_BODY, 0)} ${pt(nextMap, CORNER, 0)}`);
  });
  parts.push("Z");
  return parts.join(" ");
}

// A classic standalone piece: sockets on the top and left, knobs on the
// right and bottom — the shape people picture when they think "puzzle piece".
const CLASSIC_PIECE = piecePath({ top: -1, right: 1, bottom: 1, left: 1 });

/**
 * Works out the edges for a piece sitting at (row, col) inside a rows x cols
 * jigsaw. Shared edges are always mirrored — where one piece has a tab its
 * neighbour has the matching socket — and the outside border is left flat,
 * so an assembled grid forms a clean rectangle.
 */
export function gridEdges(row, col, rows, cols) {
  const vertical = (r, c) => ((r + c) % 2 === 0 ? 1 : -1);   // right edge of piece (r, c)
  const horizontal = (r, c) => ((r + c) % 2 === 0 ? -1 : 1); // bottom edge of piece (r, c)
  return {
    top: row === 0 ? 0 : -horizontal(row - 1, col),
    right: col === cols - 1 ? 0 : vertical(row, col),
    bottom: row === rows - 1 ? 0 : horizontal(row, col),
    left: col === 0 ? 0 : -vertical(row, col - 1),
  };
}

// Decorative puzzle piece. fillOpacity 0.13 = faint background motif,
// higher values render it as a solid graphic element.
export function PuzzlePiece({ size = 60, color = COLORS.teal, style = {}, rotate = 0, fillOpacity = 0.13, edges }) {
  return (
    <svg width={size} height={size} viewBox={PIECE_VIEWBOX} fill="none"
      style={{ transform: `rotate(${rotate}deg)`, overflow: "visible", ...style }}>
      <path d={edges ? piecePath(edges) : CLASSIC_PIECE} fill={color} fillOpacity={fillOpacity} />
    </svg>
  );
}

// Each PuzzlePhoto needs its own clipPath id, so they don't collide on a page.
let clipCounter = 0;

/**
 * A photograph cut into the shape of a puzzle piece.
 * Pass `src` to show a real image; leave it out and you get a labelled
 * placeholder in the same shape, so layouts can be built before the
 * photography exists.
 */
export function PuzzlePhoto({
  src, alt = "", size = 260, edges, rotate = 0, style = {},
  label: labelProp, color = COLORS.teal, showBorder = true,
}) {
  const t = useT();
  const label = labelProp === undefined ? t.photo : labelProp;
  const [clipId] = useState(() => `puzzle-clip-${++clipCounter}`);
  const d = edges ? piecePath(edges) : CLASSIC_PIECE;
  const box = PIECE_BODY + PIECE_PAD * 2;

  return (
    <svg
      width={size} height={size} viewBox={PIECE_VIEWBOX}
      role="img" aria-label={alt || label}
      style={{ transform: `rotate(${rotate}deg)`, overflow: "visible", ...style }}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={d} />
        </clipPath>
      </defs>

      {src ? (
        <image
          href={src} xlinkHref={src}
          x={-PIECE_PAD} y={-PIECE_PAD} width={box} height={box}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
      ) : (
        <>
          <path d={d} fill={color} fillOpacity={0.14} />
          <text
            x={PIECE_BODY / 2} y={PIECE_BODY / 2}
            textAnchor="middle" dominantBaseline="middle"
            style={{ fontFamily: FONTS.body, fontSize: 8, fontWeight: 700, fill: COLORS.inkFaint }}
          >
            {label}
          </text>
        </>
      )}

      {showBorder && (
        <path d={d} fill="none" stroke={COLORS.white} strokeWidth={2.5} strokeLinejoin="round" />
      )}
    </svg>
  );
}

/**
 * Returns true once the viewport width drops to/below `breakpoint`, and
 * keeps tracking it live via matchMedia (resize, rotate, devtools, etc).
 * Shared by every page so the mobile breakpoints stay consistent site-wide.
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= breakpoint : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler); // Safari <14 fallback
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, [breakpoint]);

  return isMobile;
}

/**
 * Returns [ref, inView]. inView flips to true the first time the element
 * scrolls into the viewport, which is what drives the puzzle-assembly
 * animations. Falls back to visible if IntersectionObserver is unavailable.
 */
export function useInView({ threshold = 0.2, rootMargin = "0px 0px -80px 0px" } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setInView(true); return; }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();   // assemble once, then leave it alone
      }
    }, { threshold, rootMargin });

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return [ref, inView];
}

// Section heading used across pages — eyebrow label, title, optional lead paragraph
export function SectionHeading({ eyebrow, title, lead, align = "left", maxWidth = 720 }) {
  const isMobile = useIsMobile(640);
  const gap = isMobile ? 30 : 44;
  return (
    <div style={{
      marginBottom: gap, textAlign: align,
      maxWidth: align === "center" ? maxWidth : "none",
      margin: align === "center" ? `0 auto ${gap}px` : `0 0 ${gap}px`,
    }}>
      {eyebrow && (
        <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.teal, marginBottom: 12 }}>
          {eyebrow}
        </p>
      )}
      <h2 style={{
        fontFamily: FONTS.heading, fontSize: "clamp(26px, 3.2vw, 40px)",
        fontWeight: 900, color: COLORS.ink, lineHeight: 1.12, letterSpacing: "-0.02em",
        marginBottom: lead ? 16 : 0,
      }}>
        {title}
      </h2>
      {lead && (
        <p style={{ fontSize: 16, color: COLORS.inkMid, lineHeight: 1.75, maxWidth, margin: align === "center" ? "0 auto" : 0 }}>
          {lead}
        </p>
      )}
    </div>
  );
}

// ---- Brands ---------------------------------------------------------------
// The site is really three sites that share one set of chrome:
//   tpp — The Puzzle Project (the organisation: home, about, donate)
//   pb  — The Puzzle Box screener (how it works, training, purchase, login)
//   pp  — Puzzle Play (how it works, purchase, login)
// Each has its own logo, navigation and footer links (per the sponsor's
// wireframes). `logoSrc` is the path to a logo image in /public — while it is
// null a colourful typographic wordmark is drawn instead, so dropping in the
// real Puzzle Box / Puzzle Play artwork later is a one-line change here.
// `logoSrcOnDark` is an optional light version used when the logo sits on
// something dark (the homepage video). logo1.png is the one the footer uses.
export const BRANDS = {
  tpp: { key: "tpp", name: "The Puzzle Project", home: "home", logoSrc: "/logo-puzzleproject.png", logoSrcOnDark: "/logo1.png", wide: true, logoH: 92 },
  pb:  { key: "pb",  name: "The Puzzle Box",      home: "pb-home", logoSrc: "/logo-puzzlebox.png", wide: true, logoH: 72,
         wordmark: { small: "the", big: "PUZZLE", tail: "BOX" } },
  pp:  { key: "pp",  name: "Puzzle Play",         home: "pp-home", logoSrc: "/logo-puzzleplay.png", wide: true,
         wordmark: { small: "", big: "PUZZLE", tail: "PLAY" } },
};

const WORDMARK_COLORS = [COLORS.teal, COLORS.pink, COLORS.orange, COLORS.purple, COLORS.teal, COLORS.pink];

// Soft light halo so a dark logo still reads on dark footage, for brands
// that don't have a light logo file yet.
const ON_DARK_LOGO_FILTER = "drop-shadow(0 0 1.5px rgba(255,255,255,0.9)) drop-shadow(0 0 6px rgba(255,255,255,0.5))";

/**
 * Logo for whichever site the visitor is on. The Puzzle Project uses its
 * image; The Puzzle Box and Puzzle Play fall back to a wordmark until their
 * own logo files exist (see BRANDS above).
 * `onDark`: the logo is sitting on something dark — use the light logo file
 * if the brand has one, otherwise add a light halo.
 */
export function BrandLogo({ site = "tpp", height = 115, width = 125, onDark = false, style = {} }) {
  const brand = BRANDS[site] || BRANDS.tpp;

  if (brand.logoSrc) {
    const src = onDark && brand.logoSrcOnDark ? brand.logoSrcOnDark : brand.logoSrc;
    const darkFilter = onDark && !brand.logoSrcOnDark ? { filter: ON_DARK_LOGO_FILTER } : {};
    return (
      <img
        src={`${process.env.PUBLIC_URL || ""}${src}`}
        alt={brand.name}
        style={brand.wide
          ? { height: brand.logoH || Math.round(height * 0.52), width: "auto", display: "block", transition: "filter 0.3s ease", ...darkFilter, ...style }
          : { height, width, objectFit: "contain", display: "block", ...darkFilter, ...style }}
      />
    );
  }

  const { small, big, tail } = brand.wordmark;
  const size = Math.max(22, Math.round(height * 0.3));
  return (
    <div role="img" aria-label={brand.name}
      style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1, userSelect: "none", ...style }}>
      {small && (
        <span style={{
          fontFamily: FONTS.heading, fontWeight: 900, fontSize: Math.round(size * 0.42),
          color: onDark ? "rgba(255,255,255,0.7)" : COLORS.maroon, textTransform: "lowercase",
          letterSpacing: "0.04em", marginBottom: 2,
        }}>{small}</span>
      )}
      <span style={{ fontFamily: FONTS.heading, fontWeight: 900, fontSize: size, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
        {big.split("").map((ch, i) => (
          <span key={i} style={{ color: WORDMARK_COLORS[i % WORDMARK_COLORS.length] }}>{ch}</span>
        ))}
        <span style={{ color: onDark ? ON_DARK : COLORS.maroon }}>{tail}</span>
      </span>
    </div>
  );
}

// Which pages appear in the navigation bar of each site (Login is always the
// button on the right). Page keys are handled in App.js. Brand names use
// `label` (the same in every language); everything else uses `labelKey`,
// looked up in T for the current language.
const NAV_BY_SITE = {
  tpp: [
    { labelKey: "navHome", page: "home" },
    { labelKey: "navAbout", page: "about" },
    { label: "The Puzzle Box", page: "pb-home" },
    { label: "Puzzle Play", page: "pp-home" },
    { labelKey: "navDonate", page: "donate" },
  ],
  // The Puzzle Box and Puzzle Play keep their own navbars. The first link
  // always takes visitors back to The Puzzle Project landing page.
  pb: [
    { label: "The Puzzle Project", page: "home" },
    { labelKey: "navPbHome", page: "pb-home" },
    { labelKey: "navHow", page: "pb-how" },
    { labelKey: "navTraining", page: "pb-training" },
    { labelKey: "navPurchase", page: "pb-purchase" },
  ],
  pp: [
    { label: "The Puzzle Project", page: "home" },
    { labelKey: "navPpHome", page: "pp-home" },
    { labelKey: "navHow", page: "pp-how" },
    { labelKey: "navPurchase", page: "pp-purchase" },
  ],
};

/**
 * Site navigation. Used identically on every public page of a site.
 * `site` picks the logo + links ("tpp" | "pb" | "pp"), `current` highlights
 * the active page and `onNavigate(page)` handles routing.
 */
// `overlay`: nav starts fully transparent with white text so it sits on top of
// a full-bleed hero (e.g. the video on The Puzzle Project home). It switches to
// the normal white bar once the user scrolls or opens the mobile menu.
// `site` picks the logo and links: "tpp" (main site), "pb" (The Puzzle Box)
// or "pp" (Puzzle Play). The sub-site navbars start with a link back to
// The Puzzle Project, and their logo goes to that sub-site's own home page.
export function Navbar({ site = "tpp", current, onNavigate, onLoginClick, overlay = false }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Nav needs more breathing room than the general content breakpoint since
  // it's packing a logo, links, the EN/AF/XH buttons and Login into one row
  // (longer Afrikaans / isiXhosa link labels too). Below this width the
  // compact menu is used, which has the language buttons inside it.
  const isMobile = useIsMobile(1180);
  const t = useT();
  const brand = BRANDS[site] || BRANDS.tpp;
  const links = (NAV_BY_SITE[site] || NAV_BY_SITE.tpp)
    .map(link => ({ ...link, label: link.label || t[link.labelKey] }));
  const activePage = current;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Collapse the open dropdown automatically if the viewport grows back
  // past the mobile breakpoint (e.g. rotating a tablet).
  useEffect(() => { if (!isMobile) setMenuOpen(false); }, [isMobile]);

  // Lock body scroll while the mobile menu is open so the page behind it
  // doesn't scroll along with the dropdown's own content.
  useEffect(() => {
    if (!isMobile) return;
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, menuOpen]);

  const handleClick = (page) => {
    setMenuOpen(false);
    onNavigate(page);
  };

  const handleLoginClick = () => { setMenuOpen(false); onLoginClick(); };

  const solid = !overlay || scrolled || menuOpen;
  const textColor = solid ? COLORS.ink : ON_DARK;

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 999, width: "100%",
      background: solid
        ? ((scrolled || menuOpen) ? "var(--nav-bg-scrolled)" : "var(--nav-bg)")
        : "transparent",
      backdropFilter: solid ? "blur(16px)" : "none",
      borderBottom: (scrolled || menuOpen) ? `1px solid ${COLORS.border}` : "1px solid transparent",
      boxShadow: (scrolled || menuOpen) ? "0 8px 30px rgba(0,0,0,0.05)" : "none",
      transition: "all 0.3s ease",
    }}>
      <style>{`
        .nav-link { position: relative; background: none; border: none; cursor: pointer;
          padding: 9px 14px; font-size: 14.5px; font-family: inherit; white-space: nowrap;
          transition: color 0.2s ease; }
        .nav-link::after { content: ""; position: absolute; left: 14px; right: 14px; bottom: 3px;
          height: 2.5px; border-radius: 2px; background: currentColor;
          transform: scaleX(0); transform-origin: left; transition: transform 0.25s ease; }
        .nav-link:hover::after, .nav-link.is-active::after { transform: scaleX(1); }
        @media (prefers-reduced-motion: reduce) { .nav-link::after { transition: none; } }
      `}</style>
      <div style={{
        maxWidth: 1300,
        margin: "auto",
        height: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: isMobile ? "0 20px" : "0 40px",
        gap: 24,
      }}>
        {/* Logo always returns to this site's home page. While the nav is
            transparent over the video it switches to the light logo. */}
        <button type="button" onClick={() => handleClick(brand.home)}
          aria-label={t.homeAria(brand.name)}
          style={{ cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0, background: "none", border: "none", padding: 0 }}>
          <BrandLogo site={site} height={isMobile ? 125 : 115} width={125} onDark={!solid} />
        </button>

        {!isMobile && (
          <>
            <div style={{ display: "flex", gap: 4, alignItems: "center", flex: 1, justifyContent: "center" }}>
              {links.map(link => {
                const isActive = activePage === link.page;
                return (
                  <button key={link.page}
                    onClick={() => handleClick(link.page)}
                    className={isActive ? "nav-link is-active" : "nav-link"}
                    aria-current={isActive ? "page" : undefined}
                    style={{
                      fontWeight: isActive ? 800 : 700,
                      color: solid && isActive ? COLORS.teal : textColor,
                    }}
                  >
                    {link.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 14, alignItems: "center", flexShrink: 0 }}>
              {/* Over the dark home video the buttons sit on a soft dark pill so they stay legible */}
              <LanguageSwitcher style={solid ? undefined : { background: "rgba(0,0,0,0.28)", padding: 3, borderRadius: 10 }} />
              <ThemeToggle variant={solid ? "light" : "dark"} />
              <button onClick={() => onLoginClick()} style={{
                background: "transparent", color: solid ? COLORS.teal : ON_DARK,
                border: `1.5px solid ${solid ? COLORS.teal : "rgba(255,255,255,0.8)"}`, borderRadius: 999,
                padding: "10px 22px", cursor: "pointer", fontWeight: 700, fontSize: 14,
                fontFamily: "inherit", transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = solid ? COLORS.teal : ON_DARK; e.currentTarget.style.color = solid ? COLORS.white : "#1a1a2e"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = solid ? COLORS.teal : ON_DARK; }}
              >
                {t.login}
              </button>
            </div>
          </>
        )}

        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <ThemeToggle variant={solid ? "light" : "dark"} style={{ padding: "8px 10px" }} />
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? t.closeMenu : t.openMenu}
              aria-expanded={menuOpen}
              style={{
                display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
                gap: 5, width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: menuOpen ? COLORS.tealLight : "transparent",
                border: "none", cursor: "pointer", padding: 0,
              }}
            >
              <span style={{
                display: "block", width: 20, height: 2, borderRadius: 2, background: textColor,
                transition: "transform 0.2s ease, opacity 0.2s ease",
                transform: menuOpen ? "translateY(3.5px) rotate(45deg)" : "none",
              }} />
              <span style={{
                display: "block", width: 20, height: 2, borderRadius: 2, background: textColor,
                transition: "transform 0.2s ease, opacity 0.2s ease",
                opacity: menuOpen ? 0 : 1,
              }} />
              <span style={{
                display: "block", width: 20, height: 2, borderRadius: 2, background: textColor,
                transition: "transform 0.2s ease, opacity 0.2s ease",
                transform: menuOpen ? "translateY(-3.5px) rotate(-45deg)" : "none",
              }} />
            </button>
          </div>
        )}
      </div>

      {/* Mobile dropdown panel — slides open below the bar, links stacked full-width */}
      {isMobile && (
        <div aria-hidden={!menuOpen} style={{
          maxHeight: menuOpen ? 480 : 0,
          overflow: "hidden",
          // visibility removes the closed menu's links from the tab order
          visibility: menuOpen ? "visible" : "hidden",
          transition: `max-height 0.28s ease, visibility 0s linear ${menuOpen ? "0s" : "0.28s"}`,
          background: COLORS.white,
          borderTop: menuOpen ? `1px solid ${COLORS.border}` : "1px solid transparent",
        }}>
          <div style={{ padding: "10px 20px 22px", display: "flex", flexDirection: "column", gap: 4 }}>
            {links.map(link => {
              const isActive = activePage === link.page;
              return (
                <button key={link.page}
                  onClick={() => handleClick(link.page)}
                  style={{
                    background: isActive ? COLORS.tealLight : "none",
                    border: "none", cursor: "pointer", textAlign: "left",
                    padding: "13px 14px", borderRadius: 10,
                    fontSize: 15.5, fontWeight: isActive ? 800 : 700,
                    color: isActive ? COLORS.teal : COLORS.ink,
                    fontFamily: "inherit", width: "100%",
                  }}
                >
                  {link.label}
                </button>
              );
            })}
            <div style={{ height: 1, background: COLORS.border, margin: "10px 0" }} />
            <LanguageSwitcher style={{ padding: "4px 14px 12px" }} />
            <button onClick={handleLoginClick} style={{
              background: COLORS.teal, color: ON_DARK, border: "none",
              padding: "14px", borderRadius: 10, width: "100%",
              cursor: "pointer", fontWeight: 700, fontSize: 15, fontFamily: "inherit",
            }}>
              {t.login}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

// Full site footer — identical on every page of a site, with working navigation links
export function Footer({ site = "tpp", onNavigate, onLoginClick }) {
  const isMobile = useIsMobile(700);
  const t = useT();

  const organisation = {
    heading: t.footOrg,
    links: [
      ...(site !== "tpp" ? [{ label: "The Puzzle Project", action: () => onNavigate("home") }] : []),
      { label: t.aboutUs, action: () => onNavigate("about") },
      { label: t.supportWork, action: () => onNavigate("donate") },
      { label: t.contact, href: `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Enquiry — The Puzzle Project")}` },
    ],
  };

  const platform = {
    tpp: {
      heading: t.footProducts,
      links: [
        { label: "The Puzzle Box", action: () => onNavigate("pb-home") },
        { label: "Puzzle Play", action: () => onNavigate("pp-home") },
        { label: t.login, action: onLoginClick },
      ],
    },
    pb: {
      heading: t.footPlatform,
      links: [
        { label: t.navPbHome, action: () => onNavigate("pb-home") },
        { label: t.navHow, action: () => onNavigate("pb-how") },
        { label: t.trainingModules, action: () => onNavigate("pb-training") },
        { label: t.navPurchase, action: () => onNavigate("pb-purchase") },
        { label: t.login, action: onLoginClick },
      ],
    },
    pp: {
      heading: t.footPlatform,
      links: [
        { label: t.navPpHome, action: () => onNavigate("pp-home") },
        { label: "The Puzzle Project", action: () => onNavigate("home") },
        { label: t.navHow, action: () => onNavigate("pp-how") },
        { label: t.navPurchase, action: () => onNavigate("pp-purchase") },
        { label: t.login, action: onLoginClick },
      ],
    },
  }[site] || null;

  const columns = [platform, organisation].filter(Boolean);
  const brand = BRANDS[site] || BRANDS.tpp;

  return (
    <footer style={{ background: COLORS.dark, padding: isMobile ? "40px 20px 24px" : "52px 40px 32px" }}>
      <div style={{ maxWidth: 1300, margin: "auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr",
          gap: isMobile ? 32 : 48,
          marginBottom: isMobile ? 32 : 44,
        }}>
          <div>
            <div style={{ marginBottom: 16 }}>
              {/* The footer is always The Puzzle Project's logo1.png, whichever site you're on */}
              <img src={`${process.env.PUBLIC_URL || ""}/logo1.png`} alt="The Puzzle Project"
                style={{ height: 150, width: "auto", display: "block", marginLeft: -12 }} />
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.75, maxWidth: 320 }}>
              {t.footBlurb}
            </p>
            <div style={{ marginTop: 20, padding: "10px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", display: "inline-block" }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>{t.contactPerson}</p>
              <p style={{ fontSize: 12, fontWeight: 600 }}>
                <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: COLORS.teal, textDecoration: "none" }}>{CONTACT_EMAIL}</a>
              </p>
              <p style={{ fontSize: 12 }}>
                <a href="tel:+27825574713" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>+27 82 557 4713</a>
              </p>
            </div>
          </div>
          {columns.map(col => (
            <div key={col.heading}>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: 16 }}>
                {col.heading}
              </p>
              {col.links.map(l => {
                const linkStyle = { display: "block", fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 10, cursor: "pointer", transition: "color 0.15s", background: "none", border: "none", padding: 0, textAlign: "left", fontFamily: "inherit", textDecoration: "none" };
                const hover = {
                  onMouseEnter: e => { e.currentTarget.style.color = ON_DARK; },
                  onMouseLeave: e => { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; },
                  onFocus: e => { e.currentTarget.style.color = ON_DARK; },
                  onBlur: e => { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; },
                };
                // Real links/buttons (keyboard + screen-reader friendly), not clickable divs.
                return l.href
                  ? <a key={l.label} href={l.href} style={linkStyle} {...hover}>{l.label}</a>
                  : <button key={l.label} type="button" onClick={l.action} style={linkStyle} {...hover}>{l.label}</button>;
              })}
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)" }}>©️ 2026 {brand.key === "tpp" ? "The Puzzle Project" : `${brand.name} · The Puzzle Project`}. {t.rights}</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)" }}>{t.ip}</p>
        </div>
      </div>
    </footer>
  );
}

// Shared closing call-to-action used at the foot of every page.
// Sponsor feedback: the "Start Training" button was removed — training is now
// reached from the Puzzle Box site (nav / login), so only "Contact Us" remains.
// (Contact Us used to open the login screen; it now opens an email to the
// project contact shown in the footer.)
export const CONTACT_EMAIL = "gary@picturetree.co.za";

export function CallToAction() {
  const isMobile = useIsMobile(640);
  const t = useT();
  return (
    <section style={{ padding: isMobile ? "56px 22px" : "90px 40px", background: `linear-gradient(135deg, ${COLORS.dark} 0%, #2A1040 100%)`, position: "relative", overflow: "hidden" }}>
      <PuzzlePiece size={90} color={COLORS.teal} rotate={15} fillOpacity={0.25} style={{ position: "absolute", top: -30, left: -20 }} />
      <PuzzlePiece size={70} color={COLORS.pink} rotate={-20} fillOpacity={0.25} style={{ position: "absolute", bottom: -20, right: -10 }} />
      <div style={{ maxWidth: 760, margin: "auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        <h2 style={{ fontFamily: FONTS.heading, fontSize: "clamp(26px, 3.2vw, 42px)", color: ON_DARK, marginBottom: 20, fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
          {t.ctaTitle}
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(255,255,255,0.62)", maxWidth: 620, margin: "0 auto 36px" }}>
          {t.ctaBody}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
          <button onClick={() => { window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Enquiry — The Puzzle Project")}`; }} style={{
            padding: "14px 32px", background: COLORS.teal, color: ON_DARK,
            border: "none", borderRadius: 12, cursor: "pointer",
            fontWeight: 800, fontSize: 15, fontFamily: "inherit", transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = COLORS.tealDark; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = COLORS.teal; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {t.contactUs}
          </button>
        </div>
      </div>
    </section>
  );
}

// ---- Shared warm look for public pages (home, about, how it works) -------
export const CREAM = "var(--cream, #FFFFFF)";
export const WARM_YELLOW = "#FFD27A";

// Fades a block up the first time it scrolls into view
export function Reveal({ children, delay = 0, style = {} }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(28px)",
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  );
}

// Centred header for inner public pages, with the hand-drawn underline
// used on the home page hero. `highlight` is the word that gets underlined.
export function PageHero({ eyebrow, title, highlight, lead }) {
  const isMobile = useIsMobile(760);
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 100); return () => clearTimeout(t); }, []);
  const rise = (d = 0) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(16px)",
    transition: `opacity 0.7s ease ${d}s, transform 0.7s ease ${d}s`,
  });

  return (
    <section style={{ background: CREAM, paddingTop: 120, position: "relative", overflow: "hidden" }}>
      <PuzzlePiece size={isMobile ? 90 : 140} color={COLORS.pink} rotate={-16} style={{ position: "absolute", top: 110, left: isMobile ? -40 : -30 }} />
      <PuzzlePiece size={isMobile ? 70 : 110} color={COLORS.teal} rotate={20} style={{ position: "absolute", bottom: -30, right: isMobile ? -25 : 40 }} />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "56px 22px 70px" : "80px 40px 100px", textAlign: "center", position: "relative" }}>
        {eyebrow && (
          <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: COLORS.teal, marginBottom: 16, ...rise(0.05) }}>
            {eyebrow}
          </p>
        )}
        <h1 style={{
          fontFamily: FONTS.heading, fontWeight: 900, color: COLORS.ink,
          fontSize: "clamp(36px, 5.4vw, 66px)", lineHeight: 1.06, letterSpacing: "-0.03em",
          marginBottom: 22, position: "relative", zIndex: 0, ...rise(0.15),
        }}>
          {title}{highlight && " "}
          {highlight && (
            <span style={{ position: "relative", whiteSpace: "nowrap" }}>
              {highlight}
              <svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true"
                style={{ position: "absolute", left: 0, bottom: "-0.1em", width: "100%", height: "0.28em", overflow: "visible", zIndex: -1 }}>
                <path d="M3 13 C 40 4, 90 18, 130 9 S 185 6, 197 11" fill="none" stroke={WARM_YELLOW} strokeWidth="7" strokeLinecap="round" className="scribble" />
              </svg>
            </span>
          )}
        </h1>
        {lead && (
          <p style={{ fontSize: "clamp(15px, 1.5vw, 18px)", color: COLORS.inkMid, lineHeight: 1.75, maxWidth: 680, margin: "0 auto", ...rise(0.3) }}>
            {lead}
          </p>
        )}
      </div>
    </section>
  );
}

// Hover/animation classes shared by the warm public pages
export const WARM_PAGE_CSS = `
  @keyframes draw-scribble { from { stroke-dashoffset: 260; } to { stroke-dashoffset: 0; } }
  .scribble { stroke-dasharray: 260; stroke-dashoffset: 260; animation: draw-scribble 0.9s ease 0.7s forwards; }
  .soft-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
  .soft-card:hover { transform: translateY(-6px); box-shadow: 0 18px 40px rgba(60,40,20,0.10); }
  .wiggle { transition: transform 0.3s ease; }
  .wiggle:hover { transform: rotate(-6deg) scale(1.06); }
  @media (prefers-reduced-motion: reduce) {
    .scribble { animation: none; stroke-dashoffset: 0; }
    .soft-card:hover, .wiggle:hover { transform: none; }
  }
`;

// Small pause/play control for a looping decorative video (WCAG 2.2.2).
// Put it inside the same positioned container as the <video>; it finds the
// video itself, so no ref is needed.
export function VideoPauseButton({ style = {} }) {
  const [paused, setPaused] = useState(false);
  const t = useT();
  return (
    <button
      type="button"
      aria-label={paused ? t.playVideo : t.pauseVideo}
      onClick={(e) => {
        const v = e.currentTarget.parentElement?.querySelector("video");
        if (!v) return;
        if (v.paused) { v.play(); setPaused(false); } else { v.pause(); setPaused(true); }
      }}
      style={{
        position: "absolute", right: 14, bottom: 14, zIndex: 3,
        width: 38, height: 38, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.7)",
        background: "rgba(0,0,0,0.45)", color: "#fff", cursor: "pointer", fontSize: 14,
        display: "flex", alignItems: "center", justifyContent: "center", ...style,
      }}
    >
      {paused ? "▶" : "❚❚"}
    </button>
  );
}