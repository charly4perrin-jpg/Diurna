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
const countries = read('data/countries.json');
const gov = read('data/gov.json');
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

function checkEdition(ed, where) {
  const range = (w, label, text, min, max) => { const n = words(text); if (n < min || n > max) fail(w, `${label} : ${min} à ${max} mots (${n})`); };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ed.date)) fail(where, 'date invalide');
  if (!Number.isInteger(ed.number) || ed.number < 1) fail(where, 'number invalide');
  if (!ed.updated || Number.isNaN(Date.parse(ed.updated))) fail(where, 'updated invalide');
  range(where, 'headline', ed.headline, 5, 16);
  range(where, 'standfirst', ed.standfirst, 20, 80);
  const es = ed.essentials || [];
  if (es.length !== 5) fail(where, `il faut 5 essentiels (trouvé ${es.length})`);
  es.forEach((e, i) => {
    const w = `${where} › essentiel ${i + 1} (${e.id})`;
    if (e.rank !== i + 1) fail(w, 'rank doit valoir ' + (i + 1));
    if (!codes.has(e.id) && !(Array.isArray(e.focus) && e.focus.length === 2)) fail(w, 'id inconnu sur la carte et pas de focus');
    if (!e.place || !e.section) fail(w, 'place ou section manquant');
    if ((i === 4) !== (e.radar === true)) fail(w, 'radar doit être true au rang 5 uniquement');
    range(w, 'title', e.title, 5, 18);
    range(w, 'standfirst', e.standfirst, 15, 55);
    if (!Array.isArray(e.body) || e.body.length !== 3) fail(w, 'body : exactement trois phrases');
    (e.body || []).forEach((b, j) => range(w, `phrase ${j + 1}`, b, 12, 62));
    if (!e.figure || !e.figure.value || !e.figure.label) fail(w, 'figure (chiffre du jour) manquant : value et label');
    else { range(w, 'figure.value', e.figure.value, 1, 4); range(w, 'figure.label', e.figure.label, 1, 14); if (e.figure.compare) range(w, 'figure.compare', e.figure.compare, 2, 16); }
    if (!countries[e.id]) fail(w, `pays absent de data/countries.json : ${e.id}`);
    const gv = gov[e.id];
    if (!gv) fail(w, `dirigeant et régime à vérifier puis ajouter dans data/gov.json : ${e.id}`);
    else if (days(gv.checked, ed.date) > 30) fail(w, `data/gov.json : ${e.id} vérifié il y a plus de 30 jours (${gv.checked}), revérifier`);
    if (!e.analysis || !e.analysis.title) fail(w, 'analysis manquant');
    else { range(w, 'analysis.title', e.analysis.title, 2, 10); range(w, 'analysis.text', e.analysis.text, 50, 170); }
    if (!Array.isArray(e.keys) || e.keys.length < 2 || e.keys.length > 3) fail(w, 'keys : 2 ou 3 clés');
    (e.keys || []).forEach((k, j) => { if (!k.title) fail(w, `clé ${j + 1} sans titre`); range(w, `clé ${j + 1}`, k.text, 15, 75); });
    if (e.since && (!isDate(e.since.date) || !e.since.label)) fail(w, 'since invalide');
    (e.involved || []).forEach((c) => { if (!codes.has(c)) fail(w, `pays impliqué inconnu : ${c}`); });
    (e.zones || []).forEach((z) => { if (!z.id || !z.name || !Array.isArray(z.coords)) fail(w, 'zone invalide'); });
    const ctx = e.context || [];
    if (ctx.length < 2 || ctx.length > 7) fail(w, 'context : 2 à 7 dates');
    ctx.forEach((c) => { if (!isDate(c.d) || !c.t) fail(w, 'date de context invalide'); });
    const src = e.sources || [];
    if (src.length < 2 || src.length > 5) fail(w, 'sources : 2 à 5');
    src.forEach((s) => { if (!s.name || !s.title || !isUrl(s.url)) fail(w, 'source invalide'); });
    const all = [e.title, e.standfirst, ...(e.body || []), e.analysis && e.analysis.text, ...(e.keys || []).map((k) => k.text)].join(' ');
    if (/(?<![\p{L}\u2019'])(tu|toi|ton|ta|tes|te)(?![\p{L}])/iu.test(all)) fail(w, 'pas de tutoiement');
  });
  const br = ed.brief || [];
  if (br.length < 2 || br.length > 5) fail(where, 'brief : 2 à 5 lignes');
  br.forEach((b) => { if (!b.place) fail(where, 'brief sans lieu'); range(where, `brief ${b.place}`, b.text, 8, 50); if (b.url && !isUrl(b.url)) fail(where, `brief ${b.place} : url invalide`); });
  (ed.agenda || []).forEach((a) => { if (!isDate(a.d) || !a.t) fail(where, 'agenda invalide'); });
}

Object.entries(gov).forEach(([id, g]) => {
  const w = `data/gov.json › ${id}`;
  if (!countries[id]) fail(w, 'code pays inconnu');
  if (!g.regime || !Array.isArray(g.leaders) || !g.leaders.length) fail(w, 'regime et leaders obligatoires');
  (g.leaders || []).forEach((l) => { if (!l.role || !l.name) fail(w, 'chaque dirigeant a un role et un name'); });
  if (!isDate(g.checked)) fail(w, 'checked doit être une date AAAA-MM-JJ');
  if (!g.source || !g.source.name || !isUrl(g.source.url)) fail(w, 'source invalide');
});

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
