// E-mail du jour : objet et corps (Markdown) tirés de l'édition, en français et en anglais.
// node tools/newsletter.mjs [dossier de sortie, par défaut out/email]
// Si le secret BUTTONDOWN_API_KEY est fourni (GitHub Actions), l'e-mail est déposé dans Buttondown :
// en brouillon par défaut, ou envoyé si site.json → newsletter.mode vaut "send".
// La clé ne quitte jamais le workflow : rien n'est exposé dans le site.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJ = (p, d) => { try { return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8')); } catch (_) { return d; } };
const I18N = require('../assets/js/i18n.js');
const site = readJ('site.json', {});
const slugs = readJ('data/slugs.json', { fr: {}, en: {} });
const countries = readJ('data/countries.json', {});
const OUT = path.resolve(root, process.argv[2] || 'out/email');
const base = (site.url || '').replace(/\/$/, '');
const cfg = { mode: 'draft', langs: ['fr'], ...(site.newsletter || {}) };

const typo = (lang, s) => {
  s = String(s ?? '').replace(/'/g, '’');
  return lang === 'fr' ? s.replace(/ ([?!;])/g, ' $1').replace(/ :/g, ' :').replace(/« /g, '« ').replace(/ »/g, ' »') : s;
};
const md = (s) => String(s).replace(/([\\*_`[\]])/g, '\\$1');
const cname = (lang, s) => (lang === 'en' && countries[s.id] && countries[s.id].en ? countries[s.id].en.name : countries[s.id] && countries[s.id].name) || s.place;
const T = {
  fr: { read: 'Lire', brief: 'En bref', web: 'Lire l’édition sur le site', why: 'Tu reçois cet e-mail parce que tu t’es inscrit à Diurna.' },
  en: { read: 'Read', brief: 'In brief', web: 'Read the edition on the website', why: 'You are receiving this email because you signed up to Diurna.' }
};

function build(lang) {
  const ed = readJ(lang === 'en' ? 'data/en/latest.json' : 'data/latest.json', null);
  if (!ed) return null;
  const S = I18N[lang], pre = lang === 'en' ? 'en/' : '';
  const dpath = ed.date.replace(/-/g, '/');
  const url = (s) => `${base}/${pre}${dpath}/${s.slug || (slugs[lang][ed.date] || {})[s.id] || ''}/`;
  const date = new Intl.DateTimeFormat(S.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.parse(ed.date + 'T12:00:00Z'));
  const subject = `Diurna — ${typo(lang, ed.headline)}`;
  const body = [
    `*${md(S.no.replace('{n}', ed.number))} · ${md(date)}*`, '',
    `# ${md(typo(lang, ed.headline))}`, '',
    md(typo(lang, ed.standfirst)), '',
    ...ed.essentials.flatMap((s) => [
      `## ${s.rank}. ${md(typo(lang, cname(lang, s)))} — ${md(typo(lang, s.title))}`, '',
      md(typo(lang, s.standfirst)), '',
      ...(s.figure ? [`**${md(typo(lang, s.figure.value))}** ${md(typo(lang, s.figure.label))}`, ''] : []),
      `[${T[lang].read} →](${url(s)})`, ''
    ]),
    ...(ed.brief && ed.brief.length ? [`## ${T[lang].brief}`, '', ...ed.brief.map((b) => `- **${md(typo(lang, b.place))}** ${md(typo(lang, b.text))}`), ''] : []),
    '---', '',
    `[${T[lang].web}](${base}/${pre}${dpath}/${ed.essentials[0].slug || ''}/)`, '',
    `*${md(typo(lang, S.aiLabel))}.* ${md(T[lang].why)}`, ''
  ].join('\n');
  return { lang, date: ed.date, subject, body };
}

async function buttondown(mail) {
  const key = process.env.BUTTONDOWN_API_KEY;
  if (!key) { console.log(`Buttondown : pas de clé (secret BUTTONDOWN_API_KEY absent), e-mail ${mail.lang} seulement écrit dans ${path.relative(root, OUT)}/.`); return; }
  if (!cfg.langs.includes(mail.lang)) { console.log(`Buttondown : la langue ${mail.lang} n'est pas dans site.json → newsletter.langs, pas d'envoi.`); return; }
  const H = { Authorization: `Token ${key}`, 'Content-Type': 'application/json' };
  // Pas de doublon : si un e-mail porte déjà cet objet, on ne recrée rien.
  try {
    const list = await fetch('https://api.buttondown.com/v1/emails?ordering=-creation_date', { headers: H }).then((r) => r.json());
    if ((list.results || []).some((e) => e.subject === mail.subject)) { console.log(`Buttondown : « ${mail.subject} » existe déjà, rien à faire.`); return; }
  } catch (_) {}
  const status = cfg.mode === 'send' ? 'about_to_send' : 'draft';
  const r = await fetch('https://api.buttondown.com/v1/emails', { method: 'POST', headers: H, body: JSON.stringify({ subject: mail.subject, body: mail.body, status }) });
  const txt = await r.text();
  if (!r.ok) { console.error(`Buttondown : échec ${r.status} — ${txt.slice(0, 300)}`); process.exitCode = 1; return; }
  console.log(`Buttondown : e-mail ${mail.lang} ${status === 'draft' ? 'déposé en brouillon' : 'envoyé'} (« ${mail.subject} »).`);
}

fs.mkdirSync(OUT, { recursive: true });
for (const lang of ['fr', 'en']) {
  const mail = build(lang);
  if (!mail) continue;
  const file = path.join(OUT, `${mail.date}-${lang}.md`);
  fs.writeFileSync(file, `Objet : ${mail.subject}\n\n${mail.body}`);
  console.log(`E-mail ${lang} : ${path.relative(root, file)} (${mail.body.length} caractères)`);
  await buttondown(mail);
}
