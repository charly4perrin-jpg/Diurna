/* Page globe : lecture des cinq essentiels un par un, puis En bref. */
(function () {
  'use strict';
  const { t, esc, day, longDate, hour, dayCount, nf, json, icon } = TP;
  const $ = (id) => document.getElementById(id);
  const panel = $('panel'), steps = $('steps'), read = $('read'), edLine = $('edLine');
  const prevBtn = $('prev'), nextBtn = $('next');
  const params = new URLSearchParams(location.search);
  const wanted = params.get('d');
  let ed = null, step = 1;

  const globe = new Globe($('globe'), {
    drag: true, wheel: true, spin: 0, start: [-20, -24], focusZoom: 1.3,
    label: 'Globe : les pays des cinq sujets du jour',
    onPick: (rank) => go(rank)
  });
  $('zin').addEventListener('click', () => globe.zoomBy(1.3));
  $('zout').addEventListener('click', () => globe.zoomBy(1 / 1.3));
  $('zre').addEventListener('click', () => {
    const s = ed && ed.essentials.find((x) => x.rank === step);
    globe.k = 1; globe.flyTo(s ? globe.where(s) : [20, 24], s ? 1.3 : 1);
  });

  function stepFromHash() {
    const h = location.hash.replace('#', '');
    if (h === 'bref') return 6;
    const n = Number(h);
    return n >= 1 && n <= 5 ? n : 1;
  }

  function renderSteps() {
    steps.innerHTML = ed.essentials.map((s) =>
      `<button class="step c${s.rank}" data-step="${s.rank}" aria-label="${t(s.rank + '. ' + s.place)}"${step === s.rank ? ' aria-current="step"' : ''}>${s.rank}</button>`
    ).join('') + `<button class="step brief-step" data-step="6"${step === 6 ? ' aria-current="step"' : ''}>En bref</button>`;
  }

  function storyHtml(s) {
    const since = s.since ? `<span class="days"><b>Jour ${nf.format(dayCount(s.since.date, ed.date))}</b>${t(s.since.label)}</span>` : '';
    const radar = s.radar ? `<span class="tag c${s.rank}">Loin des caméras</span>` : '';
    const ctx = (s.context || []).map((c) => {
      const soon = TP.utc(c.d) > TP.utc(ed.date);
      return `<li class="${soon ? 'soon' : ''}"><time datetime="${esc(c.d)}">${soon ? 'À venir · ' : ''}${esc(day(c.d, ed.date))}</time><span>${t(c.t)}</span></li>`;
    }).join('');
    const src = (s.sources || []).map((x) => `<li><b>${t(x.name)}</b><a href="${esc(x.url)}" target="_blank" rel="noopener">${t(x.title)}</a></li>`).join('');
    const plus = icon('plus');
    return `
      <div class="swap">
        <h2 class="story-h"><span class="n">${s.rank}</span><span class="place">${t(s.place)}</span></h2>
        <p class="deck">${t(s.title)}</p>
      </div>
      ${since || radar ? `<div class="meta">${since}${radar}</div>` : ''}
      <ol class="three">
        <li><p><span class="lab">Ce qui se passe</span>${t(s.what)}</p></li>
        <li><p><span class="lab">Pourquoi</span>${t(s.why)}</p></li>
        <li><p><span class="lab">Et maintenant</span>${t(s.next)}</p></li>
      </ol>
      <div class="q-list">
        ${(s.qa || []).map((q) => `<details class="fold qa"><summary>${t(q.q)}${plus}</summary><div class="fold-body"><p>${t(q.a)}</p></div></details>`).join('')}
        ${ctx ? `<details class="fold"><summary>Comment on en est arrivé là${plus}</summary><div class="fold-body"><ol class="timeline">${ctx}</ol></div></details>` : ''}
        ${src ? `<details class="fold"><summary>Sources${plus}</summary><div class="fold-body"><ul class="sources">${src}</ul></div></details>` : ''}
      </div>`;
  }

  function briefHtml() {
    const brief = (ed.brief || []).map((b) => `<li><b>${t(b.place)}</b><span>${b.url ? `<a href="${esc(b.url)}" target="_blank" rel="noopener">${t(b.text)}</a>` : t(b.text)}</span></li>`).join('');
    const agenda = (ed.agenda || []).map((a) => `<li><time datetime="${esc(a.d)}">${esc(day(a.d, ed.date))}</time><span>${t(a.t)}</span></li>`).join('');
    return `
      <div class="swap"><h2 class="story-h"><span class="place">En bref</span></h2></div>
      ${brief ? `<ul class="brief">${brief}</ul>` : ''}
      ${agenda ? `<h2 class="band-h" style="margin-top:34px">À venir</h2><ul class="agenda">${agenda}</ul>` : ''}
      <p class="end-note">${t("C'est tout pour aujourd'hui. La prochaine édition arrive demain matin.")}</p>
      <p><a class="link-quiet" href="../archives/">${t('Toutes les éditions')} →</a></p>`;
  }

  function render(fly) {
    renderSteps();
    const s = ed.essentials.find((x) => x.rank === step);
    panel.className = 'panel' + (s ? ' c' + s.rank : '');
    read.innerHTML = s ? storyHtml(s) : briefHtml();
    read.scrollTop = 0;
    if (s) globe.setCurrent(s.rank, fly);
    else { globe.setCurrent(0, false); globe.flyTo([10, 22], 1); }
    const prev = step > 1 ? ed.essentials.find((x) => x.rank === step - 1) : null;
    const next = step < 5 ? ed.essentials.find((x) => x.rank === step + 1) : null;
    prevBtn.disabled = step === 1;
    prevBtn.innerHTML = `${icon('left')}${prev ? 'Précédent' : 'Sujet 5'}`;
    nextBtn.disabled = step === 6;
    nextBtn.innerHTML = step === 5 ? `En bref${icon('right')}` : next ? `Suivant <span>· ${t(next.place)}</span>${icon('right')}` : '';
    document.title = (s ? `${s.rank}. ${fr(s.place)} — ` : 'En bref — ') + 'Trois Phrases';
  }
  const fr = TP.fr;

  function go(n) {
    step = Math.max(1, Math.min(6, n));
    const h = step === 6 ? '#bref' : '#' + step;
    if (location.hash !== h) history.replaceState(null, '', location.pathname + location.search + h);
    render(true);
    if (window.matchMedia('(max-width: 900px)').matches) {
      const top = panel.getBoundingClientRect().top + window.scrollY - 4;
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  steps.addEventListener('click', (e) => { const b = e.target.closest('[data-step]'); if (b) go(Number(b.dataset.step)); });
  prevBtn.addEventListener('click', () => go(step - 1));
  nextBtn.addEventListener('click', () => go(step + 1));
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight') go(step + 1);
    if (e.key === 'ArrowLeft') go(step - 1);
  });
  window.addEventListener('hashchange', () => { const n = stepFromHash(); if (n !== step) { step = n; render(true); } });

  const src = wanted && /^\d{4}-\d{2}-\d{2}$/.test(wanted) ? `data/editions/${wanted}.json` : 'data/latest.json';
  Promise.all([json('assets/world.json'), json(src)]).then(([world, edition]) => {
    ed = edition;
    globe.load(world);
    globe.setStories(ed.essentials, 0);
    const archive = !!wanted;
    edLine.innerHTML = `<span class="num">N° ${ed.number}</span><span>${t(longDate(ed.date))}</span>`
      + (archive ? `<a href="./">${t("Revenir à l'édition du jour")}</a>` : `<span>${t('mise à jour à ' + hour(ed.updated))}</span>`);
    $('edTitle').textContent = fr(ed.headline);
    step = stepFromHash();
    render(true);
  }).catch(() => {
    read.innerHTML = `<p class="err">${t("L'édition n'a pas pu se charger. Vérifie ta connexion, puis recharge la page.")}</p>`;
  });
})();
