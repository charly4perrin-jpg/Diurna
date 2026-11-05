/* Page d'accueil : le texte est déjà dans la page ; ici on allume le globe. */
(function () {
  'use strict';
  const line = document.querySelector('.cover .edition-line');
  if (line && TP.stale(line.dataset.date)) line.insertAdjacentHTML('beforeend', `<span class="preparing">${TP.t(TP.L('preparing'))}</span>`);
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
