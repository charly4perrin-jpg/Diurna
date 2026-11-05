// Génère les pages HTML, en français et en anglais, à partir des données : node tools/build.mjs
// À lancer après chaque nouvelle édition (après tools/validate.mjs).
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
const abs = (site.url || '').replace(/\/$/, '');

const LANGS = ['fr', 'en'];
const OTHER = { fr: 'en', en: 'fr' };
const PATHS = {
  fr: { home: '', edition: 'globe/', archives: 'archives/', method: 'methode/', status: 'status/' },
  en: { home: 'en/', edition: 'en/edition/', archives: 'en/archives/', method: 'en/method/', status: 'en/status/' }
};
const rootRelOf = (p) => '../'.repeat(p.split('/').filter(Boolean).length);
const dataOf = (lang, p) => (lang === 'en' ? `data/en/${p}` : `data/${p}`);

/* ---------- empreinte des fichiers statiques (cache) ---------- */
const assetFiles = [
  'assets/css/site.css', 'assets/js/i18n.js', 'assets/js/common.js', 'assets/js/globe.js', 'assets/js/home.js', 'assets/js/reader.js', 'assets/js/modules.js',
  'assets/vendor/d3-array.min.js', 'assets/vendor/d3-geo.min.js', 'assets/vendor/topojson-client.min.js', 'assets/world.json',
  ...fs.readdirSync(path.join(root, 'assets/fonts')).map((f) => 'assets/fonts/' + f)
].filter(exists);
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
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const utc = (d) => { const p = String(d).split('-').map(Number); return Date.UTC(p[0], (p[1] || 1) - 1, p[2] || 1); };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- Tout ce qui dépend de la langue ---------- */
function makeCtx(lang) {
  const S = I18N[lang];
  const L = (k, v) => String(S[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => (v && v[x] !== undefined ? v[x] : ''));
  const typo = (s) => {
    s = String(s ?? '').replace(/'/g, '’');
    if (lang !== 'fr') return s;
    return s.replace(/ ([?!;])/g, ' $1').replace(/ :/g, ' :').replace(/« /g, '« ').replace(/ »/g, ' »');
  };
  const t = (s) => esc(typo(s));
  const loc = S.locale;
  const fLong = new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const fDm = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const fDmy = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const fHm = new Intl.DateTimeFormat(loc, { hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Paris' });
  const hour = (iso) => { const h = fHm.format(new Date(iso)); return lang === 'fr' ? h.replace(':', ' h ') : h; };
  const cname = (id, fallback) => { const c = countries[id]; return c ? (lang === 'en' && c.en ? c.en.name : c.name) : fallback; };
  let ed = readJ(dataOf(lang, 'latest.json'), null);
  const fallback = !ed;
  if (!ed) ed = readJ('data/latest.json', null);
  return { lang, S, L, t, typo, longDate: (d) => cap(fLong.format(utc(d))), dm: (d) => fDm.format(utc(d)), dmy: (d) => cap(fDmy.format(utc(d))), hour, cname, ed, fallback };
}

const flag = (id, rootRel) => { const c = countries[id]; return c && c.flag ? `<img class="flag" src="${rootRel}assets/flags/${c.flag}" alt="" width="20" height="15" loading="lazy" decoding="async">` : ''; };

function head(C, key, { title, desc, cls = '' }) {
  const p = PATHS[C.lang][key], rootRel = rootRelOf(p), other = OTHER[C.lang];
  const alt = rootRel + PATHS[other][key];
  const og = C.lang === 'en' ? 'og-en.png' : 'og.png';
  const manifest = C.lang === 'en' ? 'en/manifest.webmanifest' : 'manifest.webmanifest';
  return `<!doctype html>
<html lang="${C.lang}"${cls ? ` class="${cls}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title>
<script>(function(){try{var s=localStorage.getItem('tp.lang');if(s===null){var w=(navigator.language||'fr').slice(0,2).toLowerCase()==='fr'?'fr':'en';localStorage.setItem('tp.lang',JSON.stringify(w));if(w!=='${C.lang}'&&!/bot|crawl|spider|slurp|preview/i.test(navigator.userAgent))location.replace('${alt}'+location.search+location.hash);}}catch(e){}})();</script>
<meta name="description" content="${desc}">
<meta name="theme-color" content="#070C1D">
${abs ? `<link rel="canonical" href="${abs}/${p}">
<link rel="alternate" hreflang="fr" href="${abs}/${PATHS.fr[key]}">
<link rel="alternate" hreflang="en" href="${abs}/${PATHS.en[key]}">
<link rel="alternate" hreflang="x-default" href="${abs}/${PATHS.fr[key]}">` : ''}
<link rel="manifest" href="${rootRel}${manifest}">
<link rel="icon" href="${rootRel}icons/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${rootRel}icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Diurna">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Diurna">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:locale" content="${C.S.og}">
<meta property="og:locale:alternate" content="${I18N[other].og}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
${abs ? `<meta property="og:url" content="${abs}/${p}">
<meta property="og:image" content="${abs}/${og}">
<meta name="twitter:image" content="${abs}/${og}">
<meta property="og:image:alt" content="Diurna — ${esc(C.S.sub)}">` : ''}
<link rel="preload" href="${rootRel}assets/fonts/newsreader-latin-standard-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${rootRel}assets/css/site.css?v=${V}">
</head>
<body data-root="${rootRel}">`;
}

function header(C, key) {
  const rootRel = rootRelOf(PATHS[C.lang][key]);
  const P = PATHS[C.lang], other = OTHER[C.lang];
  const a = (k, label, opt) => `<a href="${rootRel}${P[k]}"${opt ? ' class="opt"' : ''}${key === k ? ' aria-current="page"' : ''}>${label}</a>`;
  return `
<header class="site-head">
  <a class="mark" href="${rootRel}${P.home}" aria-label="${esc(C.S.home)}"><span class="mark-name" aria-hidden="true">DIURNA<span class="mark-dot">.</span></span><span class="mark-sub">${C.t(C.S.sub)}</span></a>
  <nav class="nav" aria-label="${esc(C.S.navMain)}">
    ${a('edition', C.S.navEdition)}
    ${a('archives', C.S.navArchives, true)}
    ${a('method', C.S.navMethod)}
    <span class="langs"><span class="lang-self" aria-current="true">${C.S.langSelf}</span><a class="lang" href="${rootRel}${PATHS[other][key]}" hreflang="${other}" lang="${other}" aria-label="${esc(C.S.langSwitch)}">${C.S.langOther}</a></span>
    <button class="install" type="button" hidden>${ICON.install}${C.S.install}</button>
  </nav>
</header>`;
}

function footer(C, key) {
  const rootRel = rootRelOf(PATHS[C.lang][key]), P = PATHS[C.lang];
  return `
<footer class="site-foot">
  <p><span class="foot-name">DIURNA<span class="mark-dot">.</span></span> ${C.t(C.S.sub)}</p>
  <nav aria-label="${esc(C.S.navFoot)}"><a href="${rootRel}${P.archives}">${C.S.navArchives}</a><a href="${rootRel}${P.method}">${C.S.navMethod}</a><a href="${rootRel}${P.status}">${C.S.navStatus}</a></nav>
</footer>`;
}

const scripts = (rootRel, list) => list.map((s) => `<script src="${rootRel}${s}?v=${V}"></script>`).join('\n');
const BASE = ['assets/js/i18n.js', 'assets/js/common.js'];
const VENDOR = ['assets/vendor/d3-array.min.js', 'assets/vendor/d3-geo.min.js', 'assets/vendor/topojson-client.min.js', ...BASE, 'assets/js/globe.js'];

/* ---------- Accueil ---------- */
function home(C) {
  const { ed, t, L } = C, key = 'home', rootRel = rootRelOf(PATHS[C.lang][key]);
  const editionHref = rootRel + PATHS[C.lang].edition;
  const rubric = (s) => `<p class="rubric"><span class="rank">${s.rank}</span>${flag(s.id, rootRel)}${t(C.cname(s.id, s.place))}${s.radar ? `<span class="radar">${C.S.radar}</span>` : ''}</p>`;
  const summary = ed.essentials.map((s) => `
      <li class="c${s.rank}"><a href="${editionHref}#${s.rank}">
        ${rubric(s)}
        <span class="title">${t(s.title)}</span>
        <span class="chapo">${t(s.standfirst)}</span>
      </a></li>`).join('');
  const brief = (ed.brief || []).map((b) => `
        <li><b>${flag(b.id, rootRel)}${t(b.place)}</b>${t(b.text)}${b.url ? ` <a href="${esc(b.url)}" target="_blank" rel="noopener">${C.S.source}</a>` : ''}</li>`).join('');
  const agenda = (ed.agenda || []).map((a) => `
        <li><time datetime="${esc(a.d)}">${esc(C.dm(a.d))}</time><span>${t(a.t)}</span></li>`).join('');
  const title = `Diurna — ${C.typo(ed.headline)}`;
  return `${head(C, key, { title: esc(title), desc: t(ed.standfirst) })}
${header(C, key)}
<main${C.fallback ? ' lang="fr"' : ''}>
  ${C.fallback ? `<p class="notice">${t(C.S.notTranslated)}</p>` : ''}
  <section class="cover">
    <div class="cover-text">
      <p class="edition-line rise" data-date="${ed.date}"><b>${L('no', { n: ed.number })}</b><span>${t(C.longDate(ed.date))}</span><span>${t(L('updated', { h: C.hour(ed.updated) }))}</span></p>
      <h1 class="rise rise-2">${t(ed.headline)}</h1>
      <p class="chapo rise rise-3">${t(ed.standfirst)}</p>
      <p class="ai-label rise rise-3">${t(C.S.aiLabel)} · <a href="${rootRel}${PATHS[C.lang].method}">${t(C.S.aiMore)}</a></p>
      <div class="actions rise rise-4">
        <a class="btn" href="${editionHref}">${C.S.readEdition}${ICON.right}</a>
        <a class="link-quiet" href="#sommaire">${C.S.contents}</a>
      </div>
    </div>
    <div class="cover-globe" id="coverGlobe"></div>
  </section>
  <section class="band" id="sommaire" aria-labelledby="h-sommaire">
    <h2 class="band-h" id="h-sommaire">${C.S.fiveStories}</h2>
    <ol class="summary">${summary}
    </ol>
    <div class="duo">
      <section aria-labelledby="h-bref">
        <h2 class="band-h" id="h-bref">${C.S.inBrief}</h2>
        <ul class="brief">${brief}
        </ul>
      </section>
      <section aria-labelledby="h-agenda">
        <h2 class="band-h" id="h-agenda">${C.S.comingUp}</h2>
        <ul class="agenda">${agenda}
        </ul>
      </section>
    </div>
  </section>
</main>
${footer(C, key)}
${scripts(rootRel, [...VENDOR, 'assets/js/home.js'])}
</body>
</html>
`;
}

/* ---------- Édition (globe + lecture) ---------- */
function editionPage(C) {
  const { ed, t, L } = C, key = 'edition', rootRel = rootRelOf(PATHS[C.lang][key]);
  return `${head(C, key, { title: esc(C.typo(ed.headline) + ' — Diurna'), desc: t(ed.standfirst), cls: 'reader-page' })}
${header(C, key)}
<main class="reader">
  <h1 class="sr" id="edTitle">${t(ed.headline)}</h1>
  <section class="stage" aria-label="Globe">
    <div class="stage-globe" id="globe"></div>
    <p class="stage-note">${t(C.S.stageNote)}</p>
    <div class="zoom">
      <button id="zin" type="button" aria-label="${esc(C.S.zoomIn)}">${ICON.plus}</button>
      <button id="zout" type="button" aria-label="${esc(C.S.zoomOut)}">${ICON.minus}</button>
      <button id="zre" type="button" aria-label="${esc(C.S.recentre)}">${ICON.recenter}</button>
    </div>
  </section>
  <section class="panel" id="panel" aria-label="${esc(C.S.panelLabel)}">
    <p class="edition-line ed-line" id="edLine"><b>${L('no', { n: ed.number })}</b><span>${t(C.longDate(ed.date))}</span></p>
    <nav class="steps" id="steps" aria-label="${esc(C.S.stepsLabel)}"></nav>
    <article class="read" id="read" aria-live="polite">
      <div class="loading"><div class="sk big"></div><div class="sk"></div><div class="sk"></div><div class="sk" style="width:70%"></div></div>
    </article>
    <div class="pager"><button class="prev" id="prev" type="button" disabled></button><button class="next" id="next" type="button" disabled></button></div>
  </section>
</main>
${scripts(rootRel, [...VENDOR, 'assets/js/modules.js', 'assets/js/reader.js'])}
</body>
</html>
`;
}

/* ---------- Archives ---------- */
function archives(C) {
  const key = 'archives', rootRel = rootRelOf(PATHS[C.lang][key]);
  const index = readJ('data/index.json', []);
  const rows = index.map((e, i) => {
    const own = C.lang === 'fr' || exists(`data/en/editions/${e.date}.json`);
    const edn = readJ(own ? dataOf(C.lang, `editions/${e.date}.json`) : `data/editions/${e.date}.json`, null);
    const places = edn ? edn.essentials.map((s) => [s.id, C.cname(s.id, s.place)]) : (e.places || []).map((p) => [null, p]);
    const href = own ? `${rootRel}${PATHS[C.lang].edition}${i === 0 ? '' : '?d=' + e.date}` : `${rootRel}${PATHS.fr.edition}?d=${e.date}`;
    const headline = edn ? edn.headline : e.headline;
    return `
    <li><a href="${href}"${own ? '' : ' hreflang="fr"'}>
      <time datetime="${e.date}">${C.t(C.dmy(e.date))}</time>
      <span class="h"${own ? '' : ' lang="fr"'}>${C.t(headline)}</span>
      <span class="p">${places.map(([id, p], j) => `<span class="c${j + 1}">${id ? flag(id, rootRel) : ''}${C.t(p)}</span>`).join('')}${own ? '' : `<em class="fr-only">${C.S.frOnly}</em>`}</span>
    </a></li>`;
  }).join('');
  return `${head(C, key, { title: esc(C.S.archivesTitle + ' — Diurna'), desc: C.t(C.S.archivesDesc) })}
${header(C, key)}
<main class="page">
  <h1>${C.S.archivesTitle}</h1>
  <p class="chapo">${C.t(C.S.archivesChapo)}</p>
  <ul class="archive">${rows}
  </ul>
</main>
${footer(C, key)}
${scripts(rootRel, BASE)}
</body>
</html>
`;
}

/* ---------- Méthode ---------- */
const METHOD = {
  fr: (t) => `
  <h1>Méthode</h1>
  <p class="chapo">${t("Diurna est un quotidien international bref : cinq sujets chaque matin, choisis en croisant les unes des grandes rédactions, et une carte pour les situer.")}</p>

  <section class="origin" aria-labelledby="h-origin">
    <p class="inscr" aria-hidden="true">ACTA<span>·</span>DIVRNA</p>
    <h2 id="h-origin">Pourquoi Diurna</h2>
    <p>${t("En 59 av. J.-C., Jules César, alors consul, fait afficher chaque jour dans les lieux publics de Rome les ")}<em>Acta Diurna</em>${t(", « les actes du jour » : décisions politiques, procès, naissances, mariages et décès. Recopiées et diffusées, ces nouvelles étaient lues, rapporte l'historien Tacite, jusque dans les provinces et les armées. On y voit souvent le premier journal de l'histoire.")}</p>
    <p>${t("Diurna reprend l'idée, deux mille ans plus tard : chaque jour, le monde expliqué en trois phrases.")}</p>
  </section>

  <h2>Le choix des sujets</h2>
  <p>${t("Un sujet entre dans l'édition lorsqu'il est traité en tête par au moins trois rédactions de référence : Reuters, Associated Press, AFP, BBC, Le Monde, The Economist, Al Jazeera, The New York Times, Financial Times, France 24, The Guardian ou NPR.")}</p>
  <p>${t("La priorité va aux faits qui changent la situation dans la semaine : un vote, une décision, des combats, une négociation, une échéance. Les tendances de fond attendent qu'un événement les ramène au premier plan.")}</p>
  <p>${t("Le cinquième sujet, « Loin des caméras », est réservé à une crise grave peu couverte par la presse française : Soudan, République démocratique du Congo, Sahel, Haïti, Birmanie, Yémen. Il change d'une semaine à l'autre.")}</p>

  <h2>L'écriture</h2>
  <p>${t("Chaque sujet suit la forme d'un article court : un titre, un chapô, un paragraphe de trois phrases qui pose le fait, en donne les causes et en ouvre la suite, puis une analyse. Selon la nature de l'actualité (conflit, élection, économie, diplomatie, catastrophe, société), la fiche ajoute des modules : bilan, lieux, résultats, positions des parties, courbes.")}</p>
  <p>${t("Les chiffres, accusations et revendications sont attribués à ceux qui les avancent. Un module ne s'affiche que si ses données sont sourcées. Les textes sont rédigés à partir des sources citées, sans reprise de leurs phrases.")}</p>

  <h2>Les données</h2>
  <p>${t("Les chiffres de référence viennent de sources publiques, récupérées automatiquement chaque matin : la Banque mondiale (population, inflation), la Banque centrale européenne (taux de change), l'Agence américaine d'information sur l'énergie (prix du pétrole), l'USGS et le GDACS (catastrophes naturelles). Chaque module indique sa source et sa date.")}</p>

  <h2>La fabrication</h2>
  <p>${t("L'édition est préparée chaque matin vers 7 heures, heure de Paris, en français puis en anglais, et révisée le soir lorsqu'un événement majeur survient. La sélection et la rédaction sont assurées par un modèle d'intelligence artificielle (Claude, développé par Anthropic), selon une charte éditoriale publique. En cas de doute sur un fait, les sources liées sous chaque sujet font foi.")}</p>

  <h2>Installer l'application</h2>
  <ul>
    <li><strong>${t('Android, Chrome ou Edge')}</strong>${t(" : bouton « Installer l'appli » en haut de page, ou menu du navigateur, puis « Installer ».")}</li>
    <li><strong>iPhone</strong>${t(" : dans Safari, bouton Partager, puis « Sur l'écran d'accueil ».")}</li>
  </ul>`,
  en: (t) => `
  <h1>Method</h1>
  <p class="chapo">${t("Diurna is a short daily briefing on world affairs: five stories every morning, chosen by cross-checking the front pages of the major newsrooms, and a globe to place them on.")}</p>

  <section class="origin" aria-labelledby="h-origin">
    <p class="inscr" aria-hidden="true">ACTA<span>·</span>DIVRNA</p>
    <h2 id="h-origin">Why Diurna</h2>
    <p>${t("In 59 BC, Julius Caesar, then consul, had the ")}<em>Acta Diurna</em>${t(", “the daily acts”, posted every day in the public places of Rome: political decisions, trials, births, marriages and deaths. Copied and passed on, they were read, the historian Tacitus reports, as far away as the provinces and the legions. They are often described as the first newspaper in history.")}</p>
    <p>${t("Diurna picks up the idea two thousand years later: every day, the world explained in three sentences.")}</p>
  </section>

  <h2>How stories are chosen</h2>
  <p>${t("A story makes the edition when at least three leading newsrooms run it at the top: Reuters, Associated Press, AFP, the BBC, Le Monde, The Economist, Al Jazeera, The New York Times, the Financial Times, France 24, The Guardian or NPR.")}</p>
  <p>${t("Priority goes to events that change the situation within the week: a vote, a decision, fighting, a negotiation, a deadline. Long-running trends wait until an event brings them back to the fore.")}</p>
  <p>${t("The fifth story, “Out of the spotlight”, is kept for a serious crisis that gets little coverage in the European press: Sudan, the Democratic Republic of the Congo, the Sahel, Haiti, Myanmar, Yemen. It rotates from week to week.")}</p>

  <h2>How it is written</h2>
  <p>${t("Each story takes the form of a short article: a headline, a standfirst, a three-sentence paragraph that sets out the facts, explains the causes and looks ahead, then an analysis. Depending on the kind of news (conflict, election, economy, diplomacy, disaster, society), the page adds modules: casualty figures, places, results, each side's demands, charts.")}</p>
  <p>${t("Figures, accusations and claims are attributed to those who make them. A module only appears when its data is sourced. The English edition is written for English-speaking readers in its own right, not translated word for word from the French.")}</p>

  <h2>The data</h2>
  <p>${t("Reference figures come from public sources, collected automatically every morning: the World Bank (population, inflation), the European Central Bank (exchange rates), the US Energy Information Administration (oil prices), the USGS and GDACS (natural disasters). Every module shows its source and date.")}</p>

  <h2>How it is made</h2>
  <p>${t("The edition is prepared every morning at around 7am Paris time, in French and then in English, and revised in the evening if a major event occurs. Selection and writing are done by an artificial intelligence model (Claude, developed by Anthropic), following a public editorial charter. Where a fact is in doubt, the sources linked under each story take precedence.")}</p>

  <h2>Install the app</h2>
  <ul>
    <li><strong>${t('Android, Chrome or Edge')}</strong>${t(": the “Install the app” button at the top of the page, or the browser menu, then “Install”.")}</li>
    <li><strong>iPhone</strong>${t(": in Safari, tap Share, then “Add to Home Screen”.")}</li>
  </ul>`
};
function method(C) {
  const key = 'method', rootRel = rootRelOf(PATHS[C.lang][key]);
  return `${head(C, key, { title: esc(C.S.methodTitle + ' — Diurna'), desc: C.t(C.S.methodDesc) })}
${header(C, key)}
<main class="page">${METHOD[C.lang](C.t)}
</main>
${footer(C, key)}
${scripts(rootRel, BASE)}
</body>
</html>
`;
}

/* ---------- Statut ---------- */
function statusData() {
  const fr = readJ('data/latest.json', null), en = readJ('data/en/latest.json', null);
  const mk = readJ('data/markets.json', {}), ind = readJ('data/indicators.json', {}), al = readJ('data/alerts.json', null);
  const e = (x) => (x ? { date: x.date, number: x.number, updated: x.updated } : null);
  return {
    built: new Date().toISOString(), sha: (process.env.BUILD_SHA || '').slice(0, 7) || null,
    edition: { fr: e(fr), en: e(en) },
    data: { markets: mk.updated || null, indicators: ind.updated || null },
    alert: al && al.errors && al.errors.length ? { date: al.date, run: al.run, count: al.errors.length } : null
  };
}
function status(C, st) {
  const key = 'status', rootRel = rootRelOf(PATHS[C.lang][key]);
  const fHm = new Intl.DateTimeFormat(C.S.locale, { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Paris' });
  const when = (iso) => (iso ? C.t(fHm.format(new Date(iso))) : C.S.stNone);
  const ed = (x) => (x ? `${C.t(C.L('no', { n: x.number }))} · ${C.t(C.longDate(x.date))} · ${C.t(C.L('updated', { h: C.hour(x.updated) }))}` : C.S.stNone);
  const rows = [
    [C.S.stFr, ed(st.edition.fr)], [C.S.stEn, ed(st.edition.en)],
    [C.S.stData, st.data.markets ? C.t(C.dmy(st.data.markets)) : C.S.stNone],
    [C.S.stBuild, `${when(st.built)}${st.sha ? ` · <code>${st.sha}</code>` : ''}`]
  ];
  if (st.alert) rows.push([C.S.stAlert, `${when(st.alert.date)} · <a href="${esc(st.alert.run)}" rel="noopener">GitHub</a>`]);
  return `${head(C, key, { title: esc(C.S.statusTitle + ' — Diurna'), desc: C.t(C.S.statusDesc) })}
${header(C, key)}
<main class="page">
  <h1>${C.S.statusTitle}</h1>
  <p class="chapo" id="stLine" data-fr="${st.edition.fr ? st.edition.fr.date : ''}">${C.t(C.S.statusDesc)}</p>
  <dl class="status">${rows.map(([k, v]) => `<div><dt>${C.t(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>
  <p>${C.t(C.S.stWatch)}</p>
</main>
${footer(C, key)}
${scripts(rootRel, BASE)}
<script>(function(){var d=document.getElementById('stLine').dataset.fr,t=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris'}).format(new Date());document.getElementById('stLine').textContent=d===t?${JSON.stringify(C.S.stOk)}:${JSON.stringify(C.S.stLate)};})();</script>
</body>
</html>
`;
}

/* ---------- Manifeste anglais ---------- */
function manifestEn() {
  const fr = JSON.parse(rd('manifest.webmanifest'));
  return JSON.stringify({
    ...fr, description: I18N.en.sub, lang: 'en', start_url: './', scope: './',
    icons: fr.icons.map((i) => ({ ...i, src: '../' + i.src })),
    shortcuts: [{ name: 'Today’s edition', url: 'edition/' }, { name: 'Archive', url: 'archives/' }]
  }, null, 2) + '\n';
}

/* ---------- Service worker ---------- */
function sw() {
  const pages = LANGS.flatMap((l) => Object.values(PATHS[l]).map((p) => p || './'));
  const shell = [...pages, 'manifest.webmanifest', 'en/manifest.webmanifest', 'icons/favicon.svg',
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

const ST = statusData();
wr('status.json', JSON.stringify(ST, null, 1) + '\n');
for (const lang of LANGS) {
  const C = makeCtx(lang);
  const P = PATHS[lang];
  wr(P.status + 'index.html', status(C, ST));
  wr(P.home + 'index.html', home(C));
  wr(P.edition + 'index.html', editionPage(C));
  wr(P.archives + 'index.html', archives(C));
  wr(P.method + 'index.html', method(C));
}
wr('en/manifest.webmanifest', manifestEn());
wr('sw.js', sw());
const fr = readJ('data/latest.json', {}), en = readJ('data/en/latest.json', null);
console.log(`Pages générées (assets ${V}) — FR : ${fr.date}${en ? `, EN : ${en.date}` : ', EN : pas encore d’édition anglaise'}.`);
