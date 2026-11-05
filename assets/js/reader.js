/* Page de l'édition : les cinq essentiels un par un, puis En bref. Français ou anglais selon la page. */
(function () {
  'use strict';
  const { t, esc, typo, L, LANG, DATA, day, longDate, hour, dayCount, int, json, icon, flag, cfield, population, store } = TP;
  const $ = (id) => document.getElementById(id);
  const panel = $('panel'), steps = $('steps'), read = $('read'), edLine = $('edLine');
  const prevBtn = $('prev'), nextBtn = $('next');
  const params = new URLSearchParams(location.search);
  const wanted = params.get('d');
  let ed = null, step = 1, countries = {}, gov = {}, world = null;

  const globe = new Globe($('globe'), {
    drag: true, wheel: true, spin: 0, start: [-20, -24],
    label: L('globeLabel'),
    onPick: (rank) => go(rank)
  });
  $('zin').addEventListener('click', () => globe.zoomBy(1.3));
  $('zout').addEventListener('click', () => globe.zoomBy(1 / 1.3));
  $('zre').addEventListener('click', () => {
    const s = ed && ed.essentials.find((x) => x.rank === step);
    globe.clearOverlays();
    globe.k = 1; globe.flyTo(s ? globe.where(s) : [20, 24], s ? globe.zoomFor(s) : 1);
  });

  const C = (id) => countries[id] || null;
  const cname = (id, fb) => cfield(C(id), 'name') || fb;

  function stepFromHash() {
    const h = location.hash.replace('#', '');
    if (h === 'bref') return 6;
    const n = Number(h);
    return n >= 1 && n <= 5 ? n : 1;
  }

  function renderSteps() {
    steps.innerHTML = ed.essentials.map((s) =>
      `<button class="step c${s.rank}" data-step="${s.rank}" aria-label="${t(s.rank + '. ' + cname(s.id, s.place))}"${step === s.rank ? ' aria-current="step"' : ''}>${s.rank}</button>`
    ).join('') + `<button class="step brief-step" data-step="6"${step === 6 ? ' aria-current="step"' : ''}>${L('inBrief')}</button>`;
  }

  const fold = (label, body) => `<details class="fold"><summary>${label}${icon('plus')}</summary><div class="fold-body">${body}</div></details>`;

  // Bandeau d'identité : une ligne repliée, la fiche complète au toucher.
  function idBand(s) {
    const c = C(s.id);
    if (!c) return '';
    const g = gov[s.id];
    const capital = cfield(c, 'capital'), langs = cfield(c, 'languages') || [], curs = cfield(c, 'currencies') || [];
    const pop = c.population ? L('inhabShort', { p: population(c.population) }) : '';
    const line = [capital ? capital.replace(/ \(.*\)$/, '') : '', pop].filter(Boolean).join(' · ');
    const cells = [];
    if (capital) cells.push([L('capital'), capital]);
    if (c.population) cells.push([L('population'), L('inhabitants', { p: population(c.population) })]);
    if (langs.length) cells.push([L(langs.length > 1 ? 'languages' : 'language'), langs.join(', ')]);
    if (curs.length) cells.push([L('currency'), curs.join(', ')]);
    if (g) {
      cells.push([L('regime'), LANG === 'en' && g.regime_en ? g.regime_en : g.regime]);
      g.leaders.forEach((l) => cells.push([LANG === 'en' && l.role_en ? l.role_en : l.role, LANG === 'en' && l.name_en ? l.name_en : l.name]));
    }
    const notes = [];
    if (g) notes.push(L('checked', { d: esc(day(g.checked)), s: `<a href="${esc(g.source.url)}" target="_blank" rel="noopener">${t(LANG === 'en' && g.source.name_en ? g.source.name_en : g.source.name)}</a>` }));
    if (c.population) notes.push(L('popSource', { y: c.popYear }));
    const open = store.get('idband', false);
    return `
      <details class="idband"${open ? ' open' : ''}>
        <summary>
          ${flag(c, 'lg')}
          <span class="id-name">${t(cfield(c, 'name'))}</span>
          <span class="id-line">${t(line)}</span>
          <span class="id-more"><span>${L('profile')}</span>${icon('plus')}</span>
        </summary>
        <dl class="id-grid">${cells.map(([k, v]) => `<div><dt>${t(k)}</dt><dd>${t(v)}</dd></div>`).join('')}</dl>
        ${notes.length ? `<p class="id-note">${TP.cap(notes.join(' · '))}.</p>` : ''}
      </details>`;
  }

  // Trois sujets liés : pays impliqués d'abord, puis même rubrique, puis l'ordre de l'édition.
  function related(s) {
    const score = (o) => {
      let n = 0;
      if ((s.involved || []).includes(o.id)) n += 4;
      if ((o.involved || []).includes(s.id)) n += 4;
      n += (s.involved || []).filter((x) => (o.involved || []).includes(x)).length;
      if (o.section === s.section) n += 2;
      (o.types || []).forEach((ty) => { if ((s.types || []).includes(ty)) n += 1; });
      return n - o.rank * 0.1;
    };
    return ed.essentials.filter((o) => o.rank !== s.rank).map((o) => [score(o), o]).sort((a, b) => b[0] - a[0]).slice(0, 3).map((x) => x[1]);
  }

  function nextReads(s) {
    return `
      <section class="nextreads" aria-labelledby="nr-h">
        <h3 id="nr-h">${L('readNext')}</h3>
        <ul>${related(s).map((o) => `
          <li><button class="nr c${o.rank}" type="button" data-go="${o.rank}">
            <span class="rubric"><span class="rank">${o.rank}</span>${flag(C(o.id))}${t(cname(o.id, o.place))}</span>
            <span class="nr-t">${t(o.title)}</span>
          </button></li>`).join('')}
        </ul>
      </section>`;
  }

  function storyHtml(s) {
    const meta = [];
    const hasCounter = (s.types || []).includes('conflict') && s.since;
    if (s.since && !hasCounter) {
      const n = dayCount(s.since.date, ed.date);
      meta.push(`<b>${t(L(n > 1 ? 'days' : 'day1', { n: int(n), label: s.since.label }))}</b>`);
    }
    meta.push(`<span>${t(L('editionOf', { d: day(ed.date) }))}</span>`);
    meta.push(TP.aiLabel());

    const keys = (s.keys || []).map((k) => `<div><dt>${t(k.title)}</dt><dd>${t(k.text)}</dd></div>`).join('');
    const ctx = (s.context || []).map((c) => {
      const soon = TP.utc(c.d) > TP.utc(ed.date);
      return `<li class="${soon ? 'soon' : ''}"><time datetime="${esc(c.d)}">${esc(day(c.d, ed.date))}</time><span>${t(c.t)}</span></li>`;
    }).join('');
    const src = (s.sources || []).map((x) => `<li><b>${t(x.name)}</b><a href="${esc(x.url)}" target="_blank" rel="noopener">${t(x.title)}</a></li>`).join('');
    const acc = C(s.id) && C(s.id).accent;

    return `
      <div class="article swap"${acc ? ` style="--acc:${acc}"` : ''}>
        ${idBand(s)}
        <p class="rubric"><span class="rank">${s.rank}</span>${t(s.section)}${s.radar ? `<span class="radar">${L('radar')}</span>` : ''}</p>
        <h2>${t(s.title)}</h2>
        <p class="chapo">${t(s.standfirst)}</p>
        <p class="byline">${meta.join('')}</p>
        <p class="body">${(s.body || []).map(t).join(' ')}</p>
        ${Modules.html(s)}
        ${s.analysis ? `<h3>${t(s.analysis.title)}</h3><p class="analysis">${t(s.analysis.text)}</p>` : ''}
        <div class="folds">
          ${keys ? fold(L('keys'), `<dl class="keys">${keys}</dl>`) : ''}
          ${ctx ? fold(L('timeline'), `<ol class="timeline">${ctx}</ol>`) : ''}
          ${src ? fold(L('sources'), `<ul class="sources">${src}</ul>`) : ''}
        </div>
        ${nextReads(s)}
      </div>`;
  }

  function briefHtml() {
    const brief = (ed.brief || []).map((b) => `<li><b>${flag(C(b.id))}${t(b.place)}</b>${t(b.text)}${b.url ? ` <a href="${esc(b.url)}" target="_blank" rel="noopener">${L('source')}</a>` : ''}</li>`).join('');
    const agenda = (ed.agenda || []).map((a) => `<li><time datetime="${esc(a.d)}">${esc(day(a.d, ed.date))}</time><span>${t(a.t)}</span></li>`).join('');
    const archives = TP.ROOT + (LANG === 'en' ? 'en/archives/' : 'archives/');
    return `
      <div class="article swap">
        <p class="rubric">${t(L('elsewhere'))}</p>
        <h2>${L('inBrief')}</h2>
        <p class="byline">${TP.aiLabel()}</p>
        ${brief ? `<ul class="brief">${brief}</ul>` : ''}
        ${agenda ? `<h3>${L('comingUp')}</h3><ul class="agenda">${agenda}</ul>` : ''}
        <p class="end-note">${t(L('endNote'))}</p>
        <p><a class="link-quiet" href="${archives}">${t(L('allEditions'))} →</a></p>
      </div>`;
  }

  function render(fly) {
    renderSteps();
    const s = ed.essentials.find((x) => x.rank === step);
    panel.className = 'panel' + (s ? ' c' + s.rank : '');
    read.innerHTML = s ? storyHtml(s) : briefHtml();
    if (s) Modules.mount(read, s);
    read.scrollTop = 0;
    globe.hideCard();
    globe.clearOverlays();
    if (s) globe.setCurrent(s.rank, fly);
    else { globe.setCurrent(0, false); globe.flyTo([10, 22], 1); }
    const next = step < 5 ? ed.essentials.find((x) => x.rank === step + 1) : null;
    prevBtn.disabled = step === 1;
    prevBtn.innerHTML = `${icon('left')}${L('prev')}`;
    nextBtn.disabled = step === 6;
    nextBtn.innerHTML = step === 5 ? `${L('inBrief')}${icon('right')}` : next ? `${L('next')} <span>· ${flag(C(next.id))}${t(cname(next.id, next.place))}</span>${icon('right')}` : '';
    document.title = (s ? `${typo(cname(s.id, s.place))} — ` : `${L('inBrief')} — `) + 'Diurna';
  }

  const mobile = () => window.matchMedia('(max-width: 900px)').matches;
  function go(n) {
    step = Math.max(1, Math.min(6, n));
    const h = step === 6 ? '#bref' : '#' + step;
    if (location.hash !== h) history.replaceState(null, '', location.pathname + location.search + h);
    render(true);
    const top = panel.getBoundingClientRect().top + window.scrollY - 4;
    if (mobile() && window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
  }
  // Sur téléphone, le globe est au-dessus : on y remonte quand un module l'utilise.
  const toGlobe = () => { if (mobile()) window.scrollTo({ top: 0, behavior: 'smooth' }); };

  steps.addEventListener('click', (e) => { const b = e.target.closest('[data-step]'); if (b) go(Number(b.dataset.step)); });
  read.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (b) { go(Number(b.dataset.go)); return; }
    const gb = e.target.closest('[data-globe]');
    if (gb) { try { globe.highlight(JSON.parse(gb.dataset.globe).groups); toGlobe(); } catch (_) {} return; }
    const pl = e.target.closest('[data-place]');
    if (pl) {
      const s = ed.essentials.find((x) => x.rank === step);
      const p = s && s.modules && s.modules.places && s.modules.places.items[Number(pl.dataset.place)];
      if (p) { globe.showPlace(p.coords, typo(p.name), Number(pl.dataset.place) + 1); toGlobe(); }
    }
  });
  read.addEventListener('toggle', (e) => { if (e.target.classList && e.target.classList.contains('idband')) store.set('idband', e.target.open); }, true);
  prevBtn.addEventListener('click', () => go(step - 1));
  nextBtn.addEventListener('click', () => go(step + 1));
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select, summary, .g-pin, .chart') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight') go(step + 1);
    if (e.key === 'ArrowLeft') go(step - 1);
  });
  window.addEventListener('hashchange', () => { const n = stepFromHash(); if (n !== step) { step = n; render(true); } });

  const src = wanted && /^\d{4}-\d{2}-\d{2}$/.test(wanted) ? `${DATA}editions/${wanted}.json` : `${DATA}latest.json`;
  const soft = (p) => json(p).catch(() => ({}));
  Promise.all([json('assets/world.json'), json(src), soft('data/countries.json'), soft('data/gov.json'), soft('data/markets.json'), soft('data/indicators.json')]).then(([w, edition, cs, gv, mk, ind]) => {
    ed = edition; countries = cs; gov = gv; world = w;
    globe.setMeta(countries);
    globe.load(world);
    globe.setStories(ed.essentials, 0);
    Modules.setData({ ed, countries, markets: mk, indicators: ind, world: topojson.feature(w, w.objects.countries) });
    const archive = !!wanted;
    const todayHref = location.pathname;
    edLine.innerHTML = `<b>${L('no', { n: ed.number })}</b><span>${t(longDate(ed.date))}</span>`
      + (archive ? `<a href="${todayHref}">${t(L('backToday'))}</a>` : `<span>${t(L('updated', { h: hour(ed.updated) }))}</span>`)
      + (!archive && TP.stale(ed.date) ? `<span class="preparing">${t(L('preparing'))}</span>` : '');
    $('edTitle').textContent = typo(ed.headline);
    step = stepFromHash();
    render(true);
  }).catch(() => {
    const frHref = TP.ROOT + 'globe/' + location.search + location.hash;
    read.innerHTML = LANG === 'en' && wanted
      ? `<p class="err">${t(L('notTranslated'))} <a href="${frHref}" hreflang="fr">${t('Lire en français')} →</a></p>`
      : `<p class="err">${t(L('loadError'))}</p>`;
  });
})();
