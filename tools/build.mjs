// Génère tout le site statique, en français et en anglais : node tools/build.mjs
// À lancer après chaque nouvelle édition (après tools/validate.mjs).
// Une seule adresse de base : site.json → "url". Tout le reste est relatif.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const readJ = (p, d) => { try { return JSON.parse(rd(p)); } catch (_) { return d; } };
const wr = (p, s) => { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), s); };
const I18N = require('../assets/js/i18n.js');
const site = readJ('site.json', {});
const countries = readJ('data/countries.json', {});
const gov = readJ('data/gov.json', {});
const abs = (site.url || '').replace(/\/$/, '');
const NOW = Date.now();
// Comptes externes : tant qu'un champ est vide dans site.json, la fonction correspondante n'apparaît pas.
const GC = /^[a-z0-9-]{2,40}$/.test(site.goatcounter || '') ? site.goatcounter : '';
const REPO = site.repo || 'charly4perrin-jpg/Diurna';
const BD = /^[A-Za-z0-9_-]{2,40}$/.test(site.buttondown || '') ? site.buttondown : '';
const SPONSOR = site.sponsor && site.sponsor.enabled && site.sponsor.name ? site.sponsor : null;
const FB = /^[A-Za-z0-9]{3,20}$/.test(site.tally || '') ? `tally:${site.tally}` : /^[^@\s"<>]+@[^@\s"<>]+\.[a-z]{2,}$/i.test(site.contact || '') ? `mail:${site.contact}` : '';

const LANGS = ['fr', 'en'];
const OTHER = { fr: 'en', en: 'fr' };
const PRE = { fr: '', en: 'en/' };
const FIXED = {
  fr: { home: '', globe: 'globe/', archives: 'archives/', method: 'methode/', status: 'status/', search: 'recherche/', about: 'a-propos/', legal: 'mentions-legales/', privacy: 'confidentialite/', credits: 'credits/', corrections: 'corrections/' },
  en: { home: 'en/', globe: 'en/edition/', archives: 'en/archives/', method: 'en/method/', status: 'en/status/', search: 'en/search/', about: 'en/about/', legal: 'en/legal/', privacy: 'en/privacy/', credits: 'en/credits/', corrections: 'en/corrections/' }
};
const rootRelOf = (p) => '../'.repeat(p.split('/').filter(Boolean).length);
const dataOf = (lang, p) => (lang === 'en' ? `data/en/${p}` : `data/${p}`);
const datePath = (lang, d) => `${PRE[lang]}${d.replace(/-/g, '/')}/`;
const storyPath = (lang, d, slug) => `${datePath(lang, d)}${slug}/`;
const countriesIndex = (lang) => (lang === 'en' ? 'en/country/' : 'pays/');
const dossiersIndex = (lang) => `${PRE[lang]}dossiers/`;
const countryPath = (lang, slug) => (lang === 'en' ? `en/country/${slug}/` : `pays/${slug}/`);
const dossierPath = (lang, id) => `${PRE[lang]}dossiers/${id}/`;

/* ---------- empreinte des fichiers statiques (cache) ---------- */
const assetFiles = [
  'assets/css/site.css', 'assets/js/i18n.js', 'assets/js/common.js', 'assets/js/globe.js', 'assets/js/home.js', 'assets/js/reader.js', 'assets/js/modules.js', 'assets/js/search.js',
  'assets/vendor/d3-array.min.js', 'assets/vendor/d3-geo.min.js', 'assets/vendor/topojson-client.min.js', 'assets/world.json',
  ...fs.readdirSync(path.join(root, 'assets/fonts')).map((f) => 'assets/fonts/' + f)
].filter(exists);
const hash = crypto.createHash('sha1');
assetFiles.forEach((f) => hash.update(fs.readFileSync(path.join(root, f))));
const V = hash.digest('hex').slice(0, 10);

