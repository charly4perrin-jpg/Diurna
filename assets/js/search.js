/* Recherche dans toutes les éditions, sans serveur : un petit index JSON généré chaque jour.
   Filtres (type, période), tolérance aux fautes de frappe et mots trouvés surlignés. */
(function () {
  'use strict';
  const { t, L, LANG, DATA, ROOT, json, flag, day } = TP;
  const q = document.getElementById('q'), out = document.getElementById('results'), n = document.getElementById('searchN');
  if (!q) return;
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  let index = null, countries = {};
  const KIND = { s: 'kindStory', c: 'kindCountry', d: 'kindDossier', g: 'kindGloss', f: 'kindPage' };
  const filt = { k: '', t: '' };

  // Distance d'édition bornée : « ukriane » trouve « ukraine », « soudant » trouve « soudan ».
  function near(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return false;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      let best = i;
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        best = Math.min(best, cur[j]);
      }
      if (best > max) return false;
      prev = cur;
    }
    return prev[b.length] <= max;
  }
  const tol = (w) => (w.length >= 7 ? 2 : w.length >= 4 ? 1 : 0);
  // Un mot de la requête correspond-il ? exact (dans le texte), sinon proche d'un mot du texte.
  function match(w, hay, toks) {
    if (hay.includes(w)) return 2;
    const m = tol(w);
    if (!m) return 0;
    return toks.some((x) => x.length >= w.length - m && near(w, x.slice(0, w.length + m), m)) ? 1 : 0;
  }
  // Surligne les mots trouvés, sans casser les accents ni la typographie.
  function mark(text, words, fz) {
    return String(text || '').split(/(\s+)/).map((tok) => {
      const nt = norm(tok).replace(/[^\p{L}\p{N}]/gu, '');
      const hit = nt && words.some((w) => nt.includes(w) || (fz && tol(w) && nt.length >= w.length - tol(w) && near(w, nt.slice(0, w.length + tol(w)), tol(w))));
      return hit ? `<mark>${t(tok)}</mark>` : t(tok);
    }).join('');
  }

  function run() {
    const v = q.value.trim();
    const url = new URL(location.href);
    if (v) url.searchParams.set('q', v); else url.searchParams.delete('q');
    history.replaceState(null, '', url);
    if (!index) return;
    if (v.length < 2) { out.innerHTML = ''; n.textContent = v ? L('searchHint') : ''; return; }
    const words = norm(v).split(/\s+/).filter(Boolean);
    const since = filt.t ? new Date(Date.now() - Number(filt.t) * 864e5).toISOString().slice(0, 10) : '';
    let fuzzy = false;
    const all = index.map((it) => {
      if (filt.k && it.k !== filt.k) return null;
      if (since && (!it.d || it.d < since)) return null;
      if (!it._h) { it._h = norm([it.t, it.x, it.n, it.o].join(' ')); it._t = it._h.split(/[^\p{L}\p{N}]+/u).filter(Boolean); }
      let score = it.k === 'c' ? 3 : it.k === 'd' ? 2 : it.k === 'f' ? 2 : 0, exact = true;
      for (const w of words) { const m = match(w, it._h, it._t); if (!m) return null; if (m === 1) exact = false; }
      if (words.every((w) => norm(it.t).includes(w))) score += 2;
      return [score, it, exact];
    }).filter(Boolean);
    // Les résultats approchés ne s'affichent que si rien ne correspond exactement.
    const exactHits = all.filter((x) => x[2]);
    fuzzy = !exactHits.length && all.length > 0;
    const hits = (exactHits.length ? exactHits : all).sort((a, b) => b[0] - a[0] || String(b[1].d || '').localeCompare(String(a[1].d || ''))).slice(0, 60).map((x) => x[1]);
    n.textContent = hits.length ? L('searchCount', { n: hits.length }) + (fuzzy ? ' · ' + L('searchFuzzy') : '') : L('searchNone');
    out.innerHTML = hits.map((it) => `
      <li><a href="${ROOT}${it.p}">
        ${it.d ? `<time datetime="${it.d}">${t(day(it.d))}</time>` : `<span class="kind">${t(L(KIND[it.k]))}</span>`}
        <span class="h">${it.c ? flag(countries[it.c]) : ''}${mark(it.t, words, fuzzy)}</span>
        ${it.x ? `<span class="p">${mark(it.x, words, fuzzy)}</span>` : ''}
      </a></li>`).join('');
  }
  document.querySelectorAll('[data-filter]').forEach((g) => g.addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    filt[g.dataset.filter] = b.dataset.v;
    g.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    TP.trackOnce('module/recherche-filtre', g.dataset.filter + ':' + (b.dataset.v || 'tout'));
    run();
  }));
  q.value = new URLSearchParams(location.search).get('q') || '';
  q.addEventListener('input', run);
  q.form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  Promise.all([json(DATA + 'search.json'), json('data/countries.json').catch(() => ({}))]).then(([ix, cs]) => { index = ix; countries = cs; run(); })
    .catch(() => { n.textContent = L('loadError'); });
  if (!q.value) q.focus();
})();
