/* Page d'accueil : le texte est déjà dans la page ; ici on allume le globe. */
(function () {
  'use strict';
  const host = document.getElementById('coverGlobe');
  if (!host) return;
  const globe = new Globe(host, {
    drag: true, wheel: false, spin: 0.0055, start: [-20, -24],
    label: TP.L('homeGlobe'),
    onPick: (rank) => { location.href = TP.ROOT + (TP.LANG === 'en' ? 'en/edition/#' : 'globe/#') + rank; }
  });
  Promise.all([TP.json('assets/world.json'), TP.json(TP.DATA + 'latest.json').catch(() => TP.json('data/latest.json')), TP.json('data/countries.json').catch(() => ({}))]).then(([world, ed, countries]) => {
    globe.setMeta(countries);
    globe.load(world);
    globe.setStories(ed.essentials, 0);
  }).catch(() => { host.hidden = true; });
})();
