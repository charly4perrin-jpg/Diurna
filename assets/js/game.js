/* « Où est-ce ? » : cinq pays de l'actualité récente à retrouver sur le globe. */
(function () {
  'use strict';
  const { t, esc, L, DATA, ROOT, json, store, icon, track } = TP;
  const box = document.getElementById('gmBox'), host = document.getElementById('gmGlobe');
  if (!box || !host) return;
  const ROUNDS = 5, MAX = 100;
  let globe = null, pool = [], rounds = [], i = 0, score = 0, waiting = false, cs = {};
  const name = (id) => globe.name(id);
  const km = (a, b) => Math.round(d3.geoDistance(globe.centroid.get(a), globe.centroid.get(b)) * 6371);
  const pts = (d) => (d === 0 ? MAX : Math.max(0, Math.round(MAX - d / 40)));

  function newGame() {
    const bag = pool.slice();
    rounds = [];
    while (rounds.length < ROUNDS && bag.length) rounds.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
    i = 0; score = 0; ask();
  }
  function ask() {
    waiting = true;
    globe.setHeat(new Map());
    const r = rounds[i];
    box.innerHTML = `<p class="quiz-n">${t(L('gmRound', { n: i + 1, t: rounds.length }))}</p><h2 class="quiz-q">${t(L('gmFind', { x: name(r.id) }))}</h2><p class="gm-hint">${t(r.title)}</p>`;
  }
  function pick(id) {
    if (!waiting) return;
    waiting = false;
    const r = rounds[i], d = id === r.id ? 0 : km(id, r.id), p = pts(d);
    score += p;
    globe.setHeat(new Map([[r.id, 5]].concat(id !== r.id ? [[id, 1]] : [])));
    globe.select(r.id, true);
    box.innerHTML = `<p class="quiz-n">${t(L('gmRound', { n: i + 1, t: rounds.length }))}</p>
      <h2 class="quiz-q">${t(name(r.id))}</h2>
      <p class="${d === 0 ? 'ok' : 'ko'}">${t(d === 0 ? L('gmRight') : L('gmNear', { km: TP.int(d) }))} <b>${t(L('gmPts', { n: p }))}</b></p>
      <p><a href="${ROOT}${r.path}">${t(L('gmRead'))} : ${t(r.title)}</a></p>
      <button type="button" class="btn" data-next>${t(i < rounds.length - 1 ? L('gmNext') : L('quizDone'))}${icon('right')}</button>`;
    box.querySelector('[data-next]').focus({ preventScroll: true });
  }
  function end() {
    const best = store.get('game', 0);
    store.set('game', Math.max(best, score));
    track('module/jeu', `${score}`);
    box.innerHTML = `<p class="quiz-n">${t(L('gmEnd'))}</p><p class="quiz-score">${t(L('gmScore', { n: score, t: rounds.length * MAX }))}</p>
      <div class="story-actions"><button type="button" class="act" data-share>${icon('share')}<span>${t(L('gmShare'))}</span></button><button type="button" class="act quiet" data-again>${t(L('gmAgain'))}</button></div>`;
  }
  box.addEventListener('click', async (e) => {
    if (e.target.closest('[data-next]')) { if (i < rounds.length - 1) { i++; ask(); } else end(); return; }
    if (e.target.closest('[data-again]')) { newGame(); return; }
    const sh = e.target.closest('[data-share]');
    if (sh) await TP.share(L('gmShareText', { n: score, t: rounds.length * MAX }), location.href, sh);
  });
  document.getElementById('zin').addEventListener('click', () => globe.zoomBy(1.3));
  document.getElementById('zout').addEventListener('click', () => globe.zoomBy(1 / 1.3));

  Promise.all([json('assets/world.json'), json(DATA + 'map.json'), json('data/countries.json').catch(() => ({}))]).then(([world, map, c]) => {
    cs = c;
    globe = new Globe(host, { drag: true, wheel: true, spin: 0, start: [-15, -25], label: L('gmTitle'), onCountry: pick });
    globe.setMeta(cs); globe.load(world);
    const seen = new Map();
    for (const d of map.dates.slice().reverse()) map.days[d].s.forEach((x) => { if (!seen.has(x[1]) && globe.centroid.get(x[1])) seen.set(x[1], { id: x[1], title: x[2], path: x[3] }); });
    pool = [...seen.values()];
    newGame();
  }).catch(() => { box.innerHTML = `<p class="err">${t(L('loadError'))}</p>`; });
})();
