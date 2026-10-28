import React, { useState, useEffect } from "react";
import {
  COLORS, FONTS, PUBLIC_FONT_IMPORT, PuzzlePiece, PuzzlePhoto, Navbar, Footer, CallToAction, useIsMobile,
} from "../shared/SiteChrome";
import { supabase } from "../../services/supabaseClient";
import { mapPurchaseRequestRow } from "../../utils/mappers";
import { useLanguage } from "../../theme/LanguageContext";

// ---------------------------------------------------------------------------
// Purchase — "Buy The Puzzle Box Screener"
//
// The sponsor's wireframes add a "Purchase" link to The Puzzle Box navigation
// and a "Buy The Puzzle Box Screener" button for logged-in users, but do not
// sketch the page itself. This is a first version: what the buyer receives and
// how to order. There is still no online payment/checkout — but "Request to
// purchase" is no longer a mailto link. It opens an in-page form that writes
// a row to the new `purchase_requests` table (see migration 013), which then
// shows up on Admin → Purchase Requests for an admin to action: they fill in
// a Product number there and mark the request fulfilled.
//
// `PurchaseContent` is exported so the logged-in "Buy" view (TrainingPortal /
// MemberArea) can show exactly the same content without the public chrome.
// ---------------------------------------------------------------------------

// Shared (non-text) fields; each item's title/desc comes from T[lang].included
const INCLUDED = [
  { key: "kit",      color: COLORS.teal },
  { key: "product",  color: COLORS.pink },
  { key: "platform", color: COLORS.purple },
];

