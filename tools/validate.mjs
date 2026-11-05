// Vérifie les éditions avant publication : node tools/validate.mjs
// Sort avec le code 1 et la liste des problèmes si quelque chose ne va pas.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const problems = [];
const fail = (where, msg) => problems.push(`${where} : ${msg}`);

const world = read('assets/world.json');
const codes = new Set(world.objects.countries.geometries.map((g) => g.properties.a3));
const isDate = (s) => /^\d{4}-\d{2}(-\d{2})?$/.test(String(s));
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const isUrl = (s) => /^https:\/\/\S+$/.test(String(s || ''));

function checkEdition(ed, where) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ed.date)) fail(where, 'date invalide');
  if (!Number.isInteger(ed.number) || ed.number < 1) fail(where, 'number invalide');
  if (!ed.updated || Number.isNaN(Date.parse(ed.updated))) fail(where, 'updated invalide');
  if (words(ed.headline) < 4 || words(ed.headline) > 14) fail(where, 'headline : 4 à 14 mots');
  if (words(ed.lede) < 15 || words(ed.lede) > 70) fail(where, 'lede : 15 à 70 mots');
  const es = ed.essentials || [];
  if (es.length !== 5) fail(where, `il faut 5 essentiels (trouvé ${es.length})`);
  es.forEach((e, i) => {
    const w = `${where} › essentiel ${i + 1} (${e.id})`;
    if (e.rank !== i + 1) fail(w, 'rank doit valoir ' + (i + 1));
    if (!codes.has(e.id) && !(Array.isArray(e.focus) && e.focus.length === 2)) fail(w, 'id inconnu sur la carte et pas de focus');
    if (!e.place) fail(w, 'place manquant');
    if ((i === 4) !== (e.radar === true)) fail(w, 'radar doit être true au rang 5 uniquement');
    if (words(e.title) < 3 || words(e.title) > 10) fail(w, 'title : 3 à 10 mots');
    for (const k of ['what', 'why', 'next']) {
      const n = words(e[k]);
      if (n < 10) fail(w, `${k} trop court`);
      if (n > 50) fail(w, `${k} trop long (${n} mots, max 50)`);
    }
    if (e.since && (!isDate(e.since.date) || !e.since.label)) fail(w, 'since invalide');
    (e.involved || []).forEach((c) => { if (!codes.has(c)) fail(w, `pays impliqué inconnu : ${c}`); });
    (e.zones || []).forEach((z) => { if (!z.id || !z.name || !Array.isArray(z.coords)) fail(w, 'zone invalide'); });
    if (!Array.isArray(e.qa) || e.qa.length !== 3) fail(w, 'il faut 3 questions');
    (e.qa || []).forEach((q, j) => { if (!q.q || words(q.a) < 10 || words(q.a) > 80) fail(w, `question ${j + 1} invalide`); });
    const ctx = e.context || [];
    if (ctx.length < 2 || ctx.length > 7) fail(w, 'context : 2 à 7 dates');
    ctx.forEach((c) => { if (!isDate(c.d) || !c.t) fail(w, 'date de context invalide'); });
    const src = e.sources || [];
    if (src.length < 2 || src.length > 5) fail(w, 'sources : 2 à 5');
    src.forEach((s) => { if (!s.name || !s.title || !isUrl(s.url)) fail(w, 'source invalide'); });
  });
  const br = ed.brief || [];
  if (br.length < 2 || br.length > 5) fail(where, 'brief : 2 à 5 lignes');
  br.forEach((b) => { if (!b.place || words(b.text) < 5 || words(b.text) > 40 || (b.url && !isUrl(b.url))) fail(where, `brief invalide (${b.place})`); });
  (ed.agenda || []).forEach((a) => { if (!isDate(a.d) || !a.t) fail(where, 'agenda invalide'); });
}

const dir = path.join(root, 'data/editions');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
if (!files.length) fail('data/editions', 'aucune édition');
const editions = files.map((f) => { const ed = read('data/editions/' + f); if (ed.date + '.json' !== f) fail(f, 'le nom du fichier doit être la date'); checkEdition(ed, f); return ed; });

const latest = read('data/latest.json');
const newest = editions[editions.length - 1];
if (JSON.stringify(latest) !== JSON.stringify(newest)) fail('data/latest.json', `doit être identique à data/editions/${newest.date}.json`);

const index = read('data/index.json');
const want = editions.slice().reverse().map((e) => e.date);
if (JSON.stringify(index.map((i) => i.date)) !== JSON.stringify(want)) fail('data/index.json', 'doit lister toutes les éditions, la plus récente en premier');
index.forEach((i) => { const ed = editions.find((e) => e.date === i.date); if (ed && (i.headline !== ed.headline || i.number !== ed.number)) fail('data/index.json', `entrée ${i.date} différente de l'édition`); });
editions.forEach((e, i) => { if (i && e.number !== editions[i - 1].number + 1) fail(e.date, 'number doit suivre la veille'); });

if (problems.length) { console.error(problems.map((p) => '✗ ' + p).join('\n')); process.exit(1); }
console.log(`OK — ${editions.length} édition(s), dernière : ${newest.date} (n° ${newest.number})`);
