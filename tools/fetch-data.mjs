// Récupère les données chiffrées publiques et les met en cache dans data/.
// Lancé chaque matin par la GitHub Action « Données » (.github/workflows/data.yml), avant l'édition.
// Chaque source est indépendante : si l'une échoue, la valeur de la veille est conservée.
// Aucune clé API. Sources : BCE, EIA (via FRED et datasets/oil-prices), Banque mondiale, USGS, GDACS.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = (p) => path.join(root, p);
const readJson = (p, d) => { try { return JSON.parse(fs.readFileSync(file(p), 'utf8')); } catch (_) { return d; } };
const writeJson = (p, v) => fs.writeFileSync(file(p), JSON.stringify(v) + '\n');
const today = new Date().toISOString().slice(0, 10);
const log = [];

async function get(url, type = 'text') {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 30000);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'Diurna data bot (static news site)' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return type === 'json' ? await r.json() : await r.text();
  } finally { clearTimeout(timer); }
}
async function step(name, fn) {
  try { await fn(); log.push(`✓ ${name}`); }
  catch (e) { log.push(`✗ ${name} : ${e.message} (valeur précédente conservée)`); }
}

/* ---------- Marchés : pétrole et taux de change ---------- */
const markets = readJson('data/markets.json', {});

function parseBrentCsv(csv) {
  const rows = csv.trim().split('\n').slice(1).map((l) => l.split(','))
    .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r[0]) && r[1] !== '' && r[1] !== '.' && !Number.isNaN(Number(r[1])));
  if (rows.length < 100) throw new Error('série trop courte');
  const from = new Date(Date.now() - 730 * 864e5).toISOString().slice(0, 10);
  return rows.filter((r) => r[0] >= from).map((r) => [r[0], Math.round(Number(r[1]) * 100) / 100]);
}

await step('Brent (EIA)', async () => {
  let series, via;
  try { series = parseBrentCsv(await get('https://fred.stlouisfed.org/graph/fredgraph.csv?id=DCOILBRENTEU')); via = 'FRED'; }
  catch (_) { series = parseBrentCsv(await get('https://raw.githubusercontent.com/datasets/oil-prices/main/data/brent-daily.csv')); via = 'datasets/oil-prices'; }
  markets.brent = {
    unit: 'USD', label: { fr: 'Brent, en dollars le baril', en: 'Brent crude, dollars a barrel' },
    source: { name: 'EIA', url: 'https://www.eia.gov/dnav/pet/hist/RBRTEd.htm', via }, checked: today, series
  };
});

await step('Taux de change (BCE)', async () => {
  const xml = await get('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml');
  const days = [...xml.matchAll(/<Cube time=['"](\d{4}-\d{2}-\d{2})['"]>([\s\S]*?)<\/Cube>/g)];
  if (!days.length) throw new Error('format inattendu');
  const hist = {};
  for (const [, date, body] of days) {
    for (const [, cur, rate] of body.matchAll(/currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g)) {
      (hist[cur] = hist[cur] || []).push([date, Number(rate)]);
    }
  }
  Object.values(hist).forEach((s) => s.sort((a, b) => a[0].localeCompare(b[0])));
  const latest = days.map((d) => d[1]).sort().pop();
  const rates = {};
  for (const [cur, s] of Object.entries(hist)) if (s.length && s[s.length - 1][0] === latest) rates[cur] = s[s.length - 1][1];
  markets.fx = {
    base: 'EUR', date: latest, rates, history: hist,
    source: { name: 'Banque centrale européenne', name_en: 'European Central Bank', url: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html' },
    checked: today
  };
});
markets.updated = today;
writeJson('data/markets.json', markets);

/* ---------- Indicateurs (Banque mondiale) ---------- */
const indicators = readJson('data/indicators.json', {});
async function wb(code) {
  const data = await get(`https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&mrnev=1&per_page=400`, 'json');
  const rows = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
  const out = {};
  for (const r of rows) if (r.countryiso3code && r.value !== null) out[r.countryiso3code] = { year: Number(r.date), value: Math.round(r.value * 10) / 10 };
  if (Object.keys(out).length < 100) throw new Error('trop peu de pays');
  return out;
}
await step('Inflation (Banque mondiale)', async () => {
  indicators.inflation = {
    label: { fr: 'Inflation, prix à la consommation', en: 'Consumer price inflation' }, unit: '%',
    source: { name: 'Banque mondiale', name_en: 'World Bank', url: 'https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG' },
    checked: today, items: await wb('FP.CPI.TOTL.ZG')
  };
});
indicators.updated = today;
writeJson('data/indicators.json', indicators);

/* ---------- Catastrophes (USGS, GDACS) ---------- */
const hazards = readJson('data/hazards.json', {});
await step('Séismes importants (USGS)', async () => {
  const g = await get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson', 'json');
  hazards.quakes = {
    source: { name: 'USGS', url: 'https://earthquake.usgs.gov/earthquakes/map/' }, checked: today,
    items: (g.features || []).map((f) => ({
      id: f.id, mag: f.properties.mag, place: f.properties.place, time: new Date(f.properties.time).toISOString(),
      coords: f.geometry.coordinates.slice(0, 2), url: f.properties.url
    }))
  };
});
await step('Alertes GDACS', async () => {
  const g = await get('https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?eventlist=EQ;TC;FL;VO;DR;WF', 'json');
  const items = (g.features || []).map((f) => {
    const p = f.properties || {};
    return {
      id: `${p.eventtype}${p.eventid}`, type: p.eventtype, level: p.alertlevel, name: p.name || p.eventname,
      iso3: p.iso3, country: p.country, from: p.fromdate, to: p.todate,
      coords: f.geometry && f.geometry.type === 'Point' ? f.geometry.coordinates.slice(0, 2) : null,
      url: (p.url && (p.url.report || p.url.details)) || 'https://www.gdacs.org/'
    };
  }).filter((x) => x.level === 'Orange' || x.level === 'Red');
  hazards.gdacs = { source: { name: 'GDACS', url: 'https://www.gdacs.org/' }, checked: today, items };
});
hazards.updated = today;
writeJson('data/hazards.json', hazards);

console.log(log.join('\n'));
