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

line('== Domaines (RDAP officiel via l’annuaire de l’IANA : 404 = libre, 200 = déjà pris)');
const boot = await get('https://data.iana.org/rdap/dns.json');
let services = [];
try { services = JSON.parse(boot.text).services; } catch (_) {}
const rdapBase = (tld) => { const s = services.find((x) => x[0].includes(tld)); return s ? s[1][0].replace(/\/?$/, '/') : null; };
const DOMAINS = site.domainCandidates || ['diurna.fr', 'diurna.eu', 'diurna.news', 'getdiurna.com'];
for (const d of DOMAINS) {
  const tld = d.split('.').pop();
  const b = rdapBase(tld);
  let verdict = 'pas de RDAP pour ce domaine de premier niveau';
  if (b) {
    const r = await get(b + 'domain/' + d);
    let extra = '';
    try { const j = JSON.parse(r.text); extra = (j.events || []).filter((e) => /registration|expiration/.test(e.eventAction)).map((e) => `${e.eventAction} ${String(e.eventDate).slice(0, 10)}`).join(', '); } catch (_) {}
    verdict = r.status === 404 ? 'semble LIBRE' : r.status === 200 ? `déjà enregistré (${extra || 'dates non publiées'})` : `réponse ${r.status || r.error}`;
  }
  const home = await get('https://' + d + '/');
  const title = ((home.text || '').match(/<title[^>]*>([^<]{0,80})/i) || [])[1];
  line(`${d} : ${verdict}${home.status ? ` · site : HTTP ${home.status}${title ? ` « ${title.trim()} »` : ''}` : ' · aucun site'}`);
}
