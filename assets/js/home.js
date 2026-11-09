/* Page d'accueil : le texte est déjà dans la page ; ici on allume le globe. */
(function () {
  'use strict';
  const line = document.querySelector('.cover .edition-line');
  if (line && TP.stale(line.dataset.date)) line.insertAdjacentHTML('beforeend', `<span class="preparing">${TP.t(TP.L('preparing'))}</span>`);
  // Sujets déjà lus aujourd'hui (sur cet appareil) : cochés dans le sommaire.
  if (line) {
    const done = new Set((TP.store.get('read', {})[line.dataset.date]) || []);
    document.querySelectorAll('.summary > li').forEach((li, i) => {
      if (!done.has(i + 1)) return;
      li.classList.add('done');
      const r = li.querySelector('.rubric');
      if (r) r.insertAdjacentHTML('beforeend', `<span class="read-badge">${TP.icon('check')}${TP.t(TP.L('readMark'))}</span>`);
    });
  }
  // Depuis ta dernière visite, série de lecture, et les sujets récents des pays suivis.
  if (line) {
    const latest = line.dataset.date, last = TP.store.get('lastSeen', null), since = document.getElementById('since');
    const msgs = [];
    const st = TP.streak ? TP.streak() : 0;
    if (st > 1) msgs.push(TP.L('streak', { n: st }));
    if (last && last < latest) {
      TP.json(TP.DATA + 'index.json').then((idx) => {
        const n = idx.filter((x) => x.date > last).length;
        if (n > 1) msgs.unshift(TP.L('sinceVisit', { n, d: TP.dayLong(last) }));
        if (msgs.length && since) { since.textContent = msgs.map(TP.typo).join(' '); since.hidden = false; }
      }).catch(() => {});
    } else if (msgs.length && since) { since.textContent = msgs.map(TP.typo).join(' '); since.hidden = false; }
    TP.store.set('lastSeen', latest);
    const f = TP.follows ? TP.follows() : [];
    if (f.length) TP.json(TP.DATA + 'map.json').then((m) => {
      const rows = [];
      m.dates.slice().reverse().slice(0, 7).forEach((d) => m.days[d].s.forEach((x) => { if (f.includes(x[1])) rows.push(`<li><a href="${TP.ROOT}${x[3]}"><time datetime="${d}">${TP.t(TP.day(d))}</time><span class="h">${TP.t(x[2])}</span></a></li>`); }));
      const box = document.getElementById('mine'), list = document.getElementById('mineList');
      if (!box || !list) return;
      list.innerHTML = rows.slice(0, 6).join('') || `<li class="mine-none">${TP.t(TP.L('myCountriesNone'))}</li>`;
      box.hidden = false;
    }).catch(() => {});
  }
  const host = document.getElementById('coverGlobe');
  if (!host) return;
  // Chaque sujet a sa page : l'adresse est fournie par la page elle-même.
  let routes = {};
  try { routes = JSON.parse(host.dataset.routes || '{}'); } catch (_) {}
  const globe = new Globe(host, {
    drag: true, wheel: false, spin: 0.0055, spinDelay: 7000, start: [-20, -24],
    label: TP.L('homeGlobe'),
    onPick: (rank) => { TP.track('pays-clique', 'accueil · ' + rank); location.href = TP.ROOT + (routes[rank] || (TP.LANG === 'en' ? 'en/edition/#' : 'globe/#') + rank); }
  });
  Promise.all([TP.json('assets/world.json'), TP.json((host.dataset.lang === 'en' ? 'data/en/' : 'data/') + 'latest.json').catch(() => TP.json('data/latest.json')), TP.json('data/countries.json').catch(() => ({}))]).then(([world, ed, countries]) => {
    globe.setMeta(countries);
    globe.load(world);
    globe.setStories(ed.essentials, 0);
  }).catch(() => { host.hidden = true; });
})();
