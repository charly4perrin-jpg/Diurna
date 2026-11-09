/* La carte de l'actualité : chaleur sur 7 ou 30 jours, rejeu des éditions, fiche de chaque pays. */
(function () {
  'use strict';
  const { t, esc, L, LANG, DATA, ROOT, json, flag, cfield, population, store } = TP;
  const $ = (id) => document.getElementById(id);
  const host = $('mapGlobe');
  if (!host) return;
  let data = null, countries = {}, mode = store.get('mapMode', '7'), dayIx = 0, playT = null, current = null;

  const globe = new Globe(host, {
    drag: true, wheel: true, spin: 0, start: [-15, -25], label: L('mapTitle'),
    onCountry: (id) => openCountry(id, true),
    onPick: (rank) => { const d = data.days[data.dates[dayIx]]; const s = d && d.s.find((x) => x[0] === rank); if (s) openCountry(s[1], true); }
  });

  // Comptage des apparitions (sujets et « En bref ») sur une fenêtre de jours.
  function counts(lastIx, n) {
    const m = new Map();
    for (let i = Math.max(0, lastIx - n + 1); i <= lastIx; i++) {
      const d = data.days[data.dates[i]];
      d.s.forEach((x) => m.set(x[1], (m.get(x[1]) || 0) + 2));
      d.b.forEach((id) => m.set(id, (m.get(id) || 0) + 1));
    }
    return m;
  }
  const level = (v, max) => Math.max(1, Math.min(5, Math.ceil((v / max) * 5)));

  function render() {
    const date = data.dates[dayIx], d = data.days[date];
    $('mapDayOut').textContent = TP.dayLong(date);
    const stories = d.s.map((x) => ({ rank: x[0], id: x[1], title: x[2], place: globe.name(x[1]) }));
    globe.setStories(stories, 0);
    if (mode === 'day') {
      globe.setHeat(new Map(stories.map((s) => [s.id, 5]).concat(d.b.map((id) => [id, 2]))));
    } else {
      const m = counts(dayIx, Number(mode)), max = Math.max(1, ...m.values());
      globe.setHeat(new Map([...m].map(([id, v]) => [id, level(v, max)])));
    }
    renderTop();
    if (current) openCountry(current, false);
  }

  function renderTop() {
    const n = mode === 'day' ? 1 : Number(mode);
    const m = counts(dayIx, n);
    const rows = [...m].map(([id, v]) => [id, Math.round(v / 2 + 0.01), v]).sort((a, b) => b[2] - a[2]).slice(0, 10);
    $('mapTop').innerHTML = rows.map(([id, , v]) => {
      const nStories = storiesOf(id, n).length;
      return `<li><button type="button" data-country="${id}">${flag(countries[id])}<span>${t(globe.name(id))}</span><em>${t(L('mapTimes', { n: nStories || Math.max(1, Math.round(v)) }))}</em></button></li>`;
    }).join('');
  }

  function storiesOf(id, n) {
    const out = [];
    for (let i = dayIx; i >= Math.max(0, dayIx - n + 1); i--) {
      const date = data.dates[i];
      data.days[date].s.forEach((x) => { if (x[1] === id) out.push({ date, title: x[2], path: x[3] }); });
    }
    return out;
  }

  function openCountry(id, fly) {
    current = id;
    globe.select(id, fly);
    const m = countries[id];
    const n = mode === 'day' ? 30 : Number(mode);
    const list = storiesOf(id, n === 7 ? 7 : 30);
    const page = data.pages[id];
    const cap = m ? cfield(m, 'capital') : '';
    $('mapCard').innerHTML = `
      <h2 class="with-flag">${m ? flag(m) : ''}${t(globe.name(id))}</h2>
      <p class="map-facts">${[cap ? cap.replace(/ \(.*\)$/, '') : '', m && m.population ? t(L('inhabShort', { p: population(m.population) })) : ''].filter(Boolean).map(t).join(' · ')}</p>
      <p class="map-live" id="mapLive"></p>
      <p class="map-count">${list.length ? t(L(list.length > 1 ? 'mapCount' : 'mapCount1', { n: list.length, d: n === 7 ? 7 : 30 })) : t(L('mapNone', { d: n === 7 ? 7 : 30 }))}</p>
      ${list.length ? `<ul class="map-stories">${list.slice(0, 4).map((x) => `<li><a href="${ROOT}${x.path}"><time datetime="${x.date}">${t(TP.day(x.date))}</time><span>${t(x.title)}</span></a></li>`).join('')}</ul>` : ''}
      ${page ? `<p><a class="link-quiet" href="${ROOT}${page}">${t(L('mapAll'))} →</a></p>` : ''}`;
    if (TP.live && m) TP.live(id, m).then((w) => { const el = $('mapLive'); if (w && el && current === id) el.innerHTML = `${t(L('liveAt', { c: (cap || '').replace(/ \(.*\)$/, '') }))} : ${t(w.text)} <small>${t(L('liveSrc'))}</small>`; });
    TP.trackOnce('module/carte-pays', id);
  }

  // Commandes : période, rejeu, recherche, liste, nuit, zoom, plein écran.
  document.querySelectorAll('[data-mode]').forEach((b) => {
    b.setAttribute('aria-checked', String(b.dataset.mode === mode));
    b.addEventListener('click', () => {
      mode = b.dataset.mode; store.set('mapMode', mode);
      document.querySelectorAll('[data-mode]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      render(); TP.trackOnce('module/carte-periode', mode);
    });
  });
  $('mapDay').addEventListener('input', (e) => { dayIx = Number(e.target.value); render(); });
  $('mapPlay').addEventListener('click', () => {
    const label = $('mapPlay').querySelector('span');
    if (playT) { clearInterval(playT); playT = null; label.textContent = L('mapPlay'); return; }
    if (dayIx >= data.dates.length - 1) dayIx = 0;
    label.textContent = L('mapPause');
    TP.trackOnce('module/carte-rejeu', 'play');
    playT = setInterval(() => {
      dayIx++; $('mapDay').value = dayIx; render();
      if (dayIx >= data.dates.length - 1) { clearInterval(playT); playT = null; label.textContent = L('mapPlay'); }
    }, 1400);
  });
  const findId = (q) => {
    const n = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    const v = n(q);
    if (!v) return null;
    let hit = null;
    for (const [id, m] of Object.entries(countries)) { const nm = n(cfield(m, 'name')); if (nm === v) return id; if (!hit && nm.startsWith(v)) hit = id; }
    return hit;
  };
  $('mapSearchF').addEventListener('submit', (e) => { e.preventDefault(); const id = findId($('mapSearch').value); if (id) { openCountry(id, true); TP.trackOnce('module/carte-recherche', id); } });
  $('mapSearch').addEventListener('change', () => { const id = findId($('mapSearch').value); if (id) openCountry(id, true); });
  $('mapTop').addEventListener('click', (e) => { const b = e.target.closest('[data-country]'); if (b) openCountry(b.dataset.country, true); });
  $('mapNight').addEventListener('change', (e) => { globe.setNight(e.target.checked); store.set('mapNight', e.target.checked); });
  $('zin').addEventListener('click', () => globe.zoomBy(1.3));
  $('zout').addEventListener('click', () => globe.zoomBy(1 / 1.3));
  const fs = $('zfs'), stage = host.closest('.stage');
  if (document.fullscreenEnabled && stage) {
    fs.hidden = false;
    fs.addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else stage.requestFullscreen().catch(() => {}); TP.trackOnce('module/plein-ecran', 'carte'); });
  }

  Promise.all([json('assets/world.json'), json(DATA + 'map.json'), json('data/countries.json').catch(() => ({}))]).then(([world, d, cs]) => {
    data = d; countries = cs;
    globe.setMeta(cs);
    globe.load(world);
    const night = store.get('mapNight', true);
    $('mapNight').checked = night; globe.setNight(night);
    dayIx = data.dates.length - 1;
    const r = $('mapDay'); r.max = String(dayIx); r.value = String(dayIx);
    $('mapCountries').innerHTML = Object.values(cs).map((m) => `<option value="${esc(cfield(m, 'name'))}">`).join('');
    render();
    const want = new URLSearchParams(location.search).get('pays') || new URLSearchParams(location.search).get('country');
    if (want && cs[want]) openCountry(want, true);
  }).catch(() => { host.insertAdjacentHTML('beforeend', `<p class="err">${t(L('loadError'))}</p>`); });
})();
