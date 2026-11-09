/* Diurna en stories : l'édition en plein écran, une carte par sujet. Toucher à droite pour avancer,
   à gauche pour revenir, appuyer longuement pour faire pause ; avance seule toutes les 9 secondes. */
(function () {
  'use strict';
  const { t, esc, track } = TP;
  const host = document.getElementById('stories'), raw = document.getElementById('storiesData');
  if (!host || !raw) return;
  const D = JSON.parse(raw.textContent), N = D.slides.length, DUR = 9000;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0, t0 = 0, paused = false, elapsed = 0, raf = 0;
  const flagImg = (f) => (f ? `<img class="flag" src="${D.root}assets/flags/${f}" alt="" width="28" height="21">` : '');

  function slide(s) {
    if (s.k === 'cover') return `<div class="st-body st-cover"><p class="st-mark">DIURNA<span>.</span></p><h1>${t(s.head)}</h1><p class="st-text">${t(s.text)}</p>
      <ul class="st-chips">${s.chips.map((c) => `<li class="c${c.rank}"><span class="rank">${c.rank}</span>${flagImg(c.flag)}${t(c.name)}</li>`).join('')}</ul></div>`;
    if (s.k === 'end') return `<div class="st-body st-end"><p class="st-mark">DIURNA<span>.</span></p><h1>${t(s.head)}</h1>
      <p><a class="btn" href="${D.root}${s.quiz}">${t(D.quiz)}</a></p><p><a class="link-quiet" href="${D.root}${s.ed}">${t(D.ed)} →</a></p></div>`;
    return `<div class="st-body c${s.rank}"><p class="rubric"><span class="rank">${s.rank}</span>${flagImg(s.flag)}${t(s.name)}</p><h1>${t(s.head)}</h1><p class="st-text">${t(s.text)}</p>
      ${s.fv ? `<p class="st-fig"><b>${t(s.fv)}</b><span>${t(s.fl)}</span></p>` : ''}
      <p class="st-more"><a class="btn" href="${D.root}${s.url}">${t(D.read)}</a></p><p class="st-ai">${t(D.ai)}</p></div>`;
  }
  host.innerHTML = `<div class="st-bars">${D.slides.map(() => '<span><i></i></span>').join('')}</div>
    <a class="st-close" href="${esc(host.dataset.close)}" aria-label="${esc(D.close)}">×</a>
    <div class="st-stage" aria-live="polite"></div>`;
  const stage = host.querySelector('.st-stage'), bars = [...host.querySelectorAll('.st-bars i')];

  function show(n) {
    i = Math.max(0, Math.min(N - 1, n));
    stage.innerHTML = slide(D.slides[i]);
    stage.firstElementChild.classList.add('st-in');
    bars.forEach((b, k) => { b.style.width = k < i ? '100%' : '0%'; });
    elapsed = 0; t0 = performance.now();
    if (i === N - 1) track('module/stories', 'fin');
  }
  function tick(now) {
    if (!paused && !reduce && i < N - 1) {
      const e = elapsed + (now - t0);
      bars[i].style.width = `${Math.min(100, (e / DUR) * 100)}%`;
      if (e >= DUR) { show(i + 1); }
    } else t0 = now - 0;
    if (paused) t0 = now;
    raf = requestAnimationFrame(tick);
  }
  let downAt = 0;
  stage.addEventListener('pointerdown', (e) => { if (e.target.closest('a')) return; downAt = performance.now(); paused = true; elapsed += performance.now() - t0; });
  stage.addEventListener('pointerup', (e) => {
    if (e.target.closest('a')) return;
    const long = performance.now() - downAt > 350;
    paused = false; t0 = performance.now();
    if (long) return;
    const x = e.clientX / window.innerWidth;
    show(i + (x < 0.33 ? -1 : 1));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); show(i + 1); }
    else if (e.key === 'ArrowLeft') show(i - 1);
    else if (e.key === 'Escape') location.href = host.dataset.close;
  });
  document.addEventListener('visibilitychange', () => { paused = document.hidden; t0 = performance.now(); });
  show(0);
  raf = requestAnimationFrame(tick);
  track('module/stories', 'ouverture');
})();
