/* Recherche dans toutes les éditions, sans serveur : un petit index JSON généré chaque jour. */
(function () {
  'use strict';
  const { t, L, LANG, DATA, ROOT, json, flag, day } = TP;
  const q = document.getElementById('q'), out = document.getElementById('results'), n = document.getElementById('searchN');
  if (!q) return;
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  let index = null, countries = {};
  const KIND = { s: 'kindStory', c: 'kindCountry', d: 'kindDossier' };

  function run() {
    const v = q.value.trim();
    const url = new URL(location.href);
    if (v) url.searchParams.set('q', v); else url.searchParams.delete('q');
    history.replaceState(null, '', url);
    if (!index) return;
    if (v.length < 2) { out.innerHTML = ''; n.textContent = v ? L('searchHint') : ''; return; }
    const words = norm(v).split(/\s+/).filter(Boolean);
    const hits = index.map((it) => {
      const hay = norm([it.t, it.x, it.n, it.o].join(' '));
      if (!words.every((w) => hay.includes(w))) return null;
      let score = it.k === 'c' ? 3 : it.k === 'd' ? 2 : 0;
      if (words.every((w) => norm(it.t).includes(w))) score += 2;
      return [score, it];
    }).filter(Boolean).sort((a, b) => b[0] - a[0] || String(b[1].d || '').localeCompare(String(a[1].d || ''))).slice(0, 60).map((x) => x[1]);
    n.textContent = hits.length ? L('searchCount', { n: hits.length }) : L('searchNone');
    out.innerHTML = hits.map((it) => `
      <li><a href="${ROOT}${it.p}">
        ${it.d ? `<time datetime="${it.d}">${t(day(it.d))}</time>` : `<span class="kind">${t(L(KIND[it.k]))}</span>`}
        <span class="h">${it.c ? flag(countries[it.c]) : ''}${t(it.t)}</span>
        ${it.x ? `<span class="p">${t(it.x)}</span>` : ''}
      </a></li>`).join('');
  }
  q.value = new URLSearchParams(location.search).get('q') || '';
  q.addEventListener('input', run);
  q.form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  Promise.all([json(DATA + 'search.json'), json('data/countries.json').catch(() => ({}))]).then(([ix, cs]) => { index = ix; countries = cs; run(); })
    .catch(() => { n.textContent = L('loadError'); });
  if (!q.value) q.focus();
})();
