// Image de partage (1200 × 630) de chaque sujet des 7 derniers jours, en français et en anglais.
// node tools/og-images.mjs            → écrit og/<langue>/<date>-<rang>.jpg, puis tools/build.mjs les utilise.
// Si Playwright manque ou échoue, rien n'est cassé : les pages gardent l'image générique.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => fs.readFileSync(path.join(root, p));
const readJ = (p, d) => { try { return JSON.parse(rd(p)); } catch (_) { return d; } };
const I18N = require('../assets/js/i18n.js');
const countries = readJ('data/countries.json', {});
const KEEP_DAYS = 30, RECENT_DAYS = 7;
const RANK = ['', '#FF6A4D', '#FFB940', '#45C4F5', '#BA8EFF', '#47DFA0'];

let chromium;
try { ({ chromium } = require('playwright')); } catch (_) { console.log('Playwright absent : images de partage non générées (image générique conservée).'); process.exit(0); }

const b64 = (p) => rd(p).toString('base64');
const FONTS = `
@font-face{font-family:N;src:url(data:font/woff2;base64,${b64('assets/fonts/newsreader-latin-standard-normal.woff2')}) format("woff2");font-weight:200 800}
@font-face{font-family:A;src:url(data:font/woff2;base64,${b64('assets/fonts/archivo-latin-standard-normal.woff2')}) format("woff2");font-weight:100 900;font-stretch:62% 125%}`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const typo = (lang, s) => {
  s = String(s ?? '').replace(/'/g, '’');
  return lang === 'fr' ? s.replace(/ ([?!;])/g, ' $1').replace(/ :/g, ' :').replace(/« /g, '« ').replace(/ »/g, ' »') : s;
};
const flagURI = (id) => {
  const c = countries[id];
  if (!c || !c.flag) return '';
  const f = path.join(root, 'assets/flags', c.flag);
  if (!fs.existsSync(f)) return '';
  return `data:${c.flag.endsWith('.svg') ? 'image/svg+xml' : 'image/webp'};base64,${fs.readFileSync(f).toString('base64')}`;
};

function card(lang, ed, s) {
  const S = I18N[lang], col = RANK[s.rank];
  const cname = (lang === 'en' && countries[s.id] && countries[s.id].en ? countries[s.id].en.name : countries[s.id] && countries[s.id].name) || s.place;
  const date = new Intl.DateTimeFormat(S.locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.parse(ed.date + 'T12:00:00Z'));
  const title = typo(lang, s.title), long = title.length > 92;
  const fl = flagURI(s.id);
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${FONTS}
*{box-sizing:border-box}
body{margin:0;width:1200px;height:630px;background:#070C1D;color:#F2EEE6;font-family:N,Georgia,serif;position:relative;overflow:hidden}
.g{position:absolute;right:-300px;top:-120px;width:760px;height:760px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#16264F,#050A1C 76%);box-shadow:inset 0 0 0 1px #2D4280}
.g::after{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 30% 34%,${col}26,transparent 46%)}
.bar{position:absolute;left:0;top:0;bottom:0;width:10px;background:${col}}
.w{position:absolute;inset:58px 72px 54px 82px;display:flex;flex-direction:column}
.top{display:flex;justify-content:space-between;align-items:baseline}
.m{font:600 34px/1 N;letter-spacing:.2em;font-variation-settings:"opsz" 72}
.m i{font-style:normal;color:#FF6A4D;letter-spacing:0;margin-left:-.14em}
.no{font:500 21px/1 A;color:#8C97B9;letter-spacing:.01em}
.rub{display:flex;align-items:center;gap:16px;margin-top:62px;font:650 22px/1 A;letter-spacing:.1em;text-transform:uppercase;color:${col}}
.rk{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:${col};color:#070C1D;font:700 22px/1 A;letter-spacing:0}
.fl{width:42px;height:31px;object-fit:cover;border-radius:4px;box-shadow:0 0 0 1px rgba(242,238,230,.18)}
h1{margin:24px 0 0;font:700 ${long ? 52 : 60}px/1.08 N;letter-spacing:-.015em;font-variation-settings:"opsz" 72;max-width:1000px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;text-wrap:balance}
.fig{margin-top:auto;display:flex;align-items:baseline;gap:22px;max-width:1000px}
.v{font:700 58px/1 N;color:${col};white-space:nowrap;font-variation-settings:"opsz" 72}
.l{font:500 24px/1.3 A;color:#C3C9DA;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ai{position:absolute;right:72px;bottom:24px;font:500 16px/1 A;color:#8C97B9}
</style></head><body><div class="g"></div><div class="bar"></div>
<div class="w">
  <div class="top"><div class="m">DIURNA<i>.</i></div><div class="no">${esc(S.no.replace('{n}', ed.number))} · ${esc(date)}</div></div>
  <div class="rub"><span class="rk">${s.rank}</span>${fl ? `<img class="fl" src="${fl}" alt="">` : ''}<span>${esc(typo(lang, cname))}</span></div>
  <h1>${esc(title)}</h1>
  ${s.figure ? `<div class="fig"><span class="v">${esc(typo(lang, s.figure.value))}</span><span class="l">${esc(typo(lang, s.figure.label))}</span></div>` : ''}
</div>
<div class="ai">${esc(typo(lang, S.aiLabel))}</div>
</body></html>`;
}

const today = Date.now();
const age = (d) => (today - Date.parse(d + 'T00:00:00Z')) / 864e5;
const manifestPath = path.join(root, 'og/manifest.json');
const manifest = readJ('og/manifest.json', {});
const jobs = [];
for (const lang of ['fr', 'en']) {
  const dir = lang === 'en' ? 'data/en/editions' : 'data/editions';
  if (!fs.existsSync(path.join(root, dir))) continue;
  for (const f of fs.readdirSync(path.join(root, dir)).filter((x) => /^\d{4}-\d{2}-\d{2}\.json$/.test(x))) {
    const ed = readJ(`${dir}/${f}`, null);
    if (!ed || age(ed.date) > RECENT_DAYS) continue;
    for (const s of ed.essentials) {
      const html = card(lang, ed, s);
      const key = `${lang}/${ed.date}-${s.rank}`;
      const h = crypto.createHash('sha1').update(html).digest('hex').slice(0, 12);
      const out = path.join(root, `og/${key}.jpg`);
      if (manifest[key] === h && fs.existsSync(out)) continue;
      jobs.push({ key, h, html, out });
    }
  }
}
// Ménage : on ne garde que les 30 derniers jours (les pages plus anciennes reprennent l'image générique).
for (const lang of ['fr', 'en']) {
  const d = path.join(root, 'og', lang);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) {
    const m = f.match(/^(\d{4}-\d{2}-\d{2})-\d\.jpg$/);
    if (m && age(m[1]) > KEEP_DAYS) { fs.unlinkSync(path.join(d, f)); delete manifest[`${lang}/${f.replace('.jpg', '')}`]; }
  }
}
if (!jobs.length) { console.log('Images de partage : rien à refaire.'); process.exit(0); }

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const j of jobs) {
    await page.setContent(j.html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    fs.mkdirSync(path.dirname(j.out), { recursive: true });
    await page.screenshot({ path: j.out, type: 'jpeg', quality: 84 });
    manifest[j.key] = j.h;
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
  console.log(`Images de partage : ${jobs.length} générée(s).`);
} catch (e) {
  console.log('Images de partage non générées : ' + e.message.split('\n')[0]);
} finally {
  if (browser) await browser.close();
}
