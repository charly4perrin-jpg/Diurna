// Génère data/countries.json, la fiche d'identité fixe de chaque pays du globe.
// À relancer rarement (une fois par an suffit pour la population) :
//   node tools/countries.mjs <countries.json de mledoze/countries> <population.csv de datasets/population>
// Sources : github.com/mledoze/countries (ODbL) et Banque mondiale via github.com/datasets/population.
// Le dirigeant et le régime ne sont PAS ici : ils changent et sont vérifiés au jour le jour dans data/gov.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [mledozePath, popPath] = process.argv.slice(2);
if (!mledozePath || !popPath) { console.error('Usage : node tools/countries.mjs <countries.json> <population.csv>'); process.exit(1); }

const world = JSON.parse(fs.readFileSync(path.join(root, 'assets/world.json'), 'utf8'));
const meta = new Map(JSON.parse(fs.readFileSync(mledozePath, 'utf8')).map((c) => [c.cca3, c]));
meta.set('XKX', meta.get('UNK'));

// Population : dernière année disponible par code pays.
const pop = new Map();
for (const line of fs.readFileSync(popPath, 'utf8').split('\n').slice(1)) {
  const m = line.match(/^(?:"[^"]*"|[^,]*),([A-Z]{3}),(\d{4}),(\d+(?:\.\d+)?)/);
  if (!m) continue;
  const [, code, year, value] = m;
  const prev = pop.get(code);
  if (!prev || Number(year) > prev.year) pop.set(code, { year: Number(year), value: Math.round(Number(value)) });
}

// Capitales en français (graphies de presse).
const CAPITAL = {
  FJI: 'Suva', TZA: 'Dodoma', ESH: 'Laâyoune (territoire disputé)', CAN: 'Ottawa', USA: 'Washington', KAZ: 'Astana', UZB: 'Tachkent',
  PNG: 'Port Moresby', IDN: 'Jakarta', ARG: 'Buenos Aires', CHL: 'Santiago', COD: 'Kinshasa', SOM: 'Mogadiscio', KEN: 'Nairobi',
  SDN: 'Khartoum', TCD: "N'Djamena", HTI: 'Port-au-Prince', DOM: 'Saint-Domingue', RUS: 'Moscou', BHS: 'Nassau', FLK: 'Stanley',
  NOR: 'Oslo', GRL: 'Nuuk', ATF: 'Port-aux-Français', TLS: 'Dili', ZAF: 'Pretoria', LSO: 'Maseru', MEX: 'Mexico', URY: 'Montevideo',
  BRA: 'Brasilia', BOL: 'Sucre', PER: 'Lima', COL: 'Bogota', PAN: 'Panama', CRI: 'San José', NIC: 'Managua', HND: 'Tegucigalpa',
  SLV: 'San Salvador', GTM: 'Guatemala', BLZ: 'Belmopan', VEN: 'Caracas', GUY: 'Georgetown', SUR: 'Paramaribo', FRA: 'Paris',
  ECU: 'Quito', PRI: 'San Juan', JAM: 'Kingston', CUB: 'La Havane', ZWE: 'Harare', BWA: 'Gaborone', NAM: 'Windhoek', SEN: 'Dakar',
  MLI: 'Bamako', MRT: 'Nouakchott', BEN: 'Porto-Novo', NER: 'Niamey', NGA: 'Abuja', CMR: 'Yaoundé', TGO: 'Lomé', GHA: 'Accra',
  CIV: 'Yamoussoukro', GIN: 'Conakry', GNB: 'Bissau', LBR: 'Monrovia', SLE: 'Freetown', BFA: 'Ouagadougou', CAF: 'Bangui',
  COG: 'Brazzaville', GAB: 'Libreville', GNQ: 'Malabo', ZMB: 'Lusaka', MWI: 'Lilongwe', MOZ: 'Maputo', SWZ: 'Mbabane', AGO: 'Luanda',
  BDI: 'Gitega', ISR: 'Jérusalem (statut contesté)', LBN: 'Beyrouth', MDG: 'Antananarivo', PSE: "Ramallah (siège de l'Autorité palestinienne)",
  GMB: 'Banjul', TUN: 'Tunis', DZA: 'Alger', JOR: 'Amman', ARE: 'Abou Dhabi', QAT: 'Doha', KWT: 'Koweït', IRQ: 'Bagdad', OMN: 'Mascate',
  VUT: 'Port-Vila', KHM: 'Phnom Penh', THA: 'Bangkok', LAO: 'Vientiane', MMR: 'Naypyidaw', VNM: 'Hanoï', PRK: 'Pyongyang', KOR: 'Séoul',
  MNG: 'Oulan-Bator', IND: 'New Delhi', BGD: 'Dacca', BTN: 'Thimphou', NPL: 'Katmandou', PAK: 'Islamabad', AFG: 'Kaboul',
  TJK: 'Douchanbé', KGZ: 'Bichkek', TKM: 'Achgabat', IRN: 'Téhéran', SYR: 'Damas', ARM: 'Erevan', SWE: 'Stockholm', BLR: 'Minsk',
  UKR: 'Kiev', POL: 'Varsovie', AUT: 'Vienne', HUN: 'Budapest', MDA: 'Chisinau', ROU: 'Bucarest', LTU: 'Vilnius', LVA: 'Riga',
  EST: 'Tallinn', DEU: 'Berlin', BGR: 'Sofia', GRC: 'Athènes', TUR: 'Ankara', ALB: 'Tirana', HRV: 'Zagreb', CHE: 'Berne',
  LUX: 'Luxembourg', BEL: 'Bruxelles', NLD: 'Amsterdam', PRT: 'Lisbonne', ESP: 'Madrid', IRL: 'Dublin', NCL: 'Nouméa',
  SLB: 'Honiara', NZL: 'Wellington', AUS: 'Canberra', LKA: 'Colombo', CHN: 'Pékin', TWN: 'Taipei', ITA: 'Rome', DNK: 'Copenhague',
  GBR: 'Londres', ISL: 'Reykjavik', AZE: 'Bakou', GEO: 'Tbilissi', PHL: 'Manille', MYS: 'Kuala Lumpur', BRN: 'Bandar Seri Begawan',
  SVN: 'Ljubljana', FIN: 'Helsinki', SVK: 'Bratislava', CZE: 'Prague', ERI: 'Asmara', JPN: 'Tokyo', PRY: 'Asuncion', YEM: 'Sanaa',
  SAU: 'Riyad', CYP: 'Nicosie', MAR: 'Rabat', EGY: 'Le Caire', LBY: 'Tripoli', ETH: 'Addis-Abeba', DJI: 'Djibouti', SOL: 'Hargeisa',
  UGA: 'Kampala', RWA: 'Kigali', BIH: 'Sarajevo', MKD: 'Skopje', SRB: 'Belgrade', MNE: 'Podgorica', XKX: 'Pristina',
  TTO: 'Port of Spain', SSD: 'Djouba'
};

const SUB = {
  'South America': 'Amérique du Sud', 'North America': 'Amérique du Nord', 'Central America': 'Amérique du Nord', Caribbean: 'Amérique du Nord'
};
const REGION = { Africa: 'Afrique', Asia: 'Asie', Europe: 'Europe', Oceania: 'Océanie', Antarctic: 'Antarctique' };
const EXTRA = { // territoires absents ou incomplets dans les données de base
  CYN: { continent: 'Europe' }, SOL: { continent: 'Afrique', a2: null }, ESH: { continent: 'Afrique' }
};

// Corrections ponctuelles des données de base (ordre des langues, graphies de presse).
const FIX = {
  ISR: { languages: ['hébreu', 'arabe'] },
  PSE: { currencies: ['nouveau shekel israélien', 'dinar jordanien'] }
};
const CURRENCY = { USD: 'dollar américain', IRR: 'rial iranien' };

const lang = new Intl.DisplayNames('fr', { type: 'language' });
const cur = new Intl.DisplayNames('fr', { type: 'currency' });
const flagDir = path.join(root, 'assets/flags');
const flags = new Set(fs.existsSync(flagDir) ? fs.readdirSync(flagDir) : []);
const flagFile = (a2) => a2 && (flags.has(a2 + '.svg') ? a2 + '.svg' : flags.has(a2 + '.webp') ? a2 + '.webp' : null);

const out = {};
for (const g of world.objects.countries.geometries) {
  const a3 = g.properties.a3;
  if (a3 === 'ATA') continue;
  const m = meta.get(a3);
  const e = { name: g.properties.fr };
  const a2 = m ? m.cca2.toLowerCase() : null;
  if (a2) e.a2 = a2 === 'xk' ? 'xk' : a2;
  const f = flagFile(e.a2);
  if (f) e.flag = f;
  if (CAPITAL[a3]) e.capital = CAPITAL[a3];
  const p = pop.get(a3);
  if (p) { e.population = p.value; e.popYear = p.year; }
  if (m && m.languages) e.languages = Object.keys(m.languages).slice(0, 3).map((k) => { try { return lang.of(k); } catch (_) { return m.languages[k]; } });
  if (m && m.currencies) e.currencies = Object.keys(m.currencies).slice(0, 2).map((k) => { if (CURRENCY[k]) return CURRENCY[k]; try { return cur.of(k); } catch (_) { return m.currencies[k].name; } });
  e.continent = (m && (SUB[m.subregion] || REGION[m.region])) || (EXTRA[a3] && EXTRA[a3].continent) || null;
  Object.assign(e, FIX[a3] || {});
  out[a3] = e;
}
fs.writeFileSync(path.join(root, 'data/countries.json'), JSON.stringify(out));
console.log(`data/countries.json : ${Object.keys(out).length} pays, ${Object.values(out).filter((e) => e.flag).length} drapeaux, ${Object.values(out).filter((e) => e.population).length} populations.`);
