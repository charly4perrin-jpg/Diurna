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
const pages = ['/', '/en/', '/globe/', '/en/edition/', '/archives/', '/pays/', '/dossiers/', '/recherche/', '/en/country/', '/en/dossiers/', '/methode/', '/status/',
  '/a-propos/', '/mentions-legales/', '/confidentialite/', '/credits/', '/en/about/', '/en/legal/', '/en/privacy/', '/en/credits/',
  '/status.json', '/sitemap.xml', '/news-sitemap.xml', '/robots.txt', '/feed.xml', '/atom.xml', '/en/feed.xml', '/all.xml', ...(site.checkPaths || [])];
// Les pages des sujets du jour, d'après le plan des adresses publié par le site.
const routes = await get(base + '/data/routes.json');
const stories = [];
try {
  const rt = JSON.parse(routes.text);
  for (const lang of ['fr', 'en']) {
    const days = Object.keys(rt[lang] || {}).sort();
    const d = days[days.length - 1];
    if (d) { stories.push('/' + rt[lang][d][1], '/' + rt[lang][d].bref); }
  }
  const last = Object.keys(rt.fr).sort().pop();
  stories.push(`/og/fr/${last}-1.jpg`, `/og/en/${last}-1.jpg`);
} catch (_) { line(`data/routes.json illisible (HTTP ${routes.status || routes.error})`); }
for (const p of [...pages, ...stories]) {
  const r = await get(base + p, { body: !/\.jpg$/.test(p) });
  line(`${r.status || r.error}  ${p}${r.url && r.url !== base + p ? `  → ${r.url}` : ''}`);
  if (r.status !== 200) continue;
  if (/\/$/.test(p)) {
    const title = (r.text.match(/<title>([^<]*)<\/title>/) || [])[1];
    if (title) line(`      <title>${title}</title>`);
    for (const tag of [...pick(r.text, /<meta name="description"[^>]*>/g, 1), ...pick(r.text, /<meta name="robots"[^>]*>/g, 1), ...pick(r.text, /<link rel="canonical"[^>]*>/g, 1), ...pick(r.text, /<link rel="alternate" hreflang[^>]*>/g, 3), ...pick(r.text, /<meta property="og:image" [^>]*>/g, 1)]) line(`      ${tag}`);
    for (const m of r.text.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try {
        const j = JSON.parse(m[1]);
        const sum = j['@type'] === 'NewsArticle' ? ` headline « ${j.headline} », datePublished ${j.datePublished}, image ${[].concat(j.image)[0]}, publisher ${j.publisher && j.publisher.name}`
          : j['@type'] === 'BreadcrumbList' ? ` ${j.itemListElement.map((x) => x.name).join(' › ')}`
          : j['@type'] === 'WebSite' ? ` ${j.name}, recherche : ${j.potentialAction && j.potentialAction.target && j.potentialAction.target.urlTemplate}` : ` ${j.name || ''}`;
        line(`      JSON-LD ${j['@type']} (JSON valide) :${sum}`);
      } catch (e) { line(`      JSON-LD INVALIDE : ${e.message}`); }
    }
    if (/goatcounter/.test(r.text)) line('      GoatCounter présent : ' + ((r.text.match(/data-goatcounter="[^"]*"/) || [])[0] || ''));
    const foot = (r.text.match(/<footer[\s\S]*?<\/footer>/) || [''])[0];
    if (foot && (p === '/' || p === '/en/')) line(`      pied de page : ${[...foot.matchAll(/<a [^>]*>([^<]+)<\/a>/g)].map((m) => m[1]).join(' · ')}`);
    if (/class="support"/.test(r.text)) line('      lien de soutien affiché : ' + ((r.text.match(/<a class="support" href="[^"]*"/) || [])[0] || ''));
    else if (p === '/' || p === '/en/') line('      lien de soutien : absent (option désactivée ou pas de compte Ko-fi)');
    if (/class="sponsor"/.test(r.text)) line('      emplacement partenaire affiché');
    if (/data-newsletter/.test(r.text)) line('      formulaire newsletter présent : ' + ((r.text.match(/action="https:\/\/buttondown[^"]*"/) || [])[0] || ''));
    const todo = (r.text.match(/class="todo"/g) || []).length;
    if (todo) line(`      ${todo} champ(s) [À REMPLIR] sur la page`);
  }
  if (/sitemap\.xml$/.test(p)) line(`      ${(r.text.match(/<url>/g) || []).length} adresses${/<\/urlset>\s*$/.test(r.text) ? ', XML complet' : ', XML TRONQUÉ'}`);
  if (/robots\.txt$/.test(p)) r.text.trim().split('\n').forEach((x) => line(`      ${x}`));
  if (/(feed|atom|all)\.xml$/.test(p)) {
    line(`      ${(r.text.match(/<item>|<entry[ >]/g) || []).length} articles`);
    const v = await get(`https://validator.w3.org/feed/check.cgi?output=soap12&url=${encodeURIComponent(base + p)}`);
    const valid = (v.text.match(/<m:validity>([^<]*)<\/m:validity>/) || [])[1];
    const errs = (v.text.match(/<m:errorcount>([^<]*)<\/m:errorcount>/) || [])[1];
    const warns = (v.text.match(/<m:warningcount>([^<]*)<\/m:warningcount>/) || [])[1];
    line(`      validateur W3C : ${valid === 'true' ? 'VALIDE' : valid === 'false' ? 'INVALIDE' : `pas de réponse (HTTP ${v.status || v.error})`}${errs !== undefined ? `, ${errs} erreur(s), ${warns} avertissement(s)` : ''}`);
    for (const m of v.text.matchAll(/<(?:m:)?text>([^<]*)<\/(?:m:)?text>/g)) line(`        · ${m[1]}`);
  }
}

for (const old of legacy) {
  line(`== Ancienne adresse : ${old}`);
  for (const p of ['/', '/globe/', '/en/', '/archives/', '/une/page/qui/n-existe-pas/']) {
    const r = await get(old + p, { follow: false });
    const meta = (r.text.match(/http-equiv="refresh" content="[^"]*"/) || [])[0];
    const js = (r.text.match(/var NEW = '[^']*'/) || [])[0];
    line(`${r.status || r.error}  ${old}${p}${r.location ? `  → ${r.location}` : ''}${meta ? `  (${meta})` : ''}${js ? `  (${js})` : ''}`);
  }
}

if (site.domain) {
  const dns = await import('node:dns');
  line(`== Domaine choisi : ${site.domain}`);
  for (const [k, f] of [['A', 'resolve4'], ['AAAA', 'resolve6'], ['CNAME www', null]]) {
    try {
      const v = f ? await dns.promises[f](site.domain) : await dns.promises.resolveCname('www.' + site.domain);
      line(`${k} : ${v.join(', ')}`);
    } catch (e) { line(`${k} : aucun (${e.code})`); }
  }
  const h = await get('https://' + site.domain + '/', { follow: false });
  line(`https://${site.domain}/ : ${h.status || h.error}${h.location ? ` → ${h.location}` : ''}`);
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