// Page text in English / Afrikaans / isiXhosa (follows the site-wide language)
const T = {
  en: {
    included: {
      kit:      { title: "The physical screener kit", desc: "Everything needed to run the puzzle activity with a child aged 5 to 6." },
      product:  { title: "A unique Product number", desc: "Supplied with every screener. You enter it after logging in to unlock the training modules." },
      platform: { title: "Access to the screening platform", desc: "Once your training is complete and your credentials are verified, you can capture and view screenings online." },
    },
    errRequired: "Please fill in your name, email and organisation / school.",
    errSend: "Something went wrong sending your request — please try again.",
    sentTitle: "Request received",
    sentBody: (first, email) => `Thanks, ${first} — someone from our team will be in touch at ${email} with pricing and your screener's Product number once your order is confirmed.`,
    back: "← Back",
    formTitle: "Request to purchase",
    formLead: "Tell us a bit about your order and we'll follow up with pricing and your screener's Product number.",
    nameLabel: "Your name *",
    emailLabel: "Email *",
    orgLabel: "Organisation / school *",
    phoneLabel: "Contact number",
    countLabel: "Number of screeners",
    messageLabel: "Anything else we should know?",
    optional: "Optional",
    sending: "Sending…",
    send: "Send request",
    readyTitle: "✓ Your order is ready",
    readyBody: "Enter this Product number on your dashboard to unlock training.",
    pending: (date, email) => `● Your request from ${date} is being reviewed — we'll follow up at ${email}.`,
    declined: "Your previous request wasn't able to go ahead. Feel free to send another with more detail, or get in touch.",
    photoLabel: "Screener kit photo",
    photoAlt: "The Puzzle Box Screener kit",
    receiveEyebrow: "What you receive",
    receiveTitle: "One screener, everything you need to get certified",
    price: "Price",
    tbc: "To be confirmed",
    requestAnother: "Request another screener",
    noCheckout: "There is no online checkout yet — tell us what you need and we'll follow up with pricing and a Product number.",
    pageBadge: "Purchase",
    pageTitle: "Buy The Puzzle Box Screener",
    pageLead: "Every screener comes with a Product number. Once you have your screener, log in and use the number to unlock your training.",
  },
  af: {
    included: {
      kit:      { title: "Die fisiese sifterstel", desc: "Alles wat nodig is om die legkaartaktiwiteit met 'n kind van 5 tot 6 jaar te doen." },
      product:  { title: "'n Unieke Produknommer", desc: "Word saam met elke sifter verskaf. Jy voer dit in nadat jy ingeteken het om die opleidingsmodules oop te sluit." },
      platform: { title: "Toegang tot die siftingsplatform", desc: "Sodra jou opleiding voltooi is en jou geloofsbriewe geverifieer is, kan jy siftings aanlyn vaslê en bekyk." },
    },
    errRequired: "Vul asseblief jou naam, e-pos en organisasie / skool in.",
    errSend: "Iets het verkeerd geloop met die stuur van jou versoek — probeer asseblief weer.",
    sentTitle: "Versoek ontvang",
    sentBody: (first, email) => `Dankie, ${first} — iemand van ons span sal by ${email} met jou in verbinding tree oor pryse en jou sifter se Produknommer sodra jou bestelling bevestig is.`,
    back: "← Terug",
    formTitle: "Versoek om te koop",
    formLead: "Vertel ons 'n bietjie van jou bestelling, en ons sal opvolg met pryse en jou sifter se Produknommer.",
    nameLabel: "Jou naam *",
    emailLabel: "E-pos *",
    orgLabel: "Organisasie / skool *",
    phoneLabel: "Kontaknommer",
    countLabel: "Aantal sifters",
    messageLabel: "Is daar nog iets wat ons moet weet?",
    optional: "Opsioneel",
    sending: "Stuur tans…",
    send: "Stuur versoek",
    readyTitle: "✓ Jou bestelling is gereed",
    readyBody: "Voer hierdie Produknommer op jou paneelbord in om die opleiding oop te sluit.",
    pending: (date, email) => `● Jou versoek van ${date} word hersien — ons sal by ${email} opvolg.`,
    declined: "Jou vorige versoek kon nie deurgaan nie. Stuur gerus nog een met meer besonderhede, of kontak ons.",
    photoLabel: "Foto van die sifterstel",
    photoAlt: "Die Puzzle Box-sifterstel",
    receiveEyebrow: "Wat jy ontvang",
    receiveTitle: "Een sifter, alles wat jy nodig het om gesertifiseer te word",
    price: "Prys",
    tbc: "Nog te bevestig",
    requestAnother: "Versoek nog 'n sifter",
    noCheckout: "Daar is nog nie 'n aanlyn betaalpunt nie — sê vir ons wat jy nodig het, en ons sal opvolg met pryse en 'n Produknommer.",
    pageBadge: "Koop",
    pageTitle: "Koop die Puzzle Box-sifter",
    pageLead: "Elke sifter kom met 'n Produknommer. Sodra jy jou sifter het, teken in en gebruik die nommer om jou opleiding oop te sluit.",
  },
  xh: {
    included: {
      kit:      { title: "Ikhithi yesixhobo sokuhlola", desc: "Yonke into efunekayo ukuqhuba umsebenzi wephazili nomntwana oneminyaka emi-5 ukuya kwemi-6." },
      product:  { title: "Inombolo yeMveliso ekhethekileyo", desc: "Inikwa nesixhobo ngasinye sokuhlola. Uyifaka emva kokungena ukuze uvule iimodyuli zoqeqesho." },
      platform: { title: "Ukufikelela kwiqonga lokuhlola", desc: "Xa ugqibile uqeqesho lwakho kwaye iziqinisekiso zakho zobungcali ziqinisekisiwe, ungabhala uze ujonge uhlolo kwi-intanethi." },
    },
    errRequired: "Nceda ubhale igama lakho, i-imeyile nombutho / isikolo.",
    errSend: "Kukho into engahambanga kakuhle xa bekuthunyelwa isicelo sakho — nceda uzame kwakhona.",
    sentTitle: "Isicelo sifunyenwe",
    sentBody: (first, email) => `Enkosi, ${first} — omnye weqela lethu uya kuqhagamshelana nawe ku-${email} malunga namaxabiso nenombolo yeMveliso yesixhobo sakho sokuhlola xa i-odolo yakho iqinisekisiwe.`,
    back: "← Buyela umva",
    formTitle: "Isicelo sokuthenga",
    formLead: "Sixelele kancinci nge-odolo yakho, kwaye siza kukubuyela ngamaxabiso nenombolo yeMveliso yesixhobo sakho sokuhlola.",
    nameLabel: "Igama lakho *",
    emailLabel: "I-imeyile *",
    orgLabel: "Umbutho / isikolo *",
    phoneLabel: "Inombolo yomnxeba",
    countLabel: "Inani lezixhobo zokuhlola",
    messageLabel: "Ingaba kukho enye into ekufuneka siyazi?",
    optional: "Akunyanzelekanga",
    sending: "Iyathumela…",
    send: "Thumela isicelo",
    readyTitle: "✓ I-odolo yakho ilungile",
    readyBody: "Faka le nombolo yeMveliso kwiphini lakho ukuze uvule uqeqesho.",
    pending: (date, email) => `● Isicelo sakho sango-${date} siyaphononongwa — siza kukubuyela ku-${email}.`,
    declined: "Isicelo sakho sangaphambili asikwazanga ukuqhubeka. Ungathumela esinye esineenkcukacha ezingakumbi, okanye uqhagamshelane nathi.",
    photoLabel: "Umfanekiso wekhithi yokuhlola",
    photoAlt: "Ikhithi yesixhobo sokuhlola se-Puzzle Box",
    receiveEyebrow: "Into oyifumanayo",
    receiveTitle: "Isixhobo sokuhlola esinye, yonke into oyidingayo ukuze ufumane isatifikethi",
    price: "Ixabiso",
    tbc: "Liza kuqinisekiswa",
    requestAnother: "Cela esinye isixhobo sokuhlola",
    noCheckout: "Akukabikho ndlela yokuhlawula kwi-intanethi okwangoku — sixelele into oyidingayo, kwaye siza kukubuyela ngamaxabiso nenombolo yeMveliso.",
    pageBadge: "Thenga",
    pageTitle: "Thenga isixhobo sokuhlola se-Puzzle Box",
    pageLead: "Isixhobo ngasinye sokuhlola siza nenombolo yeMveliso. Xa sele unesixhobo sakho, ngena uze usebenzise inombolo ukuvula uqeqesho lwakho.",
  },
};

