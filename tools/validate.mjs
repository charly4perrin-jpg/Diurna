// Vérifie les éditions avant publication : node tools/validate.mjs
// Sort avec le code 1 et la liste des problèmes si quelque chose ne va pas.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const problems = [], warnings = [];
const fail = (where, msg) => problems.push(`${where} : ${msg}`);
const warn = (where, msg) => warnings.push(`${where} : ${msg}`);

const world = read('assets/world.json');
const codes = new Set(world.objects.countries.geometries.map((g) => g.properties.a3));
const isDate = (s) => /^\d{4}-\d{2}(-\d{2})?$/.test(String(s));
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const isUrl = (s) => /^https:\/\/\S+$/.test(String(s || ''));
const countries = read('data/countries.json');
const gov = read('data/gov.json');
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

const TYPES = new Set(['conflict', 'election', 'economy', 'diplomacy', 'disaster', 'society']);
const NGOS = new Set(['icrc', 'ifrc', 'msf', 'unicef', 'wfp', 'unhcr', 'crf']);
const DATA_MODULES = new Set(['market', 'rate', 'inflation', 'help']); // alimentés par des données publiques ou une liste fermée
const isLL = (c) => Array.isArray(c) && c.length === 2 && c.every((n) => typeof n === 'number') && Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 90;
const hasSrc = (x) => !!(x && x.source && x.source.name && isUrl(x.source.url));

// Emprise (lon/lat min-max) de chaque pays, pour vérifier que les lieux cités tombent au bon endroit.
const topojson = createRequire(import.meta.url)('../assets/vendor/topojson-client.min.js');
const BBOX = {};
for (const f of topojson.feature(world, world.objects.countries).features) {
  const b = [180, 90, -180, -90];
  const walk = (c) => { if (typeof c[0] === 'number') { b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]); b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]); } else c.forEach(walk); };
  if (f.geometry) walk(f.geometry.coordinates);
  BBOX[f.properties.a3] = b;
}
const inBox = (ll, id, pad = 1.5) => { const b = BBOX[id]; return !!b && ll[0] >= b[0] - pad && ll[0] <= b[2] + pad && ll[1] >= b[1] - pad && ll[1] <= b[3] + pad; };
function checkPlaces(e, w) {
  const ids = new Set([e.id, ...(e.involved || [])]);
  const m = e.modules || {};
  (m.sides && m.sides.groups || []).forEach((g) => (g.ids || []).forEach((x) => ids.add(x)));
  (m.table && m.table.ids || []).concat(m.table && m.table.host ? [m.table.host] : []).forEach((x) => ids.add(x));
  const pts = [...(m.places && m.places.items || []).map((i) => [i.name, i.coords]), ...(e.zones || []).filter((z) => isLL(z.coords)).map((z) => [z.name, z.coords])];
  for (const [name, ll] of pts) {
    if (!isLL(ll) || [...ids].some((id) => inBox(ll, id))) continue;
    if ([...ids].some((id) => inBox([ll[1], ll[0]], id))) fail(w, `lieu « ${name} » : coordonnées inversées ? Il faut [longitude, latitude]`);
    else warn(w, `lieu « ${name} » [${ll}] hors des pays du sujet (${[...ids].join(', ')}) : vérifier les coordonnées`);
  }
}

// Qualité des sources (data/sources.json) : au moins une rédaction ou institution de référence par sujet
// (règle appliquée aux éditions à partir du 10 novembre 2026), et un avertissement pour les sources faibles.
const SRC = (() => { try { return read('data/sources.json'); } catch (_) { return { ref: [], weak: [] }; } })();
const SOURCES_RULE_SINCE = '2026-11-10';
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (_) { return ''; } };
const inList = (h, list) => list.some((d) => h === d || h.endsWith('.' + d));
function checkSourceQuality(e, w, date) {
  const hosts = (e.sources || []).map((x) => hostOf(x.url));
  const weak = hosts.filter((h) => inList(h, SRC.weak));
  if (weak.length) warn(w, `source(s) faible(s) : ${weak.join(', ')} — préférer une rédaction de référence (data/sources.json)`);
  if (!hosts.some((h) => inList(h, SRC.ref))) {
    const msg = `aucune source de référence parmi ${hosts.join(', ')} : ajouter au moins une rédaction ou institution listée dans data/sources.json`;
    if (date >= SOURCES_RULE_SINCE) fail(w, msg); else warn(w, msg);
  }
}

// Mêmes chiffres en français et en anglais : nombres des modules, et chiffres du « chiffre du jour ».
const nums = (x, out = []) => { if (typeof x === 'number') out.push(x); else if (Array.isArray(x)) x.forEach((v) => nums(v, out)); else if (x && typeof x === 'object') Object.entries(x).forEach(([k, v]) => { if (k !== 'source') nums(v, out); }); return out; };
const digits = (s) => String(s || '').replace(/[^0-9]/g, '');

