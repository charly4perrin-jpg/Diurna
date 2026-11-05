/* Modules des fiches : chaque type d'actualité appelle ses modules, et un module ne s'affiche
   que si ses données existent et sont sourcées. Rien n'est inventé côté navigateur. */
(function (global) {
  'use strict';
  const { t, esc, L, day, dayLong, dayCount, int, dec1, dec2, flag, cfield, icon, LANG } = TP;

  // Ordre des modules par type. Pour un sujet à plusieurs types, on les alterne (le premier type d'abord).
  const BY_TYPE = {
    conflict: ['counter', 'toll', 'places', 'sides', 'help'],
    election: ['vote', 'scenarios'],
    economy: ['market', 'impact', 'rate', 'inflation'],
    diplomacy: ['table'],
    disaster: ['places', 'toll', 'help'],
    society: ['actors', 'dates']
  };
  const FIRST_LEVEL = 4; // + le chiffre du jour = 5 modules au premier niveau

  // Organisations humanitaires reconnues : liste fermée, jamais complétée par le script.
  const NGOS = {
    icrc: { fr: ['Comité international de la Croix-Rouge', 'https://www.icrc.org/fr'], en: ['International Committee of the Red Cross', 'https://www.icrc.org/en'] },
    ifrc: { fr: ['Fédération internationale de la Croix-Rouge', 'https://www.ifrc.org/fr'], en: ['International Federation of Red Cross and Red Crescent Societies', 'https://www.ifrc.org'] },
    msf: { fr: ['Médecins sans frontières', 'https://www.msf.fr'], en: ['Médecins Sans Frontières', 'https://www.msf.org'] },
    unicef: { fr: ['Unicef', 'https://www.unicef.fr'], en: ['UNICEF', 'https://www.unicef.org'] },
    wfp: { fr: ['Programme alimentaire mondial (ONU)', 'https://fr.wfp.org'], en: ['World Food Programme (UN)', 'https://www.wfp.org'] },
    unhcr: { fr: ['HCR, l’agence de l’ONU pour les réfugiés', 'https://www.unhcr.org/fr'], en: ['UNHCR, the UN refugee agency', 'https://www.unhcr.org'] },
    crf: { fr: ['Croix-Rouge française', 'https://www.croix-rouge.fr'] }
  };
  const PARTY = { blue: 'var(--c3)', red: 'var(--c1)', amber: 'var(--c2)', green: 'var(--c5)', violet: 'var(--c4)', grey: 'var(--ink-3)' };

  let D = {}; // contexte : édition, pays, marchés, indicateurs, monde
  const C = (id) => (D.countries || {})[id];
  const cname = (id) => cfield(C(id), 'name') || id;

  /* ---------- Briques ---------- */
  const SRC = (src, date) => {
    if (!src || !src.name) return '';
    const name = LANG === 'en' && src.name_en ? src.name_en : src.name;
    return `<p class="mod-src">${L('source')}${LANG === 'fr' ? '\u00a0:' : ':'} <a href="${esc(src.url)}" target="_blank" rel="noopener">${t(name)}</a>${date ? `, ${t(L('asOf', { d: day(date) }))}` : ''}</p>`;
  };
  const sourced = (m) => !!(m && ((m.source && m.source.url) || (Array.isArray(m.items) && m.items.length && m.items.every((i) => i.source && i.source.url))));
  const chips = (ids) => (ids || []).filter(C).map((id) => `<span class="chip">${flag(C(id))}${t(cname(id))}</span>`).join('');
  const globeBtn = (payload) => `<button class="mod-globe" type="button" data-globe='${esc(JSON.stringify(payload))}'>${icon('globe')}${L('showOnGlobe')}</button>`;

  /* ---------- Modules ---------- */
  const R = {};

  R.figure = {
    has: (s) => !!s.figure,
    title: () => L('figure'),
    html: (s) => `
      <p class="fig-v">${t(s.figure.value)}</p>
      <p class="fig-l">${t(s.figure.label)}</p>
      ${s.figure.compare ? `<p class="fig-c">${t(s.figure.compare)}</p>` : ''}`
  };

  R.counter = {
    has: (s) => !!(s.since && s.since.date),
    title: () => L('mCounter'),
    html: (s) => {
      const n = dayCount(s.since.date, D.ed.date);
      const y = Math.floor(n / 365.25), m = Math.floor((n - y * 365.25) / 30.44);
      const span = LANG === 'en'
        ? [y ? `${y} year${y > 1 ? 's' : ''}` : '', m ? `${m} month${m > 1 ? 's' : ''}` : ''].filter(Boolean).join(' and ')
        : [y ? `${y} an${y > 1 ? 's' : ''}` : '', m ? `${m} mois` : ''].filter(Boolean).join(' et ');
      return `
        <p class="count-v">${int(n)} <span>${t(LANG === 'en' ? 'days' : 'jours')}</span></p>
        <p class="count-l">${t(s.since.label)} · ${t(L('mCounterSince', { d: dayLong(s.since.date) }))}</p>
        ${span ? `<p class="count-s">${t(span)}</p>` : ''}`;
    }
  };

  R.toll = {
    has: (s) => sourced(s.modules && s.modules.toll),
    title: () => L('mToll'),
    html: (s) => {
      const m = s.modules.toll;
      return `<ul class="toll">${m.items.map((i) => `
        <li><b>${t(i.value)}</b><span>${t(i.label)}</span>
        <small>${i.by ? t(L('according', { s: i.by })) : ''}${i.by && i.date ? ', ' : ''}${i.date ? t(L('asOf', { d: day(i.date) })) : ''}${i.source ? ` · <a href="${esc(i.source.url)}" target="_blank" rel="noopener">${t(i.source.name)}</a>` : ''}</small></li>`).join('')}
      </ul>${m.note ? `<p class="mod-note">${t(m.note)}</p>` : ''}${m.source ? SRC(m.source) : ''}`;
    }
  };

  R.places = {
    has: (s) => sourced(s.modules && s.modules.places) && !!D.world,
    title: () => L('mPlaces'),
    html: (s) => {
      const m = s.modules.places;
      return `<div class="minimap" data-minimap="${s.rank}" role="img" aria-label="${esc(L('mPlaces') + ' : ' + m.items.map((p) => p.name).join(', '))}"></div>
        <ol class="places">${m.items.map((p, i) => `
          <li><button type="button" data-place="${i}"><span class="pnum">${i + 1}</span><span><b>${t(p.name)}</b>${p.note ? `<small>${t(p.note)}</small>` : ''}</span></button></li>`).join('')}
        </ol>${SRC(m.source)}`;
    },
    after: (el, s) => drawMinimap(el.querySelector('.minimap'), s)
  };

  R.sides = {
    has: (s) => sourced(s.modules && s.modules.sides),
    title: () => L('mSides'),
    html: (s) => {
      const m = s.modules.sides;
      const groups = m.groups.map((g, i) => `
        <div class="side side-${i ? 'b' : 'a'}">
          <p class="side-n">${t(g.name)}</p>
          ${g.lead ? `<p class="side-l">${t(L('lead', { x: g.lead }))}</p>` : ''}
          ${g.ids && g.ids.length ? `<p class="chips">${chips(g.ids)}</p>` : ''}
          ${g.note ? `<p class="side-x">${t(g.note)}</p>` : ''}
          ${(g.backers || []).length ? `<p class="side-k">${L('mBackers')}</p>${g.backers.map((b) => `<p class="side-x">${flag(C(b.id))}<b>${t(cname(b.id))}</b>${b.note ? ` — ${t(b.note)}` : ''}</p>`).join('')}` : ''}
        </div>`).join('<span class="vs" aria-hidden="true">/</span>');
      const med = (m.mediators || []).length ? `<p class="side-k">${L('mMediators')}</p><p class="side-x">${m.mediators.map((x) => `${flag(C(x.id))}<b>${t(cname(x.id))}</b>${x.note ? ` (${t(x.note)})` : ''}`).join(' · ')}</p>` : '';
      const hl = [];
      m.groups.forEach((g, i) => { if (g.ids && g.ids.length) hl.push({ ids: g.ids, cls: i ? 'hl-b' : 'hl-a' }); const bk = (g.backers || []).map((b) => b.id); if (bk.length) hl.push({ ids: bk, cls: 'hl-k' }); });
      if ((m.mediators || []).length) hl.push({ ids: m.mediators.map((x) => x.id), cls: 'hl-m' });
      if (!hl.some((h) => h.cls === 'hl-a' || h.cls === 'hl-b')) hl.unshift({ ids: [s.id], cls: 'hl-a' });
      return `<div class="sides">${groups}</div>${med}${globeBtn({ groups: hl })}${SRC(m.source)}`;
    }
  };

  R.vote = {
    has: (s) => sourced(s.modules && s.modules.vote),
    title: () => L('mVote'),
    html: (s) => {
      const m = s.modules.vote;
      const bodies = m.bodies.map((b) => {
        const segs = b.parties.map((p) => `<span style="width:${(p.value / b.total) * 100}%;background:${PARTY[p.color] || 'var(--ink-2)'}" title="${esc(p.name)} : ${p.value}"></span>`).join('');
        const legend = b.parties.map((p) => `<li><i style="background:${PARTY[p.color] || 'var(--ink-2)'}"></i>${t(p.name)}<b>${int(p.value)}</b></li>`).join('')
          + (b.rest ? `<li><i class="rest"></i>${t(b.rest)}<b>${int(b.total - b.parties.reduce((a, p) => a + p.value, 0))}</b></li>` : '');
        return `
          <div class="vbody">
            <p class="vbody-h"><b>${t(b.name)}</b><span>${t(L('seats', { n: int(b.total) }))} · ${t(L('majority', { n: int(b.majority) }))}</span></p>
            <div class="vbar" role="img" aria-label="${esc(b.name + ' : ' + b.parties.map((p) => p.name + ' ' + p.value).join(', '))}">${segs}<em style="left:${(b.majority / b.total) * 100}%"></em></div>
            <ul class="vlegend">${legend}</ul>
          </div>`;
      }).join('');
      return `<p class="vote-h">${t(m.title)} · ${t(dayLong(m.date))}</p>
        ${m.system ? `<p class="vote-s">${t(m.system)}</p>` : ''}
        ${bodies}
        ${m.note ? `<p class="mod-note">${t(m.note)}</p>` : ''}${SRC(m.source, m.asOf)}`;
    }
  };

  R.scenarios = {
    has: (s) => sourced(s.modules && s.modules.scenarios),
    title: () => L('mScenarios'),
    html: (s) => {
      const m = s.modules.scenarios;
      return `<ul class="ifs">${m.items.map((i) => `<li><p class="if">${t(i.if)}</p><p class="then">${t(i.then)}</p>${i.source ? `<small><a href="${esc(i.source.url)}" target="_blank" rel="noopener">${t(i.source.name)}</a></small>` : ''}</li>`).join('')}</ul>${m.source ? SRC(m.source) : ''}`;
    }
  };

  R.table = {
    has: (s) => sourced(s.modules && s.modules.table),
    title: () => L('mTable'),
    html: (s) => {
      const m = s.modules.table;
      const ids = m.ids.concat(m.host && !m.ids.includes(m.host) ? [m.host] : []);
      const hl = [{ ids: m.ids, cls: 'hl-a' }].concat(m.host && !m.ids.includes(m.host) ? [{ ids: [m.host], cls: 'hl-m' }] : []);
      return `<p class="chips">${chips(ids)}</p>
        ${(m.positions || []).length ? `<p class="side-k">${L('mWants')}</p><dl class="wants">${m.positions.map((p) => `<div><dt>${t(p.who)}</dt><dd>${t(p.wants)}</dd></div>`).join('')}</dl>` : ''}
        ${m.next ? `<p class="side-k">${L('mNext')}</p><p class="next-d"><time datetime="${esc(m.next.d)}">${t(dayLong(m.next.d))}</time>${t(m.next.t)}</p>` : ''}
        ${globeBtn({ groups: hl })}${SRC(m.source)}`;
    }
  };

  R.impact = {
    has: (s) => sourced(s.modules && s.modules.impact),
    title: () => L('mImpact'),
    html: (s) => `<p class="impact">${t(s.modules.impact.text)}</p>${SRC(s.modules.impact.source, s.modules.impact.date)}`
  };

  const series = (m) => {
    const b = D.markets && D.markets[m.series];
    if (!b || !Array.isArray(b.series)) return null;
    const pts = b.series.filter((p) => !m.from || p[0] >= m.from);
    return pts.length > 10 ? { b, pts } : null;
  };
  R.market = {
    has: (s) => !!(s.modules && s.modules.market && series(s.modules.market)),
    title: (s) => { const b = D.markets[s.modules.market.series]; return b.label ? b.label[LANG] || L('mMarket') : L('mMarket'); },
    html: (s) => {
      const { b, pts } = series(s.modules.market);
      const first = pts[0], last = pts[pts.length - 1];
      const unit = b.unit === 'USD' ? (v) => (LANG === 'en' ? `$${dec2.format(v)}` : `${dec2.format(v)} $`) : (v) => dec2.format(v);
      return `<div class="chart" tabindex="0" data-chart="${s.rank}" role="img" aria-label="${esc(L('chartLabel', { l: b.label ? b.label[LANG] : '', a: unit(first[1]), d1: day(first[0]), b: unit(last[1]), d2: day(last[0]) }))}"></div>
        <p class="chart-last"><b>${t(unit(last[1]))}</b> ${t(L('asOf', { d: day(last[0]) }))}</p>
        ${SRC(b.source, b.checked)}`;
    },
    after: (el, s) => { const { b, pts } = series(s.modules.market); drawChart(el.querySelector('.chart'), pts, s.modules.market, b); }
  };

  R.rate = {
    has: (s) => {
      const cur = s.modules && s.modules.rate && s.modules.rate.currency;
      return !!(cur && D.markets && D.markets.fx && D.markets.fx.rates && D.markets.fx.rates[cur]);
    },
    title: () => L('mRate'),
    html: (s) => {
      const fx = D.markets.fx, cur = s.modules.rate.currency, v = fx.rates[cur], h = (fx.history || {})[cur] || [];
      let change = '';
      if (h.length > 20) { const p = ((v - h[0][1]) / h[0][1]) * 100; change = `<p class="rate-c">${t(L('rateSince', { p: (p > 0 ? '+' : '') + dec1.format(p) + (LANG === 'fr' ? ' %' : '%') }))}</p>`; }
      return `<p class="rate-v">${t(L('rateLine', { v: dec2.format(v), c: cur }))}</p>${change}${SRC(fx.source, fx.date)}`;
    }
  };

  R.inflation = {
    has: (s) => !!(s.modules && s.modules.inflation && D.indicators && D.indicators.inflation && D.indicators.inflation.items[s.id]),
    title: () => L('mInflation'),
    html: (s) => {
      const inf = D.indicators.inflation, x = inf.items[s.id];
      return `<p class="rate-v">${t(L('inflationLine', { v: dec1.format(x.value), y: x.year }))}</p><p class="rate-c">${t(inf.label[LANG])}</p>${SRC(inf.source, inf.checked)}`;
    }
  };

  R.help = {
    has: (s) => !!(s.modules && s.modules.help && (s.modules.help.orgs || []).some((o) => NGOS[o] && NGOS[o][LANG])),
    title: () => L('mHelp'),
    html: (s) => `<ul class="help">${s.modules.help.orgs.filter((o) => NGOS[o] && NGOS[o][LANG]).map((o) => `<li><a href="${NGOS[o][LANG][1]}" target="_blank" rel="noopener">${t(NGOS[o][LANG][0])}${icon('out')}</a></li>`).join('')}</ul><p class="mod-note">${t(L('helpNote'))}</p>`
  };

  R.actors = {
    has: (s) => sourced(s.modules && s.modules.actors),
    title: () => L('mActors'),
    html: (s) => `<dl class="wants">${s.modules.actors.items.map((a) => `<div><dt>${t(a.name)}</dt><dd>${t(a.role)}</dd></div>`).join('')}</dl>${SRC(s.modules.actors.source)}`
  };

  R.dates = {
    has: (s) => sourced(s.modules && s.modules.dates),
    title: () => L('mDates'),
    html: (s) => `<ol class="timeline">${s.modules.dates.items.map((d) => `<li><time datetime="${esc(d.d)}">${esc(day(d.d))}</time><span>${t(d.t)}</span></li>`).join('')}</ol>${SRC(s.modules.dates.source)}`
  };

  /* ---------- Choix et rendu ---------- */
  function plan(s) {
    const lists = (s.types || []).map((ty) => BY_TYPE[ty] || []);
    const order = [];
    for (let i = 0; lists.some((l) => i < l.length); i++) lists.forEach((l) => { if (l[i] && !order.includes(l[i])) order.push(l[i]); });
    Object.keys(s.modules || {}).forEach((k) => { if (R[k] && !order.includes(k)) order.push(k); });
    // « Ce que ça change pour toi » passe toujours au premier niveau quand il existe.
    const ok = order.filter((k) => k !== 'impact' && R[k] && R[k].has(s));
    const lead = ['figure', 'impact'].filter((k) => R[k].has(s));
    return { first: lead.concat(ok.slice(0, FIRST_LEVEL)), more: ok.slice(FIRST_LEVEL) };
  }
  const box = (k, s) => `<section class="mod mod-${k}" data-mod="${k}"><h3 class="mod-h">${t(R[k].title(s))}</h3>${R[k].html(s)}</section>`;
  function html(s) {
    const p = plan(s);
    return `<div class="mods">${p.first.map((k) => box(k, s)).join('')}</div>
      ${p.more.length ? `<details class="explore" data-more="${p.more.join(',')}"><summary>${L('explore')}<span class="n">${p.more.length}</span>${icon('plus')}</summary><div class="mods"></div></details>` : ''}`;
  }
  function mount(root, s) {
    root.querySelectorAll('.mod').forEach((el) => { const k = el.dataset.mod; if (R[k].after) R[k].after(el, s); });
    const ex = root.querySelector('.explore');
    if (ex) ex.addEventListener('toggle', () => {
      const body = ex.querySelector('.mods');
      if (!ex.open || body.childElementCount) return;
      body.innerHTML = ex.dataset.more.split(',').map((k) => box(k, s)).join('');
      body.querySelectorAll('.mod').forEach((el) => { const k = el.dataset.mod; if (R[k].after) R[k].after(el, s); });
    });
  }

  /* ---------- Mini-carte des lieux ---------- */
  function drawMinimap(host, s) {
    if (!host || !D.world) return;
    const W = Math.max(260, host.clientWidth || 300), H = Math.round(W * 0.56);
    const places = s.modules.places.items;
    const main = D.world.features.find((f) => f.properties.a3 === s.id);
    const pts = { type: 'MultiPoint', coordinates: places.map((p) => p.coords) };
    const fit = { type: 'FeatureCollection', features: [main, { type: 'Feature', geometry: pts }].filter(Boolean) };
    const proj = d3.geoMercator().fitExtent([[26, 22], [W - 26, H - 22]], fit);
    if (proj.scale() > 9000) proj.scale(9000);
    const path = d3.geoPath(proj);
    const lands = D.world.features.map((f) => {
      const d = path(f);
      if (!d) return '';
      const cls = f.properties.a3 === s.id ? 'mm-main' : (s.involved || []).includes(f.properties.a3) ? 'mm-inv' : '';
      return `<path class="mm-land ${cls}" d="${d}"/>`;
    }).join('');
    const dots = places.map((p, i) => {
      const xy = proj(p.coords);
      if (!xy) return '';
      const right = xy[0] < W * 0.62;
      return `<g class="mm-pt" transform="translate(${xy[0].toFixed(1)},${xy[1].toFixed(1)})"><circle r="9"/><text class="n" y="1">${i + 1}</text><text class="lab" x="${right ? 14 : -14}" y="4" text-anchor="${right ? 'start' : 'end'}">${esc(TP.typo(p.name))}</text></g>`;
    }).join('');
    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" aria-hidden="true"><rect class="mm-sea" width="${W}" height="${H}" rx="10"/>${lands}${dots}</svg>`;
  }

  /* ---------- Courbe ---------- */
  function drawChart(host, pts, m, b) {
    if (!host) return;
    const W = Math.max(260, host.clientWidth || 300), H = 170, P = { l: 6, r: 44, t: 12, b: 22 };
    const xs = pts.map((p) => TP.utc(p[0])), ys = pts.map((p) => p[1]);
    const x0 = xs[0], x1 = xs[xs.length - 1], lo = Math.min(...ys), hi = Math.max(...ys);
    const pad = (hi - lo) * 0.12 || 1;
    const X = (v) => P.l + ((v - x0) / (x1 - x0)) * (W - P.l - P.r);
    const Y = (v) => P.t + (1 - (v - (lo - pad)) / (hi - lo + 2 * pad)) * (H - P.t - P.b);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
    const ticks = [lo, (lo + hi) / 2, hi].map((v) => `<g class="ytick"><line x1="${P.l}" x2="${W - P.r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text x="${W - P.r + 6}" y="${(Y(v) + 4).toFixed(1)}">${Math.round(v)}</text></g>`).join('');
    const months = [];
    const fmt = new Intl.DateTimeFormat(TP.LOC, { month: 'short', timeZone: 'UTC' });
    for (let i = 1; i < pts.length; i++) if (pts[i][0].slice(5, 7) !== pts[i - 1][0].slice(5, 7) && ['01', '04', '07', '10'].includes(pts[i][0].slice(5, 7))) months.push(i);
    const xt = months.map((i) => `<text class="xtick" x="${X(xs[i]).toFixed(1)}" y="${H - 6}">${esc(fmt.format(xs[i]))}</text>`).join('');
    let mark = '';
    if (m.mark && m.mark.d) {
      const mx = X(TP.utc(m.mark.d));
      mark = `<g class="mark"><line x1="${mx.toFixed(1)}" x2="${mx.toFixed(1)}" y1="${P.t}" y2="${H - P.b}"/><text x="${(mx + 5).toFixed(1)}" y="${P.t + 10}">${esc(TP.typo(m.mark.label || L('chartStart')))}</text></g>`;
    }
    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" aria-hidden="true">${ticks}${xt}${mark}<path class="line" d="${d}"/><circle class="end" r="3.5" cx="${X(x1).toFixed(1)}" cy="${Y(ys[ys.length - 1]).toFixed(1)}"/><g class="cur" visibility="hidden"><line y1="${P.t}" y2="${H - P.b}"/><circle r="4"/></g></svg><p class="chart-tip" hidden></p>`;
    const svg = host.querySelector('svg'), cur = svg.querySelector('.cur'), tip = host.querySelector('.chart-tip');
    const unit = b.unit === 'USD' ? (v) => (LANG === 'en' ? `$${dec2.format(v)}` : `${dec2.format(v)} $`) : (v) => dec2.format(v);
    let idx = pts.length - 1;
    const show = (i) => {
      idx = Math.max(0, Math.min(pts.length - 1, i));
      const cx = X(xs[idx]), cy = Y(ys[idx]);
      cur.setAttribute('visibility', 'visible');
      cur.querySelector('line').setAttribute('x1', cx); cur.querySelector('line').setAttribute('x2', cx);
      cur.querySelector('circle').setAttribute('cx', cx); cur.querySelector('circle').setAttribute('cy', cy);
      tip.hidden = false;
      tip.textContent = `${TP.typo(unit(ys[idx]))} · ${day(pts[idx][0])}`;
      tip.style.left = `${(cx / W) * 100}%`;
    };
    const fromEvent = (e) => { const r = svg.getBoundingClientRect(); const v = x0 + (((e.clientX - r.left) / r.width) * W - P.l) / (W - P.l - P.r) * (x1 - x0); let best = 0; xs.forEach((x, i) => { if (Math.abs(x - v) < Math.abs(xs[best] - v)) best = i; }); return best; };
    svg.addEventListener('pointermove', (e) => show(fromEvent(e)));
    svg.addEventListener('pointerdown', (e) => show(fromEvent(e)));
    svg.addEventListener('pointerleave', () => { cur.setAttribute('visibility', 'hidden'); tip.hidden = true; });
    host.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); show(idx + (e.key === 'ArrowRight' ? 5 : -5)); }
    });
    host.addEventListener('blur', () => { cur.setAttribute('visibility', 'hidden'); tip.hidden = true; });
  }

  global.Modules = { setData: (d) => { D = Object.assign(D, d); }, html, mount, plan };
})(window);