const EMPTY_FORM = { name: "", email: "", organisation: "", phone: "", numberOfScreeners: "", message: "" };

// Shared text-input styling so the form matches the rest of the public site
// (same radius/border tokens as the cards above it) without a new stylesheet.
const fieldStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  border: `1.5px solid ${COLORS.border}`, background: COLORS.surface,
  fontFamily: "inherit", fontSize: 14, color: COLORS.ink,
};
const labelStyle = { display: "block", fontSize: 12.5, fontWeight: 800, color: COLORS.inkMid, marginBottom: 6 };

export function PurchaseContent({ user }) {
  const isMobile = useIsMobile(860);
  const { lang } = useLanguage();
  const t = T[lang] || T.en;
  // "info" = the what-you-get panel with the CTA · "form" = the request
  // form · "sent" = confirmation after a successful submit.
  const [view, setView] = useState("info");
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    name: user?.displayName || "",
    email: user?.email || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Only meaningful for a logged-in user (MemberArea passes `user`; the
  // public page doesn't). Once an admin fulfils their purchase request, the
  // Product number shows up right here — no email step needed to get it.
  const [myLatestRequest, setMyLatestRequest] = useState(null);

  useEffect(() => {
    if (!user?.email) return;
    let isMounted = true;

    const loadMyRequest = async () => {
      const { data, error: loadErr } = await supabase
        .from("purchase_requests")
        .select("*")
        .eq("email", user.email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (loadErr) {
        console.error("Error loading purchase request status:", loadErr.message);
        return;
      }
      if (isMounted) setMyLatestRequest(data ? mapPurchaseRequestRow(data) : null);
    };

    loadMyRequest();

    const channel = supabase
      .channel(`my-purchase-request-${user.email}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "purchase_requests", filter: `email=eq.${user.email}` },
        () => loadMyRequest()
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.email]);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.organisation.trim()) {
      setError("errRequired");
      return;
    }

    setSubmitting(true);
    const { error: insertErr } = await supabase.from("purchase_requests").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      organisation: form.organisation.trim(),
      phone: form.phone.trim() || null,
      number_of_screeners: form.numberOfScreeners ? parseInt(form.numberOfScreeners, 10) : null,
      message: form.message.trim() || null,
    });
    setSubmitting(false);

    if (insertErr) {
      console.error("Error submitting purchase request:", insertErr.message);
      setError("errSend");
      return;
    }

    setView("sent");
  };

  if (view === "sent") {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", padding: isMobile ? "20px 0" : "40px 0" }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", background: COLORS.tealLight, color: COLORS.teal,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 20px",
        }}>
          ✓
        </div>
        <h2 style={{ fontFamily: FONTS.heading, fontSize: "clamp(22px, 2.8vw, 30px)", fontWeight: 900, color: COLORS.ink, marginBottom: 12 }}>
          {t.sentTitle}
        </h2>
        <p style={{ fontSize: 15, color: COLORS.inkMid, lineHeight: 1.75, marginBottom: 24 }}>
          {t.sentBody(form.name.split(" ")[0], form.email)}
        </p>
        <button onClick={() => { setForm({ ...EMPTY_FORM, name: user?.displayName || "", email: user?.email || "" }); setView("info"); }} style={{
          background: "none", border: `1.5px solid ${COLORS.border}`, borderRadius: 10,
          padding: "10px 20px", fontWeight: 800, fontSize: 13.5, color: COLORS.ink, cursor: "pointer", fontFamily: "inherit",
        }}>
          {t.back}
        </button>
      </div>
    );
  }

  if (view === "form") {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <button onClick={() => setView("info")} style={{
          background: "none", border: "none", padding: 0, marginBottom: 18, cursor: "pointer",
          fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: COLORS.inkMid,
        }}>
          {t.back}
        </button>
        <h2 style={{ fontFamily: FONTS.heading, fontSize: "clamp(22px, 2.8vw, 30px)", fontWeight: 900, color: COLORS.ink, marginBottom: 8 }}>
          {t.formTitle}
        </h2>
        <p style={{ fontSize: 14, color: COLORS.inkMid, lineHeight: 1.65, marginBottom: 24 }}>
          {t.formLead}
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <div>
            <label htmlFor="pbp-name" style={labelStyle}>{t.nameLabel}</label>
            <input style={fieldStyle} value={form.name} onChange={setField("name")} id="pbp-name" placeholder="Jane Dlamini" />
          </div>
          <div>
            <label htmlFor="pbp-email" style={labelStyle}>{t.emailLabel}</label>
            <input type="email" style={fieldStyle} value={form.email} onChange={setField("email")} id="pbp-email" placeholder="jane@school.org" />
          </div>
          <div>
            <label htmlFor="pbp-org" style={labelStyle}>{t.orgLabel}</label>
            <input style={fieldStyle} value={form.organisation} onChange={setField("organisation")} id="pbp-org" placeholder="Sunshine Preschool" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
            <div>
              <label htmlFor="pbp-phone" style={labelStyle}>{t.phoneLabel}</label>
              <input style={fieldStyle} value={form.phone} onChange={setField("phone")} id="pbp-phone" placeholder="082 000 0000" />
            </div>
            <div>
              <label htmlFor="pbp-count" style={labelStyle}>{t.countLabel}</label>
              <input type="number" min="1" style={fieldStyle} value={form.numberOfScreeners} onChange={setField("numberOfScreeners")} id="pbp-count" placeholder="1" />
            </div>
          </div>
          <div>
            <label htmlFor="pbp-message" style={labelStyle}>{t.messageLabel}</label>
            <textarea rows={3} style={{ ...fieldStyle, resize: "vertical" }} value={form.message} onChange={setField("message")} id="pbp-message" placeholder={t.optional} />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: COLORS.pink, background: COLORS.pinkLight, borderRadius: 10, padding: "10px 14px" }}>
              {t[error] || error}
            </div>
          )}

          <button type="submit" disabled={submitting} style={{
            display: "inline-block", padding: "14px 32px", borderRadius: 12, border: "none",
            background: COLORS.teal, color: COLORS.white, fontWeight: 800, fontSize: 15, fontFamily: "inherit",
            cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1,
            boxShadow: "0 6px 20px rgba(0,155,141,0.25)", justifySelf: "start",
          }}>
            {submitting ? t.sending : t.send}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto" }}>
      {myLatestRequest?.status === "fulfilled" && (
        <div style={{
          padding: "20px 24px", borderRadius: 16, marginBottom: 28,
          background: COLORS.tealLight, border: `1px solid ${COLORS.border}`,
          display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, justifyContent: "space-between",
        }}>
          <div>
            <p style={{ fontSize: 11.5, fontWeight: 800, color: COLORS.teal, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              {t.readyTitle}
            </p>
            <p style={{ fontSize: 13.5, color: COLORS.inkMid }}>{t.readyBody}</p>
          </div>
          <div style={{
            fontFamily: "monospace", fontWeight: 800, fontSize: 18, letterSpacing: "0.04em",
            color: COLORS.ink, background: COLORS.white, padding: "10px 18px", borderRadius: 10,
            border: `1.5px solid ${COLORS.teal}`,
          }}>
            {myLatestRequest.productNumber}
          </div>
        </div>
      )}

      {myLatestRequest && myLatestRequest.status !== "fulfilled" && myLatestRequest.status !== "declined" && (
        <div style={{
          padding: "16px 20px", borderRadius: 14, marginBottom: 28,
          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
        }}>
          <p style={{ fontSize: 13.5, color: COLORS.inkMid, fontWeight: 700 }}>
            {t.pending(new Date(myLatestRequest.createdAt).toLocaleDateString(), myLatestRequest.email)}
          </p>
        </div>
      )}

      {myLatestRequest?.status === "declined" && (
        <div style={{
          padding: "16px 20px", borderRadius: 14, marginBottom: 28,
          background: COLORS.pinkLight, border: `1px solid ${COLORS.border}`,
        }}>
          <p style={{ fontSize: 13.5, color: COLORS.ink, fontWeight: 700 }}>
            {t.declined}
          </p>
        </div>
      )}

      <div style={{
        display: "grid", gridTemplateColumns: isMobile ? "1fr" : "0.9fr 1.1fr",
        gap: isMobile ? 32 : 56, alignItems: "center",
      }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <PuzzlePhoto
            size={isMobile ? 240 : 320}
            label={t.photoLabel}
            alt={t.photoAlt}
            color={COLORS.teal}
            edges={{ top: 0, right: 1, bottom: 1, left: 0 }}
            style={{ filter: "drop-shadow(0 14px 34px rgba(0,0,0,0.12))" }}
            /* src="/images/puzzle-box-kit.jpg" */
          />
        </div>

        <div>
          <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.teal, marginBottom: 12 }}>
            {t.receiveEyebrow}
          </p>
          <h2 style={{ fontFamily: FONTS.heading, fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 900, color: COLORS.ink, lineHeight: 1.12, letterSpacing: "-0.02em", marginBottom: 20 }}>
            {t.receiveTitle}
          </h2>
          <div style={{ display: "grid", gap: 14, marginBottom: 28 }}>
            {INCLUDED.map(inc => ({ ...inc, ...t.included[inc.key] })).map(item => (
              <div key={item.key} style={{
                padding: "16px 18px", borderRadius: 14, background: COLORS.white,
                border: `1px solid ${COLORS.border}`, borderLeft: `4px solid ${item.color}`,
              }}>
                <h3 style={{ fontFamily: FONTS.heading, fontSize: 15.5, fontWeight: 900, color: COLORS.ink, marginBottom: 4 }}>{item.title}</h3>
                <p style={{ fontSize: 13.5, color: COLORS.inkMid, lineHeight: 1.65 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div style={{
            padding: "18px 20px", borderRadius: 14, marginBottom: 22,
            background: `linear-gradient(135deg, ${COLORS.tealLight}, ${COLORS.purpleLight})`,
            border: `1px solid ${COLORS.border}`,
          }}>
            <p style={{ fontSize: 11.5, fontWeight: 800, color: COLORS.teal, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{t.price}</p>
            <p style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 900, color: COLORS.ink }}>{t.tbc}</p>
          </div>

          <button onClick={() => setView("form")} style={{
            display: "inline-block", padding: "14px 32px", borderRadius: 12, border: "none",
            background: COLORS.teal, color: COLORS.white,
            fontWeight: 800, fontSize: 15, fontFamily: "inherit", cursor: "pointer",
            boxShadow: "0 6px 20px rgba(0,155,141,0.25)",
          }}>
            {myLatestRequest ? t.requestAnother : t.formTitle}
          </button>
          <p style={{ fontSize: 12.5, color: COLORS.inkFaint, marginTop: 12, lineHeight: 1.6 }}>
            {t.noCheckout}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PuzzleBoxPurchase({ onNavigate, onNavigateToLogin }) {
  const go = onNavigate || (() => console.warn("No onNavigate handler passed to PuzzleBoxPurchase"));
  const isMobile = useIsMobile(640);
  const { lang } = useLanguage();
  const t = T[lang] || T.en;

  return (
    <div style={{ fontFamily: FONTS.body }}>
      <style>{PUBLIC_FONT_IMPORT}</style>
      <Navbar site="pb" current="pb-purchase" onNavigate={go} onLoginClick={() => onNavigateToLogin()} />

      <section style={{
        paddingTop: 84,
        background: `linear-gradient(180deg, ${COLORS.white} 0%, ${COLORS.surface} 100%)`,
        position: "relative", overflow: "hidden",
      }}>
        <PuzzlePiece size={150} color={COLORS.pink} rotate={12} style={{ position: "absolute", top: 50, right: -40 }} />
        <div style={{ maxWidth: 1300, margin: "0 auto", padding: isMobile ? "48px 20px 40px" : "72px 40px 56px", position: "relative" }}>
          <span style={{
            display: "inline-block", padding: "7px 16px", borderRadius: 20,
            background: COLORS.tealLight, border: `1px solid rgba(0,155,141,0.25)`,
            fontSize: 12, fontWeight: 800, color: COLORS.teal, marginBottom: 24,
          }}>
            {t.pageBadge}
          </span>
          <h1 style={{
            fontFamily: FONTS.heading, fontSize: "clamp(34px, 4.4vw, 56px)",
            fontWeight: 900, color: COLORS.ink, lineHeight: 1.08, letterSpacing: "-0.03em", marginBottom: 20,
          }}>
            {t.pageTitle}
          </h1>
          <p style={{ fontSize: 17, color: COLORS.inkMid, lineHeight: 1.75, maxWidth: 680 }}>
            {t.pageLead}
          </p>
        </div>
      </section>

      <section style={{ padding: isMobile ? "48px 20px 64px" : "72px 40px 96px", background: COLORS.surface }}>
        <PurchaseContent />
      </section>

      <CallToAction />
      <Footer site="pb" onNavigate={go} onLoginClick={() => onNavigateToLogin()} />
    </div>
  );
}