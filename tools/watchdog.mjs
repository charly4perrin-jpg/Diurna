// Vérifie que l'édition attendue est publiée et en ligne : node tools/watchdog.mjs
// Sort avec le code 1 (et la liste des problèmes) si quelque chose manque.
// Les tâches planifiées de GitHub partent parfois avec plusieurs heures de retard : on ne juge donc
// pas sur « la date du jour » mais sur l'édition qui devrait déjà être en ligne à l'heure de Paris.
// L'édition française est attendue à 8 h, l'anglaise à 8 h 30 ; avant, c'est celle de la veille.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => { try { return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8')); } catch (_) { return null; } };
const now = new Date();
const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((p) => [p.type, p.value]));
const parisDay = `${parts.year}-${parts.month}-${parts.day}`, minutes = Number(parts.hour) * 60 + Number(parts.minute);
const dayBefore = (d) => new Date(Date.parse(d + 'T12:00:00Z') - 864e5).toISOString().slice(0, 10);
const expectFr = minutes >= 8 * 60 ? parisDay : dayBefore(parisDay);
const expectEn = minutes >= 8 * 60 + 30 ? parisDay : dayBefore(parisDay);
fs.writeFileSync(path.join(root, 'watchdog.date'), expectFr);
const problems = [];
const older = (a, b) => !a || a < b; // a (AAAA-MM-JJ) est-elle antérieure à b ?

const fr = read('data/latest.json'), en = read('data/en/latest.json');
if (!fr || older(fr.date, expectFr)) problems.push(`L'édition française du ${expectFr} n'est pas dans le dépôt (dernière : ${fr ? fr.date : 'aucune'}).`);
if (en && older(en.date, expectEn)) problems.push(`L'édition anglaise du ${expectEn} n'est pas dans le dépôt (dernière : ${en.date}).`);

const site = read('site.json') || {};
if (site.url) {
  try {
    const r = await fetch(site.url.replace(/\/$/, '') + '/status.json?t=' + Date.now(), { cache: 'no-store' });
    const st = r.ok ? await r.json() : null;
    if (!st) problems.push(`Le site en ligne ne répond pas (status.json : HTTP ${r.status}).`);
    else {
      if (!st.edition || !st.edition.fr || older(st.edition.fr.date, expectFr)) problems.push(`Le site en ligne affiche encore l'édition du ${st.edition && st.edition.fr ? st.edition.fr.date : '?'}.`);
      if (en && (!st.edition.en || older(st.edition.en.date, expectEn))) problems.push(`Le site en ligne affiche encore l'édition anglaise du ${st.edition.en ? st.edition.en.date : '?'}.`);
    }
  } catch (e) { problems.push(`Le site en ligne est injoignable : ${e.message}.`); }
}

if (problems.length) { console.log(problems.map((p) => '✗ ' + p).join('\n')); process.exit(1); }
console.log(`OK — l'édition du ${expectFr} est en ligne, en français et en anglais (contrôle à ${parts.hour} h ${parts.minute}, heure de Paris).`);
