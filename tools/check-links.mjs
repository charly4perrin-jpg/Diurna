// Vérifie les liens des sources de la dernière édition (français et anglais) : node tools/check-links.mjs
// Avec --all : toutes les éditions archivées (contrôle mensuel) ; écrit links-report.md et ne bloque rien.
// Bloque seulement les vrais liens morts (404, 410, domaine inexistant). Beaucoup de journaux
// refusent les robots (403, 429) ou répondent lentement : ce sont de simples avertissements.
// Ne tourne que sur GitHub (CI=true) : ailleurs, le réseau peut être filtré et fausserait le résultat.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => { try { return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8')); } catch (_) { return null; } };
if (process.env.CI !== 'true' && !process.argv.includes('--force')) {
  console.log('Liens : vérification faite uniquement sur GitHub (ajoute --force pour la lancer ici).');
  process.exit(0);
}

const ALL = process.argv.includes('--all');
const urls = new Map(); // url → où elle apparaît
const add = (u, where) => { if (u && /^https:\/\//.test(u)) urls.set(u, (urls.get(u) || []).concat(where)); };
const targets = ALL
  ? [['fr', 'data/editions'], ['en', 'data/en/editions']].flatMap(([lang, dir]) => (fs.existsSync(path.join(root, dir)) ? fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith('.json')).map((f) => [lang, `${dir}/${f}`]) : []))
  : [['fr', 'data/latest.json'], ['en', 'data/en/latest.json']];
for (let [lang, p] of targets) {
  const ed = read(p);
  if (!ed) continue;
  if (ALL) lang = `${lang} ${ed.date}`;
  (ed.essentials || []).forEach((e) => {
    const w = `${lang} ${e.rank}. ${e.place}`;
    (e.sources || []).forEach((s) => add(s.url, w));
    Object.values(e.modules || {}).forEach((m) => {
      if (m && m.source) add(m.source.url, w + ' (module)');
      (m && m.items || []).forEach((i) => i.source && add(i.source.url, w + ' (module)'));
    });
  });
  (ed.brief || []).forEach((b) => add(b.url, `${lang} En bref ${b.place}`));
}

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 DiurnaLinkCheck';
async function check(url) {
  for (const method of ['HEAD', 'GET']) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await fetch(url, { method, redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': UA, Accept: 'text/html,*/*' } });
      clearTimeout(timer);
      if (method === 'HEAD' && (r.status === 405 || r.status === 403 || r.status === 404)) continue; // certains serveurs refusent HEAD
      return { status: r.status };
    } catch (e) {
      clearTimeout(timer);
      const code = e.cause && e.cause.code;
      if (method === 'GET') return { error: code || e.name };
    }
  }
  return { error: 'unknown' };
}

const dead = [], warn = [];
const list = [...urls.keys()];
for (let i = 0; i < list.length; i += 6) {
  await Promise.all(list.slice(i, i + 6).map(async (u) => {
    const r = await check(u);
    const where = urls.get(u).join(', ');
    if (r.status === 404 || r.status === 410 || r.error === 'ENOTFOUND') dead.push(`✗ Lien mort (${r.status || r.error}) : ${u} — ${where}`);
    else if (r.error || r.status >= 400) warn.push(`! ${r.status || r.error} : ${u} — ${where}`);
  }));
}
warn.forEach((w) => console.log(w));
if (ALL) {
  fs.writeFileSync(path.join(root, 'links-report.md'), dead.length
    ? `${dead.length} lien(s) mort(s) dans les archives (sur ${list.length} vérifiés). Remplacer chaque source par une autre qui établit le même fait :\n\n${dead.map((d) => '- ' + d.replace(/^✗ /, '')).join('\n')}\n`
    : '');
  console.log(`Archives : ${list.length} liens vérifiés, ${dead.length} mort(s), ${warn.length} avertissement(s).`);
  process.exit(0);
}
if (dead.length) { console.error(dead.join('\n')); process.exit(1); }
console.log(`Liens : ${list.length} vérifiés, aucun lien mort${warn.length ? `, ${warn.length} avertissement(s)` : ''}.`);