function checkModules(e, w) {
  if (!Array.isArray(e.types) || !e.types.length || e.types.length > 3) fail(w, 'types : 1 à 3 types');
  (e.types || []).forEach((ty) => { if (!TYPES.has(ty)) fail(w, `type inconnu : ${ty}`); });
  const m = e.modules || {};
  for (const [k, v] of Object.entries(m)) {
    const mw = `${w} › module ${k}`;
    if (!DATA_MODULES.has(k)) {
      const items = Array.isArray(v.items) ? v.items : null;
      if (!hasSrc(v) && !(items && items.length && items.every(hasSrc))) fail(mw, 'source obligatoire (module ou chaque élément)');
    }
    switch (k) {
      case 'toll': if (!v.items || !v.items.length || v.items.some((i) => !i.value || !i.label || !isDate(i.date))) fail(mw, 'items {value, label, date} obligatoires'); break;
      case 'places': if (!v.items || !v.items.length || v.items.some((i) => !i.name || !isLL(i.coords))) fail(mw, 'items {name, coords [lon, lat]} obligatoires'); break;
      case 'sides': if (!v.groups || v.groups.length < 2) fail(mw, 'au moins deux groupes');
        (v.groups || []).forEach((g) => { (g.ids || []).concat((g.backers || []).map((b) => b.id)).forEach((id) => { if (!codes.has(id)) fail(mw, `pays inconnu : ${id}`); }); });
        (v.mediators || []).forEach((x) => { if (!codes.has(x.id)) fail(mw, `médiateur inconnu : ${x.id}`); }); break;
      case 'vote': if (!isDate(v.date) || !v.title || !Array.isArray(v.bodies) || !v.bodies.length) fail(mw, 'title, date et bodies obligatoires');
        (v.bodies || []).forEach((b) => { const sum = (b.parties || []).reduce((a, p) => a + p.value, 0); if (!b.total || !b.majority || sum > b.total) fail(mw, `${b.name} : total, majority, et somme des partis ≤ total`); }); break;
      case 'scenarios': if (!v.items || !v.items.length || v.items.some((i) => !i.if || !i.then)) fail(mw, 'items {if, then} obligatoires'); break;
      case 'table': if (!v.ids || v.ids.length < 2) fail(mw, 'au moins deux pays à la table');
        (v.ids || []).concat(v.host ? [v.host] : []).forEach((id) => { if (!codes.has(id)) fail(mw, `pays inconnu : ${id}`); });
        if (v.next && (!isDate(v.next.d) || !v.next.t)) fail(mw, 'next {d, t} invalide'); break;
      case 'impact': if (!v.text) fail(mw, 'text obligatoire'); else range(mw, 'impact', v.text, 15, 70); break;
      case 'market': if (!v.series) fail(mw, 'series obligatoire (ex. brent)'); break;
      case 'rate': if (!/^[A-Z]{3}$/.test(v.currency || '')) fail(mw, 'currency : code ISO à trois lettres'); break;
      case 'help': if (!v.orgs || !v.orgs.length || v.orgs.some((o) => !NGOS.has(o))) fail(mw, `orgs : uniquement ${[...NGOS].join(', ')}`); break;
      case 'actors': case 'dates': if (!v.items || !v.items.length) fail(mw, 'items obligatoires'); break;
      case 'inflation': break;
      default: fail(mw, 'module inconnu');
    }
  }
}

function range(w, label, text, min, max) { const n = words(text); if (n < min || n > max) fail(w, `${label} : ${min} à ${max} mots (${n})`); }

// Aucun champ texte vide, nulle part dans l'édition.
function noEmpty(x, where, trail = '') {
  if (typeof x === 'string') { if (!x.trim()) fail(where, `champ vide : ${trail || '(racine)'}`); return; }
  if (Array.isArray(x)) { x.forEach((v, i) => noEmpty(v, where, `${trail}[${i}]`)); return; }
  if (x && typeof x === 'object') Object.entries(x).forEach(([k, v]) => noEmpty(v, where, trail ? `${trail}.${k}` : k));
}

