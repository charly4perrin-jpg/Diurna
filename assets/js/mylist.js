/* Ma liste : les sujets gardés pour plus tard (sur cet appareil seulement). */
(function () {
  'use strict';
  const { t, L, ROOT, store, flag, day, json } = TP;
  const list = document.getElementById('mlList'), empty = document.getElementById('mlEmpty'), tools = document.getElementById('mlTools');
  let countries = {};
  function render() {
    const items = TP.savedList();
    empty.hidden = items.length > 0; tools.hidden = !items.length;
    list.innerHTML = items.map((x, i) => `
      <li><a href="${ROOT}${x.p}">
        <time datetime="${x.d}">${t(day(x.d))}</time>
        <span class="h">${flag(countries[x.c])}${t(x.t)}</span>
      </a><button class="act quiet ml-rm" type="button" data-i="${i}">${t(L('remove'))}</button></li>`).join('');
  }
  list.addEventListener('click', (e) => {
    const b = e.target.closest('.ml-rm'); if (!b) return;
    const items = TP.savedList(); items.splice(Number(b.dataset.i), 1); store.set('saved', items); render();
  });
  document.getElementById('mlClear').addEventListener('click', () => { store.set('saved', []); render(); });
  json('data/countries.json').then((cs) => { countries = cs; render(); }).catch(render);
  render();
})();
