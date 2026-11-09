/* Quiz du jour : une question à la fois, réponse expliquée, score à la fin (gardé sur l'appareil). */
(function () {
  'use strict';
  const { t, esc, L, store, track, share, icon, ROOT } = TP;
  const box = document.getElementById('quiz'), raw = document.getElementById('quizData');
  if (!box || !raw) return;
  const D = JSON.parse(raw.textContent);
  let i = 0, score = 0, answered = false;

  function question() {
    const q = D.qs[i];
    answered = false;
    box.innerHTML = `
      <p class="quiz-n">${i + 1} / ${D.qs.length}</p>
      <h2 class="quiz-q">${t(q.q)}</h2>
      <div class="quiz-o" role="group">${q.o.map((o, k) => `<button type="button" class="quiz-b" data-k="${k}">${t(o)}</button>`).join('')}</div>
      <div class="quiz-fb" aria-live="polite"></div>`;
    box.querySelector('.quiz-b').focus({ preventScroll: true });
  }
  function answer(k) {
    if (answered) return;
    answered = true;
    const q = D.qs[i], ok = k === q.a;
    if (ok) score++;
    box.querySelectorAll('.quiz-b').forEach((b) => {
      const n = Number(b.dataset.k);
      b.disabled = true;
      if (n === q.a) b.classList.add('right');
      else if (n === k) b.classList.add('wrong');
    });
    box.querySelector('.quiz-fb').innerHTML = `
      <p class="${ok ? 'ok' : 'ko'}">${ok ? t(L('quizRight')) : t(L('quizWrong', { x: q.o[q.a] }))}</p>
      <p><a href="${ROOT}${q.u}">${t(L('quizRead'))} : ${t(q.t)}</a></p>
      <button type="button" class="btn" data-next>${i < D.qs.length - 1 ? t(L('quizNext')) : t(L('quizDone'))}${icon('right')}</button>`;
    box.querySelector('[data-next]').focus({ preventScroll: true });
  }
  function end() {
    const best = store.get('quiz', {});
    best[D.date] = Math.max(best[D.date] || 0, score);
    Object.keys(best).sort().slice(0, -30).forEach((d) => delete best[d]);
    store.set('quiz', best);
    track('quiz-termine', `${score}/${D.qs.length}`);
    box.innerHTML = `
      <p class="quiz-n">${t(L('quizDone'))}</p>
      <p class="quiz-score">${t(L('quizScore', { n: score, t: D.qs.length }))}</p>
      <div class="story-actions"><button type="button" class="act" data-share-score>${icon('share')}<span>${t(L('quizShare'))}</span></button><button type="button" class="act quiet" data-again>${t(L('quizAgain'))}</button></div>`;
  }
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('.quiz-b');
    if (b) { answer(Number(b.dataset.k)); return; }
    if (e.target.closest('[data-next]')) { if (i < D.qs.length - 1) { i++; question(); } else end(); return; }
    if (e.target.closest('[data-again]')) { i = 0; score = 0; question(); return; }
    const sh = e.target.closest('[data-share-score]');
    if (sh) {
      const r = await share(L('quizShareText', { n: score, t: D.qs.length, d: D.label }), location.href);
      if (r === 'copied') sh.querySelector('span').textContent = L('shareCopied');
    }
  });
  question();
})();
