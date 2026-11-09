// Carrousel du jour pour les réseaux : 6 images PNG 1080 × 1350 (une couverture + les cinq sujets)
// et une légende prête à copier, en français et en anglais.
// node tools/carousel.mjs [dossier de sortie, par défaut out/carousel]
// Lancé chaque matin par le workflow « Diffusion » ; les fichiers se téléchargent depuis la page du workflow.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => fs.readFileSync(path.join(root, p));
const readJ = (p, d) => { try { return JSON.parse(rd(p)); } catch (_) { return d; } };
const I18N = require('../assets/js/i18n.js');
const site = readJ('site.json', {});
const countries = readJ('data/countries.json', {});
const OUT = path.resolve(root, process.argv[2] || 'out/carousel');
const RANK = ['', '#FF6A4D', '#FFB940', '#45C4F5', '#BA8EFF', '#47DFA0'];
const base = (site.url || '').replace(/\/$/, '');
const host = base.replace(/^https?:\/\//, '');

const { chromium } = require('playwright');
const b64 = (p) => rd(p).toString('base64');
const FONTS = `
@font-face{font-family:N;src:url(data:font/woff2;base64,${b64('tools/fonts-src/newsreader-latin-standard-normal.woff2')}) format("woff2");font-weight:200 800}
@font-face{font-family:A;src:url(data:font/woff2;base64,${b64('tools/fonts-src/archivo-latin-standard-normal.woff2')}) format("woff2");font-weight:100 900;font-stretch:62% 125%}`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const typo = (lang, s) => {
  s = String(s ?? '').replace(/'/g, '’');
  return lang === 'fr' ? s.replace(/ ([?!;])/g, ' $1').replace(/ :/g, ' :').replace(/« /g, '« ').replace(/ »/g, ' »') : s;
};
const cname = (lang, s) => (lang === 'en' && countries[s.id] && countries[s.id].en ? countries[s.id].en.name : countries[s.id] && countries[s.id].name) || s.place;
const flagURI = (id) => {
  const c = countries[id];
  if (!c || !c.flag) return '';
  const f = path.join(root, 'assets/flags', c.flag);
  return fs.existsSync(f) ? `data:${c.flag.endsWith('.svg') ? 'image/svg+xml' : 'image/webp'};base64,${fs.readFileSync(f).toString('base64')}` : '';
};
const T = {
  fr: { swipe: 'Glisse pour lire les cinq sujets', full: 'Les cinq sujets en entier', tags: '#actualité #international #Diurna' },
  en: { swipe: 'Swipe to read the five stories', full: 'The five stories in full', tags: '#news #worldnews #Diurna' }
};

const CSS = `${FONTS}
*{box-sizing:border-box}
body{margin:0;width:1080px;height:1350px;background:#070C1D;color:#F2EEE6;font-family:N,Georgia,serif;position:relative;overflow:hidden}
.g{position:absolute;right:-380px;top:-260px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#16264F,#050A1C 76%);box-shadow:inset 0 0 0 1px #2D4280}
.w{position:absolute;inset:80px 84px 70px 84px;display:flex;flex-direction:column}
.top{display:flex;justify-content:space-between;align-items:baseline}
.m{font:600 40px/1 N;letter-spacing:.2em;font-variation-settings:"opsz" 72}
.m i{font-style:normal;color:#FF6A4D;letter-spacing:0;margin-left:-.14em}
.no{font:500 24px/1 A;color:#8C97B9}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:24px;font:500 22px/1.3 A;color:#8C97B9}
.foot b{color:#C3C9DA;font-weight:600}
`;

function cover(lang, ed) {
  const S = I18N[lang];
  const date = new Intl.DateTimeFormat(S.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.parse(ed.date + 'T12:00:00Z'));
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${CSS}
h1{margin:64px 0 0;font:700 74px/1.04 N;letter-spacing:-.02em;font-variation-settings:"opsz" 72;text-wrap:balance}
ol{list-style:none;margin:56px 0 0;padding:0;border-top:2px solid #F2EEE6}
li{display:grid;grid-template-columns:52px 1fr;gap:4px 18px;padding:20px 0;border-bottom:1px solid #233160;align-items:start}
.rk{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#070C1D;font:700 24px/1 A;grid-row:span 2}
.c{font:650 20px/1.2 A;letter-spacing:.1em;text-transform:uppercase}
.t{font:600 30px/1.22 N;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.sw{color:#F2EEE6;font:600 24px/1 A}
</style></head><body><div class="g"></div><div class="w">
<div class="top"><div class="m">DIURNA<i>.</i></div><div class="no">${esc(S.no.replace('{n}', ed.number))}</div></div>
<div class="no" style="margin-top:22px">${esc(date.charAt(0).toUpperCase() + date.slice(1))}</div>
<h1>${esc(typo(lang, ed.headline))}</h1>
<ol>${ed.essentials.map((s) => `<li><span class="rk" style="background:${RANK[s.rank]}">${s.rank}</span><span class="c" style="color:${RANK[s.rank]}">${esc(typo(lang, cname(lang, s)))}</span><span class="t">${esc(typo(lang, s.title))}</span></li>`).join('')}</ol>
<div class="foot"><span class="sw">${esc(T[lang].swipe)} →</span><span>${esc(host)}</span></div>
</div></body></html>`;
}

function slide(lang, ed, s) {
  const S = I18N[lang], col = RANK[s.rank], fl = flagURI(s.id);
  const title = typo(lang, s.title);
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${CSS}
.bar{position:absolute;left:0;top:0;bottom:0;width:12px;background:${col}}
.g::after{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 30% 34%,${col}24,transparent 46%)}
.rub{display:flex;align-items:center;gap:18px;margin-top:84px;font:650 26px/1 A;letter-spacing:.1em;text-transform:uppercase;color:${col}}
.rk{width:52px;height:52px;border-radius:50%;background:${col};color:#070C1D;display:flex;align-items:center;justify-content:center;font:700 28px/1 A;letter-spacing:0}
.fl{width:54px;height:40px;object-fit:cover;border-radius:5px;box-shadow:0 0 0 1px rgba(242,238,230,.18)}
h1{margin:32px 0 0;font:700 ${title.length > 90 ? 58 : 66}px/1.06 N;letter-spacing:-.015em;font-variation-settings:"opsz" 72;text-wrap:balance}
.st{margin:34px 0 0;font:400 33px/1.42 N;color:#C3C9DA;display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden}
.fig{margin-top:auto;padding-top:34px;border-top:2px solid #F2EEE6}
.v{font:700 96px/1 N;color:${col};font-variation-settings:"opsz" 72}
.l{margin-top:14px;font:500 28px/1.3 A;color:#C3C9DA}
.foot{margin-top:38px}
</style></head><body><div class="g"></div><div class="bar"></div><div class="w">
<div class="top"><div class="m">DIURNA<i>.</i></div><div class="no">${s.rank} / 5</div></div>
<div class="rub"><span class="rk">${s.rank}</span>${fl ? `<img class="fl" src="${fl}" alt="">` : ''}<span>${esc(typo(lang, cname(lang, s)))}</span></div>
<h1>${esc(title)}</h1>
<p class="st">${esc(typo(lang, s.standfirst))}</p>
${s.figure ? `<div class="fig"><div class="v">${esc(typo(lang, s.figure.value))}</div><div class="l">${esc(typo(lang, s.figure.label))}</div></div>` : ''}
<div class="foot"><span>${esc(typo(lang, S.aiLabel))}</span><span><b>${esc(host)}</b></span></div>
</div></body></html>`;
}

// Format story (1080 × 1920) : la même mise en page, plus haute, avec de l'air autour du texte.
const STORY_CSS = `<style>body{width:1080px!important;height:1920px!important}.w{inset:150px 84px 150px 84px!important}h1{font-size:84px!important}.st{-webkit-line-clamp:9!important;font-size:38px!important}.g{top:-120px!important}</style>`;

// Légendes pour LinkedIn (plus longue, posée) et X (courte, avec le lien).
function captionLinkedIn(lang, ed) {
  const home = `${base}/${lang === 'en' ? 'en/' : ''}`;
  const intro = lang === 'en' ? 'The world this morning, in five stories:' : 'Le monde ce matin, en cinq sujets :';
  const outro = lang === 'en'
    ? 'Diurna explains the day’s international news in three sentences per story, with a globe to place them on. Written by an AI from the sources cited, every morning.'
    : 'Diurna explique l’actualité internationale du jour en trois phrases par sujet, avec un globe pour la situer. Rédigé chaque matin par une IA à partir des sources citées.';
  return [typo(lang, ed.headline), '', intro, '', ...ed.essentials.map((s) => `${s.rank}. ${typo(lang, cname(lang, s))} — ${typo(lang, s.title)}`), '', outro, '', home, '', lang === 'en' ? '#WorldNews #Geopolitics #News' : '#Actualité #Géopolitique #International', ''].join('\n');
}
function captionX(lang, ed) {
  const home = `${base}/${lang === 'en' ? 'en/' : ''}`;
  let txt = `${typo(lang, ed.headline)}\n\n${ed.essentials.map((s) => `${s.rank}. ${typo(lang, cname(lang, s))}`).join(' · ')}\n\n${home}`;
  if (txt.length > 280) txt = `${typo(lang, ed.headline).slice(0, 280 - home.length - 6)}…\n\n${home}`;
  return txt + '\n';
}

function caption(lang, ed) {
  const S = I18N[lang];
  const home = `${base}/${lang === 'en' ? 'en/' : ''}`;
  return [
    typo(lang, ed.headline), '',
    typo(lang, ed.standfirst), '',
    ...ed.essentials.map((s) => `${s.rank}. ${typo(lang, cname(lang, s))} — ${typo(lang, s.title)}`), '',
    `${T[lang].full} : ${home}`.replace(' : ', lang === 'fr' ? ' : ' : ': '),
    `${typo(lang, S.aiLabel)}.`, '',
    T[lang].tags, ''
  ].join('\n');
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  for (const lang of ['fr', 'en']) {
    const ed = readJ(lang === 'en' ? 'data/en/latest.json' : 'data/latest.json', null);
    if (!ed) continue;
    const dir = path.join(OUT, `${ed.date}-${lang}`);
    fs.mkdirSync(dir, { recursive: true });
    const htmls = [cover(lang, ed), ...ed.essentials.map((s) => slide(lang, ed, s))];
    for (let i = 0; i < htmls.length; i++) {
      await page.setContent(htmls[i], { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(dir, `${String(i + 1).padStart(2, '0')}.png`), type: 'png' });
    }
    fs.writeFileSync(path.join(dir, 'legende.txt'), caption(lang, ed));
    fs.writeFileSync(path.join(dir, 'legende-linkedin.txt'), captionLinkedIn(lang, ed));
    fs.writeFileSync(path.join(dir, 'legende-x.txt'), captionX(lang, ed));
    // Format story 1080 × 1920
    const sdir = path.join(OUT, `${ed.date}-${lang}-story`);
    fs.mkdirSync(sdir, { recursive: true });
    await page.setViewportSize({ width: 1080, height: 1920 });
    for (let i = 0; i < htmls.length; i++) {
      await page.setContent(htmls[i].replace('</head>', STORY_CSS + '</head>'), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(sdir, `${String(i + 1).padStart(2, '0')}.png`), type: 'png' });
    }
    await page.setViewportSize({ width: 1080, height: 1350 });
    console.log(`Carrousel ${lang} : ${htmls.length} images et une légende dans ${path.relative(root, dir)}/`);
  }
} finally {
  await browser.close();
}
