/* Page 404 : garde la langue du lecteur et, si l'adresse contient une date, propose l'édition de ce jour. */
(function () {
  'use strict';
  const base = document.body.dataset.root || '/';
  const rel = location.pathname.indexOf(base) === 0 ? location.pathname.slice(base.length) : location.pathname.replace(/^\//, '');
  const saved = TP.store.get('lang', '');
  const lang = /^en(\/|$)/.test(rel) ? 'en' : (/^(\d{4}|pays|carte|archives|dossiers|semaine|chiffres|recherche|lettre|presse)\//.test(rel) ? 'fr' : (saved === 'en' ? 'en' : 'fr'));
  const blocks = document.querySelectorAll('[data-nf]');
  blocks.forEach((b) => { b.hidden = b.dataset.nf !== lang; });
  document.documentElement.lang = lang;
  const I = (window.I18N || {})[lang] || {};
  if (I.nfTitle) document.title = I.nfTitle + ' — Diurna';
  const m = rel.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  if (!m) return;
  const d = `${m[1]}-${m[2]}-${m[3]}`;
  fetch(base + 'data/routes.json').then((r) => (r.ok ? r.json() : null)).then((rt) => {
    const day = rt && rt[lang] && rt[lang][d];
    if (!day) return;
    const box = document.querySelector(`[data-nf="${lang}"] .nf-date`);
    const label = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    box.innerHTML = `<a class="btn" href="${base}${day.bref}">${TP.esc(String(I.nfDate || '{d}').replace('{d}', label))}</a>`;
    box.hidden = false;
  }).catch(() => {});
})();
