/* Page de l'édition : les cinq essentiels un par un, puis En bref. */
(function () {
  'use strict';
  const { t, esc, fr, day, longDate, hour, dayCount, json, icon } = TP;
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

  const fold = (label, body) => `<details class="fold"><summary>${label}${icon('plus')}</summary><div class="fold-body">${body}</div></details>`;

  function storyHtml(s) {
    const meta = [`<b>${t(s.place)}</b>`];
    if (s.since) {
      const n = dayCount(s.since.date, ed.date);
      meta.push(`<span>${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f')}${n > 1 ? ' jours ' : ' jour '}${t(s.since.label)}</span>`);
    }
    meta.push(`<span>${t('Édition du ' + day(ed.date))}</span>`);

    const keys = (s.keys || []).map((k) => `<div><dt>${t(k.title)}</dt><dd>${t(k.text)}</dd></div>`).join('');
    const ctx = (s.context || []).map((c) => {
      const soon = TP.utc(c.d) > TP.utc(ed.date);
      return `<li class="${soon ? 'soon' : ''}"><time datetime="${esc(c.d)}">${esc(day(c.d, ed.date))}</time><span>${t(c.t)}</span></li>`;
    }).join('');
    const src = (s.sources || []).map((x) => `<li><b>${t(x.name)}</b><a href="${esc(x.url)}" target="_blank" rel="noopener">${t(x.title)}</a></li>`).join('');

    return `
      <div class="article swap">
        <p class="rubric"><span class="rank">${s.rank}</span>${t(s.section)}${s.radar ? '<span class="radar">Loin des caméras</span>' : ''}</p>
        <h2>${t(s.title)}</h2>
        <p class="chapo">${t(s.standfirst)}</p>
        <p class="byline">${meta.join('')}</p>
        <p class="body">${(s.body || []).map(t).join(' ')}</p>
        ${s.analysis ? `<h3>${t(s.analysis.title)}</h3><p class="analysis">${t(s.analysis.text)}</p>` : ''}
        <div class="folds">
          ${keys ? fold('Les clés', `<dl class="keys">${keys}</dl>`) : ''}
          ${ctx ? fold('Repères', `<ol class="timeline">${ctx}</ol>`) : ''}
          ${src ? fold('Sources', `<ul class="sources">${src}</ul>`) : ''}
        </div>
      </div>`;
  }

  function briefHtml() {
    const brief = (ed.brief || []).map((b) => `<li><b>${t(b.place)}</b>${t(b.text)}${b.url ? ` <a href="${esc(b.url)}" target="_blank" rel="noopener">Source</a>` : ''}</li>`).join('');
    const agenda = (ed.agenda || []).map((a) => `<li><time datetime="${esc(a.d)}">${esc(day(a.d, ed.date))}</time><span>${t(a.t)}</span></li>`).join('');
    return `
      <div class="article swap">
        <p class="rubric">${t("Le reste de l'actualité")}</p>
        <h2>En bref</h2>
        ${brief ? `<ul class="brief">${brief}</ul>` : ''}
        ${agenda ? `<h3>À venir</h3><ul class="agenda">${agenda}</ul>` : ''}
        <p class="end-note">${t('Fin de cette édition. La suivante paraît demain matin.')}</p>
        <p><a class="link-quiet" href="../archives/">${t('Toutes les éditions')} →</a></p>
      </div>`;
  }

  function render(fly) {
    renderSteps();
    const s = ed.essentials.find((x) => x.rank === step);
    panel.className = 'panel' + (s ? ' c' + s.rank : '');
    read.innerHTML = s ? storyHtml(s) : briefHtml();
    read.scrollTop = 0;
    if (s) globe.setCurrent(s.rank, fly);
    else { globe.setCurrent(0, false); globe.flyTo([10, 22], 1); }
    const next = step < 5 ? ed.essentials.find((x) => x.rank === step + 1) : null;
    prevBtn.disabled = step === 1;
    prevBtn.innerHTML = `${icon('left')}Précédent`;
    nextBtn.disabled = step === 6;
    nextBtn.innerHTML = step === 5 ? `En bref${icon('right')}` : next ? `Suivant <span>· ${t(next.place)}</span>${icon('right')}` : '';
    document.title = (s ? `${fr(s.place)} — ` : 'En bref — ') + 'Trois Phrases';
  }

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
    if (e.target.closest('input, textarea, select, summary') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight') go(step + 1);
    if (e.key === 'ArrowLeft') go(step - 1);
  });
  window.addEventListener('hashchange', () => { const n = stepFromHash(); if (n !== step) { step = n; render(true); } });

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const src = wanted && /^\d{4}-\d{2}-\d{2}$/.test(wanted) ? `data/editions/${wanted}.json` : 'data/latest.json';
  Promise.all([json('assets/world.json'), json(src)]).then(([world, edition]) => {
    ed = edition;
    globe.load(world);
    globe.setStories(ed.essentials, 0);
    const archive = !!wanted;
    edLine.innerHTML = `<b>N° ${ed.number}</b><span>${t(cap(longDate(ed.date)))}</span>`
      + (archive ? `<a href="./">${t("Revenir à l'édition du jour")}</a>` : `<span>${t('Mise à jour à ' + hour(ed.updated))}</span>`);
    $('edTitle').textContent = fr(ed.headline);
    step = stepFromHash();
    render(true);
  }).catch(() => {
    read.innerHTML = `<p class="err">${t("L'édition n'a pas pu être chargée. Vérifiez la connexion, puis rechargez la page.")}</p>`;
  });
})();
