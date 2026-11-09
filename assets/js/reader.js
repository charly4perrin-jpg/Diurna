/* Page de l'édition : les cinq essentiels un par un, puis En bref. Français ou anglais selon la page.
   Chaque sujet a sa propre adresse (/AAAA/MM/JJ/slug/) et son texte est déjà dans la page :
   ce script allume le globe, ajoute les modules et passe d'un sujet à l'autre sans recharger. */
(function () {
  'use strict';
  const { t, esc, typo, L, LANG, DATA, day, longDate, hour, dayCount, int, json, icon, flag, cfield, population, store } = TP;
  const $ = (id) => document.getElementById(id);
  const panel = $('panel'), steps = $('steps'), read = $('read'), edLine = $('edLine');
  const prevBtn = $('prev'), nextBtn = $('next');
  const B = document.body.dataset;
  const isLatest = B.latest === '1';
  let ed = null, step = B.rank === 'bref' ? 6 : Number(B.rank) || 1, countries = {}, gov = {}, world = null, routes = null, xtra = {};
  const other = LANG === 'en' ? 'fr' : 'en';
  const datePath = () => TP.ROOT + (LANG === 'en' ? 'en/' : '') + ed.date.replace(/-/g, '/') + '/';
  const urlOf = (n) => { const s = ed.essentials.find((x) => x.rank === n); return s ? datePath() + s.slug + '/' : datePath(); };

  const globe = new Globe($('globe'), {
    drag: true, wheel: true, spin: 0, start: [-20, -24],
    label: L('globeLabel'),
    onPick: (rank) => { const s = ed && ed.essentials.find((x) => x.rank === rank); if (s) TP.track('pays-clique', s.id); go(rank); }
  });
  const leg = $('zleg'), legPop = $('legPop');
  if (leg && legPop) leg.addEventListener('click', () => { legPop.hidden = !legPop.hidden; leg.setAttribute('aria-expanded', String(!legPop.hidden)); if (!legPop.hidden) TP.trackOnce('module/legende', 'globe'); });
  const fsb = $('zfs'), stage = $('globe').closest('.stage');
  if (fsb && stage && document.fullscreenEnabled) {
    fsb.hidden = false;
    fsb.addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else stage.requestFullscreen().catch(() => {}); TP.trackOnce('module/plein-ecran', 'edition'); });
  }
  $('zin').addEventListener('click', () => globe.zoomBy(1.3));
  $('zout').addEventListener('click', () => globe.zoomBy(1 / 1.3));
  $('zre').addEventListener('click', () => {
    const s = ed && ed.essentials.find((x) => x.rank === step);
    globe.clearOverlays();
    globe.k = 1; globe.flyTo(s ? globe.where(s) : [20, 24], s ? globe.zoomFor(s) : 1);
  });

  const C = (id) => countries[id] || null;
  const cname = (id, fb) => cfield(C(id), 'name') || fb;

  // Anciennes adresses (#1 à #5, #bref) et retour arrière : on retrouve le sujet.
  function stepFromHash() {
    const h = location.hash.replace('#', '');
    if (h === 'bref') return 6;
    const n = Number(h);
    return n >= 1 && n <= 5 ? n : 0;
  }
  function stepFromPath() {
    const slug = location.pathname.replace(/\/$/, '').split('/').pop();
    const s = ed.essentials.find((x) => x.slug === slug);
    return s ? s.rank : 6;
  }

  function renderSteps() {
    steps.innerHTML = ed.essentials.map((s) =>
      `<a class="step c${s.rank}${readSet().has(s.rank) && step !== s.rank ? ' done' : ''}" href="${urlOf(s.rank)}" data-step="${s.rank}" aria-label="${t(s.rank + '. ' + cname(s.id, s.place) + (readSet().has(s.rank) ? ' — ' + L('readMark') : ''))}"${step === s.rank ? ' aria-current="step"' : ''}>${s.rank}</a>`
    ).join('') + `<a class="step brief-step" href="${datePath()}" data-step="6"${step === 6 ? ' aria-current="step"' : ''}>${L('inBrief')}</a>`;
  }

  let first = true;
  // Le formulaire de newsletter (s'il est configuré) est rendu par le serveur : on le garde pour « En bref ».
  const nlHtml = (() => { const n = read.querySelector('.newsletter'); return n ? n.outerHTML : ''; })();
  const ydHtml = (() => { const n = read.querySelector('.yesterday'); return n ? n.outerHTML : ''; })();
  const fold = (label, body, key) => `<details class="fold"${key ? ` data-fold="${key}"` : ''}><summary>${label}${icon('plus')}</summary><div class="fold-body">${body}</div></details>`;

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
        <p class="id-follow"><button class="act" type="button" data-follow="${s.id}" aria-pressed="false">${icon('star')}<span>${t(L('follow'))}</span></button></p>
        <p class="id-live" data-live="${s.id}" data-cap="${esc(capital ? capital.replace(/ \(.*\)$/, '') : '')}" hidden></p>
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
          <li><a class="nr c${o.rank}" href="${urlOf(o.rank)}" data-go="${o.rank}">
            <span class="rubric"><span class="rank">${o.rank}</span>${flag(C(o.id))}${t(cname(o.id, o.place))}</span>
            <span class="nr-t">${t(o.title)}</span>
          </a></li>`).join('')}
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
    meta.push(`<span class="rt">${t(L('readTime', { n: readMin(s) }))}</span>`);
    if (s.updates && s.updates.length) meta.push(`<a class="upd" href="#maj">${t(L('updatedAt', { h: TP.hour(s.updates[s.updates.length - 1].time) }))}</a>`);
    if (s.dossier) meta.push(`<a class="dossier" href="${TP.ROOT}${LANG === 'en' ? 'en/' : ''}dossiers/${esc(s.dossier.id)}/">${t(L('dossier'))} · ${t(s.dossier.title)}</a>`);
    const sl = srcLine(s);
    if (sl) meta.push(`<span class="src-line">${t(sl)}</span>`);
    meta.push(TP.aiLabel());

    const keys = (s.keys || []).map((k) => `<div><dt>${t(k.title)}</dt><dd>${t(k.text)}</dd></div>`).join('');
    const ctx = (s.context || []).map((c) => {
      const soon = TP.utc(c.d) > TP.utc(ed.date);
      return `<li class="${soon ? 'soon' : ''}"><time datetime="${esc(c.d)}">${esc(day(c.d, ed.date))}</time><span>${t(c.t)}</span></li>`;
    }).join('');
    const src = (s.sources || []).map((x) => `<li><b>${t(x.name)}</b><a href="${esc(x.url)}" target="_blank" rel="noopener">${t(x.title)}</a></li>`).join('');
    const acc = C(s.id) && C(s.id).accent;

    return `
      <div class="article${first ? '' : ' swap'}"${acc ? ` style="--acc:${acc}"` : ''}>
        ${idBand(s)}
        <p class="rubric"><span class="rank">${s.rank}</span>${t(s.section)}${s.radar ? `<span class="radar">${L('radar')}</span>` : ''}</p>
        <h2>${t(s.title)}</h2>
        <p class="chapo">${t(s.standfirst)}</p>
        <p class="byline">${meta.join('')}</p>
        <p class="lbl">${t(L('lblFacts'))}</p>
        <p class="body">${(s.body || []).map(t).join(' ')}</p>
        ${Modules.html(s)}
        ${s.analysis ? `<p class="lbl">${t(L('lblAnalysis'))}</p><h3>${t(s.analysis.title)}</h3><p class="analysis">${t(s.analysis.text)}</p>` : ''}
        ${coverageHtml(s)}
        <div class="folds">
          ${keys ? fold(L('keys'), `<dl class="keys">${keys}</dl>`, 'cles') : ''}
          ${ctx ? fold(L('timeline'), `<ol class="timeline">${ctx}</ol>`, 'reperes') : ''}
          ${src ? fold(L('sources'), `<ul class="sources">${src}</ul>`, 'sources') : ''}
        </div>
        ${updatesHtml(s)}
        ${actions(s)}
        ${nextReads(s)}
        ${pastHtml(s)}
      </div>`;
  }

  // Couverture du sujet et sujets des éditions précédentes : calculés à la construction (data/xtra/<date>.json).
  function coverageHtml(s) {
    const c = xtra[s.rank] && xtra[s.rank].cov;
    if (!c || !c.n) return '';
    const it = [`<li><b>${int(c.n)}</b> ${t(L(c.n > 1 ? 'covSrc' : 'covSrc1'))}</li>`, `<li><b>${int(c.p)}</b> ${t(L(c.p > 1 ? 'covProd' : 'covProd1'))}</li>`, `<li><b>${int(c.ref)}</b> ${t(L('covRef'))}</li>`];
    if (c.ag.length) it.push(`<li>${t(`${L(c.ag.length > 1 ? 'covAgs' : 'covAg')} : ${c.ag.join(', ')}`)}</li>`);
    if (c.local.length) it.push(`<li>${t(`${L('covLocal')} : ${c.local.join(', ')}`)}</li>`);
    return `<section class="coverage" aria-labelledby="cov-h"><h3 class="lbl" id="cov-h">${t(L('covTitle'))}</h3><ul>${it.join('')}</ul><a class="link-quiet" href="${TP.ROOT}${LANG === 'en' ? 'en/sources/' : 'sources/'}">${t(L('covMore'))}</a></section>`;
  }
  function pastHtml(s) {
    const list = xtra[s.rank] && xtra[s.rank].past;
    if (!list || !list.length) return '';
    return `<section class="pastreads" aria-labelledby="past-h"><h3 id="past-h">${t(L('pastTitle'))}</h3><ul>${list.map((x) => `<li><a href="${TP.ROOT}${x.path}"><time datetime="${x.date}">${t(TP.day(x.date, ed.date))}</time><span class="rubric">${flag(C(x.id))}${t(cname(x.id, x.place))}</span><span class="nr-t">${t(x.title)}</span></a></li>`).join('')}</ul></section>`;
  }

  // « Sources : Reuters, AP et 2 autres » : les rédactions citées, sans doublon.
  function srcLine(s) {
    const names = [...new Set((s.sources || []).map((x) => (LANG === 'en' && x.name_en) || x.name))];
    if (!names.length) return '';
    const and = LANG === 'en' ? ' and ' : ' et ';
    const list = names.length <= 3 ? names.slice(0, -1).join(', ') + (names.length > 1 ? and : '') + names[names.length - 1] : L('andMore', { a: names.slice(0, 2).join(', '), n: names.length - 2 });
    return L('sourcesBy', { x: list });
  }
  const readMin = (s) => Math.max(1, Math.round([s.standfirst, ...(s.body || []), s.analysis && s.analysis.text, ...(s.keys || []).map((k) => k.text)].join(' ').split(/\s+/).filter(Boolean).length / 220));
  const printUrl = () => datePath() + (LANG === 'en' ? 'print/' : 'imprimer/');

  // Sujets lus : gardés sur l'appareil (14 derniers jours), cochés dans la barre des sujets.
  const readSet = () => new Set((store.get('read', {})[ed.date]) || []);
  const allRead = () => readSet().size >= ed.essentials.length;
  function markRead(rank) {
    if (TP.visit) TP.visit();
    const all = store.get('read', {}), list = new Set(all[ed.date] || []);
    if (list.has(rank)) return;
    list.add(rank); all[ed.date] = [...list];
    Object.keys(all).sort().slice(0, -14).forEach((k) => delete all[k]);
    store.set('read', all);
    if (list.size === ed.essentials.length) TP.track('edition-lue', ed.date);
  }

  // Glossaire : la première occurrence de chaque terme devient un bouton qui affiche sa définition.
  let GLOSS = null;
  function glossify(root) {
    if (!GLOSS || !root) return;
    const done = new Set();
    const targets = root.querySelectorAll('.chapo, .body, .analysis');
    for (const el of targets) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        for (const g of GLOSS) {
          if (done.has(g.k)) continue;
          const m = g.re.exec(node.nodeValue);
          if (!m) continue;
          done.add(g.k);
          const after = node.splitText(m.index), rest = after.splitText(m[0].length);
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'gl'; b.dataset.gl = g.k; b.textContent = m[0];
          b.setAttribute('aria-expanded', 'false'); b.title = L('glossaryHint');
          after.parentNode.replaceChild(b, after);
          // le reste du nœud est examiné aux tours suivants
          nodes.push(rest);
          break;
        }
      }
    }
  }
  let pop = null;
  function closeGloss() { if (pop) { pop.btn.setAttribute('aria-expanded', 'false'); pop.el.remove(); pop = null; } }
  function openGloss(btn) {
    const g = GLOSS && GLOSS.find((x) => x.k === btn.dataset.gl);
    if (!g) return;
    const same = pop && pop.btn === btn;
    closeGloss();
    if (same) return;
    const el = document.createElement('span');
    el.className = 'gl-pop'; el.setAttribute('role', 'note'); el.id = 'gl-' + g.k;
    el.innerHTML = `<b>${t(g.t)}</b>${t(g.d)} <a class="gl-more" href="${TP.ROOT}${LANG === 'en' ? 'en/glossary/' : 'glossaire/'}#${esc(g.k)}">${t(L('glTitle'))} →</a>`;
    // La définition flotte sous le mot, par-dessus le texte, sans le couper en deux.
    const host = btn.closest('.chapo, .body, .analysis') || btn.parentNode;
    host.style.position = 'relative';
    host.appendChild(el);
    const hb = host.getBoundingClientRect(), bb = btn.getBoundingClientRect();
    el.style.top = `${bb.bottom - hb.top + 6}px`;
    btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-describedby', el.id);
    pop = { btn, el };
    TP.trackOnce('module/glossaire', g.k);
  }
  json('data/glossary.json').then((all) => {
    GLOSS = (all[LANG] || []).map((g) => ({ ...g, re: new RegExp(`(?<![\\p{L}\\p{N}])(?:${g.m})(?![\\p{L}\\p{N}])`, g.cs ? 'u' : 'iu') }));
    glossify(read.querySelector('.article'));
  }).catch(() => {});

  // Écouter : la synthèse vocale du navigateur lit le titre, le chapô, les trois phrases et l'analyse.
  let speaking = false;
  function stopSpeech() {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel(); speaking = false;
    read.querySelectorAll('[data-listen] span').forEach((x) => { x.textContent = L('listen'); });
  }
  function speak(s) {
    if (speaking) { stopSpeech(); return; }
    const text = [s.title, s.standfirst, ...(s.body || []), s.analysis ? s.analysis.title + '. ' + s.analysis.text : ''].join('. ').replace(/\.\s*\./g, '.');
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG === 'en' ? 'en-GB' : 'fr-FR'; u.rate = 1;
    const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.toLowerCase().startsWith(LANG));
    if (v) u.voice = v;
    u.onend = u.onerror = () => stopSpeech();
    speechSynthesis.cancel(); speechSynthesis.speak(u); speaking = true;
    read.querySelectorAll('[data-listen] span').forEach((x) => { x.textContent = L('stopListen'); });
    TP.trackOnce('module/ecouter', s.id);
  }

  // Mises à jour datées (révision du soir, corrections).
  function updatesHtml(s) {
    if (!s.updates || !s.updates.length) return '';
    return `<aside class="updates" id="maj" aria-labelledby="maj-h"><h3 id="maj-h">${t(L('updatesTitle'))}</h3><ul>${s.updates.map((u) => `<li><time datetime="${esc(u.time)}">${t(TP.hour(u.time))}</time><span>${t(u.text)}</span></li>`).join('')}</ul></aside>`;
  }

  // Partager, donner son avis, signaler une erreur. Les deux derniers n'apparaissent que si le site les a configurés.
  function actions(s) {
    const url = location.origin + urlOf(s.rank);
    const fb = B.fb || '', repo = B.repo || '';
    const avis = fb.startsWith('tally:') ? `https://tally.so/r/${fb.slice(6)}?page=${encodeURIComponent(url)}&lang=${LANG}`
      : fb.startsWith('mail:') ? `mailto:${fb.slice(5)}?subject=${encodeURIComponent('Diurna — ' + typo(s.title))}&body=${encodeURIComponent(url + '\n\n')}` : '';
    const issue = repo ? `https://github.com/${repo}/issues/new?template=erreur.yml&page=${encodeURIComponent(url)}&title=${encodeURIComponent((LANG === 'en' ? 'Error: ' : 'Erreur : ') + typo(s.title))}` : '';
    return `
        <div class="story-actions">
          <button class="act" type="button" data-share>${icon('share')}<span>${L('share')}</span></button>
          <button class="act" type="button" data-save="${esc(JSON.stringify({ p: urlOf(s.rank).slice(TP.ROOT.length), t: s.title, d: ed.date, c: s.id, n: s.place }))}" aria-pressed="false" title="${esc(L('saveLong'))}">${icon('bookmark')}<span>${L('save')}</span></button>
          ${'speechSynthesis' in window ? `<button class="act" type="button" data-listen>${icon('listen')}<span>${L('listen')}</span></button>` : ''}
          <button class="act act-size" type="button" data-prefs aria-haspopup="dialog" aria-expanded="false" aria-label="${esc(L('prefs'))}"><span aria-hidden="true">A<small>a</small></span></button>
          <a class="act quiet" href="${printUrl()}">${L('printable')}</a>
          ${avis ? `<a class="act" href="${esc(avis)}" target="_blank" rel="noopener" data-feedback>${L('feedback')}</a>` : ''}
          ${issue ? `<a class="act quiet" href="${esc(issue)}" target="_blank" rel="noopener">${L('reportError')}</a>` : ''}
        </div>`;
  }

  // Édition précédente et suivante (d'après data/routes.json).
  function edPagerHtml() {
    const days = Object.keys((routes && routes[LANG]) || {}).sort(), i = days.indexOf(ed.date);
    if (i < 0) return '';
    const prev = days[i - 1], next = days[i + 1];
    if (!prev && !next) return '';
    const href = (d) => TP.ROOT + routes[LANG][d].bref;
    return `<nav class="ed-pager" aria-label="${esc(L('allEditions'))}">${prev ? `<a href="${href(prev)}" rel="prev">${icon('left')}<span><small>${t(L('prevEd'))}</small>${t(TP.day(prev, ed.date))}</span></a>` : '<span></span>'}${next ? `<a href="${href(next)}" rel="next"><span><small>${t(L('nextEd'))}</small>${t(TP.day(next, ed.date))}</span>${icon('right')}</a>` : ''}</nav>`;
  }

  // Barre de progression de la lecture, en haut du panneau (ou de la page sur mobile).
  const prog = document.createElement('div');
  prog.className = 'rprog'; prog.setAttribute('aria-hidden', 'true'); prog.innerHTML = '<span></span>';
  panel.prepend(prog);
  function onScroll() {
    const inner = read.scrollHeight > read.clientHeight + 4 && getComputedStyle(read).overflowY !== 'visible';
    const top = inner ? read.scrollTop : window.scrollY - (read.getBoundingClientRect().top + window.scrollY);
    const h = inner ? read.scrollHeight - read.clientHeight : read.offsetHeight - window.innerHeight;
    prog.firstChild.style.transform = `scaleX(${h > 0 ? Math.min(1, Math.max(0, top / h)) : 0})`;
  }
  read.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  function briefHtml() {
    const brief = (ed.brief || []).map((b) => `<li><b>${flag(C(b.id))}${t(b.place)}</b>${t(b.text)}${b.url ? ` <a href="${esc(b.url)}" target="_blank" rel="noopener">${L('source')}</a>` : ''}</li>`).join('');
    const agenda = (ed.agenda || []).map((a) => `<li><time datetime="${esc(a.d)}">${esc(day(a.d, ed.date))}</time><span>${t(a.t)}</span></li>`).join('');
    const archives = TP.ROOT + (LANG === 'en' ? 'en/archives/' : 'archives/');
    return `
      <div class="article${first ? '' : ' swap'}">
        <p class="rubric">${t(L('elsewhere'))}</p>
        <h2>${L('inBrief')}</h2>
        <p class="byline">${TP.aiLabel()}</p>
        ${brief ? `<ul class="brief">${brief}</ul>` : ''}
        ${agenda ? `<h3>${L('comingUp')}</h3><ul class="agenda">${agenda}</ul>` : ''}
        <p class="end-note">${t(L('endNote'))}</p>
        ${edPagerHtml()}
        <p class="print-link"><a class="link-quiet" href="${printUrl()}">${icon('print')}${t(L('printable'))}</a> · <a class="link-quiet" href="${TP.ROOT}${LANG === 'en' ? 'en/' : ''}agenda.ics">${icon('cal')}${t(L('calAll'))}</a></p>
        ${ydHtml}
        ${allRead() ? `<p class="all-read">${icon('check')}${t(L('allRead'))}${TP.streak && TP.streak() > 1 ? ` · ${t(L('streak', { n: TP.streak() }))}` : ''}</p>` : ''}
        <p class="quiz-cta"><a class="btn" href="${datePath()}quiz/">${t(L('quizStart'))}${icon('right')}</a></p>
        ${nlHtml}
        <p><a class="link-quiet" href="${archives}">${t(L('allEditions'))} →</a></p>
      </div>`;
  }

  function render(fly) {
    renderSteps();
    const s = ed.essentials.find((x) => x.rank === step);
    panel.className = 'panel' + (s ? ' c' + s.rank : '');
    read.innerHTML = s ? storyHtml(s) : briefHtml();
    stopSpeech(); closeGloss(); setTimeout(fillLive, 0); setTimeout(() => { if (TP.paintFollow) TP.paintFollow(); if (TP.paintSaved) TP.paintSaved(); }, 0);
    if (s) { Modules.mount(read, s); glossify(read.querySelector('.article')); markRead(s.rank); TP.track('fiche-ouverte', `${s.rank} · ${s.id}`); }
    read.scrollTop = 0; setTimeout(onScroll, 0);
    globe.hideCard();
    globe.clearOverlays();
    if (s) globe.setCurrent(s.rank, fly);
    else { globe.setCurrent(0, false); globe.flyTo([10, 22], 1); }
    const next = step < 5 ? ed.essentials.find((x) => x.rank === step + 1) : null;
    prevBtn.disabled = step === 1;
    prevBtn.innerHTML = `${icon('left')}${L('prev')}`;
    nextBtn.disabled = step === 6;
    nextBtn.innerHTML = step === 5 ? `${L('inBrief')}${icon('right')}` : next ? `${L('next')} <span>· ${flag(C(next.id))}${t(cname(next.id, next.place))}</span>${icon('right')}` : '';
    document.title = s ? `${typo(s.title)} — Diurna` : `${typo(L('editionOf', { d: TP.dayLong(ed.date) }) + (LANG === 'fr' ? ' : ' : ': ') + ed.headline)} — Diurna`;
    $('edTitle').textContent = typo(s ? s.title : ed.headline);
    // Le lien FR/EN pointe vers le même sujet dans l'autre langue, s'il existe.
    const alt = routes && routes[other] && routes[other][ed.date];
    const lang = document.querySelector('a.lang');
    if (lang && alt) lang.href = TP.ROOT + (step === 6 ? alt.bref : alt[step] || alt.bref);
    first = false;
  }

  const mobile = () => window.matchMedia('(max-width: 900px)').matches;
  function go(n) {
    n = Math.max(1, Math.min(6, n));
    if (n === step) return;
    step = n;
    const url = urlOf(step);
    if (location.pathname !== new URL(url, location.href).pathname) history.pushState({ step }, '', url);
    render(true);
    const top = panel.getBoundingClientRect().top + window.scrollY - 4;
    if (mobile() && window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
  }
  // Sur téléphone, le globe est au-dessus : on y remonte quand un module l'utilise.
  const toGlobe = () => { if (mobile()) window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // Un clic simple change de sujet sur place ; Ctrl/⌘-clic ouvre la page dans un nouvel onglet.
  const plain = (e) => !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button);
  steps.addEventListener('click', (e) => { const b = e.target.closest('[data-step]'); if (b && ed && plain(e)) { e.preventDefault(); go(Number(b.dataset.step)); } });
  // Quels modules servent vraiment : on compte la première interaction avec chacun.
  const modOf = (el) => { const m = el.closest && el.closest('[data-mod]'); return m ? m.dataset.mod : null; };
  const current = () => (ed ? (ed.essentials.find((x) => x.rank === step) || {}).id || 'bref' : '');
  read.addEventListener('pointerdown', (e) => { const m = modOf(e.target); if (m) TP.trackOnce('module/' + m, current()); });
  read.addEventListener('keydown', (e) => { const m = modOf(e.target); if (m) TP.trackOnce('module/' + m, current()); });
  read.addEventListener('toggle', (e) => {
    const d = e.target;
    if (!d.open || !d.classList) return;
    if (d.classList.contains('explore')) TP.trackOnce('module/explorer-plus', current());
    else if (d.classList.contains('idband')) TP.trackOnce('module/fiche-pays', current());
    else if (d.classList.contains('fold')) TP.trackOnce('module/' + (d.dataset.fold || 'repli'), current());
  }, true);
  read.addEventListener('click', async (e) => {
    const sh = e.target.closest('[data-share]');
    if (sh) {
      const s = ed.essentials.find((x) => x.rank === step);
      const r = await TP.share(typo(s ? s.title : ed.headline), location.origin + urlOf(step), sh);
      if (r === 'copied') { const label = sh.querySelector('span'); label.textContent = L('shareCopied'); setTimeout(() => { label.textContent = L('share'); }, 2200); }
      return;
    }
    if (e.target.closest('[data-feedback]')) TP.track('avis', current());
    if (e.target.closest('[data-listen]')) { const s = ed.essentials.find((x) => x.rank === step); if (s) speak(s); return; }
    const gl = e.target.closest('.gl');
    if (gl) { openGloss(gl); return; }
    if (pop && !e.target.closest('.gl-pop')) closeGloss();
    const b = e.target.closest('[data-go]');
    if (b && plain(e)) { e.preventDefault(); go(Number(b.dataset.go)); return; }
    const gb = e.target.closest('[data-globe]');
    if (gb) { try { globe.highlight(JSON.parse(gb.dataset.globe).groups); toGlobe(); } catch (_) {} return; }
    const pl = e.target.closest('[data-place]');
    if (pl) {
      const s = ed.essentials.find((x) => x.rank === step);
      const p = s && s.modules && s.modules.places && s.modules.places.items[Number(pl.dataset.place)];
      if (p) { globe.showPlace(p.coords, typo(p.name), Number(pl.dataset.place) + 1); toGlobe(); }
    }
  });
  read.addEventListener('toggle', (e) => { if (e.target.classList && e.target.classList.contains('idband')) { store.set('idband', e.target.open); if (e.target.open) fillLive(); } }, true);
  // Heure locale et météo de la capitale, seulement quand la fiche pays est ouverte.
  function fillLive() {
    const el = read.querySelector('.idband[open] [data-live]');
    if (!el || !TP.live || el.dataset.done) return;
    el.dataset.done = '1';
    TP.live(el.dataset.live, C(el.dataset.live)).then((w) => {
      if (!w || !el.isConnected) return;
      el.innerHTML = `${t(L('liveAt', { c: el.dataset.cap }))} : ${t(w.text)} <small>${t(L('liveSrc'))}</small>`;
      el.hidden = false;
    });
  }
  prevBtn.addEventListener('click', () => go(step - 1));
  nextBtn.addEventListener('click', () => go(step + 1));
  // Partager un passage : sélectionner une phrase fait apparaître un bouton qui partage le lien vers ce passage.
  const qbtn = document.createElement('button');
  qbtn.type = 'button'; qbtn.className = 'quote-btn'; qbtn.hidden = true;
  qbtn.innerHTML = `${icon('share')}<span>${t(L('shareQuote'))}</span>`;
  document.body.appendChild(qbtn);
  let quote = '';
  const placeQuote = () => {
    const sel = document.getSelection();
    const txt = sel && !sel.isCollapsed ? sel.toString().trim().replace(/\s+/g, ' ') : '';
    const inArticle = sel && sel.rangeCount && read.contains(sel.getRangeAt(0).commonAncestorContainer);
    if (!txt || txt.length < 12 || !inArticle) { qbtn.hidden = true; return; }
    quote = txt.length > 160 ? txt.slice(0, 160).replace(/\s+\S*$/, '') : txt;
    const r = sel.getRangeAt(0).getBoundingClientRect();
    qbtn.style.top = `${Math.max(8, r.top + window.scrollY - 48)}px`;
    qbtn.style.left = `${Math.min(window.innerWidth - 220, Math.max(8, r.left + window.scrollX))}px`;
    qbtn.hidden = false;
  };
  document.addEventListener('selectionchange', () => { clearTimeout(placeQuote.t); placeQuote.t = setTimeout(placeQuote, 250); });
  qbtn.addEventListener('pointerdown', (e) => e.preventDefault());
  qbtn.addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}#:~:text=${encodeURIComponent(quote)}`;
    const r = await TP.share(`« ${quote} »`, url);
    if (r === 'copied') { qbtn.querySelector('span').textContent = L('quoteCopied'); setTimeout(() => { qbtn.querySelector('span').textContent = L('shareQuote'); qbtn.hidden = true; }, 1600); }
    TP.trackOnce('module/partage-passage', current());
  });

  // Raccourcis clavier : ← →, 1 à 5, B (En bref), G (globe), ? (aide), Échap.
  let help = null;
  function toggleHelp() {
    if (help) { help.remove(); help = null; return; }
    help = document.createElement('div');
    help.className = 'kbd-help'; help.setAttribute('role', 'dialog'); help.setAttribute('aria-label', L('shortcuts'));
    help.innerHTML = `<p><b>${t(L('shortcuts'))}</b></p><ul>${L('shortcutsList').split(' · ').map((x) => { const [k, v] = x.split(' : '); return `<li><kbd>${t(k)}</kbd><span>${t(v)}</span></li>`; }).join('')}</ul><button type="button" class="act" data-close-help>${t(L('close'))}</button>`;
    document.body.appendChild(help);
    help.querySelector('button').focus();
    TP.trackOnce('module/raccourcis', 'aide');
  }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-close-help]')) toggleHelp(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (help) toggleHelp(); closeGloss(); return; }
    if (e.target.closest('input, textarea, select, summary, .g-pin, .chart') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight') go(step + 1);
    else if (e.key === 'ArrowLeft') go(step - 1);
    else if (/^[1-5]$/.test(e.key)) go(Number(e.key));
    else if (e.key === 'b' || e.key === 'B') go(6);
    else if (e.key === 'g' || e.key === 'G') { const g = $('globe'); g.scrollIntoView({ behavior: 'smooth', block: 'center' }); const svg = g.querySelector('svg'); if (svg) svg.focus(); }
    else if (e.key === '?') toggleHelp();
  });

  // Balayage gauche/droite sur l'article (mobile) pour changer de sujet.
  let sw = null;
  read.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || e.target.closest('.chart, .minimap, .mod-globe, input, .gl-pop, .story-actions')) { sw = null; return; }
    sw = { x: e.clientX, y: e.clientY, t: Date.now() };
  }, { passive: true });
  read.addEventListener('pointerup', (e) => {
    if (!sw || e.pointerType !== 'touch') return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y, dt = Date.now() - sw.t;
    sw = null;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 45 && dt < 700) { go(step + (dx < 0 ? 1 : -1)); TP.trackOnce('module/balayage', 'mobile'); }
  }, { passive: true });
  window.addEventListener('popstate', () => { if (!ed) return; const n = stepFromPath(); if (n !== step) { step = n; render(true); } });
  window.addEventListener('hashchange', () => { const n = stepFromHash(); if (n) go(n); });

  const src = `${DATA}editions/${B.date}.json`;
  const soft = (p) => json(p).catch(() => ({}));
  Promise.all([json('assets/world.json'), json(src), soft('data/countries.json'), soft('data/gov.json'), soft('data/markets.json'), soft('data/indicators.json'), soft('data/routes.json'), soft(`${DATA}xtra/${B.date}.json`)]).then(([w, edition, cs, gv, mk, ind, rt, xt]) => {
    ed = edition; countries = cs; gov = gv; world = w; routes = rt; xtra = xt || {};
    globe.setMeta(countries);
    globe.load(world);
    globe.setStories(ed.essentials, 0);
    Modules.setData({ ed, countries, markets: mk, indicators: ind, world: topojson.feature(w, w.objects.countries) });
    if (isLatest && TP.stale(ed.date)) edLine.insertAdjacentHTML('beforeend', `<span class="preparing">${t(L('preparing'))}</span>`);
    const h = stepFromHash();
    if (h) { step = h; history.replaceState({ step }, '', urlOf(step)); }
    history.replaceState({ step }, '', location.pathname);
    render(true);
  }).catch(() => {
    // Le texte du sujet est déjà dans la page : seul le globe manque. On le signale sans effacer l'article.
    $('globe').insertAdjacentHTML('beforeend', `<p class="err">${t(L('loadError'))}</p>`);
  });
})();
