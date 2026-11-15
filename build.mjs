// Builds the website from site/site.json into out/: plain HTML and CSS, no JavaScript, ready for
// any hosting.   npm run build    (set SITE_URL=https://yourdomain.com for the sitemap)
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

export const FORMAT = "statio-open-website/1";

/** Words used when site.json has none (English). site.json brings them in the website's language. */
const WORDS = {
  skip: "Skip to content",
  call: "Call",
  whatsapp: "WhatsApp",
  email: "Email",
  directions: "Get directions",
  team: "Our team",
  about: "About us",
  aboutMe: "About me",
  gallery: "Our work",
  galleryMe: "My work",
  faq: "Questions",
  hours: "Opening hours",
  contact: "Contact",
  taxId: "Tax ID",
  weComeTo: "We come to you",
  menu: "Menu",
  menuClose: "Close",
};

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
/** Only web, phone and mail links; anything else (javascript: …) is dropped. */
const href = (v) => (typeof v === "string" && /^(https?:\/\/|mailto:|tel:)/i.test(v.trim()) ? v.trim() : null);
/** A photo from the photos folder, or a web address. */
const photo = (v) => (typeof v === "string" && (/^photos\/[\w.-]+$/.test(v) || /^https:\/\//.test(v)) ? v : null);
const text = (v, max = 5000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v) => (Array.isArray(v) ? v : []);
const paragraphs = (v) => text(v).split(/\n\s*\n/).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");

/** site.json as the page needs it: every field checked, unknown ones ignored. */
export function readSite(raw) {
  if (!raw || typeof raw !== "object") throw new Error("site.json is not valid.");
  if (raw.format !== FORMAT) throw new Error(`site.json is "${raw.format}"; this version reads "${FORMAT}".`);
  if (!text(raw.name)) throw new Error("site.json needs a name.");
  const phone = typeof raw.phone === "string" && /^\+\d{6,15}$/.test(raw.phone) ? raw.phone : null;
  return {
    locale: typeof raw.locale === "string" && /^[a-z]{2}(-[A-Z]{2})?$/.test(raw.locale) ? raw.locale : "en",
    name: text(raw.name, 120),
    tagline: text(raw.tagline, 200),
    about: text(raw.about),
    solo: raw.solo === true,
    logo: photo(raw.logo),
    photo: photo(raw.photo),
    gallery: list(raw.gallery).map((g) => ({ src: photo(g?.src), caption: text(g?.caption, 200) })).filter((g) => g.src).slice(0, 40),
    team: list(raw.team).map((m) => ({ name: text(m?.name, 80), title: text(m?.title, 80), photo: photo(m?.photo) })).filter((m) => m.name).slice(0, 40),
    hours: list(raw.hours).map((h) => ({ days: text(h?.days, 60), hours: text(h?.hours, 60) })).filter((h) => h.days),
    address: text(raw.address, 300),
    mapsUrl: href(raw.mapsUrl),
    serviceArea: text(raw.serviceArea, 200),
    phone,
    phoneDisplay: text(raw.phoneDisplay, 40) || phone,
    whatsapp: raw.whatsapp === true && !!phone,
    email: typeof raw.email === "string" && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(raw.email) ? raw.email : null,
    links: list(raw.links).map((l) => ({ label: text(l?.label, 40), url: href(l?.url) })).filter((l) => l.label && l.url),
    faq: list(raw.faq).map((f) => ({ q: text(f?.q, 300), a: text(f?.a, 3000) })).filter((f) => f.q && f.a),
    legalName: text(raw.legalName, 200),
    taxId: text(raw.taxId, 40),
    words: { ...WORDS, ...Object.fromEntries(Object.entries(raw.words ?? {}).filter(([k, v]) => k in WORDS && typeof v === "string" && v.trim())) },
  };
}

/** Minimalist, in Snow: white page, near-black text, light grey panels, one typeface. */
const CSS = `@font-face{font-family:Manrope;src:url(manrope-latin.woff2) format("woff2");font-weight:200 800;font-display:swap}
:root{--bg:#fff;--surface:#f5f5f4;--text:#141414;--muted:#595959;--line:#e4e4e2;--accent:#141414;--r:4px;color-scheme:light}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--bg);color:var(--text);font:400 17px/1.6 Manrope,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
img{max-width:100%;height:auto;display:block}
a{color:inherit;text-underline-offset:3px}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.skip{position:absolute;left:-9999px;top:8px;background:var(--text);color:var(--bg);padding:10px 14px;border-radius:var(--r);z-index:9}.skip:focus{left:8px}
.wrap{width:100%;max-width:1080px;margin:0 auto;padding:0 20px}
header.top{border-bottom:1px solid var(--line);position:sticky;top:0;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(8px);z-index:5}
header.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:64px}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;text-decoration:none;letter-spacing:-.02em}.brand img{height:36px;width:auto}
nav ul{display:flex;gap:20px;list-style:none;margin:0;padding:0}nav a{text-decoration:none;color:var(--muted);font-size:15px}nav a:hover{color:var(--text)}
details.menu{display:none}
@media (max-width:760px){nav.full{display:none}details.menu{display:block;position:relative}details.menu summary{list-style:none;cursor:pointer;padding:10px 0;font-weight:600}details.menu summary::-webkit-details-marker{display:none}details.menu ul{position:absolute;right:0;top:44px;display:grid;gap:4px;min-width:200px;background:var(--bg);border:1px solid var(--line);border-radius:var(--r);padding:8px;list-style:none;margin:0}details.menu a{display:block;padding:10px 12px;text-decoration:none}}
h1,h2,h3{font-weight:600;letter-spacing:-.03em;line-height:1.15;margin:0}
h1{font-size:clamp(36px,7vw,64px)}h2{font-size:clamp(26px,4vw,36px);margin-bottom:24px}h3{font-size:18px;letter-spacing:-.01em}
.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:13px;color:var(--muted);font-weight:600}
section{padding:64px 0;border-bottom:1px solid var(--line)}section.tint{background:var(--surface)}
.hero{padding:72px 0 56px}.hero p.tag{font-size:clamp(18px,2.4vw,22px);color:var(--muted);max-width:40ch;margin:16px 0 0}
.hero .photo{margin-top:40px;border-radius:var(--r);overflow:hidden;aspect-ratio:16/9;background:var(--surface)}.hero .photo img{width:100%;height:100%;object-fit:cover}
.btns{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 20px;border-radius:var(--r);background:var(--accent);color:var(--bg);font-weight:600;text-decoration:none}
.btn.ghost{background:transparent;color:var(--text);border:1px solid var(--text)}
.prose{max-width:65ch}.prose p{margin:0 0 1em}
.grid{display:grid;gap:16px;grid-template-columns:repeat(2,minmax(0,1fr));list-style:none;margin:0;padding:0}
@media (min-width:760px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}.grid.team{grid-template-columns:repeat(4,minmax(0,1fr))}}
figure{margin:0}.gallery img{aspect-ratio:1;object-fit:cover;border-radius:var(--r);width:100%}figcaption{font-size:14px;color:var(--muted);margin-top:8px}
.tint .person .pic{background:var(--bg)}.person .pic{aspect-ratio:4/5;border-radius:var(--r);overflow:hidden;background:var(--surface);display:grid;place-items:center;font-size:32px;font-weight:600;color:var(--muted)}.person .pic img{width:100%;height:100%;object-fit:cover}
.person h3{margin-top:12px}.person p{margin:2px 0 0;color:var(--muted);font-size:15px}
.cols{display:grid;gap:40px}@media (min-width:760px){.cols{grid-template-columns:1fr 1fr}}
dl.hours{display:grid;grid-template-columns:auto 1fr;gap:8px 24px;margin:0}dl.hours dt{color:var(--muted)}dl.hours dd{margin:0;font-weight:500}
.faq details{border-top:1px solid var(--line);padding:16px 0}.faq details:last-child{border-bottom:1px solid var(--line)}.faq summary{cursor:pointer;font-weight:600}.faq details p{margin:12px 0 0;color:var(--muted)}
ul.links{display:flex;flex-wrap:wrap;gap:16px;list-style:none;padding:0;margin:24px 0 0}
footer{padding:32px 0;color:var(--muted);font-size:14px}footer p{margin:4px 0}`;

/** The whole page. */
export function renderPage(s) {
  const w = s.words;
  const located = s.address || s.serviceArea;
  const sections = [
    s.about && ["about", s.solo ? w.aboutMe : w.about],
    s.gallery.length && ["work", s.solo ? w.galleryMe : w.gallery],
    s.team.length && !s.solo && ["team", w.team],
    (s.hours.length || located) && ["hours", w.hours],
    s.faq.length && ["faq", w.faq],
    ["contact", w.contact],
  ].filter(Boolean);
  const nav = sections.map(([id, label]) => `<li><a href="#${id}">${esc(label)}</a></li>`).join("");
  const tel = s.phone ? `tel:${s.phone}` : null;
  const wa = s.whatsapp ? `https://wa.me/${s.phone.replace(/\D/g, "")}` : null;
  const buttons = [
    tel && `<a class="btn" href="${esc(tel)}">${esc(w.call)}</a>`,
    wa && `<a class="btn ghost" href="${esc(wa)}" rel="noopener">${esc(w.whatsapp)}</a>`,
    s.email && `<a class="btn ghost" href="mailto:${esc(s.email)}">${esc(w.email)}</a>`,
  ].filter(Boolean).join("");
  let band = 0;
  const open = (id, title) => `<section id="${id}"${band++ % 2 ? ' class="tint"' : ""} aria-labelledby="${id}-h"><div class="wrap"><h2 id="${id}-h">${esc(title)}</h2>`;
  const close = "</div></section>";
  const body = [
    s.about && `${open("about", s.solo ? w.aboutMe : w.about)}<div class="prose">${paragraphs(s.about)}</div>${close}`,
    s.gallery.length && `${open("work", s.solo ? w.galleryMe : w.gallery)}<ul class="grid gallery">${s.gallery.map((g) => `<li><figure><img src="${esc(g.src)}" alt="${esc(g.caption)}" loading="lazy" decoding="async">${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ""}</figure></li>`).join("")}</ul>${close}`,
    s.team.length && !s.solo && `${open("team", w.team)}<ul class="grid team">${s.team.map((m) => `<li class="person"><div class="pic">${m.photo ? `<img src="${esc(m.photo)}" alt="" loading="lazy" decoding="async">` : `<span aria-hidden="true">${esc(m.name.slice(0, 1).toUpperCase())}</span>`}</div><h3>${esc(m.name)}</h3>${m.title ? `<p>${esc(m.title)}</p>` : ""}</li>`).join("")}</ul>${close}`,
    (s.hours.length || located) && `${open("hours", w.hours)}<div class="cols">${s.hours.length ? `<dl class="hours">${s.hours.map((h) => `<dt>${esc(h.days)}</dt><dd>${esc(h.hours)}</dd>`).join("")}</dl>` : ""}<div>${s.address ? `<p>${esc(s.address)}</p>${s.mapsUrl ? `<p><a href="${esc(s.mapsUrl)}" rel="noopener">${esc(w.directions)}</a></p>` : ""}` : s.serviceArea ? `<p class="eyebrow">${esc(w.weComeTo)}</p><p>${esc(s.serviceArea)}</p>` : ""}</div></div>${close}`,
    s.faq.length && `${open("faq", w.faq)}<div class="faq prose">${s.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</div>${close}`,
    `${open("contact", w.contact)}${s.phoneDisplay ? `<p>${esc(s.phoneDisplay)}</p>` : ""}${s.email ? `<p>${esc(s.email)}</p>` : ""}${buttons ? `<div class="btns">${buttons}</div>` : ""}${s.links.length ? `<ul class="links">${s.links.map((l) => `<li><a href="${esc(l.url)}" rel="noopener">${esc(l.label)}</a></li>`).join("")}</ul>` : ""}${close}`,
  ].filter(Boolean).join("\n");
  const description = s.tagline || text(s.about, 160) || s.name;
  return `<!doctype html>
<html lang="${esc(s.locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(s.tagline ? `${s.name} · ${s.tagline}` : s.name)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#ffffff">
<meta property="og:title" content="${esc(s.name)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
${s.photo ? `<meta property="og:image" content="${esc(s.photo)}">\n` : ""}${s.logo ? `<link rel="icon" href="${esc(s.logo)}">\n` : ""}<link rel="preload" href="assets/manrope-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/site.css">
<script type="application/ld+json">${JSON.stringify(jsonLd(s)).replace(/</g, "\\u003c")}</script>
</head>
<body>
<a class="skip" href="#main">${esc(w.skip)}</a>
<header class="top"><div class="wrap">
<a class="brand" href="#main">${s.logo ? `<img src="${esc(s.logo)}" alt="">` : ""}<span>${esc(s.name)}</span></a>
<nav class="full" aria-label="${esc(w.menu)}"><ul>${nav}</ul></nav>
<details class="menu"><summary>${esc(w.menu)}</summary><nav aria-label="${esc(w.menu)}"><ul>${nav}</ul></nav></details>
</div></header>
<main id="main">
<div class="hero"><div class="wrap">
<h1>${esc(s.name)}</h1>
${s.tagline ? `<p class="tag">${esc(s.tagline)}</p>` : ""}
${buttons ? `<div class="btns">${buttons}</div>` : ""}
${s.photo ? `<div class="photo"><img src="${esc(s.photo)}" alt="" fetchpriority="high"></div>` : ""}
</div></div>
${body}
</main>
<footer><div class="wrap">
<p>© ${new Date().getFullYear()} ${esc(s.legalName || s.name)}</p>
${s.taxId ? `<p>${esc(w.taxId)}: ${esc(s.taxId)}</p>` : ""}
</div></footer>
</body>
</html>
`;
}

/** What search engines and AI assistants read about the business (schema.org LocalBusiness). */
function jsonLd(s) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: s.name,
    ...(s.tagline && { description: s.tagline }),
    ...(s.phone && { telephone: s.phone }),
    ...(s.email && { email: s.email }),
    ...(s.address && { address: s.address }),
    ...(s.serviceArea && { areaServed: s.serviceArea }),
    ...(s.links.length && { sameAs: s.links.map((l) => l.url) }),
  };
}