function checkEdition(ed, where, lang = 'fr') {
  noEmpty(ed, where);
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
    checkModules(e, w);
    checkPlaces(e, w);
    // Mises à jour du soir : [{ time, text }], affichées sur la fiche et dans la page Corrections.
    if (e.updates !== undefined) {
      if (!Array.isArray(e.updates)) fail(w, 'updates : liste de { time, text }');
      else e.updates.forEach((u, j) => {
        if (!u || Number.isNaN(Date.parse(u.time))) fail(w, `updates[${j}].time : date ISO avec décalage (ex. 2026-11-07T19:45:00+01:00)`);
        else if (u.time.slice(0, 10) < ed.date) fail(w, `updates[${j}].time antérieure à l'édition`);
        range(w, `updates[${j}].text`, u && u.text, 5, 45);
      });
    }
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
    if (lang === 'fr') checkSourceQuality(e, w, ed.date);
    // Adresse et dossier : le slug est donné par tools/build.mjs (ne pas l'écrire, ne jamais le modifier).
    if (e.slug !== undefined && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.slug)) fail(w, 'slug invalide (minuscules, chiffres et tirets)');
    if (e.dossier !== undefined) {
      if (!e.dossier || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.dossier.id || '') || e.dossier.id.length > 40) fail(w, 'dossier.id : minuscules, chiffres et tirets, 40 caractères au plus');
      if (e.dossier) range(w, 'dossier.title', e.dossier.title, 1, 8);
    }
    const all = [e.title, e.standfirst, ...(e.body || []), e.analysis && e.analysis.text, ...(e.keys || []).map((k) => k.text)].join(' ');
    if (lang === 'fr' && /(?<![\p{L}\u2019'])(tu|toi|ton|ta|tes|te)(?![\p{L}])/iu.test(all)) fail(w, 'pas de tutoiement dans les articles');
  });
  const slugs = es.map((e) => e.slug).filter(Boolean);
  if (new Set(slugs).size !== slugs.length) fail(where, 'deux sujets ont le même slug');
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
  if (!g.regime_en || (g.leaders || []).some((l) => !l.role_en)) fail(w, 'regime_en et role_en (anglais) obligatoires');
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

/* ---------- Édition anglaise ---------- */
const enDir = path.join(root, 'data/en/editions');
const enFiles = fs.existsSync(enDir) ? fs.readdirSync(enDir).filter((f) => f.endsWith('.json')).sort() : [];
const enEditions = enFiles.map((f) => {
  const en = read('data/en/editions/' + f), w = 'en/' + f;
  if (en.date + '.json' !== f) fail(w, 'le nom du fichier doit être la date');
  checkEdition(en, w, 'en');
  const frEd = editions.find((x) => x.date === en.date);
  if (!frEd) fail(w, 'aucune édition française à cette date');
  else {
    if (en.number !== frEd.number) fail(w, 'number différent de l’édition française');
    const a = (en.essentials || []).map((e) => `${e.rank}:${e.id}`).join(','), b = frEd.essentials.map((e) => `${e.rank}:${e.id}`).join(',');
    if (a !== b) fail(w, `les cinq sujets doivent être les mêmes qu'en français (${b})`);
    else (en.essentials || []).forEach((e, i) => {
      const f = frEd.essentials[i], ww = `${w} › essentiel ${e.rank} (${e.id})`;
      const km = Object.keys(e.modules || {}).sort().join(','), kf = Object.keys(f.modules || {}).sort().join(',');
      if (km !== kf) fail(ww, `mêmes modules qu'en français attendus (${kf || 'aucun'})`);
      else for (const k of Object.keys(f.modules || {})) {
        const x = nums(e.modules[k]).join('|'), y = nums(f.modules[k]).join('|');
        if (x !== y) fail(ww, `module ${k} : chiffres différents du français (${y} en français, ${x} en anglais)`);
      }
      if (e.figure && f.figure && digits(e.figure.value) !== digits(f.figure.value)) fail(ww, `chiffre du jour différent du français (« ${f.figure.value} » / « ${e.figure.value} »)`);
    });
  }
  return en;
});
if (enEditions.length) {
  const newestEn = enEditions[enEditions.length - 1];
  if (JSON.stringify(read('data/en/latest.json')) !== JSON.stringify(newestEn)) fail('data/en/latest.json', `doit être identique à data/en/editions/${newestEn.date}.json`);
  const enIndex = read('data/en/index.json');
  if (JSON.stringify(enIndex.map((i) => i.date)) !== JSON.stringify(enEditions.slice().reverse().map((e) => e.date))) fail('data/en/index.json', 'doit lister toutes les éditions anglaises, la plus récente en premier');
}

if (warnings.length) console.log(warnings.map((p) => '⚠ ' + p).join('\n'));
if (problems.length) { console.error(problems.map((p) => '✗ ' + p).join('\n')); process.exit(1); }
console.log(`OK — ${editions.length} édition(s), dernière : ${newest.date} (n° ${newest.number}) ; anglais : ${enEditions.length ? enEditions[enEditions.length - 1].date : 'aucune'}`);
