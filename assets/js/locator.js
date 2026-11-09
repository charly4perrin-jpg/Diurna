/* Carte de situation des pages pays : un petit globe centré sur le pays. */
(function () {
  'use strict';
  const host = document.getElementById('locator');
  if (!host || typeof Globe === 'undefined') return;
  const id = host.dataset.id;
  const globe = new Globe(host, { drag: true, wheel: false, spin: 0, start: [0, -20], label: '' });
  Promise.all([TP.json('assets/world.json'), TP.json('data/countries.json').catch(() => ({}))]).then(([world, countries]) => {
    globe.setMeta(countries);
    globe.load(world);
    const c = globe.centroid.get(id);
    if (c) { globe.rot = [-c[0], -Math.max(-50, Math.min(50, c[1]))]; globe.k = Math.min(1.6, globe.zoomFor({ id })); }
    globe.select(id, false);
    globe.draw();
    const el = document.querySelector('[data-live]');
    if (el && TP.live) TP.live(id, countries[id]).then((w) => {
      if (!w) return;
      el.innerHTML = `${TP.t(TP.L('liveAt', { c: el.dataset.cap }))} : ${TP.t(w.text)} <small>${TP.t(TP.L('liveSrc'))}</small>`;
      el.hidden = false;
    });
  }).catch(() => { host.hidden = true; });
})();
