/* Ton passeport : les pays lus, tamponnés sur un globe (gardés sur cet appareil seulement). */
(function () {
  'use strict';
  const { t, L, DATA, store, flag, json, cfield, day } = TP;
  const $ = (id) => document.getElementById(id);
  const host = $('ppGlobe');
  Promise.all([json('assets/world.json'), json('data/countries.json').catch(() => ({})), json(DATA + 'map.json').catch(() => null)]).then(([world, cs, map]) => {
    const pp = store.get('passport', {});
    // Les sujets lus avant l'arrivée du passeport : retrouvés grâce aux marques de lecture et à la carte des 30 derniers jours.
    const read = store.get('read', {});
    if (map) for (const [d, ranks] of Object.entries(read)) { const day = map.days[d]; if (!day) continue; day.s.forEach((x) => { if (ranks.includes(x[0]) && !pp[x[1]]) pp[x[1]] = d; }); }
    store.set('passport', pp);
    const ids = Object.keys(pp).filter((id) => cs[id]).sort((a, b) => pp[a].localeCompare(pp[b]));
    const conts = new Set(ids.map((id) => cfield(cs[id], 'continent')).filter(Boolean));
    $('ppStats').innerHTML = [[L('ppCount'), ids.length], [L('ppConts'), conts.size]].map(([k, v]) => `<div><dt>${t(k)}</dt><dd>${TP.int(v)}</dd></div>`).join('') +
      (ids.length ? `<div><dt>${t(L('ppFirst'))}</dt><dd class="sm">${t(day(pp[ids[0]]))}</dd></div>` : '');
    $('ppEmpty').hidden = ids.length > 0;
    $('ppStamps').innerHTML = ids.slice().reverse().map((id, i) => `<li class="stamp s${i % 5 + 1}">${flag(cs[id])}<b>${t(cfield(cs[id], 'name'))}</b><time datetime="${pp[id]}">${t(day(pp[id]))}</time></li>`).join('');
    const globe = new Globe(host, { drag: true, wheel: false, spin: 0, start: [-15, -25], label: L('ppTitle') });
    globe.setMeta(cs); globe.load(world);
    globe.setHeat(new Map(ids.map((id) => [id, 4])));
    if (ids.length) globe.flyTo(globe.centroid.get(ids[ids.length - 1]), 1);
  }).catch(() => {});
})();