/** Builds site/ into out/. Returns the site as read. */
export function build({ from = "site", to = "out", siteUrl = process.env.SITE_URL } = {}) {
  const file = path.join(from, "site.json");
  if (!existsSync(file)) throw new Error("No website yet. Import your Statio export (npm run import -- website-yourname.zip) or write site/site.json.");
  const site = readSite(JSON.parse(readFileSync(file, "utf8")));
  rmSync(to, { recursive: true, force: true });
  mkdirSync(path.join(to, "assets"), { recursive: true });
  writeFileSync(path.join(to, "index.html"), renderPage(site));
  writeFileSync(path.join(to, "assets/site.css"), CSS);
  const here = path.dirname(new URL(import.meta.url).pathname);
  copyFileSync(path.join(here, "assets/manrope-latin.woff2"), path.join(to, "assets/manrope-latin.woff2"));
  if (existsSync(path.join(from, "photos"))) cpSync(path.join(from, "photos"), path.join(to, "photos"), { recursive: true });
  const base = siteUrl?.replace(/\/$/, "");
  writeFileSync(path.join(to, "robots.txt"), `User-agent: *\nAllow: /\n${base ? `Sitemap: ${base}/sitemap.xml\n` : ""}`);
  if (base) writeFileSync(path.join(to, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${esc(base)}/</loc></url></urlset>\n`);
  return site;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const site = build();
    console.log(`Built "${site.name}" in out/. Put the out folder on any hosting.`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
