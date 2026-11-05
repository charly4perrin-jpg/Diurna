// Génère les pages HTML à partir des données : node tools/build.mjs
// À lancer après chaque nouvelle édition (après tools/validate.mjs).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const wr = (p, s) => { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), s); };
const site = JSON.parse(rd('site.json'));
const ed = JSON.parse(rd('data/latest.json'));
const index = JSON.parse(rd('data/index.json'));

/* ---------- utilitaires texte ---------- */
const fr = (s) => String(s ?? '').replace(/'/g, '’').replace(/ ([?!;])/g, ' $1').replace(/ :/g, ' :').replace(/« /g, '« ').replace(/ »/g, ' »');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const t = (s) => esc(fr(s));
const utc = (d) => { const p = String(d).split('-').map(Number); return Date.UTC(p[0], (p[1] || 1) - 1, p[2] || 1); };
const fLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const fDm = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fDmy = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const longDate = (d) => cap(fLong.format(utc(d)));

/* ---------- empreinte des fichiers statiques (cache) ---------- */
const assetFiles = [
  'assets/css/site.css', 'assets/js/common.js', 'assets/js/globe.js', 'assets/js/home.js', 'assets/js/reader.js',
  'assets/vendor/d3-array.min.js', 'assets/vendor/d3-geo.min.js', 'assets/vendor/topojson-client.min.js', 'assets/world.json',
  ...fs.readdirSync(path.join(root, 'assets/fonts')).map((f) => 'assets/fonts/' + f)
];
const hash = crypto.createHash('sha1');
assetFiles.forEach((f) => hash.update(fs.readFileSync(path.join(root, f))));
const V = hash.digest('hex').slice(0, 10);

const ICON = {
  right: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  plus: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
  recenter: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
  install: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>'
};
const MARK = '<svg viewBox="0 0 30 22" aria-hidden="true"><rect x="0" y="1" width="30" height="4" rx="2" fill="#F3EFE7"/><rect x="0" y="9" width="22" height="4" rx="2" fill="#F3EFE7"/><rect x="0" y="17" width="14" height="4" rx="2" fill="#FF6A4D"/></svg>';

function head({ rootRel, title, desc, cls = '' }) {
  const abs = (site.url || '').replace(/\/$/, '');
  return `<!doctype html>
<html lang="fr"${cls ? ` class="${cls}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="theme-color" content="#060B1C">
<link rel="manifest" href="${rootRel}manifest.webmanifest">
<link rel="icon" href="${rootRel}icons/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${rootRel}icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Trois Phrases">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Trois Phrases">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
${abs ? `<meta property="og:image" content="${abs}/og.png">\n<meta name="twitter:card" content="summary_large_image">` : ''}
<link rel="preload" href="${rootRel}assets/fonts/bodoni-moda-latin-standard-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${rootRel}assets/fonts/newsreader-latin-standard-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${rootRel}assets/css/site.css?v=${V}">
</head>
<body data-root="${rootRel}">`;
}

function header(rootRel, current) {
  const a = (href, label, key, opt) => `<a href="${rootRel}${href}"${opt ? ' class="opt"' : ''}${current === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `
<header class="site-head">
  <a class="mark" href="${rootRel}">${MARK}<span class="mark-name">Trois <em>Phrases</em></span></a>
  <nav class="nav" aria-label="Navigation principale">
    ${a('globe/', 'Le globe', 'globe')}
    ${a('archives/', 'Archives', 'archives', true)}
    ${a('methode/', 'Méthode', 'methode')}
    <button class="install" type="button" hidden>${ICON.install}Installer l’appli</button>
  </nav>
</header>`;
}

function footer(rootRel) {
  return `
<footer class="site-foot">
  <p>${t("Trois Phrases — l'actualité du monde, chaque matin, en cinq sujets.")}</p>
  <nav aria-label="Pied de page"><a href="${rootRel}archives/">Archives</a><a href="${rootRel}methode/">Méthode</a></nav>
</footer>`;
}

const scripts = (rootRel, list) => list.map((s) => `<script src="${rootRel}${s}?v=${V}"></script>`).join('\n');
const VENDOR = ['assets/vendor/d3-array.min.js', 'assets/vendor/d3-geo.min.js', 'assets/vendor/topojson-client.min.js', 'assets/js/common.js', 'assets/js/globe.js'];

/* ---------- Accueil ---------- */
function home() {
  const summary = ed.essentials.map((s) => `
      <li class="c${s.rank}"><a href="globe/#${s.rank}">
        <span class="n" aria-hidden="true">${s.rank}</span>
        <span class="place">${t(s.place)}</span>
        <span class="title">${t(s.title)}</span>
        ${s.radar ? `<span class="tag">Loin des caméras</span>` : ''}
      </a></li>`).join('');
  const brief = (ed.brief || []).map((b) => `
        <li><b>${t(b.place)}</b><span>${b.url ? `<a href="${esc(b.url)}" target="_blank" rel="noopener">${t(b.text)}</a>` : t(b.text)}</span></li>`).join('');
  const agenda = (ed.agenda || []).map((a) => `
        <li><time datetime="${esc(a.d)}">${esc(fDm.format(utc(a.d)))}</time><span>${t(a.t)}</span></li>`).join('');
  const title = 'Trois Phrases — ' + fr(ed.headline);
  return `${head({ rootRel: '', title: esc(title), desc: t(ed.lede) })}
${header('', 'home')}
<main>
  <section class="cover">
    <div class="cover-text">
      <h1 class="rise">${t(ed.headline)}</h1>
      <p class="lede rise rise-2">${t(ed.lede)}</p>
      <p class="edition-line rise rise-3"><span class="num">N° ${ed.number}</span><b>${t(longDate(ed.date))}</b><span>${t('5 sujets · 3 minutes de lecture')}</span></p>
      <div class="actions rise rise-4">
        <a class="btn" href="globe/">Ouvrir le globe${ICON.right}</a>
        <a class="link-quiet" href="#sommaire">Voir les cinq sujets</a>
      </div>
    </div>
    <div class="cover-globe" id="coverGlobe"></div>
  </section>
  <section class="band" id="sommaire" aria-labelledby="h-sommaire">
    <h2 class="band-h" id="h-sommaire">Les cinq essentiels</h2>
    <ol class="summary">${summary}
    </ol>
    <div class="duo">
      <section aria-labelledby="h-bref">
        <h2 class="band-h" id="h-bref">En bref</h2>
        <ul class="brief">${brief}
        </ul>
      </section>
      <section aria-labelledby="h-agenda">
        <h2 class="band-h" id="h-agenda">À venir</h2>
        <ul class="agenda">${agenda}
        </ul>
      </section>
    </div>
  </section>
</main>
${footer('')}
${scripts('', [...VENDOR, 'assets/js/home.js'])}
</body>
</html>
`;
}

/* ---------- Globe ---------- */
function globePage() {
  return `${head({ rootRel: '../', title: esc('Le globe — Trois Phrases'), desc: t(ed.lede), cls: 'reader-page' })}
${header('../', 'globe')}
<main class="reader">
  <h1 class="sr" id="edTitle">${t(ed.headline)}</h1>
  <section class="stage" aria-label="Globe">
    <div class="stage-globe" id="globe"></div>
    <p class="stage-note">${t('Fais tourner le globe et touche un numéro pour lire le sujet.')}</p>
    <div class="zoom">
      <button id="zin" type="button" aria-label="Zoomer">${ICON.plus}</button>
      <button id="zout" type="button" aria-label="Dézoomer">${ICON.minus}</button>
      <button id="zre" type="button" aria-label="Recentrer">${ICON.recenter}</button>
    </div>
  </section>
  <section class="panel" id="panel" aria-label="Lecture de l'édition">
    <p class="edition-line ed-line" id="edLine"><span class="num">N° ${ed.number}</span><span>${t(longDate(ed.date))}</span></p>
    <nav class="steps" id="steps" aria-label="Sujets de l'édition"></nav>
    <article class="read" id="read" aria-live="polite">
      <div class="loading"><div class="sk big"></div><div class="sk"></div><div class="sk"></div><div class="sk" style="width:70%"></div></div>
    </article>
    <div class="pager"><button class="prev" id="prev" type="button" disabled></button><button class="next" id="next" type="button" disabled></button></div>
  </section>
</main>
${scripts('../', [...VENDOR, 'assets/js/reader.js'])}
</body>
</html>
`;
}

/* ---------- Archives ---------- */
function archives() {
  const rows = index.map((e, i) => `
    <li><a href="../globe/${i === 0 ? '' : '?d=' + e.date}">
      <time datetime="${e.date}">${t(cap(fDmy.format(utc(e.date))))}</time>
      <span class="h">${t(e.headline)}</span>
      <span class="p">${(e.places || []).map((p, j) => `<span class="c${j + 1}">${t(p)}</span>`).join('')}</span>
    </a></li>`).join('');
  return `${head({ rootRel: '../', title: esc('Archives — Trois Phrases'), desc: t('Toutes les éditions de Trois Phrases, jour après jour.') })}
${header('../', 'archives')}
<main class="page">
  <h1>Archives</h1>
  <p class="intro">${t("Chaque édition reste consultable telle qu'elle a été publiée ce jour-là, globe compris.")}</p>
  <ul class="archive">${rows}
  </ul>
</main>
${footer('../')}
${scripts('../', ['assets/js/common.js'])}
</body>
</html>
`;
}

/* ---------- Méthode ---------- */
function methode() {
  const p = (s) => `<p>${t(s)}</p>`;
  return `${head({ rootRel: '../', title: esc('Méthode — Trois Phrases'), desc: t('Comment chaque édition de Trois Phrases est choisie, écrite et mise à jour.') })}
${header('../', 'methode')}
<main class="page">
  <h1>Comment c'est fait</h1>
  <p class="intro">${t("Trois Phrases sert à suivre le monde sans y passer une heure : cinq sujets par jour, trois phrases chacun, et la carte pour voir où ça se passe.")}</p>

  <h2>Le choix des sujets</h2>
  ${p("Un sujet entre dans l'édition quand il fait la une d'au moins trois grandes rédactions internationales : Reuters, Associated Press, AFP, BBC, Le Monde, The Economist, Al Jazeera, The New York Times, Financial Times, France 24, The Guardian ou NPR.")}
  ${p("On garde ce qui change quelque chose cette semaine : un vote, une décision, des combats, un prix, une date. Les tendances de fond attendent qu'un événement les remette au premier plan.")}
  ${p("Le cinquième sujet est toujours « loin des caméras » : une crise grave dont on parle peu en France.")}

  <h2>L'écriture</h2>
  ${p("Chaque sujet tient en trois phrases : ce qui se passe, pourquoi, et la suite. Les chiffres et les accusations sont attribués à ceux qui les avancent, et chaque sujet renvoie aux articles qui ont servi à l'écrire.")}

  <h2>La fabrication</h2>
  ${p("Les éditions sont préparées automatiquement chaque matin vers 7 h, et mises à jour le soir si un événement majeur survient. Un modèle d'intelligence artificielle (Claude, d'Anthropic) lit les articles des rédactions citées, sélectionne les sujets et rédige les textes en suivant cette charte. En cas de doute sur un fait, ce sont les sources liées sous chaque sujet qui font foi.")}

  <h2>Installer l'appli</h2>
  <ul>
    <li><strong>${t('Android, Chrome ou Edge')}</strong>${t(' : bouton « Installer l\'appli » en haut de la page, ou menu du navigateur, puis « Installer ».')}</li>
    <li><strong>iPhone</strong>${t(' : dans Safari, bouton Partager, puis « Sur l\'écran d\'accueil ».')}</li>
  </ul>
</main>
${footer('../')}
${scripts('../', ['assets/js/common.js'])}
</body>
</html>
`;
}

/* ---------- Service worker ---------- */
function sw() {
  const shell = ['./', 'globe/', 'archives/', 'methode/', 'manifest.webmanifest', 'icons/favicon.svg',
    ...assetFiles.map((f) => f.startsWith('assets/fonts/') || f === 'assets/world.json' ? f : `${f}?v=${V}`)];
  return `// Généré par tools/build.mjs — ne pas modifier à la main.
const CACHE = 'tp-${V}';
const SHELL = ${JSON.stringify(shell)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const url = new URL(req.url);
  const fresh = req.mode === 'navigate' || url.pathname.includes('/data/');
  if (fresh) {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
    return res;
  })));
});
`;
}

wr('index.html', home());
wr('globe/index.html', globePage());
wr('archives/index.html', archives());
wr('methode/index.html', methode());
wr('sw.js', sw());
console.log(`Pages générées (assets ${V}) pour l'édition du ${ed.date}.`);
