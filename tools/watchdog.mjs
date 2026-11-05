// Vérifie que l'édition du jour est publiée et en ligne : node tools/watchdog.mjs
// Sort avec le code 1 (et la liste des problèmes) si quelque chose manque.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => { try { return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8')); } catch (_) { return null; } };
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
const problems = [];

const fr = read('data/latest.json'), en = read('data/en/latest.json');
if (!fr || fr.date !== today) problems.push(`L'édition française du ${today} n'est pas dans le dépôt (dernière : ${fr ? fr.date : 'aucune'}).`);
if (en && en.date !== today) problems.push(`L'édition anglaise du ${today} n'est pas dans le dépôt (dernière : ${en.date}).`);

const site = read('site.json') || {};
if (site.url) {
  try {
    const r = await fetch(site.url.replace(/\/$/, '') + '/status.json?t=' + Date.now(), { cache: 'no-store' });
    const st = r.ok ? await r.json() : null;
    if (!st) problems.push(`Le site en ligne ne répond pas (status.json : HTTP ${r.status}).`);
    else {
      if (!st.edition || !st.edition.fr || st.edition.fr.date !== today) problems.push(`Le site en ligne affiche encore l'édition du ${st.edition && st.edition.fr ? st.edition.fr.date : '?'}.`);
      if (en && (!st.edition.en || st.edition.en.date !== today)) problems.push(`Le site en ligne affiche encore l'édition anglaise du ${st.edition.en ? st.edition.en.date : '?'}.`);
    }
  } catch (e) { problems.push(`Le site en ligne est injoignable : ${e.message}.`); }
}

if (problems.length) { console.log(problems.map((p) => '✗ ' + p).join('\n')); process.exit(1); }
console.log(`OK — l'édition du ${today} est en ligne, en français et en anglais.`);
