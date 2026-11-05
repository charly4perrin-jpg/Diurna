// Contrôle du site EN LIGNE (pas en local) : codes HTTP, balises d'en-tête, données structurées,
// sitemap, robots, ancienne adresse, et disponibilité des noms de domaine envisagés.
// Lancé par le workflow « Contrôle en ligne » après chaque publication ; le journal sert de preuve.
import fs from 'node:fs';

const site = JSON.parse(fs.readFileSync(new URL('../site.json', import.meta.url), 'utf8'));
const base = site.url.replace(/\/$/, '');
const legacy = (site.legacy || []).map((u) => u.replace(/\/$/, ''));
const UA = 'Mozilla/5.0 (compatible; DiurnaOnlineCheck/1.0)';
const line = (s) => console.log(s);

async function get(url, opts = {}) {
  try {
    const r = await fetch(url, { redirect: opts.follow === false ? 'manual' : 'follow', headers: { 'User-Agent': UA }, cache: 'no-store' });
    const text = opts.body === false ? '' : await r.text();
    return { status: r.status, url: r.url, location: r.headers.get('location'), text };
  } catch (e) { return { status: 0, error: (e.cause && e.cause.code) || e.message, text: '' }; }
}
const pick = (html, re, n = 4) => [...html.matchAll(re)].slice(0, n).map((m) => m[0].replace(/\s+/g, ' ').slice(0, 220));

line(`== Site : ${base}`);
const pages = ['/', '/en/', '/globe/', '/en/edition/', '/archives/', '/methode/', '/status/', '/status.json', '/sitemap.xml', '/news-sitemap.xml', '/robots.txt', ...(site.checkPaths || [])];
const latest = await get(base + '/data/latest.json');
let story = null;
try { const ed = JSON.parse(latest.text); story = ed.essentials && ed.essentials[0] && ed.essentials[0].url; } catch (_) {}
if (story) pages.push(story);
for (const p of pages) {
  const r = await get(base + p);
  line(`${r.status || r.error}  ${p}${r.url && r.url !== base + p ? `  → ${r.url}` : ''}`);
  if (r.status === 200 && /\.html$|\/$/.test(p)) {
    for (const tag of [...pick(r.text, /<link rel="canonical"[^>]*>/g, 1), ...pick(r.text, /<link rel="alternate" hreflang[^>]*>/g, 3), ...pick(r.text, /<meta property="og:image" [^>]*>/g, 1)]) line(`      ${tag}`);
    const ld = pick(r.text, /<script type="application\/ld\+json">[\s\S]*?<\/script>/g, 3);
    ld.forEach((x) => line(`      ${x.slice(0, 200)}…`));
    if (/goatcounter/.test(r.text)) line('      GoatCounter présent');
  }
}

for (const old of legacy) {
  line(`== Ancienne adresse : ${old}`);
  for (const p of ['/', '/globe/', '/en/']) {
    const r = await get(old + p, { follow: false });
    const meta = (r.text.match(/http-equiv="refresh" content="[^"]*"/) || [])[0];
    line(`${r.status || r.error}  ${old}${p}${r.location ? `  → ${r.location}` : ''}${meta ? `  (${meta})` : ''}`);
  }
}

line('== Domaines envisagés (RDAP : 404 = libre à l’enregistrement, 200 = déjà pris)');
const RDAP = {
  'diurna.fr': 'https://rdap.nic.fr/domain/diurna.fr',
  'diurna.eu': 'https://rdap.eurid.eu/domain/diurna.eu',
  'diurna.news': 'https://rdap.identitydigital.services/rdap/domain/diurna.news',
  'getdiurna.com': 'https://rdap.verisign.com/com/v1/domain/getdiurna.com'
};
for (const [d, u] of Object.entries(RDAP)) {
  const r = await get(u);
  let extra = '';
  try { const j = JSON.parse(r.text); extra = (j.events || []).filter((e) => /registration|expiration/.test(e.eventAction)).map((e) => `${e.eventAction} ${String(e.eventDate).slice(0, 10)}`).join(', '); } catch (_) {}
  line(`${r.status || r.error}  ${d}${r.status === 404 ? '  → semble libre' : r.status === 200 ? `  → déjà enregistré ${extra}` : ''}`);
}