const ICON = {
  right: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  left: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  plus: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
  recenter: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
  install: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
  share: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"/></svg>'
};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const utc = (d) => { const p = String(d).split('-').map(Number); return Date.UTC(p[0], (p[1] || 1) - 1, p[2] || 1); };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- Adresses lisibles (slugs) ---------- */
const STOP = {
  fr: new Set('le la les un une des de du et en au aux sur pour par dans avec qui que se sa son ses leur leurs ce cette ces est ne pas plus entre toujours encore deja comme mais ou'.split(' ')),
  en: new Set('the an of to in on for and as at by with its is are from into over still'.split(' '))
};
function slugify(text, lang, max = 8) {
  const words = String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[’'`]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter((w) => (w.length > 1 || /\d/.test(w)) && !STOP[lang].has(w));
  return words.slice(0, max).join('-').slice(0, 72).replace(/-+$/, '') || 'sujet';
}
// Un slug est donné une fois pour toutes : il est noté dans data/slugs.json et ne change plus,
// même si le titre est corrigé le soir ou si la révision réécrit le fichier (sinon l'adresse partagée casserait).
const SLUGS = readJ('data/slugs.json', { fr: {}, en: {} });
function ensureSlugs(file, ed, lang) {
  const reg = (SLUGS[lang][ed.date] = SLUGS[lang][ed.date] || {});
  const used = new Set();
  let changed = false;
  ed.essentials.forEach((s) => {
    let sl = reg[s.id] || s.slug;
    if (!sl || used.has(sl)) { const base = slugify(s.title, lang); sl = base; let n = 2; while (used.has(sl)) sl = `${base}-${n++}`; }
    if (s.slug !== sl) { s.slug = sl; changed = true; }
    reg[s.id] = sl; used.add(sl);
  });
  if (changed) {
    wr(file, JSON.stringify(ed, null, 2) + '\n');
    const latest = dataOf(lang, 'latest.json');
    const l = readJ(latest, null);
    if (l && l.date === ed.date) wr(latest, JSON.stringify(ed, null, 2) + '\n');
  }
}

/* ---------- Données de toutes les éditions ---------- */
function loadEditions(lang) {
  const dir = dataOf(lang, 'editions');
  if (!exists(dir)) return [];
  return fs.readdirSync(path.join(root, dir)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().map((f) => {
    const ed = readJ(`${dir}/${f}`, null);
    if (ed) ensureSlugs(`${dir}/${f}`, ed, lang);
    return ed;
  }).filter(Boolean);
}
const EDS = { fr: loadEditions('fr'), en: loadEditions('en') };
wr('data/slugs.json', JSON.stringify(SLUGS, null, 1) + '\n');
const BYDATE = { fr: new Map(EDS.fr.map((e) => [e.date, e])), en: new Map(EDS.en.map((e) => [e.date, e])) };
const LATEST = { fr: EDS.fr[EDS.fr.length - 1], en: EDS.en[EDS.en.length - 1] || null };
const latestOf = (lang) => LATEST[lang] || LATEST.fr;
const editionHome = (lang) => { const ed = latestOf(lang); return BYDATE[lang].has(ed.date) ? datePath(lang, ed.date) : datePath('fr', ed.date); };

/* ---------- Tout ce qui dépend de la langue ---------- */
function makeCtx(lang) {
  const S = I18N[lang];
  const L = (k, v) => String(S[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => (v && v[x] !== undefined ? v[x] : ''));
  const typo = (s) => {
    s = String(s ?? '').replace(/'/g, '’');
    if (lang !== 'fr') return s;
    return s.replace(/ ([?!;])/g, '\u202f$1').replace(/ :/g, '\u00a0:').replace(/« /g, '«\u00a0').replace(/ »/g, '\u00a0»');
  };
  const t = (s) => esc(typo(s));
  const loc = S.locale;
  const F = {
    long: new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
    dm: new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short', timeZone: 'UTC' }),
    dmy: new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
    dmyl: new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
    my: new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    hm: new Intl.DateTimeFormat(loc, { hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Paris' })
  };
  const day = (d, ref) => { const parts = String(d).split('-'); if (parts.length === 2) return F.my.format(utc(d)); return (ref && String(ref).slice(0, 4) === parts[0] ? F.dm : F.dmy).format(utc(d)); };
  const hour = (iso) => { const h = F.hm.format(new Date(iso)); return lang === 'fr' ? h.replace(':', '\u00a0h\u00a0') : h; };
  const nf = new Intl.NumberFormat(loc), dec1 = new Intl.NumberFormat(loc, { maximumFractionDigits: 1 });
  const int = (n) => (lang === 'fr' ? String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f') : nf.format(Math.round(n)));
  const population = (n) => {
    if (!n) return '';
    if (n >= 1e9) { const v = n / 1e9; return `${dec1.format(v)} ${L(v >= 2 ? 'billions' : 'billion')}`; }
    if (n >= 1e6) { const v = n / 1e6; return `${v >= 100 ? Math.round(v) : dec1.format(v)} ${L(v >= 2 ? 'millions' : 'million')}`; }
    return int(Math.round(n / 1000) * 1000);
  };
  const cf = (id, k) => { const c = countries[id]; if (!c) return undefined; return lang === 'en' && c.en && c.en[k] !== undefined ? c.en[k] : c[k]; };
  const cname = (id, fb) => cf(id, 'name') || fb;
  return {
    lang, S, L, t, typo, day, hour, int, population, cf, cname,
    longDate: (d) => cap(F.long.format(utc(d))), dm: (d) => F.dm.format(utc(d)), dmy: (d) => cap(F.dmyl.format(utc(d))), dayLong: (d) => F.dmyl.format(utc(d))
  };
}

const flag = (id, rootRel, cls) => { const c = countries[id]; return c && c.flag ? `<img class="flag${cls ? ' ' + cls : ''}" src="${rootRel}assets/flags/${c.flag}" alt="" width="20" height="15" loading="lazy" decoding="async">` : ''; };
const ldScript = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
// Média d'information : charte (méthode), politique de corrections, contact pour signaler une erreur.
const ORG = () => ({
  '@type': 'NewsMediaOrganization', '@id': `${abs}/#organization`, name: 'Diurna', url: `${abs}/`,
  logo: { '@type': 'ImageObject', url: `${abs}/icons/icon-512.png`, width: 512, height: 512 },
  publishingPrinciples: `${abs}/methode/`, correctionsPolicy: `${abs}/corrections/`, ethicsPolicy: `${abs}/methode/`,
  actionableFeedbackPolicy: `${abs}/a-propos/`, masthead: `${abs}/a-propos/`, diversityPolicy: `${abs}/methode/`
});
const crumbs = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${abs}/${p}` })) });

/* ---------- Feuille de style en ligne (aucune requête bloquante) et scripts chargés après l'affichage ---------- */
// Le CSS minifié (≈ 10 ko compressé) est écrit dans chaque page : le texte s'affiche dès l'arrivée du HTML.
const CSS = rd('assets/css/site.css')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*([{}:;,>])\s*/g, '$1')
  .replace(/;}/g, '}')
  .replace(/:(is|where|not)\(/g, ':$1(')
  .trim();
// i18n et common sont différés ; le globe (d3, carte) et les modules se chargent quand le navigateur est libre,
// une fois le texte affiché. Les pages sans globe n'ont que les deux premiers.
const EARLY = new Set(['assets/js/i18n.js', 'assets/js/common.js', 'assets/js/search.js']);
function scriptTags(rootRel, list) {
  const early = list.filter((x) => EARLY.has(x)), late = list.filter((x) => !EARLY.has(x));
  const tag = (x) => `<script defer src="${rootRel}${x}?v=${V}"></script>`;
  if (!late.length) return early.map(tag).join('\n');
  const urls = JSON.stringify(late.map((x) => `${rootRel}${x}?v=${V}`));
  return early.map(tag).join('\n') + `
<script>(function(){var L=${urls};function go(){L.forEach(function(u){var s=document.createElement('script');s.src=u;s.async=false;document.body.appendChild(s);});}
function idle(){if('requestIdleCallback' in window)requestIdleCallback(go,{timeout:900});else setTimeout(go,150);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',idle);else idle();})();</script>`;
}

/* ---------- Gabarit commun ---------- */
function page(C, o) {
  const p = o.path, rootRel = rootRelOf(p), other = OTHER[C.lang];
  const alt = o.alt || {};
  const altOther = alt[other] != null ? alt[other] : FIXED[other].home;
  const og = o.og || `${abs}/${C.lang === 'en' ? 'og-en.png' : 'og.png'}`;
  const manifest = C.lang === 'en' ? 'en/manifest.webmanifest' : 'manifest.webmanifest';
  const hreflang = abs && alt.fr != null && alt.en != null
    ? `<link rel="alternate" hreflang="fr" href="${abs}/${alt.fr}">\n<link rel="alternate" hreflang="en" href="${abs}/${alt.en}">\n<link rel="alternate" hreflang="x-default" href="${abs}/${alt.fr}">`
    : '';
  const P = FIXED[C.lang];
  const nav = (href, label, key, opt) => `<a href="${rootRel}${href}"${opt ? ' class="opt"' : ''}${o.nav === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<!doctype html>
<html lang="${C.lang}"${o.cls ? ` class="${o.cls}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${o.title}</title>
<script>(function(){try{var s=localStorage.getItem('tp.lang');if(s===null){var w=(navigator.language||'fr').slice(0,2).toLowerCase()==='fr'?'fr':'en';localStorage.setItem('tp.lang',JSON.stringify(w));if(w!=='${C.lang}'&&!navigator.webdriver&&!/bot|crawl|spider|slurp|preview|lighthouse/i.test(navigator.userAgent))location.replace('${rootRel}${altOther}'+location.search+location.hash);}}catch(e){}})();</script>
<meta name="description" content="${o.desc}">
${o.noindex ? '<meta name="robots" content="noindex, follow">' : ''}
${site.googleVerification ? `<meta name="google-site-verification" content="${esc(site.googleVerification)}">` : ''}
<meta name="theme-color" content="#070C1D">
${abs ? `<link rel="canonical" href="${abs}/${o.canonical != null ? o.canonical : p}">` : ''}
${hreflang}
<link rel="manifest" href="${rootRel}${manifest}">
<link rel="icon" href="${rootRel}icons/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${rootRel}icons/apple-touch-icon.png">
<link rel="alternate" type="application/rss+xml" title="Diurna" href="${rootRel}${PRE[C.lang]}feed.xml">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Diurna">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta property="og:type" content="${o.ogType || 'website'}">
<meta property="og:site_name" content="Diurna">
<meta property="og:title" content="${o.title}">
<meta property="og:description" content="${o.desc}">
<meta property="og:locale" content="${C.S.og}">
<meta property="og:locale:alternate" content="${I18N[other].og}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${o.title}">
<meta name="twitter:description" content="${o.desc}">
${abs ? `<meta property="og:url" content="${abs}/${p}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:image" content="${og}">
<meta property="og:image:alt" content="${o.ogAlt || `Diurna — ${esc(C.S.sub)}`}">` : ''}
${(o.jsonld || []).map(ldScript).join('\n')}
<link rel="preload" href="${rootRel}assets/fonts/newsreader-text.woff2" as="font" type="font/woff2" crossorigin>
<style>${CSS.replace(/url\("\.\.\/fonts\//g, `url("${rootRel}assets/fonts/`)}</style>
${GC ? `<script data-goatcounter="https://${GC}.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>` : ''}
</head>
<body data-root="${rootRel}" data-repo="${esc(REPO)}"${FB ? ` data-fb="${esc(FB)}"` : ''}${o.data ? ' ' + o.data : ''}>
<header class="site-head">
  <a class="mark" href="${rootRel}${P.home}" aria-label="${esc(C.S.home)}"><span class="mark-name" aria-hidden="true">DIURNA<span class="mark-dot">.</span></span><span class="mark-sub">${C.t(C.S.sub)}</span></a>
  <nav class="nav" aria-label="${esc(C.S.navMain)}">
    ${nav(editionHome(C.lang), C.S.navEdition, 'edition')}
    ${nav(P.archives, C.S.navArchives, 'archives', true)}
    ${nav(P.method, C.S.navMethod, 'method')}
    <span class="langs"><span class="lang-self" aria-current="true">${C.S.langSelf}</span><a class="lang" href="${rootRel}${altOther}" hreflang="${other}" lang="${other}" aria-label="${esc(C.S.langSwitch)}">${C.S.langOther}</a></span>
    <button class="install" type="button" hidden>${ICON.install}${C.S.install}</button>
  </nav>
</header>
${o.body}
${o.footer === false ? '' : footer(C, rootRel)}
${scriptTags(rootRel, o.scripts || [])}
${o.after || ''}
</body>
</html>
`;
}
function footer(C, rootRel) {
  const P = FIXED[C.lang], r = rootRel, a = (href, label, extra = '') => `<a href="${r}${href}"${extra}>${label}</a>`;
  const kofi = site.kofi && site.support !== false ? `<a class="support" href="https://ko-fi.com/${esc(site.kofi)}" rel="noopener" target="_blank">${C.S.navSupport}</a>` : '';
  return `<footer class="site-foot">
  <div class="foot-brand"><p><span class="foot-name">DIURNA<span class="mark-dot">.</span></span></p><p class="foot-sub">${C.t(C.S.sub)}</p>${kofi}</div>
  <nav class="foot-cols" aria-label="${esc(C.S.navFoot)}">
    <div><h2>${C.S.footRead}</h2>${a(editionHome(C.lang), C.S.navEdition)}${a(P.archives, C.S.navArchives)}${a(countriesIndex(C.lang), C.S.navCountries)}${a(dossiersIndex(C.lang), C.S.navDossiers)}${a(P.search, C.S.navSearch)}${a(PRE[C.lang] + 'feed.xml', C.S.navFeed, ' type="application/rss+xml"')}</div>
    <div><h2>${C.S.footProject}</h2>${a(P.about, C.S.navAbout)}${a(P.method, C.S.navMethod)}${a(P.corrections, C.S.navCorrections)}${a(P.status, C.S.navStatus)}<a href="https://github.com/${REPO}/issues/new?template=erreur.yml" rel="noopener" target="_blank">${C.S.reportError}</a></div>
    <div><h2>${C.S.footInfo}</h2>${a(P.legal, C.S.navLegal)}${a(P.privacy, C.S.navPrivacy)}${a(P.credits, C.S.navCredits)}</div>
  </nav>
</footer>`;
}
const BASE = ['assets/js/i18n.js', 'assets/js/common.js'];
const VENDOR = ['assets/vendor/d3-array.min.js', 'assets/vendor/d3-geo.min.js', 'assets/vendor/topojson-client.min.js', ...BASE, 'assets/js/globe.js'];

/* ---------- Newsletter (Buttondown) et partenaire : affichés seulement s'ils sont configurés ---------- */
function newsletterForm(C, where) {
  if (!BD) return '';
  const id = `nl-${where}`;
  return `<section class="newsletter" aria-labelledby="${id}-h">
    <h2 class="band-h" id="${id}-h">${C.S.nlTitle}</h2>
    <p>${C.t(C.S.nlText)}</p>
    <form class="nl-form" action="https://buttondown.com/api/emails/embed-subscribe/${BD}" method="post" target="_blank" data-newsletter>
      <label class="sr" for="${id}">${C.S.nlLabel}</label>
      <input id="${id}" type="email" name="email" required autocomplete="email" placeholder="${esc(C.S.nlPh)}">
      <input type="hidden" name="embed" value="1">
      <input type="hidden" name="tag" value="${C.lang}">
      <button class="btn" type="submit">${C.S.nlBtn}</button>
    </form>
    <p class="nl-note"><a href="${C.rootRel}${FIXED[C.lang].privacy}">${C.S.nlPrivacy}</a></p>
  </section>`;
}
const sponsorLine = (C) => (SPONSOR ? `<p class="sponsor">${C.t(C.L('sponsoredBy', { x: '' }).trim())} <a href="${esc(SPONSOR.url)}" rel="sponsored noopener" target="_blank">${C.t(SPONSOR.name)}</a><span class="sponsor-note">${C.t(C.S.sponsorNote)}</span></p>` : '');

/* ---------- Image de partage propre à chaque sujet (générée au déploiement) ---------- */
const ogFor = (lang, date, rank) => {
  const f = `og/${lang}/${date}-${rank}.jpg`;
  return exists(f) ? `${abs}/${f}` : null;
};

/* ---------- Rendu des fiches (identique à celui du navigateur, pour Google et le premier affichage) ---------- */
function idBand(C, s) {
  const c = countries[s.id];
  if (!c) return '';
  const g = gov[s.id];
  const capital = C.cf(s.id, 'capital'), langs = C.cf(s.id, 'languages') || [], curs = C.cf(s.id, 'currencies') || [];
  const pop = c.population ? C.L('inhabShort', { p: C.population(c.population) }) : '';
  const line = [capital ? capital.replace(/ \(.*\)$/, '') : '', pop].filter(Boolean).join(' · ');
  const cells = [];
  if (capital) cells.push([C.S.capital, capital]);
  if (c.population) cells.push([C.S.population, C.L('inhabitants', { p: C.population(c.population) })]);
  if (langs.length) cells.push([langs.length > 1 ? C.S.languages : C.S.language, langs.join(', ')]);
  if (curs.length) cells.push([C.S.currency, curs.join(', ')]);
  if (g) { cells.push([C.S.regime, C.lang === 'en' && g.regime_en ? g.regime_en : g.regime]); g.leaders.forEach((l) => cells.push([C.lang === 'en' && l.role_en ? l.role_en : l.role, C.lang === 'en' && l.name_en ? l.name_en : l.name])); }
  return `<details class="idband"><summary>${flag(s.id, C.rootRel, 'lg')}<span class="id-name">${C.t(C.cname(s.id, s.place))}</span><span class="id-line">${C.t(line)}</span><span class="id-more"><span>${C.S.profile}</span>${ICON.plus}</span></summary><dl class="id-grid">${cells.map(([k, v]) => `<div><dt>${C.t(k)}</dt><dd>${C.t(v)}</dd></div>`).join('')}</dl></details>`;
}
function related(ed, s) {
  const score = (o) => {
    let n = 0;
    if ((s.involved || []).includes(o.id)) n += 4;
    if ((o.involved || []).includes(s.id)) n += 4;
    n += (s.involved || []).filter((x) => (o.involved || []).includes(x)).length;
    if (o.section === s.section) n += 2;
    (o.types || []).forEach((ty) => { if ((s.types || []).includes(ty)) n += 1; });
    return n - o.rank * 0.1;
  };
  return ed.essentials.filter((o) => o.rank !== s.rank).map((o) => [score(o), o]).sort((a, b) => b[0] - a[0]).slice(0, 3).map((x) => x[1]);
}
function storySSR(C, ed, s) {
  const r = C.rootRel;
  const meta = [];
  if (s.since && !(s.types || []).includes('conflict')) {
    const n = Math.floor((utc(ed.date) - utc(s.since.date)) / 864e5) + 1;
    meta.push(`<b>${C.t(C.L(n > 1 ? 'days' : 'day1', { n: C.int(n), label: s.since.label }))}</b>`);
  }
  meta.push(`<span>${C.t(C.L('editionOf', { d: C.day(ed.date) }))}</span>`);
  if (s.updates && s.updates.length) meta.push(`<a class="upd" href="#maj">${C.t(C.L('updatedAt', { h: C.hour(s.updates[s.updates.length - 1].time) }))}</a>`);
  if (s.dossier) meta.push(`<a class="dossier" href="${r}${dossierPath(C.lang, s.dossier.id)}">${C.t(C.S.dossier)} · ${C.t(s.dossier.title)}</a>`);
  const sl = srcLine(C, s);
  if (sl) meta.push(`<span class="src-line">${C.t(sl)}</span>`);
  meta.push(`<span class="ai-label">${C.t(C.S.aiLabel)} · <a href="${r}${FIXED[C.lang].method}">${C.t(C.S.aiMore)}</a></span>`);
  const fold = (label, body, key) => `<details class="fold" data-fold="${key}"><summary>${label}${ICON.plus}</summary><div class="fold-body">${body}</div></details>`;
  const keys = (s.keys || []).map((k) => `<div><dt>${C.t(k.title)}</dt><dd>${C.t(k.text)}</dd></div>`).join('');
  const ctx = (s.context || []).map((c) => `<li class="${utc(c.d) > utc(ed.date) ? 'soon' : ''}"><time datetime="${esc(c.d)}">${esc(C.day(c.d, ed.date))}</time><span>${C.t(c.t)}</span></li>`).join('');
  const src = (s.sources || []).map((x) => `<li><b>${C.t(x.name)}</b><a href="${esc(x.url)}" target="_blank" rel="noopener">${C.t(x.title)}</a></li>`).join('');
  const fig = s.figure ? `<div class="mods"><section class="mod mod-figure" data-mod="figure"><h3 class="mod-h">${C.t(C.S.figure)}</h3><p class="fig-v">${C.t(s.figure.value)}</p><p class="fig-l">${C.t(s.figure.label)}</p>${s.figure.compare ? `<p class="fig-c">${C.t(s.figure.compare)}</p>` : ''}</section></div>` : '';
  const acc = countries[s.id] && countries[s.id].accent;
  const next = related(ed, s).map((o) => `<li><a class="nr c${o.rank}" href="${r}${storyPath(C.lang, ed.date, o.slug)}" data-go="${o.rank}"><span class="rubric"><span class="rank">${o.rank}</span>${flag(o.id, r)}${C.t(C.cname(o.id, o.place))}</span><span class="nr-t">${C.t(o.title)}</span></a></li>`).join('');
  return `<div class="article"${acc ? ` style="--acc:${acc}"` : ''}>
        ${idBand(C, s)}
        <p class="rubric"><span class="rank">${s.rank}</span>${C.t(s.section)}${s.radar ? `<span class="radar">${C.S.radar}</span>` : ''}</p>
        <h2>${C.t(s.title)}</h2>
        <p class="chapo">${C.t(s.standfirst)}</p>
        <p class="byline">${meta.join('')}</p>
        <p class="body">${(s.body || []).map(C.t).join(' ')}</p>
        ${fig}
        ${s.analysis ? `<h3>${C.t(s.analysis.title)}</h3><p class="analysis">${C.t(s.analysis.text)}</p>` : ''}
        <div class="folds">${keys ? fold(C.S.keys, `<dl class="keys">${keys}</dl>`, 'cles') : ''}${ctx ? fold(C.S.timeline, `<ol class="timeline">${ctx}</ol>`, 'reperes') : ''}${src ? fold(C.S.sources, `<ul class="sources">${src}</ul>`, 'sources') : ''}</div>
        ${updatesSSR(C, s)}
        ${actionsSSR(C, ed, s)}
        <section class="nextreads" aria-labelledby="nr-h"><h3 id="nr-h">${C.S.readNext}</h3><ul>${next}</ul></section>
      </div>`;
}
function srcLine(C, s) {
  const names = [...new Set((s.sources || []).map((x) => (C.lang === 'en' && x.name_en) || x.name))];
  if (!names.length) return '';
  const and = C.lang === 'en' ? ' and ' : ' et ';
  const list = names.length <= 3 ? names.slice(0, -1).join(', ') + (names.length > 1 ? and : '') + names[names.length - 1] : C.L('andMore', { a: names.slice(0, 2).join(', '), n: names.length - 2 });
  return C.L('sourcesBy', { x: list });
}
function updatesSSR(C, s) {
  if (!s.updates || !s.updates.length) return '';
  return `<aside class="updates" id="maj" aria-labelledby="maj-h"><h3 id="maj-h">${C.t(C.S.updatesTitle)}</h3><ul>${s.updates.map((u) => `<li><time datetime="${esc(u.time)}">${C.t(C.hour(u.time))}</time><span>${C.t(u.text)}</span></li>`).join('')}</ul></aside>`;
}
function actionsSSR(C, ed, s) {
  const url = `${abs}/${storyPath(C.lang, ed.date, s.slug)}`;
  const avis = FB.startsWith('tally:') ? `https://tally.so/r/${FB.slice(6)}?page=${encodeURIComponent(url)}&lang=${C.lang}`
    : FB.startsWith('mail:') ? `mailto:${FB.slice(5)}?subject=${encodeURIComponent('Diurna — ' + C.typo(s.title))}&body=${encodeURIComponent(url + '\n\n')}` : '';
  const issue = `https://github.com/${REPO}/issues/new?template=erreur.yml&page=${encodeURIComponent(url)}&title=${encodeURIComponent((C.lang === 'en' ? 'Error: ' : 'Erreur : ') + C.typo(s.title))}`;
  return `<div class="story-actions">
          <button class="act" type="button" data-share>${ICON.share}<span>${C.S.share}</span></button>
          ${avis ? `<a class="act" href="${esc(avis)}" target="_blank" rel="noopener" data-feedback>${C.S.feedback}</a>` : ''}
          <a class="act quiet" href="${esc(issue)}" target="_blank" rel="noopener">${C.S.reportError}</a>
        </div>`;
}
function briefSSR(C, ed) {
  const r = C.rootRel;
  const brief = (ed.brief || []).map((b) => `<li><b>${flag(b.id, r)}${C.t(b.place)}</b>${C.t(b.text)}${b.url ? ` <a href="${esc(b.url)}" target="_blank" rel="noopener">${C.S.source}</a>` : ''}</li>`).join('');
  const agenda = (ed.agenda || []).map((a) => `<li><time datetime="${esc(a.d)}">${esc(C.day(a.d, ed.date))}</time><span>${C.t(a.t)}</span></li>`).join('');
  return `<div class="article">
        <p class="rubric">${C.t(C.S.elsewhere)}</p>
        <h2>${C.S.inBrief}</h2>
        <p class="byline"><span class="ai-label">${C.t(C.S.aiLabel)} · <a href="${r}${FIXED[C.lang].method}">${C.t(C.S.aiMore)}</a></span></p>
        ${brief ? `<ul class="brief">${brief}</ul>` : ''}
        ${agenda ? `<h3>${C.S.comingUp}</h3><ul class="agenda">${agenda}</ul>` : ''}
        <p class="end-note">${C.t(C.S.endNote)}</p>
        ${newsletterForm(C, 'bref')}
      </div>`;
}

/* ---------- Pages de l'édition : une par sujet, plus « En bref » à la date ---------- */
function readerPage(C, ed, rank) {
  const s = rank === 'bref' ? null : ed.essentials.find((x) => x.rank === rank);
  const p = s ? storyPath(C.lang, ed.date, s.slug) : datePath(C.lang, ed.date);
  C.rootRel = rootRelOf(p);
  const r = C.rootRel, other = OTHER[C.lang];
  const otherEd = BYDATE[other].get(ed.date);
  const otherS = otherEd && s ? otherEd.essentials.find((x) => x.rank === rank) : null;
  const alt = { [C.lang]: p, [other]: otherEd ? (s ? (otherS ? storyPath(other, ed.date, otherS.slug) : null) : datePath(other, ed.date)) : null };
  const isLatest = ed.date === latestOf(C.lang).date;
  const steps = ed.essentials.map((x) => `<a class="step c${x.rank}" href="${r}${storyPath(C.lang, ed.date, x.slug)}" data-step="${x.rank}" aria-label="${esc(x.rank + '. ' + C.cname(x.id, x.place))}"${x.rank === rank ? ' aria-current="step"' : ''}>${x.rank}</a>`).join('')
    + `<a class="step brief-step" href="${r}${datePath(C.lang, ed.date)}" data-step="6"${rank === 'bref' ? ' aria-current="step"' : ''}>${C.S.inBrief}</a>`;
  const title = s ? `${C.typo(s.title)} — Diurna` : `${C.typo(C.L('editionOf', { d: C.dayLong(ed.date) }) + (C.lang === 'fr' ? ' : ' : ': ') + ed.headline)} — Diurna`;
  const desc = C.t(s ? s.standfirst : ed.standfirst);
  const edLabel = C.typo(C.L('editionOf', { d: C.dayLong(ed.date) }));
  const jsonld = [crumbs([['Diurna', FIXED[C.lang].home], [edLabel, datePath(C.lang, ed.date)], ...(s ? [[C.cname(s.id, s.place), p]] : [])])];
  const og = s ? ogFor(C.lang, ed.date, rank) : null;
  if (s) {
    jsonld.unshift({
      '@context': 'https://schema.org', '@type': 'NewsArticle', '@id': `${abs}/${p}#article`,
      headline: C.typo(s.title).slice(0, 110), description: C.typo(s.standfirst), inLanguage: C.lang,
      datePublished: `${ed.date}T07:00:00+01:00`, dateModified: ed.updated,
      url: `${abs}/${p}`, mainEntityOfPage: `${abs}/${p}`, articleSection: s.section,
      image: [og || `${abs}/${C.lang === 'en' ? 'og-en.png' : 'og.png'}`],
      author: ORG(), publisher: ORG(), isAccessibleForFree: true,
      contentLocation: { '@type': 'Country', name: C.cname(s.id, s.place) },
      ...(s.dossier ? { isPartOf: { '@type': 'CreativeWorkSeries', name: s.dossier.title, url: `${abs}/${dossierPath(C.lang, s.dossier.id)}` } } : {}),
      citation: (s.sources || []).map((x) => x.url)
    });
  }
  const latestLine = isLatest ? `<span>${C.t(C.L('updated', { h: C.hour(ed.updated) }))}</span>` : `<a href="${r}${editionHome(C.lang)}">${C.t(C.S.backToday)}</a>`;
  const body = `<main class="reader">
  <h1 class="sr" id="edTitle">${C.t(s ? s.title : ed.headline)}</h1>
  <section class="stage" aria-label="Globe">
    <div class="stage-globe" id="globe"></div>
    <p class="stage-note">${C.t(C.S.stageNote)}</p>
    <div class="zoom">
      <button id="zin" type="button" aria-label="${esc(C.S.zoomIn)}">${ICON.plus}</button>
      <button id="zout" type="button" aria-label="${esc(C.S.zoomOut)}">${ICON.minus}</button>
      <button id="zre" type="button" aria-label="${esc(C.S.recentre)}">${ICON.recenter}</button>
    </div>
  </section>
  <section class="panel${s ? ' c' + s.rank : ''}" id="panel" aria-label="${esc(C.S.panelLabel)}">
    <p class="edition-line ed-line" id="edLine"><b>${C.L('no', { n: ed.number })}</b><span>${C.t(C.longDate(ed.date))}</span>${latestLine}</p>
    ${SPONSOR ? `<div class="ed-sponsor">${sponsorLine(C)}</div>` : ''}
    <nav class="steps" id="steps" aria-label="${esc(C.S.stepsLabel)}">${steps}</nav>
    <article class="read" id="read" aria-live="polite">
      ${s ? storySSR(C, ed, s) : briefSSR(C, ed)}
    </article>
    <div class="pager"><button class="prev" id="prev" type="button"${rank === 1 ? ' disabled' : ''}>${ICON.left}${C.S.prev}</button><button class="next" id="next" type="button"${rank === 'bref' ? ' disabled' : ''}>${C.S.next}${ICON.right}</button></div>
  </section>
</main>`;
  return {
    path: p,
    html: page(C, {
      path: p, alt, title: esc(title), desc, cls: 'reader-page', nav: 'edition', ogType: s ? 'article' : 'website', og: og || undefined,
      ogAlt: s ? esc(C.typo(s.title)) : undefined, jsonld, footer: false,
      data: `data-date="${ed.date}" data-rank="${rank}" data-latest="${isLatest ? 1 : 0}" data-today="${editionHome(C.lang)}"`,
      body, scripts: [...VENDOR, 'assets/js/modules.js', 'assets/js/reader.js']
    })
  };
}

/* ---------- Accueil ---------- */
function home(C) {
  const ed = latestOf(C.lang), own = BYDATE[C.lang].has(ed.date), lg = own ? C.lang : 'fr';
  const p = FIXED[C.lang].home; C.rootRel = rootRelOf(p); const r = C.rootRel;
  const url = (s) => `${r}${storyPath(lg, ed.date, s.slug)}`;
  const routes = Object.fromEntries(ed.essentials.map((s) => [s.rank, storyPath(lg, ed.date, s.slug)]));
  const summary = ed.essentials.map((s) => `
      <li class="c${s.rank}"><a href="${url(s)}">
        <p class="rubric"><span class="rank">${s.rank}</span>${flag(s.id, r)}${C.t(C.cname(s.id, s.place))}${s.radar ? `<span class="radar">${C.S.radar}</span>` : ''}</p>
        <span class="title">${C.t(s.title)}</span>
        <span class="chapo">${C.t(s.standfirst)}</span>
      </a></li>`).join('');
  const brief = (ed.brief || []).map((b) => `
        <li><b>${flag(b.id, r)}${C.t(b.place)}</b>${C.t(b.text)}${b.url ? ` <a href="${esc(b.url)}" target="_blank" rel="noopener">${C.S.source}</a>` : ''}</li>`).join('');
  const agenda = (ed.agenda || []).map((a) => `
        <li><time datetime="${esc(a.d)}">${esc(C.dm(a.d))}</time><span>${C.t(a.t)}</span></li>`).join('');
  const searchTarget = `${abs}/${FIXED[C.lang].search}?q={search_term_string}`;
  const body = `<main${own ? '' : ' lang="fr"'}>
  ${own ? '' : `<p class="notice">${C.t(C.S.notTranslated)}</p>`}
  <section class="cover">
    <div class="cover-text">
      <p class="edition-line rise" data-date="${ed.date}"><b>${C.L('no', { n: ed.number })}</b><span>${C.t(C.longDate(ed.date))}</span><span>${C.t(C.L('updated', { h: C.hour(ed.updated) }))}</span></p>
      <h1 class="rise rise-2">${C.t(ed.headline)}</h1>
      <p class="chapo rise rise-3">${C.t(ed.standfirst)}</p>
      <p class="ai-label rise rise-3">${C.t(C.S.aiLabel)} · <a href="${r}${FIXED[C.lang].method}">${C.t(C.S.aiMore)}</a></p>
      ${sponsorLine(C)}
      <div class="actions rise rise-4">
        <a class="btn" href="${url(ed.essentials[0])}">${C.S.readEdition}${ICON.right}</a>
        <a class="link-quiet" href="#sommaire">${C.S.contents}</a>
      </div>
    </div>
    <div class="cover-globe" id="coverGlobe" data-routes='${esc(JSON.stringify(routes))}' data-date="${ed.date}" data-lang="${lg}"></div>
  </section>
  <section class="band" id="sommaire" aria-labelledby="h-sommaire">
    <h2 class="band-h" id="h-sommaire">${C.S.fiveStories}</h2>
    <ol class="summary">${summary}
    </ol>
    <div class="duo">
      <section aria-labelledby="h-bref">
        <h2 class="band-h" id="h-bref"><a href="${r}${datePath(lg, ed.date)}">${C.S.inBrief}</a></h2>
        <ul class="brief">${brief}
        </ul>
      </section>
      <section aria-labelledby="h-agenda">
        <h2 class="band-h" id="h-agenda">${C.S.comingUp}</h2>
        <ul class="agenda">${agenda}
        </ul>
      </section>
    </div>
    ${newsletterForm(C, 'home')}
  </section>
</main>`;
  return page(C, {
    path: p, alt: { fr: FIXED.fr.home, en: FIXED.en.home }, title: esc(`Diurna — ${C.typo(ed.headline)}`), desc: C.t(ed.standfirst), nav: 'home',
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${abs}/#website`, name: 'Diurna', url: `${abs}/${p}`, inLanguage: C.lang, description: C.S.sub, publisher: { '@id': `${abs}/#organization` },
        potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: searchTarget }, 'query-input': 'required name=search_term_string' } },
      { '@context': 'https://schema.org', ...ORG() }
    ],
    body, scripts: [...VENDOR, 'assets/js/home.js']
  });
}

/* ---------- Anciennes adresses /globe/#n → page du sujet ---------- */
function globeRedirect(C) {
  const p = FIXED[C.lang].globe, r = rootRelOf(p), ed = latestOf(C.lang), lg = BYDATE[C.lang].has(ed.date) ? C.lang : 'fr';
  const map = { ...Object.fromEntries(ed.essentials.map((s) => [s.rank, storyPath(lg, ed.date, s.slug)])), bref: datePath(lg, ed.date) };
  const first = map[1];
  return `<!doctype html>
<html lang="${C.lang}">
<head>
<meta charset="utf-8">
<title>Diurna</title>
<meta name="robots" content="noindex, follow">
${abs ? `<link rel="canonical" href="${abs}/${first}">` : ''}
<meta http-equiv="refresh" content="2; url=${r}${first}">
<script>(function(){var R=${JSON.stringify(map)},root='${r}',lang='${lg}',h=location.hash.replace('#',''),d=new URLSearchParams(location.search).get('d');
function go(p){location.replace(root+p);}
if(d){fetch(root+'data/routes.json').then(function(x){return x.json();}).then(function(all){var e=all[lang][d]||all.fr[d];go(e?(e[h]||e[1]):R[h]||R[1]);}).catch(function(){go(R[h]||R[1]);});}
else go(R[h]||R[1]);})();</script>
<style>body{background:#070C1D;color:#F2EEE6;font:16px/1.5 Georgia,serif;padding:40px}a{color:#F2EEE6}</style>
</head>
<body><p><a href="${r}${first}">Diurna →</a></p></body>
</html>
`;
}

/* ---------- Archives ---------- */
function archives(C) {
  const p = FIXED[C.lang].archives; C.rootRel = rootRelOf(p); const r = C.rootRel;
  const rows = EDS.fr.slice().reverse().map((frEd) => {
    const own = BYDATE[C.lang].get(frEd.date), ed = own || frEd, lg = own ? C.lang : 'fr';
    return `
    <li><a href="${r}${datePath(lg, ed.date)}"${own ? '' : ' hreflang="fr"'}>
      <time datetime="${ed.date}">${C.t(C.dmy(ed.date))}</time>
      <span class="h"${own ? '' : ' lang="fr"'}>${C.t(ed.headline)}</span>
      <span class="p">${ed.essentials.map((s) => `<span class="c${s.rank}">${flag(s.id, r)}${C.t(C.cname(s.id, s.place))}</span>`).join('')}${own ? '' : `<em class="fr-only">${C.S.frOnly}</em>`}</span>
    </a></li>`;
  }).join('');
  return page(C, {
    path: p, alt: { fr: FIXED.fr.archives, en: FIXED.en.archives }, title: esc(C.S.archivesTitle + ' — Diurna'), desc: C.t(C.S.archivesDesc), nav: 'archives',
    jsonld: [crumbs([['Diurna', FIXED[C.lang].home], [C.S.archivesTitle, p]])],
    body: `<main class="page">
  <h1>${C.S.archivesTitle}</h1>
  <p class="chapo">${C.t(C.S.archivesChapo)}</p>
  <ul class="archive">${rows}
  </ul>
  <p class="more-links"><a href="${r}${countriesIndex(C.lang)}">${C.S.byCountry}</a><a href="${r}${dossiersIndex(C.lang)}">${C.S.byDossier}</a><a href="${r}${FIXED[C.lang].search}">${C.S.navSearch}</a></p>
</main>`, scripts: BASE
  });
}

/* ---------- Pays et dossiers ---------- */
function collect(lang) {
  const byCountry = new Map(), byDossier = new Map();
  const add = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
  for (const ed of EDS[lang]) {
    ed.essentials.forEach((s) => {
      const item = { date: ed.date, title: s.title, text: s.standfirst, path: storyPath(lang, ed.date, s.slug), id: s.id, place: s.place, rank: s.rank };
      add(byCountry, s.id, item);
      if (s.dossier && s.dossier.id) add(byDossier, s.dossier.id, { ...item, dossier: s.dossier });
    });
    (ed.brief || []).forEach((b) => { if (b.id) add(byCountry, b.id, { date: ed.date, title: b.text, path: datePath(lang, ed.date), id: b.id, place: b.place, brief: true }); });
  }
  return { byCountry, byDossier };
}
const COL = { fr: collect('fr'), en: collect('en') };
// Le même dossier dans l'autre langue : celui du sujet de même rang, le même jour.
function dossierAlt(lang, id) {
  const other = OTHER[lang];
  for (const it of COL[lang].byDossier.get(id) || []) {
    const oe = BYDATE[other].get(it.date), os = oe && oe.essentials.find((x) => x.rank === it.rank);
    if (os && os.dossier && COL[other].byDossier.has(os.dossier.id)) return dossierPath(other, os.dossier.id);
  }
  return null;
}
const cslug = (lang, id) => slugify(lang === 'en' && countries[id] && countries[id].en ? countries[id].en.name : (countries[id] ? countries[id].name : id), lang, 6);
function listItems(C, items) {
  const r = C.rootRel;
  return `<ul class="archive">${items.slice().sort((a, b) => b.date.localeCompare(a.date)).map((i) => `
    <li><a href="${r}${i.path}">
      <time datetime="${i.date}">${C.t(C.dmy(i.date))}</time>
      <span class="h">${i.brief ? `<em class="kind">${C.S.inBrief}</em> ` : ''}${C.t(i.title)}</span>
      ${i.text ? `<span class="p">${C.t(i.text)}</span>` : ''}
    </a></li>`).join('')}
  </ul>`;
}
function countryPage(C, id, items) {
  const p = countryPath(C.lang, cslug(C.lang, id)); C.rootRel = rootRelOf(p);
  const other = OTHER[C.lang], otherHas = COL[other].byCountry.has(id);
  const name = C.cname(id, items[0].place);
  return page(C, {
    path: p, alt: { [C.lang]: p, [other]: otherHas ? countryPath(other, cslug(other, id)) : null },
    title: esc(`${C.typo(name)} — Diurna`), desc: C.t(C.L('countryDesc', { x: name })),
    jsonld: [crumbs([['Diurna', FIXED[C.lang].home], [C.S.countries, countriesIndex(C.lang)], [name, p]])],
    body: `<main class="page"${countries[id] && countries[id].accent ? ` style="--acc:${countries[id].accent}"` : ''}>
  <p class="rubric"><a href="${C.rootRel}${countriesIndex(C.lang)}">${C.S.countries}</a></p>
  <h1 class="with-flag">${flag(id, C.rootRel, 'lg')}${C.t(name)}</h1>
  <p class="chapo">${C.t(C.L('countryDesc', { x: name }))}</p>
  ${idBand(C, { id, place: name }).replace('<details class="idband">', '<details class="idband" open>')}
  ${listItems(C, items)}
</main>`, scripts: BASE
  });
}
function dossierPage(C, id, items) {
  const p = dossierPath(C.lang, id); C.rootRel = rootRelOf(p);
  const other = OTHER[C.lang];
  const title = items[items.length - 1].dossier.title;
  return page(C, {
    path: p, alt: { [C.lang]: p, [other]: dossierAlt(C.lang, id) },
    title: esc(`${C.typo(title)} — Diurna`), desc: C.t(C.L('dossierDesc', { x: title })),
    jsonld: [crumbs([['Diurna', FIXED[C.lang].home], [C.S.dossiers, dossiersIndex(C.lang)], [title, p]])],
    body: `<main class="page">
  <p class="rubric"><a href="${C.rootRel}${dossiersIndex(C.lang)}">${C.S.dossiers}</a></p>
  <h1>${C.t(title)}</h1>
  <p class="chapo">${C.t(C.L('dossierDesc', { x: title }))}</p>
  ${listItems(C, items)}
  <p class="more-links"><a href="feed.xml" type="application/rss+xml">${C.S.navFeed}</a><a href="atom.xml" type="application/atom+xml">Atom</a></p>
</main>`, scripts: BASE
  });
}

function countriesPage(C) {
  const p = countriesIndex(C.lang); C.rootRel = rootRelOf(p); const r = C.rootRel;
  const coll = new Intl.Collator(C.S.locale);
  const list = [...COL[C.lang].byCountry].map(([id, items]) => ({ id, name: C.cname(id, items[0].place), n: items.length, last: items.map((i) => i.date).sort().pop() }))
    .sort((a, b) => coll.compare(a.name, b.name));
  return page(C, {
    path: p, alt: { fr: countriesIndex('fr'), en: countriesIndex('en') }, title: esc(`${C.S.countries} — Diurna`), desc: C.t(C.S.countriesDesc),
    jsonld: [crumbs([['Diurna', FIXED[C.lang].home], [C.S.countries, p]])],
    body: `<main class="page">
  <h1>${C.S.countries}</h1>
  <p class="chapo">${C.t(C.S.countriesDesc)}</p>
  <ul class="index-grid">${list.map((c) => `
    <li><a href="${r}${countryPath(C.lang, cslug(C.lang, c.id))}">${flag(c.id, r)}<span class="h">${C.t(c.name)}</span><span class="p">${C.t(C.L(c.n > 1 ? 'nStories' : 'nStory', { n: c.n }))} · ${C.t(C.dmy(c.last))}</span></a></li>`).join('')}
  </ul>
</main>`, scripts: BASE
  });
}
function dossiersPage(C) {
  const p = dossiersIndex(C.lang); C.rootRel = rootRelOf(p); const r = C.rootRel;
  const list = [...COL[C.lang].byDossier].map(([id, items]) => ({ id, title: items[items.length - 1].dossier.title, n: items.length, last: items.map((i) => i.date).sort().pop(), c: items[items.length - 1].id }))
    .sort((a, b) => b.last.localeCompare(a.last) || a.title.localeCompare(b.title));
  return page(C, {
    path: p, alt: { fr: dossiersIndex('fr'), en: dossiersIndex('en') }, title: esc(`${C.S.dossiers} — Diurna`), desc: C.t(C.S.dossiersDesc),
    jsonld: [crumbs([['Diurna', FIXED[C.lang].home], [C.S.dossiers, p]])],
    body: `<main class="page">
  <h1>${C.S.dossiers}</h1>
  <p class="chapo">${C.t(C.S.dossiersDesc)}</p>
  <ul class="index-grid">${list.map((d) => `
    <li><a href="${r}${dossierPath(C.lang, d.id)}">${flag(d.c, r)}<span class="h">${C.t(d.title)}</span><span class="p">${C.t(C.L(d.n > 1 ? 'nStories' : 'nStory', { n: d.n }))} · ${C.t(C.dmy(d.last))}</span></a></li>`).join('')}
  </ul>
</main>`, scripts: BASE
  });
}

/* ---------- Recherche ---------- */
function searchIndex(lang) {
  const out = [];
  for (const ed of EDS[lang].slice().reverse()) ed.essentials.forEach((s) => out.push({ k: 's', t: s.title, x: s.standfirst, d: ed.date, p: storyPath(lang, ed.date, s.slug), c: s.id, n: s.place, o: s.dossier ? s.dossier.title : '' }));
  for (const [id, items] of COL[lang].byCountry) out.push({ k: 'c', t: makeCtx(lang).cname(id, items[0].place), p: countryPath(lang, cslug(lang, id)), c: id });
  for (const [id, items] of COL[lang].byDossier) out.push({ k: 'd', t: items[items.length - 1].dossier.title, p: dossierPath(lang, id) });
  return out;
}
function searchPage(C) {
  const p = FIXED[C.lang].search; C.rootRel = rootRelOf(p);
  return page(C, {
    path: p, alt: { fr: FIXED.fr.search, en: FIXED.en.search }, title: esc(C.S.searchTitle + ' — Diurna'), desc: C.t(C.S.searchDesc), noindex: true,
    body: `<main class="page">
  <h1>${C.S.searchTitle}</h1>
  <form class="search" role="search" action="" method="get">
    <label class="sr" for="q">${C.S.searchTitle}</label>
    <input id="q" name="q" type="search" autocomplete="off" placeholder="${esc(C.S.searchPh)}">
  </form>
  <p class="search-n" id="searchN" aria-live="polite"></p>
  <ul class="archive" id="results"></ul>
</main>`, scripts: [...BASE, 'assets/js/search.js']
  });
}

/* ---------- Méthode et statut ---------- */
const METHOD = require('./method-content.cjs');
function method(C) {
  const p = FIXED[C.lang].method; C.rootRel = rootRelOf(p);
  return page(C, {
    path: p, alt: { fr: FIXED.fr.method, en: FIXED.en.method }, title: esc(C.S.methodTitle + ' — Diurna'), desc: C.t(C.S.methodDesc), nav: 'method',
    body: `<main class="page">${METHOD[C.lang](C.t)}</main>`, scripts: BASE
  });
}
const PAGES = require('./pages-content.cjs');
const TODO = { fr: 'À REMPLIR', en: 'TO FILL IN' };
function infoPage(C, key) {
  const p = FIXED[C.lang][key]; C.rootRel = rootRelOf(p);
  const x = { t: C.t, site: { ...site, repo: REPO }, r: C.rootRel, P: { ...FIXED[C.lang], credits: FIXED[C.lang].credits }, lang: C.lang,
    todo: (label) => `<mark class="todo">${C.t(`[${TODO[C.lang]}${C.lang === 'fr' ? ' : ' : ': '}${label}]`)}</mark>` };
  const T = { about: ['aboutTitle', 'aboutDesc'], legal: ['legalTitle', 'legalDesc'], privacy: ['privacyTitle', 'privacyDesc'], credits: ['creditsTitle', 'creditsDesc'] }[key];
  return page(C, {
    path: p, alt: { fr: FIXED.fr[key], en: FIXED.en[key] }, title: esc(C.S[T[0]] + ' — Diurna'), desc: C.t(C.S[T[1]]),
    jsonld: [crumbs([['Diurna', FIXED[C.lang].home], [C.S[T[0]], p]])],
    body: `<main class="page page-info">${PAGES[key][C.lang](x)}</main>`, scripts: BASE
  });
}
/* ---------- Corrections et mises à jour ---------- */
function correctionsPage(C) {
  const p = FIXED[C.lang].corrections; C.rootRel = rootRelOf(p); const r = C.rootRel;
  const rows = [];
  for (const ed of EDS[C.lang].slice().reverse()) for (const s of ed.essentials) for (const u of s.updates || []) rows.push({ ed, s, u });
  rows.sort((a, b) => b.u.time.localeCompare(a.u.time));
  const list = rows.map(({ ed, s, u }) => `
    <li><a href="${r}${storyPath(C.lang, ed.date, s.slug)}#maj">
      <time datetime="${esc(u.time)}">${C.t(C.dmy(u.time.slice(0, 10)))} · ${C.t(C.hour(u.time))}</time>
      <span class="h">${flag(s.id, r)}${C.t(s.title)}</span>
      <span class="p">${C.t(u.text)}</span>
    </a></li>`).join('');
  return page(C, {
    path: p, alt: { fr: FIXED.fr.corrections, en: FIXED.en.corrections }, title: esc(C.S.correctionsTitle + ' — Diurna'), desc: C.t(C.S.correctionsDesc),
    jsonld: [crumbs([['Diurna', FIXED[C.lang].home], [C.S.correctionsTitle, p]])],
    body: `<main class="page">
  <h1>${C.S.correctionsTitle}</h1>
  <p class="chapo">${C.t(C.S.correctionsChapo)}</p>
  ${list ? `<ul class="archive">${list}
  </ul>` : `<p>${C.t(C.S.correctionsNone)}</p>`}
  <p class="more-links"><a href="https://github.com/${REPO}/issues/new?template=erreur.yml" rel="noopener" target="_blank">${C.S.reportError}</a><a href="${r}${FIXED[C.lang].method}">${C.S.navMethod}</a></p>
</main>`, scripts: BASE
  });
}

// Heures de publication (première construction où l'édition apparaît), tenues dans data/history.json.
const HISTORY = readJ('data/history.json', {});
function trackHistory() {
  const now = new Date().toISOString();
  const fr = LATEST.fr, en = LATEST.en;
  if (fr) { const h = (HISTORY[fr.date] = HISTORY[fr.date] || {}); if (!h.fr) h.fr = now; }
  if (en) { const h = (HISTORY[en.date] = HISTORY[en.date] || {}); if (!h.en) h.en = now; }
  // Révision du soir : la dernière mise à jour datée des sujets du jour.
  if (fr) {
    const last = fr.essentials.flatMap((s) => s.updates || []).map((u) => u.time).sort().pop();
    const h = HISTORY[fr.date];
    if (last && (!h.evening || last > h.evening)) h.evening = last;
  }
  const keep = Object.keys(HISTORY).sort().slice(-60);
  const out = Object.fromEntries(keep.map((k) => [k, HISTORY[k]]));
  wr('data/history.json', JSON.stringify(out, null, 1) + '\n');
  return out;
}
function statusData() {
  const fr = LATEST.fr, en = LATEST.en;
  const mk = readJ('data/markets.json', {}), ind = readJ('data/indicators.json', {}), al = readJ('data/alerts.json', null);
  const e = (x) => (x ? { date: x.date, number: x.number, updated: x.updated } : null);
  return {
    built: new Date().toISOString(), sha: (process.env.BUILD_SHA || '').slice(0, 7) || null,
    edition: { fr: e(fr), en: e(en) },
    data: { markets: mk.updated || null, indicators: ind.updated || null },
    alert: al && al.errors && al.errors.length ? { date: al.date, run: al.run, count: al.errors.length } : null,
    history: trackHistory()
  };
}
function status(C, st) {
  const p = FIXED[C.lang].status; C.rootRel = rootRelOf(p);
  const fHm = new Intl.DateTimeFormat(C.S.locale, { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Paris' });
  const when = (iso) => (iso ? C.t(fHm.format(new Date(iso))) : C.S.stNone);
  const ed = (x) => (x ? `${C.t(C.L('no', { n: x.number }))} · ${C.t(C.longDate(x.date))} · ${C.t(C.L('updated', { h: C.hour(x.updated) }))}` : C.S.stNone);
  const rows = [[C.S.stFr, ed(st.edition.fr)], [C.S.stEn, ed(st.edition.en)], [C.S.stData, st.data.markets ? C.t(C.dmy(st.data.markets)) : C.S.stNone], [C.S.stBuild, `${when(st.built)}${st.sha ? ` · <code>${st.sha}</code>` : ''}`]];
  if (st.alert) rows.push([C.S.stAlert, `${when(st.alert.date)} · <a href="${esc(st.alert.run)}" rel="noopener">GitHub</a>`]);
  const hm = (iso) => (iso ? C.t(C.hour(iso)) : '—');
  const hist = Object.keys(st.history || {}).sort().reverse().slice(0, 7).map((d) => { const h = st.history[d]; return `<tr><th scope="row">${C.t(C.dm(d))}</th><td>${hm(h.fr)}</td><td>${hm(h.en)}</td><td>${h.evening ? hm(h.evening) : C.t(C.S.stNoEvening)}</td></tr>`; }).join('');
  return page(C, {
    path: p, alt: { fr: FIXED.fr.status, en: FIXED.en.status }, title: esc(C.S.statusTitle + ' — Diurna'), desc: C.t(C.S.statusDesc), noindex: true,
    body: `<main class="page">
  <h1>${C.S.statusTitle}</h1>
  <p class="chapo" id="stLine" data-fr="${st.edition.fr ? st.edition.fr.date : ''}">${C.t(C.S.statusDesc)}</p>
  <dl class="status">${rows.map(([k, v]) => `<div><dt>${C.t(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>
  ${hist ? `<h2>${C.S.stHistory}</h2>
  <div class="table-wrap"><table class="hist"><thead><tr><th scope="col">${C.S.stDay}</th><th scope="col">${C.S.stMorning}</th><th scope="col">${C.S.stEnglish}</th><th scope="col">${C.S.stEvening}</th></tr></thead><tbody>${hist}</tbody></table></div>` : ''}
  <p>${C.t(C.S.stWatch)}</p>
</main>`, scripts: BASE,
    after: `<script>(function(){var d=document.getElementById('stLine').dataset.fr,n=new Date(),f=function(x){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris'}).format(x)},h=+new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',hourCycle:'h23'}).format(n),t=h<8?f(new Date(n-864e5)):f(n);document.getElementById('stLine').textContent=d>=t?${JSON.stringify(C.S.stOk)}:${JSON.stringify(C.S.stLate)};})();</script>`
  });
}

/* ---------- Flux RSS et Atom : tout, par langue, par dossier ---------- */
const xesc = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
function feedItems(lang, filter) {
  const C = makeCtx(lang), out = [];
  for (const ed of EDS[lang].slice().reverse()) {
    ed.essentials.forEach((s) => {
      if (filter && !filter(s)) return;
      const url = `${abs}/${storyPath(lang, ed.date, s.slug)}`;
      const html = `<p><strong>${esc(C.typo(s.standfirst))}</strong></p><p>${esc((s.body || []).map(C.typo).join(' '))}</p><p><em>${esc(C.typo(C.S.aiLabel))}.</em></p>`;
      out.push({ lang, url, title: C.typo(s.title), html, section: s.section, dossier: s.dossier && s.dossier.title, date: `${ed.date}T07:00:00+01:00`, updated: ed.updated, img: ogFor(lang, ed.date, s.rank) });
    });
  }
  return out;
}
function rss({ title, desc, home, self, lang, items }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>${xesc(title)}</title>
<link>${xesc(home)}</link>
<description>${xesc(desc)}</description>
<language>${lang}</language>
<atom:link href="${xesc(self)}" rel="self" type="application/rss+xml"/>
<image><url>${abs}/icons/icon-192.png</url><title>${xesc(title)}</title><link>${xesc(home)}</link></image>
${items[0] ? `<lastBuildDate>${new Date(items[0].updated).toUTCString()}</lastBuildDate>` : ''}
${items.map((i) => `<item>
<title>${xesc(i.title)}</title>
<link>${xesc(i.url)}</link>
<guid isPermaLink="true">${xesc(i.url)}</guid>
<pubDate>${new Date(i.date).toUTCString()}</pubDate>
<category>${xesc(i.section)}</category>${i.dossier ? `\n<category>${xesc(i.dossier)}</category>` : ''}
<description>${xesc(i.html)}</description>${i.img ? `\n<media:content url="${xesc(i.img)}" medium="image" type="image/jpeg" width="1200" height="630"/>` : ''}
</item>`).join('\n')}
</channel>
</rss>
`;
}
function atom({ title, desc, home, self, lang, items }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${lang}">
<title>${xesc(title)}</title>
<subtitle>${xesc(desc)}</subtitle>
<id>${xesc(self)}</id>
<link rel="self" type="application/atom+xml" href="${xesc(self)}"/>
<link rel="alternate" type="text/html" href="${xesc(home)}"/>
<updated>${new Date(items[0] ? items[0].updated : NOW).toISOString()}</updated>
<author><name>Diurna</name><uri>${abs}/</uri></author>
<icon>${abs}/icons/icon-192.png</icon>
${items.map((i) => `<entry xml:lang="${i.lang}">
<title>${xesc(i.title)}</title>
<link rel="alternate" type="text/html" href="${xesc(i.url)}"/>
<id>${xesc(i.url)}</id>
<published>${new Date(i.date).toISOString()}</published>
<updated>${new Date(i.updated).toISOString()}</updated>
<category term="${xesc(i.section)}"/>
<content type="html">${xesc(i.html)}</content>
</entry>`).join('\n')}
</feed>
`;
}
const FEED_MAX = 60;
function writeFeeds() {
  const list = [];
  const both = (base, meta) => {
    wr(base + 'feed.xml', rss({ ...meta, self: `${abs}/${base}feed.xml` }));
    wr(base + 'atom.xml', atom({ ...meta, self: `${abs}/${base}atom.xml` }));
    list.push(base + 'feed.xml', base + 'atom.xml');
  };
  for (const lang of LANGS) {
    const S = I18N[lang], items = feedItems(lang).slice(0, FEED_MAX);
    both(PRE[lang], { title: 'Diurna', desc: S.sub, home: `${abs}/${FIXED[lang].home}`, lang, items });
    for (const [id, its] of COL[lang].byDossier) {
      const t = its[its.length - 1].dossier.title;
      both(dossierPath(lang, id), { title: `Diurna — ${makeCtx(lang).typo(t)}`, desc: makeCtx(lang).L('dossierDesc', { x: t }), home: `${abs}/${dossierPath(lang, id)}`, lang, items: feedItems(lang, (s) => s.dossier && s.dossier.id === id).slice(0, FEED_MAX) });
    }
  }
  const all = [...feedItems('fr'), ...feedItems('en')].sort((a, b) => b.date.localeCompare(a.date) || a.lang.localeCompare(b.lang)).slice(0, FEED_MAX * 2);
  wr('all.xml', rss({ title: 'Diurna (FR + EN)', desc: `${I18N.fr.sub} / ${I18N.en.sub}`, home: `${abs}/`, self: `${abs}/all.xml`, lang: 'fr', items: all }));
  wr('all.atom.xml', atom({ title: 'Diurna (FR + EN)', desc: `${I18N.fr.sub} / ${I18N.en.sub}`, home: `${abs}/`, self: `${abs}/all.atom.xml`, lang: 'fr', items: all }));
  list.push('all.xml', 'all.atom.xml');
  return list;
}

/* ---------- Sitemaps et robots ---------- */
function sitemaps(all) {
  const urlTag = (u) => {
    const alts = u.alt && u.alt.fr != null && u.alt.en != null
      ? ['fr', 'en'].map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${abs}/${u.alt[l]}"/>`).join('') + `<xhtml:link rel="alternate" hreflang="x-default" href="${abs}/${u.alt.fr}"/>`
      : '';
    return `<url><loc>${abs}/${u.path}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}${alts}</url>`;
  };
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${all.map(urlTag).join('\n')}\n</urlset>\n`;
  const recent = all.filter((u) => u.news && NOW - Date.parse(u.news.date) <= 48 * 3600e3);
  const news = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${recent.map((u) => `<url><loc>${abs}/${u.path}</loc><news:news><news:publication><news:name>Diurna</news:name><news:language>${u.news.lang}</news:language></news:publication><news:publication_date>${u.news.date}</news:publication_date><news:title>${esc(u.news.title)}</news:title></news:news></url>`).join('\n')}\n</urlset>\n`;
  const robots = `# Diurna\nUser-agent: *\nAllow: /\n\nSitemap: ${abs}/sitemap.xml\nSitemap: ${abs}/news-sitemap.xml\n`;
  return { sitemap, news, robots };
}

/* ---------- Manifeste anglais et service worker ---------- */
function manifestEn() {
  const fr = JSON.parse(rd('manifest.webmanifest'));
  return JSON.stringify({ ...fr, description: I18N.en.sub, lang: 'en', start_url: './', scope: './', icons: fr.icons.map((i) => ({ ...i, src: '../' + i.src })), shortcuts: [{ name: 'Today’s edition', url: 'edition/' }, { name: 'Archive', url: 'archives/' }] }, null, 2) + '\n';
}
function sw(pages) {
  const shell = [...pages.map((p) => p || './'), 'manifest.webmanifest', 'en/manifest.webmanifest', 'icons/favicon.svg', ...assetFiles.map((f) => f.startsWith('assets/fonts/') || f === 'assets/world.json' ? f : `${f}?v=${V}`)];
  return `// Généré par tools/build.mjs — ne pas modifier à la main.
const CACHE = 'diurna-${V}';
const SHELL = ${JSON.stringify(shell)};
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const url = new URL(req.url);
  if (req.mode === 'navigate' || url.pathname.includes('/data/')) {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then((r) => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
});
`;
}

/* ---------- Génération ---------- */
const ST = statusData();
wr('status.json', JSON.stringify(ST, null, 1) + '\n');
const SM = []; // entrées du sitemap
const routes = { fr: {}, en: {} };
let count = 0;
for (const lang of LANGS) {
  const C = makeCtx(lang);
  for (const ed of EDS[lang]) {
    routes[lang][ed.date] = { bref: datePath(lang, ed.date) };
    for (const rank of [...ed.essentials.map((s) => s.rank), 'bref']) {
      const { path: p, html } = readerPage(C, ed, rank);
      wr(p + 'index.html', html); count++;
      const s = rank === 'bref' ? null : ed.essentials.find((x) => x.rank === rank);
      if (s) routes[lang][ed.date][rank] = p;
      const otherEd = BYDATE[OTHER[lang]].get(ed.date);
      const os = otherEd && s ? otherEd.essentials.find((x) => x.rank === rank) : null;
      SM.push({ path: p, lastmod: ed.updated.slice(0, 10), alt: otherEd ? { [lang]: p, [OTHER[lang]]: s ? (os ? storyPath(OTHER[lang], ed.date, os.slug) : null) : datePath(OTHER[lang], ed.date) } : null, news: s ? { lang, date: ed.updated, title: C.typo(s.title) } : null });
    }
  }
  const P = FIXED[lang];
  C.rootRel = '';
  wr(P.home + 'index.html', home(C));
  wr(P.globe + 'index.html', globeRedirect(C));
  wr(P.archives + 'index.html', archives(C));
  wr(P.method + 'index.html', method(C));
  wr(P.status + 'index.html', status(C, ST));
  wr(P.search + 'index.html', searchPage(C));
  wr(P.corrections + 'index.html', correctionsPage(C)); SM.push({ path: P.corrections, alt: { fr: FIXED.fr.corrections, en: FIXED.en.corrections } });
  for (const key of ['about', 'legal', 'privacy', 'credits']) { wr(P[key] + 'index.html', infoPage(C, key)); SM.push({ path: P[key], alt: { fr: FIXED.fr[key], en: FIXED.en[key] } }); }
  wr(dataOf(lang, 'search.json'), JSON.stringify(searchIndex(lang)));
  SM.push({ path: P.home, lastmod: latestOf(lang).updated.slice(0, 10), alt: { fr: FIXED.fr.home, en: FIXED.en.home } });
  SM.push({ path: P.archives, alt: { fr: FIXED.fr.archives, en: FIXED.en.archives } }, { path: P.method, alt: { fr: FIXED.fr.method, en: FIXED.en.method } });
  wr(countriesIndex(lang) + 'index.html', countriesPage(C)); wr(dossiersIndex(lang) + 'index.html', dossiersPage(C));
  SM.push({ path: countriesIndex(lang), alt: { fr: countriesIndex('fr'), en: countriesIndex('en') } }, { path: dossiersIndex(lang), alt: { fr: dossiersIndex('fr'), en: dossiersIndex('en') } });
  for (const [id, items] of COL[lang].byCountry) { const pg = countryPage(C, id, items); const p = countryPath(lang, cslug(lang, id)); wr(p + 'index.html', pg); SM.push({ path: p, alt: COL[OTHER[lang]].byCountry.has(id) ? { [lang]: p, [OTHER[lang]]: countryPath(OTHER[lang], cslug(OTHER[lang], id)) } : null }); count++; }
  for (const [id, items] of COL[lang].byDossier) { const p = dossierPath(lang, id); wr(p + 'index.html', dossierPage(C, id, items)); SM.push({ path: p, alt: dossierAlt(lang, id) ? { [lang]: p, [OTHER[lang]]: dossierAlt(lang, id) } : null }); count++; }
}
wr('data/routes.json', JSON.stringify(routes));
const FEEDS = writeFeeds();
const { sitemap, news, robots } = sitemaps(SM);
wr('sitemap.xml', sitemap); wr('news-sitemap.xml', news); wr('robots.txt', robots);
wr('en/manifest.webmanifest', manifestEn());
const shellPages = [FIXED.fr.home, FIXED.en.home, editionHome('fr'), editionHome('en'), FIXED.fr.archives, FIXED.en.archives, FIXED.fr.method, FIXED.en.method];
wr('sw.js', sw([...new Set(shellPages)]));
console.log(`Pages générées (assets ${V}) — ${count} pages d'édition, pays et dossiers ; FR : ${LATEST.fr.date}${LATEST.en ? `, EN : ${LATEST.en.date}` : ''} ; sitemap : ${SM.length} adresses ; ${FEEDS.length} flux.`);
